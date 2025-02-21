const { ethers } = require("hardhat");

async function main() {
    console.log("Starting initial setup with delegation support...");

    // Get contract addresses from deployment
    const DEPLOYED_ADDRESSES = {
        zkpVerifier: "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1",
        rbac: "0x9A9f2CCfdE556A7E9Ff0848998Aa4a0CFD8863AE",
        didRegistry: "0x68B1D87F95878fE05B998F19b66F4baba5De1aed",
        auditLog: "0xc6e7DF5E7b4f2A278906862b61205850344D4e7d",
        patientStorage: "0x59b670e9fA9D0A427751Af201D676719a970857b"
    };

    // Get contract instances
    const rbac = await ethers.getContractAt("EnhancedRBAC", DEPLOYED_ADDRESSES.rbac);
    const didRegistry = await ethers.getContractAt("DIDRegistry", DEPLOYED_ADDRESSES.didRegistry);
    const zkpVerifier = await ethers.getContractAt("ZKPVerifier", DEPLOYED_ADDRESSES.zkpVerifier);
    const patientStorage = await ethers.getContractAt("UpdatedPatientDataStorage", DEPLOYED_ADDRESSES.patientStorage);

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

    // Set up role credentials
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

    // Verify roles are created correctly
    console.log("\nVerifying roles in the system...");
    const allRoles = await rbac.getAllRoles();
    console.log("Available roles:", allRoles);

    // Assign roles (validity period of 1 year)
    console.log("\nAssigning roles...");
    const ONE_YEAR = 365 * 24 * 60 * 60;
    
    // Role assignments with delegation flag
    const roleAssignments = [
        { user: doctor1, roleID: "DOCTOR", credential: roleCredentials.doctor1, did: dids.doctor1, isDelegated: false },
        { user: doctor2, roleID: "DOCTOR", credential: roleCredentials.doctor2, did: dids.doctor2, isDelegated: false },
        { user: nurse1, roleID: "NURSE", credential: roleCredentials.nurse1, did: dids.nurse1, isDelegated: false },
        { user: paramedic1, roleID: "PARAMEDIC", credential: roleCredentials.paramedic1, did: dids.paramedic1, isDelegated: true }
    ];

    for (const assignment of roleAssignments) {
        console.log(`Assigning role ${assignment.roleID} to ${assignment.user.address}...`);
        await rbac.connect(owner).assignRole(
            assignment.user.address,
            assignment.roleID,
            assignment.credential,
            assignment.did,
            ONE_YEAR,
            assignment.isDelegated
        );
    }

    // Grant permissions to roles
    console.log("\nGranting permissions...");
    const permissions = {
        DOCTOR: ["view_data", "update_data", "create_record"],
        NURSE: ["view_data", "update_data"],
        PARAMEDIC: ["request_emergency"]
    };

    // Grant permissions to roles
    for (const [role, rolePermissions] of Object.entries(permissions)) {
        for (const permission of rolePermissions) {
            await rbac.connect(owner).grantPermission(role, permission);
            console.log(`Granted ${permission} to ${role} role`);
        }
    }

    // Create patient record
    console.log("\nCreating patient record...");
    await patientStorage.connect(doctor1).createPatientRecord(patient1.address);
    console.log(`Patient record created for ${patient1.address}`);

    // Create delegation policies
    console.log("\nCreating delegation policies...");
    
    // Patient creates delegation policy for paramedic (24 hour validity)
    const tx = await patientStorage.connect(patient1).createDelegationPolicy(
        paramedic1.address,
        "vitals",
        "read",
        24 * 60 * 60
    );
    
    const receipt = await tx.wait();
    const event = receipt.events.find(e => e.event === 'PolicyCreated');
    const policyID = event.args.policyID;
    
    console.log(`Policy created: ID ${policyID}, Delegator: ${patient1.address}, Delegatee: ${paramedic1.address}`);

    // Verify policy
    const [id, delegator, delegatee, dataID, permission, isActive, validUntil] = 
        await patientStorage.getPolicy(policyID);
    
    console.log("\nVerifying policy details:");
    console.log(`- ID: ${id}`);
    console.log(`- Delegator: ${delegator}`);
    console.log(`- Delegatee: ${delegatee}`);
    console.log(`- Data ID: ${dataID}`);
    console.log(`- Permission: ${permission}`);
    console.log(`- Active: ${isActive}`);
    console.log(`- Valid until: ${new Date(validUntil * 1000).toLocaleString()}`);

    console.log("\nInitial setup completed successfully!");
}

// Execute the setup
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });