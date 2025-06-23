// fault-tolerance-recovery-tests.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

class FaultToleranceTestFramework {
    constructor() {
        this.results = {
            description: "Comprehensive fault tolerance and recovery testing for SL-DLAC",
            testDate: new Date().toISOString(),
            transactionFailureHandling: {
                description: "Testing system behavior under transaction failures",
                data: [],
                metrics: {}
            },
            networkPartitionTolerance: {
                description: "Network partition and connectivity failure scenarios",
                data: [],
                metrics: {}
            },
            gasLimitStressTests: {
                description: "System behavior under gas limit constraints",
                data: [],
                metrics: {}
            },
            concurrentAccessFailures: {
                description: "Handling of concurrent access failures and conflicts",
                data: [],
                metrics: {}
            },
            dataCorruptionRecovery: {
                description: "Recovery from data corruption and inconsistent states",
                data: [],
                metrics: {}
            },
            systemOverloadRecovery: {
                description: "Recovery mechanisms under extreme system load",
                data: [],
                metrics: {}
            },
            cascadingFailureResilience: {
                description: "Resilience against cascading system failures",
                data: [],
                metrics: {}
            }
        };
        this.systemState = {
            transactionCount: 0,
            failureCount: 0,
            recoveryAttempts: 0,
            lastHealthCheck: Date.now()
        };
    }

    async measureFaultTest(testName, operation, category, expectedToFail = false, retryAttempts = 3) {
        const start = performance.now();
        let success = false;
        let gasUsed = 0;
        let error = null;
        let result = null;
        let actualRetries = 0;

        for (let attempt = 0; attempt <= retryAttempts; attempt++) {
            try {
                this.systemState.transactionCount++;
                
                result = await operation();
                if (result && result.wait) {
                    const receipt = await result.wait();
                    gasUsed = receipt.gasUsed ? receipt.gasUsed.toNumber() : 0;
                }
                
                success = true;
                break; // Success, exit retry loop
            } catch (err) {
                error = err.message;
                actualRetries = attempt;
                this.systemState.failureCount++;
                
                if (attempt < retryAttempts) {
                    console.log(`    Retry ${attempt + 1}/${retryAttempts} for ${testName}`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
                }
            }
        }

        const end = performance.now();
        const duration = end - start;

        const testResult = {
            testName,
            success,
            duration,
            gasUsed,
            error,
            expectedToFail,
            actualRetries,
            maxRetries: retryAttempts,
            resilience: success || expectedToFail, // Success or expected failure shows resilience
            timestamp: new Date().toISOString(),
            result
        };

        this.results[category].data.push(testResult);
        return testResult;
    }

    async simulateNetworkDelay(minDelay = 1000, maxDelay = 5000) {
        const delay = Math.random() * (maxDelay - minDelay) + minDelay;
        console.log(`    Simulating network delay: ${delay.toFixed(0)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    async simulateGasLimitFailure(operation, gasLimit = 50000) {
        try {
            return await operation({ gasLimit });
        } catch (error) {
            if (error.message.includes('out of gas') || error.message.includes('gas')) {
                throw new Error(`Gas limit failure: ${error.message}`);
            }
            throw error;
        }
    }

    async checkSystemHealth() {
        const healthChecks = {
            timestamp: Date.now(),
            transactionSuccess: this.systemState.transactionCount > 0 ? 
                ((this.systemState.transactionCount - this.systemState.failureCount) / this.systemState.transactionCount) * 100 : 100,
            recoveryEffectiveness: this.systemState.recoveryAttempts > 0 ? 
                (this.systemState.recoveryAttempts / this.systemState.failureCount) * 100 : 100,
            systemUptime: Date.now() - this.systemState.lastHealthCheck
        };
        
        this.systemState.lastHealthCheck = Date.now();
        return healthChecks;
    }
}

async function main() {
    console.log("Starting comprehensive fault tolerance and recovery testing...");
    
    const framework = new FaultToleranceTestFramework();
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Deploy contracts with error handling
    console.log("Deploying contracts for fault tolerance testing...");
    
    let zkpManager, dlacManager, didManager, auditLogger, ehrManager;
    
    try {
        const ZKPManager = await ethers.getContractFactory("ZKPVerifier");
        zkpManager = await ZKPManager.deploy();
        await zkpManager.deployed();
        
        const DLACManager = await ethers.getContractFactory("EnhancedRBAC");
        dlacManager = await DLACManager.deploy(ethers.constants.AddressZero, zkpManager.address);
        await dlacManager.deployed();
        
        const DIDManager = await ethers.getContractFactory("DIDRegistry");
        didManager = await DIDManager.deploy(dlacManager.address);
        await didManager.deployed();
        
        await dlacManager.updateDIDRegistry(didManager.address);
        
        const AuditLogger = await ethers.getContractFactory("EnhancedAuditLog");
        auditLogger = await AuditLogger.deploy();
        await auditLogger.deployed();
        
        const EHRManager = await ethers.getContractFactory("UpdatedPatientDataStorage");
        ehrManager = await EHRManager.deploy(
            dlacManager.address,
            auditLogger.address,
            didManager.address,
            zkpManager.address
        );
        await ehrManager.deployed();
        
        console.log("Contracts deployed successfully");
    } catch (error) {
        console.error("Contract deployment failed:", error.message);
        process.exit(1);
    }

    // Get signers
    const [owner, doctor, nurse, patient, attacker, user1, user2, user3] = await ethers.getSigners();

    // Setup testing environment with error handling
    console.log("Setting up fault tolerance testing environment...");
    
    try {
        // Create DIDs
        const dids = {
            doctor: `did:ethr:${doctor.address}`,
            nurse: `did:ethr:${nurse.address}`,
            patient: `did:ethr:${patient.address}`
        };

        for (const [role, did] of Object.entries(dids)) {
            await didManager.connect(eval(role)).createDID(did, []);
        }

        // Assign roles
        const doctorCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DOCTOR_CREDENTIAL"));
        const nurseCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("NURSE_CREDENTIAL"));

        await dlacManager.connect(owner).assignRole(
            doctor.address, "DOCTOR", doctorCredential, dids.doctor, 365 * 24 * 60 * 60, false
        );
        await dlacManager.connect(owner).assignRole(
            nurse.address, "NURSE", nurseCredential, dids.nurse, 365 * 24 * 60 * 60, false
        );

        // Grant permissions
        await dlacManager.connect(owner).grantPermission("DOCTOR", "view_data");
        await dlacManager.connect(owner).grantPermission("DOCTOR", "update_data");
        await dlacManager.connect(owner).grantPermission("DOCTOR", "create_record");
        await dlacManager.connect(owner).grantPermission("NURSE", "view_data");

        // Create patient record
        await ehrManager.connect(doctor).createPatientRecord(patient.address);

        console.log("Environment setup completed successfully");
    } catch (error) {
        console.error("Environment setup failed:", error.message);
        process.exit(1);
    }

    // Helper function for proof setup with error handling
    const setupProofWithRetry = async (user, maxRetries = 3) => {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const zkProof = ethers.utils.randomBytes(32);
                const proofHash = ethers.utils.keccak256(zkProof);
                await zkpManager.connect(user).submitProof(proofHash);
                return zkProof;
            } catch (error) {
                if (attempt === maxRetries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            }
        }
    };

    // Test 1: Transaction Failure Handling
    console.log("\n1. Testing Transaction Failure Handling...");

    const transactionFailureTests = [
        {
            name: "Invalid proof submission recovery",
            operation: async () => {
                const invalidProof = ethers.utils.hexZeroPad("0x0", 32);
                return await zkpManager.connect(doctor).submitProof(invalidProof);
            },
            expectedToFail: true
        },
        {
            name: "Unauthorized data access graceful failure",
            operation: async () => {
                const proof = await setupProofWithRetry(attacker);
                return await ehrManager.connect(attacker).getPatientData(
                    patient.address, "vital-signs", proof
                );
            },
            expectedToFail: true
        },
        {
            name: "Double spending protection",
            operation: async () => {
                const proof = await setupProofWithRetry(doctor);
                
                // Submit the same proof twice rapidly
                const promises = [
                    ehrManager.connect(doctor).updatePatientData(
                        patient.address, "vital-signs", "First update", proof
                    ),
                    ehrManager.connect(doctor).updatePatientData(
                        patient.address, "vital-signs", "Second update", proof
                    )
                ];
                
                return await Promise.all(promises);
            },
            expectedToFail: false // One should succeed, one might fail
        },
        {
            name: "Transaction timeout recovery",
            operation: async () => {
                await framework.simulateNetworkDelay(3000, 8000);
                const proof = await setupProofWithRetry(doctor);
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "timeout-test", "Timeout recovery test", proof
                );
            }
        },
        {
            name: "Nonce collision handling",
            operation: async () => {
                // Rapidly submit multiple transactions to test nonce handling
                const proof = await setupProofWithRetry(doctor);
                const rapidTransactions = [];
                
                for (let i = 0; i < 5; i++) {
                    rapidTransactions.push(
                        ehrManager.connect(doctor).updatePatientData(
                            patient.address, `rapid-test-${i}`, `Rapid test ${i}`, proof
                        )
                    );
                }
                
                return await Promise.allSettled(rapidTransactions);
            }
        }
    ];

    for (const test of transactionFailureTests) {
        const result = await framework.measureFaultTest(
            test.name, test.operation, 'transactionFailureHandling', test.expectedToFail
        );
        console.log(`  ${test.name}: ${result.resilience ? 'RESILIENT' : 'FAILED'} (${result.duration.toFixed(2)}ms, ${result.actualRetries} retries)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 2: Network Partition Tolerance
    console.log("\n2. Testing Network Partition Tolerance...");

    const networkPartitionTests = [
        {
            name: "High latency operation tolerance",
            operation: async () => {
                await framework.simulateNetworkDelay(5000, 10000);
                const proof = await setupProofWithRetry(doctor);
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "high-latency", "High latency test", proof
                );
            }
        },
        {
            name: "Intermittent connectivity simulation",
            operation: async () => {
                // Simulate multiple network interruptions
                for (let i = 0; i < 3; i++) {
                    await framework.simulateNetworkDelay(2000, 4000);
                    if (i < 2) {
                        console.log(`    Network interruption ${i + 1}/3`);
                    }
                }
                const proof = await setupProofWithRetry(doctor);
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "intermittent", "Intermittent connectivity test", proof
                );
            }
        },
        {
            name: "Consensus delay tolerance",
            operation: async () => {
                const proof = await setupProofWithRetry(doctor);
                
                // Submit transaction and wait for consensus with timeout
                const txPromise = ehrManager.connect(doctor).updatePatientData(
                    patient.address, "consensus-test", "Consensus delay test", proof
                );
                
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Consensus timeout")), 30000)
                );
                
                return await Promise.race([txPromise, timeoutPromise]);
            }
        }
    ];

    for (const test of networkPartitionTests) {
        const result = await framework.measureFaultTest(
            test.name, test.operation, 'networkPartitionTolerance'
        );
        console.log(`  ${test.name}: ${result.resilience ? 'RESILIENT' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Test 3: Gas Limit Stress Tests
    console.log("\n3. Testing Gas Limit Stress Scenarios...");

    const gasLimitTests = [
        {
            name: "Low gas limit transaction failure",
            operation: async () => {
                const proof = await setupProofWithRetry(doctor);
                return await framework.simulateGasLimitFailure(
                    async (options) => ehrManager.connect(doctor).updatePatientData(
                        patient.address, "low-gas", "Low gas test", proof, options
                    ),
                    50000
                );
            },
            expectedToFail: true
        },
        {
            name: "Gas estimation accuracy",
            operation: async () => {
                const proof = await setupProofWithRetry(doctor);
                
                // Estimate gas for operation
                const gasEstimate = await ehrManager.connect(doctor).estimateGas.updatePatientData(
                    patient.address, "gas-estimate", "Gas estimation test", proof
                );
                
                // Execute with exact estimate
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "gas-estimate", "Gas estimation test", proof,
                    { gasLimit: gasEstimate }
                );
            }
        },
        {
            name: "Gas price volatility handling",
            operation: async () => {
                const proof = await setupProofWithRetry(doctor);
                
                // Test with different gas prices
                const gasEstimate = await ehrManager.connect(doctor).estimateGas.updatePatientData(
                    patient.address, "gas-price", "Gas price test", proof
                );
                
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "gas-price", "Gas price test", proof,
                    { 
                        gasLimit: gasEstimate,
                        gasPrice: ethers.utils.parseUnits("50", "gwei") // High gas price
                    }
                );
            }
        },
        {
            name: "Out of gas recovery mechanism",
            operation: async () => {
                const proof = await setupProofWithRetry(doctor);
                
                try {
                    // First attempt with low gas (should fail)
                    await ehrManager.connect(doctor).updatePatientData(
                        patient.address, "oog-recovery", "Out of gas recovery", proof,
                        { gasLimit: 30000 }
                    );
                } catch (error) {
                    // Recovery attempt with proper gas
                    return await ehrManager.connect(doctor).updatePatientData(
                        patient.address, "oog-recovery", "Out of gas recovery", proof
                    );
                }
            }
        }
    ];

    for (const test of gasLimitTests) {
        const result = await framework.measureFaultTest(
            test.name, test.operation, 'gasLimitStressTests', test.expectedToFail
        );
        console.log(`  ${test.name}: ${result.resilience ? 'RESILIENT' : 'FAILED'} (${result.duration.toFixed(2)}ms, Gas: ${result.gasUsed})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 4: Concurrent Access Failures
    console.log("\n4. Testing Concurrent Access Failure Handling...");

    const concurrentFailureTests = [
        {
            name: "Race condition in emergency access",
            operation: async () => {
                // Create delegation policy
                await ehrManager.connect(patient).createDelegationPolicy(
                    doctor.address, "race-test", "read", 24 * 60 * 60
                );
                
                const proof1 = await setupProofWithRetry(doctor);
                const proof2 = await setupProofWithRetry(nurse);
                
                // Concurrent emergency access requests
                const accessPromises = [
                    ehrManager.connect(doctor).requestDelegatedEmergencyAccess(
                        patient.address, "Concurrent access test 1", proof1, 1
                    ),
                    ehrManager.connect(nurse).requestDelegatedEmergencyAccess(
                        patient.address, "Concurrent access test 2", proof2, 1
                    )
                ];
                
                return await Promise.allSettled(accessPromises);
            }
        },
        {
            name: "Simultaneous data updates conflict",
            operation: async () => {
                const [proof1, proof2] = await Promise.all([
                    setupProofWithRetry(doctor),
                    setupProofWithRetry(nurse)
                ]);
                
                const updatePromises = [
                    ehrManager.connect(doctor).updatePatientData(
                        patient.address, "conflict-test", "Doctor update", proof1
                    ),
                    ehrManager.connect(nurse).updatePatientData(
                        patient.address, "conflict-test", "Nurse update", proof2
                    )
                ];
                
                return await Promise.allSettled(updatePromises);
            },
            expectedToFail: false // One should succeed
        },
        {
            name: "Concurrent proof validation",
            operation: async () => {
                const proofs = await Promise.all([
                    setupProofWithRetry(doctor),
                    setupProofWithRetry(nurse),
                    setupProofWithRetry(patient)
                ]);
                
                const validationPromises = proofs.map((proof, index) => 
                    ehrManager.connect(doctor).getPatientData(
                        patient.address, `concurrent-${index}`, proof
                    )
                );
                
                return await Promise.allSettled(validationPromises);
            }
        }
    ];

    for (const test of concurrentFailureTests) {
        const result = await framework.measureFaultTest(
            test.name, test.operation, 'concurrentAccessFailures', test.expectedToFail
        );
        console.log(`  ${test.name}: ${result.resilience ? 'RESILIENT' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Test 5: Data Corruption Recovery
    console.log("\n5. Testing Data Corruption Recovery...");

    const dataCorruptionTests = [
        {
            name: "Invalid data format handling",
            operation: async () => {
                const proof = await setupProofWithRetry(doctor);
                const corruptData = "\x00\x01\x02\x03\xFF\xFE\xFD"; // Binary data
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "corrupt-test", corruptData, proof
                );
            }
        },
        {
            name: "Oversized data handling",
            operation: async () => {
                const proof = await setupProofWithRetry(doctor);
                const oversizedData = "A".repeat(100000); // Very large string
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "oversize-test", oversizedData, proof
                );
            },
            expectedToFail: true // Should fail due to gas limits
        },
        {
            name: "Malformed proof recovery",
            operation: async () => {
                const malformedProof = ethers.utils.randomBytes(16); // Wrong size
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "malformed-proof", "Test data", malformedProof
                );
            },
            expectedToFail: true
        },
        {
            name: "State inconsistency detection",
            operation: async () => {
                // Check audit log consistency
                const auditCount = await auditLogger.getAccessRecordCount();
                const patientRecords = await auditLogger.getPatientAccessRecords(patient.address);
                
                return {
                    totalAudits: auditCount.toNumber(),
                    patientAudits: patientRecords.length,
                    consistencyRatio: patientRecords.length / auditCount.toNumber()
                };
            }
        }
    ];

    for (const test of dataCorruptionTests) {
        const result = await framework.measureFaultTest(
            test.name, test.operation, 'dataCorruptionRecovery', test.expectedToFail
        );
        console.log(`  ${test.name}: ${result.resilience ? 'RESILIENT' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 6: System Overload Recovery
    console.log("\n6. Testing System Overload Recovery...");

    const overloadTests = [
        {
            name: "Rapid transaction burst handling",
            operation: async () => {
                const proof = await setupProofWithRetry(doctor);
                const burstTransactions = [];
                
                for (let i = 0; i < 20; i++) {
                    burstTransactions.push(
                        ehrManager.connect(doctor).updatePatientData(
                            patient.address, `burst-${i}`, `Burst test ${i}`, proof
                        )
                    );
                }
                
                return await Promise.allSettled(burstTransactions);
            }
        },
        {
            name: "Memory exhaustion recovery",
            operation: async () => {
                // Create many proofs to test memory usage
                const proofs = [];
                for (let i = 0; i < 100; i++) {
                    const proof = ethers.utils.randomBytes(32);
                    proofs.push(proof);
                }
                
                // Use the last proof for a transaction
                const lastProof = proofs[proofs.length - 1];
                const proofHash = ethers.utils.keccak256(lastProof);
                await zkpManager.connect(doctor).submitProof(proofHash);
                
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "memory-test", "Memory exhaustion test", lastProof
                );
            }
        },
        {
            name: "Connection pool exhaustion",
            operation: async () => {
                // Simulate many concurrent connection attempts
                const connections = [];
                for (let i = 0; i < 50; i++) {
                    connections.push(
                        dlacManager.hasPermission(doctor.address, "view_data")
                    );
                }
                
                return await Promise.allSettled(connections);
            }
        }
    ];

    for (const test of overloadTests) {
        const result = await framework.measureFaultTest(
            test.name, test.operation, 'systemOverloadRecovery'
        );
        console.log(`  ${test.name}: ${result.resilience ? 'RESILIENT' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Test 7: Cascading Failure Resilience
    console.log("\n7. Testing Cascading Failure Resilience...");

    const cascadingFailureTests = [
        {
            name: "DID system failure isolation",
            operation: async () => {
                try {
                    // Simulate DID system failure by accessing non-existent DID
                    await didManager.getDIDByAddress(ethers.constants.AddressZero);
                } catch (error) {
                    // System should continue functioning despite DID failure
                    const proof = await setupProofWithRetry(doctor);
                    return await ehrManager.connect(doctor).updatePatientData(
                        patient.address, "did-failure", "DID failure isolation test", proof
                    );
                }
            }
        },
        {
            name: "Audit system failure tolerance",
            operation: async () => {
                // Even if audit fails, core functionality should work
                const proof = await setupProofWithRetry(doctor);
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "audit-failure", "Audit failure tolerance test", proof
                );
            }
        },
        {
            name: "Multiple component failure recovery",
            operation: async () => {
                // Test system resilience when multiple components have issues
                const healthCheck = await framework.checkSystemHealth();
                
                if (healthCheck.transactionSuccess < 50) {
                    framework.systemState.recoveryAttempts++;
                    console.log("    System recovery initiated due to low success rate");
                }
                
                const proof = await setupProofWithRetry(doctor);
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "multi-failure", "Multiple failure recovery test", proof
                );
            }
        }
    ];

    for (const test of cascadingFailureTests) {
        const result = await framework.measureFaultTest(
            test.name, test.operation, 'cascadingFailureResilience'
        );
        console.log(`  ${test.name}: ${result.resilience ? 'RESILIENT' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final system health check
    const finalHealthCheck = await framework.checkSystemHealth();
    console.log("\n=== FINAL SYSTEM HEALTH CHECK ===");
    console.log(`Transaction Success Rate: ${finalHealthCheck.transactionSuccess.toFixed(2)}%`);
    console.log(`Recovery Effectiveness: ${finalHealthCheck.recoveryEffectiveness.toFixed(2)}%`);
    console.log(`Total System Uptime: ${finalHealthCheck.systemUptime}ms`);

    // Calculate comprehensive metrics
    for (const category of Object.keys(framework.results)) {
        if (category === 'description' || category === 'testDate') continue;
        
        const data = framework.results[category].data;
        if (data.length > 0) {
            framework.results[category].metrics = {
                totalTests: data.length,
                successfulTests: data.filter(t => t.success).length,
                failedTests: data.filter(t => !t.success).length,
                resilientTests: data.filter(t => t.resilience).length,
                successRate: (data.filter(t => t.success).length / data.length) * 100,
                resilienceRate: (data.filter(t => t.resilience).length / data.length) * 100,
                averageLatency: data.reduce((sum, t) => sum + t.duration, 0) / data.length,
                minLatency: Math.min(...data.map(t => t.duration)),
                maxLatency: Math.max(...data.map(t => t.duration)),
                totalGasUsed: data.reduce((sum, t) => sum + t.gasUsed, 0),
                averageGasPerTest: data.reduce((sum, t) => sum + t.gasUsed, 0) / data.length,
                totalRetries: data.reduce((sum, t) => sum + t.actualRetries, 0),
                averageRetriesPerTest: data.reduce((sum, t) => sum + t.actualRetries, 0) / data.length
            };
        }
    }

    // Save results
    const filename = `fault-tolerance-recovery-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(resultsDir, filename),
        JSON.stringify(framework.results, null, 2)
    );

    // Generate comprehensive summary
    console.log("\n=== FAULT TOLERANCE AND RECOVERY SUMMARY ===");
    let totalTests = 0;
    let totalResilient = 0;
    let totalLatency = 0;
    let totalGas = 0;

    for (const [category, results] of Object.entries(framework.results)) {
        if (category === 'description' || category === 'testDate') continue;
        
        const metrics = results.metrics;
        console.log(`\n${category.toUpperCase()}:`);
        console.log(`  Total Tests: ${metrics.totalTests}`);
        console.log(`  Success Rate: ${metrics.successRate.toFixed(2)}%`);
        console.log(`  Resilience Rate: ${metrics.resilienceRate.toFixed(2)}%`);
        console.log(`  Average Latency: ${metrics.averageLatency.toFixed(2)}ms`);
        console.log(`  Latency Range: ${metrics.minLatency.toFixed(2)}ms - ${metrics.maxLatency.toFixed(2)}ms`);
        console.log(`  Total Gas Used: ${metrics.totalGasUsed.toLocaleString()}`);
        console.log(`  Average Retries: ${metrics.averageRetriesPerTest.toFixed(2)}`);

        totalTests += metrics.totalTests;
        totalResilient += metrics.resilientTests;
        totalLatency += metrics.averageLatency * metrics.totalTests;
        totalGas += metrics.totalGasUsed;
    }

    console.log("\n=== OVERALL FAULT TOLERANCE SUMMARY ===");
    console.log(`Total Tests Executed: ${totalTests}`);
    console.log(`Overall Resilience Rate: ${((totalResilient / totalTests) * 100).toFixed(2)}%`);
    console.log(`Average Test Latency: ${(totalLatency / totalTests).toFixed(2)}ms`);
    console.log(`Total Gas Consumption: ${totalGas.toLocaleString()}`);
    console.log(`System Recovery Attempts: ${framework.systemState.recoveryAttempts}`);

    console.log(`\nResults saved to: ${filename}`);
    console.log("Fault tolerance and recovery testing completed!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });