const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment of SL-DLAC with delegation support...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy ZKPVerifier
  console.log("\nDeploying ZKPVerifier...");
  const ZKPVerifier = await ethers.getContractFactory("ZKPVerifier");
  const zkpVerifier = await ZKPVerifier.deploy();
  await zkpVerifier.deployed();
  console.log("ZKPVerifier deployed to:", zkpVerifier.address);

  // 2. Deploy EnhancedRBAC with null DID Registry (will be updated later)
  console.log("\nDeploying EnhancedRBAC...");
  const EnhancedRBAC = await ethers.getContractFactory("EnhancedRBAC");
  const rbac = await EnhancedRBAC.deploy(ethers.constants.AddressZero, zkpVerifier.address);
  await rbac.deployed();
  console.log("EnhancedRBAC deployed to:", rbac.address);

  // 3. Deploy DIDRegistry
  console.log("\nDeploying DIDRegistry...");
  const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
  const didRegistry = await DIDRegistry.deploy(rbac.address);
  await didRegistry.deployed();
  console.log("DIDRegistry deployed to:", didRegistry.address);

  // 4. Update RBAC with DID Registry address
  console.log("\nUpdating RBAC with DID Registry address...");
  await rbac.updateDIDRegistry(didRegistry.address);
  console.log("RBAC updated with DID Registry");

  // 5. Deploy EnhancedAuditLog
  console.log("\nDeploying EnhancedAuditLog...");
  const EnhancedAuditLog = await ethers.getContractFactory("EnhancedAuditLog");
  const auditLog = await EnhancedAuditLog.deploy();
  await auditLog.deployed();
  console.log("EnhancedAuditLog deployed to:", auditLog.address);

  // 6. Deploy UpdatedPatientDataStorage
  console.log("\nDeploying UpdatedPatientDataStorage...");
  const PatientDataStorage = await ethers.getContractFactory("UpdatedPatientDataStorage");
  const patientStorage = await PatientDataStorage.deploy(
    rbac.address,
    auditLog.address,
    didRegistry.address,
    zkpVerifier.address
  );
  await patientStorage.deployed();
  console.log("UpdatedPatientDataStorage deployed to:", patientStorage.address);

  // 7. Authorize PatientDataStorage to use AuditLog
  console.log("\nAuthorizing PatientDataStorage to log to AuditLog...");
  await auditLog.authorizeLogger(patientStorage.address);
  console.log("Authorization complete");

  // Print all deployed contract addresses
  console.log("\nDeployment Summary:");
  console.log("--------------------");
  console.log("ZKPVerifier:", zkpVerifier.address);
  console.log("EnhancedRBAC:", rbac.address);
  console.log("DIDRegistry:", didRegistry.address);
  console.log("EnhancedAuditLog:", auditLog.address);
  console.log("UpdatedPatientDataStorage:", patientStorage.address);

  // Verify the deployment was successful
  console.log("\nVerifying deployment...");
  
  // Check RBAC's DID Registry address
  const rbacDidRegistry = await rbac.didRegistry();
  console.log("RBAC's DID Registry address:", rbacDidRegistry);
  
  // Verify roles were created
  const allRoles = await rbac.getAllRoles();
  console.log("\nAvailable roles:");
  for (const role of allRoles) {
    console.log(`- ${role}`);
  }
  
  console.log("Verification complete!");
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });