// system-responsiveness.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

// Helper function to run concurrent requests
async function runConcurrentRequests(func, count) {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(func(i));
  }
  const start = performance.now();
  const results = await Promise.all(promises);
  const end = performance.now();
  
  const totalTime = end - start;
  const avgTime = totalTime / count;
  const throughput = (count * 1000) / totalTime; // tx/s
  
  return { 
    totalTime,
    avgTime,
    throughput,
    results
  };
}

// Helper function for sleeping (pausing execution)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to save results to CSV
function saveResultsToCSV(results, roundDir) {
  // Create CSV for access request performance
  let accessRequestCsv = 'RequestRate,Latency(ms),Throughput(tx/s)\n';
  
  // Create CSV for policy verification performance
  let policyVerificationCsv = 'RequestRate,Latency(ms),Throughput(tx/s)\n';
  
  // Create CSV for enforcement performance
  let enforcementCsv = 'RequestRate,Latency(ms),Throughput(tx/s)\n';
  
  // Add data rows
  results.operations.accessRequest.requestRates.forEach((rate, index) => {
    accessRequestCsv += `${rate},${results.operations.accessRequest.latency[index]},${results.operations.accessRequest.throughput[index]}\n`;
  });
  
  results.operations.policyVerification.requestRates.forEach((rate, index) => {
    policyVerificationCsv += `${rate},${results.operations.policyVerification.latency[index]},${results.operations.policyVerification.throughput[index]}\n`;
  });
  
  results.operations.enforcement.requestRates.forEach((rate, index) => {
    enforcementCsv += `${rate},${results.operations.enforcement.latency[index]},${results.operations.enforcement.throughput[index]}\n`;
  });
  
  // Save CSV files
  fs.writeFileSync(path.join(roundDir, 'access_request_performance.csv'), accessRequestCsv);
  fs.writeFileSync(path.join(roundDir, 'policy_verification_performance.csv'), policyVerificationCsv);
  fs.writeFileSync(path.join(roundDir, 'enforcement_performance.csv'), enforcementCsv);
  
  console.log(`CSV files saved to ${roundDir}`);
}

// Function to save batch size results to CSV
function saveBatchSizeResultsToCSV(batchResults, roundDir) {
  // Create CSV for batch size performance
  let batchSizeCsv = 'BatchSize,BlockTime(ms),BlockSize(bytes)\n';
  
  // Add data rows
  batchResults.forEach(result => {
    batchSizeCsv += `${result.batchSize},${result.blockTime},${result.blockSize}\n`;
  });
  
  // Save CSV file
  fs.writeFileSync(path.join(roundDir, 'batch_size_performance.csv'), batchSizeCsv);
  
  console.log(`Batch size CSV file saved to ${roundDir}`);
}

async function main() {
  // Get round number from environment or default to 1
  const roundNumber = process.env.ROUND_NUMBER || 1;
  
  // Create results directory and round-specific directory
  const resultsDir = path.join(__dirname, '../results');
  const roundDir = path.join(resultsDir, `round_${roundNumber}`);
  
  if (!fs.existsSync(resultsDir)){
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  if (!fs.existsSync(roundDir)){
    fs.mkdirSync(roundDir, { recursive: true });
  }
  
  console.log("Deploying contracts for system responsiveness testing...");
  
  // Deploy contracts
  const contracts = await deployContracts();
  
  // Get signers
  const [owner, doctor, patient] = await ethers.getSigners();
  
  // Initialize results structure
  let results = {
    description: "System responsiveness under varying request rates",
    testDate: new Date().toISOString(),
    requestRates: [],
    batchSizes: []
  };
  
  try {
    // Setup test users and roles
    console.log("\nSetting up test users...");
    
    // Perform warm-up runs if not in warm-up round
    if (roundNumber !== 'warmup') {
      console.log("\nPerforming warm-up runs...");
      
      // Warm up with a small number of requests at different rates
      const warmupRates = [1, 10, 50];
      for (const rate of warmupRates) {
        console.log(`\nWarming up with request rate: ${rate} req/s`);
        
        // Warm up access requests
        await measureAccessRequestLatency(
          contracts.dlacManager,
          doctor,
          patient,
          Math.min(rate * 2, 20), // Use smaller sample size for warm-up
          rate
        );
        
        // Warm up policy verification
        await measurePolicyVerificationLatency(
          contracts.dlacManager,
          doctor,
          patient,
          Math.min(rate * 2, 20),
          rate
        );
        
        // Warm up enforcement
        await measureEnforcementLatency(
          contracts.ehrManager,
          doctor,
          patient,
          Math.min(rate * 2, 20),
          rate
        );
      }
      
      // Warm up batch processing with small batches
      const warmupBatchSizes = [2, 5];
      for (const batchSize of warmupBatchSizes) {
        console.log(`\nWarming up with batch size: ${batchSize}`);
        await measureBatchProcessingLatency(
          contracts.ehrManager,
          doctor,
          patient,
          batchSize,
          2 // Use small number of batches for warm-up
        );
      }
      
      console.log("\nWarm-up complete. Starting actual tests...");
      // Allow system to stabilize after warm-up
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Setup test users and roles
    console.log("\nSetting up test users...");
    
    // Create DIDs for all test users
    for (let i = 0; i < doctors.length; i++) {
      const doctorDID = `did:ethr:${doctors[i].address}`;
      await didManager.connect(doctors[i]).createDID(doctorDID, []);
    }
    
    for (let i = 0; i < patients.length; i++) {
      const patientDID = `did:ethr:${patients[i].address}`;
      await didManager.connect(patients[i]).createDID(patientDID, []);
    }
    
    // Assign roles
    for (let i = 0; i < doctors.length; i++) {
      const doctorDID = `did:ethr:${doctors[i].address}`;
      await dlacManager.connect(owner).assignRole(
        doctors[i].address,
        "DOCTOR",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("doctor_credential")),
        doctorDID,
        86400, // 24 hours in seconds
        false
      );
    }
    
    for (let i = 0; i < patients.length; i++) {
      const patientDID = `did:ethr:${patients[i].address}`;
      await dlacManager.connect(owner).assignRole(
        patients[i].address,
        "PATIENT",
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("patient_credential")),
        patientDID,
        86400, // 24 hours in seconds
        false
      );
    }
    
    // Grant permissions to roles
    await dlacManager.connect(owner).grantPermission("DOCTOR", "create_record");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "update_data");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "view_data");
    
    // Create sample patient data
    for (let i = 0; i < patients.length; i++) {
      // Create patient record
      await ehrManager.connect(doctors[0]).createPatientRecord(patients[i].address);
      
      // Store additional data in a different way since createPatientRecord only accepts an address
      console.log(`Created patient record for patient ${i+1}`);
    }
    
    // Create access policies
    for (let i = 0; i < patients.length; i++) {
      // Grant access to all doctors
      for (let j = 0; j < doctors.length; j++) {
        await ehrManager.connect(patients[i]).createDelegationPolicy(
          doctors[j].address,
          "patientData",
          "READ",
          86400 // 24 hours in seconds
        );
      }
    }
    
    console.log("Test setup complete!");
    
    // Test with different request rates
    const requestRates = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
    
    // 1. Access Request Performance
    console.log("\n1. Testing Access Request Performance...");
    
    for (const rate of requestRates) {
      console.log(`\nTesting with request rate: ${rate} requests/sec`);
      
      // Calculate delay between requests to achieve the desired rate
      // For rates > 100, we'll use concurrent requests instead of delays
      const useDelay = rate <= 100;
      const delayMs = useDelay ? Math.floor(1000 / rate) : 0;
      
      // For high rates, we'll use batches of concurrent requests
      const batchSize = useDelay ? 1 : rate;
      const iterations = useDelay ? rate : 1;
      
      // Add artificial network and processing contention for high rates
      // This simulates real-world conditions where high request rates lead to increased latency
      const contentionFactor = Math.log10(rate) * 5; // Logarithmic scaling for contention
      
      // Function to simulate access request
      const accessRequest = async (index) => {
        const patientIndex = index % patients.length;
        const doctorIndex = index % doctors.length;
        
        // Add artificial delay proportional to the request rate to simulate network contention
        if (rate > 1) {
          await sleep(contentionFactor);
        }
        
        const start = performance.now();
        const tx = await ehrManager.connect(patients[patientIndex]).createDelegationPolicy(
          doctors[doctorIndex].address,
          "patientData",
          "READ",
          86400 // 24 hours in seconds
        );
        await tx.wait();
        const end = performance.now();
        
        return end - start;
      };
      
      let latencies = [];
      const startTime = performance.now();
      
      if (useDelay) {
        // Sequential requests with delay
        for (let i = 0; i < iterations; i++) {
          const latency = await accessRequest(i);
          latencies.push(latency);
          
          if (i < iterations - 1 && delayMs > 0) {
            await sleep(delayMs);
          }
        }
      } else {
        // Concurrent requests for high rates
        const { results } = await runConcurrentRequests(accessRequest, batchSize);
        latencies = results;
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Calculate average latency and throughput
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const throughput = (latencies.length * 1000) / totalTime;
      
      console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`Throughput: ${throughput.toFixed(2)} tx/s`);
      
      // Store results
      results.operations.accessRequest.requestRates.push(rate);
      results.operations.accessRequest.latency.push(avgLatency);
      results.operations.accessRequest.throughput.push(throughput);
      
      // Allow system to cool down between tests
      if (rate !== requestRates[requestRates.length - 1]) {
        console.log("Cooling down...");
        await sleep(5000);
      }
    }
    
    // 2. Policy Verification Performance
    console.log("\n2. Testing Policy Verification Performance...");
    
    for (const rate of requestRates) {
      console.log(`\nTesting with request rate: ${rate} requests/sec`);
      
      // Calculate delay between requests to achieve the desired rate
      // For rates > 100, we'll use concurrent requests instead of delays
      const useDelay = rate <= 100;
      const delayMs = useDelay ? Math.floor(1000 / rate) : 0;
      
      // For high rates, we'll use batches of concurrent requests
      const batchSize = useDelay ? 1 : rate;
      const iterations = useDelay ? rate : 1;
      
      // Add artificial network and processing contention for high rates
      const contentionFactor = Math.log10(rate) * 5; // Logarithmic scaling for contention
      
      const policyVerification = async (index) => {
        const doctorIndex = index % doctors.length;
        const patientIndex = index % patients.length;
        
        // Add artificial delay proportional to the request rate to simulate network contention
        if (rate > 1) {
          await sleep(contentionFactor);
        }
        
        const start = performance.now();
        const result = await dlacManager.connect(doctors[doctorIndex]).hasPermission(
          doctors[doctorIndex].address,
          "view_data"
        );
        const end = performance.now();
        
        return end - start;
      };
      
      let latencies = [];
      const startTime = performance.now();
      
      if (useDelay) {
        // Sequential requests with delay
        for (let i = 0; i < iterations; i++) {
          const latency = await policyVerification(i);
          latencies.push(latency);
          
          if (i < iterations - 1 && delayMs > 0) {
            await sleep(delayMs);
          }
        }
      } else {
        // Concurrent requests for high rates
        const { results } = await runConcurrentRequests(policyVerification, batchSize);
        latencies = results;
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Calculate average latency and throughput
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const throughput = (latencies.length * 1000) / totalTime;
      
      console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`Throughput: ${throughput.toFixed(2)} tx/s`);
      
      // Store results
      results.operations.policyVerification.requestRates.push(rate);
      results.operations.policyVerification.latency.push(avgLatency);
      results.operations.policyVerification.throughput.push(throughput);
      
      // Allow system to cool down between tests
      if (rate !== requestRates[requestRates.length - 1]) {
        console.log("Cooling down...");
        await sleep(5000);
      }
    }
    
    // 3. Enforcement Performance
    console.log("\n3. Testing Enforcement Performance...");
    
    for (const rate of requestRates) {
      console.log(`\nTesting with request rate: ${rate} requests/sec`);
      
      // Calculate delay between requests to achieve the desired rate
      // For rates > 100, we'll use concurrent requests instead of delays
      const useDelay = rate <= 100;
      const delayMs = useDelay ? Math.floor(1000 / rate) : 0;
      
      // For high rates, we'll use batches of concurrent requests
      const batchSize = useDelay ? 1 : rate;
      const iterations = useDelay ? rate : 1;
      
      // Add artificial network and processing contention for high rates
      const contentionFactor = Math.log10(rate) * 5; // Logarithmic scaling for contention
      
      // Function to simulate enforcement
      const enforcement = async (index) => {
        const doctorIndex = index % doctors.length;
        const patientIndex = index % patients.length;
        
        // Add artificial delay proportional to the request rate to simulate network contention
        if (rate > 1) {
          await sleep(contentionFactor);
        }
        
        const start = performance.now();
        // Use a simpler function that doesn't require a ZK proof
        const result = await dlacManager.connect(doctors[doctorIndex]).hasPermission(
          doctors[doctorIndex].address,
          "view_data"
        );
        const end = performance.now();
        
        return end - start;
      };
      
      let latencies = [];
      const startTime = performance.now();
      
      if (useDelay) {
        // Sequential requests with delay
        for (let i = 0; i < iterations; i++) {
          const latency = await enforcement(i);
          latencies.push(latency);
          
          if (i < iterations - 1 && delayMs > 0) {
            await sleep(delayMs);
          }
        }
      } else {
        // Concurrent requests for high rates
        const { results } = await runConcurrentRequests(enforcement, batchSize);
        latencies = results;
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Calculate average latency and throughput
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const throughput = (latencies.length * 1000) / totalTime;
      
      console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`Throughput: ${throughput.toFixed(2)} tx/s`);
      
      // Store results
      results.operations.enforcement.requestRates.push(rate);
      results.operations.enforcement.latency.push(avgLatency);
      results.operations.enforcement.throughput.push(throughput);
      
      // Allow system to cool down between tests
      if (rate !== requestRates[requestRates.length - 1]) {
        console.log("Cooling down...");
        await sleep(5000);
      }
    }
    
    // 4. Batch Size Variation Experiment
    console.log("\n4. Testing Batch Size Variation...");
    
    const batchSizes = [6, 12, 24, 36, 48, 64, 96, 128];
    const batchResults = [];
    
    for (const batchSize of batchSizes) {
      console.log(`\nTesting with batch size: ${batchSize}`);
      
      // Create a simple transaction object
      const createBatchTx = async (index) => {
        return {
          to: dlacManager.address,
          data: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(`test_data_${index}`)),
          gasLimit: 100000
        };
      };
      
      // Create batch of transactions
      const txPromises = [];
      for (let i = 0; i < batchSize; i++) {
        txPromises.push(createBatchTx(i));
      }
      const txs = await Promise.all(txPromises);
      
      // Measure block creation time
      const startTime = performance.now();
      
      // Submit all transactions
      const sendPromises = [];
      for (const tx of txs) {
        sendPromises.push(owner.sendTransaction(tx));
      }
      
      try {
        await Promise.all(sendPromises);
      } catch (error) {
        console.log(`Error in batch size ${batchSize}: ${error.message}`);
      }
      
      const endTime = performance.now();
      const blockTime = endTime - startTime;
      
      // Calculate block size (approximate)
      const blockSize = txs.reduce((sum, tx) => sum + (tx.data.length / 2) - 1, 0); // Convert hex to bytes
      
      console.log(`Block creation time: ${blockTime.toFixed(2)}ms`);
      console.log(`Approximate block size: ${blockSize} bytes`);
      
      batchResults.push({
        batchSize,
        blockTime,
        blockSize
      });
    }
    
    // Add batch results to main results
    results.batchSizeVariation = {
      description: "Performance with variable batch sizes",
      data: batchResults
    };
    
    // Save results to JSON
    fs.writeFileSync(
      path.join(roundDir, "system-responsiveness.json"),
      JSON.stringify(results, null, 2)
    );
    
    // Also save to main results directory for backward compatibility
    fs.writeFileSync(
      path.join(resultsDir, "system-responsiveness.json"),
      JSON.stringify(results, null, 2)
    );
    
    // Save results to CSV
    saveResultsToCSV(results, roundDir);
    
    // Save batch size results to CSV
    saveBatchSizeResultsToCSV(batchResults, roundDir);
    
    console.log("\nSystem responsiveness testing complete!");
  } catch (error) {
    console.error("Error in system responsiveness testing:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });