// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IDIDRegistry.sol";
import "./ZKP_Manager.sol";

contract EnhancedRBAC {
    struct Role {
        string roleID;
        string description;
    }
    
    struct RoleData {
        string roleID;
        bool isActive;
        uint256 validUntil;
        bytes32 roleCredential;
        string did;
        bool isDelegated;
    }

    // Store roles by ID
    mapping(string => Role) private roles;
    // Track all role IDs for iteration
    string[] private roleIDs;
    
    // User to role mapping
    mapping(address => RoleData) private userRoles;
    // Role to permissions mapping
    mapping(string => mapping(string => bool)) private rolePermissions;
    
    IDIDRegistry public didRegistry;
    ZKPVerifier public zkpVerifier;
    address public owner;

    // Events
    event RoleAdded(string roleID, string description);
    event RoleRemoved(string roleID);
    event RoleAssigned(address indexed user, string roleID, string did, bool isDelegated);
    event RoleRevoked(address indexed user);
    event PermissionGranted(string roleID, string permission);
    event PermissionRevoked(string roleID, string permission);
    event DIDRegistryUpdated(address indexed newRegistry);

    constructor(address _didRegistryAddress, address _zkpVerifierAddress) {
        owner = msg.sender;
        didRegistry = IDIDRegistry(_didRegistryAddress);
        zkpVerifier = ZKPVerifier(_zkpVerifierAddress);
        
        // Initialize default roles
        addRole("NONE", "No role assigned");
        addRole("PATIENT", "Patient role");
        addRole("NURSE", "Nurse role");
        addRole("PARAMEDIC", "Paramedic role");
        addRole("DOCTOR", "Doctor role");
        addRole("ADMIN", "Administrator role");
        addRole("AUDITOR", "Auditor role");
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAdmin() {
        require(
            msg.sender == owner || 
            (keccak256(abi.encodePacked(userRoles[msg.sender].roleID)) == keccak256(abi.encodePacked("ADMIN")) && 
             userRoles[msg.sender].isActive && 
             userRoles[msg.sender].validUntil > block.timestamp),
            "Admin access required"
        );
        _;
    }

    function addRole(string memory roleID, string memory description) public onlyAdmin {
        require(bytes(roleID).length > 0, "Role ID cannot be empty");
        require(bytes(roles[roleID].roleID).length == 0, "Role already exists");
        
        roles[roleID] = Role({
            roleID: roleID,
            description: description
        });
        
        roleIDs.push(roleID);
        emit RoleAdded(roleID, description);
    }

    function getRole(string memory roleID) public view returns (string memory, string memory) {
        require(bytes(roles[roleID].roleID).length > 0, "Role does not exist");
        return (roles[roleID].roleID, roles[roleID].description);
    }

    function getAllRoles() public view returns (string[] memory) {
        return roleIDs;
    }

    function removeRole(string memory roleID) public onlyAdmin {
        require(bytes(roles[roleID].roleID).length > 0, "Role does not exist");
        require(keccak256(abi.encodePacked(roleID)) != keccak256(abi.encodePacked("ADMIN")), "Cannot remove ADMIN role");
        
        // Remove from roles mapping
        delete roles[roleID];
        
        // Remove from roleIDs array
        for (uint i = 0; i < roleIDs.length; i++) {
            if (keccak256(abi.encodePacked(roleIDs[i])) == keccak256(abi.encodePacked(roleID))) {
                roleIDs[i] = roleIDs[roleIDs.length - 1];
                roleIDs.pop();
                break;
            }
        }
        
        emit RoleRemoved(roleID);
    }

    function updateDIDRegistry(address _didRegistryAddress) public onlyOwner {
        require(_didRegistryAddress != address(0), "Invalid DIDRegistry address");
        didRegistry = IDIDRegistry(_didRegistryAddress);
        emit DIDRegistryUpdated(_didRegistryAddress);
    }

    function assignRole(
        address user,
        string memory roleID,
        bytes32 roleCredential,
        string memory did,
        uint256 validityPeriod,
        bool isDelegated
    ) public onlyAdmin {
        require(bytes(roles[roleID].roleID).length > 0, "Role does not exist");
        require(validityPeriod > 0, "Validity period must be greater than 0");
        
        userRoles[user] = RoleData({
            roleID: roleID,
            isActive: true,
            validUntil: block.timestamp + validityPeriod,
            roleCredential: roleCredential,
            did: did,
            isDelegated: isDelegated
        });

        emit RoleAssigned(user, roleID, did, isDelegated);
    }

    function revokeRole(address user) public onlyAdmin {
        require(userRoles[user].isActive, "Role not active");
        delete userRoles[user];
        emit RoleRevoked(user);
    }

    function grantPermission(string memory roleID, string memory permission) public onlyAdmin {
        require(bytes(roles[roleID].roleID).length > 0, "Role does not exist");
        rolePermissions[roleID][permission] = true;
        emit PermissionGranted(roleID, permission);
    }

    function revokePermission(string memory roleID, string memory permission) public onlyAdmin {
        require(bytes(roles[roleID].roleID).length > 0, "Role does not exist");
        rolePermissions[roleID][permission] = false;
        emit PermissionRevoked(roleID, permission);
    }

    function hasPermission(address user, string memory permission) public view returns (bool) {
        RoleData storage userData = userRoles[user];
        if (!userData.isActive || userData.validUntil <= block.timestamp) {
            return false;
        }
        return rolePermissions[userData.roleID][permission];
    }

    function hasRole(address user, string memory roleID) public view returns (bool) {
        RoleData storage userData = userRoles[user];
        return keccak256(abi.encodePacked(userData.roleID)) == keccak256(abi.encodePacked(roleID)) &&
               userData.isActive &&
               userData.validUntil > block.timestamp;
    }

    function getUserRole(address user) public view returns (string memory) {
        return userRoles[user].roleID;
    }

    function getRoleData(address user) public view returns (
        string memory roleID,
        bool isActive,
        uint256 validUntil,
        bytes32 roleCredential,
        string memory did,
        bool isDelegated
    ) {
        RoleData storage userData = userRoles[user];
        return (
            userData.roleID,
            userData.isActive,
            userData.validUntil,
            userData.roleCredential,
            userData.did,
            userData.isDelegated
        );
    }

    function verifyRoleCredential(address user, bytes32 credentialHash) public view returns (bool) {
        return userRoles[user].roleCredential == credentialHash;
    }

    function getRoleCredential(address user) public view returns (bytes32) {
        return userRoles[user].roleCredential;
    }

    function getUserDID(address user) public view returns (string memory) {
        return userRoles[user].did;
    }

    function isDelegatedRole(address user) public view returns (bool) {
        return userRoles[user].isDelegated;
    }
}