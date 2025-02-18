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

    event RoleAssigned(address indexed user, Role role, string did);
    event RoleRevoked(address indexed user);
    event PermissionGranted(address indexed user, string permission);
    event PermissionRevoked(address indexed user, string permission);

    constructor(address _didRegistryAddress, address _zkpVerifierAddress) {
        didRegistry = IDIDRegistry(_didRegistryAddress);
        zkpVerifier = ZKPVerifier(_zkpVerifierAddress);
    }

    modifier verifiedIdentity(bytes memory zkProof) {
        require(
            zkpVerifier.verifyProof(
                msg.sender, 
                userRoles[msg.sender].roleCredential,
                zkProof
            ),
            "Invalid identity proof"
        );
        _;
    }

    function assignRole(
        address user,
        Role role,
        bytes32 roleCredential,
        string memory did,
        uint256 validityPeriod
    ) public {
        require(didRegistry.verifyDIDControl(user, did), "Invalid DID control");
        
        userRoles[user] = RoleData({
            role: role,
            isActive: true,
            validUntil: block.timestamp + validityPeriod,
            roleCredential: roleCredential,
            did: did
        });

        emit RoleAssigned(user, role, did);
    }

    // ... [Other functions with added ZKP verification] ...
}