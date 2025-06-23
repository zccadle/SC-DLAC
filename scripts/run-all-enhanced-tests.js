// run-all-enhanced-tests.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Helper function to run a command and log output
function runCommand(command) {
  console.log(`\n\n========= Running: ${command} =========\n`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`\n✅ Command completed successfully: ${command}`);
    return true;
  } catch (error) {
    console.error(`\n❌ Command failed: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Create results directories for multiple rounds
function ensureDirectories(rounds) {
  const resultsDir = path.join(__dirname, '..', 'results');
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Create directories for each round
  for (let i = 1; i <= rounds; i++) {
    const roundDir = path.join(resultsDir, `round_${i}`);
    if (!fs.existsSync(roundDir)) {
      fs.mkdirSync(roundDir, { recursive: true });
    }
  }
}

// Main function to run all tests
async function main() {
  console.log('Starting full test suite execution...');
  
  // Number of test rounds to run (for statistical significance)
  const rounds = 3;
  
  // Ensure directories exist for all rounds
  ensureDirectories(rounds);
  
  // Start Hardhat node in a separate terminal (this is platform-dependent)
  console.log('Please start a Hardhat node in a separate terminal with:');
  console.log('npx hardhat node');
  console.log('Press Enter when the node is running...');
  await new Promise(resolve => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
  
  // Run all enhanced test scripts
  const testScripts = [
    'enhanced-policy-verification.js',
    'enhanced-zkproof-performance.js',
    'system-responsiveness.js',      // Added missing script for system responsiveness
    'access-flow-performance.js',
    'enhanced-encryption-comparison.js',
    'enhanced-data-intensity.js'
  ];
  
  let allSuccessful = true;
  
  // Run tests for each round
  for (let round = 1; round <= rounds; round++) {
    console.log(`\n\n========= Starting Round ${round} of ${rounds} =========\n`);
    
    // Set environment variable for the current round
    process.env.ROUND_NUMBER = round;
    
    for (const script of testScripts) {
      const success = runCommand(`npx hardhat run scripts/${script} --network localhost`);
      if (!success) {
        allSuccessful = false;
        console.error(`\n⚠️ Test script ${script} failed in round ${round}. Continuing with remaining tests...`);
      }
      
      // Add a delay between tests to let the node recover
      console.log(`\nWaiting 15 seconds before the next test...`);
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
    
    // Longer break between rounds
    if (round < rounds) {
      console.log(`\n\n========= Round ${round} completed. Taking a break before next round =========`);
      console.log('Waiting 30 seconds to let the system cool down...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  // Aggregate results
  if (allSuccessful) {
    console.log('\n\n========= All tests completed successfully! =========');
  } else {
    console.log('\n\n========= Some tests failed, but we\'ll still aggregate available results =========');
  }
  
  // First run the standard aggregation
  const success = runCommand('npx hardhat run scripts/aggregated-results.js');
  
  // Then run the additional metrics analysis specifically for the professor's requirements
  const additionalSuccess = runCommand('npx hardhat run scripts/additional-metrics.js');
  
  if (success && additionalSuccess) {
    console.log('\n\n========= Results successfully aggregated! =========');
    console.log('\nResults are available in:');
    console.log('- results/aggregated_results.json');
    console.log('- results/performance_summary.csv');
    console.log('- results/throughput_comparison.csv');
    console.log('- results/latency_comparison.csv');
    console.log('- results/batch_size_performance.csv');
    console.log('- results/encryption_comparison.csv');
    console.log('- results/zkp_scaling_performance.csv');
  } else {
    console.error('\n\n⚠️ Failed to aggregate some results.');
  }
  
  console.log('\nComplete test suite execution finished!');
}

// Run the main function
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error in main execution:', error);
    process.exit(1);
  });