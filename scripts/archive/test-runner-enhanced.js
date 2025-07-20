const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function runTestRound(round) {
    console.log(`\n=== Starting Test Round ${round} ===`);
    
    const testScripts = [
        'enhanced-encryption-comparison.js',
        'enhanced-zkproof-performance.js',
        'access-flow-performance.js',
        'enhanced-data-intensity.js'
    ];

    const resultsDir = path.join(__dirname, '../results', `round_${round}`);
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    for (const script of testScripts) {
        console.log(`\nRunning ${script}`);
        try {
            execSync(`npx hardhat run scripts/${script} --network localhost`, {
                stdio: 'inherit'
            });
            
            // Copy results to round-specific directory
            const resultFile = script.replace('.js', '.json');
            const sourcePath = path.join(__dirname, '../results', resultFile);
            const destPath = path.join(resultsDir, resultFile);
            
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, destPath);
            }
            
            // Add cooldown between tests
            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
            console.error(`Error running ${script}:`, error);
        }
    }
}

async function main() {
    const ROUNDS = 3;
    
    // Clean up previous results
    const resultsDir = path.join(__dirname, '../results');
    if (fs.existsSync(resultsDir)) {
        fs.rmSync(resultsDir, { recursive: true });
    }
    fs.mkdirSync(resultsDir);

    // Run test rounds
    for (let round = 1; round <= ROUNDS; round++) {
        await runTestRound(round);
        console.log(`\nCompleted Round ${round}`);
        
        // Add delay between rounds
        if (round < ROUNDS) {
            console.log('Cooling down before next round...');
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }
    
    console.log('\nAll test rounds completed!');
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });