// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AuditLog {
    event AccessLogged(address indexed user, address indexed patient, string accessType, string justification, uint256 timestamp);

    // Log the access event
    function logAccess(address user, address patient, string memory accessType, string memory justification) public {
        emit AccessLogged(user, patient, accessType, justification, block.timestamp);
    }
}
