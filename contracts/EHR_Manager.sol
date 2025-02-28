// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IEnhancedRBAC.sol";
import "./AuditLogger.sol";
import "./IDIDRegistry.sol";
import "./ZKP_Manager.sol";

contract UpdatedPatientDataStorage {
    IEnhancedRBAC public accessControl;
    EnhancedAuditLog public auditLog;
    IDIDRegistry public didRegistry;
    ZKPVerifier public zkpVerifier;

    struct PatientRecord {
        string encryptedData;
        bool exists;
        mapping(string => string) dataCategories;
        mapping(address => DelegatedEmergencyAccess) emergencyAccess;
        string did;
    }

    struct Policy {
        uint256 policyID;
        address delegator;
        address delegatee;
        string dataID;
        string permission;
        bool isActive;
        uint256 validUntil;
    }

    struct DelegatedEmergencyAccess {
        Policy policy;
        bool granted;
        uint256 expiryTime;
        string reason;
        bytes32 accessProof;
        bool isValid;
    }

    mapping(address => PatientRecord) private patientRecords;
    mapping(uint256 => Policy) private policies;
    uint256 private nextPolicyID = 1;
    uint256 public constant EMERGENCY_ACCESS_DURATION = 24 hours;

    event PatientDataUpdated(address indexed patient, string category);
    event DelegatedEmergencyAccessGranted(
        address indexed provider,
        address indexed patient,
        uint256 policyID,
        uint256 expiryTime
    );
    event DelegatedEmergencyAccessRevoked(
        address indexed provider,
        address indexed patient
    );
    event PolicyCreated(
        uint256 indexed policyID,
        address indexed delegator,
        address indexed delegatee,
        string dataID,
        string permission
    );
    event PolicyUpdated(
        uint256 indexed policyID,
        bool isActive
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

    function createPatientRecord(address patient) public {
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

    function createDelegationPolicy(
        address delegatee,
        string memory dataID,
        string memory permission,
        uint256 validityPeriod
    ) public returns (uint256) {
        require(patientRecords[msg.sender].exists, "Patient record not found");
        
        uint256 policyID = nextPolicyID++;
        
        Policy memory newPolicy = Policy({
            policyID: policyID,
            delegator: msg.sender,
            delegatee: delegatee,
            dataID: dataID,
            permission: permission,
            isActive: true,
            validUntil: block.timestamp + validityPeriod
        });
        
        policies[policyID] = newPolicy;
        
        emit PolicyCreated(
            policyID,
            msg.sender,
            delegatee,
            dataID,
            permission
        );
        
        return policyID;
    }

    function updatePolicy(uint256 policyID, bool isActive) public {
        require(policies[policyID].delegator == msg.sender, "Not policy owner");
        policies[policyID].isActive = isActive;
        
        emit PolicyUpdated(policyID, isActive);
    }

    function getPolicy(uint256 policyID) public view returns (
        uint256 id,
        address delegator,
        address delegatee,
        string memory dataID,
        string memory permission,
        bool isActive,
        uint256 validUntil
    ) {
        Policy memory policy = policies[policyID];
        return (
            policy.policyID,
            policy.delegator,
            policy.delegatee,
            policy.dataID,
            policy.permission,
            policy.isActive,
            policy.validUntil
        );
    }

    function requestDelegatedEmergencyAccess(
        address patient,
        string memory reason,
        bytes memory zkProof,
        uint256 policyID
    ) public {
        string memory providerDID = didRegistry.getDIDByAddress(msg.sender);
        require(bytes(providerDID).length > 0, "Provider DID not found");
        
        // Verify the policy exists and is valid
        Policy memory policy = policies[policyID];
        require(policy.delegatee == msg.sender, "Not authorized by policy");
        require(policy.delegator == patient, "Policy not for this patient");
        require(policy.isActive, "Policy not active");
        require(policy.validUntil > block.timestamp, "Policy expired");
        
        bytes32 roleHash = accessControl.getRoleCredential(msg.sender);
        bytes32 proofHash = keccak256(abi.encode(roleHash, zkProof));
        
        require(
            zkpVerifier.validateProof(msg.sender, proofHash),
            "Invalid role proof"
        );

        // Check if the user has a delegated role
        require(
            accessControl.isDelegatedRole(msg.sender),
            "Must have delegated role to request emergency access"
        );

        require(patientRecords[patient].exists, "Patient record not found");

        uint256 expiryTime = block.timestamp + EMERGENCY_ACCESS_DURATION;
        
        patientRecords[patient].emergencyAccess[msg.sender] = DelegatedEmergencyAccess({
            policy: policy,
            granted: true,
            expiryTime: expiryTime,
            reason: reason,
            accessProof: proofHash,
            isValid: true
        });

        emit DelegatedEmergencyAccessGranted(msg.sender, patient, policyID, expiryTime);
        auditLog.logAccess(
            msg.sender,
            patient,
            "emergency_access",
            reason,
            true
        );
    }

    function updatePatientData(
        address patient,
        string memory category,
        string memory encryptedData,
        bytes memory zkProof
    ) public {
        string memory providerDID = didRegistry.getDIDByAddress(msg.sender);
        require(bytes(providerDID).length > 0, "Provider DID not found");
        
        // Modified proof validation
        bytes32 proofHash = keccak256(zkProof);
        require(
            zkpVerifier.validateProof(msg.sender, proofHash),
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

    function getPatientData(
        address patient,
        string memory category,
        bytes memory zkProof
    ) public view returns (string memory) {
        string memory providerDID = didRegistry.getDIDByAddress(msg.sender);
        require(bytes(providerDID).length > 0, "Provider DID not found");
        
        bytes32 proofHash = keccak256(zkProof);  // Changed to match updatePatientData
        require(
            zkpVerifier.validateProof(msg.sender, proofHash),
            "Invalid role proof"
        );

        require(patientRecords[patient].exists, "Patient record not found");

        // Check for regular permission
        if (accessControl.hasPermission(msg.sender, "view_data")) {
            return patientRecords[patient].dataCategories[category];
        }
        
        // Check for delegated emergency access
        DelegatedEmergencyAccess storage emergency = patientRecords[patient].emergencyAccess[msg.sender];
        require(
            emergency.granted && 
            emergency.expiryTime > block.timestamp &&
            emergency.isValid &&
            keccak256(abi.encodePacked(emergency.policy.dataID)) == keccak256(abi.encodePacked(category)) &&
            keccak256(abi.encodePacked(emergency.policy.permission)) == keccak256(abi.encodePacked("read")) ||
            keccak256(abi.encodePacked(emergency.policy.permission)) == keccak256(abi.encodePacked("read/write")),
            "No valid access rights"
        );
        
        return patientRecords[patient].dataCategories[category];
    }

    function checkDelegatedEmergencyAccess(address provider, address patient) 
        public 
        view 
        returns (bool granted, uint256 expiry, string memory reason, uint256 policyID) 
    {
        require(patientRecords[patient].exists, "Patient record not found");
        DelegatedEmergencyAccess storage access = patientRecords[patient].emergencyAccess[provider];
        return (
            access.granted && access.isValid,
            access.expiryTime,
            access.reason,
            access.policy.policyID
        );
    }

    function revokeDelegatedEmergencyAccess(address provider) public {
        require(patientRecords[msg.sender].exists, "Patient record not found");
        require(
            patientRecords[msg.sender].emergencyAccess[provider].granted,
            "No emergency access found"
        );
        
        patientRecords[msg.sender].emergencyAccess[provider].isValid = false;
        
        emit DelegatedEmergencyAccessRevoked(provider, msg.sender);
        auditLog.logAccess(
            msg.sender,
            provider,
            "revoke_emergency",
            "Emergency access revoked",
            false
        );
    }
}