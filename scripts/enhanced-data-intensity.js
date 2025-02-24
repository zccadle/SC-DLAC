// enhanced-data-intensity.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const { submitAndVerifyProof, ensureValidProof } = require('./role-proof-helper');
const config = require('./test-config');

async function setupProofForDoctor(doctor, dlacManager, zkpManager) {
  try {
      // Get role credential
      const roleHash = await dlacManager.getRoleCredential(doctor.address);
      
      // Generate and format proof
      const zkProof = ethers.utils.randomBytes(32);
      const proofHash = ethers.utils.keccak256(zkProof);
      
      // Submit the raw proof hash
      const submitTx = await zkpManager.connect(doctor).submitProof(proofHash, {
          gasLimit: config.gasLimits.proofSubmission
      });
      await submitTx.wait();
      
      // Verify it was registered
      const isValid = await zkpManager.validateProof(doctor.address, proofHash);
      if (!isValid) {
          throw new Error("Proof validation failed after submission");
      }
      
      return {
          zkProof,
          proofHash,
          isValid: true
      };
  } catch (error) {
      console.error("Error in proof setup:", error);
      return {
          isValid: false,
          error: error.message
      };
  }
}

// Helper function to measure execution time
async function measureTime(func) {
  const start = performance.now();
  const result = await func();
  const end = performance.now();
  return { result, timeMs: end - start };
}

// Helper function with robust error handling
async function measureTimeWithFallback(func, fallbackMs, operation) {
  try {
    const { timeMs } = await measureTime(func);
    return { timeMs, error: null };
  } catch (error) {
    console.error(`Error in ${operation}: ${error.message}`);
    return { timeMs: fallbackMs, error: error.message };
  }
}

// Helper function to generate data of specific size
function generateData(sizeKB) {
  const safeSizeKB = Math.min(sizeKB, 2048); // Cap at 2MB for safety
  return Buffer.alloc(safeSizeKB * 1024).fill('X').toString();
}

async function main() {
  // Create results directory
  const resultsDir = path.join(__dirname, '../results');
  if (!fs.existsSync(resultsDir)){
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  console.log("Deploying contracts for enhanced data intensity testing...");
  
  // Deploy contracts
  const ZKPManager = await ethers.getContractFactory("ZKPVerifier");
  const zkpManager = await ZKPManager.deploy();
  await zkpManager.deployed();
  
  const DLACManager = await ethers.getContractFactory("EnhancedRBAC");
  const dlacManager = await DLACManager.deploy(ethers.constants.AddressZero, zkpManager.address);
  await dlacManager.deployed();
  
  const DIDManager = await ethers.getContractFactory("DIDRegistry");
  const didManager = await DIDManager.deploy(dlacManager.address);
  await didManager.deployed();
  
  await dlacManager.updateDIDRegistry(didManager.address);
  
  const AuditLogger = await ethers.getContractFactory("EnhancedAuditLog");
  const auditLogger = await AuditLogger.deploy();
  await auditLogger.deployed();
  
  const EHRManager = await ethers.getContractFactory("UpdatedPatientDataStorage");
  const ehrManager = await EHRManager.deploy(
    dlacManager.address,
    auditLogger.address,
    didManager.address,
    zkpManager.address
  );
  await ehrManager.deployed();
  
  // Get signers
  const [owner, doctor, patient] = await ethers.getSigners();
  
  // Initialize results structure
  let results = {
    description: "Enhanced data intensity impact on performance",
    testDate: new Date().toISOString(),
    iterations: config.iterations.default,
    dataIntensity: {
      intensive: [],
      nonIntensive: []
    }
  };
  
  // Setup test users and roles
  console.log("\nSetting up test users...");
  
  // Create DIDs
  try {
    const doctorDID = `did:ethr:${doctor.address}`;
    await didManager.connect(doctor).createDID(doctorDID, []);
    console.log(`Created DID for doctor: ${doctorDID}`);
    
    const patientDID = `did:ethr:${patient.address}`;
    await didManager.connect(patient).createDID(patientDID, []);
    console.log(`Created DID for patient: ${patientDID}`);
    
    // Set up doctor's role with initial proof
    const roleCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DOCTOR_CREDENTIAL"));
    await dlacManager.connect(owner).assignRole(
      doctor.address,
      "DOCTOR",
      roleCredential,
      doctorDID,
      365 * 24 * 60 * 60,
      false
    );
    console.log("Assigned DOCTOR role");
    
    // Set up initial proof
    const initialProof = await setupProofForDoctor(doctor, dlacManager, zkpManager);
    if (!initialProof.isValid) {
      throw new Error(`Failed to set up initial proof: ${initialProof.error}`);
    }
    console.log("Initial proof setup completed");

    // Grant permissions
    await dlacManager.connect(owner).grantPermission("DOCTOR", "view_data");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "update_data");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "create_record");
    console.log("Granted permissions to DOCTOR role");
    
    // Create patient record
    await ehrManager.connect(doctor).createPatientRecord(patient.address);
    console.log(`Created patient record for ${patient.address}`);
    
    // Test data sizes from config
    const dataSizes = [
      ...config.dataSizes.small,
      ...config.dataSizes.medium
    ];
    
// Test data-intensive policies (large data)
console.log("\nTesting data-intensive policy performance with various data sizes...");

for (const dataSize of dataSizes) {
  console.log(`\nTesting with ${dataSize}KB data size...`);
  const intensiveResults = [];

  // Calculate required gas limit based on data size
  const calculatedGasLimit = Math.max(
    config.gasLimits.dataUpdate,
    9000000 + (dataSize * 30000)  // Base gas + additional gas per KB
  );

  for (let i = 0; i < results.iterations; i++) {
    console.log(`Iteration ${i+1}/${results.iterations}...`);

    // Generate test data
    const largeData = generateData(dataSize);

    // Measure performance
    const { timeMs, error } = await measureTimeWithFallback(async () => {
        // Get fresh proof
        const proofResult = await setupProofForDoctor(doctor, dlacManager, zkpManager);
        if (!proofResult.isValid) {
            throw new Error(`Failed to get valid proof: ${proofResult.error}`);
        }

        // Create policy with large data category
        const createPolicyTx = await ehrManager.connect(patient).createDelegationPolicy(
            doctor.address,
            `medical-history-${dataSize}-${i}`,
            "read",
            24 * 60 * 60,
            { gasLimit: config.gasLimits.policyCreation }
        );
        await createPolicyTx.wait();

        // Update with large data
        const updateTx = await ehrManager.connect(doctor).updatePatientData(
            patient.address,
            `medical-history-${dataSize}-${i}`,
            largeData,
            proofResult.zkProof,
            { gasLimit: calculatedGasLimit }
        );
        return await updateTx.wait();
    }, 180 + dataSize * 3, `data-intensive-${dataSize}KB`);
        
        if (!error) {
          intensiveResults.push(timeMs);
          console.log(`Data-intensive operation time: ${timeMs.toFixed(2)}ms`);
        }
        
        // Sleep between iterations
        await new Promise(resolve => setTimeout(resolve, config.timing.cooldownPeriod));
      }
      
      if (intensiveResults.length > 0) {
        // Calculate statistics
        const avgTime = intensiveResults.reduce((sum, time) => sum + time, 0) / intensiveResults.length;
        const minTime = Math.min(...intensiveResults);
        const maxTime = Math.max(...intensiveResults);
        
        results.dataIntensity.intensive.push({
          dataSizeKB: dataSize,
          avgTimeMs: avgTime,
          minTimeMs: minTime,
          maxTimeMs: maxTime,
          allTimesMs: intensiveResults
        });
        
        console.log(`Average time for ${dataSize}KB: ${avgTime.toFixed(2)}ms`);
      }
    }
    
    // Test non-data-intensive policies (small data)
    console.log("\nTesting non-data-intensive policy performance with various transaction counts...");
    
    const transactionCounts = [1, 2, 4, 8];
    
    for (const txCount of transactionCounts) {
      console.log(`\nTesting with ${txCount} transactions...`);
      const nonIntensiveResults = [];
      
      for (let i = 0; i < results.iterations; i++) {
        console.log(`Iteration ${i+1}/${results.iterations}...`);
        
        // Generate small test data
        const smallData = "Basic info: Temperature 37°C, BP 120/80";
        
        // Get fresh proof for each iteration
        const proofResult = await setupProofForDoctor(doctor, dlacManager, zkpManager);
        if (!proofResult.isValid) {
          console.error(`Failed to validate proof: ${proofResult.error}`);
          continue;
        }
        
        // Measure performance
        const { timeMs, error } = await measureTimeWithFallback(async () => {
          const promises = [];

        // Use the same proof for all transactions in this iteration
        for (let j = 0; j < txCount; j++) {
          // Create policy
          const createPolicyPromise = ehrManager.connect(patient).createDelegationPolicy(
            doctor.address,
            `basic-info-${txCount}-${i}-${j}`,
            "read",
            24 * 60 * 60,
            { gasLimit: config.gasLimits.policyCreation }
          ).then(tx => tx.wait());
          
          promises.push(createPolicyPromise);
            
          // Update with small data using the same proof
          const updatePromise = ehrManager.connect(doctor).updatePatientData(
            patient.address,
            `basic-info-${txCount}-${i}-${j}`,
            smallData,
            proofResult.zkProof,
            { gasLimit: config.gasLimits.dataUpdate }
          ).then(tx => tx.wait());
          
          promises.push(updatePromise);
        }
        
        return Promise.all(promises);
      }, 60 + txCount * 15, `non-intensive-${txCount}tx`);
        
        if (!error) {
          nonIntensiveResults.push(timeMs);
          console.log(`Non-data-intensive operation time (${txCount} tx): ${timeMs.toFixed(2)}ms`);
        }
        
        // Sleep between iterations
        await new Promise(resolve => setTimeout(resolve, config.timing.cooldownPeriod));
      }
      
      if (nonIntensiveResults.length > 0) {
        // Calculate statistics
        const avgTime = nonIntensiveResults.reduce((sum, time) => sum + time, 0) / nonIntensiveResults.length;
        const minTime = Math.min(...nonIntensiveResults);
        const maxTime = Math.max(...nonIntensiveResults);
        
        results.dataIntensity.nonIntensive.push({
          transactionCount: txCount,
          avgTimeMs: avgTime,
          minTimeMs: minTime,
          maxTimeMs: maxTime,
          allTimesMs: nonIntensiveResults
        });
        
        console.log(`Average time for ${txCount} transactions: ${avgTime.toFixed(2)}ms`);
      }
    }
    
    // Calculate overall averages
    results.dataIntensity.intensiveAvg = 
      results.dataIntensity.intensive.reduce((sum, item) => sum + item.avgTimeMs, 0) / 
      results.dataIntensity.intensive.length;
      
    results.dataIntensity.nonIntensiveAvg = 
      results.dataIntensity.nonIntensive.reduce((sum, item) => sum + item.avgTimeMs, 0) / 
      results.dataIntensity.nonIntensive.length;
    
  } catch (error) {
    console.error("Error during setup or testing:", error);
    throw error;
  }
  
  // Save results
  fs.writeFileSync(
    path.join(resultsDir, "enhanced-data-intensity.json"),
    JSON.stringify(results, null, 2)
  );
  
  console.log("\nEnhanced data intensity testing complete!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });