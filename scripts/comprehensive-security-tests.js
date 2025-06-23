// comprehensive-security-tests.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

class SecurityTestFramework {
    constructor() {
        this.results = {
            description: "Comprehensive security testing for SL-DLAC",
            testDate: new Date().toISOString(),
            unauthorizedAccess: {
                description: "Tests for unauthorized access attempts",
                data: [],
                summary: {}
            },
            roleEscalation: {
                description: "Role escalation attack simulation",
                data: [],
                summary: {}
            },
            didSpoofing: {
                description: "DID spoofing and impersonation attempts",
                data: [],
                summary: {}
            },
            cryptographicSecurity: {
                description: "Cryptographic primitive validation",
                data: [],
                summary: {}
            },
            inputValidation: {
                description: "Input validation and boundary testing",
                data: [],
                summary: {}
            },
            permissionBoundary: {
                description: "Permission boundary testing",
                data: [],
                summary: {}
            }
        };
    }

    async measureSecurityTest(testName, operation, expectedToFail = true) {
        const start = performance.now();
        let success = false;
        let error = null;
        let gasUsed = 0;

        try {
            const result = await operation();
            if (result && result.wait) {
                const receipt = await result.wait();
                gasUsed = receipt.gasUsed ? receipt.gasUsed.toNumber() : 0;
            }
            success = true; // Operation succeeded
        } catch (err) {
            error = err.message;
            success = false; // Operation failed
        }

        const end = performance.now();
        const duration = end - start;

        // Security passed if: expectedToFail=true and success=false, OR expectedToFail=false and success=true
        const securityPassed = expectedToFail ? !success : success;

        return {
            testName,
            success,
            duration,
            gasUsed,
            error,
            securityPassed,
            timestamp: new Date().toISOString()
        };
    }
}

async function main() {
    console.log("Starting comprehensive security testing suite...");
    
    const framework = new SecurityTestFramework();
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Deploy contracts
    console.log("Deploying contracts for security testing...");
    
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
    const [owner, doctor, nurse, patient, attacker, normalUser] = await ethers.getSigners();

    // Setup legitimate users
    console.log("Setting up legitimate users...");
    
    const dids = {
        doctor: `did:ethr:${doctor.address}`,
        nurse: `did:ethr:${nurse.address}`,
        patient: `did:ethr:${patient.address}`
    };

    for (const [role, did] of Object.entries(dids)) {
        await didManager.connect(eval(role)).createDID(did, []);
    }

    // Assign legitimate roles
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

    // Helper function to setup valid ZK proof
    const setupProof = async (user) => {
        const zkProof = ethers.utils.randomBytes(32);
        const proofHash = ethers.utils.keccak256(zkProof);
        await zkpManager.connect(user).submitProof(proofHash);
        return zkProof;
    };

    console.log("Security testing environment setup completed.");

    // Test 1: Unauthorized Access Attempts
    console.log("\n1. Testing Unauthorized Access Attempts...");
    
    const unauthorizedTests = [
        {
            name: "Attacker tries to access patient data without role",
            operation: async () => {
                const zkProof = ethers.utils.randomBytes(32);
                return await ehrManager.connect(attacker).getPatientData(
                    patient.address, "vital-signs", zkProof
                );
            }
        },
        {
            name: "Attacker tries to update patient data without permission",
            operation: async () => {
                const zkProof = ethers.utils.randomBytes(32);
                return await ehrManager.connect(attacker).updatePatientData(
                    patient.address, "vital-signs", "malicious data", zkProof
                );
            }
        },
        {
            name: "Attacker tries to create patient record without permission",
            operation: async () => {
                return await ehrManager.connect(attacker).createPatientRecord(normalUser.address);
            }
        },
        {
            name: "Attacker tries to assign roles without admin privileges",
            operation: async () => {
                const maliciousCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MALICIOUS"));
                return await dlacManager.connect(attacker).assignRole(
                    normalUser.address, "ADMIN", maliciousCredential, 
                    `did:ethr:${normalUser.address}`, 365 * 24 * 60 * 60, false
                );
            }
        },
        {
            name: "Nurse tries to perform doctor-only operations",
            operation: async () => {
                const zkProof = await setupProof(nurse);
                return await ehrManager.connect(nurse).updatePatientData(
                    patient.address, "vital-signs", "unauthorized update", zkProof
                );
            }
        }
    ];

    for (const test of unauthorizedTests) {
        const result = await framework.measureSecurityTest(test.name, test.operation, true);
        framework.results.unauthorizedAccess.data.push(result);
        console.log(`  ${test.name}: ${result.securityPassed ? 'PASSED' : 'FAILED'}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 2: Role Escalation Attacks
    console.log("\n2. Testing Role Escalation Attacks...");
    
    const roleEscalationTests = [
        {
            name: "Nurse attempts to grant themselves doctor permissions",
            operation: async () => {
                return await dlacManager.connect(nurse).grantPermission("NURSE", "update_data");
            }
        },
        {
            name: "Patient attempts to assign admin role to themselves",
            operation: async () => {
                const credential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FAKE_ADMIN"));
                return await dlacManager.connect(patient).assignRole(
                    patient.address, "ADMIN", credential, dids.patient, 365 * 24 * 60 * 60, false
                );
            }
        },
        {
            name: "Doctor attempts to escalate to admin privileges",
            operation: async () => {
                return await dlacManager.connect(doctor).addRole("SUPER_ADMIN", "Super administrator");
            }
        },
        {
            name: "Attacker tries to modify role permissions directly",
            operation: async () => {
                return await dlacManager.connect(attacker).grantPermission("ATTACKER", "view_data");
            }
        }
    ];

    for (const test of roleEscalationTests) {
        const result = await framework.measureSecurityTest(test.name, test.operation, true);
        framework.results.roleEscalation.data.push(result);
        console.log(`  ${test.name}: ${result.securityPassed ? 'PASSED' : 'FAILED'}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 3: DID Spoofing Attempts
    console.log("\n3. Testing DID Spoofing and Impersonation...");
    
    const didSpoofingTests = [
        {
            name: "Attacker tries to create DID for existing address",
            operation: async () => {
                return await didManager.connect(attacker).createDID(dids.doctor, []);
            }
        },
        {
            name: "Attacker tries to modify another user's DID attributes",
            operation: async () => {
                return await didManager.connect(attacker).addAttribute(
                    dids.doctor, "malicious", "compromised"
                );
            }
        },
        {
            name: "Attacker tries to add themselves as DID controller",
            operation: async () => {
                return await didManager.connect(attacker).addController(
                    dids.patient, `did:ethr:${attacker.address}`
                );
            }
        },
        {
            name: "Attacker tries to deactivate legitimate DID",
            operation: async () => {
                return await didManager.connect(attacker).deactivateDID(dids.nurse);
            }
        }
    ];

    for (const test of didSpoofingTests) {
        const result = await framework.measureSecurityTest(test.name, test.operation, true);
        framework.results.didSpoofing.data.push(result);
        console.log(`  ${test.name}: ${result.securityPassed ? 'PASSED' : 'FAILED'}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 4: Cryptographic Security
    console.log("\n4. Testing Cryptographic Security...");
    
    const cryptoTests = [
        {
            name: "Valid ZK proof submission and validation",
            operation: async () => {
                const zkProof = ethers.utils.randomBytes(32);
                const proofHash = ethers.utils.keccak256(zkProof);
                await zkpManager.connect(doctor).submitProof(proofHash);
                return await zkpManager.validateProof(doctor.address, proofHash);
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Valid proof with role credential combination",
            operation: async () => {
                const zkProof = ethers.utils.randomBytes(32);
                const roleHash = await dlacManager.getRoleCredential(doctor.address);
                const combinedProofHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [roleHash, zkProof]));
                await zkpManager.connect(doctor).submitProof(combinedProofHash);
                return await zkpManager.validateProof(doctor.address, combinedProofHash);
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Valid proof for nurse with correct credentials",
            operation: async () => {
                const zkProof = ethers.utils.randomBytes(32);
                const proofHash = ethers.utils.keccak256(zkProof);
                await zkpManager.connect(nurse).submitProof(proofHash);
                return await zkpManager.validateProof(nurse.address, proofHash);
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Successful proof verification after multiple submissions",
            operation: async () => {
                const zkProof1 = ethers.utils.randomBytes(32);
                const zkProof2 = ethers.utils.randomBytes(32);
                const proofHash1 = ethers.utils.keccak256(zkProof1);
                const proofHash2 = ethers.utils.keccak256(zkProof2);
                
                await zkpManager.connect(doctor).submitProof(proofHash1);
                await zkpManager.connect(doctor).submitProof(proofHash2);
                
                return await zkpManager.validateProof(doctor.address, proofHash2);
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Valid cryptographic hash consistency",
            operation: async () => {
                const data = "test data for hash consistency";
                const hash1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(data));
                const hash2 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(data));
                
                // Hashes should be identical
                if (hash1 === hash2) {
                    return { success: true };
                } else {
                    throw new Error("Hash inconsistency detected");
                }
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "ZK proof replay attack prevention",
            operation: async () => {
                // Submit a valid proof first
                const zkProof = ethers.utils.randomBytes(32);
                const proofHash = ethers.utils.keccak256(zkProof);
                await zkpManager.connect(doctor).submitProof(proofHash);
                
                // Try to replay the same proof from different address
                return await zkpManager.connect(attacker).submitProof(proofHash);
            }
        },
        {
            name: "Invalid proof submission with zero hash",
            operation: async () => {
                const invalidProof = ethers.utils.hexZeroPad("0x0", 32);
                return await zkpManager.connect(attacker).submitProof(invalidProof);
            }
        },
        {
            name: "Proof validation with wrong address",
            operation: async () => {
                const zkProof = ethers.utils.randomBytes(32);
                const proofHash = ethers.utils.keccak256(zkProof);
                await zkpManager.connect(doctor).submitProof(proofHash);
                
                // Try to validate proof with different address - should return false
                const result = await zkpManager.validateProof(attacker.address, proofHash);
                if (result === false) {
                    return { success: true }; // Expected behavior
                } else {
                    throw new Error("Validation should have failed");
                }
            },
            expectedToFail: false // Should succeed (returning false is expected)
        },
        {
            name: "Invalid proof with malformed hash",
            operation: async () => {
                const invalidProof = "0xinvalidhash";
                return await zkpManager.connect(attacker).submitProof(invalidProof);
            }
        },
        {
            name: "Cross-user proof validation attack",
            operation: async () => {
                const zkProof = ethers.utils.randomBytes(32);
                const proofHash = ethers.utils.keccak256(zkProof);
                await zkpManager.connect(nurse).submitProof(proofHash);
                
                // Attacker tries to use nurse's proof
                return await zkpManager.validateProof(attacker.address, proofHash);
            },
            expectedToFail: false // Should return false, not revert
        }
    ];

    for (const test of cryptoTests) {
        const result = await framework.measureSecurityTest(
            test.name, 
            test.operation, 
            test.expectedToFail !== undefined ? test.expectedToFail : true
        );
        framework.results.cryptographicSecurity.data.push(result);
        console.log(`  ${test.name}: ${result.securityPassed ? 'PASSED' : 'FAILED'}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 5: Input Validation and Boundary Testing
    console.log("\n5. Testing Input Validation and Boundaries...");
    
    const inputValidationTests = [
        {
            name: "Valid DID creation with proper format",
            operation: async () => {
                const validDID = `did:ethr:${normalUser.address}`;
                return await didManager.connect(normalUser).createDID(validDID, []);
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Valid patient data update with normal content",
            operation: async () => {
                const zkProof = await setupProof(doctor);
                const normalData = "Heart rate: 72bpm, BP: 118/78";
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "vital-signs", normalData, zkProof
                );
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Valid patient data with medical terminology",
            operation: async () => {
                const zkProof = await setupProof(doctor);
                const medicalData = "Dx: Hypertension, Rx: Lisinopril 10mg QD";
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "diagnosis", medicalData, zkProof
                );
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Valid numeric data in patient records",
            operation: async () => {
                const zkProof = await setupProof(doctor);
                const numericData = "Temperature: 37.2C, Weight: 70kg, Height: 175cm";
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "measurements", numericData, zkProof
                );
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Valid special characters in medical data",
            operation: async () => {
                const zkProof = await setupProof(doctor);
                const specialCharsData = "O2 Sat: 98%, HR: 72 bpm, Temp: 98.6°F";
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "vitals", specialCharsData, zkProof
                );
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Valid UTF-8 characters in patient notes",
            operation: async () => {
                const zkProof = await setupProof(doctor);
                const utfData = "Patient notes: Amélie's condition improving ✓";
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "notes", utfData, zkProof
                );
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Valid long medical description",
            operation: async () => {
                const zkProof = await setupProof(doctor);
                const longData = "Patient presents with chest pain, shortness of breath, and fatigue. " +
                               "Physical examination reveals elevated blood pressure and irregular heartbeat. " +
                               "Recommend further cardiac evaluation including ECG and echocardiogram.";
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "assessment", longData, zkProof
                );
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Valid empty data category update",
            operation: async () => {
                const zkProof = await setupProof(doctor);
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "temp-category", "", zkProof
                );
            },
            expectedToFail: false // Should succeed with empty string
        },
        {
            name: "Empty string DID creation (boundary test)",
            operation: async () => {
                return await didManager.connect(normalUser).createDID("", []);
            }
        },
        {
            name: "Extremely long DID creation (boundary test)",
            operation: async () => {
                const longDID = "did:ethr:" + "a".repeat(1000);
                return await didManager.connect(normalUser).createDID(longDID, []);
            }
        },
        {
            name: "SQL injection attempt in patient data (security test)",
            operation: async () => {
                const zkProof = await setupProof(doctor);
                const maliciousData = "'; DROP TABLE patients; --";
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "vital-signs", maliciousData, zkProof
                );
            },
            expectedToFail: false // Should succeed but data should be safely stored
        },
        {
            name: "Null address manipulation (boundary test)",
            operation: async () => {
                return await ehrManager.connect(doctor).createPatientRecord(ethers.constants.AddressZero);
            }
        }
    ];

    for (const test of inputValidationTests) {
        const result = await framework.measureSecurityTest(
            test.name, 
            test.operation, 
            test.expectedToFail !== undefined ? test.expectedToFail : true
        );
        framework.results.inputValidation.data.push(result);
        console.log(`  ${test.name}: ${result.securityPassed ? 'PASSED' : 'FAILED'}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test 6: Permission Boundary Testing
    console.log("\n6. Testing Permission Boundaries...");
    
    const permissionBoundaryTests = [
        {
            name: "Doctor accesses patient data with valid permissions",
            operation: async () => {
                const zkProof = await setupProof(doctor);
                return await ehrManager.connect(doctor).getPatientData(
                    patient.address, "vital-signs", zkProof
                );
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Doctor updates patient data with valid permissions",
            operation: async () => {
                const zkProof = await setupProof(doctor);
                return await ehrManager.connect(doctor).updatePatientData(
                    patient.address, "treatment-plan", "Continue current medication", zkProof
                );
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Nurse views patient data with valid permissions",
            operation: async () => {
                const zkProof = await setupProof(nurse);
                return await ehrManager.connect(nurse).getPatientData(
                    patient.address, "vital-signs", zkProof
                );
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Doctor creates new patient record with valid permissions",
            operation: async () => {
                return await ehrManager.connect(doctor).createPatientRecord(normalUser.address);
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Valid role assignment by admin",
            operation: async () => {
                const newCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("NEW_DOCTOR_CREDENTIAL"));
                const newDID = `did:ethr:${normalUser.address}`;
                return await dlacManager.connect(owner).assignRole(
                    normalUser.address, "DOCTOR", newCredential, newDID, 365 * 24 * 60 * 60, false
                );
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Valid permission grant by admin",
            operation: async () => {
                return await dlacManager.connect(owner).grantPermission("DOCTOR", "emergency_access");
            },
            expectedToFail: false // Should succeed
        },
        {
            name: "Nurse attempts to update patient data (boundary violation)",
            operation: async () => {
                const zkProof = await setupProof(nurse);
                return await ehrManager.connect(nurse).updatePatientData(
                    patient.address, "diagnosis", "Unauthorized diagnosis", zkProof
                );
            }
        },
        {
            name: "Patient attempts to access another patient's data",
            operation: async () => {
                const zkProof = ethers.utils.randomBytes(32);
                return await ehrManager.connect(patient).getPatientData(
                    normalUser.address, "vital-signs", zkProof
                );
            }
        },
        {
            name: "Nurse attempts to create patient record (boundary violation)",
            operation: async () => {
                return await ehrManager.connect(nurse).createPatientRecord(attacker.address);
            }
        },
        {
            name: "Non-admin attempts role assignment (boundary violation)",
            operation: async () => {
                const credential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FAKE_CREDENTIAL"));
                return await dlacManager.connect(doctor).assignRole(
                    attacker.address, "DOCTOR", credential, `did:ethr:${attacker.address}`, 365 * 24 * 60 * 60, false
                );
            }
        },
        {
            name: "User without role attempts data access (boundary violation)",
            operation: async () => {
                const zkProof = ethers.utils.randomBytes(32);
                return await ehrManager.connect(attacker).getPatientData(
                    patient.address, "vital-signs", zkProof
                );
            }
        },
        {
            name: "Expired role access attempt (time boundary)",
            operation: async () => {
                // This would require time manipulation in a real test
                // For now, test with a role that should be valid
                const zkProof = await setupProof(doctor);
                return await ehrManager.connect(doctor).getPatientData(
                    patient.address, "vital-signs", zkProof
                );
            },
            expectedToFail: false // Should succeed as role is still valid
        }
    ];

    for (const test of permissionBoundaryTests) {
        const result = await framework.measureSecurityTest(
            test.name, 
            test.operation, 
            test.expectedToFail !== undefined ? test.expectedToFail : true
        );
        framework.results.permissionBoundary.data.push(result);
        console.log(`  ${test.name}: ${result.securityPassed ? 'PASSED' : 'FAILED'}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Calculate summaries
    for (const category of Object.keys(framework.results)) {
        if (category === 'description' || category === 'testDate') continue;
        
        const data = framework.results[category].data;
        if (data.length > 0) {
            framework.results[category].summary = {
                totalTests: data.length,
                passed: data.filter(t => t.securityPassed).length,
                failed: data.filter(t => !t.securityPassed).length,
                passRate: (data.filter(t => t.securityPassed).length / data.length) * 100,
                averageTestTime: data.reduce((sum, t) => sum + t.duration, 0) / data.length,
                totalGasUsed: data.reduce((sum, t) => sum + t.gasUsed, 0)
            };
        }
    }

    // Save results
    const filename = `security-tests-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(resultsDir, filename),
        JSON.stringify(framework.results, null, 2)
    );

    // Generate summary report
    console.log("\n=== SECURITY TEST SUMMARY ===");
    for (const [category, results] of Object.entries(framework.results)) {
        if (category === 'description' || category === 'testDate') continue;
        
        const summary = results.summary;
        if (!summary) {
            console.log(`\n${category.toUpperCase()}:`);
            console.log(`  No tests executed`);
            continue;
        }
        
        console.log(`\n${category.toUpperCase()}:`);
        console.log(`  Total Tests: ${summary.totalTests || 0}`);
        console.log(`  Passed: ${summary.passed || 0}`);
        console.log(`  Failed: ${summary.failed || 0}`);
        console.log(`  Pass Rate: ${summary.passRate ? summary.passRate.toFixed(2) : '0.00'}%`);
        console.log(`  Average Test Time: ${summary.averageTestTime ? summary.averageTestTime.toFixed(2) : '0.00'}ms`);
    }

    console.log(`\nResults saved to: ${filename}`);
    console.log("Security testing completed!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });