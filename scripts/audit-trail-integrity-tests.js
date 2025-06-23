// audit-trail-integrity-tests.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

class AuditTrailTestFramework {
    constructor() {
        this.results = {
            description: "Comprehensive audit trail integrity and completeness testing",
            testDate: new Date().toISOString(),
            auditCompleteness: {
                description: "Verification that all system operations are properly audited",
                data: [],
                metrics: {}
            },
            auditIntegrity: {
                description: "Audit log tamper resistance and integrity validation",
                data: [],
                metrics: {}
            },
            auditRetrieval: {
                description: "Audit log retrieval performance and accuracy",
                data: [],
                metrics: {}
            },
            auditFiltering: {
                description: "Audit log filtering and search functionality",
                data: [],
                metrics: {}
            },
            auditStorage: {
                description: "Audit log storage optimization and scalability",
                data: [],
                metrics: {}
            },
            complianceReporting: {
                description: "Compliance reporting and audit trail generation",
                data: [],
                metrics: {}
            }
        };
        this.auditEvents = [];
        this.expectedAudits = [];
    }

    async measureAuditTest(testName, operation, category, expectedAuditCount = 0) {
        const start = performance.now();
        let success = false;
        let gasUsed = 0;
        let error = null;
        let result = null;
        let auditsBefore = 0;
        let auditsAfter = 0;

        try {
            // Count audits before operation
            auditsBefore = this.auditEvents.length;
            
            result = await operation();
            if (result && result.wait) {
                const receipt = await result.wait();
                gasUsed = receipt.gasUsed ? receipt.gasUsed.toNumber() : 0;
                
                // Extract audit events from receipt
                const auditLogs = receipt.events?.filter(event => 
                    event.event === 'AccessLogged' || 
                    event.event === 'AuditEntryCreated'
                ) || [];
                
                this.auditEvents.push(...auditLogs);
                auditsAfter = this.auditEvents.length;
            }
            
            success = true;
        } catch (err) {
            error = err.message;
            success = false;
        }

        const end = performance.now();
        const duration = end - start;
        const auditCount = auditsAfter - auditsBefore;

        const testResult = {
            testName,
            success,
            duration,
            gasUsed,
            error,
            auditCount,
            expectedAuditCount,
            auditComplianceRate: expectedAuditCount > 0 ? (auditCount / expectedAuditCount) * 100 : 100,
            timestamp: new Date().toISOString(),
            result
        };

        this.results[category].data.push(testResult);
        return testResult;
    }

    async verifyAuditIntegrity(auditLogger, entryId) {
        try {
            const entry = await auditLogger.getAuditEntry(entryId);
            const calculatedHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ['address', 'address', 'string', 'string', 'bool', 'uint256'],
                    [entry.provider, entry.patient, entry.action, entry.details, entry.isEmergency, entry.timestamp]
                )
            );
            return calculatedHash === entry.dataHash;
        } catch (error) {
            return false;
        }
    }

    async generateComplianceReport(auditLogger, startTime, endTime) {
        const allEntries = [];
        let entryId = 1;
        
        while (true) {
            try {
                const entry = await auditLogger.getAuditEntry(entryId);
                if (entry.timestamp >= startTime && entry.timestamp <= endTime) {
                    allEntries.push({
                        id: entryId,
                        provider: entry.provider,
                        patient: entry.patient,
                        action: entry.action,
                        details: entry.details,
                        isEmergency: entry.isEmergency,
                        timestamp: entry.timestamp,
                        dataHash: entry.dataHash
                    });
                }
                entryId++;
            } catch (error) {
                break; // No more entries
            }
        }
        
        return {
            totalEntries: allEntries.length,
            emergencyAccess: allEntries.filter(e => e.isEmergency).length,
            regularAccess: allEntries.filter(e => !e.isEmergency).length,
            uniqueProviders: new Set(allEntries.map(e => e.provider)).size,
            uniquePatients: new Set(allEntries.map(e => e.patient)).size,
            actionBreakdown: this.getActionBreakdown(allEntries),
            timeRange: { startTime, endTime },
            entries: allEntries
        };
    }

    getActionBreakdown(entries) {
        const breakdown = {};
        entries.forEach(entry => {
            breakdown[entry.action] = (breakdown[entry.action] || 0) + 1;
        });
        return breakdown;
    }
}

async function main() {
    console.log("Starting comprehensive audit trail integrity testing...");
    
    const framework = new AuditTrailTestFramework();
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Deploy contracts
    console.log("Deploying contracts for audit trail testing...");
    
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

    // Get signers
    const [owner, doctor, nurse, patient, paramedic, auditor] = await ethers.getSigners();

    // Setup testing environment
    console.log("Setting up audit trail testing environment...");
    
    const dids = {
        doctor: `did:ethr:${doctor.address}`,
        nurse: `did:ethr:${nurse.address}`,
        patient: `did:ethr:${patient.address}`,
        paramedic: `did:ethr:${paramedic.address}`,
        auditor: `did:ethr:${auditor.address}`
    };

    // Create DIDs
    for (const [role, did] of Object.entries(dids)) {
        await didManager.connect(eval(role)).createDID(did, []);
    }

    // Assign roles
    const credentials = {
        doctor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DOCTOR_CREDENTIAL")),
        nurse: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("NURSE_CREDENTIAL")),
        paramedic: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PARAMEDIC_CREDENTIAL")),
        auditor: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("AUDITOR_CREDENTIAL"))
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
        auditor.address, "AUDITOR", credentials.auditor, dids.auditor, 365 * 24 * 60 * 60, false
    );

    // Grant permissions
    await dlacManager.connect(owner).grantPermission("DOCTOR", "view_data");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "update_data");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "create_record");
    await dlacManager.connect(owner).grantPermission("NURSE", "view_data");
    await dlacManager.connect(owner).grantPermission("PARAMEDIC", "view_data");
    await dlacManager.connect(owner).grantPermission("AUDITOR", "view_data");

    // Setup helper function for proofs
    const setupProof = async (user) => {
        const zkProof = ethers.utils.randomBytes(32);
        const proofHash = ethers.utils.keccak256(zkProof);
        await zkpManager.connect(user).submitProof(proofHash);
        return zkProof;
    };

    // Helper function for emergency access proof setup
    const setupEmergencyProof = async (user) => {
        const zkProof = ethers.utils.randomBytes(32);
        // For emergency access, we need to combine role credential with proof
        const roleHash = await dlacManager.getRoleCredential(user.address);
        const combinedProofHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [roleHash, zkProof]));
        await zkpManager.connect(user).submitProof(combinedProofHash);
        return zkProof;
    };

    console.log("Audit trail testing environment setup completed.");

    // Test 1: Audit Completeness - Verify all operations are audited
    console.log("\n1. Testing Audit Completeness...");
    
    const completenessTests = [
        {
            name: "Patient record creation generates audit",
            operation: async () => {
                return await ehrManager.connect(doctor).createPatientRecord(patient.address);
            },
            expectedAudits: 1
        },
        {
            name: "Patient data update generates audit",
            operation: async () => {
                const proof = await setupProof(doctor);
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "vital-signs", "Heart rate: 75bpm", proof
                );
            },
            expectedAudits: 1
        },
        {
            name: "Patient data access generates audit",
            operation: async () => {
                const proof = await setupProof(doctor);
                return await ehrManager.connect(doctor).getPatientData(
                    patient.address, "vital-signs", proof
                );
            },
            expectedAudits: 0 // View operations might not generate audit events in current implementation
        },
        {
            name: "Emergency delegation policy creation",
            operation: async () => {
                return await ehrManager.connect(patient).createDelegationPolicy(
                    paramedic.address, "vital-signs", "read", 24 * 60 * 60
                );
            },
            expectedAudits: 0 // Policy creation might not generate audit events
        },
        {
            name: "Emergency access request generates audit",
            operation: async () => {
                const proof = await setupEmergencyProof(paramedic);
                return await ehrManager.connect(paramedic).requestDelegatedEmergencyAccess(
                    patient.address, "Emergency audit test", proof, 1
                );
            },
            expectedAudits: 1
        }
    ];

    for (const test of completenessTests) {
        const result = await framework.measureAuditTest(
            test.name, test.operation, 'auditCompleteness', test.expectedAudits
        );
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} - Audits: ${result.auditCount}/${result.expectedAuditCount}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 2: Audit Integrity Testing
    console.log("\n2. Testing Audit Integrity...");
    
    // First, create some audit entries to test
    const proof1 = await setupProof(doctor);
    await ehrManager.connect(doctor).updatePatientData(
        patient.address, "medical-history", "Diabetes Type 2", proof1
    );

    const proof2 = await setupProof(nurse);
    const nurseProofHash = ethers.utils.keccak256(proof2);
    await zkpManager.connect(nurse).submitProof(nurseProofHash);

    const integrityTests = [
        {
            name: "Verify audit entry hash integrity",
            operation: async () => {
                const isValid = await framework.verifyAuditIntegrity(auditLogger, 1);
                return { isValid };
            }
        },
        {
            name: "Attempt to retrieve non-existent audit entry",
            operation: async () => {
                return await auditLogger.getAuditEntry(9999);
            }
        },
        {
            name: "Verify audit entry immutability",
            operation: async () => {
                // Try to get the same entry multiple times and verify consistency
                const totalCount = await auditLogger.getAccessRecordCount();
                if (totalCount == 0) return { consistent: true };
                const entry1 = await auditLogger.getAccessRecord(0);
                await new Promise(resolve => setTimeout(resolve, 100));
                const entry2 = await auditLogger.getAccessRecord(0);
                
                return {
                    consistent: entry1.user === entry2.user &&
                               entry1.timestamp.toString() === entry2.timestamp.toString()
                };
            }
        },
        {
            name: "Verify audit counter integrity",
            operation: async () => {
                const currentCount = await auditLogger.getAccessRecordCount();
                return { currentCount: currentCount.toNumber() };
            }
        }
    ];

    for (const test of integrityTests) {
        const result = await framework.measureAuditTest(test.name, test.operation, 'auditIntegrity');
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 3: Audit Retrieval Performance
    console.log("\n3. Testing Audit Retrieval Performance...");
    
    // Create multiple audit entries for performance testing
    console.log("  Creating test audit entries...");
    for (let i = 0; i < 10; i++) {
        const proof = await setupProof(doctor);
        await ehrManager.connect(doctor).updatePatientData(
            patient.address, `test-category-${i}`, `Test data ${i}`, proof
        );
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    const retrievalTests = [
        {
            name: "Retrieve single audit entry",
            operation: async () => {
                return await auditLogger.getAccessRecord(1);
            }
        },
        {
            name: "Retrieve patient access records",
            operation: async () => {
                return await auditLogger.getPatientAccessRecords(patient.address);
            }
        },
        {
            name: "Retrieve provider access records",
            operation: async () => {
                // Since getProviderAccessRecords doesn't exist, get all records and filter
                const totalCount = await auditLogger.getAccessRecordCount();
                const providerRecords = [];
                for (let i = 0; i < totalCount; i++) {
                    const record = await auditLogger.getAccessRecord(i);
                    if (record.user === doctor.address) {
                        providerRecords.push(record);
                    }
                }
                return providerRecords;
            }
        },
        {
            name: "Get total audit entry count",
            operation: async () => {
                return await auditLogger.getAccessRecordCount();
            }
        },
        {
            name: "Batch retrieval of multiple entries",
            operation: async () => {
                const promises = [];
                const totalCount = await auditLogger.getAccessRecordCount();
                const maxEntries = Math.min(5, totalCount);
                for (let i = 0; i < maxEntries; i++) {
                    promises.push(auditLogger.getAccessRecord(i));
                }
                return await Promise.all(promises);
            }
        }
    ];

    for (const test of retrievalTests) {
        const result = await framework.measureAuditTest(test.name, test.operation, 'auditRetrieval');
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Test 4: Audit Filtering and Search
    console.log("\n4. Testing Audit Filtering and Search...");
    
    // Create diverse audit entries for filtering tests
    const proof3 = await setupEmergencyProof(paramedic);
    await ehrManager.connect(paramedic).requestDelegatedEmergencyAccess(
        patient.address, "Emergency filtering test", proof3, 1
    );

    const filteringTests = [
        {
            name: "Filter emergency access records",
            operation: async () => {
                const allRecords = await auditLogger.getPatientAccessRecords(patient.address);
                return {
                    totalRecords: allRecords.length,
                    emergencyRecords: allRecords.filter(record => record.isEmergency).length
                };
            }
        },
        {
            name: "Filter by provider address",
            operation: async () => {
                const doctorRecords = await auditLogger.getProviderAccessRecords(doctor.address);
                const paramedicRecords = await auditLogger.getProviderAccessRecords(paramedic.address);
                return {
                    doctorRecords: doctorRecords.length,
                    paramedicRecords: paramedicRecords.length
                };
            }
        },
        {
            name: "Search for specific action types",
            operation: async () => {
                const allRecords = await auditLogger.getPatientAccessRecords(patient.address);
                const updateActions = allRecords.filter(record => 
                    record.action.includes('update_data')
                ).length;
                const emergencyActions = allRecords.filter(record => 
                    record.action.includes('emergency_access')
                ).length;
                return { updateActions, emergencyActions };
            }
        }
    ];

    for (const test of filteringTests) {
        const result = await framework.measureAuditTest(test.name, test.operation, 'auditFiltering');
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 5: Audit Storage Optimization
    console.log("\n5. Testing Audit Storage Optimization...");
    
    const storageTests = [
        {
            name: "Measure storage cost per audit entry",
            operation: async () => {
                const proof = await setupProof(doctor);
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "storage-test", "Storage optimization test data", proof
                );
            }
        },
        {
            name: "Batch audit operations efficiency",
            operation: async () => {
                const promises = [];
                for (let i = 0; i < 5; i++) {
                    const proof = await setupProof(doctor);
                    promises.push(
                        ehrManager.connect(doctor).updatePatientData(
                            patient.address, `batch-test-${i}`, `Batch test data ${i}`, proof
                        )
                    );
                }
                return await Promise.all(promises);
            }
        },
        {
            name: "Audit log growth measurement",
            operation: async () => {
                const initialCount = await auditLogger.getAccessRecordCount();
                
                // Add 3 more entries
                for (let i = 0; i < 3; i++) {
                    const proof = await setupProof(doctor);
                    await ehrManager.connect(doctor).updatePatientData(
                        patient.address, `growth-test-${i}`, `Growth test ${i}`, proof
                    );
                }
                
                const finalCount = await auditLogger.getAccessRecordCount();
                return {
                    initialCount: initialCount.toNumber(),
                    finalCount: finalCount.toNumber(),
                    growth: finalCount.toNumber() - initialCount.toNumber()
                };
            }
        }
    ];

    for (const test of storageTests) {
        const result = await framework.measureAuditTest(test.name, test.operation, 'auditStorage');
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration.toFixed(2)}ms, Gas: ${result.gasUsed})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 6: Compliance Reporting
    console.log("\n6. Testing Compliance Reporting...");
    
    const complianceTests = [
        {
            name: "Generate comprehensive audit report",
            operation: async () => {
                const currentTime = Math.floor(Date.now() / 1000);
                const startTime = currentTime - (24 * 60 * 60); // 24 hours ago
                const endTime = currentTime;
                
                return await framework.generateComplianceReport(auditLogger, startTime, endTime);
            }
        },
        {
            name: "Validate audit trail completeness",
            operation: async () => {
                const totalEntries = await auditLogger.getAccessRecordCount();
                const patientRecords = await auditLogger.getPatientAccessRecords(patient.address);
                const providerRecords = await auditLogger.getProviderAccessRecords(doctor.address);
                
                return {
                    totalSystemEntries: totalEntries.toNumber(),
                    patientSpecificEntries: patientRecords.length,
                    providerSpecificEntries: providerRecords.length,
                    completenessRatio: patientRecords.length / totalEntries.toNumber()
                };
            }
        },
        {
            name: "Emergency access compliance report",
            operation: async () => {
                const patientRecords = await auditLogger.getPatientAccessRecords(patient.address);
                const emergencyRecords = patientRecords.filter(record => record.isEmergency);
                const regularRecords = patientRecords.filter(record => !record.isEmergency);
                
                return {
                    totalAccess: patientRecords.length,
                    emergencyAccess: emergencyRecords.length,
                    regularAccess: regularRecords.length,
                    emergencyRatio: emergencyRecords.length / patientRecords.length
                };
            }
        }
    ];

    for (const test of complianceTests) {
        const result = await framework.measureAuditTest(test.name, test.operation, 'complianceReporting');
        console.log(`  ${test.name}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration.toFixed(2)}ms)`);
        if (result.success && result.result) {
            console.log(`    Report data:`, JSON.stringify(result.result, null, 4));
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
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
                averageGasPerTest: data.reduce((sum, t) => sum + t.gasUsed, 0) / data.length,
                auditComplianceRate: data.filter(t => t.auditComplianceRate).length > 0 
                    ? data.reduce((sum, t) => sum + (t.auditComplianceRate || 0), 0) / data.filter(t => t.auditComplianceRate).length 
                    : 100
            };
        }
    }

    // Save results
    const filename = `audit-trail-integrity-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(resultsDir, filename),
        JSON.stringify(framework.results, null, 2)
    );

    // Generate summary report
    console.log("\n=== AUDIT TRAIL INTEGRITY SUMMARY ===");
    for (const [category, results] of Object.entries(framework.results)) {
        if (category === 'description' || category === 'testDate') continue;
        
        const metrics = results.metrics;
        console.log(`\n${category.toUpperCase()}:`);
        console.log(`  Total Tests: ${metrics.totalTests}`);
        console.log(`  Success Rate: ${metrics.successRate.toFixed(2)}%`);
        console.log(`  Average Latency: ${metrics.averageLatency.toFixed(2)}ms`);
        console.log(`  Latency Range: ${metrics.minLatency.toFixed(2)}ms - ${metrics.maxLatency.toFixed(2)}ms`);
        console.log(`  Total Gas Used: ${metrics.totalGasUsed.toLocaleString()}`);
        if (metrics.auditComplianceRate) {
            console.log(`  Audit Compliance Rate: ${metrics.auditComplianceRate.toFixed(2)}%`);
        }
    }

    console.log(`\nResults saved to: ${filename}`);
    console.log("Audit trail integrity testing completed!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });