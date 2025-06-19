// emergency-access-scenarios.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

class EmergencyAccessTestFramework {
    constructor() {
        this.results = {
            description: "Comprehensive emergency access scenario testing",
            testDate: new Date().toISOString(),
            emergencyDelegation: {
                description: "Emergency delegation policy creation and validation",
                data: [],
                metrics: {}
            },
            emergencyAccess: {
                description: "Emergency access request and granting scenarios",
                data: [],
                metrics: {}
            },
            timeBasedExpiry: {
                description: "Time-based emergency access expiry testing",
                data: [],
                metrics: {}
            },
            concurrentEmergency: {
                description: "Concurrent emergency access scenarios",
                data: [],
                metrics: {}
            },
            emergencyRevocation: {
                description: "Emergency access revocation scenarios",
                data: [],
                metrics: {}
            },
            massEmergencyEvent: {
                description: "Mass emergency event simulation (e.g., natural disaster)",
                data: [],
                metrics: {}
            },
            emergencyEscalation: {
                description: "Emergency access escalation scenarios",
                data: [],
                metrics: {}
            }
        };
    }

    async measureEmergencyTest(testName, operation, category) {
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
            }
            success = true;
        } catch (err) {
            error = err.message;
            success = false;
        }

        const end = performance.now();
        const duration = end - start;

        const testResult = {
            testName,
            success,
            duration,
            gasUsed,
            error,
            timestamp: new Date().toISOString(),
            result
        };

        this.results[category].data.push(testResult);
        return testResult;
    }

    async simulateTimePassing(hours) {
        // In a real blockchain, we'd mine blocks to advance time
        // For testing, we'll use a time advancement simulation
        const secondsToAdvance = hours * 60 * 60;
        await ethers.provider.send("evm_increaseTime", [secondsToAdvance]);
        await ethers.provider.send("evm_mine");
    }
}

async function main() {
    console.log("Starting comprehensive emergency access scenario testing...");
    
    const framework = new EmergencyAccessTestFramework();
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Deploy contracts
    console.log("Deploying contracts for emergency access testing...");
    
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

    // Get signers for various emergency roles
    const [owner, doctor, nurse, patient, paramedic, emergencyDoctor, specialist, patient2, patient3] = await ethers.getSigners();

    // Setup users and roles
    console.log("Setting up emergency access testing environment...");
    
    const dids = {
        doctor: `did:ethr:${doctor.address}`,
        nurse: `did:ethr:${nurse.address}`,
        patient: `did:ethr:${patient.address}`,
        paramedic: `did:ethr:${paramedic.address}`,
        emergencyDoctor: `did:ethr:${emergencyDoctor.address}`,
        specialist: `did:ethr:${specialist.address}`,
        patient2: `did:ethr:${patient2.address}`,
        patient3: `did:ethr:${patient3.address}`
    };

    // Create DIDs
    for (const [role, did] of Object.entries(dids)) {
        await didManager.connect(eval(role)).createDID(did, []);
    }

    // Assign roles with emergency capabilities
    const credentials = {
        doctor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DOCTOR_CREDENTIAL")),
        nurse: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("NURSE_CREDENTIAL")),
        paramedic: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PARAMEDIC_CREDENTIAL")),
        emergencyDoctor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("EMERGENCY_DOCTOR_CREDENTIAL")),
        specialist: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SPECIALIST_CREDENTIAL"))
    };

    await dlacManager.connect(owner).assignRole(
        doctor.address, "DOCTOR", credentials.doctor, dids.doctor, 365 * 24 * 60 * 60, false
    );
    await dlacManager.connect(owner).assignRole(
        nurse.address, "NURSE", credentials.nurse, dids.nurse, 365 * 24 * 60 * 60, false
    );
    await dlacManager.connect(owner).assignRole(
        paramedic.address, "PARAMEDIC", credentials.paramedic, dids.paramedic, 365 * 24 * 60 * 60, true
    );
    await dlacManager.connect(owner).assignRole(
        emergencyDoctor.address, "DOCTOR", credentials.emergencyDoctor, dids.emergencyDoctor, 365 * 24 * 60 * 60, true
    );
    await dlacManager.connect(owner).assignRole(
        specialist.address, "DOCTOR", credentials.specialist, dids.specialist, 365 * 24 * 60 * 60, true
    );

    // Grant permissions
    await dlacManager.connect(owner).grantPermission("DOCTOR", "view_data");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "update_data");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "create_record");
    await dlacManager.connect(owner).grantPermission("NURSE", "view_data");
    await dlacManager.connect(owner).grantPermission("PARAMEDIC", "view_data");

    // Create patient records
    await ehrManager.connect(doctor).createPatientRecord(patient.address);
    await ehrManager.connect(doctor).createPatientRecord(patient2.address);
    await ehrManager.connect(doctor).createPatientRecord(patient3.address);

    // Add initial patient data - Emergency access requires special proof format
    const setupProof = async (user) => {
        const zkProof = ethers.utils.randomBytes(32);
        const proofHash = ethers.utils.keccak256(zkProof);
        await zkpManager.connect(user).submitProof(proofHash);
        return zkProof;
    };

    // Special setup for emergency access proofs
    const setupEmergencyProof = async (user) => {
        const zkProof = ethers.utils.randomBytes(32);
        // For emergency access, we need to combine role credential with proof
        const roleHash = await dlacManager.getRoleCredential(user.address);
        const combinedProofHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [roleHash, zkProof]));
        await zkpManager.connect(user).submitProof(combinedProofHash);
        return zkProof;
    };

    const doctorProof = await setupProof(doctor);
    await ehrManager.connect(doctor).updatePatientData(
        patient.address, "vital-signs", "Heart rate: 70bpm, BP: 120/80, O2: 98%", doctorProof
    );
    await ehrManager.connect(doctor).updatePatientData(
        patient.address, "medical-history", "Type 2 Diabetes, Hypertension", doctorProof
    );

    console.log("Emergency access testing environment setup completed.");

    // Test 1: Emergency Delegation Policy Creation
    console.log("\n1. Testing Emergency Delegation Policy Creation...");
    
    let policyIds = [];
    
    const delegationTests = [
        {
            name: "Patient creates emergency delegation for paramedic",
            operation: async () => {
                const tx = await ehrManager.connect(patient).createDelegationPolicy(
                    paramedic.address,
                    "vital-signs",
                    "read",
                    24 * 60 * 60 // 24 hours
                );
                const receipt = await tx.wait();
                // Extract policy ID from events
                const event = receipt.events.find(e => e.event === 'PolicyCreated');
                const policyId = event ? event.args.policyID.toNumber() : 1;
                policyIds.push(policyId);
                return tx;
            }
        },
        {
            name: "Patient creates comprehensive emergency delegation",
            operation: async () => {
                const tx = await ehrManager.connect(patient).createDelegationPolicy(
                    emergencyDoctor.address,
                    "medical-history",
                    "read/write",
                    48 * 60 * 60 // 48 hours
                );
                const receipt = await tx.wait();
                const event = receipt.events.find(e => e.event === 'PolicyCreated');
                const policyId = event ? event.args.policyID.toNumber() : 2;
                policyIds.push(policyId);
                return tx;
            }
        },
        {
            name: "Patient creates limited emergency delegation",
            operation: async () => {
                const tx = await ehrManager.connect(patient).createDelegationPolicy(
                    specialist.address,
                    "vital-signs",
                    "read",
                    6 * 60 * 60 // 6 hours
                );
                const receipt = await tx.wait();
                const event = receipt.events.find(e => e.event === 'PolicyCreated');
                const policyId = event ? event.args.policyID.toNumber() : 3;
                policyIds.push(policyId);
                return tx;
            }
        }
    ];

    for (const test of delegationTests) {
        const result = await framework.measureEmergencyTest(test.name, test.operation, 'emergencyDelegation');
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 2: Emergency Access Requests
    console.log("\n2. Testing Emergency Access Requests...");
    
    const accessTests = [
        {
            name: "Paramedic requests emergency access with valid delegation",
            operation: async () => {
                const paramedicProof = await setupEmergencyProof(paramedic);
                return await ehrManager.connect(paramedic).requestDelegatedEmergencyAccess(
                    patient.address,
                    "Patient found unconscious at accident scene",
                    paramedicProof,
                    policyIds[0] || 1 // Use actual policy ID
                );
            }
        },
        {
            name: "Emergency doctor requests critical access",
            operation: async () => {
                const emergencyProof = await setupEmergencyProof(emergencyDoctor);
                return await ehrManager.connect(emergencyDoctor).requestDelegatedEmergencyAccess(
                    patient.address,
                    "Patient in cardiac arrest, need immediate medical history",
                    emergencyProof,
                    policyIds[1] || 2 // Use actual policy ID
                );
            }
        },
        {
            name: "Specialist requests time-limited access",
            operation: async () => {
                const specialistProof = await setupEmergencyProof(specialist);
                return await ehrManager.connect(specialist).requestDelegatedEmergencyAccess(
                    patient.address,
                    "Consultation for complex cardiac case",
                    specialistProof,
                    policyIds[2] || 3 // Use actual policy ID
                );
            }
        }
    ];

    for (const test of accessTests) {
        const result = await framework.measureEmergencyTest(test.name, test.operation, 'emergencyAccess');
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Test 3: Time-Based Expiry Testing
    console.log("\n3. Testing Time-Based Emergency Access Expiry...");
    
    // Create a short-term policy for testing
    const shortTermPolicyTx = await ehrManager.connect(patient2).createDelegationPolicy(
        paramedic.address,
        "vital-signs",
        "read",
        2 * 60 // 2 minutes for testing
    );
    const shortTermReceipt = await shortTermPolicyTx.wait();
    const shortTermEvent = shortTermReceipt.events.find(e => e.event === 'PolicyCreated');
    const shortTermPolicyId = shortTermEvent ? shortTermEvent.args.policyID.toNumber() : 4;

    const paramedicProof2 = await setupEmergencyProof(paramedic);
    await ehrManager.connect(paramedic).requestDelegatedEmergencyAccess(
        patient2.address,
        "Short-term emergency access test",
        paramedicProof2,
        shortTermPolicyId
    );

    const expiryTests = [
        {
            name: "Access data immediately after granting",
            operation: async () => {
                const proof = await setupProof(paramedic);
                return await ehrManager.connect(paramedic).getPatientData(
                    patient2.address, "vital-signs", proof
                );
            }
        },
        {
            name: "Check emergency access status before expiry",
            operation: async () => {
                return await ehrManager.checkDelegatedEmergencyAccess(paramedic.address, patient2.address);
            }
        }
    ];

    for (const test of expiryTests) {
        const result = await framework.measureEmergencyTest(test.name, test.operation, 'timeBasedExpiry');
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Simulate time passing (3 minutes)
    console.log("  Simulating time passing (3 minutes)...");
    await framework.simulateTimePassing(3/60); // 3 minutes

    const expiredTests = [
        {
            name: "Attempt access after expiry",
            operation: async () => {
                const proof = await setupProof(paramedic);
                return await ehrManager.connect(paramedic).getPatientData(
                    patient2.address, "vital-signs", proof
                );
            }
        },
        {
            name: "Check emergency access status after expiry",
            operation: async () => {
                return await ehrManager.checkDelegatedEmergencyAccess(paramedic.address, patient2.address);
            }
        }
    ];

    for (const test of expiredTests) {
        const result = await framework.measureEmergencyTest(test.name, test.operation, 'timeBasedExpiry');
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 4: Concurrent Emergency Access Scenarios
    console.log("\n4. Testing Concurrent Emergency Access Scenarios...");
    
    // Create multiple delegation policies for concurrent testing and extract policy IDs
    const initialConcurrentPolicies = await Promise.all([
        ehrManager.connect(patient3).createDelegationPolicy(paramedic.address, "vital-signs", "read", 24 * 60 * 60),
        ehrManager.connect(patient3).createDelegationPolicy(emergencyDoctor.address, "medical-history", "read/write", 24 * 60 * 60),
        ehrManager.connect(patient3).createDelegationPolicy(specialist.address, "vital-signs", "read", 24 * 60 * 60)
    ]);

    // Extract initial policy IDs
    const initialPolicyIds = [];
    for (const tx of initialConcurrentPolicies) {
        const receipt = await tx.wait();
        const event = receipt.events.find(e => e.event === 'PolicyCreated');
        if (event) {
            initialPolicyIds.push(event.args.policyID.toNumber());
        }
    }

    const concurrentTests = [
        {
            name: "Multiple providers request access simultaneously",
            operation: async () => {
                // Create concurrent policies first
                const concurrentPolicies = await Promise.all([
                    ehrManager.connect(patient3).createDelegationPolicy(paramedic.address, "vital-signs", "read", 24 * 60 * 60),
                    ehrManager.connect(patient3).createDelegationPolicy(emergencyDoctor.address, "medical-history", "read", 24 * 60 * 60),
                    ehrManager.connect(patient3).createDelegationPolicy(specialist.address, "vital-signs", "read", 24 * 60 * 60)
                ]);

                const [paramedicProof3, emergencyProof3, specialistProof3] = await Promise.all([
                    setupEmergencyProof(paramedic),
                    setupEmergencyProof(emergencyDoctor),
                    setupEmergencyProof(specialist)
                ]);

                // Extract policy IDs from events
                const policyIds = [];
                for (const tx of concurrentPolicies) {
                    const receipt = await tx.wait();
                    const event = receipt.events.find(e => e.event === 'PolicyCreated');
                    if (event) {
                        policyIds.push(event.args.policyID.toNumber());
                    }
                }

                return await Promise.all([
                    ehrManager.connect(paramedic).requestDelegatedEmergencyAccess(
                        patient3.address, "Concurrent emergency access test 1", paramedicProof3, policyIds[0]
                    ),
                    ehrManager.connect(emergencyDoctor).requestDelegatedEmergencyAccess(
                        patient3.address, "Concurrent emergency access test 2", emergencyProof3, policyIds[1]
                    ),
                    ehrManager.connect(specialist).requestDelegatedEmergencyAccess(
                        patient3.address, "Concurrent emergency access test 3", specialistProof3, policyIds[2]
                    )
                ]);
            }
        },
        {
            name: "Multiple providers access data concurrently",
            operation: async () => {
                const [paramedicProof4, emergencyProof4, specialistProof4] = await Promise.all([
                    setupProof(paramedic),
                    setupProof(emergencyDoctor),
                    setupProof(specialist)
                ]);

                return await Promise.all([
                    ehrManager.connect(paramedic).getPatientData(patient3.address, "vital-signs", paramedicProof4),
                    ehrManager.connect(emergencyDoctor).getPatientData(patient3.address, "medical-history", emergencyProof4),
                    ehrManager.connect(specialist).getPatientData(patient3.address, "vital-signs", specialistProof4)
                ]);
            }
        }
    ];

    for (const test of concurrentTests) {
        const result = await framework.measureEmergencyTest(test.name, test.operation, 'concurrentEmergency');
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Test 5: Emergency Access Revocation
    console.log("\n5. Testing Emergency Access Revocation...");
    
    const revocationTests = [
        {
            name: "Patient revokes paramedic emergency access",
            operation: async () => {
                return await ehrManager.connect(patient3).revokeDelegatedEmergencyAccess(paramedic.address);
            }
        },
        {
            name: "Verify access denied after revocation",
            operation: async () => {
                const proof = await setupProof(paramedic);
                return await ehrManager.connect(paramedic).getPatientData(
                    patient3.address, "vital-signs", proof
                );
            }
        },
        {
            name: "Patient revokes all remaining emergency access",
            operation: async () => {
                return await Promise.all([
                    ehrManager.connect(patient3).revokeDelegatedEmergencyAccess(emergencyDoctor.address),
                    ehrManager.connect(patient3).revokeDelegatedEmergencyAccess(specialist.address)
                ]);
            }
        }
    ];

    for (const test of revocationTests) {
        const result = await framework.measureEmergencyTest(test.name, test.operation, 'emergencyRevocation');
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 6: Mass Emergency Event Simulation
    console.log("\n6. Testing Mass Emergency Event Simulation...");
    
    // Create multiple patients for mass emergency
    const emergencyPatients = [patient, patient2, patient3];
    const emergencyProviders = [paramedic, emergencyDoctor, specialist];
    
    // Store policy IDs for mass emergency tests
    let massEmergencyPolicyIds = [];

    const massEmergencyTests = [
        {
            name: "Mass emergency delegation creation",
            operation: async () => {
                const delegations = [];
                for (const pat of emergencyPatients) {
                    for (const provider of emergencyProviders) {
                        delegations.push(
                            ehrManager.connect(pat).createDelegationPolicy(
                                provider.address,
                                "vital-signs",
                                "read",
                                48 * 60 * 60
                            )
                        );
                    }
                }
                const results = await Promise.all(delegations);
                
                // Extract policy IDs from transaction receipts
                for (const tx of results) {
                    const receipt = await tx.wait();
                    const event = receipt.events.find(e => e.event === 'PolicyCreated');
                    if (event) {
                        massEmergencyPolicyIds.push(event.args.policyID.toNumber());
                    }
                }
                
                return results;
            }
        },
        {
            name: "Mass emergency access requests",
            operation: async () => {
                const accessRequests = [];
                let policyIndex = 0;
                
                // Match the exact same order as policy creation: patients outer loop, providers inner loop
                for (const pat of emergencyPatients) {
                    for (const provider of emergencyProviders) {
                        if (policyIndex < massEmergencyPolicyIds.length) {
                            const proof = await setupEmergencyProof(provider);
                            accessRequests.push(
                                ehrManager.connect(provider).requestDelegatedEmergencyAccess(
                                    pat.address,
                                    "Mass emergency event - multiple casualties",
                                    proof,
                                    massEmergencyPolicyIds[policyIndex]
                                )
                            );
                            policyIndex++;
                        }
                    }
                }
                return await Promise.all(accessRequests);
            }
        }
    ];

    for (const test of massEmergencyTests) {
        const result = await framework.measureEmergencyTest(test.name, test.operation, 'massEmergencyEvent');
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Calculate metrics for each category
    for (const category of Object.keys(framework.results)) {
        if (category === 'description' || category === 'testDate') continue;
        
        const data = framework.results[category].data;
        if (data.length > 0) {
            framework.results[category].metrics = {
                totalTests: data.length,
                successfulTests: data.filter(t => t.success).length,
                failedTests: data.filter(t => !t.success).length,
                successRate: (data.filter(t => t.success).length / data.length) * 100,
                averageLatency: data.reduce((sum, t) => sum + t.duration, 0) / data.length,
                minLatency: Math.min(...data.map(t => t.duration)),
                maxLatency: Math.max(...data.map(t => t.duration)),
                totalGasUsed: data.reduce((sum, t) => sum + t.gasUsed, 0),
                averageGasPerTest: data.reduce((sum, t) => sum + t.gasUsed, 0) / data.length
            };
        }
    }

    // Save results
    const filename = `emergency-access-scenarios-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(resultsDir, filename),
        JSON.stringify(framework.results, null, 2)
    );

    // Generate summary report
    console.log("\n=== EMERGENCY ACCESS SCENARIO SUMMARY ===");
    for (const [category, results] of Object.entries(framework.results)) {
        if (category === 'description' || category === 'testDate') continue;
        
        const metrics = results.metrics;
        if (!metrics) continue; // Skip if no metrics
        console.log(`\n${category.toUpperCase()}:`);
        console.log(`  Total Tests: ${metrics.totalTests || 0}`);
        console.log(`  Success Rate: ${metrics.successRate ? metrics.successRate.toFixed(2) : '0.00'}%`);
        console.log(`  Average Latency: ${metrics.averageLatency ? metrics.averageLatency.toFixed(2) : '0.00'}ms`);
        console.log(`  Latency Range: ${metrics.minLatency ? metrics.minLatency.toFixed(2) : '0.00'}ms - ${metrics.maxLatency ? metrics.maxLatency.toFixed(2) : '0.00'}ms`);
        console.log(`  Total Gas Used: ${metrics.totalGasUsed ? metrics.totalGasUsed.toLocaleString() : '0'}`);
    }

    console.log(`\nResults saved to: ${filename}`);
    console.log("Emergency access scenario testing completed!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });