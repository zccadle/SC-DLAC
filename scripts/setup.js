const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting initial setup with delegation support...");

    // Read the most recent local deployment addresses
    const deploymentsDir = path.join(__dirname, '../deployments');
    let deployedAddresses;
    
    try {
        // Find the most recent local deployment file
        const files = fs.readdirSync(deploymentsDir)
            .filter(file => file.startsWith('deployment-localhost'))
            .sort((a, b) => b.localeCompare(a)); // Sort by filename (latest first)
        
        if (files.length === 0) {
            console.log("No local deployment found. Run deploy.js first.");
            console.log("Using dummy addresses for testing only...");
            // Get deployed contracts from the network
            const ZKPVerifier = await ethers.getContractFactory("ZKPVerifier");
            const zkpVerifier = await ZKPVerifier.deploy();
            await zkpVerifier.deployed();
            
            const EnhancedRBAC = await ethers.getContractFactory("EnhancedRBAC");
            const rbac = await EnhancedRBAC.deploy(ethers.constants.AddressZero, zkpVerifier.address);
            await rbac.deployed();
            
            const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
            const didRegistry = await DIDRegistry.deploy(rbac.address);
            await didRegistry.deployed();
            
            await rbac.updateDIDRegistry(didRegistry.address);
            
            const EnhancedAuditLog = await ethers.getContractFactory("EnhancedAuditLog");
            const auditLog = await EnhancedAuditLog.deploy();
            await auditLog.deployed();
            
            const PatientDataStorage = await ethers.getContractFactory("UpdatedPatientDataStorage");
            const patientStorage = await PatientDataStorage.deploy(
                rbac.address,
                auditLog.address,
                didRegistry.address,
                zkpVerifier.address
            );
            await patientStorage.deployed();
            
            // Authorize EHR Manager to use AuditLogger
            await auditLog.authorizeLogger(patientStorage.address);
            
            deployedAddresses = {
                zkpVerifier: zkpVerifier.address,
                rbac: rbac.address,
                didRegistry: didRegistry.address,
                auditLog: auditLog.address,
                patientStorage: patientStorage.address
            };
            
            // Save the deployment info
            if (!fs.existsSync(deploymentsDir)) {
                fs.mkdirSync(deploymentsDir, { recursive: true });
            }
            
            fs.writeFileSync(
                path.join(deploymentsDir, `deployment-localhost-${Date.now()}.json`),
                JSON.stringify({
                    network: "localhost",
                    timestamp: new Date().toISOString(),
                    ...deployedAddresses
                }, null, 2)
            );
        } else {
            const latestDeployment = JSON.parse(
                fs.readFileSync(path.join(deploymentsDir, files[0]), 'utf8')
            );
            
            deployedAddresses = {
                zkpVerifier: latestDeployment.zkpManager || latestDeployment.zkpVerifier,
                rbac: latestDeployment.dlacManager || latestDeployment.rbac,
                didRegistry: latestDeployment.didManager || latestDeployment.didRegistry,
                auditLog: latestDeployment.auditLogger || latestDeployment.auditLog,
                patientStorage: latestDeployment.ehrManager || latestDeployment.patientStorage
            };
            
            console.log("Using deployment from:", files[0]);
        }
    } catch (error) {
        console.error("Error reading deployment files:", error);
        process.exit(1);
    }

    console.log("\nContract addresses:");
    console.log("ZKP Manager:", deployedAddresses.zkpVerifier);
    console.log("DLAC Manager:", deployedAddresses.rbac);
    console.log("DID Manager:", deployedAddresses.didRegistry);
    console.log("Audit Logger:", deployedAddresses.auditLog);
    console.log("EHR Manager:", deployedAddresses.patientStorage);

    // Get contract instances
    const rbac = await ethers.getContractAt("EnhancedRBAC", deployedAddresses.rbac);
    const didRegistry = await ethers.getContractAt("DIDRegistry", deployedAddresses.didRegistry);
    const zkpVerifier = await ethers.getContractAt("ZKPVerifier", deployedAddresses.zkpVerifier);
    const patientStorage = await ethers.getContractAt("UpdatedPatientDataStorage", deployedAddresses.patientStorage);

    // Get signers for different roles
    const [owner, doctor1, doctor2, nurse1, patient1, paramedic1] = await ethers.getSigners();
    console.log("\nSetting up roles for addresses:");
    console.log("Owner:", owner.address);
    console.log("Doctor 1:", doctor1.address);
    console.log("Doctor 2:", doctor2.address);
    console.log("Nurse:", nurse1.address);
    console.log("Patient:", patient1.address);
    console.log("Paramedic:", paramedic1.address);

    // Create DIDs for each role
    console.log("\nCreating DIDs...");
    const dids = {
        doctor1: `did:ethr:${doctor1.address}`,
        doctor2: `did:ethr:${doctor2.address}`,
        nurse1: `did:ethr:${nurse1.address}`,
        patient1: `did:ethr:${patient1.address}`,
        paramedic1: `did:ethr:${paramedic1.address}`
    };

    for (const [user, did] of Object.entries(dids)) {
        try {
            console.log(`Creating DID for ${user}...`);
            await didRegistry.connect(eval(user)).createDID(did, []);
            console.log(`DID created: ${did}`);
        } catch (error) {
            console.log(`Error creating DID for ${user} (may already exist): ${error.message}`);
        }
    }

    // Set up role credentials
    console.log("\nSetting up role credentials...");
    const roleCredentials = {
        doctor1: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("doctor1_CREDENTIAL")),
        doctor2: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("doctor2_CREDENTIAL")),
        nurse1: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("nurse1_CREDENTIAL")),
        paramedic1: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("paramedic1_CREDENTIAL"))
    };

    // Submit proofs for each role
    for (const [user, credential] of Object.entries(roleCredentials)) {
        try {
            console.log(`Submitting proof for ${user}...`);
            await zkpVerifier.connect(eval(user)).submitProof(credential);
        } catch (error) {
            console.log(`Error submitting proof for ${user}: ${error.message}`);
        }
    }

    // Assign roles (validity period of 1 year)
    console.log("\nAssigning roles...");
    const ONE_YEAR = 365 * 24 * 60 * 60;
    
    // Role assignments with delegation flag
    const roleAssignments = [
        { user: doctor1, roleID: "DOCTOR", credential: roleCredentials.doctor1, did: dids.doctor1, isDelegated: false },
        { user: doctor2, roleID: "DOCTOR", credential: roleCredentials.doctor2, did: dids.doctor2, isDelegated: false },
        { user: nurse1, roleID: "NURSE", credential: roleCredentials.nurse1, did: dids.nurse1, isDelegated: false },
        { user: paramedic1, roleID: "PARAMEDIC", credential: roleCredentials.paramedic1, did: dids.paramedic1, isDelegated: true }
    ];

    for (const assignment of roleAssignments) {
        try {
            console.log(`Assigning role ${assignment.roleID} to ${assignment.user.address}...`);
            await rbac.connect(owner).assignRole(
                assignment.user.address,
                assignment.roleID,
                assignment.credential,
                assignment.did,
                ONE_YEAR,
                assignment.isDelegated
            );
        } catch (error) {
            console.log(`Error assigning role ${assignment.roleID} to ${assignment.user.address}: ${error.message}`);
        }
    }

    // Grant permissions to roles
    console.log("\nGranting permissions...");
    const permissions = {
        DOCTOR: ["view_data", "update_data", "create_record"],
        NURSE: ["view_data", "update_data"],
        PARAMEDIC: ["request_emergency"]
    };

    // Grant permissions to roles
    for (const [role, rolePermissions] of Object.entries(permissions)) {
        for (const permission of rolePermissions) {
            try {
                await rbac.connect(owner).grantPermission(role, permission);
                console.log(`Granted ${permission} to ${role} role`);
            } catch (error) {
                console.log(`Error granting ${permission} to ${role}: ${error.message}`);
            }
        }
    }

    // Create patient record
    console.log("\nCreating patient record...");
    try {
        await patientStorage.connect(doctor1).createPatientRecord(patient1.address);
        console.log(`Patient record created for ${patient1.address}`);
    } catch (error) {
        console.log(`Error creating patient record: ${error.message}`);
    }

    // Create delegation policies
    console.log("\nCreating delegation policies...");
    try {
        // Patient creates delegation policy for paramedic (24 hour validity)
        const tx = await patientStorage.connect(patient1).createDelegationPolicy(
            paramedic1.address,
            "vitals",
            "read",
            24 * 60 * 60
        );
        
        const receipt = await tx.wait();
        const event = receipt.events.find(e => e.event === 'PolicyCreated');
        const policyID = event.args.policyID;
        
        console.log(`Policy created: ID ${policyID}, Delegator: ${patient1.address}, Delegatee: ${paramedic1.address}`);

        // Verify policy
        try {
            const [id, delegator, delegatee, dataID, permission, isActive, validUntil] = 
                await patientStorage.getPolicy(policyID);
            
            console.log("\nVerifying policy details:");
            console.log(`- ID: ${id}`);
            console.log(`- Delegator: ${delegator}`);
            console.log(`- Delegatee: ${delegatee}`);
            console.log(`- Data ID: ${dataID}`);
            console.log(`- Permission: ${permission}`);
            console.log(`- Active: ${isActive}`);
            console.log(`- Valid until: ${new Date(validUntil * 1000).toLocaleString()}`);
        } catch (error) {
            console.log(`Error verifying policy: ${error.message}`);
        }
    } catch (error) {
        console.log(`Error creating delegation policy: ${error.message}`);
    }

    console.log("\nInitial setup completed successfully!");
}

// Execute the setup
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
