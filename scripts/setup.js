const { ethers } = require("hardhat");

async function main() {
    console.log("Starting initial setup...");

    // Get contract addresses from deployment
    const DEPLOYED_ADDRESSES = {
        zkpVerifier: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        rbac: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        didRegistry: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        auditLog: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
        patientStorage: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707"
    };

    // Get contract instances
    const rbac = await ethers.getContractAt("EnhancedRBAC", DEPLOYED_ADDRESSES.rbac);
    const didRegistry = await ethers.getContractAt("DIDRegistry", DEPLOYED_ADDRESSES.didRegistry);
    const zkpVerifier = await ethers.getContractAt("ZKPVerifier", DEPLOYED_ADDRESSES.zkpVerifier);

    // Get signers for different roles
    const [owner, doctor1, doctor2, nurse1, patient1, paramedic1] = await ethers.getSigners();
    console.log("\nSetting up roles for addresses:");
    console.log("Owner:", owner.address);
    console.log("Doctor 1:", doctor1.address);
    console.log("Doctor 2:", doctor2.address);
    console.log("Nurse:", nurse1.address);
    console.log("Patient:", patient1.address);
    console.log("Paramedic:", paramedic1.address);

    // Create DIDs for each role
    console.log("\nCreating DIDs...");
    const dids = {
        doctor1: `did:ethr:${doctor1.address}`,
        doctor2: `did:ethr:${doctor2.address}`,
        nurse1: `did:ethr:${nurse1.address}`,
        patient1: `did:ethr:${patient1.address}`,
        paramedic1: `did:ethr:${paramedic1.address}`
    };

    for (const [user, did] of Object.entries(dids)) {
        console.log(`Creating DID for ${user}...`);
        await didRegistry.connect(eval(user)).createDID(did, []);
        console.log(`DID created: ${did}`);
    }

    // Setup role credentials
    console.log("\nSetting up role credentials...");
    const roleCredentials = {
        doctor1: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("doctor1_CREDENTIAL")),
        doctor2: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("doctor2_CREDENTIAL")),
        nurse1: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("nurse1_CREDENTIAL")),
        paramedic1: ethers.utils.keccak256(ethers.utils.toUtf8Bytes("paramedic1_CREDENTIAL"))
    };

    // Submit proofs for each role
    for (const [user, credential] of Object.entries(roleCredentials)) {
        console.log(`Submitting proof for ${user}...`);
        await zkpVerifier.connect(eval(user)).submitProof(credential);
    }

    // Assign roles (validity period of 1 year)
    console.log("\nAssigning roles...");
    const ONE_YEAR = 365 * 24 * 60 * 60;
    
    // Role enum: None = 0, Patient = 1, Nurse = 2, Paramedic = 3, Doctor = 4, Admin = 5, Auditor = 6
    const roleAssignments = [
        { user: doctor1, role: 4, credential: roleCredentials.doctor1, did: dids.doctor1 },
        { user: doctor2, role: 4, credential: roleCredentials.doctor2, did: dids.doctor2 },
        { user: nurse1, role: 2, credential: roleCredentials.nurse1, did: dids.nurse1 },
        { user: paramedic1, role: 3, credential: roleCredentials.paramedic1, did: dids.paramedic1 }
    ];

    for (const assignment of roleAssignments) {
        console.log(`Assigning role ${assignment.role} to ${assignment.user.address}...`);
        await rbac.connect(owner).assignRole(
            assignment.user.address,
            assignment.role,
            assignment.credential,
            assignment.did,
            ONE_YEAR
        );
    }

    // Grant permissions
    console.log("\nGranting permissions...");
    const permissions = {
        doctor: ["view_data", "update_data", "create_record"],
        nurse: ["view_data", "update_data"],
        paramedic: ["request_emergency"]
    };

    // Grant doctor permissions
    for (const permission of permissions.doctor) {
        await rbac.connect(owner).grantPermission(doctor1.address, permission);
        await rbac.connect(owner).grantPermission(doctor2.address, permission);
        console.log(`Granted ${permission} to doctors`);
    }

    // Grant nurse permissions
    for (const permission of permissions.nurse) {
        await rbac.connect(owner).grantPermission(nurse1.address, permission);
        console.log(`Granted ${permission} to nurse`);
    }

    // Grant paramedic permissions
    for (const permission of permissions.paramedic) {
        await rbac.connect(owner).grantPermission(paramedic1.address, permission);
        console.log(`Granted ${permission} to paramedic`);
    }

    // Verify setup
    console.log("\nVerifying setup...");
    
    // Verify roles
    const doctor1Role = await rbac.getUserRole(doctor1.address);
    const nurseRole = await rbac.getUserRole(nurse1.address);
    const paramedicRole = await rbac.getUserRole(paramedic1.address);

    console.log("Role verification:");
    console.log("Doctor 1 role:", doctor1Role.toString());
    console.log("Nurse role:", nurseRole.toString());
    console.log("Paramedic role:", paramedicRole.toString());

    // Verify permissions
    const doctor1ViewPermission = await rbac.hasPermission(doctor1.address, "view_data");
    const nurseUpdatePermission = await rbac.hasPermission(nurse1.address, "update_data");

    console.log("\nPermission verification:");
    console.log("Doctor 1 view permission:", doctor1ViewPermission);
    console.log("Nurse update permission:", nurseUpdatePermission);

    console.log("\nInitial setup completed successfully!");
}

// Execute the setup
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });