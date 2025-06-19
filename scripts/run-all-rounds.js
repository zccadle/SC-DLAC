// Script to run all testing rounds (1, 2, and 3)
// This will ensure we have complete data for visualization

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runAllRounds() {
  console.log("Running all test rounds for system responsiveness...");
  
  // Make sure results directory exists
  for (let round = 1; round <= 3; round++) {
    const resultsDir = path.join(__dirname, '..', 'results', `round_${round}`);
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
      console.log(`Created directory: ${resultsDir}`);
    }
  }
  
  // Run each round
  for (let round = 1; round <= 3; round++) {
    console.log(`\n===== RUNNING ROUND ${round} =====`);
    try {
      // Set environment variable for round number
      process.env.ROUND_NUMBER = round;
      
      // Run the test script
      execSync(`npx hardhat run scripts/fixed-system-responsiveness.js --network hardhat`, {
        stdio: 'inherit',
        env: { ...process.env, ROUND_NUMBER: round.toString() }
      });
      
      console.log(`\n✅ Round ${round} completed successfully!`);
    } catch (error) {
      console.error(`\n❌ Error in round ${round}: ${error.message}`);
      process.exit(1);
    }
  }
  
  console.log("\n===== ALL ROUNDS COMPLETED =====");
  console.log("Results are stored in the following directories:");
  for (let round = 1; round <= 3; round++) {
    console.log(`- Round ${round}: results/round_${round}`);
  }
  console.log("\nYou can now proceed with visualization.");
}

// Run the tests
runAllRounds().catch(console.error);