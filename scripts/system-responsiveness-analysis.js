// system-responsiveness-analysis.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

class SystemResponsivenessAnalyzer {
    constructor() {
        this.results = {
            description: "Comprehensive system responsiveness analysis under varying load conditions",
            testDate: new Date().toISOString(),
            operationLatencyVsLoad: {
                description: "Latency characteristics vs request rate analysis",
                data: [],
                metrics: {}
            },
            operationThroughputVsLoad: {
                description: "Throughput characteristics vs request rate analysis", 
                data: [],
                metrics: {}
            },
            systemPerformanceProfile: {
                description: "System performance profile across different scenarios",
                data: [],
                metrics: {}
            },
            loadBalancingAnalysis: {
                description: "System behavior under concurrent load patterns",
                data: [],
                metrics: {}
            },
            resourceUtilizationAnalysis: {
                description: "Resource utilization patterns under load",
                data: [],
                metrics: {}
            }
        };
        this.loadTests = [];
    }

    async measureSystemResponse(requestRate, duration, operation, operationType) {
        console.log(`  Testing ${operationType} at ${requestRate} requests/second for ${duration}ms...`);
        
        const interval = 1000 / requestRate; // milliseconds between requests
        const totalRequests = Math.floor(duration / interval);
        const responses = [];
        const startTime = performance.now();
        let completedRequests = 0;
        let failedRequests = 0;

        const sendRequest = async (requestId) => {
            const requestStart = performance.now();
            try {
                const result = await operation(requestId);
                const requestEnd = performance.now();
                const latency = requestEnd - requestStart;
                
                responses.push({
                    requestId,
                    latency,
                    success: true,
                    timestamp: requestEnd,
                    gasUsed: result && result.gasUsed ? result.gasUsed.toNumber() : 0
                });
                completedRequests++;
            } catch (error) {
                const requestEnd = performance.now();
                const latency = requestEnd - requestStart;
                
                responses.push({
                    requestId,
                    latency,
                    success: false,
                    error: error.message,
                    timestamp: requestEnd
                });
                failedRequests++;
            }
        };

        // Send requests at specified rate
        const promises = [];
        for (let i = 0; i < totalRequests; i++) {
            setTimeout(() => {
                promises.push(sendRequest(i));
            }, i * interval);
        }

        // Wait for all requests to complete with timeout
        await new Promise(resolve => setTimeout(resolve, duration + 5000)); // Extra 5s for completion
        await Promise.allSettled(promises);

        const endTime = performance.now();
        const actualDuration = endTime - startTime;
        
        // Calculate metrics
        const successfulResponses = responses.filter(r => r.success);
        const latencies = successfulResponses.map(r => r.latency);
        
        const metrics = this.calculateResponseMetrics(latencies, actualDuration, completedRequests, failedRequests);
        
        const testResult = {
            operationType,
            requestRate,
            plannedDuration: duration,
            actualDuration,
            totalRequests,
            completedRequests,
            failedRequests,
            successRate: (completedRequests / totalRequests) * 100,
            actualThroughput: completedRequests / (actualDuration / 1000),
            metrics,
            responses: successfulResponses.slice(0, 100), // Keep sample of responses
            timestamp: new Date().toISOString()
        };

        return testResult;
    }

    calculateResponseMetrics(latencies, duration, completed, failed) {
        if (latencies.length === 0) {
            return {
                avgLatency: 0,
                minLatency: 0,
                maxLatency: 0,
                p50: 0,
                p75: 0,
                p90: 0,
                p95: 0,
                p99: 0,
                standardDeviation: 0,
                errorRate: failed / (completed + failed) * 100,
                throughput: 0
            };
        }

        const sorted = latencies.sort((a, b) => a - b);
        const sum = latencies.reduce((acc, val) => acc + val, 0);
        const avg = sum / latencies.length;
        const variance = latencies.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / latencies.length;
        
        return {
            avgLatency: avg,
            minLatency: sorted[0],
            maxLatency: sorted[sorted.length - 1],
            p50: this.percentile(sorted, 50),
            p75: this.percentile(sorted, 75),
            p90: this.percentile(sorted, 90),
            p95: this.percentile(sorted, 95),
            p99: this.percentile(sorted, 99),
            standardDeviation: Math.sqrt(variance),
            errorRate: failed / (completed + failed) * 100,
            throughput: completed / (duration / 1000)
        };
    }

    percentile(sortedArray, p) {
        const index = (p / 100) * (sortedArray.length - 1);
        if (Math.floor(index) === index) {
            return sortedArray[index];
        } else {
            const lower = sortedArray[Math.floor(index)];
            const upper = sortedArray[Math.ceil(index)];
            return lower + (upper - lower) * (index - Math.floor(index));
        }
    }

    async runLatencyVsLoadAnalysis(operation, operationType, requestRates = [1, 2, 5, 10, 15, 20, 25, 30], testDuration = 10000) {
        console.log(`\nRunning latency vs load analysis for ${operationType}...`);
        
        for (const rate of requestRates) {
            const result = await this.measureSystemResponse(rate, testDuration, operation, operationType);
            this.results.operationLatencyVsLoad.data.push(result);
            
            console.log(`    ${rate} req/s: Avg ${result.metrics.avgLatency.toFixed(2)}ms, P95 ${result.metrics.p95.toFixed(2)}ms, Success ${result.successRate.toFixed(1)}%`);
            
            // Cool down between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    async runThroughputVsLoadAnalysis(operation, operationType, requestRates = [5, 10, 20, 30, 40, 50], testDuration = 15000) {
        console.log(`\nRunning throughput vs load analysis for ${operationType}...`);
        
        for (const rate of requestRates) {
            const result = await this.measureSystemResponse(rate, testDuration, operation, operationType);
            this.results.operationThroughputVsLoad.data.push(result);
            
            console.log(`    ${rate} req/s target: ${result.actualThroughput.toFixed(2)} actual, ${result.successRate.toFixed(1)}% success`);
            
            // Cool down between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    async runConcurrentLoadAnalysis(operations, maxConcurrency = 20, stepSize = 4) {
        console.log(`\nRunning concurrent load analysis...`);
        
        for (let concurrency = stepSize; concurrency <= maxConcurrency; concurrency += stepSize) {
            console.log(`  Testing concurrency level: ${concurrency}`);
            
            const startTime = performance.now();
            const promises = [];
            
            // Create concurrent operations
            for (let i = 0; i < concurrency; i++) {
                const operationType = `concurrent-${i % operations.length}`;
                const operation = operations[i % operations.length];
                promises.push(this.executeOperation(operation, operationType, i));
            }
            
            try {
                const results = await Promise.allSettled(promises);
                const endTime = performance.now();
                const totalDuration = endTime - startTime;
                
                const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
                const failed = results.length - successful;
                
                const concurrentResult = {
                    concurrencyLevel: concurrency,
                    totalDuration,
                    averageDurationPerOperation: totalDuration / concurrency,
                    successfulOperations: successful,
                    failedOperations: failed,
                    successRate: (successful / concurrency) * 100,
                    effectiveThroughput: successful / (totalDuration / 1000),
                    timestamp: new Date().toISOString()
                };
                
                this.results.loadBalancingAnalysis.data.push(concurrentResult);
                
                console.log(`    ${concurrency} concurrent: ${successful}/${concurrency} success (${concurrentResult.successRate.toFixed(1)}%), ${concurrentResult.effectiveThroughput.toFixed(2)} ops/sec`);
                
            } catch (error) {
                console.log(`    Failed at concurrency ${concurrency}: ${error.message}`);
            }
            
            // Cool down between concurrency levels
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }

    async executeOperation(operation, operationType, operationId) {
        const start = performance.now();
        try {
            const result = await operation(operationId);
            const end = performance.now();
            return {
                operationType,
                operationId,
                duration: end - start,
                success: true,
                gasUsed: result && result.gasUsed ? result.gasUsed.toNumber() : 0
            };
        } catch (error) {
            const end = performance.now();
            return {
                operationType,
                operationId,
                duration: end - start,
                success: false,
                error: error.message
            };
        }
    }

    generateSystemPerformanceProfile() {
        console.log("\nGenerating system performance profile...");
        
        // Analyze latency vs load patterns
        const latencyData = this.results.operationLatencyVsLoad.data;
        const throughputData = this.results.operationThroughputVsLoad.data;
        const concurrentData = this.results.loadBalancingAnalysis.data;
        
        const profile = {
            latencyCharacteristics: this.analyzeLatencyCharacteristics(latencyData),
            throughputCharacteristics: this.analyzeThroughputCharacteristics(throughputData),
            scalabilityProfile: this.analyzeScalabilityProfile(concurrentData),
            performanceBreakpoints: this.identifyPerformanceBreakpoints(latencyData, throughputData),
            recommendations: this.generatePerformanceRecommendations(latencyData, throughputData, concurrentData)
        };
        
        this.results.systemPerformanceProfile.metrics = profile;
        return profile;
    }

    analyzeLatencyCharacteristics(latencyData) {
        if (latencyData.length === 0) return {};
        
        const latencies = latencyData.map(d => d.metrics.avgLatency);
        const p95Latencies = latencyData.map(d => d.metrics.p95);
        const requestRates = latencyData.map(d => d.requestRate);
        
        return {
            baselineLatency: Math.min(...latencies),
            peakLatency: Math.max(...latencies),
            latencyGrowthRate: this.calculateGrowthRate(requestRates, latencies),
            p95GrowthRate: this.calculateGrowthRate(requestRates, p95Latencies),
            acceptableLoadThreshold: this.findAcceptableThreshold(latencyData, 200), // 200ms threshold
            criticalLoadThreshold: this.findAcceptableThreshold(latencyData, 500) // 500ms threshold
        };
    }

    analyzeThroughputCharacteristics(throughputData) {
        if (throughputData.length === 0) return {};
        
        const actualThroughputs = throughputData.map(d => d.actualThroughput);
        const requestRates = throughputData.map(d => d.requestRate);
        const efficiencies = throughputData.map(d => (d.actualThroughput / d.requestRate) * 100);
        
        return {
            maxThroughput: Math.max(...actualThroughputs),
            throughputEfficiency: efficiencies,
            saturationPoint: this.findSaturationPoint(requestRates, actualThroughputs),
            linearityRange: this.findLinearityRange(requestRates, actualThroughputs),
            degradationPoint: this.findDegradationPoint(efficiencies, requestRates)
        };
    }

    analyzeScalabilityProfile(concurrentData) {
        if (concurrentData.length === 0) return {};
        
        const concurrencies = concurrentData.map(d => d.concurrencyLevel);
        const throughputs = concurrentData.map(d => d.effectiveThroughput);
        const successRates = concurrentData.map(d => d.successRate);
        
        return {
            maxConcurrency: Math.max(...concurrencies),
            peakThroughput: Math.max(...throughputs),
            optimalConcurrency: this.findOptimalConcurrency(concurrentData),
            concurrencyEfficiency: this.calculateConcurrencyEfficiency(concurrentData),
            failureThreshold: this.findFailureThreshold(concurrentData)
        };
    }

    calculateGrowthRate(x, y) {
        if (x.length < 2) return 0;
        // Simple linear regression slope
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
        
        return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    }

    findAcceptableThreshold(data, latencyThreshold) {
        for (const point of data) {
            if (point.metrics.avgLatency > latencyThreshold) {
                return point.requestRate;
            }
        }
        return data[data.length - 1]?.requestRate || 0;
    }

    findSaturationPoint(rates, throughputs) {
        for (let i = 1; i < rates.length; i++) {
            const efficiency = throughputs[i] / rates[i];
            const prevEfficiency = throughputs[i-1] / rates[i-1];
            if (efficiency < prevEfficiency * 0.9) { // 10% efficiency drop
                return rates[i];
            }
        }
        return rates[rates.length - 1] || 0;
    }

    findLinearityRange(rates, throughputs) {
        // Find range where throughput grows linearly with request rate
        for (let i = 1; i < rates.length; i++) {
            const efficiency = throughputs[i] / rates[i];
            if (efficiency < 0.8) { // Less than 80% efficiency
                return { start: rates[0], end: rates[i-1] };
            }
        }
        return { start: rates[0], end: rates[rates.length - 1] };
    }

    findDegradationPoint(efficiencies, rates) {
        for (let i = 1; i < efficiencies.length; i++) {
            if (efficiencies[i] < 70) { // Below 70% efficiency
                return rates[i];
            }
        }
        return rates[rates.length - 1] || 0;
    }

    findOptimalConcurrency(concurrentData) {
        let maxEfficiency = 0;
        let optimalLevel = 1;
        
        concurrentData.forEach(data => {
            const efficiency = data.successRate * (data.effectiveThroughput / data.concurrencyLevel);
            if (efficiency > maxEfficiency) {
                maxEfficiency = efficiency;
                optimalLevel = data.concurrencyLevel;
            }
        });
        
        return optimalLevel;
    }

    calculateConcurrencyEfficiency(concurrentData) {
        return concurrentData.map(data => ({
            concurrency: data.concurrencyLevel,
            efficiency: data.successRate * (data.effectiveThroughput / data.concurrencyLevel)
        }));
    }

    findFailureThreshold(concurrentData) {
        for (const data of concurrentData) {
            if (data.successRate < 95) { // Below 95% success rate
                return data.concurrencyLevel;
            }
        }
        return concurrentData[concurrentData.length - 1]?.concurrencyLevel || 0;
    }

    identifyPerformanceBreakpoints(latencyData, throughputData) {
        return {
            latencyBreakpoints: this.findLatencyBreakpoints(latencyData),
            throughputBreakpoints: this.findThroughputBreakpoints(throughputData),
            criticalPoints: this.identifyCriticalPoints(latencyData, throughputData)
        };
    }

    findLatencyBreakpoints(data) {
        const breakpoints = [];
        for (let i = 1; i < data.length; i++) {
            const latencyIncrease = (data[i].metrics.avgLatency - data[i-1].metrics.avgLatency) / data[i-1].metrics.avgLatency;
            if (latencyIncrease > 0.5) { // 50% latency increase
                breakpoints.push({
                    requestRate: data[i].requestRate,
                    latencyIncrease: latencyIncrease * 100,
                    type: 'latency_spike'
                });
            }
        }
        return breakpoints;
    }

    findThroughputBreakpoints(data) {
        const breakpoints = [];
        for (let i = 1; i < data.length; i++) {
            const efficiency = data[i].actualThroughput / data[i].requestRate;
            const prevEfficiency = data[i-1].actualThroughput / data[i-1].requestRate;
            const efficiencyDrop = (prevEfficiency - efficiency) / prevEfficiency;
            
            if (efficiencyDrop > 0.2) { // 20% efficiency drop
                breakpoints.push({
                    requestRate: data[i].requestRate,
                    efficiencyDrop: efficiencyDrop * 100,
                    type: 'throughput_saturation'
                });
            }
        }
        return breakpoints;
    }

    identifyCriticalPoints(latencyData, throughputData) {
        const critical = [];
        
        // Find where both latency and throughput degrade significantly
        latencyData.forEach(latency => {
            const throughput = throughputData.find(t => t.requestRate === latency.requestRate);
            if (throughput) {
                const efficiency = throughput.actualThroughput / throughput.requestRate;
                if (latency.metrics.avgLatency > 300 && efficiency < 0.7) {
                    critical.push({
                        requestRate: latency.requestRate,
                        avgLatency: latency.metrics.avgLatency,
                        efficiency: efficiency * 100,
                        severity: 'high'
                    });
                }
            }
        });
        
        return critical;
    }

    generatePerformanceRecommendations(latencyData, throughputData, concurrentData) {
        const recommendations = [];
        
        // Latency recommendations
        const avgLatency = latencyData.reduce((sum, d) => sum + d.metrics.avgLatency, 0) / latencyData.length;
        if (avgLatency > 200) {
            recommendations.push({
                type: 'latency_optimization',
                severity: 'medium',
                recommendation: 'Average latency exceeds 200ms. Consider optimizing database queries and reducing network calls.',
                targetImprovement: '50% latency reduction'
            });
        }
        
        // Throughput recommendations
        const maxEfficiency = Math.max(...throughputData.map(d => d.actualThroughput / d.requestRate));
        if (maxEfficiency < 0.8) {
            recommendations.push({
                type: 'throughput_optimization',
                severity: 'high',
                recommendation: 'System efficiency below 80%. Implement connection pooling and optimize resource utilization.',
                targetImprovement: '90%+ efficiency at target loads'
            });
        }
        
        // Concurrency recommendations
        const maxSuccessRate = Math.max(...concurrentData.map(d => d.successRate));
        if (maxSuccessRate < 95) {
            recommendations.push({
                type: 'concurrency_optimization',
                severity: 'high',
                recommendation: 'Concurrent operations failing above acceptable threshold. Implement proper error handling and retry mechanisms.',
                targetImprovement: '99%+ success rate under normal load'
            });
        }
        
        return recommendations;
    }

    generateComprehensiveReport() {
        const profile = this.generateSystemPerformanceProfile();
        
        console.log("\n" + "=".repeat(80));
        console.log("📈 SYSTEM RESPONSIVENESS ANALYSIS REPORT");
        console.log("=".repeat(80));
        
        // Latency characteristics
        if (profile.latencyCharacteristics && Object.keys(profile.latencyCharacteristics).length > 0) {
            console.log("\n🕐 LATENCY CHARACTERISTICS:");
            console.log(`  Baseline Latency: ${profile.latencyCharacteristics.baselineLatency?.toFixed(2)}ms`);
            console.log(`  Peak Latency: ${profile.latencyCharacteristics.peakLatency?.toFixed(2)}ms`);
            console.log(`  Acceptable Load Threshold: ${profile.latencyCharacteristics.acceptableLoadThreshold} req/s`);
            console.log(`  Critical Load Threshold: ${profile.latencyCharacteristics.criticalLoadThreshold} req/s`);
        }
        
        // Throughput characteristics
        if (profile.throughputCharacteristics && Object.keys(profile.throughputCharacteristics).length > 0) {
            console.log("\n⚡ THROUGHPUT CHARACTERISTICS:");
            console.log(`  Max Throughput: ${profile.throughputCharacteristics.maxThroughput?.toFixed(2)} ops/sec`);
            console.log(`  Saturation Point: ${profile.throughputCharacteristics.saturationPoint} req/s`);
            console.log(`  Linear Range: ${profile.throughputCharacteristics.linearityRange?.start}-${profile.throughputCharacteristics.linearityRange?.end} req/s`);
        }
        
        // Scalability profile
        if (profile.scalabilityProfile && Object.keys(profile.scalabilityProfile).length > 0) {
            console.log("\n📊 SCALABILITY PROFILE:");
            console.log(`  Peak Throughput: ${profile.scalabilityProfile.peakThroughput?.toFixed(2)} ops/sec`);
            console.log(`  Optimal Concurrency: ${profile.scalabilityProfile.optimalConcurrency} concurrent operations`);
            console.log(`  Failure Threshold: ${profile.scalabilityProfile.failureThreshold} concurrent operations`);
        }
        
        // Performance breakpoints
        if (profile.performanceBreakpoints) {
            console.log("\n⚠️ PERFORMANCE BREAKPOINTS:");
            profile.performanceBreakpoints.latencyBreakpoints?.forEach(bp => {
                console.log(`  Latency spike at ${bp.requestRate} req/s (+${bp.latencyIncrease.toFixed(1)}%)`);
            });
            profile.performanceBreakpoints.throughputBreakpoints?.forEach(bp => {
                console.log(`  Throughput saturation at ${bp.requestRate} req/s (-${bp.efficiencyDrop.toFixed(1)}%)`);
            });
        }
        
        // Recommendations
        if (profile.recommendations && profile.recommendations.length > 0) {
            console.log("\n🎯 PERFORMANCE RECOMMENDATIONS:");
            profile.recommendations.forEach(rec => {
                console.log(`  [${rec.severity.toUpperCase()}] ${rec.recommendation}`);
                console.log(`    Target: ${rec.targetImprovement}`);
            });
        }
        
        console.log("\n" + "=".repeat(80));
    }
}

async function main() {
    console.log("Starting comprehensive system responsiveness analysis...");
    
    const analyzer = new SystemResponsivenessAnalyzer();
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Deploy contracts
    console.log("Deploying contracts for responsiveness analysis...");
    
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

    // Setup test environment
    const [owner, doctor, nurse, patient] = await ethers.getSigners();
    
    // Setup roles and permissions
    await didManager.connect(doctor).createDID(`did:ethr:${doctor.address}`, []);
    await didManager.connect(patient).createDID(`did:ethr:${patient.address}`, []);
    
    const doctorCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DOCTOR_CREDENTIAL"));
    await dlacManager.connect(owner).assignRole(
        doctor.address, "DOCTOR", doctorCredential, `did:ethr:${doctor.address}`, 365 * 24 * 60 * 60, false
    );
    
    await dlacManager.connect(owner).grantPermission("DOCTOR", "view_data");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "update_data");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "create_record");
    
    await ehrManager.connect(doctor).createPatientRecord(patient.address);

    // Helper function for proofs
    const setupProof = async (user) => {
        const zkProof = ethers.utils.randomBytes(32);
        const proofHash = ethers.utils.keccak256(zkProof);
        await zkpManager.connect(user).submitProof(proofHash);
        return zkProof;
    };

    console.log("System responsiveness analysis environment setup completed.");

    // Test 1: Data Access Latency vs Load
    await analyzer.runLatencyVsLoadAnalysis(
        async (requestId) => {
            const proof = await setupProof(doctor);
            return await ehrManager.connect(doctor).getPatientData(patient.address, "vital-signs", proof);
        },
        "Data Access",
        [1, 2, 4, 6, 8, 10, 12, 15, 18, 20], // Request rates
        8000 // 8 second test duration
    );

    // Test 2: Data Update Throughput vs Load  
    await analyzer.runThroughputVsLoadAnalysis(
        async (requestId) => {
            const proof = await setupProof(doctor);
            return await ehrManager.connect(doctor).updatePatientData(
                patient.address, 
                `responsiveness-test-${requestId}-${Date.now()}`, 
                `Test data for request ${requestId}`, 
                proof
            );
        },
        "Data Update",
        [2, 4, 6, 8, 10, 12, 15, 18], // Request rates
        10000 // 10 second test duration
    );

    // Test 3: ZK Proof Submission Load Analysis
    await analyzer.runLatencyVsLoadAnalysis(
        async (requestId) => {
            const zkProof = ethers.utils.randomBytes(32);
            const proofHash = ethers.utils.keccak256(zkProof);
            return await zkpManager.connect(doctor).submitProof(proofHash);
        },
        "ZK Proof Submission",
        [5, 10, 15, 20, 25, 30, 35, 40], // Higher rates for lightweight operations
        6000 // 6 second test duration
    );

    // Test 4: Concurrent Operations Analysis
    const operations = [
        async (id) => {
            const proof = await setupProof(doctor);
            return await ehrManager.connect(doctor).getPatientData(patient.address, "vital-signs", proof);
        },
        async (id) => {
            const proof = await setupProof(doctor);
            return await ehrManager.connect(doctor).updatePatientData(
                patient.address, 
                `concurrent-${id}-${Date.now()}`, 
                `Concurrent test ${id}`, 
                proof
            );
        },
        async (id) => {
            const zkProof = ethers.utils.randomBytes(32);
            const proofHash = ethers.utils.keccak256(zkProof);
            return await zkpManager.connect(doctor).submitProof(proofHash);
        }
    ];

    await analyzer.runConcurrentLoadAnalysis(operations, 16, 2); // Up to 16 concurrent operations

    // Generate comprehensive analysis
    analyzer.generateComprehensiveReport();

    // Save results
    const filename = `system-responsiveness-analysis-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(resultsDir, filename),
        JSON.stringify(analyzer.results, null, 2)
    );

    console.log(`\n💾 System responsiveness analysis saved to: ${filename}`);
    console.log("System responsiveness analysis completed!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });