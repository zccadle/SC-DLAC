// additional-metrics.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function measureAsyncExecutionTime(asyncFunc) {
  const start = performance.now();
  const result = await asyncFunc();
  const end = performance.now();
  return { result, timeMs: end - start };
}

async function main() {
  console.log("Measuring additional required metrics...");
  
  // Create results directory
  const resultsDir = path.join(__dirname, '../results');
  if (!fs.existsSync(resultsDir)){
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Initialize results object
  const results = {
    accessPolicyOperations: {
      description: "Performance of access policy operations",
      registration: [],
      delegation: [],
      verification: [],
      authorization: []
    },
    dataPolicyPerformance: {
      description: "Performance comparison of data-intensive vs non-intensive policies",
      dataIntensive: [],
      nonDataIntensive: []
    }
  };
  
  try {
    // Deploy contracts
    console.log("Deploying contracts...");
    
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
    
    // Get signers
    const [owner, doctor1, patient1, paramedic1] = await ethers.getSigners();
    
    // Setup basic entities
    console.log("Setting up test users...");
    
    // Create DIDs
    const doctorDID = `did:ethr:${doctor1.address}`;
    await didRegistry.connect(doctor1).createDID(doctorDID, []);
    
    const patientDID = `did:ethr:${patient1.address}`;
    await didRegistry.connect(patient1).createDID(patientDID, []);
    
    const paramedicDID = `did:ethr:${paramedic1.address}`;
    await didRegistry.connect(paramedic1).createDID(paramedicDID, []);
    
    // Assign roles
    const doctorCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DOCTOR_CREDENTIAL"));
    await rbac.connect(owner).assignRole(
      doctor1.address,
      "DOCTOR",
      doctorCredential,
      doctorDID,
      365 * 24 * 60 * 60,
      false
    );
    
    // Grant permissions
    await rbac.connect(owner).grantPermission("DOCTOR", "view_data");
    await rbac.connect(owner).grantPermission("DOCTOR", "update_data");
    await rbac.connect(owner).grantPermission("DOCTOR", "create_record");
    
    // Create patient record
    await patientStorage.connect(doctor1).createPatientRecord(patient1.address);
    
    // 1. Measure Access Policy Registration Times
    console.log("\n1. Measuring access policy registration times...");
    for (let i = 0; i < 5; i++) {
      const { timeMs } = await measureAsyncExecutionTime(async () => {
        const tx = await patientStorage.connect(patient1).createDelegationPolicy(
          paramedic1.address,
          `vital-signs-${i}`,
          "read",
          24 * 60 * 60
        );
        await tx.wait();
      });
      results.accessPolicyOperations.registration.push({
        iteration: i,
        timeMs: timeMs
      });
      console.log(`  Iteration ${i+1}: ${timeMs.toFixed(2)}ms`);
    }
    
    // 2. Measure Access Right Delegation Times
    console.log("\n2. Measuring access right delegation times...");
    for (let i = 0; i < 5; i++) {
      const tempUser = new ethers.Wallet.createRandom().connect(ethers.provider);
      const tempDID = `did:ethr:${tempUser.address}`;
      
      const { timeMs } = await measureAsyncExecutionTime(async () => {
        const tx = await rbac.connect(owner).assignRole(
          paramedic1.address,
          "PARAMEDIC",
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`PARAMEDIC_CRED_${i}`)),
          paramedicDID,
          365 * 24 * 60 * 60,
          true // true for delegated role
        );
        await tx.wait();
      });
      results.accessPolicyOperations.delegation.push({
        iteration: i,
        timeMs: timeMs
      });
      console.log(`  Iteration ${i+1}: ${timeMs.toFixed(2)}ms`);
    }
    
    // 3. Measure Access Right Policy Verification Times
    console.log("\n3. Measuring access policy verification times...");
    for (let i = 0; i < 5; i++) {
      const { timeMs } = await measureAsyncExecutionTime(async () => {
        // This is a view function, so we're measuring client-side latency
        await patientStorage.getPolicy(i+1);
      });
      results.accessPolicyOperations.verification.push({
        iteration: i,
        timeMs: timeMs
      });
      console.log(`  Iteration ${i+1}: ${timeMs.toFixed(2)}ms`);
    }
    
    // 4. Measure Access Right Authorization Times
    console.log("\n4. Measuring access right authorization times...");
    for (let i = 0; i < 5; i++) {
      const { timeMs } = await measureAsyncExecutionTime(async () => {
        // This is measuring the time to check if a user has permission (view function)
        await rbac.hasPermission(doctor1.address, "view_data");
      });
      results.accessPolicyOperations.authorization.push({
        iteration: i,
        timeMs: timeMs
      });
      console.log(`  Iteration ${i+1}: ${timeMs.toFixed(2)}ms`);
    }
    
    // 5. Data-intensive vs Non-intensive policy performance
    console.log("\n5. Measuring data-intensive vs non-intensive policy performance...");
    
    // Data-intensive policy (large data)
    for (let i = 0; i < 3; i++) {
      // Generate ZK proof for doctor
      const zkProof = ethers.utils.randomBytes(32);
      const roleHash = await rbac.getRoleCredential(doctor1.address);
      const proofHash = ethers.utils.keccak256(
        ethers.utils.solidityPack(['bytes32', 'bytes'], [roleHash, zkProof])
      );
      
      // Submit proof
      await zkpVerifier.connect(doctor1).submitProof(proofHash);
      
      // Create large data (simulate)
      const largeData = Buffer.alloc(10 * 1024).fill('X').toString(); // 10KB of data
      
      const { timeMs } = await measureAsyncExecutionTime(async () => {
        // Update with large data
        const tx = await patientStorage.connect(doctor1).updatePatientData(
          patient1.address,
          `complex-data-${i}`,
          largeData,
          zkProof
        );
        await tx.wait();
      });
      
      results.dataPolicyPerformance.dataIntensive.push({
        iteration: i,
        dataSize: "10KB",
        timeMs: timeMs
      });
      console.log(`  Data-intensive iteration ${i+1}: ${timeMs.toFixed(2)}ms`);
    }
    
    // Non-data-intensive policy (small data)
    for (let i = 0; i < 3; i++) {
      // Generate ZK proof for doctor
      const zkProof = ethers.utils.randomBytes(32);
      const roleHash = await rbac.getRoleCredential(doctor1.address);
      const proofHash = ethers.utils.keccak256(
        ethers.utils.solidityPack(['bytes32', 'bytes'], [roleHash, zkProof])
      );
      
      // Submit proof
      await zkpVerifier.connect(doctor1).submitProof(proofHash);
      
      // Create small data
      const smallData = "Basic info: Temperature 37°C, BP 120/80";
      
      const { timeMs } = await measureAsyncExecutionTime(async () => {
        // Update with small data
        const tx = await patientStorage.connect(doctor1).updatePatientData(
          patient1.address,
          `simple-data-${i}`,
          smallData,
          zkProof
        );
        await tx.wait();
      });
      
      results.dataPolicyPerformance.nonDataIntensive.push({
        iteration: i,
        dataSize: "small",
        timeMs: timeMs
      });
      console.log(`  Non-data-intensive iteration ${i+1}: ${timeMs.toFixed(2)}ms`);
    }
    
    // Calculate averages
    console.log("\nCalculating averages...");
    
    results.accessPolicyOperations.registrationAvg = 
      results.accessPolicyOperations.registration.reduce((sum, item) => sum + item.timeMs, 0) / 
      results.accessPolicyOperations.registration.length;
      
    results.accessPolicyOperations.delegationAvg = 
      results.accessPolicyOperations.delegation.reduce((sum, item) => sum + item.timeMs, 0) / 
      results.accessPolicyOperations.delegation.length;
      
    results.accessPolicyOperations.verificationAvg = 
      results.accessPolicyOperations.verification.reduce((sum, item) => sum + item.timeMs, 0) / 
      results.accessPolicyOperations.verification.length;
      
    results.accessPolicyOperations.authorizationAvg = 
      results.accessPolicyOperations.authorization.reduce((sum, item) => sum + item.timeMs, 0) / 
      results.accessPolicyOperations.authorization.length;
      
    results.dataPolicyPerformance.dataIntensiveAvg = 
      results.dataPolicyPerformance.dataIntensive.reduce((sum, item) => sum + item.timeMs, 0) / 
      results.dataPolicyPerformance.dataIntensive.length;
      
    results.dataPolicyPerformance.nonDataIntensiveAvg = 
      results.dataPolicyPerformance.nonDataIntensive.reduce((sum, item) => sum + item.timeMs, 0) / 
      results.dataPolicyPerformance.nonDataIntensive.length;
    
    // Save results
    console.log("Saving results to file...");
    fs.writeFileSync(
      path.join(resultsDir, "additional-metrics.json"),
      JSON.stringify(results, null, 2)
    );
    
    console.log("\nAdditional metrics measurement complete!");
    
  } catch (error) {
    console.error("Error during measurements:", error);
    // Save partial results if available
    if (Object.keys(results).length > 0) {
      fs.writeFileSync(
        path.join(resultsDir, "partial-additional-metrics.json"),
        JSON.stringify(results, null, 2)
      );
      console.log("Partial results saved.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });