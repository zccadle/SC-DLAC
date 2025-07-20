// enhanced-zkproof-performance.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

// Token bucket rate limiter for accurate request rates
class TokenBucket {
  constructor(rate, burstSize) {
    this.tokens = burstSize;
    this.lastRefill = performance.now();
    this.rate = rate;
    this.burstSize = burstSize;
  }

  async getToken() {
    const now = performance.now();
    const timePassed = now - this.lastRefill;
    this.lastRefill = now;
    
    // Add new tokens based on time passed
    this.tokens = Math.min(
      this.burstSize,
      this.tokens + (timePassed * this.rate) / 1000
    );

    if (this.tokens < 1) {
      // Wait for next token
      const waitTime = (1000 / this.rate) * (1 - this.tokens);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.tokens = 1;
    }

    this.tokens -= 1;
    return true;
  }
}

// Accurate timing measurement
async function measureWithPrecision(operation) {
  const start = performance.now();
  const result = await operation();
  const end = performance.now();
  return {
    result,
    duration: end - start
  };
}

// Function to measure ZK proof lifecycle with proper error handling
async function measureZKProofCycle(data, signerWallet, rateLimiter = null) {
  const measurements = {
    signingStart: 0,
    signingEnd: 0,
    generationStart: 0,
    generationEnd: 0,
    verificationStart: 0,
    verificationEnd: 0,
    validationStart: 0,
    validationEnd: 0,
    errors: []
  };

  try {
    // Wait for rate limiter if provided
    if (rateLimiter) {
      await rateLimiter.getToken();
    }

    // 1. Signing time (off-chain)
    measurements.signingStart = performance.now();
    const signedData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(data));
    measurements.signingEnd = performance.now();

    // 2. ZK Proof Generation (off-chain)
    measurements.generationStart = performance.now();
    let zkProof = signedData;
    // Simulate realistic ZK proof generation complexity
    for (let i = 0; i < 10; i++) {
      zkProof = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'uint256', 'address'],
          [zkProof, i, signerWallet.address]
        )
      );
    }
    measurements.generationEnd = performance.now();

    // 3. Verification time (off-chain)
    measurements.verificationStart = performance.now();
    let verifiedProof = zkProof;
    for (let i = 0; i < 5; i++) {
      verifiedProof = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ['bytes32', 'address'],
          [verifiedProof, signerWallet.address]
        )
      );
    }
    measurements.verificationEnd = performance.now();

    // 4. Validation time (on-chain)
    measurements.validationStart = performance.now();
    try {
      // Submit proof
      const tx = await signerWallet.zkpManager.submitProof(zkProof, {
        gasLimit: 500000
      });
      await tx.wait();

      // Validate proof
      await signerWallet.zkpManager.validateProof(signerWallet.address, zkProof);
    } catch (error) {
      measurements.errors.push({
        phase: 'validation',
        error: error.message
      });
    }
    measurements.validationEnd = performance.now();

    return {
      success: measurements.errors.length === 0,
      measurements,
      zkProof
    };
  } catch (error) {
    measurements.errors.push({
      phase: 'general',
      error: error.message
    });
    return {
      success: false,
      measurements,
      error
    };
  }
}

async function runTestRound(requestRate, users, testData, duration = 10000) {
  console.log(`\nTesting with request rate: ${requestRate} requests/sec`);
  
  const rateLimiter = new TokenBucket(requestRate, Math.min(5, requestRate));
  const results = [];
  const startTime = performance.now();
  const endTime = startTime + duration;
  let userIndex = 0;
  let totalRequests = 0;
  let successfulRequests = 0;

  while (performance.now() < endTime) {
    const user = users[userIndex % users.length];
    const result = await measureZKProofCycle(
      testData + totalRequests,
      user,
      rateLimiter
    );

    totalRequests++;
    if (result.success) {
      successfulRequests++;
      results.push({
        signingTime: result.measurements.signingEnd - result.measurements.signingStart,
        generationTime: result.measurements.generationEnd - result.measurements.generationStart,
        verificationTime: result.measurements.verificationEnd - result.measurements.verificationStart,
        validationTime: result.measurements.validationEnd - result.measurements.validationStart,
        totalTime: result.measurements.validationEnd - result.measurements.signingStart
      });
    }

    userIndex++;
  }

  const actualDuration = performance.now() - startTime;
  const actualThroughput = (successfulRequests * 1000) / actualDuration;
  
  // Calculate statistics
  const stats = {
    requestRate,
    totalRequests,
    successfulRequests,
    successRate: (successfulRequests / totalRequests) * 100,
    actualThroughput,
    averages: {
      signing: 0,
      generation: 0,
      verification: 0,
      validation: 0,
      total: 0
    },
    percentiles: {
      p50: { total: 0 },
      p95: { total: 0 },
      p99: { total: 0 }
    }
  };

  if (results.length > 0) {
    // Calculate averages
    stats.averages = {
      signing: results.reduce((sum, r) => sum + r.signingTime, 0) / results.length,
      generation: results.reduce((sum, r) => sum + r.generationTime, 0) / results.length,
      verification: results.reduce((sum, r) => sum + r.verificationTime, 0) / results.length,
      validation: results.reduce((sum, r) => sum + r.validationTime, 0) / results.length,
      total: results.reduce((sum, r) => sum + r.totalTime, 0) / results.length
    };

    // Calculate percentiles
    const sortedTotalTimes = results.map(r => r.totalTime).sort((a, b) => a - b);
    stats.percentiles = {
      p50: {
        total: sortedTotalTimes[Math.floor(sortedTotalTimes.length * 0.5)]
      },
      p95: {
        total: sortedTotalTimes[Math.floor(sortedTotalTimes.length * 0.95)]
      },
      p99: {
        total: sortedTotalTimes[Math.floor(sortedTotalTimes.length * 0.99)]
      }
    };
  }

  return stats;
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
  
  console.log("Deploying contracts for ZK proof performance testing...");
  
  // Deploy contracts
  const ZKPManager = await ethers.getContractFactory("ZKPVerifier");
  const zkpManager = await ZKPManager.deploy();
  await zkpManager.deployed();
  
  // Get signers
  const signers = await ethers.getSigners();
  const users = signers.slice(1, 11); // Use 10 users for testing
  
  // Attach zkpManager to each user wallet for easier access
  for (const user of users) {
    user.zkpManager = zkpManager;
  }
  
  // Results structure
  const results = {
    description: "ZK Proof Performance Measurements",
    testDate: new Date().toISOString(),
    roundNumber,
    testDuration: "10 seconds per rate",
    zkProofLifecycle: []
  };
  
  // Test data
  const testData = "Patient data for ZK proof test";
  
  // Perform warm-up
  if (roundNumber !== 'warmup') {
    console.log("\nPerforming warm-up runs...");
    // Warm up with moderate load
    await runTestRound(10, users, testData, 5000);
    console.log("Warm-up complete. Waiting for system to stabilize...");
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Test with different request rates
  const requestRates = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512];
  
  for (const rate of requestRates) {
    const stats = await runTestRound(rate, users, testData);
    results.zkProofLifecycle.push(stats);
    
    console.log(`Results for ${rate} req/s:`);
    console.log(`  Success Rate: ${stats.successRate.toFixed(2)}%`);
    console.log(`  Actual Throughput: ${stats.actualThroughput.toFixed(2)} tx/s`);
    console.log(`  Average Latency: ${stats.averages.total.toFixed(2)}ms`);
    console.log(`  P95 Latency: ${stats.percentiles.p95.total.toFixed(2)}ms`);
    
    // Cool down between tests
    if (rate !== requestRates[requestRates.length - 1]) {
      console.log("\nCooling down...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Save results
  const resultsFile = path.join(roundDir, "enhanced-zkproof-performance.json");
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  
  // Save CSV for easy analysis
  const csvFile = path.join(roundDir, "zkproof_performance.csv");
  let csv = "RequestRate,SuccessRate,Throughput,AvgLatency,P95Latency,AvgSigning,AvgGeneration,AvgVerification,AvgValidation\n";
  
  results.zkProofLifecycle.forEach(stats => {
    csv += `${stats.requestRate},${stats.successRate},${stats.actualThroughput},${stats.averages.total},${stats.percentiles.p95.total},${stats.averages.signing},${stats.averages.generation},${stats.averages.verification},${stats.averages.validation}\n`;
  });
  
  fs.writeFileSync(csvFile, csv);
  
  console.log("\nZK proof performance testing complete!");
  console.log(`Results saved to ${resultsFile}`);
  console.log(`CSV saved to ${csvFile}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });