// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleRBAC {
    // Define roles
    enum Roles { Doctor, Nurse, Paramedic, Receptionist, Auditor, Patient, Admin }

    // Define user roles and permissions
    mapping(address => Roles) private roles;
    mapping(address => mapping(string => bool)) private permissions;

    // Events
    event RoleAssigned(address indexed user, Roles role);
    event PermissionGranted(address indexed user, string permission);
    event PermissionRevoked(address indexed user, string permission);

    // Assign a role to a user
    function assignRole(address user, Roles role) public {
        roles[user] = role;
        emit RoleAssigned(user, role);
    }

    // Grant permission to a user
    function grantPermission(address user, string memory permission) public {
        permissions[user][permission] = true;
        emit PermissionGranted(user, permission);
    }

    // Revoke permission from a user
    function revokePermission(address user, string memory permission) public {
        permissions[user][permission] = false;
        emit PermissionRevoked(user, permission);
    }

    // Check if a user has a specific role
    function hasRole(address user, Roles role) public view returns (bool) {
        return roles[user] == role;
    }

    // Check if a user has a specific permission
    function hasPermission(address user, string memory permission) public view returns (bool) {
        return permissions[user][permission];
    }

    // Get role of a user
    function getRole(address user) public view returns (Roles) {
        return roles[user];
    }
}
