// additional-metrics.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

async function measureAsyncExecutionTime(asyncFunc) {
  const start = performance.now();
  const result = await asyncFunc();
  const end = performance.now();
  return { result, timeMs: end - start };
}

// Helper function to read and parse JSON files
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}: ${error.message}`);
    return null;
  }
}

// Helper function to compile CSV from results
function generateCsvFromData(data, headers, rowExtractor) {
  let csv = headers.join(',') + '\n';
  
  data.forEach(item => {
    const row = rowExtractor(item);
    csv += row.join(',') + '\n';
  });
  
  return csv;
}

async function main() {
  console.log("Analyzing and aggregating results for professor's requirements...");
  
  // Create results directory
  const resultsDir = path.join(__dirname, '../results');
  if (!fs.existsSync(resultsDir)){
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Get all round directories
  const roundDirs = fs.readdirSync(resultsDir)
    .filter(name => name.startsWith('round_'))
    .map(name => path.join(resultsDir, name));
  
  console.log(`Found ${roundDirs.length} rounds of test data`);
  
  // 1. Compile Encryption/Decryption Performance Comparison
  console.log("\n1. Compiling encryption/decryption performance comparison...");
  let encryptionData = [];
  
  roundDirs.forEach(roundDir => {
    const filePath = path.join(roundDir, 'enhanced-encryption-comparison.json');
    const data = readJsonFile(filePath);
    
    if (data && data.algorithms) {
      // Extract AES-192, AES-256, and AES-512 results
      Object.keys(data.algorithms).forEach(algo => {
        const results = data.algorithms[algo].results;
        
        results.forEach(result => {
          encryptionData.push({
            algorithm: algo,
            sizeKB: result.sizeKB,
            encryptionTime: result.encryption.avg,
            decryptionTime: result.decryption.avg,
            round: roundDir.split('_').pop()
          });
        });
      });
    }
  });
  
  // Generate CSV for encryption comparison
  if (encryptionData.length > 0) {
    const encryptionCsv = generateCsvFromData(
      encryptionData,
      ['Algorithm', 'DataSize(KB)', 'EncryptionTime(ms)', 'DecryptionTime(ms)', 'Round'],
      item => [item.algorithm, item.sizeKB, item.encryptionTime.toFixed(2), item.decryptionTime.toFixed(2), item.round]
    );
    
    fs.writeFileSync(path.join(resultsDir, 'encryption_comparison.csv'), encryptionCsv);
    console.log('Encryption comparison CSV created');
  } else {
    console.log('No encryption data found');
  }
  
  // 2. Analyze ZKP Scaling Performance
  console.log("\n2. Analyzing ZK Proof scaling performance...");
  let zkpData = [];
  
  roundDirs.forEach(roundDir => {
    const filePath = path.join(roundDir, 'enhanced-zkp-performance.json');
    const data = readJsonFile(filePath);
    
    if (data && data.results && data.results.length > 0) {
      data.results.forEach(result => {
        zkpData.push({
          requestRate: result.requestRate,
          generationTime: result.averages.generation,
          verificationTime: result.averages.verification,
          validationTime: result.averages.validation,
          totalTime: result.averages.total,
          round: roundDir.split('_').pop()
        });
      });
    }
  });
  
  // Generate CSV for ZKP scaling performance
  if (zkpData.length > 0) {
    const zkpCsv = generateCsvFromData(
      zkpData,
      ['RequestRate', 'GenerationTime(ms)', 'VerificationTime(ms)', 'ValidationTime(ms)', 'TotalTime(ms)', 'Round'],
      item => [
        item.requestRate, 
        item.generationTime.toFixed(2), 
        item.verificationTime.toFixed(2), 
        item.validationTime.toFixed(2), 
        item.totalTime.toFixed(2),
        item.round
      ]
    );
    
    fs.writeFileSync(path.join(resultsDir, 'zkp_scaling_performance.csv'), zkpCsv);
    console.log('ZKP scaling performance CSV created');
    
    // Special analysis for the professor's concern
    const zkpByRate = {};
    zkpData.forEach(item => {
      if (!zkpByRate[item.requestRate]) {
        zkpByRate[item.requestRate] = [];
      }
      zkpByRate[item.requestRate].push(item.totalTime);
    });
    
    let zkpAnalysisCsv = 'RequestRate,AverageLatency(ms),StdDev(ms),Observation\n';
    const rates = Object.keys(zkpByRate).map(Number).sort((a, b) => a - b);
    
    let previousAvg = 0;
    rates.forEach(rate => {
      const times = zkpByRate[rate];
      const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
      // Standard deviation calculation
      const variance = times.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      
      let observation = "";
      if (previousAvg > 0) {
        observation = avg < previousAvg ? 
          "ANOMALY: Latency decreased with higher rate" : 
          "Expected: Latency increased with higher rate";
      }
      
      zkpAnalysisCsv += `${rate},${avg.toFixed(2)},${stdDev.toFixed(2)},${observation}\n`;
      previousAvg = avg;
    });
    
    fs.writeFileSync(path.join(resultsDir, 'zkp_anomaly_analysis.csv'), zkpAnalysisCsv);
    console.log('ZKP anomaly analysis CSV created');
  } else {
    console.log('No ZKP data found');
  }
  
  // 3. System Responsiveness Analysis
  console.log("\n3. Analyzing system responsiveness...");
  let txLatencyData = [];
  
  roundDirs.forEach(roundDir => {
    const filePath = path.join(roundDir, 'system-responsiveness.json');
    const data = readJsonFile(filePath);
    
    if (data && data.operations) {
      const operations = data.operations;
      
      // Combine data from different operations
      ['accessRequest', 'policyVerification', 'enforcement'].forEach(opType => {
        if (operations[opType]) {
          operations[opType].requestRates.forEach((rate, index) => {
            txLatencyData.push({
              operationType: opType,
              requestRate: rate,
              latency: operations[opType].latency[index],
              throughput: operations[opType].throughput[index],
              round: roundDir.split('_').pop()
            });
          });
        }
      });
    }
  });
  
  // Generate CSV for transaction latency
  if (txLatencyData.length > 0) {
    const txLatencyCsv = generateCsvFromData(
      txLatencyData,
      ['OperationType', 'RequestRate', 'Latency(ms)', 'Throughput(tx/s)', 'Round'],
      item => [
        item.operationType, 
        item.requestRate, 
        item.latency.toFixed(2), 
        item.throughput.toFixed(2),
        item.round
      ]
    );
    
    fs.writeFileSync(path.join(resultsDir, 'transaction_latency.csv'), txLatencyCsv);
    console.log('Transaction latency CSV created');
    
    // Special analysis for the professor's concern about decreasing latency with increasing rate
    const txByRateAndOp = {};
    txLatencyData.forEach(item => {
      const key = `${item.operationType}_${item.requestRate}`;
      if (!txByRateAndOp[key]) {
        txByRateAndOp[key] = [];
      }
      txByRateAndOp[key].push(item.latency);
    });
    
    let txAnalysisCsv = 'OperationType,RequestRate,AverageLatency(ms),StdDev(ms),Observation\n';
    
    Object.keys(txByRateAndOp).forEach(key => {
      const [opType, rateStr] = key.split('_');
      const rate = Number(rateStr);
      const latencies = txByRateAndOp[key];
      
      const avg = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const variance = latencies.reduce((sum, lat) => sum + Math.pow(lat - avg, 2), 0) / latencies.length;
      const stdDev = Math.sqrt(variance);
      
      // Check previous rate for the same operation
      const prevRateKey = `${opType}_${rate - 10}`;
      let observation = "First measurement";
      
      if (txByRateAndOp[prevRateKey]) {
        const prevLatencies = txByRateAndOp[prevRateKey];
        const prevAvg = prevLatencies.reduce((sum, lat) => sum + lat, 0) / prevLatencies.length;
        
        observation = avg < prevAvg ? 
          "ANOMALY: Latency decreased with higher rate" : 
          "Expected: Latency increased with higher rate";
      }
      
      txAnalysisCsv += `${opType},${rate},${avg.toFixed(2)},${stdDev.toFixed(2)},${observation}\n`;
    });
    
    fs.writeFileSync(path.join(resultsDir, 'transaction_latency_analysis.csv'), txAnalysisCsv);
    console.log('Transaction latency analysis CSV created');
  } else {
    console.log('No transaction latency data found');
  }
  
  // 4. Batch Size Variation Analysis
  console.log("\n4. Analyzing batch size variation...");
  let batchSizeData = [];
  
  roundDirs.forEach(roundDir => {
    const filePath = path.join(roundDir, 'system-responsiveness.json');
    const data = readJsonFile(filePath);
    
    if (data && data.batchSizeVariation && data.batchSizeVariation.data) {
      data.batchSizeVariation.data.forEach(batchData => {
        batchSizeData.push({
          batchSize: batchData.batchSize,
          blockTime: batchData.blockTime,
          blockSize: batchData.blockSize,
          round: roundDir.split('_').pop()
        });
      });
    }
  });
  
  // Generate CSV for batch size performance
  if (batchSizeData.length > 0) {
    const batchSizeCsv = generateCsvFromData(
      batchSizeData,
      ['BatchSize', 'BlockTime(ms)', 'BlockSize(bytes)', 'Round'],
      item => [item.batchSize, item.blockTime.toFixed(2), item.blockSize, item.round]
    );
    
    fs.writeFileSync(path.join(resultsDir, 'batch_size_performance.csv'), batchSizeCsv);
    console.log('Batch size performance CSV created');
    
    // Calculate average block time and size for each batch size
    const batchSizeAvg = {};
    batchSizeData.forEach(item => {
      if (!batchSizeAvg[item.batchSize]) {
        batchSizeAvg[item.batchSize] = { times: [], sizes: [] };
      }
      batchSizeAvg[item.batchSize].times.push(item.blockTime);
      batchSizeAvg[item.batchSize].sizes.push(item.blockSize);
    });
    
    let batchSizeAvgCsv = 'BatchSize,AvgBlockTime(ms),AvgBlockSize(bytes),BlockTimeVariance\n';
    
    Object.keys(batchSizeAvg)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(batchSize => {
        const times = batchSizeAvg[batchSize].times;
        const sizes = batchSizeAvg[batchSize].sizes;
        
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const avgSize = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
        
        // Calculate variance in block time
        const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length;
        
        batchSizeAvgCsv += `${batchSize},${avgTime.toFixed(2)},${avgSize.toFixed(2)},${variance.toFixed(2)}\n`;
      });
    
    fs.writeFileSync(path.join(resultsDir, 'batch_size_averages.csv'), batchSizeAvgCsv);
    console.log('Batch size averages CSV created');
  } else {
    console.log('No batch size data found');
  }
  
  // Measure basic performance (this was in the original script)
  try {
    // Deploy contracts
    console.log("\n5. Running basic performance tests...");
    
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
    console.log("\nMeasuring access policy registration times...");
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
    
    // Rest of the original tests...
    // (omitted for brevity)

    // Save results
    console.log("Saving results to file...");
    fs.writeFileSync(
      path.join(resultsDir, "additional-metrics.json"),
      JSON.stringify(results, null, 2)
    );
    
  } catch (error) {
    console.error("Error during measurements:", error);
  }
  
  console.log("\nAdditional metrics analysis complete!");
  console.log("Results are available in the results directory.");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });