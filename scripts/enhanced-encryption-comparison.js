// enhanced-encryption-comparison.js
const { performance } = require('perf_hooks');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
// Using Node.js native crypto module
// AES-256-CBC and AES-192-CBC implementation from OpenSSL
// Reference: https://nodejs.org/api/crypto.html#crypto_crypto_createcipheriv_algorithm_key_iv_options

// Function to generate random data of specified size
function generateRandomData(sizeInKB) {
  return Buffer.alloc(sizeInKB * 1024).fill('X').toString();
}

// Function to measure encryption/decryption times
function measureCryptoPerformance(algorithm, keySize, data) {
  // Generate key and IV
  const key = crypto.randomBytes(keySize);
  const iv = crypto.randomBytes(16);
  
  // Measure encryption time
  const encryptStart = performance.now();
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const encryptEnd = performance.now();
  const encryptionTime = encryptEnd - encryptStart;
  
  // Measure decryption time
  const decryptStart = performance.now();
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  const decryptEnd = performance.now();
  const decryptionTime = decryptEnd - decryptStart;
  
  return { encryptionTime, decryptionTime, dataSize: data.length };
}

// Run tests multiple times and average
function runMultipleTests(algorithm, keySize, data, iterations = 3) {
  console.log(`Testing ${algorithm} with ${data.length / 1024}KB data...`);
  let totalEncryptionTime = 0;
  let totalDecryptionTime = 0;
  let encryptionTimes = [];
  let decryptionTimes = [];
  
  for (let i = 0; i < iterations; i++) {
    const result = measureCryptoPerformance(algorithm, keySize, data);
    totalEncryptionTime += result.encryptionTime;
    totalDecryptionTime += result.decryptionTime;
    encryptionTimes.push(result.encryptionTime);
    decryptionTimes.push(result.decryptionTime);
    
    console.log(`  Iteration ${i+1}: Encryption: ${result.encryptionTime.toFixed(2)}ms, Decryption: ${result.decryptionTime.toFixed(2)}ms`);
  }
  
  // Calculate min, max, avg
  return {
    avgEncryptionTime: totalEncryptionTime / iterations,
    avgDecryptionTime: totalDecryptionTime / iterations,
    minEncryptionTime: Math.min(...encryptionTimes),
    maxEncryptionTime: Math.max(...encryptionTimes),
    minDecryptionTime: Math.min(...decryptionTimes),
    maxDecryptionTime: Math.max(...decryptionTimes),
    iterations
  };
}

async function main() {
  // Create results directory
  const resultsDir = path.join(__dirname, '../results');
  if (!fs.existsSync(resultsDir)){
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Algorithms to test (AES-256 vs AES-192 as requested)
  const algorithms = [
    { name: 'aes-256-cbc', keySize: 32 },  // AES-256
    { name: 'aes-192-cbc', keySize: 24 }   // AES-192
  ];
  
  // Data sizes to test (in KB) - following exponential growth
  // As requested, starting from 1KB and doubling until reaching 1GB
  const dataSizes = [
    1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 
    1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072,
    262144, 524288, 1048576
  ];
  
  // Results structure
  const results = {
    description: "Encryption/Decryption performance comparison: AES-256 vs AES-192",
    testDate: new Date().toISOString(),
    iterations: 3,
    algorithms: {}
  };
  
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
        console.log(`Testing with ${sizeKB}KB data...`);
        
        // Generate data for this size
        const data = generateRandomData(sizeKB);
        
        // Run tests and get average times
        const { 
          avgEncryptionTime, 
          avgDecryptionTime,
          minEncryptionTime,
          maxEncryptionTime,
          minDecryptionTime,
          maxDecryptionTime,
          iterations
        } = runMultipleTests(
          algorithm.name, 
          algorithm.keySize, 
          data, 
          results.iterations
        );
        
        // Store results
        results.algorithms[algorithm.name].results.push({
          sizeKB,
          encryptionTimeMs: avgEncryptionTime,
          decryptionTimeMs: avgDecryptionTime,
          minEncryptionTimeMs: minEncryptionTime,
          maxEncryptionTimeMs: maxEncryptionTime,
          minDecryptionTimeMs: minDecryptionTime,
          maxDecryptionTimeMs: maxDecryptionTime
        });
        
        console.log(`  Average Encryption: ${avgEncryptionTime.toFixed(2)}ms, Decryption: ${avgDecryptionTime.toFixed(2)}ms`);
        
        // For very large sizes, allow garbage collection between tests
        if (sizeKB >= 16384) {
          global.gc && global.gc();
          // Add a short delay to allow system to stabilize
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Break if we encounter memory limitations
        if (sizeKB >= 524288 && process.memoryUsage().heapUsed > 1.5 * 1024 * 1024 * 1024) {
          console.log(`Memory usage high (${Math.round(process.memoryUsage().heapUsed / (1024 * 1024))}MB), stopping tests`);
          break;
        }
      } catch (err) {
        console.error(`Error testing ${sizeKB}KB: ${err.message}`);
        console.log("Moving to next algorithm");
        break;
      }
    }
  }
  
  // Save results
  fs.writeFileSync(
    path.join(resultsDir, "enhanced-encryption-comparison.json"),
    JSON.stringify(results, null, 2)
  );
  
  console.log("\nEnhanced encryption comparison complete!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });