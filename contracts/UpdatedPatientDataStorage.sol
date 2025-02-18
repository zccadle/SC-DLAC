// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IEnhancedRBAC.sol";
import "./EnhancedAuditLog.sol";

contract UpdatedPatientDataStorage {
    IEnhancedRBAC public accessControl;
    EnhancedAuditLog public auditLog;

    struct PatientRecord {
        string encryptedData;
        bool exists;
        mapping(string => string) dataCategories; // e.g., "allergies", "medications", etc.
        mapping(address => EmergencyAccess) emergencyAccess;
    }

    struct EmergencyAccess {
        bool granted;
        uint256 expiryTime;
        string reason;
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

    constructor(address _rbacAddress, address _auditLogAddress) {
        accessControl = IEnhancedRBAC(_rbacAddress);
        auditLog = EnhancedAuditLog(_auditLogAddress);
    }

    modifier onlyAuthorized(string memory permission) {
        require(
            accessControl.hasPermission(msg.sender, permission),
            "Unauthorized access"
        );
        _;
    }

    modifier patientExists(address patient) {
        require(patientRecords[patient].exists, "Patient record not found");
        _;
    }

    function createPatientRecord(address patient) 
        public 
        onlyAuthorized("create_record") 
    {
        require(!patientRecords[patient].exists, "Patient record already exists");
        patientRecords[patient].exists = true;
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
        string memory encryptedData
    ) 
        public 
        onlyAuthorized("update_data")
        patientExists(patient) 
    {
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
        string memory reason
    ) 
        public 
        patientExists(patient) 
    {
        require(
            accessControl.getUserRole(msg.sender) == IEnhancedRBAC.Role.Doctor ||
            accessControl.getUserRole(msg.sender) == IEnhancedRBAC.Role.Paramedic,
            "Only doctors or paramedics can request emergency access"
        );

        PatientRecord storage record = patientRecords[patient];
        uint256 expiryTime = block.timestamp + EMERGENCY_ACCESS_DURATION;
        
        record.emergencyAccess[msg.sender] = EmergencyAccess({
            granted: true,
            expiryTime: expiryTime,
            reason: reason
        });

        emit EmergencyAccessGranted(msg.sender, patient, expiryTime);
        auditLog.logAccess(
            msg.sender,
            patient,
            "emergency_access",
            reason,
            true
        );
    }

    function getPatientData(
        address patient,
        string memory category
    ) 
        public 
        view 
        patientExists(patient)
        returns (string memory) 
    {
        // Check regular access
        if (accessControl.hasPermission(msg.sender, "view_data")) {
            return patientRecords[patient].dataCategories[category];
        }
        
        // Check emergency access
        EmergencyAccess storage emergency = patientRecords[patient].emergencyAccess[msg.sender];
        require(
            emergency.granted && emergency.expiryTime > block.timestamp,
            "No valid access rights"
        );
        
        return patientRecords[patient].dataCategories[category];
    }

    function revokeEmergencyAccess(address provider) 
        public 
        patientExists(msg.sender) 
    {
        PatientRecord storage record = patientRecords[msg.sender];
        require(
            record.emergencyAccess[provider].granted,
            "No emergency access found"
        );
        
        delete record.emergencyAccess[provider];
        
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
        patientExists(patient)
        returns (bool granted, uint256 expiry, string memory reason) 
    {
        EmergencyAccess storage access = patientRecords[patient].emergencyAccess[provider];
        return (
            access.granted,
            access.expiryTime,
            access.reason
        );
    }
}