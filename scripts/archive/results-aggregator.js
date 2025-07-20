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
        aes192: { encryption: [], decryption: [] },
        aes512: { encryption: [], decryption: [] }
    };

    rounds.forEach(round => {
        const data = round.algorithms;  
        Object.entries(data).forEach(([algo, algoData]) => {  
            if (algoData.results) {  
                algoData.results.forEach(result => {
                    if (algo === 'aes-256-cbc') {
                        combined.aes256.encryption.push(result.encryptionTimeMs);
                        combined.aes256.decryption.push(result.decryptionTimeMs);
                    } else if (algo === 'aes-192-cbc') {
                        combined.aes192.encryption.push(result.encryptionTimeMs);
                        combined.aes192.decryption.push(result.decryptionTimeMs);
                    } else if (algo === 'aes-512-sim') {
                        combined.aes512.encryption.push(result.encryptionTimeMs);
                        combined.aes512.decryption.push(result.decryptionTimeMs);
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
        },
        aes512: {
            encryption: calculateStats(combined.aes512.encryption),
            decryption: calculateStats(combined.aes512.decryption)
        }
    };
}

function aggregateZKProofResults(rounds) {
    const combined = {
        signing: [],
        generation: [],
        verification: [],
        validation: [],
        cumulative: [],
        requestRates: [],
        latencies: [],
        throughputs: []
    };

    rounds.forEach(round => {
        if (round.zkProofLifecycle && round.zkProofLifecycle.data) {  
            round.zkProofLifecycle.data.forEach(data => {
                combined.signing.push(data.signingTime);
                combined.generation.push(data.generationTime);
                combined.verification.push(data.verificationTime);
                combined.validation.push(data.validationTime);
                combined.cumulative.push(data.avgLatency || data.cumulativeTime);
                
                // For request rate data
                if (data.requestRate) {
                    const rateIndex = combined.requestRates.indexOf(data.requestRate);
                    if (rateIndex === -1) {
                        combined.requestRates.push(data.requestRate);
                        combined.latencies.push([data.avgLatency]);
                        combined.throughputs.push([data.throughput]);
                    } else {
                        combined.latencies[rateIndex].push(data.avgLatency);
                        combined.throughputs[rateIndex].push(data.throughput);
                    }
                }
            });
        }
    });

    // Calculate average latency and throughput for each request rate
    const rateResults = combined.requestRates.map((rate, index) => {
        return {
            requestRate: rate,
            avgLatency: combined.latencies[index].reduce((a, b) => a + b, 0) / combined.latencies[index].length,
            avgThroughput: combined.throughputs[index].reduce((a, b) => a + b, 0) / combined.throughputs[index].length,
            minLatency: Math.min(...combined.latencies[index]),
            maxLatency: Math.max(...combined.latencies[index]),
            minThroughput: Math.min(...combined.throughputs[index]),
            maxThroughput: Math.max(...combined.throughputs[index])
        };
    });

    return {
        signing: calculateStats(combined.signing),
        generation: calculateStats(combined.generation),
        verification: calculateStats(combined.verification),
        validation: calculateStats(combined.validation),
        cumulative: calculateStats(combined.cumulative),
        rateResults: rateResults.sort((a, b) => a.requestRate - b.requestRate)
    };
}

function aggregateSystemResponsivenessResults(rounds) {
    const combined = {
        accessRequest: {
            requestRates: [],
            latencies: [],
            throughputs: []
        },
        policyVerification: {
            requestRates: [],
            latencies: [],
            throughputs: []
        },
        enforcement: {
            requestRates: [],
            latencies: [],
            throughputs: []
        },
        batchSize: {
            sizes: [],
            blockTimes: [],
            blockSizes: []
        }
    };

    rounds.forEach(round => {
        if (round.operations) {
            // Access Request
            if (round.operations.accessRequest) {
                round.operations.accessRequest.requestRates.forEach((rate, index) => {
                    const rateIndex = combined.accessRequest.requestRates.indexOf(rate);
                    if (rateIndex === -1) {
                        combined.accessRequest.requestRates.push(rate);
                        combined.accessRequest.latencies.push([round.operations.accessRequest.latency[index]]);
                        combined.accessRequest.throughputs.push([round.operations.accessRequest.throughput[index]]);
                    } else {
                        combined.accessRequest.latencies[rateIndex].push(round.operations.accessRequest.latency[index]);
                        combined.accessRequest.throughputs[rateIndex].push(round.operations.accessRequest.throughput[index]);
                    }
                });
            }

            // Policy Verification
            if (round.operations.policyVerification) {
                round.operations.policyVerification.requestRates.forEach((rate, index) => {
                    const rateIndex = combined.policyVerification.requestRates.indexOf(rate);
                    if (rateIndex === -1) {
                        combined.policyVerification.requestRates.push(rate);
                        combined.policyVerification.latencies.push([round.operations.policyVerification.latency[index]]);
                        combined.policyVerification.throughputs.push([round.operations.policyVerification.throughput[index]]);
                    } else {
                        combined.policyVerification.latencies[rateIndex].push(round.operations.policyVerification.latency[index]);
                        combined.policyVerification.throughputs[rateIndex].push(round.operations.policyVerification.throughput[index]);
                    }
                });
            }

            // Enforcement
            if (round.operations.enforcement) {
                round.operations.enforcement.requestRates.forEach((rate, index) => {
                    const rateIndex = combined.enforcement.requestRates.indexOf(rate);
                    if (rateIndex === -1) {
                        combined.enforcement.requestRates.push(rate);
                        combined.enforcement.latencies.push([round.operations.enforcement.latency[index]]);
                        combined.enforcement.throughputs.push([round.operations.enforcement.throughput[index]]);
                    } else {
                        combined.enforcement.latencies[rateIndex].push(round.operations.enforcement.latency[index]);
                        combined.enforcement.throughputs[rateIndex].push(round.operations.enforcement.throughput[index]);
                    }
                });
            }
        }

        // Batch Size Variation
        if (round.batchSizeVariation && round.batchSizeVariation.data) {
            round.batchSizeVariation.data.forEach(data => {
                const sizeIndex = combined.batchSize.sizes.indexOf(data.batchSize);
                if (sizeIndex === -1) {
                    combined.batchSize.sizes.push(data.batchSize);
                    combined.batchSize.blockTimes.push([data.blockTime]);
                    combined.batchSize.blockSizes.push([data.blockSize]);
                } else {
                    combined.batchSize.blockTimes[sizeIndex].push(data.blockTime);
                    combined.batchSize.blockSizes[sizeIndex].push(data.blockSize);
                }
            });
        }
    });

    // Calculate average latency and throughput for each request rate
    const accessRequestResults = combined.accessRequest.requestRates.map((rate, index) => {
        return {
            requestRate: rate,
            avgLatency: combined.accessRequest.latencies[index].reduce((a, b) => a + b, 0) / combined.accessRequest.latencies[index].length,
            avgThroughput: combined.accessRequest.throughputs[index].reduce((a, b) => a + b, 0) / combined.accessRequest.throughputs[index].length,
            minLatency: Math.min(...combined.accessRequest.latencies[index]),
            maxLatency: Math.max(...combined.accessRequest.latencies[index]),
            minThroughput: Math.min(...combined.accessRequest.throughputs[index]),
            maxThroughput: Math.max(...combined.accessRequest.throughputs[index])
        };
    });

    const policyVerificationResults = combined.policyVerification.requestRates.map((rate, index) => {
        return {
            requestRate: rate,
            avgLatency: combined.policyVerification.latencies[index].reduce((a, b) => a + b, 0) / combined.policyVerification.latencies[index].length,
            avgThroughput: combined.policyVerification.throughputs[index].reduce((a, b) => a + b, 0) / combined.policyVerification.throughputs[index].length,
            minLatency: Math.min(...combined.policyVerification.latencies[index]),
            maxLatency: Math.max(...combined.policyVerification.latencies[index]),
            minThroughput: Math.min(...combined.policyVerification.throughputs[index]),
            maxThroughput: Math.max(...combined.policyVerification.throughputs[index])
        };
    });

    const enforcementResults = combined.enforcement.requestRates.map((rate, index) => {
        return {
            requestRate: rate,
            avgLatency: combined.enforcement.latencies[index].reduce((a, b) => a + b, 0) / combined.enforcement.latencies[index].length,
            avgThroughput: combined.enforcement.throughputs[index].reduce((a, b) => a + b, 0) / combined.enforcement.throughputs[index].length,
            minLatency: Math.min(...combined.enforcement.latencies[index]),
            maxLatency: Math.max(...combined.enforcement.latencies[index]),
            minThroughput: Math.min(...combined.enforcement.throughputs[index]),
            maxThroughput: Math.max(...combined.enforcement.throughputs[index])
        };
    });

    const batchSizeResults = combined.batchSize.sizes.map((size, index) => {
        return {
            batchSize: size,
            avgBlockTime: combined.batchSize.blockTimes[index].reduce((a, b) => a + b, 0) / combined.batchSize.blockTimes[index].length,
            avgBlockSize: combined.batchSize.blockSizes[index].reduce((a, b) => a + b, 0) / combined.batchSize.blockSizes[index].length,
            minBlockTime: Math.min(...combined.batchSize.blockTimes[index]),
            maxBlockTime: Math.max(...combined.batchSize.blockTimes[index]),
            minBlockSize: Math.min(...combined.batchSize.blockSizes[index]),
            maxBlockSize: Math.max(...combined.batchSize.blockSizes[index])
        };
    });

    return {
        accessRequest: accessRequestResults.sort((a, b) => a.requestRate - b.requestRate),
        policyVerification: policyVerificationResults.sort((a, b) => a.requestRate - b.requestRate),
        enforcement: enforcementResults.sort((a, b) => a.requestRate - b.requestRate),
        batchSize: batchSizeResults.sort((a, b) => a.batchSize - b.batchSize)
    };
}

function saveAggregatedCSV(aggregated, resultsDir) {
    // Save ZK Proof results
    let zkProofCsv = 'RequestRate,AvgLatency(ms),MinLatency(ms),MaxLatency(ms),AvgThroughput(tx/s),MinThroughput(tx/s),MaxThroughput(tx/s)\n';
    aggregated.zkproof.rateResults.forEach(result => {
        zkProofCsv += `${result.requestRate},${result.avgLatency.toFixed(2)},${result.minLatency.toFixed(2)},${result.maxLatency.toFixed(2)},${result.avgThroughput.toFixed(2)},${result.minThroughput.toFixed(2)},${result.maxThroughput.toFixed(2)}\n`;
    });
    fs.writeFileSync(path.join(resultsDir, 'aggregated_zkproof.csv'), zkProofCsv);

    // Save System Responsiveness results
    // Access Request
    let accessRequestCsv = 'RequestRate,AvgLatency(ms),MinLatency(ms),MaxLatency(ms),AvgThroughput(tx/s),MinThroughput(tx/s),MaxThroughput(tx/s)\n';
    aggregated.systemResponsiveness.accessRequest.forEach(result => {
        accessRequestCsv += `${result.requestRate},${result.avgLatency.toFixed(2)},${result.minLatency.toFixed(2)},${result.maxLatency.toFixed(2)},${result.avgThroughput.toFixed(2)},${result.minThroughput.toFixed(2)},${result.maxThroughput.toFixed(2)}\n`;
    });
    fs.writeFileSync(path.join(resultsDir, 'aggregated_access_request.csv'), accessRequestCsv);

    // Policy Verification
    let policyVerificationCsv = 'RequestRate,AvgLatency(ms),MinLatency(ms),MaxLatency(ms),AvgThroughput(tx/s),MinThroughput(tx/s),MaxThroughput(tx/s)\n';
    aggregated.systemResponsiveness.policyVerification.forEach(result => {
        policyVerificationCsv += `${result.requestRate},${result.avgLatency.toFixed(2)},${result.minLatency.toFixed(2)},${result.maxLatency.toFixed(2)},${result.avgThroughput.toFixed(2)},${result.minThroughput.toFixed(2)},${result.maxThroughput.toFixed(2)}\n`;
    });
    fs.writeFileSync(path.join(resultsDir, 'aggregated_policy_verification.csv'), policyVerificationCsv);

    // Enforcement
    let enforcementCsv = 'RequestRate,AvgLatency(ms),MinLatency(ms),MaxLatency(ms),AvgThroughput(tx/s),MinThroughput(tx/s),MaxThroughput(tx/s)\n';
    aggregated.systemResponsiveness.enforcement.forEach(result => {
        enforcementCsv += `${result.requestRate},${result.avgLatency.toFixed(2)},${result.minLatency.toFixed(2)},${result.maxLatency.toFixed(2)},${result.avgThroughput.toFixed(2)},${result.minThroughput.toFixed(2)},${result.maxThroughput.toFixed(2)}\n`;
    });
    fs.writeFileSync(path.join(resultsDir, 'aggregated_enforcement.csv'), enforcementCsv);

    // Batch Size
    let batchSizeCsv = 'BatchSize,AvgBlockTime(ms),MinBlockTime(ms),MaxBlockTime(ms),AvgBlockSize(bytes),MinBlockSize(bytes),MaxBlockSize(bytes)\n';
    aggregated.systemResponsiveness.batchSize.forEach(result => {
        batchSizeCsv += `${result.batchSize},${result.avgBlockTime.toFixed(2)},${result.minBlockTime.toFixed(2)},${result.maxBlockTime.toFixed(2)},${result.avgBlockSize.toFixed(0)},${result.minBlockSize.toFixed(0)},${result.maxBlockSize.toFixed(0)}\n`;
    });
    fs.writeFileSync(path.join(resultsDir, 'aggregated_batch_size.csv'), batchSizeCsv);

    // Encryption
    let encryptionCsv = 'Algorithm,AvgEncryptionTime(ms),MinEncryptionTime(ms),MaxEncryptionTime(ms),AvgDecryptionTime(ms),MinDecryptionTime(ms),MaxDecryptionTime(ms)\n';
    encryptionCsv += `AES-192,${aggregated.encryption.aes192.encryption.avg.toFixed(2)},${aggregated.encryption.aes192.encryption.min.toFixed(2)},${aggregated.encryption.aes192.encryption.max.toFixed(2)},${aggregated.encryption.aes192.decryption.avg.toFixed(2)},${aggregated.encryption.aes192.decryption.min.toFixed(2)},${aggregated.encryption.aes192.decryption.max.toFixed(2)}\n`;
    encryptionCsv += `AES-256,${aggregated.encryption.aes256.encryption.avg.toFixed(2)},${aggregated.encryption.aes256.encryption.min.toFixed(2)},${aggregated.encryption.aes256.encryption.max.toFixed(2)},${aggregated.encryption.aes256.decryption.avg.toFixed(2)},${aggregated.encryption.aes256.decryption.min.toFixed(2)},${aggregated.encryption.aes256.decryption.max.toFixed(2)}\n`;
    encryptionCsv += `AES-512,${aggregated.encryption.aes512.encryption.avg.toFixed(2)},${aggregated.encryption.aes512.encryption.min.toFixed(2)},${aggregated.encryption.aes512.encryption.max.toFixed(2)},${aggregated.encryption.aes512.decryption.avg.toFixed(2)},${aggregated.encryption.aes512.decryption.min.toFixed(2)},${aggregated.encryption.aes512.decryption.max.toFixed(2)}\n`;
    fs.writeFileSync(path.join(resultsDir, 'aggregated_encryption.csv'), encryptionCsv);

    console.log('Aggregated CSV files saved to results directory');
}

async function main() {
    const resultsDir = path.join(__dirname, '../results');
    const rounds = [];

    // Count how many rounds we have
    let roundCount = 0;
    while (true) {
        const roundDir = path.join(resultsDir, `round_${roundCount + 1}`);
        if (fs.existsSync(roundDir)) {
            roundCount++;
        } else {
            break;
        }
    }

    console.log(`Found ${roundCount} rounds of results`);

    // Read all round results
    for (let round = 1; round <= roundCount; round++) {
        const roundDir = path.join(resultsDir, `round_${round}`);
        
        try {
            const encryptionPath = path.join(roundDir, 'enhanced-encryption-comparison.json');
            const zkproofPath = path.join(roundDir, 'enhanced-zkproof-performance.json');
            const systemResponsivenessPath = path.join(roundDir, 'system-responsiveness.json');
            
            const roundData = {
                encryption: fs.existsSync(encryptionPath) ? JSON.parse(fs.readFileSync(encryptionPath)) : null,
                zkproof: fs.existsSync(zkproofPath) ? JSON.parse(fs.readFileSync(zkproofPath)) : null,
                systemResponsiveness: fs.existsSync(systemResponsivenessPath) ? JSON.parse(fs.readFileSync(systemResponsivenessPath)) : null
            };
            
            rounds.push(roundData);
            console.log(`Loaded data from round ${round}`);
        } catch (error) {
            console.error(`Error loading data from round ${round}:`, error.message);
        }
    }

    if (rounds.length === 0) {
        console.error('No valid round data found. Exiting.');
        return;
    }

    // Aggregate results
    const aggregated = {
        encryption: aggregateEncryptionResults(rounds.filter(r => r.encryption).map(r => r.encryption)),
        zkproof: aggregateZKProofResults(rounds.filter(r => r.zkproof).map(r => r.zkproof)),
        systemResponsiveness: aggregateSystemResponsivenessResults(rounds.filter(r => r.systemResponsiveness).map(r => r.systemResponsiveness))
    };

    // Save aggregated results
    const outputPath = path.join(resultsDir, 'aggregated_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(aggregated, null, 2));
    
    // Save aggregated results to CSV files
    saveAggregatedCSV(aggregated, resultsDir);
    
    console.log('Results aggregation complete!');
    console.log(`Aggregated results saved to: ${outputPath}`);
}

main()
    .catch(console.error);