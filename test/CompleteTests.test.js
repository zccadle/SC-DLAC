const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DACEMS System", function () {
    let PatientDataStorage, EnhancedRBAC, EnhancedAuditLog, DIDRegistry, ZKPVerifier;
    let patientStorage, rbac, auditLog, didRegistry, zkpVerifier;
    let owner, doctor1, doctor2, nurse1, patient1, patient2, paramedic1, admin;

    beforeEach(async function () {
        // Get signers for different roles
        [owner, doctor1, doctor2, nurse1, patient1, patient2, paramedic1, admin] = await ethers.getSigners();

        // Deploy contracts
        ZKPVerifier = await ethers.getContractFactory("ZKPVerifier");
        DIDRegistry = await ethers.getContractFactory("DIDRegistry");
        EnhancedRBAC = await ethers.getContractFactory("EnhancedRBAC");
        EnhancedAuditLog = await ethers.getContractFactory("EnhancedAuditLog");
        PatientDataStorage = await ethers.getContractFactory("UpdatedPatientDataStorage");

        // Deploy and link contracts
        zkpVerifier = await ZKPVerifier.deploy();
        didRegistry = await DIDRegistry.deploy();
        rbac = await EnhancedRBAC.deploy(didRegistry.address, zkpVerifier.address);
        auditLog = await EnhancedAuditLog.deploy();
        patientStorage = await PatientDataStorage.deploy(
            rbac.address,
            auditLog.address,
            didRegistry.address,
            zkpVerifier.address
        );

        // Setup initial roles and DIDs
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

        // Register DIDs and setup roles
        for (const [user, did] of Object.entries(dids)) {
            await didRegistry.connect(eval(user)).createDID(did, []);
            const roleCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`${user}_CREDENTIAL`));
            await zkpVerifier.connect(eval(user)).submitProof(roleCredential);
        }

        // Assign roles with appropriate permissions
        await rbac.connect(admin).assignRole(doctor1.address, 3, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("doctor1_CREDENTIAL")), dids.doctor1, 365 * 24 * 60 * 60);
        await rbac.connect(admin).assignRole(paramedic1.address, 2, ethers.utils.keccak256(ethers.utils.toUtf8Bytes("paramedic1_CREDENTIAL")), dids.paramedic1, 365 * 24 * 60 * 60);
    }

    describe("Role and Permission Management", function () {
        it("Should correctly assign and verify roles", async function () {
            const role = await rbac.getUserRole(doctor1.address);
            expect(role).to.equal(3); // Doctor role
        });

        it("Should handle permission assignments correctly", async function () {
            await rbac.connect(admin).grantPermission(doctor1.address, "view_data");
            expect(await rbac.hasPermission(doctor1.address, "view_data")).to.be.true;
        });
    });

    describe("Emergency Access System", function () {
        beforeEach(async function () {
            await patientStorage.connect(doctor1).createPatientRecord(patient1.address);
        });

        it("Should grant emergency access with proper verification", async function () {
            const zkProof = ethers.utils.randomBytes(32);
            await patientStorage.connect(doctor1).requestEmergencyAccess(
                patient1.address,
                "Critical emergency",
                zkProof
            );
            
            const access = await patientStorage.checkEmergencyAccess(doctor1.address, patient1.address);
            expect(access.granted).to.be.true;
        });

        it("Should enforce emergency access time limits", async function () {
            const zkProof = ethers.utils.randomBytes(32);
            await patientStorage.connect(doctor1).requestEmergencyAccess(
                patient1.address,
                "Time-sensitive emergency",
                zkProof
            );

            // Advance time by 25 hours
            await time.increase(25 * 60 * 60);

            // Try to access data after time limit
            await expect(
                patientStorage.connect(doctor1).getPatientData(
                    patient1.address,
                    "allergies",
                    zkProof
                )
            ).to.be.revertedWith("No valid access rights");
        });
    });

    describe("Audit Logging", function () {
        it("Should log all access attempts", async function () {
            const zkProof = ethers.utils.randomBytes(32);
            
            // Create record and request emergency access
            await patientStorage.connect(doctor1).createPatientRecord(patient1.address);
            await patientStorage.connect(doctor1).requestEmergencyAccess(
                patient1.address,
                "Emergency situation",
                zkProof
            );

            // Get audit logs
            const logs = await auditLog.getPatientAccessRecords(patient1.address);
            expect(logs.length).to.be.above(0);
            expect(logs[logs.length - 1].isEmergency).to.be.true;
        });
    });

    describe("Data Privacy and Security", function () {
        beforeEach(async function () {
            await patientStorage.connect(doctor1).createPatientRecord(patient1.address);
        });

        it("Should maintain data privacy with proper encryption", async function () {
            const zkProof = ethers.utils.randomBytes(32);
            const encryptedData = ethers.utils.hexlify(ethers.utils.randomBytes(32));
            
            await patientStorage.connect(doctor1).updatePatientData(
                patient1.address,
                "medications",
                encryptedData,
                zkProof
            );

            const retrievedData = await patientStorage.connect(doctor1).getPatientData(
                patient1.address,
                "medications",
                zkProof
            );
            expect(retrievedData).to.equal(encryptedData);
        });

        it("Should prevent unauthorized data access", async function () {
            const zkProof = ethers.utils.randomBytes(32);
            await expect(
                patientStorage.connect(nurse1).getPatientData(
                    patient1.address,
                    "medications",
                    zkProof
                )
            ).to.be.reverted;
        });
    });

    describe("DID Verification", function () {
        it("Should verify DID ownership", async function () {
            const did = await didRegistry.getDIDByAddress(doctor1.address);
            expect(did).to.equal(`did:ethr:${doctor1.address}`);
        });

        it("Should prevent actions with invalid DID", async function () {
            const zkProof = ethers.utils.randomBytes(32);
            await expect(
                patientStorage.connect(owner).createPatientRecord(patient2.address)
            ).to.be.revertedWith("Provider DID not found");
        });
    });
});