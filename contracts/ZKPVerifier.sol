// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ZKPVerifier {
    struct Proof {
        bytes32 proofHash;
        uint256 timestamp;
        bool isValid;
        uint256 expiryTime;
    }

    mapping(address => Proof) private userProofs;
    uint256 public proofValidityDuration;
    address public owner;
    
    event ProofSubmitted(address indexed user, bytes32 proofHash, uint256 expiryTime);
    event ProofVerified(address indexed user, bool success);
    event ProofInvalidated(address indexed user, bytes32 proofHash);

    constructor() {
        owner = msg.sender;
        proofValidityDuration = 1 hours;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function submitProof(bytes32 proofHash) public {
        uint256 expiryTime = block.timestamp + proofValidityDuration;
        
        userProofs[msg.sender] = Proof({
            proofHash: proofHash,
            timestamp: block.timestamp,
            isValid: true,
            expiryTime: expiryTime
        });
        
        emit ProofSubmitted(msg.sender, proofHash, expiryTime);
    }

    function validateProof(
        address user,
        bytes32 proofHash
    ) public view returns (bool) {
        Proof storage userProof = userProofs[user];
        
        return userProof.isValid &&
               block.timestamp <= userProof.expiryTime &&
               userProof.proofHash == proofHash;
    }

    function getProofDetails(address user) 
        public 
        view 
        returns (
            bytes32 proofHash,
            uint256 timestamp,
            bool isValid,
            uint256 expiryTime
        ) 
    {
        Proof storage proof = userProofs[user];
        return (
            proof.proofHash,
            proof.timestamp,
            proof.isValid,
            proof.expiryTime
        );
    }

    function getLatestProof(address user) public view returns (bytes32) {
        return userProofs[user].proofHash;
    }
}