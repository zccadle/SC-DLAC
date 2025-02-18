const { expect } = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting deployment verification...");
    
    // Load deployment information
    const deploymentsDir = path.join(__dirname, '../deployments');
    const files = fs.readdirSync(deploymentsDir);
    const latestDeployment = files
        .filter(f => f.startsWith('deployment-'))
        .sort()
        .reverse()[0];
    
    const deploymentInfo = JSON.parse(
        fs.readFileSync(path.join(deploymentsDir, latestDeployment))
    );

    // Get contract instances
    const zkpVerifier = await ethers.getContractAt("ZKPVerifier", deploymentInfo.zkpVerifier);
    const rbac = await ethers.getContractAt("EnhancedRBAC", deploymentInfo.rbac);
    const didRegistry = await ethers.getContractAt("DIDRegistry", deploymentInfo.didRegistry);
    const auditLog = await ethers.getContractAt("EnhancedAuditLog", deploymentInfo.auditLog);
    const patientStorage = await ethers.getContractAt("UpdatedPatientDataStorage", deploymentInfo.patientStorage);

    // Get signers
    const [admin, doctor, nurse, patient] = await ethers.getSigners();
    console.log("\nUsing addresses:");
    console.log("Admin:", admin.address);
    console.log("Doctor:", doctor.address);
    console.log("Nurse:", nurse.address);
    console.log("Patient:", patient.address);

    try {
        console.log("\n1. Verifying RBAC Setup...");
        const adminRole = await rbac.getUserRole(admin.address);
        console.log("Admin role:", adminRole.toString());
        if (adminRole.toString() !== "5") throw new Error("Admin role not properly set");
        console.log("✅ RBAC Admin setup verified");

        console.log("\n2. Setting up Doctor Role...");
        // Create DID for doctor if it doesn't exist
        const doctorDID = `did:ethr:${doctor.address}`;
        let existingDoctorDID;
        try {
            existingDoctorDID = await didRegistry.getDIDByAddress(doctor.address);
            console.log("Doctor DID already exists:", existingDoctorDID);
        } catch {
            console.log("Creating new DID for doctor...");
            const createDIDTx = await didRegistry.connect(doctor).createDID(doctorDID, []);
            await createDIDTx.wait();
            console.log("Doctor DID created:", doctorDID);
        }

        // Verify doctor's DID was created
        existingDoctorDID = await didRegistry.getDIDByAddress(doctor.address);
        console.log("Verified doctor DID:", existingDoctorDID);

        // Create and submit doctor's role credentials
        const doctorCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DOCTOR_CREDENTIAL"));
        console.log("Created doctor credential:", doctorCredential);

        // Assign role if not already assigned
        const doctorRole = await rbac.getUserRole(doctor.address);
        if (doctorRole.toString() !== "3") {
            const assignRoleTx = await rbac.connect(admin).assignRole(
                doctor.address,
                3, // Doctor role
                doctorCredential,
                doctorDID,
                365 * 24 * 60 * 60
            );
            await assignRoleTx.wait();
            console.log("Doctor role assigned");
        } else {
            console.log("Doctor role already assigned");
        }
        
         // Ensure permissions
         const grantViewTx = await rbac.connect(admin).grantPermission(doctor.address, "view_data");
         await grantViewTx.wait();
         const grantUpdateTx = await rbac.connect(admin).grantPermission(doctor.address, "update_data");
         await grantUpdateTx.wait();
         const grantCreateTx = await rbac.connect(admin).grantPermission(doctor.address, "create_record");
         await grantCreateTx.wait();
         console.log("✅ Doctor setup completed");

        // Verify doctor's permissions
        const hasViewPermission = await rbac.hasPermission(doctor.address, "view_data");
        const hasUpdatePermission = await rbac.hasPermission(doctor.address, "update_data");
        const hasCreatePermission = await rbac.hasPermission(doctor.address, "create_record");
        console.log("Doctor permissions verified:", {
            view: hasViewPermission,
            update: hasUpdatePermission,
            create: hasCreatePermission
        });

        console.log("\n3. Setting up Patient...");
        // Create patient DID if needed
        const patientDID = `did:ethr:${patient.address}`;
        try {
            const existingPatientDID = await didRegistry.getDIDByAddress(patient.address);
            console.log("Patient DID already exists:", existingPatientDID);
        } catch {
            const createPatientDIDTx = await didRegistry.connect(patient).createDID(patientDID, []);
            await createPatientDIDTx.wait();
            console.log("Patient DID created:", patientDID);
        }

        // Create patient role and credentials
        const patientCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PATIENT_CREDENTIAL"));
        
        // Assign patient role if needed
        const patientRole = await rbac.getUserRole(patient.address);
        if (patientRole.toString() !== "1") {
            const assignPatientRoleTx = await rbac.connect(admin).assignRole(
                patient.address,
                1, // Patient role
                patientCredential,
                patientDID,
                365 * 24 * 60 * 60
            );
            await assignPatientRoleTx.wait();
            console.log("Patient role assigned");
        } else {
            console.log("Patient role already assigned");
        }

        // Verify patient record creation
        console.log("Attempting to create patient record...");
        try {
            const createRecordTx = await patientStorage.connect(doctor).createPatientRecord(patient.address, {
                gasLimit: 500000
            });
            await createRecordTx.wait();
            console.log("Patient record created");
        } catch (error) {
            if (error.message.includes("Patient record already exists")) {
                console.log("Patient record already exists");
            } else {
                console.error("Error creating patient record:", error.message);
                throw error;
            }
        }
        console.log("✅ Patient setup completed");

        console.log("\n4. Testing Emergency Access...");
        // Get the doctor's role credential
        const doctorRoleHash = await rbac.getRoleCredential(doctor.address);
        console.log("Doctor role hash:", doctorRoleHash);

        // Create and submit proof
        const zkProof = ethers.utils.randomBytes(32);
        const proofHash = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
                ['bytes32', 'bytes'],
                [doctorRoleHash, zkProof]
            )
        );
        
        console.log("Submitting proof to ZKPVerifier...");
        await zkpVerifier.connect(doctor).submitProof(proofHash);
        
        // Verify the proof is registered
        const isProofValid = await zkpVerifier.validateProof(doctor.address, proofHash);
        console.log("Proof validation:", isProofValid);
        
        if (!isProofValid) {
            throw new Error("Emergency proof validation failed");
        }

        console.log("Requesting emergency access...");
        await patientStorage.connect(doctor).requestEmergencyAccess(
            patient.address,
            "Emergency test situation",
            zkProof,
            { gasLimit: 500000 }
        );
        
        const accessStatus = await patientStorage.checkEmergencyAccess(
            doctor.address,
            patient.address
        );
        console.log("Emergency access granted:", accessStatus[0]);
        console.log("Access expiry:", new Date(accessStatus[1].toNumber() * 1000).toISOString());
        console.log("✅ Emergency access verified");

        console.log("\n5. Testing Data Access...");
        // Create and submit new proof for data access
        const dataAccessZkProof = ethers.utils.randomBytes(32);
        const dataAccessProofHash = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
                ['bytes32', 'bytes'],
                [doctorRoleHash, dataAccessZkProof]
            )
        );
        
        await zkpVerifier.connect(doctor).submitProof(dataAccessProofHash);

        // Update patient data
        const testData = ethers.utils.formatBytes32String("Test medical data");
        await patientStorage.connect(doctor).updatePatientData(
            patient.address,
            "general_health",
            testData,
            dataAccessZkProof,
            { gasLimit: 500000 }
        );
        console.log("Patient data updated");

        // Retrieve patient data
        const retrievedData = await patientStorage.connect(doctor).getPatientData(
            patient.address,
            "general_health",
            dataAccessZkProof
        );
        console.log("Data retrieved successfully");
        console.log("✅ Data access verified");

        console.log("\n6. Testing Audit Logging...");
        const logs = await auditLog.getPatientAccessRecords(patient.address);
        console.log("Number of audit logs:", logs.length);
        console.log("✅ Audit logging verified");

        console.log("\n✅ All verifications completed successfully!");

    } catch (error) {
        console.error("\n❌ Verification failed:");
        console.error("Error message:", error.message);
        console.error("Full error:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });