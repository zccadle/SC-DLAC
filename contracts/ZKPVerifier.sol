// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ZKPVerifier {
    // Mapping to store role verification proofs
    mapping(address => bytes32) public roleProofs;
    
    // Events
    event ProofSubmitted(address indexed user, bytes32 proofHash);
    event ProofVerified(address indexed user, bool success);

    struct RoleProof {
        bytes32 roleHash;      // Hash of the role credential
        uint256 timestamp;     // When the proof was submitted
        bool isValid;          // Validity status
    }

    mapping(address => RoleProof) public userProofs;

    // Function to submit a zero-knowledge proof
    function submitProof(bytes32 proofHash) public {
        roleProofs[msg.sender] = proofHash;
        
        userProofs[msg.sender] = RoleProof({
            roleHash: proofHash,
            timestamp: block.timestamp,
            isValid: true
        });
        
        emit ProofSubmitted(msg.sender, proofHash);
    }

    // State-modifying verification function
    function verifyProof(
        address user,
        bytes32 roleHash,
        bytes memory /* proof */
    ) public returns (bool) {
        bool isValid = validateProof(user, roleHash);
        
        userProofs[user].isValid = isValid;
        emit ProofVerified(user, isValid);
        return isValid;
    }

    // View function for proof validation (no state modification)
    function validateProof(
        address user,
        bytes32 roleHash
    ) public view returns (bool) {
        // For prototype: Simply check if stored proof matches
        return roleProofs[user] == roleHash;
    }

    // Function to check if a user has a valid proof
    function hasValidProof(address user) public view returns (bool) {
        return userProofs[user].isValid;
    }

    // Function to get proof details
    function getProofDetails(address user) 
        public 
        view 
        returns (
            bytes32 roleHash,
            uint256 timestamp,
            bool isValid
        ) 
    {
        RoleProof memory proof = userProofs[user];
        return (proof.roleHash, proof.timestamp, proof.isValid);
    }

    // Function to invalidate a proof
    function invalidateProof(address user) public {
        // In a real implementation, this would have proper access control
        userProofs[user].isValid = false;
        emit ProofVerified(user, false);
    }
}