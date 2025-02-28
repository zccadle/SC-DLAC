const fs = require('fs');
const path = require('path');

function calculateStats(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { avg, min, max };
}

function aggregateEncryptionResults(rounds) {
    const combined = {
        aes256: { encryption: [], decryption: [] },
        aes192: { encryption: [], decryption: [] }
    };

    rounds.forEach(round => {
        const data = round.algorithms;  // ✅ Access the algorithms object correctly
        Object.entries(data).forEach(([algo, algoData]) => {  // ✅ Extract the object inside `algorithms`
            if (algoData.results) {  // ✅ Ensure results array exists
                algoData.results.forEach(result => {
                    if (algo === 'aes-256-cbc') {
                        combined.aes256.encryption.push(result.encryptionTimeMs);
                        combined.aes256.decryption.push(result.decryptionTimeMs);
                    } else if (algo === 'aes-192-cbc') {
                        combined.aes192.encryption.push(result.encryptionTimeMs);
                        combined.aes192.decryption.push(result.decryptionTimeMs);
                    }
                });
            }
        });
    });

    return {
        aes256: {
            encryption: calculateStats(combined.aes256.encryption),
            decryption: calculateStats(combined.aes256.decryption)
        },
        aes192: {
            encryption: calculateStats(combined.aes192.encryption),
            decryption: calculateStats(combined.aes192.decryption)
        }
    };
}


function aggregateZKProofResults(rounds) {
    const combined = {
        signing: [],
        generation: [],
        verification: [],
        validation: [],
        cumulative: []
    };

    rounds.forEach(round => {
        if (round.zkProofLifecycle && round.zkProofLifecycle.data) {  // ✅ Check if `data` exists
            round.zkProofLifecycle.data.forEach(data => {
                combined.signing.push(data.signingTime);
                combined.generation.push(data.generationTime);
                combined.verification.push(data.verificationTime);
                combined.validation.push(data.validationTime);
                combined.cumulative.push(data.cumulativeTime);
            });
        }
    });

    return {
        signing: calculateStats(combined.signing),
        generation: calculateStats(combined.generation),
        verification: calculateStats(combined.verification),
        validation: calculateStats(combined.validation),
        cumulative: calculateStats(combined.cumulative)
    };
}


function aggregateAccessFlowResults(rounds) {
    const combined = {
        request: [],
        verification: [],
        enforcement: [],
        response: []
    };

    rounds.forEach(round => {
        if (round.accessFlowBreakdown && round.accessFlowBreakdown.data) {  // ✅ Check if `data` exists
            round.accessFlowBreakdown.data.forEach(data => {
                combined.request.push(data.requestTime);
                combined.verification.push(data.verificationTime);
                combined.enforcement.push(data.enforcementTime);
                combined.response.push(data.responseTime);
            });
        }
    });

    return {
        request: calculateStats(combined.request),
        verification: calculateStats(combined.verification),
        enforcement: calculateStats(combined.enforcement),
        response: calculateStats(combined.response)
    };
}

async function main() {
    const resultsDir = path.join(__dirname, '../results');
    const rounds = [];

    // Read all round results
    for (let round = 1; round <= 3; round++) {
        const roundDir = path.join(resultsDir, `round_${round}`);
        
        const encryptionPath = path.join(roundDir, 'enhanced-encryption-comparison.json');
        const zkproofPath = path.join(roundDir, 'enhanced-zkproof-performance.json');
        const accessFlowPath = path.join(roundDir, 'access-flow-performance.json');
        
        const roundData = {
            encryption: JSON.parse(fs.readFileSync(encryptionPath)),
            zkproof: JSON.parse(fs.readFileSync(zkproofPath)),
            accessFlow: JSON.parse(fs.readFileSync(accessFlowPath))
        };
        
        rounds.push(roundData);
    }

    // Aggregate results
    const aggregated = {
        encryption: aggregateEncryptionResults(rounds.map(r => r.encryption)),
        zkproof: aggregateZKProofResults(rounds.map(r => r.zkproof)),
        accessFlow: aggregateAccessFlowResults(rounds.map(r => r.accessFlow))
    };

    // Save aggregated results
    const outputPath = path.join(resultsDir, 'aggregated_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(aggregated, null, 2));
    
    console.log('Results aggregation complete!');
    console.log(`Aggregated results saved to: ${outputPath}`);
}

main()
    .catch(console.error);