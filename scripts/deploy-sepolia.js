const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying contracts to Sepolia testnet...");
  
  // Create deployments directory
  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)){
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Deploy contracts
  const ZKPManager = await ethers.getContractFactory("ZKPVerifier");
  const zkpManager = await ZKPManager.deploy();
  await zkpManager.deployed();
  console.log("ZKP_Manager deployed to:", zkpManager.address);
  
  const DLACManager = await ethers.getContractFactory("EnhancedRBAC");
  const dlacManager = await DLACManager.deploy(ethers.constants.AddressZero, zkpManager.address);
  await dlacManager.deployed();
  console.log("DLAC_Manager deployed to:", dlacManager.address);
  
  const DIDManager = await ethers.getContractFactory("DIDRegistry");
  const didManager = await DIDManager.deploy(dlacManager.address);
  await didManager.deployed();
  console.log("DID_Manager deployed to:", didManager.address);
  
  // Update DLAC with DID Manager address
  await dlacManager.updateDIDRegistry(didManager.address);
  console.log("DLAC_Manager updated with DID_Manager address");
  
  const AuditLogger = await ethers.getContractFactory("EnhancedAuditLog");
  const auditLogger = await AuditLogger.deploy();
  await auditLogger.deployed();
  console.log("AuditLogger deployed to:", auditLogger.address);
  
  const EHRManager = await ethers.getContractFactory("UpdatedPatientDataStorage");
  const ehrManager = await EHRManager.deploy(
    dlacManager.address,
    auditLogger.address,
    didManager.address,
    zkpManager.address
  );
  await ehrManager.deployed();
  console.log("EHR_Manager deployed to:", ehrManager.address);
  
  // Save deployment info
  const deploymentInfo = {
    network: "sepolia",
    timestamp: new Date().toISOString(),
    zkpManager: zkpManager.address,
    dlacManager: dlacManager.address,
    didManager: didManager.address,
    auditLogger: auditLogger.address,
    ehrManager: ehrManager.address
  };
  
  const filename = `deployment-sepolia-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment info saved to:", filename);
  console.log("Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });