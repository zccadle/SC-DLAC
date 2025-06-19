// enhanced-comprehensive-performance.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

class EnhancedPerformanceFramework {
    constructor() {
        this.results = {
            description: "Enhanced comprehensive performance analysis for SL-DLAC",
            testDate: new Date().toISOString(),
            environment: {
                nodeVersion: process.version,
                hardhatVersion: require('hardhat/package.json').version,
                networkInfo: null
            },
            scalabilityAnalysis: {
                description: "System scalability under increasing loads",
                data: [],
                metrics: {}
            },
            latencyDistribution: {
                description: "Detailed latency distribution analysis",
                data: [],
                metrics: {}
            },
            memoryUsageProfile: {
                description: "Memory usage profiling under various operations",
                data: [],
                metrics: {}
            },
            concurrentPerformance: {
                description: "Performance under concurrent user scenarios",
                data: [],
                metrics: {}
            },
            cacheEfficiency: {
                description: "Caching and data retrieval efficiency",
                data: [],
                metrics: {}
            },
            networkEfficiency: {
                description: "Network utilization and efficiency metrics",
                data: [],
                metrics: {}
            },
            comparativeAnalysis: {
                description: "Comparative performance against baseline metrics",
                data: [],
                metrics: {}
            }
        };
        this.baseline = null;
        this.performanceCounters = {
            totalOperations: 0,
            successfulOperations: 0,
            failedOperations: 0,
            totalLatency: 0,
            totalGasUsed: 0
        };
    }

    async measureOperation(operationName, operation, category, expectedLatency = null) {
        const memoryBefore = process.memoryUsage();
        const start = performance.now();
        
        let success = false;
        let gasUsed = 0;
        let error = null;
        let result = null;
        
        try {
            this.performanceCounters.totalOperations++;
            
            result = await operation();
            if (result && result.wait) {
                const receipt = await result.wait();
                gasUsed = receipt.gasUsed ? receipt.gasUsed.toNumber() : 0;
            }
            
            success = true;
            this.performanceCounters.successfulOperations++;
        } catch (err) {
            error = err.message;
            this.performanceCounters.failedOperations++;
        }
        
        const end = performance.now();
        const duration = end - start;
        const memoryAfter = process.memoryUsage();
        
        this.performanceCounters.totalLatency += duration;
        this.performanceCounters.totalGasUsed += gasUsed;
        
        const operationResult = {
            operationName,
            success,
            duration,
            gasUsed,
            error,
            memoryUsage: {
                heapUsedBefore: memoryBefore.heapUsed,
                heapUsedAfter: memoryAfter.heapUsed,
                heapDelta: memoryAfter.heapUsed - memoryBefore.heapUsed,
                external: memoryAfter.external,
                rss: memoryAfter.rss
            },
            performanceRating: this.calculatePerformanceRating(duration, gasUsed, expectedLatency),
            timestamp: new Date().toISOString(),
            result
        };
        
        this.results[category].data.push(operationResult);
        return operationResult;
    }

    calculatePerformanceRating(duration, gasUsed, expectedLatency) {
        let rating = 100; // Start with perfect score
        
        // Penalize for high latency
        if (expectedLatency && duration > expectedLatency * 1.5) {
            rating -= 30;
        } else if (expectedLatency && duration > expectedLatency * 1.2) {
            rating -= 15;
        }
        
        // Penalize for high gas usage
        if (gasUsed > 1000000) {
            rating -= 20;
        } else if (gasUsed > 500000) {
            rating -= 10;
        }
        
        // Penalize for very slow operations
        if (duration > 5000) {
            rating -= 25;
        } else if (duration > 2000) {
            rating -= 10;
        }
        
        return Math.max(0, rating);
    }

    calculateLatencyDistribution(latencies) {
        if (latencies.length === 0) return {};
        
        const sorted = latencies.sort((a, b) => a - b);
        const mean = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
        const variance = latencies.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / latencies.length;
        const standardDeviation = Math.sqrt(variance);
        
        return {
            count: latencies.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean: mean,
            median: this.calculatePercentile(sorted, 50),
            standardDeviation: standardDeviation,
            p25: this.calculatePercentile(sorted, 25),
            p50: this.calculatePercentile(sorted, 50),
            p75: this.calculatePercentile(sorted, 75),
            p90: this.calculatePercentile(sorted, 90),
            p95: this.calculatePercentile(sorted, 95),
            p99: this.calculatePercentile(sorted, 99),
            p999: this.calculatePercentile(sorted, 99.9),
            distributionBuckets: this.createLatencyBuckets(sorted)
        };
    }

    calculatePercentile(sortedArray, percentile) {
        const index = (percentile / 100) * (sortedArray.length - 1);
        if (Math.floor(index) === index) {
            return sortedArray[index];
        } else {
            const lower = sortedArray[Math.floor(index)];
            const upper = sortedArray[Math.ceil(index)];
            return lower + (upper - lower) * (index - Math.floor(index));
        }
    }

    createLatencyBuckets(sortedLatencies) {
        const buckets = {
            "0-10ms": 0,
            "10-25ms": 0,
            "25-50ms": 0,
            "50-100ms": 0,
            "100-250ms": 0,
            "250-500ms": 0,
            "500-1000ms": 0,
            "1000ms+": 0
        };

        sortedLatencies.forEach(latency => {
            if (latency <= 10) buckets["0-10ms"]++;
            else if (latency <= 25) buckets["10-25ms"]++;
            else if (latency <= 50) buckets["25-50ms"]++;
            else if (latency <= 100) buckets["50-100ms"]++;
            else if (latency <= 250) buckets["100-250ms"]++;
            else if (latency <= 500) buckets["250-500ms"]++;
            else if (latency <= 1000) buckets["500-1000ms"]++;
            else buckets["1000ms+"]++;
        });

        return buckets;
    }

    async runLatencyDistributionAnalysis(operationType, operation, samples = 100) {
        console.log(`\nRunning latency distribution analysis for ${operationType} (${samples} samples)...`);
        
        const latencies = [];
        const gasUsages = [];
        const errors = [];
        
        for (let i = 0; i < samples; i++) {
            try {
                const result = await this.measureOperation(
                    `${operationType}-sample-${i}`,
                    operation,
                    'latencyDistribution',
                    null
                );
                
                if (result.success) {
                    latencies.push(result.duration);
                    gasUsages.push(result.gasUsed);
                } else {
                    errors.push(result.error);
                }
                
                // Small delay between samples to avoid overwhelming the system
                if (i % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            } catch (error) {
                errors.push(error.message);
            }
        }
        
        const latencyStats = this.calculateLatencyDistribution(latencies);
        const gasStats = this.calculateLatencyDistribution(gasUsages);
        
        const analysisResult = {
            operationType,
            samples: samples,
            successfulSamples: latencies.length,
            failedSamples: errors.length,
            successRate: (latencies.length / samples) * 100,
            latencyStatistics: latencyStats,
            gasStatistics: gasStats,
            errors: errors,
            timestamp: new Date().toISOString()
        };
        
        this.results.latencyDistribution.data.push(analysisResult);
        
        console.log(`  ${operationType}: ${latencies.length}/${samples} successful`);
        console.log(`  Latency P50: ${latencyStats.p50?.toFixed(2)}ms | P95: ${latencyStats.p95?.toFixed(2)}ms | P99: ${latencyStats.p99?.toFixed(2)}ms`);
        
        return analysisResult;
    }

    async runScalabilityTest(operation, startLoad, maxLoad, stepSize, category) {
        console.log(`\nRunning scalability test: ${startLoad} to ${maxLoad} (step: ${stepSize})`);
        
        for (let load = startLoad; load <= maxLoad; load += stepSize) {
            console.log(`  Testing load: ${load}`);
            
            const promises = [];
            const loadStart = performance.now();
            
            for (let i = 0; i < load; i++) {
                promises.push(operation());
            }
            
            const results = await Promise.allSettled(promises);
            const loadEnd = performance.now();
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            const scalabilityResult = {
                load,
                successful,
                failed,
                successRate: (successful / load) * 100,
                totalDuration: loadEnd - loadStart,
                averageDuration: (loadEnd - loadStart) / load,
                throughput: (successful * 1000) / (loadEnd - loadStart),
                timestamp: new Date().toISOString()
            };
            
            this.results[category].data.push(scalabilityResult);
            
            // Allow system to cool down between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    async analyzeLatencyDistribution(operations, category) {
        console.log(`\nAnalyzing latency distribution for ${operations.length} operations`);
        
        const latencies = operations.map(op => op.duration).sort((a, b) => a - b);
        
        const distribution = {
            min: latencies[0],
            max: latencies[latencies.length - 1],
            mean: latencies.reduce((sum, val) => sum + val, 0) / latencies.length,
            median: latencies[Math.floor(latencies.length / 2)],
            p75: latencies[Math.floor(latencies.length * 0.75)],
            p90: latencies[Math.floor(latencies.length * 0.90)],
            p95: latencies[Math.floor(latencies.length * 0.95)],
            p99: latencies[Math.floor(latencies.length * 0.99)],
            standardDeviation: this.calculateStandardDeviation(latencies),
            distribution: this.createDistributionBuckets(latencies)
        };
        
        this.results[category].data.push({
            operationType: 'latency_distribution',
            ...distribution,
            timestamp: new Date().toISOString()
        });
        
        return distribution;
    }

    calculateStandardDeviation(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
    }

    createDistributionBuckets(values) {
        const buckets = {
            '0-10ms': 0,
            '10-50ms': 0,
            '50-100ms': 0,
            '100-500ms': 0,
            '500-1000ms': 0,
            '1000-5000ms': 0,
            '5000ms+': 0
        };
        
        values.forEach(val => {
            if (val < 10) buckets['0-10ms']++;
            else if (val < 50) buckets['10-50ms']++;
            else if (val < 100) buckets['50-100ms']++;
            else if (val < 500) buckets['100-500ms']++;
            else if (val < 1000) buckets['500-1000ms']++;
            else if (val < 5000) buckets['1000-5000ms']++;
            else buckets['5000ms+']++;
        });
        
        return buckets;
    }

    calculateStandardDeviation(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
    }

    async profileMemoryUsage(operation, iterations, category) {
        console.log(`\nProfiling memory usage for ${iterations} iterations`);
        
        const memorySnapshots = [];
        
        for (let i = 0; i < iterations; i++) {
            const before = process.memoryUsage();
            
            await operation();
            
            const after = process.memoryUsage();
            
            memorySnapshots.push({
                iteration: i,
                heapUsed: after.heapUsed,
                heapTotal: after.heapTotal,
                external: after.external,
                rss: after.rss,
                heapDelta: after.heapUsed - before.heapUsed
            });
            
            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }
        }
        
        const memoryProfile = {
            operationType: 'memory_profile',
            snapshots: memorySnapshots,
            summary: {
                maxHeapUsed: Math.max(...memorySnapshots.map(s => s.heapUsed)),
                minHeapUsed: Math.min(...memorySnapshots.map(s => s.heapUsed)),
                avgHeapUsed: memorySnapshots.reduce((sum, s) => sum + s.heapUsed, 0) / memorySnapshots.length,
                totalHeapDelta: memorySnapshots.reduce((sum, s) => sum + s.heapDelta, 0),
                memoryLeaks: memorySnapshots.filter(s => s.heapDelta > 1000000).length // 1MB threshold
            },
            timestamp: new Date().toISOString()
        };
        
        this.results[category].data.push(memoryProfile);
        return memoryProfile;
    }
}

async function main() {
    console.log("Starting enhanced comprehensive performance testing...");
    
    const framework = new EnhancedPerformanceFramework();
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Deploy contracts
    console.log("Deploying contracts for enhanced performance testing...");
    
    const ZKPManager = await ethers.getContractFactory("ZKPVerifier");
    const zkpManager = await ZKPManager.deploy();
    await zkpManager.deployed();
    
    const DLACManager = await ethers.getContractFactory("EnhancedRBAC");
    const dlacManager = await DLACManager.deploy(ethers.constants.AddressZero, zkpManager.address);
    await dlacManager.deployed();
    
    const DIDManager = await ethers.getContractFactory("DIDRegistry");
    const didManager = await DIDManager.deploy(dlacManager.address);
    await didManager.deployed();
    
    await dlacManager.updateDIDRegistry(didManager.address);
    
    const AuditLogger = await ethers.getContractFactory("EnhancedAuditLog");
    const auditLogger = await AuditLogger.deploy();
    await auditLogger.deployed();
    
    const EHRManager = await ethers.getContractFactory("UpdatedPatientDataStorage");
    const ehrManager = await EHRManager.deploy(
        dlacManager.address,
        auditLogger.address,
        didManager.address,
        zkpManager.address
    );
    await ehrManager.deployed();

    // Set network info
    framework.results.environment.networkInfo = await ethers.provider.getNetwork();

    // Get signers
    const [owner, doctor, nurse, patient, user1, user2, user3] = await ethers.getSigners();

    // Setup environment
    console.log("Setting up enhanced performance testing environment...");
    
    const dids = {
        doctor: `did:ethr:${doctor.address}`,
        nurse: `did:ethr:${nurse.address}`,
        patient: `did:ethr:${patient.address}`
    };

    for (const [role, did] of Object.entries(dids)) {
        await didManager.connect(eval(role)).createDID(did, []);
    }

    const doctorCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DOCTOR_CREDENTIAL"));
    const nurseCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("NURSE_CREDENTIAL"));

    await dlacManager.connect(owner).assignRole(
        doctor.address, "DOCTOR", doctorCredential, dids.doctor, 365 * 24 * 60 * 60, false
    );
    await dlacManager.connect(owner).assignRole(
        nurse.address, "NURSE", nurseCredential, dids.nurse, 365 * 24 * 60 * 60, false
    );

    await dlacManager.connect(owner).grantPermission("DOCTOR", "view_data");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "update_data");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "create_record");
    await dlacManager.connect(owner).grantPermission("NURSE", "view_data");

    await ehrManager.connect(doctor).createPatientRecord(patient.address);

    // Helper function
    const setupProof = async (user) => {
        const zkProof = ethers.utils.randomBytes(32);
        const proofHash = ethers.utils.keccak256(zkProof);
        await zkpManager.connect(user).submitProof(proofHash);
        return zkProof;
    };

    console.log("Enhanced performance testing environment setup completed.");

    // Test 1: Scalability Analysis
    console.log("\n1. Enhanced Scalability Analysis...");
    
    await framework.runScalabilityTest(
        async () => {
            const proof = await setupProof(doctor);
            return await ehrManager.connect(doctor).updatePatientData(
                patient.address, 
                `scalability-${Date.now()}-${Math.random()}`, 
                "Scalability test data", 
                proof
            );
        },
        1, 20, 2, 'scalabilityAnalysis'
    );

    // Test 2: Detailed Latency Distribution Analysis
    console.log("\n2. Detailed Latency Distribution Analysis...");
    
    // Test different operation types for latency distribution
    await framework.runLatencyDistributionAnalysis(
        "data_access",
        async () => {
            const proof = await setupProof(doctor);
            return await ehrManager.connect(doctor).getPatientData(patient.address, "vital-signs", proof);
        },
        50
    );

    await framework.runLatencyDistributionAnalysis(
        "data_update",
        async () => {
            const proof = await setupProof(doctor);
            return await ehrManager.connect(doctor).updatePatientData(
                patient.address, 
                `test-data-${Date.now()}`, 
                "Latency test data", 
                proof
            );
        },
        50
    );

    await framework.runLatencyDistributionAnalysis(
        "zkproof_submission",
        async () => {
            const zkProof = ethers.utils.randomBytes(32);
            const proofHash = ethers.utils.keccak256(zkProof);
            return await zkpManager.connect(doctor).submitProof(proofHash);
        },
        50
    );

    await framework.runLatencyDistributionAnalysis(
        "policy_creation",
        async () => {
            return await ehrManager.connect(patient).createDelegationPolicy(
                nurse.address, 
                `test-category-${Date.now()}`, 
                "read", 
                24 * 60 * 60
            );
        },
        30
    );

    // Test 3: Memory Usage Profiling
    console.log("\n3. Memory Usage Profiling...");
    
    await framework.profileMemoryUsage(
        async () => {
            const proof = await setupProof(doctor);
            return await ehrManager.connect(doctor).updatePatientData(
                patient.address, 
                `memory-${Date.now()}`, 
                "Memory profiling test", 
                proof
            );
        },
        50,
        'memoryUsageProfile'
    );

    // Test 4: Concurrent Performance Analysis
    console.log("\n4. Concurrent Performance Analysis...");
    
    const concurrentTests = [2, 5, 10, 15, 20];
    
    for (const concurrency of concurrentTests) {
        console.log(`  Testing ${concurrency} concurrent operations`);
        
        const concurrentOps = [];
        const startTime = performance.now();
        
        for (let i = 0; i < concurrency; i++) {
            concurrentOps.push(
                framework.measureOperation(
                    `concurrent-${concurrency}-${i}`,
                    async () => {
                        const proof = await setupProof(doctor);
                        return await ehrManager.connect(doctor).updatePatientData(
                            patient.address, 
                            `concurrent-${concurrency}-${i}`, 
                            `Concurrent test ${i}`, 
                            proof
                        );
                    },
                    'concurrentPerformance',
                    200 // Expected 200ms under load
                )
            );
        }
        
        const results = await Promise.all(concurrentOps);
        const endTime = performance.now();
        
        const summary = {
            concurrencyLevel: concurrency,
            totalDuration: endTime - startTime,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            averageLatency: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
            maxLatency: Math.max(...results.map(r => r.duration)),
            minLatency: Math.min(...results.map(r => r.duration)),
            throughput: (results.filter(r => r.success).length * 1000) / (endTime - startTime),
            timestamp: new Date().toISOString()
        };
        
        framework.results.concurrentPerformance.data.push(summary);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Test 5: Cache Efficiency Analysis
    console.log("\n5. Cache Efficiency Analysis...");
    
    // Test repeated operations to analyze caching
    const cacheTestOperations = [
        'hasPermission',
        'getUserRole',
        'getDIDByAddress',
        'getPatientData'
    ];
    
    for (const operation of cacheTestOperations) {
        console.log(`  Testing cache efficiency for ${operation}`);
        
        // Cold cache (first call)
        const coldStart = performance.now();
        let coldResult;
        switch (operation) {
            case 'hasPermission':
                coldResult = await dlacManager.hasPermission(doctor.address, "view_data");
                break;
            case 'getUserRole':
                coldResult = await dlacManager.getUserRole(doctor.address);
                break;
            case 'getDIDByAddress':
                coldResult = await didManager.getDIDByAddress(doctor.address);
                break;
            case 'getPatientData':
                const proof1 = await setupProof(doctor);
                coldResult = await ehrManager.connect(doctor).getPatientData(
                    patient.address, "latency-1", proof1
                );
                break;
        }
        const coldEnd = performance.now();
        
        // Warm cache (repeated calls)
        const warmTimes = [];
        for (let i = 0; i < 10; i++) {
            const warmStart = performance.now();
            switch (operation) {
                case 'hasPermission':
                    await dlacManager.hasPermission(doctor.address, "view_data");
                    break;
                case 'getUserRole':
                    await dlacManager.getUserRole(doctor.address);
                    break;
                case 'getDIDByAddress':
                    await didManager.getDIDByAddress(doctor.address);
                    break;
                case 'getPatientData':
                    const proof2 = await setupProof(doctor);
                    await ehrManager.connect(doctor).getPatientData(
                        patient.address, "latency-1", proof2
                    );
                    break;
            }
            const warmEnd = performance.now();
            warmTimes.push(warmEnd - warmStart);
        }
        
        const cacheAnalysis = {
            operation,
            coldCacheLatency: coldEnd - coldStart,
            warmCacheLatency: warmTimes.reduce((sum, t) => sum + t, 0) / warmTimes.length,
            cacheEfficiency: ((coldEnd - coldStart) - (warmTimes.reduce((sum, t) => sum + t, 0) / warmTimes.length)) / (coldEnd - coldStart) * 100,
            improvementFactor: (coldEnd - coldStart) / (warmTimes.reduce((sum, t) => sum + t, 0) / warmTimes.length),
            timestamp: new Date().toISOString()
        };
        
        framework.results.cacheEfficiency.data.push(cacheAnalysis);
    }

    // Test 6: Network Efficiency Analysis
    console.log("\n6. Network Efficiency Analysis...");
    
    const networkTests = [
        {
            name: 'Small payload transmission',
            operation: async () => {
                const proof = await setupProof(doctor);
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "small", "Small data", proof
                );
            }
        },
        {
            name: 'Medium payload transmission',
            operation: async () => {
                const proof = await setupProof(doctor);
                const mediumData = "M".repeat(1000);
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "medium", mediumData, proof
                );
            }
        },
        {
            name: 'Large payload transmission',
            operation: async () => {
                const proof = await setupProof(doctor);
                const largeData = "L".repeat(5000);
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "large", largeData, proof
                );
            }
        }
    ];
    
    for (const test of networkTests) {
        const result = await framework.measureOperation(
            test.name,
            test.operation,
            'networkEfficiency'
        );
        console.log(`  ${test.name}: ${result.duration.toFixed(2)}ms, Gas: ${result.gasUsed}`);
    }

    // Test 7: Comparative Analysis
    console.log("\n7. Comparative Analysis Against Baseline...");
    
    // Establish baseline
    const baselineOps = [];
    for (let i = 0; i < 10; i++) {
        const result = await framework.measureOperation(
            `baseline-${i}`,
            async () => {
                const proof = await setupProof(doctor);
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, `baseline-${i}`, "Baseline test", proof
                );
            },
            'comparativeAnalysis'
        );
        baselineOps.push(result);
    }
    
    framework.baseline = {
        averageLatency: baselineOps.reduce((sum, op) => sum + op.duration, 0) / baselineOps.length,
        averageGas: baselineOps.reduce((sum, op) => sum + op.gasUsed, 0) / baselineOps.length,
        successRate: (baselineOps.filter(op => op.success).length / baselineOps.length) * 100
    };
    
    console.log(`  Baseline established - Avg Latency: ${framework.baseline.averageLatency.toFixed(2)}ms, Avg Gas: ${framework.baseline.averageGas}`);

    // Calculate final metrics
    for (const category of Object.keys(framework.results)) {
        if (category === 'description' || category === 'testDate' || category === 'environment') continue;
        
        const data = framework.results[category].data;
        if (data.length > 0) {
            // Filter for operations that have performance data
            const perfData = data.filter(d => d.duration !== undefined);
            
            if (perfData.length > 0) {
                framework.results[category].metrics = {
                    totalOperations: perfData.length,
                    successfulOperations: perfData.filter(d => d.success).length,
                    successRate: (perfData.filter(d => d.success).length / perfData.length) * 100,
                    averageLatency: perfData.reduce((sum, d) => sum + d.duration, 0) / perfData.length,
                    minLatency: Math.min(...perfData.map(d => d.duration)),
                    maxLatency: Math.max(...perfData.map(d => d.duration)),
                    latencyStdDev: framework.calculateStandardDeviation(perfData.map(d => d.duration)),
                    totalGasUsed: perfData.reduce((sum, d) => sum + (d.gasUsed || 0), 0),
                    averageGasUsed: perfData.reduce((sum, d) => sum + (d.gasUsed || 0), 0) / perfData.length,
                    averagePerformanceRating: perfData.reduce((sum, d) => sum + (d.performanceRating || 0), 0) / perfData.length,
                    memoryEfficiency: perfData.filter(d => d.memoryUsage && d.memoryUsage.heapDelta < 1000000).length / perfData.length * 100
                };
            }
        }
    }

    // Add overall performance summary
    framework.results.overallSummary = {
        totalOperations: framework.performanceCounters.totalOperations,
        overallSuccessRate: (framework.performanceCounters.successfulOperations / framework.performanceCounters.totalOperations) * 100,
        averageSystemLatency: framework.performanceCounters.totalLatency / framework.performanceCounters.totalOperations,
        totalSystemGasUsage: framework.performanceCounters.totalGasUsed,
        baseline: framework.baseline,
        performanceImprovement: framework.baseline ? {
            latencyImprovement: ((framework.baseline.averageLatency - (framework.performanceCounters.totalLatency / framework.performanceCounters.totalOperations)) / framework.baseline.averageLatency) * 100,
            gasEfficiency: ((framework.baseline.averageGas - (framework.performanceCounters.totalGasUsed / framework.performanceCounters.totalOperations)) / framework.baseline.averageGas) * 100
        } : null
    };

    // Save results
    const filename = `enhanced-comprehensive-performance-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(resultsDir, filename),
        JSON.stringify(framework.results, null, 2)
    );

    // Generate comprehensive summary
    console.log("\n=== ENHANCED COMPREHENSIVE PERFORMANCE SUMMARY ===");
    for (const [category, results] of Object.entries(framework.results)) {
        if (category === 'description' || category === 'testDate' || category === 'environment' || category === 'overallSummary') continue;
        
        const metrics = results.metrics;
        if (metrics) {
            console.log(`\n${category.toUpperCase()}:`);
            console.log(`  Operations: ${metrics.totalOperations || 0}`);
            console.log(`  Success Rate: ${metrics.successRate ? metrics.successRate.toFixed(2) : '0.00'}%`);
            console.log(`  Average Latency: ${metrics.averageLatency ? metrics.averageLatency.toFixed(2) : '0.00'}ms`);
            console.log(`  Latency Range: ${metrics.minLatency ? metrics.minLatency.toFixed(2) : '0.00'}ms - ${metrics.maxLatency ? metrics.maxLatency.toFixed(2) : '0.00'}ms`);
            console.log(`  Latency Std Dev: ${metrics.latencyStdDev ? metrics.latencyStdDev.toFixed(2) : '0.00'}ms`);
            console.log(`  Total Gas: ${metrics.totalGasUsed ? metrics.totalGasUsed.toLocaleString() : '0'}`);
            console.log(`  Avg Performance Rating: ${metrics.averagePerformanceRating ? metrics.averagePerformanceRating.toFixed(1) : '0.0'}/100`);
            console.log(`  Memory Efficiency: ${metrics.memoryEfficiency ? metrics.memoryEfficiency.toFixed(1) : '0.0'}%`);
        } else {
            console.log(`\n${category.toUpperCase()}:`);
            console.log(`  No valid metrics data available`);
        }
    }

    console.log("\n=== OVERALL SYSTEM PERFORMANCE ===");
    const summary = framework.results.overallSummary;
    console.log(`Total Operations: ${summary.totalOperations}`);
    console.log(`Overall Success Rate: ${summary.overallSuccessRate ? summary.overallSuccessRate.toFixed(2) : '0.00'}%`);
    console.log(`Average System Latency: ${summary.averageSystemLatency ? summary.averageSystemLatency.toFixed(2) : '0.00'}ms`);
    console.log(`Total Gas Usage: ${summary.totalSystemGasUsage ? summary.totalSystemGasUsage.toLocaleString() : '0'}`);

    if (summary.performanceImprovement) {
        console.log(`\n=== PERFORMANCE VS BASELINE ===`);
        console.log(`Latency Improvement: ${summary.performanceImprovement.latencyImprovement ? summary.performanceImprovement.latencyImprovement.toFixed(2) : '0.00'}%`);
        console.log(`Gas Efficiency: ${summary.performanceImprovement.gasEfficiency ? summary.performanceImprovement.gasEfficiency.toFixed(2) : '0.00'}%`);
    }

    console.log(`\nResults saved to: ${filename}`);
    console.log("Enhanced comprehensive performance testing completed!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });