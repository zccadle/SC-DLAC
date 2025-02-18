// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IEnhancedRBAC.sol";
import "./EnhancedAuditLog.sol";
import "./IDIDRegistry.sol";
import "./ZKPVerifier.sol";

contract UpdatedPatientDataStorage {
    IEnhancedRBAC public accessControl;
    EnhancedAuditLog public auditLog;
    IDIDRegistry public didRegistry;
    ZKPVerifier public zkpVerifier;

    struct PatientRecord {
        string encryptedData;
        bool exists;
        mapping(string => string) dataCategories;
        mapping(address => EmergencyAccess) emergencyAccess;
        string did;  // Patient's DID
    }

    struct EmergencyAccess {
        bool granted;
        uint256 expiryTime;
        string reason;
        bytes32 accessProof;  // ZKP proof hash
    }

    mapping(address => PatientRecord) private patientRecords;
    
    uint256 public constant EMERGENCY_ACCESS_DURATION = 24 hours;

    event PatientDataUpdated(address indexed patient, string category);
    event EmergencyAccessGranted(
        address indexed provider,
        address indexed patient,
        uint256 expiryTime
    );
    event EmergencyAccessRevoked(
        address indexed provider,
        address indexed patient
    );

    constructor(
        address _rbacAddress,
        address _auditLogAddress,
        address _didRegistryAddress,
        address _zkpVerifierAddress
    ) {
        accessControl = IEnhancedRBAC(_rbacAddress);
        auditLog = EnhancedAuditLog(_auditLogAddress);
        didRegistry = IDIDRegistry(_didRegistryAddress);
        zkpVerifier = ZKPVerifier(_zkpVerifierAddress);
    }

    function createPatientRecord(address patient) 
        public 
    {
        string memory providerDID = didRegistry.getDIDByAddress(msg.sender);
        require(bytes(providerDID).length > 0, "Provider DID not found");
        require(accessControl.hasPermission(msg.sender, "create_record"), "Unauthorized access");
        require(!patientRecords[patient].exists, "Patient record already exists");

        patientRecords[patient].exists = true;
        patientRecords[patient].did = didRegistry.getDIDByAddress(patient);

        auditLog.logAccess(
            msg.sender,
            patient,
            "create_record",
            "New patient record created",
            false
        );
    }

function updatePatientData(
    address patient,
    string memory category,
    string memory encryptedData,
    bytes memory zkProof
) 
    public 
{
    // Verify DID and role
    string memory providerDID = didRegistry.getDIDByAddress(msg.sender);
    require(bytes(providerDID).length > 0, "Provider DID not found");
    
    bytes32 roleHash = accessControl.getRoleCredential(msg.sender);
    require(
        zkpVerifier.verifyProof(msg.sender, roleHash, zkProof), // Changed from validateProof to verifyProof
        "Invalid role proof"
    );

    require(accessControl.hasPermission(msg.sender, "update_data"), "Unauthorized access");
    require(patientRecords[patient].exists, "Patient record not found");
    
    patientRecords[patient].dataCategories[category] = encryptedData;
    
    emit PatientDataUpdated(patient, category);
    auditLog.logAccess(
        msg.sender,
        patient,
        "update_data",
        string(abi.encodePacked("Updated ", category)),
        false
    );
}

    function requestEmergencyAccess(
        address patient,
        string memory reason,
        bytes memory zkProof
    ) 
        public 
    {
        // Verify DID
        string memory providerDID = didRegistry.getDIDByAddress(msg.sender);
        require(bytes(providerDID).length > 0, "Provider DID not found");
        
        // Verify role proof
        bytes32 roleHash = accessControl.getRoleCredential(msg.sender);
        require(
            zkpVerifier.verifyProof(msg.sender, roleHash, zkProof),
            "Invalid role proof"
        );

        require(
            accessControl.getUserRole(msg.sender) == IEnhancedRBAC.Role.Doctor ||
            accessControl.getUserRole(msg.sender) == IEnhancedRBAC.Role.Paramedic,
            "Only doctors or paramedics can request emergency access"
        );

        require(patientRecords[patient].exists, "Patient record not found");

        // Generate proof hash for this emergency access
        bytes32 accessProof = keccak256(
            abi.encodePacked(
                msg.sender,
                patient,
                block.timestamp,
                zkProof
            )
        );

        uint256 expiryTime = block.timestamp + EMERGENCY_ACCESS_DURATION;
        
        patientRecords[patient].emergencyAccess[msg.sender] = EmergencyAccess({
            granted: true,
            expiryTime: expiryTime,
            reason: reason,
            accessProof: accessProof
        });

        emit EmergencyAccessGranted(msg.sender, patient, expiryTime);
        auditLog.logAccess(
            msg.sender,
            patient,
            "emergency_access",
            string(abi.encodePacked("Emergency access by DID: ", providerDID)),
            true
        );
    }

function getPatientData(
    address patient,
    string memory category,
    bytes memory zkProof
) 
    public 
    view 
    returns (string memory) 
{
    // Verify DID
    string memory providerDID = didRegistry.getDIDByAddress(msg.sender);
    require(bytes(providerDID).length > 0, "Provider DID not found");
    
    // Verify role using the zkProof
    bytes32 roleHash = accessControl.getRoleCredential(msg.sender);
    
    // Use the provided zkProof in validation
    bytes32 proofHash = keccak256(abi.encodePacked(msg.sender, roleHash, zkProof));
    require(
        zkpVerifier.validateProof(msg.sender, proofHash),
        "Invalid role proof"
    );

    require(patientRecords[patient].exists, "Patient record not found");

    if (accessControl.hasPermission(msg.sender, "view_data")) {
        return patientRecords[patient].dataCategories[category];
    }
    
    EmergencyAccess storage emergency = patientRecords[patient].emergencyAccess[msg.sender];
    require(
        emergency.granted && 
        emergency.expiryTime > block.timestamp &&
        emergency.accessProof == keccak256(abi.encodePacked(msg.sender, patient, zkProof)),
        "No valid access rights"
    );
    
    return patientRecords[patient].dataCategories[category];
}

    function revokeEmergencyAccess(address provider) 
        public 
    {
        require(patientRecords[msg.sender].exists, "Patient record not found");
        require(
            patientRecords[msg.sender].emergencyAccess[provider].granted,
            "No emergency access found"
        );
        
        delete patientRecords[msg.sender].emergencyAccess[provider];
        
        emit EmergencyAccessRevoked(provider, msg.sender);
        auditLog.logAccess(
            msg.sender,
            provider,
            "revoke_emergency",
            "Emergency access revoked",
            false
        );
    }

    function checkEmergencyAccess(address provider, address patient) 
        public 
        view 
        returns (bool granted, uint256 expiry, string memory reason) 
    {
        require(patientRecords[patient].exists, "Patient record not found");
        EmergencyAccess storage access = patientRecords[patient].emergencyAccess[provider];
        return (
            access.granted,
            access.expiryTime,
            access.reason
        );
    }
}