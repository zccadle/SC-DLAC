const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DACEMS System", function () {
    let PatientDataStorage, EnhancedRBAC, EnhancedAuditLog, DIDRegistry, ZKPVerifier;
    let patientStorage, rbac, auditLog, didRegistry, zkpVerifier;
    let owner, doctor1, doctor2, nurse1, patient1, patient2, paramedic1, admin;

    beforeEach(async function () {
        [owner, doctor1, doctor2, nurse1, patient1, patient2, paramedic1, admin] = await ethers.getSigners();

        // Deploy contracts
        ZKPVerifier = await ethers.getContractFactory("ZKPVerifier");
        zkpVerifier = await ZKPVerifier.deploy();
        await zkpVerifier.deployed();

        EnhancedRBAC = await ethers.getContractFactory("EnhancedRBAC");
        rbac = await EnhancedRBAC.deploy(ethers.constants.AddressZero, zkpVerifier.address);
        await rbac.deployed();

        DIDRegistry = await ethers.getContractFactory("DIDRegistry");
        didRegistry = await DIDRegistry.deploy(rbac.address);
        await didRegistry.deployed();

        await rbac.updateDIDRegistry(didRegistry.address);

        EnhancedAuditLog = await ethers.getContractFactory("EnhancedAuditLog");
        auditLog = await EnhancedAuditLog.deploy();
        await auditLog.deployed();

        PatientDataStorage = await ethers.getContractFactory("UpdatedPatientDataStorage");
        patientStorage = await PatientDataStorage.deploy(
            rbac.address,
            auditLog.address,
            didRegistry.address,
            zkpVerifier.address
        );
        await patientStorage.deployed();

        await setupSystem();
    });

    async function setupSystem() {
        // Create and register DIDs
        const dids = {
            doctor1: `did:ethr:${doctor1.address}`,
            doctor2: `did:ethr:${doctor2.address}`,
            nurse1: `did:ethr:${nurse1.address}`,
            patient1: `did:ethr:${patient1.address}`,
            patient2: `did:ethr:${patient2.address}`,
            paramedic1: `did:ethr:${paramedic1.address}`
        };

        // Register DIDs
        for (const [user, did] of Object.entries(dids)) {
            await didRegistry.connect(eval(user)).createDID(did, []);
        }

        // Setup roles with credentials
        const doctor1Credential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("doctor1_CREDENTIAL"));
        const doctor2Credential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("doctor2_CREDENTIAL"));
        const nurse1Credential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("nurse1_CREDENTIAL"));
        const paramedic1Credential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("paramedic1_CREDENTIAL"));

        // Assign roles
        await rbac.connect(owner).assignRole(
            doctor1.address, 
            "DOCTOR", 
            doctor1Credential, 
            dids.doctor1, 
            365 * 24 * 60 * 60,
            false // not delegated
        );
        
        await rbac.connect(owner).assignRole(
            doctor2.address, 
            "DOCTOR", 
            doctor2Credential, 
            dids.doctor2, 
            365 * 24 * 60 * 60,
            false
        );
        
        await rbac.connect(owner).assignRole(
            nurse1.address, 
            "NURSE", 
            nurse1Credential, 
            dids.nurse1, 
            365 * 24 * 60 * 60,
            false
        );
        
        await rbac.connect(owner).assignRole(
            paramedic1.address, 
            "PARAMEDIC", 
            paramedic1Credential, 
            dids.paramedic1, 
            365 * 24 * 60 * 60,
            true // paramedic has delegated role
        );

        // Grant permissions
        await rbac.connect(owner).grantPermission("DOCTOR", "view_data");
        await rbac.connect(owner).grantPermission("DOCTOR", "update_data");
        await rbac.connect(owner).grantPermission("DOCTOR", "create_record");
        await rbac.connect(owner).grantPermission("NURSE", "view_data");
        await rbac.connect(owner).grantPermission("NURSE", "update_data");

        // Create patient records
        await patientStorage.connect(doctor1).createPatientRecord(patient1.address);
        await patientStorage.connect(doctor1).createPatientRecord(patient2.address);
    }

    describe("Role Management", function () {
        it("Should correctly add and verify roles", async function () {
            // Add a new role
            await rbac.connect(owner).addRole("SPECIALIST", "Medical Specialist");
            
            // Get and verify the role
            const [roleID, description] = await rbac.getRole("SPECIALIST");
            
            expect(roleID).to.equal("SPECIALIST");
            expect(description).to.equal("Medical Specialist");
        });

        it("Should properly verify user roles", async function () {
            const doctorRole = await rbac.getUserRole(doctor1.address);
            const nurseRole = await rbac.getUserRole(nurse1.address);
            const paramedicRole = await rbac.getUserRole(paramedic1.address);
            
            expect(doctorRole).to.equal("DOCTOR");
            expect(nurseRole).to.equal("NURSE");
            expect(paramedicRole).to.equal("PARAMEDIC");
        });

        it("Should identify delegated roles", async function () {
            const isDoctorDelegated = await rbac.isDelegatedRole(doctor1.address);
            const isParamedicDelegated = await rbac.isDelegatedRole(paramedic1.address);
            
            expect(isDoctorDelegated).to.be.false;
            expect(isParamedicDelegated).to.be.true;
        });
    });

    describe("Permission Management", function () {
        it("Should properly grant and check permissions", async function () {
            const doctorViewPermission = await rbac.hasPermission(doctor1.address, "view_data");
            const nurseViewPermission = await rbac.hasPermission(nurse1.address, "view_data");
            const paramedicViewPermission = await rbac.hasPermission(paramedic1.address, "view_data");

            expect(doctorViewPermission).to.be.true;
            expect(nurseViewPermission).to.be.true;
            expect(paramedicViewPermission).to.be.false;
        });

        it("Should remove roles correctly", async function () {
            // Create a test role
            await rbac.connect(owner).addRole("TEST_ROLE", "Test Role");
            
            // Remove the role
            await rbac.connect(owner).removeRole("TEST_ROLE");
            
            // Try to get the role - should revert
            await expect(rbac.getRole("TEST_ROLE")).to.be.revertedWith("Role does not exist");
        });
    });

    describe("Delegation Policies", function () {
        it("Should create and verify delegation policies", async function () {
            // Patient creates a delegation policy for paramedic
            const tx = await patientStorage.connect(patient1).createDelegationPolicy(
                paramedic1.address,
                "vitals",
                "read",
                24 * 60 * 60 // 24 hours validity
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'PolicyCreated');
            const policyID = event.args.policyID;
            
            // Get and verify the policy
            const [id, delegator, delegatee, dataID, permission, isActive, validUntil] =
                await patientStorage.getPolicy(policyID);
                
            expect(id).to.equal(policyID);
            expect(delegator).to.equal(patient1.address);
            expect(delegatee).to.equal(paramedic1.address);
            expect(dataID).to.equal("vitals");
            expect(permission).to.equal("read");
            expect(isActive).to.be.true;
        });

        it("Should allow updating policy status", async function () {
            // Patient creates a delegation policy for paramedic
            const tx = await patientStorage.connect(patient1).createDelegationPolicy(
                paramedic1.address,
                "vitals",
                "read",
                24 * 60 * 60 // 24 hours validity
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'PolicyCreated');
            const policyID = event.args.policyID;
            
            // Deactivate the policy
            await patientStorage.connect(patient1).updatePolicy(policyID, false);
            
            // Verify the policy is inactive
            const [id, delegator, delegatee, dataID, permission, isActive, validUntil] =
                await patientStorage.getPolicy(policyID);
            
            expect(isActive).to.be.false;
        });

        it("Should allow delegated emergency access with valid policy", async function () {
            // Patient creates a delegation policy for paramedic
            const tx = await patientStorage.connect(patient1).createDelegationPolicy(
                paramedic1.address,
                "vitals",
                "read",
                24 * 60 * 60 // 24 hours validity
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'PolicyCreated');
            const policyID = event.args.policyID;
            
            // Paramedic requests emergency access
            const zkProof = ethers.utils.randomBytes(32);
            const roleHash = await rbac.getRoleCredential(paramedic1.address);
            const proofHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [roleHash, zkProof])
            );
            
            await zkpVerifier.connect(paramedic1).submitProof(proofHash);
            
            await patientStorage.connect(paramedic1).requestDelegatedEmergencyAccess(
                patient1.address,
                "Emergency situation",
                zkProof,
                policyID
            );

            // Check emergency access status
            const [granted, expiry, reason, accessPolicyID] = await patientStorage.checkDelegatedEmergencyAccess(
                paramedic1.address,
                patient1.address
            );

            expect(granted).to.be.true;
            expect(reason).to.equal("Emergency situation");
            expect(accessPolicyID).to.equal(policyID);
            expect(expiry).to.be.gt(0);
        });

        it("Should prevent delegated emergency access with inactive policy", async function () {
            // Patient creates a delegation policy for paramedic
            const tx = await patientStorage.connect(patient1).createDelegationPolicy(
                paramedic1.address,
                "vitals",
                "read",
                24 * 60 * 60 // 24 hours validity
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'PolicyCreated');
            const policyID = event.args.policyID;
            
            // Deactivate the policy
            await patientStorage.connect(patient1).updatePolicy(policyID, false);
            
            // Paramedic tries to request emergency access
            const zkProof = ethers.utils.randomBytes(32);
            const roleHash = await rbac.getRoleCredential(paramedic1.address);
            const proofHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [roleHash, zkProof])
            );
            
            await zkpVerifier.connect(paramedic1).submitProof(proofHash);
            
            // Should fail because policy is inactive
            await expect(
                patientStorage.connect(paramedic1).requestDelegatedEmergencyAccess(
                    patient1.address,
                    "Emergency situation",
                    zkProof,
                    policyID
                )
            ).to.be.revertedWith("Policy not active");
        });

        it("Should revoke delegated emergency access", async function () {
            // Patient creates a delegation policy for paramedic
            const tx = await patientStorage.connect(patient1).createDelegationPolicy(
                paramedic1.address,
                "vitals",
                "read",
                24 * 60 * 60 // 24 hours validity
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'PolicyCreated');
            const policyID = event.args.policyID;
            
            // Paramedic requests emergency access
            const zkProof = ethers.utils.randomBytes(32);
            const roleHash = await rbac.getRoleCredential(paramedic1.address);
            const proofHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [roleHash, zkProof])
            );
            
            await zkpVerifier.connect(paramedic1).submitProof(proofHash);
            
            await patientStorage.connect(paramedic1).requestDelegatedEmergencyAccess(
                patient1.address,
                "Emergency situation",
                zkProof,
                policyID
            );

            // Patient revokes emergency access
            await patientStorage.connect(patient1).revokeDelegatedEmergencyAccess(paramedic1.address);
            
            // Check emergency access status after revocation
            const [granted, , , ] = await patientStorage.checkDelegatedEmergencyAccess(
                paramedic1.address,
                patient1.address
            );

            expect(granted).to.be.false;
        });
    });

    describe("Audit Logging", function () {
        it("Should log delegated emergency access events", async function () {
            // Patient creates a delegation policy for paramedic
            const tx = await patientStorage.connect(patient1).createDelegationPolicy(
                paramedic1.address,
                "vitals",
                "read",
                24 * 60 * 60 // 24 hours validity
            );
            
            const receipt = await tx.wait();
            const event = receipt.events.find(e => e.event === 'PolicyCreated');
            const policyID = event.args.policyID;
            
            // Paramedic requests emergency access
            const zkProof = ethers.utils.randomBytes(32);
            const roleHash = await rbac.getRoleCredential(paramedic1.address);
            const proofHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [roleHash, zkProof])
            );
            
            await zkpVerifier.connect(paramedic1).submitProof(proofHash);
            
            await patientStorage.connect(paramedic1).requestDelegatedEmergencyAccess(
                patient1.address,
                "Emergency situation",
                zkProof,
                policyID
            );

            const logs = await auditLog.getPatientAccessRecords(patient1.address);
            const emergencyLogs = logs.filter(log => log.isEmergency);
            
            expect(emergencyLogs.length).to.be.gt(0);
            expect(emergencyLogs[emergencyLogs.length - 1].user).to.equal(paramedic1.address);
            expect(emergencyLogs[emergencyLogs.length - 1].isEmergency).to.be.true;
        });
    });
});