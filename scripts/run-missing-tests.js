// run-missing-tests.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

// Define missing tests
const missingTests = [
  "enhanced-policy-verification.js",
  "fixed-system-responsiveness.js"  // Use the fixed version instead
];

// Helper function to run a command and return a promise
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command: ${error.message}`);
        console.error(`Command stderr: ${stderr}`);
        console.log(stdout);
        resolve(false); // Don't reject, just return false to continue with other tests
      } else {
        console.log(stdout);
        resolve(true);
      }
    });
  });
}

async function main() {
  console.log("Running missing tests for rounds 2 and 3...");
  
  // Create results directories if they don't exist
  const resultsDir = path.join(__dirname, '../results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const round2Dir = path.join(resultsDir, 'round_2');
  if (!fs.existsSync(round2Dir)) {
    fs.mkdirSync(round2Dir, { recursive: true });
  }
  
  const round3Dir = path.join(resultsDir, 'round_3');
  if (!fs.existsSync(round3Dir)) {
    fs.mkdirSync(round3Dir, { recursive: true });
  }
  
  // Run each test for round 2
  console.log("\nRunning tests for round 2...");
  for (const testScript of missingTests) {
    console.log(`\nRunning: npx hardhat run ./scripts/${testScript} --network hardhat`);
    process.env.ROUND_NUMBER = "2";
    
    const success = await runCommand(`npx hardhat run ./scripts/${testScript} --network hardhat`);
    if (success) {
      console.log(`✅ Test ${testScript} completed for round 2`);
    } else {
      console.log(`❌ Test ${testScript} failed for round 2`);
    }
  }
  
  // Run each test for round 3
  console.log("\nRunning tests for round 3...");
  for (const testScript of missingTests) {
    console.log(`\nRunning: npx hardhat run ./scripts/${testScript} --network hardhat`);
    process.env.ROUND_NUMBER = "3";
    
    const success = await runCommand(`npx hardhat run ./scripts/${testScript} --network hardhat`);
    if (success) {
      console.log(`✅ Test ${testScript} completed for round 3`);
    } else {
      console.log(`❌ Test ${testScript} failed for round 3`);
    }
  }
  
  console.log("\nAll missing tests have been run for rounds 2 and 3.");
  console.log("Results are saved in the '/results' directory.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
