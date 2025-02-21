// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IEnhancedRBAC {
    function hasPermission(address user, string memory permission) external view returns (bool);
    function hasRole(address user, string memory roleID) external view returns (bool);
    function getUserRole(address user) external view returns (string memory);
    function verifyRoleCredential(address user, bytes32 credentialHash) external view returns (bool);
    function getUserDID(address user) external view returns (string memory);
    function getRoleCredential(address user) external view returns (bytes32);
    function isDelegatedRole(address user) external view returns (bool);
}