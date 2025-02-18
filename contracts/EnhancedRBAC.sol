// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EnhancedRBAC {
    // Hierarchical role structure
    enum Role { None, Patient, Nurse, Paramedic, Doctor, Admin, Auditor }
    
    struct RoleData {
        Role role;
        bool isActive;
        uint256 validUntil;      // Timestamp for role expiration
        bytes32 roleCredential;   // Hash of role credentials (for ZKP verification later)
        string did;              // DID identifier (to be integrated)
    }

    struct Permission {
        string name;
        bool isActive;
        uint256 validUntil;
    }

    // Storage
    mapping(address => RoleData) private userRoles;
    mapping(Role => mapping(string => bool)) private rolePermissions;
    mapping(address => mapping(string => Permission)) private userPermissions;
    
    // Emergency access tracking
    mapping(address => mapping(address => bool)) private emergencyAccess;
    mapping(address => uint256) private emergencyAccessExpiry;

    // Events
    event RoleAssigned(address indexed user, Role role, uint256 validUntil);
    event RoleRevoked(address indexed user, Role role);
    event PermissionGranted(address indexed user, string permission, uint256 validUntil);
    event PermissionRevoked(address indexed user, string permission);
    event EmergencyAccessGranted(address indexed provider, address indexed patient, uint256 expiry);
    event RoleCredentialUpdated(address indexed user, bytes32 credentialHash);
    event DIDAssigned(address indexed user, string did);

    // Modifiers
    modifier onlyAdmin() {
        require(userRoles[msg.sender].role == Role.Admin, "Admin access required");
        _;
    }

    modifier validRole(address user) {
        require(userRoles[user].isActive, "Role not active");
        require(userRoles[user].validUntil > block.timestamp, "Role expired");
        _;
    }

    // Role Management
    function assignRole(
        address user,
        Role role,
        uint256 validityPeriod,
        bytes32 roleCredential,
        string memory did
    ) public onlyAdmin {
        userRoles[user] = RoleData({
            role: role,
            isActive: true,
            validUntil: block.timestamp + validityPeriod,
            roleCredential: roleCredential,
            did: did
        });
        
        emit RoleAssigned(user, role, block.timestamp + validityPeriod);
        emit RoleCredentialUpdated(user, roleCredential);
        emit DIDAssigned(user, did);
    }

    function revokeRole(address user) public onlyAdmin {
        Role oldRole = userRoles[user].role;
        delete userRoles[user];
        emit RoleRevoked(user, oldRole);
    }

    // Permission Management
    function setRolePermission(Role role, string memory permission, bool allowed) public onlyAdmin {
        rolePermissions[role][permission] = allowed;
    }

    function grantEmergencyAccess(address provider, address patient, uint256 duration) public {
        require(
            userRoles[provider].role == Role.Doctor || 
            userRoles[provider].role == Role.Paramedic,
            "Unauthorized provider role"
        );
        
        emergencyAccess[provider][patient] = true;
        emergencyAccessExpiry[provider] = block.timestamp + duration;
        
        emit EmergencyAccessGranted(provider, patient, block.timestamp + duration);
    }

    // Access Verification
    function hasPermission(
        address user,
        string memory permission
    ) public view validRole(user) returns (bool) {
        // Check direct permission
        if (userPermissions[user][permission].isActive &&
            userPermissions[user][permission].validUntil > block.timestamp) {
            return true;
        }
        
        // Check role-based permission
        return rolePermissions[userRoles[user].role][permission];
    }

    function hasEmergencyAccess(address provider, address patient) public view returns (bool) {
        return emergencyAccess[provider][patient] && 
               emergencyAccessExpiry[provider] > block.timestamp;
    }

    // Role and Credential Verification
    function verifyRoleCredential(
        address user,
        bytes32 credentialHash
    ) public view returns (bool) {
        return userRoles[user].roleCredential == credentialHash;
    }

    // DID Management
    function updateDID(address user, string memory newDID) public onlyAdmin {
        userRoles[user].did = newDID;
        emit DIDAssigned(user, newDID);
    }

    // Getters
    function getUserRole(address user) public view returns (Role) {
        return userRoles[user].role;
    }

    function getUserDID(address user) public view returns (string memory) {
        return userRoles[user].did;
    }

    function getRoleCredential(address user) public view returns (bytes32) {
        return userRoles[user].roleCredential;
    }
}