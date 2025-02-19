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
        await rbac.connect(owner).assignRole(doctor1.address, 3, doctor1Credential, dids.doctor1, 365 * 24 * 60 * 60);
        await rbac.connect(owner).assignRole(doctor2.address, 3, doctor2Credential, dids.doctor2, 365 * 24 * 60 * 60);
        await rbac.connect(owner).assignRole(nurse1.address, 2, nurse1Credential, dids.nurse1, 365 * 24 * 60 * 60);
        await rbac.connect(owner).assignRole(paramedic1.address, 4, paramedic1Credential, dids.paramedic1, 365 * 24 * 60 * 60);

        // Grant permissions
        await rbac.connect(owner).grantPermission(doctor1.address, "view_data");
        await rbac.connect(owner).grantPermission(doctor1.address, "update_data");
        await rbac.connect(owner).grantPermission(doctor1.address, "create_record");
        await rbac.connect(owner).grantPermission(nurse1.address, "view_data");
        await rbac.connect(owner).grantPermission(nurse1.address, "update_data");

        // Create patient records
        await patientStorage.connect(doctor1).createPatientRecord(patient1.address);
        await patientStorage.connect(doctor1).createPatientRecord(patient2.address);
    }

    describe("Role and Permission Management", function () {
        it("Should correctly assign and verify roles", async function () {
            const doctorRole = await rbac.getUserRole(doctor1.address);
            const nurseRole = await rbac.getUserRole(nurse1.address);
            const paramedicRole = await rbac.getUserRole(paramedic1.address);
            
            expect(doctorRole).to.equal(3); // Doctor role
            expect(nurseRole).to.equal(2); // Nurse role
            expect(paramedicRole).to.equal(4); // Paramedic role
        });

        it("Should properly grant and check permissions", async function () {
            const doctorViewPermission = await rbac.hasPermission(doctor1.address, "view_data");
            const nurseViewPermission = await rbac.hasPermission(nurse1.address, "view_data");
            const paramedicViewPermission = await rbac.hasPermission(paramedic1.address, "view_data");

            expect(doctorViewPermission).to.be.true;
            expect(nurseViewPermission).to.be.true;
            expect(paramedicViewPermission).to.be.false;
        });
    });

    describe("Regular Medical Data Access", function () {
        it("Should allow authorized personnel to update patient data", async function () {
            // Get the role credential
            const roleHash = await rbac.getRoleCredential(doctor1.address);
            
            // Create a zkProof (in real system this would be an actual ZK proof)
            const zkProof = ethers.utils.randomBytes(32);
            
            // Create proof hash exactly as the contract does
            const proofHash = ethers.utils.keccak256(
                ethers.utils.solidityPack(['bytes32', 'bytes'], [roleHash, zkProof])
            );
            
            // Submit the proof
            await zkpVerifier.connect(doctor1).submitProof(proofHash);
            
            // Update patient data
            await expect(
                patientStorage.connect(doctor1).updatePatientData(
                    patient1.address,
                    "vitals",
                    "encrypted_vitals_data",
                    zkProof
                )
            ).to.not.be.reverted;
        });

        it("Should prevent unauthorized access to patient data", async function () {
            const roleHash = await rbac.getRoleCredential(paramedic1.address);
            const zkProof = ethers.utils.randomBytes(32);
            const proofHash = ethers.utils.keccak256(
                ethers.utils.solidityPack(['bytes32', 'bytes'], [roleHash, zkProof])
            );
            
            await zkpVerifier.connect(paramedic1).submitProof(proofHash);
            
            await expect(
                patientStorage.connect(paramedic1).updatePatientData(
                    patient1.address,
                    "vitals",
                    "encrypted_vitals_data",
                    zkProof
                )
            ).to.be.reverted;
        });
    });

    describe("Emergency Access Flow", function () {
        it("Should grant emergency access to doctor", async function () {
            const zkProof = ethers.utils.randomBytes(32);
            const roleHash = await rbac.getRoleCredential(doctor1.address);
            const proofHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ['bytes32', 'bytes'],
                    [roleHash, zkProof]
                )
            );
            
            await zkpVerifier.connect(doctor1).submitProof(proofHash);
            
            await patientStorage.connect(doctor1).requestEmergencyAccess(
                patient1.address,
                "Emergency situation",
                zkProof
            );

            const [granted, expiry, reason] = await patientStorage.checkEmergencyAccess(
                doctor1.address,
                patient1.address
            );

            expect(granted).to.be.true;
            expect(reason).to.equal("Emergency situation");
            expect(expiry).to.be.gt(0);
        });

        it("Should allow emergency data access and then revoke it", async function () {
            // Grant emergency access
            const zkProof = ethers.utils.randomBytes(32);
            const roleHash = await rbac.getRoleCredential(doctor2.address);
            const proofHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ['bytes32', 'bytes'],
                    [roleHash, zkProof]
                )
            );
            
            await zkpVerifier.connect(doctor2).submitProof(proofHash);
            
            await patientStorage.connect(doctor2).requestEmergencyAccess(
                patient1.address,
                "Emergency situation",
                zkProof
            );

            // Verify access
            const [granted] = await patientStorage.checkEmergencyAccess(
                doctor2.address,
                patient1.address
            );
            expect(granted).to.be.true;

            // Revoke access
            await patientStorage.connect(patient1).revokeEmergencyAccess(doctor2.address);

            // Verify access is revoked
            const [grantedAfterRevoke] = await patientStorage.checkEmergencyAccess(
                doctor2.address,
                patient1.address
            );
            expect(grantedAfterRevoke).to.be.false;
        });

        it("Should allow paramedics to request emergency access", async function () {
            const zkProof = ethers.utils.randomBytes(32);
            const roleHash = await rbac.getRoleCredential(paramedic1.address);
            const proofHash = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ['bytes32', 'bytes'],
                    [roleHash, zkProof]
                )
            );
            
            await zkpVerifier.connect(paramedic1).submitProof(proofHash);
            
            await patientStorage.connect(paramedic1).requestEmergencyAccess(
                patient1.address,
                "Ambulance emergency",
                zkProof
            );

            const [granted, , reason] = await patientStorage.checkEmergencyAccess(
                paramedic1.address,
                patient1.address
            );

            expect(granted).to.be.true;
            expect(reason).to.equal("Ambulance emergency");
        });
    });

    describe("Audit Logging", function () {
        it("Should maintain complete access history", async function () {
            const initialLogCount = (await auditLog.getPatientAccessRecords(patient1.address)).length;

            // Regular access
            const roleHash1 = await rbac.getRoleCredential(doctor1.address);
            const zkProof1 = ethers.utils.randomBytes(32);
            const proofHash1 = ethers.utils.keccak256(
                ethers.utils.solidityPack(['bytes32', 'bytes'], [roleHash1, zkProof1])
            );
            
            await zkpVerifier.connect(doctor1).submitProof(proofHash1);
            
            await patientStorage.connect(doctor1).updatePatientData(
                patient1.address,
                "notes",
                "encrypted_notes_data",
                zkProof1
            );

            // Emergency access - using abi.encode for emergency access
            const roleHash2 = await rbac.getRoleCredential(paramedic1.address);
            const zkProof2 = ethers.utils.randomBytes(32);
            const proofHash2 = ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [roleHash2, zkProof2])
            );
            
            await zkpVerifier.connect(paramedic1).submitProof(proofHash2);
            
            await patientStorage.connect(paramedic1).requestEmergencyAccess(
                patient1.address,
                "Emergency situation",
                zkProof2
            );

            const finalLogs = await auditLog.getPatientAccessRecords(patient1.address);
            expect(finalLogs.length).to.equal(initialLogCount + 2);
        });
    });
});