// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IEnhancedRBAC {
    enum Role { None, Patient, Nurse, Paramedic, Doctor, Admin, Auditor }
    
    function hasPermission(address user, string memory permission) external view returns (bool);
    function getUserRole(address user) external view returns (Role);
    function verifyRoleCredential(address user, bytes32 credentialHash) external view returns (bool);
    function getUserDID(address user) external view returns (string memory);
}