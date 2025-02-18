const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("DACEMS System", function () {
    let PatientDataStorage, EnhancedRBAC, EnhancedAuditLog, DIDRegistry, ZKPVerifier;
    let patientStorage, rbac, auditLog, didRegistry, zkpVerifier;
    let owner, doctor1, doctor2, nurse1, patient1, patient2, paramedic1, admin;

    before(async function () {
        [owner, doctor1, doctor2, nurse1, patient1, patient2, paramedic1, admin] = await ethers.getSigners();
    });

    beforeEach(async function () {
        try {
            console.log("Starting contract deployment...");

            // Deploy ZKPVerifier
            const ZKPVerifierFactory = await ethers.getContractFactory("ZKPVerifier");
            zkpVerifier = await ZKPVerifierFactory.deploy();
            await zkpVerifier.deployed();
            console.log("ZKPVerifier deployed to:", zkpVerifier.address);

            // Deploy RBAC
            const EnhancedRBACFactory = await ethers.getContractFactory("EnhancedRBAC");
            rbac = await EnhancedRBACFactory.deploy(ethers.constants.AddressZero, zkpVerifier.address);
            await rbac.deployed();
            console.log("EnhancedRBAC deployed to:", rbac.address);

            // Deploy DIDRegistry
            const DIDRegistryFactory = await ethers.getContractFactory("DIDRegistry");
            didRegistry = await DIDRegistryFactory.deploy(rbac.address);
            await didRegistry.deployed();
            console.log("DIDRegistry deployed to:", didRegistry.address);

            // Update RBAC with DIDRegistry
            await rbac.updateDIDRegistry(didRegistry.address);
            console.log("RBAC updated with DIDRegistry address");

            // Deploy AuditLog
            const EnhancedAuditLogFactory = await ethers.getContractFactory("EnhancedAuditLog");
            auditLog = await EnhancedAuditLogFactory.deploy();
            await auditLog.deployed();
            console.log("EnhancedAuditLog deployed to:", auditLog.address);

            // Deploy PatientDataStorage
            const PatientDataStorageFactory = await ethers.getContractFactory("UpdatedPatientDataStorage");
            patientStorage = await PatientDataStorageFactory.deploy(
                rbac.address,
                auditLog.address,
                didRegistry.address,
                zkpVerifier.address
            );
            await patientStorage.deployed();
            console.log("PatientDataStorage deployed to:", patientStorage.address);

            // Setup initial roles and DIDs
            await setupSystem();
            console.log("System setup completed");
        } catch (error) {
            console.error("Deployment error:", error);
            throw error;
        }
    });

    async function setupSystem() {
        try {
            console.log("Starting system setup...");
            
            // Setup DIDs
            const dids = {
                admin: `did:ethr:${admin.address}`,
                doctor1: `did:ethr:${doctor1.address}`,
                doctor2: `did:ethr:${doctor2.address}`,
                nurse1: `did:ethr:${nurse1.address}`,
                patient1: `did:ethr:${patient1.address}`,
                patient2: `did:ethr:${patient2.address}`,
                paramedic1: `did:ethr:${paramedic1.address}`
            };

            // Create admin DID and role first
            await didRegistry.connect(admin).createDID(dids.admin, []);
            const adminCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_CREDENTIAL"));
            await zkpVerifier.connect(admin).submitProof(adminCredential);
            
            // Setup admin using owner account
            await rbac.connect(owner).setupAdmin(
                admin.address,
                adminCredential,
                dids.admin,
                365 * 24 * 60 * 60 // 1 year validity
            );
            console.log("Admin setup completed");

            // Setup other users
            const users = {
                doctor1: { role: 3, credential: "DOCTOR1_CREDENTIAL" },
                doctor2: { role: 3, credential: "DOCTOR2_CREDENTIAL" },
                nurse1: { role: 2, credential: "NURSE1_CREDENTIAL" },
                paramedic1: { role: 4, credential: "PARAMEDIC1_CREDENTIAL" },
                patient1: { role: 1, credential: "PATIENT1_CREDENTIAL" },
                patient2: { role: 1, credential: "PATIENT2_CREDENTIAL" }
            };

            for (const [user, info] of Object.entries(users)) {
                const userAccount = eval(user);
                console.log(`Setting up ${user}...`);

                // Create DID
                await didRegistry.connect(userAccount).createDID(dids[user], []);
                console.log(`DID created for ${user}`);

                // Submit proof
                const roleCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(info.credential));
                await zkpVerifier.connect(userAccount).submitProof(roleCredential);
                console.log(`Proof submitted for ${user}`);

                // Assign role
                await rbac.connect(admin).assignRole(
                    userAccount.address,
                    info.role,
                    roleCredential,
                    dids[user],
                    365 * 24 * 60 * 60
                );
                console.log(`Role assigned for ${user}`);

                // Grant basic permissions
                if (info.role === 3) { // Doctor
                    await rbac.connect(admin).grantPermission(userAccount.address, "view_data");
                    await rbac.connect(admin).grantPermission(userAccount.address, "update_data");
                    await rbac.connect(admin).grantPermission(userAccount.address, "create_record");
                }
            }
            console.log("All users setup completed");

        } catch (error) {
            console.error("Setup error:", error);
            throw error;
        }
    }

    describe("Role and Permission Management", function () {
        it("Should correctly assign and verify roles", async function () {
            const role = await rbac.getUserRole(doctor1.address);
            expect(role).to.equal(3); // Doctor role
            console.log("Role verification test passed");
        });

        it("Should properly grant and check permissions", async function () {
            const hasPermission = await rbac.hasPermission(doctor1.address, "view_data");
            expect(hasPermission).to.be.true;
        });
    });

    describe("Emergency Access", function () {
        beforeEach(async function () {
            // Create patient record
            const zkProof = ethers.utils.randomBytes(32);
            await patientStorage.connect(doctor1).createPatientRecord(patient1.address);
        });

        it("Should grant emergency access to doctor", async function () {
            const zkProof = ethers.utils.randomBytes(32);
            await patientStorage.connect(doctor1).requestEmergencyAccess(
                patient1.address,
                "Emergency situation",
                zkProof
            );

            const accessStatus = await patientStorage.checkEmergencyAccess(
                doctor1.address,
                patient1.address
            );
            expect(accessStatus[0]).to.be.true; // granted
        });
    });

    describe("DID Verification", function () {
        it("Should correctly store and retrieve DIDs", async function () {
            const doctorDID = await didRegistry.getDIDByAddress(doctor1.address);
            expect(doctorDID).to.equal(`did:ethr:${doctor1.address}`);
        });
    });

    describe("Audit Logging", function () {
        it("Should log emergency access events", async function () {
            const zkProof = ethers.utils.randomBytes(32);
            await patientStorage.connect(doctor1).createPatientRecord(patient1.address);
            await patientStorage.connect(doctor1).requestEmergencyAccess(
                patient1.address,
                "Emergency test",
                zkProof
            );

            const logs = await auditLog.getPatientAccessRecords(patient1.address);
            expect(logs.length).to.be.above(0);
        });
    });
});