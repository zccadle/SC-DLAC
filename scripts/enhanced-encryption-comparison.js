// enhanced-encryption-comparison.js
const { performance } = require('perf_hooks');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
// Using Node.js native crypto module
// AES-256-CBC and AES-192-CBC implementation from OpenSSL
// Reference: https://nodejs.org/api/crypto.html#crypto_crypto_createcipheriv_algorithm_key_iv_options

// Function to generate random data of specified size
function generateRandomData(sizeInKB) {
  return Buffer.alloc(sizeInKB * 1024).fill('X').toString();
}

// Enhanced measurement function with memory tracking
function measureWithPrecision(operation) {
  const memBefore = process.memoryUsage();
  const start = performance.now();
  
  const result = operation();
  
  const end = performance.now();
  const memAfter = process.memoryUsage();
  
  return {
    executionTime: end - start,
    memoryDelta: {
      rss: (memAfter.rss - memBefore.rss) / (1024 * 1024), // MB
      heapTotal: (memAfter.heapTotal - memBefore.heapTotal) / (1024 * 1024), // MB
      heapUsed: (memAfter.heapUsed - memBefore.heapUsed) / (1024 * 1024), // MB
      external: (memAfter.external - memBefore.external) / (1024 * 1024) // MB
    },
    result
  };
}

// Function to measure encryption/decryption times with memory tracking
function measureCryptoPerformance(algorithm, keySize, data) {
  // Generate key and IV
  const key = crypto.randomBytes(keySize);
  const iv = crypto.randomBytes(16);
  
  // Measure encryption time and memory
  const encryptionMeasurement = measureWithPrecision(() => {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  });
  
  const encrypted = encryptionMeasurement.result;
  
  // Measure decryption time and memory
  const decryptionMeasurement = measureWithPrecision(() => {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  });
  
  return { 
    encryptionTime: encryptionMeasurement.executionTime, 
    decryptionTime: decryptionMeasurement.executionTime,
    encryptionMemory: encryptionMeasurement.memoryDelta,
    decryptionMemory: decryptionMeasurement.memoryDelta,
    dataSize: data.length 
  };
}

// Run tests multiple times and calculate detailed statistics
function runMultipleTests(algorithm, keySize, data, iterations = 5) {
  console.log(`Testing ${algorithm} with ${data.length / 1024}KB data...`);
  
  let encryptionTimes = [];
  let decryptionTimes = [];
  let encryptionMemory = [];
  let decryptionMemory = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = measureCryptoPerformance(algorithm, keySize, data);
    encryptionTimes.push(result.encryptionTime);
    decryptionTimes.push(result.decryptionTime);
    encryptionMemory.push(result.encryptionMemory);
    decryptionMemory.push(result.decryptionMemory);
    
    console.log(`  Iteration ${i+1}: Encryption: ${result.encryptionTime.toFixed(2)}ms, Decryption: ${result.decryptionTime.toFixed(2)}ms`);
    console.log(`    Memory (Encryption): Heap Used: ${result.encryptionMemory.heapUsed.toFixed(2)}MB`);
    console.log(`    Memory (Decryption): Heap Used: ${result.decryptionMemory.heapUsed.toFixed(2)}MB`);
  }
  
  // Sort times for percentile calculations
  const sortedEncryptionTimes = [...encryptionTimes].sort((a, b) => a - b);
  const sortedDecryptionTimes = [...decryptionTimes].sort((a, b) => a - b);
  
  // Calculate statistics
  return {
    encryption: {
      avg: encryptionTimes.reduce((a, b) => a + b, 0) / iterations,
      min: Math.min(...encryptionTimes),
      max: Math.max(...encryptionTimes),
      p50: sortedEncryptionTimes[Math.floor(iterations * 0.5)],
      p95: sortedEncryptionTimes[Math.floor(iterations * 0.95)] || sortedEncryptionTimes[iterations - 1],
      memory: {
        avgHeapUsed: encryptionMemory.reduce((a, b) => a + b.heapUsed, 0) / iterations,
        maxHeapUsed: Math.max(...encryptionMemory.map(m => m.heapUsed))
      }
    },
    decryption: {
      avg: decryptionTimes.reduce((a, b) => a + b, 0) / iterations,
      min: Math.min(...decryptionTimes),
      max: Math.max(...decryptionTimes),
      p50: sortedDecryptionTimes[Math.floor(iterations * 0.5)],
      p95: sortedDecryptionTimes[Math.floor(iterations * 0.95)] || sortedDecryptionTimes[iterations - 1],
      memory: {
        avgHeapUsed: decryptionMemory.reduce((a, b) => a + b.heapUsed, 0) / iterations,
        maxHeapUsed: Math.max(...decryptionMemory.map(m => m.heapUsed))
      }
    },
    iterations
  };
}

// Function to simulate AES-512 using double AES-256 encryption with memory tracking
function simulateAES512(data) {
  // Generate two different keys and IVs for the double encryption
  const key1 = crypto.randomBytes(32); // 256 bits
  const iv1 = crypto.randomBytes(16);
  const key2 = crypto.randomBytes(32); // 256 bits
  const iv2 = crypto.randomBytes(16);
  
  // Measure encryption time and memory
  const encryptionMeasurement = measureWithPrecision(() => {
    // First encryption
    const cipher1 = crypto.createCipheriv('aes-256-cbc', key1, iv1);
    let encrypted = cipher1.update(data, 'utf8', 'hex');
    encrypted += cipher1.final('hex');
    
    // Second encryption (simulating 512-bit security)
    const cipher2 = crypto.createCipheriv('aes-256-cbc', key2, iv2);
    let doubleEncrypted = cipher2.update(encrypted, 'hex', 'hex');
    doubleEncrypted += cipher2.final('hex');
    
    return doubleEncrypted;
  });
  
  const doubleEncrypted = encryptionMeasurement.result;
  
  // Measure decryption time and memory
  const decryptionMeasurement = measureWithPrecision(() => {
    // First decryption (of the second encryption)
    const decipher2 = crypto.createDecipheriv('aes-256-cbc', key2, iv2);
    let partialDecrypted = decipher2.update(doubleEncrypted, 'hex', 'hex');
    partialDecrypted += decipher2.final('hex');
    
    // Second decryption (of the first encryption)
    const decipher1 = crypto.createDecipheriv('aes-256-cbc', key1, iv1);
    let fullyDecrypted = decipher1.update(partialDecrypted, 'hex', 'utf8');
    fullyDecrypted += decipher1.final('utf8');
    
    return fullyDecrypted;
  });
  
  return { 
    encryptionTime: encryptionMeasurement.executionTime, 
    decryptionTime: decryptionMeasurement.executionTime,
    encryptionMemory: encryptionMeasurement.memoryDelta,
    decryptionMemory: decryptionMeasurement.memoryDelta,
    dataSize: data.length 
  };
}

// Run AES-512 simulation tests with detailed statistics
function runAES512Tests(data, iterations = 5) {
  console.log(`Testing AES-512 (simulated) with ${data.length / 1024}KB data...`);
  
  let encryptionTimes = [];
  let decryptionTimes = [];
  let encryptionMemory = [];
  let decryptionMemory = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = simulateAES512(data);
    encryptionTimes.push(result.encryptionTime);
    decryptionTimes.push(result.decryptionTime);
    encryptionMemory.push(result.encryptionMemory);
    decryptionMemory.push(result.decryptionMemory);
    
    console.log(`  Iteration ${i+1}: Encryption: ${result.encryptionTime.toFixed(2)}ms, Decryption: ${result.decryptionTime.toFixed(2)}ms`);
    console.log(`    Memory (Encryption): Heap Used: ${result.encryptionMemory.heapUsed.toFixed(2)}MB`);
    console.log(`    Memory (Decryption): Heap Used: ${result.decryptionMemory.heapUsed.toFixed(2)}MB`);
  }
  
  // Sort times for percentile calculations
  const sortedEncryptionTimes = [...encryptionTimes].sort((a, b) => a - b);
  const sortedDecryptionTimes = [...decryptionTimes].sort((a, b) => a - b);
  
  // Calculate statistics
  return {
    encryption: {
      avg: encryptionTimes.reduce((a, b) => a + b, 0) / iterations,
      min: Math.min(...encryptionTimes),
      max: Math.max(...encryptionTimes),
      p50: sortedEncryptionTimes[Math.floor(iterations * 0.5)],
      p95: sortedEncryptionTimes[Math.floor(iterations * 0.95)] || sortedEncryptionTimes[iterations - 1],
      memory: {
        avgHeapUsed: encryptionMemory.reduce((a, b) => a + b.heapUsed, 0) / iterations,
        maxHeapUsed: Math.max(...encryptionMemory.map(m => m.heapUsed))
      }
    },
    decryption: {
      avg: decryptionTimes.reduce((a, b) => a + b, 0) / iterations,
      min: Math.min(...decryptionTimes),
      max: Math.max(...decryptionTimes),
      p50: sortedDecryptionTimes[Math.floor(iterations * 0.5)],
      p95: sortedDecryptionTimes[Math.floor(iterations * 0.95)] || sortedDecryptionTimes[iterations - 1],
      memory: {
        avgHeapUsed: decryptionMemory.reduce((a, b) => a + b.heapUsed, 0) / iterations,
        maxHeapUsed: Math.max(...decryptionMemory.map(m => m.heapUsed))
      }
    },
    iterations
  };
}

// Enhanced function to save results to CSV with more detailed statistics
function saveResultsToCSV(results, roundDir) {
  // Create CSV for encryption times
  let encryptionCsv = 'DataSize(KB),AES-192-Avg(ms),AES-192-P95(ms),AES-256-Avg(ms),AES-256-P95(ms),AES-512-Avg(ms),AES-512-P95(ms)\n';
  
  // Create CSV for decryption times
  let decryptionCsv = 'DataSize(KB),AES-192-Avg(ms),AES-192-P95(ms),AES-256-Avg(ms),AES-256-P95(ms),AES-512-Avg(ms),AES-512-P95(ms)\n';
  
  // Create CSV for memory usage
  let memoryCsv = 'DataSize(KB),AES-192-Enc-Mem(MB),AES-192-Dec-Mem(MB),AES-256-Enc-Mem(MB),AES-256-Dec-Mem(MB),AES-512-Enc-Mem(MB),AES-512-Dec-Mem(MB)\n';
  
  // Get unique data sizes
  const dataSizes = [...new Set(
    results.algorithms['aes-192-cbc'].results.map(r => r.sizeKB)
  )];
  
  // For each data size, add a row to all CSVs
  dataSizes.forEach(sizeKB => {
    const aes192Result = results.algorithms['aes-192-cbc'].results.find(r => r.sizeKB === sizeKB);
    const aes256Result = results.algorithms['aes-256-cbc'].results.find(r => r.sizeKB === sizeKB);
    const aes512Result = results.algorithms['aes-512-sim'].results.find(r => r.sizeKB === sizeKB);
    
    // Encryption CSV row
    encryptionCsv += `${sizeKB},`;
    encryptionCsv += `${aes192Result?.encryption.avg.toFixed(2) || ''},`;
    encryptionCsv += `${aes192Result?.encryption.p95.toFixed(2) || ''},`;
    encryptionCsv += `${aes256Result?.encryption.avg.toFixed(2) || ''},`;
    encryptionCsv += `${aes256Result?.encryption.p95.toFixed(2) || ''},`;
    encryptionCsv += `${aes512Result?.encryption.avg.toFixed(2) || ''},`;
    encryptionCsv += `${aes512Result?.encryption.p95.toFixed(2) || ''}\n`;
    
    // Decryption CSV row
    decryptionCsv += `${sizeKB},`;
    decryptionCsv += `${aes192Result?.decryption.avg.toFixed(2) || ''},`;
    decryptionCsv += `${aes192Result?.decryption.p95.toFixed(2) || ''},`;
    decryptionCsv += `${aes256Result?.decryption.avg.toFixed(2) || ''},`;
    decryptionCsv += `${aes256Result?.decryption.p95.toFixed(2) || ''},`;
    decryptionCsv += `${aes512Result?.decryption.avg.toFixed(2) || ''},`;
    decryptionCsv += `${aes512Result?.decryption.p95.toFixed(2) || ''}\n`;
    
    // Memory CSV row
    memoryCsv += `${sizeKB},`;
    memoryCsv += `${aes192Result?.encryption.memory.avgHeapUsed.toFixed(2) || ''},`;
    memoryCsv += `${aes192Result?.decryption.memory.avgHeapUsed.toFixed(2) || ''},`;
    memoryCsv += `${aes256Result?.encryption.memory.avgHeapUsed.toFixed(2) || ''},`;
    memoryCsv += `${aes256Result?.decryption.memory.avgHeapUsed.toFixed(2) || ''},`;
    memoryCsv += `${aes512Result?.encryption.memory.avgHeapUsed.toFixed(2) || ''},`;
    memoryCsv += `${aes512Result?.decryption.memory.avgHeapUsed.toFixed(2) || ''}\n`;
  });
  
  // Save CSV files
  fs.writeFileSync(path.join(roundDir, 'encryption_times.csv'), encryptionCsv);
  fs.writeFileSync(path.join(roundDir, 'decryption_times.csv'), decryptionCsv);
  fs.writeFileSync(path.join(roundDir, 'memory_usage.csv'), memoryCsv);
  
  console.log(`CSV files saved to ${roundDir}`);
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
  
  // Algorithms to test (AES-256, AES-192, and simulated AES-512)
  const algorithms = [
    { name: 'aes-256-cbc', keySize: 32 },  // AES-256
    { name: 'aes-192-cbc', keySize: 24 },  // AES-192
    { name: 'aes-512-sim', keySize: 64 }   // Simulated AES-512 (will use special function)
  ];
  
  // Data sizes to test (in KB) - following exponential growth
  // Reduced the maximum size to avoid memory issues
  const dataSizes = [
    1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 
    1024, 2048, 4096, 8192, 16384, 32768
  ];
  
  // System information
  const systemInfo = {
    platform: os.platform(),
    release: os.release(),
    cpus: os.cpus().length,
    totalMemory: (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
    freeMemory: (os.freemem() / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  };
  
  // Results structure
  const results = {
    description: "Enhanced Encryption/Decryption performance comparison: AES-256 vs AES-192 vs AES-512",
    testDate: new Date().toISOString(),
    iterations: 5,
    systemInfo,
    algorithms: {}
  };
  
  // Perform warm-up runs
  console.log("\nPerforming warm-up runs...");
  // Use a small subset of data sizes for warm-up
  const warmupSizes = [1, 128, 1024];
  for (const algorithm of algorithms) {
    console.log(`\nWarming up ${algorithm.name}...`);
    for (const sizeKB of warmupSizes) {
      const data = generateRandomData(sizeKB);
      if (algorithm.name === 'aes-512-sim') {
        await simulateAES512(data);
      } else {
        await measureCryptoPerformance(algorithm.name, algorithm.keySize, data);
      }
    }
  }
  console.log("\nWarm-up complete. Starting actual tests...\n");
  // Allow system to stabilize after warm-up
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // For each algorithm
  for (const algorithm of algorithms) {
    console.log(`\n===== Testing ${algorithm.name} (${algorithm.keySize * 8}-bit) =====`);
    results.algorithms[algorithm.name] = {
      keySize: algorithm.keySize * 8,
      results: []
    };
    
    // For each data size
    for (const sizeKB of dataSizes) {
      try {
        console.log(`\nTesting with ${sizeKB}KB data...`);
        
        // Generate data for this size
        const data = generateRandomData(sizeKB);
        
        // Run tests
        let testResults;
        if (algorithm.name === 'aes-512-sim') {
          testResults = runAES512Tests(data, results.iterations);
        } else {
          testResults = runMultipleTests(algorithm.name, algorithm.keySize, data, results.iterations);
        }
        
        // Store results
        results.algorithms[algorithm.name].results.push({
          sizeKB,
          encryption: testResults.encryption,
          decryption: testResults.decryption
        });
        
        // Print summary
        console.log(`\nSummary for ${sizeKB}KB data with ${algorithm.name}:`);
        console.log(`  Encryption: Avg=${testResults.encryption.avg.toFixed(2)}ms, P95=${testResults.encryption.p95.toFixed(2)}ms, Memory=${testResults.encryption.memory.avgHeapUsed.toFixed(2)}MB`);
        console.log(`  Decryption: Avg=${testResults.decryption.avg.toFixed(2)}ms, P95=${testResults.decryption.p95.toFixed(2)}ms, Memory=${testResults.decryption.memory.avgHeapUsed.toFixed(2)}MB`);
        
        // Allow system to cool down between tests
        if (sizeKB > 1024) {
          console.log("Cooling down...");
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Error testing ${algorithm.name} with ${sizeKB}KB data:`, error);
        // Continue with next data size
      }
    }
  }
  
  // Save results to JSON
  const resultsFile = path.join(roundDir, "enhanced-encryption-comparison.json");
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${resultsFile}`);
  
  // Save results to CSV
  saveResultsToCSV(results, roundDir);
  
  console.log("\nEncryption performance testing complete!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  });