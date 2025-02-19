// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IDIDRegistry.sol";
import "./ZKPVerifier.sol";

contract EnhancedRBAC {
    enum Role { None, Patient, Nurse, Paramedic, Doctor, Admin, Auditor }
    
    struct RoleData {
        Role role;
        bool isActive;
        uint256 validUntil;
        bytes32 roleCredential;
        string did;
    }

    mapping(address => RoleData) private userRoles;
    mapping(Role => mapping(string => bool)) private rolePermissions;
    IDIDRegistry public didRegistry;
    ZKPVerifier public zkpVerifier;
    address public owner;

    event RoleAssigned(address indexed user, Role role, string did);
    event RoleRevoked(address indexed user);
    event PermissionGranted(address indexed user, string permission);
    event PermissionRevoked(address indexed user, string permission);
    event DIDRegistryUpdated(address indexed newRegistry);

    constructor(address _didRegistryAddress, address _zkpVerifierAddress) {
        owner = msg.sender;
        didRegistry = IDIDRegistry(_didRegistryAddress);
        zkpVerifier = ZKPVerifier(_zkpVerifierAddress);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyAdmin() {
        require(
            msg.sender == owner || 
            (userRoles[msg.sender].role == Role.Admin && 
             userRoles[msg.sender].isActive && 
             userRoles[msg.sender].validUntil > block.timestamp),
            "Admin access required"
        );
        _;
    }

    function updateDIDRegistry(address _didRegistryAddress) public onlyOwner {
        require(_didRegistryAddress != address(0), "Invalid DIDRegistry address");
        didRegistry = IDIDRegistry(_didRegistryAddress);
        emit DIDRegistryUpdated(_didRegistryAddress);
    }

    function assignRole(
        address user,
        Role role,
        bytes32 roleCredential,
        string memory did,
        uint256 validityPeriod
    ) public onlyAdmin {
        require(role != Role.None, "Cannot assign None role");
        require(validityPeriod > 0, "Validity period must be greater than 0");
        
        userRoles[user] = RoleData({
            role: role,
            isActive: true,
            validUntil: block.timestamp + validityPeriod,
            roleCredential: roleCredential,
            did: did
        });

        emit RoleAssigned(user, role, did);
    }

    function revokeRole(address user) public onlyAdmin {
        require(userRoles[user].isActive, "Role not active");
        delete userRoles[user];
        emit RoleRevoked(user);
    }

    function grantPermission(address user, string memory permission) public onlyAdmin {
        require(userRoles[user].isActive, "Role not active");
        require(userRoles[user].validUntil > block.timestamp, "Role expired");
        rolePermissions[userRoles[user].role][permission] = true;
        emit PermissionGranted(user, permission);
    }

    function revokePermission(address user, string memory permission) public onlyAdmin {
        require(userRoles[user].isActive, "Role not active");
        rolePermissions[userRoles[user].role][permission] = false;
        emit PermissionRevoked(user, permission);
    }

    function hasPermission(address user, string memory permission) public view returns (bool) {
        RoleData storage userData = userRoles[user];
        if (!userData.isActive || userData.validUntil <= block.timestamp) {
            return false;
        }
        return rolePermissions[userData.role][permission];
    }

    function hasRole(address user, Role role) public view returns (bool) {
        return userRoles[user].role == role &&
               userRoles[user].isActive &&
               userRoles[user].validUntil > block.timestamp;
    }

    function getUserRole(address user) public view returns (Role) {
        return userRoles[user].role;
    }

    function getRoleData(address user) public view returns (
        Role role,
        bool isActive,
        uint256 validUntil,
        bytes32 roleCredential,
        string memory did
    ) {
        RoleData storage userData = userRoles[user];
        return (
            userData.role,
            userData.isActive,
            userData.validUntil,
            userData.roleCredential,
            userData.did
        );
    }

    function getRoleCredential(address user) public view returns (bytes32) {
        return userRoles[user].roleCredential;
    }
}