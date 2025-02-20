// performance-analysis.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const crypto = require('crypto');

// Helpers for timing operations
function measureExecutionTime(func) {
  const start = performance.now();
  const result = func();
  const end = performance.now();
  return { result, timeMs: end - start };
}

async function measureAsyncExecutionTime(asyncFunc) {
  const start = performance.now();
  const result = await asyncFunc();
  const end = performance.now();
  return { result, timeMs: end - start };
}

// Simulated encryption/decryption functions
function simulateEncryption(data, key) {
  return measureExecutionTime(() => {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, Buffer.alloc(16, 0));
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  });
}

function simulateDecryption(encryptedData, key) {
  return measureExecutionTime(() => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.alloc(16, 0));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  });
}

// Simulated ZKP operations
function simulateZKProofGeneration(data, complexity) {
  return measureExecutionTime(() => {
    let result = crypto.createHash('sha256').update(data).digest('hex');
    // Simulate different complexity levels with multiple hash iterations
    for (let i = 0; i < complexity; i++) {
      result = crypto.createHash('sha256').update(result).digest('hex');
    }
    return result;
  });
}

function simulateZKProofValidation(proof, complexity) {
  return measureExecutionTime(() => {
    let result = crypto.createHash('sha256').update(proof).digest('hex');
    // Validation is typically less complex than generation
    for (let i = 0; i < complexity / 3; i++) {
      result = crypto.createHash('sha256').update(result).digest('hex');
    }
    return result;
  });
}

// Performance test runner
async function main() {
  console.log("Starting performance analysis...");
  
  // Create results directory
  const resultsDir = path.join(__dirname, '../results');
  if (!fs.existsSync(resultsDir)){
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Initialize results object
  const results = {
    encryptionDecryption: {
      description: "Measures time taken to encrypt and decrypt data of varying sizes",
      data: []
    },
    zkProofOperations: {
      description: "Measures time taken for ZK proof generation and validation with varying complexities",
      data: []
    },
    transactionTimes: {
      description: "Measures average execution time for contract operations",
      data: {}
    },
    responsiveness: {
      description: "Measures system responsiveness under different loads",
      latency: [],
      throughput: []
    }
  };
  
  try {
    // 1. Encryption/Decryption vs Data Size
    console.log("\n1. Testing Encryption/Decryption Performance...");
    const encryptionKey = crypto.randomBytes(32);
    
    for (let size = 1; size <= 1024; size *= 2) {
      console.log(`  - Testing with ${size}KB of data...`);
      const testData = Buffer.alloc(size * 1024).fill('A').toString();
      
      // Encryption test
      const encResult = simulateEncryption(testData, encryptionKey);
      
      // Decryption test
      const decResult = simulateDecryption(encResult.result, encryptionKey);
      
      results.encryptionDecryption.data.push({
        sizeKB: size,
        encryptionTimeMs: encResult.timeMs,
        decryptionTimeMs: decResult.timeMs
      });
      
      console.log(`    Encryption: ${encResult.timeMs.toFixed(2)}ms, Decryption: ${decResult.timeMs.toFixed(2)}ms`);
    }
    
    // 2. ZK Proof Generation/Validation Times
    console.log("\n2. Testing ZK Proof Operations...");
    
    for (let complexity = 1; complexity <= 128; complexity *= 2) {
      console.log(`  - Testing with complexity level ${complexity}...`);
      const testData = `test-data-${complexity}`;
      
      // Generation test
      const genResult = simulateZKProofGeneration(testData, complexity);
      
      // Validation test
      const valResult = simulateZKProofValidation(genResult.result, complexity);
      
      results.zkProofOperations.data.push({
        complexity,
        generationTimeMs: genResult.timeMs,
        validationTimeMs: valResult.timeMs
      });
      
      console.log(`    Generation: ${genResult.timeMs.toFixed(2)}ms, Validation: ${valResult.timeMs.toFixed(2)}ms`);
    }
    
    // 3. Transaction times for contract operations
    console.log("\n3. Setting up contracts for transaction time measurements...");
    
    // Deploy all contracts
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
    const [owner, doctor, patient, paramedic] = await ethers.getSigners();
    
    // Setup basic entities
    console.log("  - Setting up users and roles...");
    
    // Create DIDs
    const doctorDID = `did:ethr:${doctor.address}`;
    await didRegistry.connect(doctor).createDID(doctorDID, []);
    
    const patientDID = `did:ethr:${patient.address}`;
    await didRegistry.connect(patient).createDID(patientDID, []);
    
    const paramedicDID = `did:ethr:${paramedic.address}`;
    await didRegistry.connect(paramedic).createDID(paramedicDID, []);
    
    // Assign roles
    const doctorCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DOCTOR_CREDENTIAL"));
    await rbac.connect(owner).assignRole(
      doctor.address,
      "DOCTOR",
      doctorCredential,
      doctorDID,
      365 * 24 * 60 * 60,
      false
    );
    
    const paramedicCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PARAMEDIC_CREDENTIAL"));
    await rbac.connect(owner).assignRole(
      paramedic.address,
      "PARAMEDIC",
      paramedicCredential,
      paramedicDID,
      365 * 24 * 60 * 60,
      true // delegated role
    );
    
    // Grant permissions
    await rbac.connect(owner).grantPermission("DOCTOR", "view_data");
    await rbac.connect(owner).grantPermission("DOCTOR", "update_data");
    await rbac.connect(owner).grantPermission("DOCTOR", "create_record");
    
    // Create patient record
    await patientStorage.connect(doctor).createPatientRecord(patient.address);
    
    console.log("\n  - Measuring access policy registration times...");
    let policyRegistrationTimes = [];
    for (let i = 0; i < 5; i++) {
      const { timeMs } = await measureAsyncExecutionTime(async () => {
        const tx = await patientStorage.connect(patient).createDelegationPolicy(
          paramedic.address,
          `data-category-${i}`,
          "read",
          24 * 60 * 60
        );
        await tx.wait();
      });
      policyRegistrationTimes.push(timeMs);
      console.log(`    Iteration ${i+1}: ${timeMs.toFixed(2)}ms`);
    }
    results.transactionTimes.data.policyRegistration = {
      iterations: 5,
      times: policyRegistrationTimes,
      averageMs: policyRegistrationTimes.reduce((a, b) => a + b, 0) / policyRegistrationTimes.length
    };
    
    console.log("\n  - Measuring access right delegation times...");
    let delegationTimes = [];
    for (let i = 0; i < 5; i++) {
      const tempUser = ethers.Wallet.createRandom().connect(ethers.provider);
      const tempDID = `did:ethr:${tempUser.address}`;
      
      const { timeMs } = await measureAsyncExecutionTime(async () => {
        const tx = await rbac.connect(owner).assignRole(
          tempUser.address,
          "DOCTOR",
          ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`TEMP_CRED_${i}`)),
          tempDID,
          365 * 24 * 60 * 60,
          false
        );
        await tx.wait();
      });
      delegationTimes.push(timeMs);
      console.log(`    Iteration ${i+1}: ${timeMs.toFixed(2)}ms`);
    }
    results.transactionTimes.data.accessRightDelegation = {
      iterations: 5,
      times: delegationTimes,
      averageMs: delegationTimes.reduce((a, b) => a + b, 0) / delegationTimes.length
    };
    
    console.log("\n  - Measuring emergency access request times...");
    let emergencyAccessTimes = [];
    for (let i = 0; i < 3; i++) {
      // Create a new policy for each test
      const tx = await patientStorage.connect(patient).createDelegationPolicy(
        paramedic.address,
        `emergency-data-${i}`,
        "read",
        24 * 60 * 60
      );
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === 'PolicyCreated');
      const policyID = event.args.policyID;
      
      // Submit proof
      const paramedicZKProof = ethers.utils.randomBytes(32);
      const paramedicRoleHash = await rbac.getRoleCredential(paramedic.address);
      const paramedicProofHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [paramedicRoleHash, paramedicZKProof])
      );
      await zkpVerifier.connect(paramedic).submitProof(paramedicProofHash);
      
      // Measure emergency access request
      const { timeMs } = await measureAsyncExecutionTime(async () => {
        const tx = await patientStorage.connect(paramedic).requestDelegatedEmergencyAccess(
          patient.address,
          `Emergency situation ${i}`,
          paramedicZKProof,
          policyID
        );
        await tx.wait();
      });
      emergencyAccessTimes.push(timeMs);
      console.log(`    Iteration ${i+1}: ${timeMs.toFixed(2)}ms`);
    }
    results.transactionTimes.data.emergencyAccessRequest = {
      iterations: 3,
      times: emergencyAccessTimes,
      averageMs: emergencyAccessTimes.reduce((a, b) => a + b, 0) / emergencyAccessTimes.length
    };
    
    console.log("\n  - Measuring data update times...");
    let dataUpdateTimes = [];
    for (let i = 0; i < 5; i++) {
      const zkProof = ethers.utils.randomBytes(32);
      const roleHash = await rbac.getRoleCredential(doctor.address);
      const proofHash = ethers.utils.keccak256(
        ethers.utils.solidityPack(['bytes32', 'bytes'], [roleHash, zkProof])
      );
      await zkpVerifier.connect(doctor).submitProof(proofHash);
      
      const { timeMs } = await measureAsyncExecutionTime(async () => {
        const tx = await patientStorage.connect(doctor).updatePatientData(
          patient.address,
          `data-category-${i}`,
          `encrypted-data-${i}-${Date.now()}`,
          zkProof
        );
        await tx.wait();
      });
      dataUpdateTimes.push(timeMs);
      console.log(`    Iteration ${i+1}: ${timeMs.toFixed(2)}ms`);
    }
    results.transactionTimes.data.dataUpdate = {
      iterations: 5,
      times: dataUpdateTimes,
      averageMs: dataUpdateTimes.reduce((a, b) => a + b, 0) / dataUpdateTimes.length
    };
    
    // 4. Responsiveness analysis
    console.log("\n4. Testing system responsiveness under load...");
    // We'll test with different numbers of concurrent transactions
    for (let concurrency = 1; concurrency <= 8; concurrency *= 2) {
      console.log(`  - Testing with ${concurrency} concurrent requests...`);
      
      // Measure latency (time to complete all transactions)
      const startTime = performance.now();
      const promises = [];
      
      for (let i = 0; i < concurrency; i++) {
        promises.push(
          (async () => {
            const zkProof = ethers.utils.randomBytes(32);
            const proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`proof-${i}-${Date.now()}`));
            const tx = await zkpVerifier.connect(owner).submitProof(proofHash);
            return await tx.wait();
          })()
        );
      }
      
      await Promise.all(promises);
      const endTime = performance.now();
      
      const totalTimeMs = endTime - startTime;
      const avgLatencyMs = totalTimeMs / concurrency;
      const throughputTps = (concurrency * 1000) / totalTimeMs;
      
      results.responsiveness.latency.push({
        concurrentTxs: concurrency,
        totalTimeMs,
        avgLatencyMs
      });
      
      results.responsiveness.throughput.push({
        concurrentTxs: concurrency,
        throughputTps
      });
      
      console.log(`    Avg Latency: ${avgLatencyMs.toFixed(2)}ms, Throughput: ${throughputTps.toFixed(2)} tx/s`);
    }
    
    // Save all results
    console.log("\nSaving performance results...");
    fs.writeFileSync(
      path.join(resultsDir, "performance-results.json"),
      JSON.stringify(results, null, 2)
    );
    
    console.log("\nPerformance analysis completed successfully!");
    
  } catch (error) {
    console.error("Error during performance analysis:", error);
    // Save partial results if available
    if (Object.keys(results).length > 0) {
      fs.writeFileSync(
        path.join(resultsDir, "partial-performance-results.json"),
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