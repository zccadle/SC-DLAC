const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    try {
        // Deploy ZKPVerifier
        console.log("\nDeploying ZKPVerifier...");
        const ZKPVerifier = await ethers.getContractFactory("ZKPVerifier");
        const zkpVerifier = await ZKPVerifier.deploy();
        await zkpVerifier.deployed();
        console.log("ZKPVerifier deployed to:", zkpVerifier.address);

        // Deploy RBAC with temporary zero address for DIDRegistry
        console.log("\nDeploying EnhancedRBAC...");
        const EnhancedRBAC = await ethers.getContractFactory("EnhancedRBAC");
        const rbac = await EnhancedRBAC.deploy(
            ethers.constants.AddressZero,
            zkpVerifier.address
        );
        await rbac.deployed();
        console.log("EnhancedRBAC deployed to:", rbac.address);

        // Deploy DIDRegistry
        console.log("\nDeploying DIDRegistry...");
        const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
        const didRegistry = await DIDRegistry.deploy(rbac.address);
        await didRegistry.deployed();
        console.log("DIDRegistry deployed to:", didRegistry.address);

        // Update RBAC with DIDRegistry address
        console.log("\nUpdating RBAC with DIDRegistry address...");
        await rbac.updateDIDRegistry(didRegistry.address);
        console.log("RBAC updated with DIDRegistry address");

        // Deploy AuditLog
        console.log("\nDeploying EnhancedAuditLog...");
        const EnhancedAuditLog = await ethers.getContractFactory("EnhancedAuditLog");
        const auditLog = await EnhancedAuditLog.deploy();
        await auditLog.deployed();
        console.log("EnhancedAuditLog deployed to:", auditLog.address);

        // Deploy PatientDataStorage
        console.log("\nDeploying UpdatedPatientDataStorage...");
        const PatientDataStorage = await ethers.getContractFactory("UpdatedPatientDataStorage");
        const patientStorage = await PatientDataStorage.deploy(
            rbac.address,
            auditLog.address,
            didRegistry.address,
            zkpVerifier.address
        );
        await patientStorage.deployed();
        console.log("PatientDataStorage deployed to:", patientStorage.address);

        // Setup initial admin
        console.log("\nSetting up initial admin...");
        const adminAddress = deployer.address;
        const adminDID = `did:ethr:${adminAddress}`;
        const adminCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_CREDENTIAL"));

        // Register admin DID
        await didRegistry.createDID(adminDID, []);
        console.log("Admin DID created");

        // Submit admin proof
        await zkpVerifier.submitProof(adminCredential);
        console.log("Admin proof submitted");

        // Setup admin role
        await rbac.setupAdmin(
            adminAddress,
            adminCredential,
            adminDID,
            365 * 24 * 60 * 60 // 1 year validity
        );
        console.log("Admin role setup completed");

        // Save deployment addresses
        const deploymentInfo = {
            zkpVerifier: zkpVerifier.address,
            rbac: rbac.address,
            didRegistry: didRegistry.address,
            auditLog: auditLog.address,
            patientStorage: patientStorage.address,
            network: hre.network.name,
            deploymentTime: new Date().toISOString()
        };

        // Create deployments directory if it doesn't exist
        const deploymentsDir = path.join(__dirname, '../deployments');
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir);
        }

        // Save deployment info to file
        const deploymentFile = path.join(
            deploymentsDir, 
            `deployment-${hre.network.name}-${Date.now()}.json`
        );
        fs.writeFileSync(
            deploymentFile,
            JSON.stringify(deploymentInfo, null, 2)
        );
        console.log("\nDeployment addresses saved to:", deploymentFile);

        // Log summary
        console.log("\nDeployment Summary:");
        console.log("===================");
        console.log("ZKPVerifier:", zkpVerifier.address);
        console.log("EnhancedRBAC:", rbac.address);
        console.log("DIDRegistry:", didRegistry.address);
        console.log("EnhancedAuditLog:", auditLog.address);
        console.log("PatientDataStorage:", patientStorage.address);
        console.log("Admin DID:", adminDID);
        console.log("Network:", hre.network.name);

    } catch (error) {
        console.error("Deployment failed:", error);
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
    process.exit(1);
});

// Execute deployment
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });