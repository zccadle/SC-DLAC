const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting system interaction tests...");
    
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
    const contracts = {
        zkpVerifier: await ethers.getContractAt("ZKPVerifier", deploymentInfo.zkpVerifier),
        rbac: await ethers.getContractAt("EnhancedRBAC", deploymentInfo.rbac),
        didRegistry: await ethers.getContractAt("DIDRegistry", deploymentInfo.didRegistry),
        auditLog: await ethers.getContractAt("EnhancedAuditLog", deploymentInfo.auditLog),
        patientStorage: await ethers.getContractAt("UpdatedPatientDataStorage", deploymentInfo.patientStorage)
    };

    // Get signers
    const [admin, doctor1, doctor2, nurse, patient1, patient2] = await ethers.getSigners();
    
    try {
        console.log("\nScenario 1: Emergency Access Workflow");
        await testEmergencyAccessWorkflow(contracts, doctor1, patient1);

        console.log("\nScenario 2: Multiple Provider Access");
        await testMultipleProviderAccess(contracts, [doctor1, doctor2], patient1);

        console.log("\nScenario 3: Access Revocation");
        await testAccessRevocation(contracts, doctor1, patient1);

        console.log("\nScenario 4: Audit Trail Verification");
        await testAuditTrail(contracts, doctor1, patient1);

        console.log("\n✅ All interaction tests completed successfully!");

    } catch (error) {
        console.error("\n❌ Interaction tests failed:");
        console.error(error);
        process.exit(1);
    }
}

async function testEmergencyAccessWorkflow(contracts, doctor, patient) {
    console.log("Testing emergency access workflow...");
    
    // Setup
    const zkProof = ethers.utils.randomBytes(32);
    
    // Request emergency access
    await contracts.patientStorage.connect(doctor).requestEmergencyAccess(
        patient.address,
        "Critical emergency situation",
        zkProof
    );
    
    // Verify access
    const accessStatus = await contracts.patientStorage.checkEmergencyAccess(
        doctor.address,
        patient.address
    );
    console.log("Emergency access granted:", accessStatus[0]);
    
    // Add test data
    await contracts.patientStorage.connect(doctor).updatePatientData(
        patient.address,
        "emergency_notes",
        "Patient critical condition notes",
        zkProof
    );
    
    console.log("✅ Emergency access workflow completed");
}

async function testMultipleProviderAccess(contracts, doctors, patient) {
    console.log("Testing multiple provider access...");
    
    for (const doctor of doctors) {
        const zkProof = ethers.utils.randomBytes(32);
        await contracts.patientStorage.connect(doctor).requestEmergencyAccess(
            patient.address,
            "Multi-provider emergency",
            zkProof
        );
        
        const accessStatus = await contracts.patientStorage.checkEmergencyAccess(
            doctor.address,
            patient.address
        );
        console.log(`Access granted to doctor ${doctor.address}:`, accessStatus[0]);
    }
    
    console.log("✅ Multiple provider access completed");
}

async function testAccessRevocation(contracts, doctor, patient) {
    console.log("Testing access revocation...");
    
    // First grant access
    const zkProof = ethers.utils.randomBytes(32);
    await contracts.patientStorage.connect(doctor).requestEmergencyAccess(
        patient.address,
        "Emergency requiring revocation test",
        zkProof
    );
    
    // Then revoke it
    await contracts.patientStorage.connect(patient).revokeEmergencyAccess(doctor.address);
    
    // Verify revocation
    const accessStatus = await contracts.patientStorage.checkEmergencyAccess(
        doctor.address,
        patient.address
    );
    console.log("Access properly revoked:", !accessStatus[0]);
    
    console.log("✅ Access revocation completed");
}

async function testAuditTrail(contracts, doctor, patient) {
    console.log("Testing audit trail...");
    
    // Get audit logs
    const logs = await contracts.auditLog.getPatientAccessRecords(patient.address);
    console.log("Number of audit records:", logs.length);
    
    // Verify last log
    const lastLog = logs[logs.length - 1];
    console.log("Last access by:", lastLog.user);
    console.log("Access type:", lastLog.accessType);
    
    console.log("✅ Audit trail verification completed");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });