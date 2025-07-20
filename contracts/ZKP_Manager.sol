// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ZKPVerifier {
    struct Proof {
        bytes32 proofHash;
        uint256 timestamp;
        bool isValid;
        uint256 expiryTime;
        uint256 nonce;
    }

    mapping(address => Proof) private userProofs;
    mapping(address => mapping(bytes32 => bool)) public proofs;
    mapping(address => mapping(bytes32 => bool)) private usedProofs;
    mapping(address => uint256) public userNonce;
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
        // Prevent zero hash submission
        require(proofHash != bytes32(0), "Invalid proof: zero hash");
        
        // Prevent replay attacks - check if proof was already used
        require(!usedProofs[msg.sender][proofHash], "Proof already used");
        
        uint256 expiryTime = block.timestamp + proofValidityDuration;
        uint256 currentNonce = userNonce[msg.sender];
        
        userProofs[msg.sender] = Proof({
            proofHash: proofHash,
            timestamp: block.timestamp,
            isValid: true,
            expiryTime: expiryTime,
            nonce: currentNonce
        });
        
        // Mark proof as used
        usedProofs[msg.sender][proofHash] = true;
        proofs[msg.sender][proofHash] = true;
        
        // Increment nonce for next proof
        userNonce[msg.sender] = currentNonce + 1;
        
        emit ProofSubmitted(msg.sender, proofHash, expiryTime);
    }

    function validateProof(
        address user,
        bytes32 proofHash
    ) public view returns (bool) {
        // Reject zero hash
        if (proofHash == bytes32(0)) {
            return false;
        }
        
        Proof storage userProof = userProofs[user];
        
        // Check if proof exists and matches
        return userProof.isValid &&
               block.timestamp <= userProof.expiryTime &&
               userProof.proofHash == proofHash &&
               proofs[user][proofHash];
    }

    function getProofDetails(address user) 
        public 
        view 
        returns (
            bytes32 proofHash,
            uint256 timestamp,
            bool isValid,
            uint256 expiryTime,
            uint256 nonce
        ) 
    {
        Proof storage proof = userProofs[user];
        return (
            proof.proofHash,
            proof.timestamp,
            proof.isValid,
            proof.expiryTime,
            proof.nonce
        );
    }

    function getLatestProof(address user) public view returns (bytes32) {
        return userProofs[user].proofHash;
    }
    
    function invalidateProof(address user) public {
        require(msg.sender == user || msg.sender == owner, "Unauthorized");
        userProofs[user].isValid = false;
        emit ProofInvalidated(user, userProofs[user].proofHash);
    }
}