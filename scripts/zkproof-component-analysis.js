// zkproof-component-analysis.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

class ZKProofComponentAnalyzer {
    constructor() {
        this.results = {
            description: "Comprehensive ZK proof component performance breakdown with statistical analysis",
            testDate: new Date().toISOString(),
            proofGeneration: {
                description: "ZK proof generation component analysis",
                data: [],
                statistics: {}
            },
            proofValidation: {
                description: "ZK proof validation component analysis",
                data: [],
                statistics: {}
            },
            combinedOperations: {
                description: "Combined role credential + ZK proof operations",
                data: [],
                statistics: {}
            },
            performanceDistribution: {
                description: "Performance distribution across different proof types",
                data: [],
                statistics: {}
            },
            scalabilityAnalysis: {
                description: "ZK proof performance under increasing loads",
                data: [],
                statistics: {}
            }
        };
        this.performanceMetrics = [];
    }

    async measureZKComponent(componentName, operation, category, repetitions = 5) {
        const measurements = [];
        
        for (let i = 0; i < repetitions; i++) {
            const start = performance.now();
            let success = false;
            let gasUsed = 0;
            let error = null;
            let result = null;

            try {
                result = await operation();
                if (result && result.wait) {
                    const receipt = await result.wait();
                    gasUsed = receipt.gasUsed ? receipt.gasUsed.toNumber() : 0;
                } else if (result && typeof result === 'boolean') {
                    // For validation operations that return boolean
                    gasUsed = 0; // View function, no gas cost
                }
                success = true;
            } catch (err) {
                error = err.message;
                success = false;
            }

            const end = performance.now();
            const duration = end - start;

            measurements.push({
                iteration: i + 1,
                duration,
                gasUsed,
                success,
                error,
                result
            });

            // Small delay between measurements
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        const statistics = this.calculateStatistics(measurements);
        
        const componentResult = {
            componentName,
            category,
            measurements,
            statistics,
            timestamp: new Date().toISOString()
        };

        this.results[category].data.push(componentResult);
        this.performanceMetrics.push(...measurements.map(m => ({ 
            component: componentName, 
            category, 
            duration: m.duration, 
            gasUsed: m.gasUsed 
        })));

        return componentResult;
    }

    calculateStatistics(measurements) {
        const successfulMeasurements = measurements.filter(m => m.success);
        const durations = successfulMeasurements.map(m => m.duration);
        const gasUsages = successfulMeasurements.map(m => m.gasUsed);

        if (durations.length === 0) {
            return {
                successRate: 0,
                mean: 0,
                median: 0,
                standardDeviation: 0,
                min: 0,
                max: 0,
                p95: 0,
                p99: 0,
                gasStatistics: { mean: 0, median: 0, standardDeviation: 0 }
            };
        }

        const sortedDurations = durations.sort((a, b) => a - b);
        const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const median = this.calculatePercentile(sortedDurations, 50);
        const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
        const standardDeviation = Math.sqrt(variance);

        const sortedGas = gasUsages.sort((a, b) => a - b);
        const gasMean = gasUsages.reduce((sum, g) => sum + g, 0) / gasUsages.length;
        const gasMedian = this.calculatePercentile(sortedGas, 50);
        const gasVariance = gasUsages.reduce((sum, g) => sum + Math.pow(g - gasMean, 2), 0) / gasUsages.length;
        const gasStandardDeviation = Math.sqrt(gasVariance);

        return {
            successRate: (successfulMeasurements.length / measurements.length) * 100,
            mean: mean,
            median: median,
            standardDeviation: standardDeviation,
            min: Math.min(...durations),
            max: Math.max(...durations),
            p95: this.calculatePercentile(sortedDurations, 95),
            p99: this.calculatePercentile(sortedDurations, 99),
            confidenceInterval95: this.calculateConfidenceInterval(durations, 0.95),
            gasStatistics: {
                mean: gasMean,
                median: gasMedian,
                standardDeviation: gasStandardDeviation,
                min: Math.min(...gasUsages),
                max: Math.max(...gasUsages)
            }
        };
    }

    calculatePercentile(sortedArray, percentile) {
        if (sortedArray.length === 0) return 0;
        const index = (percentile / 100) * (sortedArray.length - 1);
        if (Math.floor(index) === index) {
            return sortedArray[index];
        } else {
            const lower = sortedArray[Math.floor(index)];
            const upper = sortedArray[Math.ceil(index)];
            return lower + (upper - lower) * (index - Math.floor(index));
        }
    }

    calculateConfidenceInterval(values, confidence) {
        if (values.length === 0) return { lower: 0, upper: 0 };
        
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        const standardError = Math.sqrt(variance / values.length);
        
        // Using t-distribution critical value for 95% confidence (approximation)
        const tValue = confidence === 0.95 ? 1.96 : 2.576; // 95% or 99%
        const margin = tValue * standardError;
        
        return {
            lower: mean - margin,
            upper: mean + margin
        };
    }

    async runScalabilityAnalysis(baseOperation, maxConcurrency = 10) {
        console.log("\nRunning ZK proof scalability analysis...");
        
        for (let concurrency = 1; concurrency <= maxConcurrency; concurrency++) {
            console.log(`  Testing concurrency level: ${concurrency}`);
            
            const promises = [];
            const startTime = performance.now();
            
            for (let i = 0; i < concurrency; i++) {
                promises.push(baseOperation(i));
            }
            
            try {
                const results = await Promise.all(promises);
                const endTime = performance.now();
                const totalDuration = endTime - startTime;
                
                const scalabilityResult = {
                    concurrencyLevel: concurrency,
                    totalDuration,
                    averageDurationPerOperation: totalDuration / concurrency,
                    successfulOperations: results.filter(r => r && r.success !== false).length,
                    failedOperations: results.filter(r => !r || r.success === false).length,
                    throughput: concurrency / (totalDuration / 1000), // operations per second
                    timestamp: new Date().toISOString()
                };
                
                this.results.scalabilityAnalysis.data.push(scalabilityResult);
            } catch (error) {
                console.log(`    Failed at concurrency ${concurrency}: ${error.message}`);
            }
            
            // Cool down between tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    generatePerformanceDistribution() {
        const distributionBuckets = {
            "0-10ms": 0,
            "10-25ms": 0,
            "25-50ms": 0,
            "50-100ms": 0,
            "100-200ms": 0,
            "200ms+": 0
        };

        this.performanceMetrics.forEach(metric => {
            const duration = metric.duration;
            if (duration <= 10) distributionBuckets["0-10ms"]++;
            else if (duration <= 25) distributionBuckets["10-25ms"]++;
            else if (duration <= 50) distributionBuckets["25-50ms"]++;
            else if (duration <= 100) distributionBuckets["50-100ms"]++;
            else if (duration <= 200) distributionBuckets["100-200ms"]++;
            else distributionBuckets["200ms+"]++;
        });

        const total = this.performanceMetrics.length;
        const distributionPercentages = {};
        Object.keys(distributionBuckets).forEach(bucket => {
            distributionPercentages[bucket] = {
                count: distributionBuckets[bucket],
                percentage: (distributionBuckets[bucket] / total) * 100
            };
        });

        this.results.performanceDistribution.statistics = distributionPercentages;
        return distributionPercentages;
    }

    generateComprehensiveReport() {
        console.log("\n" + "=".repeat(80));
        console.log("🔐 COMPREHENSIVE ZK PROOF COMPONENT ANALYSIS");
        console.log("=".repeat(80));

        // Report for each category
        Object.entries(this.results).forEach(([category, categoryData]) => {
            if (category === 'description' || category === 'testDate' || !categoryData.data) return;
            
            console.log(`\n📊 ${category.toUpperCase().replace(/([A-Z])/g, ' $1').trim()}:`);
            
            categoryData.data.forEach(component => {
                const stats = component.statistics;
                if (!stats) return; // Skip if no statistics
                console.log(`\n  ${component.componentName}:`);
                console.log(`    Success Rate: ${stats.successRate ? stats.successRate.toFixed(1) : '0.0'}%`);
                console.log(`    Mean Time: ${stats.mean.toFixed(2)}ms ± ${stats.standardDeviation.toFixed(2)}ms`);
                console.log(`    Median Time: ${stats.median.toFixed(2)}ms`);
                console.log(`    Range: ${stats.min.toFixed(2)}ms - ${stats.max.toFixed(2)}ms`);
                console.log(`    P95: ${stats.p95.toFixed(2)}ms | P99: ${stats.p99.toFixed(2)}ms`);
                
                if (stats.confidenceInterval95) {
                    console.log(`    95% CI: [${stats.confidenceInterval95.lower.toFixed(2)}ms, ${stats.confidenceInterval95.upper.toFixed(2)}ms]`);
                }
                
                if (stats.gasStatistics && stats.gasStatistics.mean > 0) {
                    console.log(`    Gas Usage: ${Math.round(stats.gasStatistics.mean).toLocaleString()} ± ${Math.round(stats.gasStatistics.standardDeviation).toLocaleString()}`);
                }
            });
        });

        // Performance distribution
        const distribution = this.generatePerformanceDistribution();
        console.log("\n📈 PERFORMANCE DISTRIBUTION:");
        Object.entries(distribution).forEach(([bucket, data]) => {
            console.log(`  ${bucket.padEnd(10)}: ${data.count.toString().padStart(3)} samples (${data.percentage.toFixed(1)}%)`);
        });

        // Scalability analysis
        if (this.results.scalabilityAnalysis.data.length > 0) {
            console.log("\n⚡ SCALABILITY ANALYSIS:");
            this.results.scalabilityAnalysis.data.forEach(result => {
                console.log(`  Concurrency ${result.concurrencyLevel}: ${result.averageDurationPerOperation.toFixed(2)}ms avg, ${result.throughput.toFixed(2)} ops/sec`);
            });
        }

        console.log("\n" + "=".repeat(80));
    }
}

async function main() {
    console.log("Starting comprehensive ZK proof component analysis...");
    
    const analyzer = new ZKProofComponentAnalyzer();
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Deploy ZKP Manager for testing
    console.log("Deploying ZK proof verification contract...");
    
    const ZKPManager = await ethers.getContractFactory("ZKPVerifier");
    const zkpManager = await ZKPManager.deploy();
    await zkpManager.deployed();
    
    const DLACManager = await ethers.getContractFactory("EnhancedRBAC");
    const dlacManager = await DLACManager.deploy(ethers.constants.AddressZero, zkpManager.address);
    await dlacManager.deployed();

    // Get signers for testing
    const [owner, doctor, nurse, patient, paramedic] = await ethers.getSigners();

    // Assign a role for combined operations testing
    await dlacManager.connect(owner).assignRole(
        doctor.address, 
        "DOCTOR", 
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DOCTOR_CREDENTIAL")), 
        `did:ethr:${doctor.address}`, 
        365 * 24 * 60 * 60, 
        false
    );

    console.log("Analyzing ZK proof generation components...");

    // Test 1: Basic ZK Proof Submission (Signing equivalent)
    await analyzer.measureZKComponent(
        "Basic Proof Generation",
        async () => {
            const zkProof = ethers.utils.randomBytes(32);
            const proofHash = ethers.utils.keccak256(zkProof);
            return await zkpManager.connect(doctor).submitProof(proofHash);
        },
        "proofGeneration",
        10
    );

    // Test 2: Complex Proof Generation (with role credential combination)
    await analyzer.measureZKComponent(
        "Role-Credential Proof Generation",
        async () => {
            const zkProof = ethers.utils.randomBytes(32);
            const roleHash = await dlacManager.getRoleCredential(doctor.address);
            const combinedProofHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [roleHash, zkProof])
            );
            return await zkpManager.connect(doctor).submitProof(combinedProofHash);
        },
        "proofGeneration",
        10
    );

    // Test 3: Batch Proof Generation
    await analyzer.measureZKComponent(
        "Batch Proof Generation",
        async () => {
            const proofs = [];
            for (let i = 0; i < 3; i++) {
                const zkProof = ethers.utils.randomBytes(32);
                const proofHash = ethers.utils.keccak256(zkProof);
                proofs.push(zkpManager.connect(doctor).submitProof(proofHash));
            }
            return await Promise.all(proofs);
        },
        "proofGeneration",
        5
    );

    console.log("Analyzing ZK proof validation components...");

    // Set up proofs for validation testing
    const testProofs = [];
    for (let i = 0; i < 5; i++) {
        const zkProof = ethers.utils.randomBytes(32);
        const proofHash = ethers.utils.keccak256(zkProof);
        await zkpManager.connect(doctor).submitProof(proofHash);
        testProofs.push({ user: doctor, hash: proofHash });
    }

    // Test 4: Basic Proof Validation
    let validationIndex = 0;
    await analyzer.measureZKComponent(
        "Basic Proof Validation",
        async () => {
            const proof = testProofs[validationIndex % testProofs.length];
            validationIndex++;
            return await zkpManager.validateProof(proof.user.address, proof.hash);
        },
        "proofValidation",
        10
    );

    // Test 5: Cross-User Validation (should fail)
    await analyzer.measureZKComponent(
        "Cross-User Validation",
        async () => {
            const proof = testProofs[0];
            return await zkpManager.validateProof(nurse.address, proof.hash);
        },
        "proofValidation",
        5
    );

    // Test 6: Invalid Proof Validation
    await analyzer.measureZKComponent(
        "Invalid Proof Validation",
        async () => {
            const invalidHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("invalid"));
            return await zkpManager.validateProof(doctor.address, invalidHash);
        },
        "proofValidation",
        5
    );

    console.log("Analyzing combined operations...");

    // Test 7: Complete Proof Lifecycle
    await analyzer.measureZKComponent(
        "Complete Proof Lifecycle",
        async () => {
            const zkProof = ethers.utils.randomBytes(32);
            const proofHash = ethers.utils.keccak256(zkProof);
            
            // Submit proof
            await zkpManager.connect(nurse).submitProof(proofHash);
            
            // Validate proof
            return await zkpManager.validateProof(nurse.address, proofHash);
        },
        "combinedOperations",
        8
    );

    // Test 8: Role-Based Proof Operations
    await analyzer.measureZKComponent(
        "Role-Based Proof Operations",
        async () => {
            const zkProof = ethers.utils.randomBytes(32);
            const roleHash = await dlacManager.getRoleCredential(doctor.address);
            const combinedProofHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [roleHash, zkProof])
            );
            
            // Submit combined proof
            await zkpManager.connect(doctor).submitProof(combinedProofHash);
            
            // Validate combined proof
            return await zkpManager.validateProof(doctor.address, combinedProofHash);
        },
        "combinedOperations",
        8
    );

    console.log("Running scalability analysis...");

    // Scalability test
    await analyzer.runScalabilityAnalysis(
        async (index) => {
            const zkProof = ethers.utils.randomBytes(32);
            const proofHash = ethers.utils.keccak256(zkProof);
            const start = performance.now();
            
            try {
                await zkpManager.connect(doctor).submitProof(proofHash);
                const end = performance.now();
                return { success: true, duration: end - start };
            } catch (error) {
                const end = performance.now();
                return { success: false, duration: end - start, error: error.message };
            }
        },
        8
    );

    // Generate comprehensive analysis report
    analyzer.generateComprehensiveReport();

    // Save results
    const filename = `zkproof-component-analysis-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(resultsDir, filename),
        JSON.stringify(analyzer.results, null, 2)
    );

    console.log(`\n💾 ZK proof component analysis saved to: ${filename}`);
    console.log("ZK proof component analysis completed!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });