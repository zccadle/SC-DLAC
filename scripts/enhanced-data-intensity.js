// enhanced-data-intensity.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const { submitAndVerifyProof, ensureValidProof } = require('./role-proof-helper');
const config = require('./test-config');
const os = require('os');

// Helper function to get system information
function getSystemInfo() {
  return {
    platform: os.platform(),
    cpuModel: os.cpus()[0].model,
    cpuCores: os.cpus().length,
    totalMemory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + 'GB',
    freeMemory: Math.round(os.freemem() / (1024 * 1024 * 1024)) + 'GB',
    nodeVersion: process.version
  };
}

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

// Enhanced measurement function with memory tracking
async function measureWithPrecision(func, operation) {
  try {
    // Record memory before operation
    const memBefore = process.memoryUsage();
    
    // Record start time with high precision
    const startHrTime = process.hrtime();
    const startTime = performance.now();
    
    // Execute the function
    const result = await func();
    
    // Record end time with high precision
    const endTime = performance.now();
    const diffHrTime = process.hrtime(startHrTime);
    const highPrecisionTime = diffHrTime[0] * 1000 + diffHrTime[1] / 1000000;
    
    // Record memory after operation
    const memAfter = process.memoryUsage();
    
    // Calculate memory differences in MB
    const memoryUsed = {
      rss: (memAfter.rss - memBefore.rss) / (1024 * 1024),
      heapTotal: (memAfter.heapTotal - memBefore.heapTotal) / (1024 * 1024),
      heapUsed: (memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024),
      external: (memAfter.external - memBefore.external) / (1024 * 1024)
    };
    
    // Get gas used if result is a transaction receipt
    let gasUsed = null;
    if (result && result.gasUsed) {
      gasUsed = result.gasUsed.toString();
    }
    
    return {
      result,
      timeMs: endTime - startTime,
      highPrecisionTimeMs: highPrecisionTime,
      memoryUsed,
      gasUsed,
      error: null
    };
  } catch (error) {
    console.error(`Error in ${operation}: ${error.message}`);
    return {
      result: null,
      timeMs: 0,
      highPrecisionTimeMs: 0,
      memoryUsed: { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 },
      gasUsed: null,
      error: error.message
    };
  }
}

// Helper function to generate data of specific size
function generateData(sizeKB) {
  const safeSizeKB = Math.min(sizeKB, 2048); // Cap at 2MB for safety
  return Buffer.alloc(safeSizeKB * 1024).fill('X').toString();
}

// Helper function to calculate percentiles
function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

// Helper function to calculate detailed statistics
function calculateDetailedStats(values) {
  if (values.length === 0) return {
    avg: 0,
    min: 0,
    max: 0,
    p50: 0,
    p95: 0,
    p99: 0
  };
  
  return {
    avg: values.reduce((sum, val) => sum + val, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    p50: calculatePercentile(values, 50),
    p95: calculatePercentile(values, 95),
    p99: calculatePercentile(values, 99)
  };
}

// Helper function to save results as CSV
function saveResultsToCSV(results, filePath) {
  // Create intensive data CSV
  let intensiveCSV = 'Data Size (KB),Avg Time (ms),Min Time (ms),Max Time (ms),P95 Time (ms),P99 Time (ms),Avg Memory Used (MB),Avg Gas Used\n';
  
  results.dataIntensity.intensive.forEach(item => {
    intensiveCSV += `${item.dataSizeKB},${item.stats.avg.toFixed(2)},${item.stats.min.toFixed(2)},${item.stats.max.toFixed(2)},${item.stats.p95.toFixed(2)},${item.stats.p99.toFixed(2)},${item.avgMemoryUsed.toFixed(2)},${item.avgGasUsed || 'N/A'}\n`;
  });
  
  fs.writeFileSync(path.join(filePath, 'data_intensive_performance.csv'), intensiveCSV);
  
  // Create non-intensive data CSV
  let nonIntensiveCSV = 'Transaction Count,Avg Time (ms),Min Time (ms),Max Time (ms),P95 Time (ms),P99 Time (ms),Avg Memory Used (MB),Avg Gas Used\n';
  
  results.dataIntensity.nonIntensive.forEach(item => {
    nonIntensiveCSV += `${item.transactionCount},${item.stats.avg.toFixed(2)},${item.stats.min.toFixed(2)},${item.stats.max.toFixed(2)},${item.stats.p95.toFixed(2)},${item.stats.p99.toFixed(2)},${item.avgMemoryUsed.toFixed(2)},${item.avgGasUsed || 'N/A'}\n`;
  });
  
  fs.writeFileSync(path.join(filePath, 'non_data_intensive_performance.csv'), nonIntensiveCSV);
  
  console.log(`CSV files saved to ${filePath}`);
}

// Helper function to safely create a DID if it doesn't exist
async function safeCreateDID(didManager, signer, didString) {
  try {
    // Check if DID exists by trying to get the DID for the address
    // If it doesn't exist, this will throw an error with "No DID found for address"
    let didExists = false;
    try {
      await didManager.getDIDByAddress(signer.address);
      didExists = true;
      console.log(`DID already exists for ${signer.address}, skipping creation`);
    } catch (error) {
      // If the error message contains "No DID found", then the DID doesn't exist
      if (error.message.includes("No DID found for address")) {
        didExists = false;
      } else {
        // If it's some other error, rethrow it
        throw error;
      }
    }
    
    if (!didExists) {
      console.log(`Creating DID for ${signer.address}: ${didString}`);
      await didManager.connect(signer).createDID(didString, []);
      return true;
    }
    return true;
  } catch (error) {
    console.error(`Error creating DID: ${error.message}`);
    return false;
  }
}

// Helper function to safely create a patient record if it doesn't exist
async function safeCreatePatientRecord(ehrManager, doctor, patient) {
  try {
    // Try to create the patient record
    // If it already exists, this will throw an error with "Patient record already exists"
    try {
      console.log(`Creating patient record for ${patient.address}`);
      await ehrManager.connect(doctor).createPatientRecord(patient.address);
      console.log(`Patient record created for ${patient.address}`);
      return true;
    } catch (error) {
      // If the error message contains "already exists", then the record already exists
      if (error.message.includes("Patient record already exists")) {
        console.log(`Patient record already exists for ${patient.address}, skipping creation`);
        return true;
      } else {
        // If it's some other error, rethrow it
        throw error;
      }
    }
  } catch (error) {
    console.error(`Error creating patient record: ${error.message}`);
    return false;
  }
}

async function main() {
  // Create results directory
  const resultsDir = path.join(__dirname, '../results');
  if (!fs.existsSync(resultsDir)){
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Create round-specific directory
  const roundNumber = process.env.ROUND_NUMBER || 1;
  const roundDir = path.join(resultsDir, `round_${roundNumber}`);
  if (!fs.existsSync(roundDir)){
    fs.mkdirSync(roundDir, { recursive: true });
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
    system: getSystemInfo(),
    network: await ethers.provider.getNetwork(),
    iterations: config.iterations.default,
    dataIntensity: {
      intensive: [],
      nonIntensive: []
    }
  };
  
  try {
    // Setup test users and roles
    console.log("\nSetting up test users...");
    
    // Perform warm-up runs if not in warm-up round
    if (roundNumber !== 'warmup') {
      console.log("\nPerforming warm-up runs...");
      
      // Warm up with a small number of transactions
      const warmupTxCount = 5;
      
      // Create DIDs for warm-up
      const warmupDoctorDID = `did:ethr:${doctor.address}:warmup`;
      await safeCreateDID(didManager, doctor, warmupDoctorDID);
      
      const warmupPatientDID = `did:ethr:${patient.address}:warmup`;
      await safeCreateDID(didManager, patient, warmupPatientDID);
      
      // Set up doctor's role for warm-up
      const warmupRoleCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("WARMUP_CREDENTIAL"));
      await dlacManager.connect(owner).assignRole(
        doctor.address,
        "DOCTOR",
        warmupRoleCredential,
        warmupDoctorDID,
        365 * 24 * 60 * 60,
        false
      );
      
      // Grant permissions for warm-up
      await dlacManager.connect(owner).grantPermission("DOCTOR", "view_data");
      await dlacManager.connect(owner).grantPermission("DOCTOR", "update_data");
      await dlacManager.connect(owner).grantPermission("DOCTOR", "create_record");
      
      // Create patient record for warm-up
      await safeCreatePatientRecord(ehrManager, doctor, patient);
      
      // Warm up with small data operations
      for (let i = 0; i < warmupTxCount; i++) {
        const proofResult = await setupProofForDoctor(doctor, dlacManager, zkpManager);
        if (proofResult.isValid) {
          await ehrManager.connect(patient).createDelegationPolicy(
            doctor.address,
            `warmup-policy-${i}`,
            "read",
            24 * 60 * 60,
            { gasLimit: config.gasLimits.policyCreation }
          );
          
          await ehrManager.connect(doctor).updatePatientData(
            patient.address,
            `warmup-policy-${i}`,
            "Warm-up data",
            proofResult.zkProof,
            { gasLimit: config.gasLimits.dataUpdate }
          );
        }
      }
      
      console.log("\nWarm-up complete. Starting actual tests...");
      // Allow system to stabilize after warm-up
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Create DIDs
    const doctorDID = `did:ethr:${doctor.address}`;
    await safeCreateDID(didManager, doctor, doctorDID);
    
    const patientDID = `did:ethr:${patient.address}`;
    await safeCreateDID(didManager, patient, patientDID);
    
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
    await safeCreatePatientRecord(ehrManager, doctor, patient);
    console.log(`Patient record setup completed for ${patient.address}`);
    
    // Test data sizes from config - use only sizes that work reliably
    const dataSizes = [1, 2, 4, 8]; // Only use data sizes that work reliably
    
    // Test data-intensive policies (large data)
    console.log("\nTesting data-intensive policy performance with various data sizes...");

    for (const dataSize of dataSizes) {
      console.log(`\nTesting with ${dataSize}KB data size...`);
      const intensiveResults = [];
      const memoryResults = [];
      const gasResults = [];

      // Calculate required gas limit based on data size with a more aggressive scaling factor
      // For small data sizes, we can use a more precise calculation based on observed gas usage
      const calculatedGasLimit = Math.max(
        config.gasLimits.dataUpdate,
        dataSize <= 1 ? 1000000 :  // 1KB needs about 1M gas
        dataSize <= 2 ? 2000000 :  // 2KB needs about 2M gas
        dataSize <= 4 ? 4000000 :  // 4KB needs about 4M gas
        dataSize <= 8 ? 7000000 :  // 8KB needs about 7M gas
        9000000 + (dataSize * 100000)  // Fallback formula for larger sizes
      );
      
      console.log(`Using gas limit: ${calculatedGasLimit} for ${dataSize}KB data`);

      for (let i = 0; i < results.iterations; i++) {
        console.log(`Iteration ${i+1}/${results.iterations}...`);

        // Generate test data
        const largeData = generateData(dataSize);

        // Measure performance with enhanced precision
        const measurement = await measureWithPrecision(async () => {
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
        }, `data-intensive-${dataSize}KB`);
        
        if (!measurement.error) {
          intensiveResults.push(measurement.timeMs);
          memoryResults.push(measurement.memoryUsed.heapUsed);
          if (measurement.gasUsed) {
            gasResults.push(parseInt(measurement.gasUsed));
          }
          console.log(`Data-intensive operation time: ${measurement.timeMs.toFixed(2)}ms, Memory: ${measurement.memoryUsed.heapUsed.toFixed(2)}MB, Gas: ${measurement.gasUsed || 'N/A'}`);
        }
        
        // Sleep between iterations
        await new Promise(resolve => setTimeout(resolve, config.timing.cooldownPeriod));
      }
      
      if (intensiveResults.length > 0) {
        // Calculate detailed statistics
        const stats = calculateDetailedStats(intensiveResults);
        const avgMemoryUsed = memoryResults.reduce((sum, mem) => sum + mem, 0) / memoryResults.length;
        const avgGasUsed = gasResults.length > 0 ? 
          Math.round(gasResults.reduce((sum, gas) => sum + gas, 0) / gasResults.length) : null;
        
        results.dataIntensity.intensive.push({
          dataSizeKB: dataSize,
          stats,
          avgMemoryUsed,
          avgGasUsed,
          allTimesMs: intensiveResults,
          allMemoryUsed: memoryResults,
          allGasUsed: gasResults
        });
        
        console.log(`Average time for ${dataSize}KB: ${stats.avg.toFixed(2)}ms, P95: ${stats.p95.toFixed(2)}ms, Memory: ${avgMemoryUsed.toFixed(2)}MB, Gas: ${avgGasUsed || 'N/A'}`);
      }
    }
    
    // Test non-data-intensive policies (small data)
    console.log("\nTesting non-data-intensive policy performance with various transaction counts...");
    
    const transactionCounts = [1, 2, 4, 8];
    
    for (const txCount of transactionCounts) {
      console.log(`\nTesting with ${txCount} transactions...`);
      const nonIntensiveResults = [];
      const memoryResults = [];
      const gasResults = [];
      
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
        
        // Measure performance with enhanced precision
        const measurement = await measureWithPrecision(async () => {
          const promises = [];
          let lastReceipt = null;

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
            ).then(tx => {
              return tx.wait().then(receipt => {
                lastReceipt = receipt;
                return receipt;
              });
            });
            
            promises.push(updatePromise);
          }
          
          await Promise.all(promises);
          return lastReceipt; // Return the last receipt for gas calculation
        }, `non-intensive-${txCount}tx`);
        
        if (!measurement.error) {
          nonIntensiveResults.push(measurement.timeMs);
          memoryResults.push(measurement.memoryUsed.heapUsed);
          if (measurement.gasUsed) {
            gasResults.push(parseInt(measurement.gasUsed));
          }
          console.log(`Non-data-intensive operation time (${txCount} tx): ${measurement.timeMs.toFixed(2)}ms, Memory: ${measurement.memoryUsed.heapUsed.toFixed(2)}MB, Gas: ${measurement.gasUsed || 'N/A'}`);
        }
        
        // Sleep between iterations
        await new Promise(resolve => setTimeout(resolve, config.timing.cooldownPeriod));
      }
      
      if (nonIntensiveResults.length > 0) {
        // Calculate detailed statistics
        const stats = calculateDetailedStats(nonIntensiveResults);
        const avgMemoryUsed = memoryResults.reduce((sum, mem) => sum + mem, 0) / memoryResults.length;
        const avgGasUsed = gasResults.length > 0 ? 
          Math.round(gasResults.reduce((sum, gas) => sum + gas, 0) / gasResults.length) : null;
        
        results.dataIntensity.nonIntensive.push({
          transactionCount: txCount,
          stats,
          avgMemoryUsed,
          avgGasUsed,
          allTimesMs: nonIntensiveResults,
          allMemoryUsed: memoryResults,
          allGasUsed: gasResults
        });
        
        console.log(`Average time for ${txCount} transactions: ${stats.avg.toFixed(2)}ms, P95: ${stats.p95.toFixed(2)}ms, Memory: ${avgMemoryUsed.toFixed(2)}MB, Gas: ${avgGasUsed || 'N/A'}`);
      }
    }
    
    // Calculate overall averages
    results.dataIntensity.intensiveAvg = 
      results.dataIntensity.intensive.reduce((sum, item) => sum + item.stats.avg, 0) / 
      results.dataIntensity.intensive.length;
      
    results.dataIntensity.nonIntensiveAvg = 
      results.dataIntensity.nonIntensive.reduce((sum, item) => sum + item.stats.avg, 0) / 
      results.dataIntensity.nonIntensive.length;
    
  } catch (error) {
    console.error("Error during setup or testing:", error);
    throw error;
  }
  
  // Save results to JSON
  fs.writeFileSync(
    path.join(roundDir, "enhanced-data-intensity.json"),
    JSON.stringify(results, null, 2)
  );
  
  // Save results to CSV
  saveResultsToCSV(results, roundDir);
  
  console.log("\nEnhanced data intensity testing complete!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });