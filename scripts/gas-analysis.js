// gas-analysis.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting gas analysis...");
  
  // Deploy contracts and record gas used
  const deploymentGas = {};
  
  // ZKPVerifier
  const ZKPVerifier = await ethers.getContractFactory("ZKPVerifier");
  const zkpDeployTx = await ZKPVerifier.getDeployTransaction();
  const zkpEstimatedGas = await ethers.provider.estimateGas(zkpDeployTx);
  deploymentGas.ZKPVerifier = zkpEstimatedGas.toString();
  
  const zkpVerifier = await ZKPVerifier.deploy();
  await zkpVerifier.deployed();
  
  // EnhancedRBAC
  const EnhancedRBAC = await ethers.getContractFactory("EnhancedRBAC");
  const rbacDeployTx = await EnhancedRBAC.getDeployTransaction(ethers.constants.AddressZero, zkpVerifier.address);
  const rbacEstimatedGas = await ethers.provider.estimateGas(rbacDeployTx);
  deploymentGas.EnhancedRBAC = rbacEstimatedGas.toString();
  
  const rbac = await EnhancedRBAC.deploy(ethers.constants.AddressZero, zkpVerifier.address);
  await rbac.deployed();
  
  // DIDRegistry
  const DIDRegistry = await ethers.getContractFactory("DIDRegistry");
  const didRegistryDeployTx = await DIDRegistry.getDeployTransaction(rbac.address);
  const didRegistryEstimatedGas = await ethers.provider.estimateGas(didRegistryDeployTx);
  deploymentGas.DIDRegistry = didRegistryEstimatedGas.toString();
  
  const didRegistry = await DIDRegistry.deploy(rbac.address);
  await didRegistry.deployed();
  
  // EnhancedAuditLog
  const EnhancedAuditLog = await ethers.getContractFactory("EnhancedAuditLog");
  const auditLogDeployTx = await EnhancedAuditLog.getDeployTransaction();
  const auditLogEstimatedGas = await ethers.provider.estimateGas(auditLogDeployTx);
  deploymentGas.EnhancedAuditLog = auditLogEstimatedGas.toString();
  
  const auditLog = await EnhancedAuditLog.deploy();
  await auditLog.deployed();
  
  // UpdatedPatientDataStorage
  const PatientDataStorage = await ethers.getContractFactory("UpdatedPatientDataStorage");
  const patientStorageDeployTx = await PatientDataStorage.getDeployTransaction(
    rbac.address,
    auditLog.address,
    didRegistry.address,
    zkpVerifier.address
  );
  const patientStorageEstimatedGas = await ethers.provider.estimateGas(patientStorageDeployTx);
  deploymentGas.UpdatedPatientDataStorage = patientStorageEstimatedGas.toString();
  
  const patientStorage = await PatientDataStorage.deploy(
    rbac.address,
    auditLog.address,
    didRegistry.address,
    zkpVerifier.address
  );
  await patientStorage.deployed();
  
  // Save deployment gas results
  console.log("Deployment Gas Costs:", deploymentGas);
  
  // Create directory if it doesn't exist
  const resultsDir = path.join(__dirname, '../results');
  if (!fs.existsSync(resultsDir)){
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(resultsDir, "deployment-gas-costs.json"), 
    JSON.stringify(deploymentGas, null, 2)
  );
  
  // Now measure operational gas costs
  console.log("\nMeasuring operational gas costs...");
  const operationalGas = {};
  
  // Setup basic entities for testing
  const [owner, doctor, patient, nurse, paramedic] = await ethers.getSigners();
  
  // Update RBAC with DID Registry address
  try {
    const updateDIDRegistryTx = await rbac.connect(owner).updateDIDRegistry(didRegistry.address);
    const updateDIDRegistryReceipt = await updateDIDRegistryTx.wait();
    operationalGas.updateDIDRegistry = updateDIDRegistryReceipt.gasUsed.toString();
    console.log("- updateDIDRegistry gas:", operationalGas.updateDIDRegistry);
  } catch (error) {
    console.error("Error measuring updateDIDRegistry:", error.message);
  }
  
  // RBAC Functions
  try {
    const addRoleTx = await rbac.connect(owner).addRole("RESEARCHER", "Medical researcher role");
    const addRoleReceipt = await addRoleTx.wait();
    operationalGas.addRole = addRoleReceipt.gasUsed.toString();
    console.log("- addRole gas:", operationalGas.addRole);
  } catch (error) {
    console.error("Error measuring addRole:", error.message);
  }
  
  // Create DIDs
  try {
    const doctorDID = `did:ethr:${doctor.address}`;
    const createDIDTx = await didRegistry.connect(doctor).createDID(doctorDID, []);
    const createDIDReceipt = await createDIDTx.wait();
    operationalGas.createDID = createDIDReceipt.gasUsed.toString();
    console.log("- createDID gas:", operationalGas.createDID);
  
    const patientDID = `did:ethr:${patient.address}`;
    await didRegistry.connect(patient).createDID(patientDID, []);
    
    // Nurse DID
    const nurseDID = `did:ethr:${nurse.address}`;
    await didRegistry.connect(nurse).createDID(nurseDID, []);
    
    // Paramedic DID
    const paramedicDID = `did:ethr:${paramedic.address}`;
    await didRegistry.connect(paramedic).createDID(paramedicDID, []);
  } catch (error) {
    console.error("Error setting up DIDs:", error.message);
  }
  
  // Add DID Attribute
  try {
    const doctorDID = `did:ethr:${doctor.address}`;
    const addAttributeTx = await didRegistry.connect(doctor).addAttribute(doctorDID, "specialty", "cardiology");
    const addAttributeReceipt = await addAttributeTx.wait();
    operationalGas.addAttribute = addAttributeReceipt.gasUsed.toString();
    console.log("- addAttribute gas:", operationalGas.addAttribute);
  } catch (error) {
    console.error("Error measuring addAttribute:", error.message);
  }
  
  // Assign Roles
  try {
    const doctorDID = `did:ethr:${doctor.address}`;
    const doctorCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DOCTOR_CREDENTIAL"));
    const assignRoleTx = await rbac.connect(owner).assignRole(
      doctor.address,
      "DOCTOR",
      doctorCredential,
      doctorDID,
      365 * 24 * 60 * 60,
      false // not delegated
    );
    const assignRoleReceipt = await assignRoleTx.wait();
    operationalGas.assignRole = assignRoleReceipt.gasUsed.toString();
    console.log("- assignRole gas:", operationalGas.assignRole);
    
    // Assign nurse role
    const nurseDID = `did:ethr:${nurse.address}`;
    const nurseCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("NURSE_CREDENTIAL"));
    await rbac.connect(owner).assignRole(
      nurse.address,
      "NURSE",
      nurseCredential,
      nurseDID,
      365 * 24 * 60 * 60,
      false
    );
    
    // Assign paramedic role with delegation
    const paramedicDID = `did:ethr:${paramedic.address}`;
    const paramedicCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PARAMEDIC_CREDENTIAL"));
    await rbac.connect(owner).assignRole(
      paramedic.address,
      "PARAMEDIC",
      paramedicCredential,
      paramedicDID,
      365 * 24 * 60 * 60,
      true // delegated
    );
  } catch (error) {
    console.error("Error assigning roles:", error.message);
  }
  
  // Grant Permission
  try {
    const grantPermissionTx = await rbac.connect(owner).grantPermission("DOCTOR", "view_data");
    const grantPermissionReceipt = await grantPermissionTx.wait();
    operationalGas.grantPermission = grantPermissionReceipt.gasUsed.toString();
    console.log("- grantPermission gas:", operationalGas.grantPermission);
    
    // Grant additional permissions
    await rbac.connect(owner).grantPermission("DOCTOR", "create_record");
    await rbac.connect(owner).grantPermission("DOCTOR", "update_data");
  } catch (error) {
    console.error("Error granting permissions:", error.message);
  }
  
  // Create Patient Record
  try {
    const createPatientRecordTx = await patientStorage.connect(doctor).createPatientRecord(patient.address);
    const createPatientRecordReceipt = await createPatientRecordTx.wait();
    operationalGas.createPatientRecord = createPatientRecordReceipt.gasUsed.toString();
    console.log("- createPatientRecord gas:", operationalGas.createPatientRecord);
  } catch (error) {
    console.error("Error creating patient record:", error.message);
  }
  
  // ZKProof operations
  try {
    const zkProof = ethers.utils.randomBytes(32);
    const roleHash = await rbac.getRoleCredential(doctor.address);
    const proofHash = ethers.utils.keccak256(
      ethers.utils.solidityPack(['bytes32', 'bytes'], [roleHash, zkProof])
    );
    
    const submitProofTx = await zkpVerifier.connect(doctor).submitProof(proofHash);
    const submitProofReceipt = await submitProofTx.wait();
    operationalGas.submitProof = submitProofReceipt.gasUsed.toString();
    console.log("- submitProof gas:", operationalGas.submitProof);
  } catch (error) {
    console.error("Error handling ZKProof operations:", error.message);
  }
  
  // Update Patient Data
  try {
    const zkProof = ethers.utils.randomBytes(32);
    const roleHash = await rbac.getRoleCredential(doctor.address);
    const proofHash = ethers.utils.keccak256(
      ethers.utils.solidityPack(['bytes32', 'bytes'], [roleHash, zkProof])
    );
    
    await zkpVerifier.connect(doctor).submitProof(proofHash);
    
    const updatePatientDataTx = await patientStorage.connect(doctor).updatePatientData(
      patient.address,
      "vitals",
      "encrypted_vitals_data",
      zkProof
    );
    const updatePatientDataReceipt = await updatePatientDataTx.wait();
    operationalGas.updatePatientData = updatePatientDataReceipt.gasUsed.toString();
    console.log("- updatePatientData gas:", operationalGas.updatePatientData);
  } catch (error) {
    console.error("Error updating patient data:", error.message);
  }
  
  // Create Delegation Policy 
  try {
    const createPolicyTx = await patientStorage.connect(patient).createDelegationPolicy(
      paramedic.address,
      "vitals",
      "read",
      24 * 60 * 60 // 24 hours validity
    );
    const createPolicyReceipt = await createPolicyTx.wait();
    operationalGas.createDelegationPolicy = createPolicyReceipt.gasUsed.toString();
    console.log("- createDelegationPolicy gas:", operationalGas.createDelegationPolicy);
  } catch (error) {
    console.error("Error creating delegation policy:", error.message);
  }
  
  // Update Policy
  try {
    const updatePolicyTx = await patientStorage.connect(patient).updatePolicy(1, false);
    const updatePolicyReceipt = await updatePolicyTx.wait();
    operationalGas.updatePolicy = updatePolicyReceipt.gasUsed.toString();
    console.log("- updatePolicy gas:", operationalGas.updatePolicy);
  } catch (error) {
    console.error("Error updating policy:", error.message);
  }
  
  // Request Emergency Access
  try {
    // Re-enable policy
    await patientStorage.connect(patient).updatePolicy(1, true);
    
    const paramedicZKProof = ethers.utils.randomBytes(32);
    const paramedicRoleHash = await rbac.getRoleCredential(paramedic.address);
    const paramedicProofHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [paramedicRoleHash, paramedicZKProof])
    );
    
    await zkpVerifier.connect(paramedic).submitProof(paramedicProofHash);
    
    const requestEmergencyAccessTx = await patientStorage.connect(paramedic).requestDelegatedEmergencyAccess(
      patient.address,
      "Emergency situation",
      paramedicZKProof,
      1 // policy ID
    );
    const requestEmergencyAccessReceipt = await requestEmergencyAccessTx.wait();
    operationalGas.requestDelegatedEmergencyAccess = requestEmergencyAccessReceipt.gasUsed.toString();
    console.log("- requestDelegatedEmergencyAccess gas:", operationalGas.requestDelegatedEmergencyAccess);
  } catch (error) {
    console.error("Error requesting emergency access:", error.message);
  }
  
  // Revoke Emergency Access
  try {
    const revokeEmergencyAccessTx = await patientStorage.connect(patient).revokeDelegatedEmergencyAccess(paramedic.address);
    const revokeEmergencyAccessReceipt = await revokeEmergencyAccessTx.wait();
    operationalGas.revokeDelegatedEmergencyAccess = revokeEmergencyAccessReceipt.gasUsed.toString();
    console.log("- revokeDelegatedEmergencyAccess gas:", operationalGas.revokeDelegatedEmergencyAccess);
  } catch (error) {
    console.error("Error revoking emergency access:", error.message);
  }
  
  // Revoke Role - This will correctly set up a role first and then revoke it
  try {
    // Create a temporary role to revoke
    const tempUserDID = `did:ethr:${owner.address}`;
    
    const tempRoleTx = await rbac.connect(owner).assignRole(
      owner.address,
      "TEMP_ROLE",
      ethers.utils.keccak256(ethers.utils.toUtf8Bytes("TEMP_CREDENTIAL")),
      tempUserDID,
      365 * 24 * 60 * 60,
      false
    );
    await tempRoleTx.wait();
    
    const revokeRoleTx = await rbac.connect(owner).revokeRole(owner.address);
    const revokeRoleReceipt = await revokeRoleTx.wait();
    operationalGas.revokeRole = revokeRoleReceipt.gasUsed.toString();
    console.log("- revokeRole gas:", operationalGas.revokeRole);
  } catch (error) {
    console.error("Error revoking role:", error.message);
  }
  
  // Revoke Permission
  try {
    const revokePermissionTx = await rbac.connect(owner).revokePermission("DOCTOR", "create_record");
    const revokePermissionReceipt = await revokePermissionTx.wait();
    operationalGas.revokePermission = revokePermissionReceipt.gasUsed.toString();
    console.log("- revokePermission gas:", operationalGas.revokePermission);
  } catch (error) {
    console.error("Error revoking permission:", error.message);
  }
  
  // Add information about view functions
  operationalGas.getDIDDocument = "View function - no gas cost";
  operationalGas.getAttribute = "View function - no gas cost";
  operationalGas.getDIDByAddress = "View function - no gas cost";
  operationalGas.verifyDIDControl = "View function - no gas cost";
  operationalGas.verifyDIDRole = "View function - no gas cost";
  operationalGas.getUserRole = "View function - no gas cost";
  operationalGas.getRoleData = "View function - no gas cost";
  operationalGas.hasPermission = "View function - no gas cost";
  operationalGas.validateProof = "View function - no gas cost";
  operationalGas.getProofDetails = "View function - no gas cost";
  operationalGas.getLatestProof = "View function - no gas cost";
  operationalGas.checkDelegatedEmergencyAccess = "View function - no gas cost";
  
  // Save results
  console.log("\nOperational Gas Costs:", operationalGas);
  fs.writeFileSync(
    path.join(resultsDir, "operational-gas-costs.json"), 
    JSON.stringify(operationalGas, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });