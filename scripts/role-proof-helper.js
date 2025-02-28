// role-proof-helper.js

const { ethers } = require("hardhat");

// Helper function to properly submit and validate a role proof
async function submitAndVerifyProof(user, role, zkpManager, dlacManager) {
    try {
        // Get role credential
        const roleHash = await dlacManager.getRoleCredential(user.address);
        
        // Generate and format proof
        const zkProof = ethers.utils.randomBytes(32);
        const proofHash = ethers.utils.keccak256(zkProof);
        
        // Submit the raw proof hash
        const submitTx = await zkpManager.connect(user).submitProof(proofHash, {
            gasLimit: 300000
        });
        await submitTx.wait();
        
        // Verify it was registered
        const isValid = await zkpManager.validateProof(user.address, proofHash);
        if (!isValid) {
            throw new Error("Proof validation failed");
        }
        
        return {
            zkProof,
            proofHash,
            isValid: true
        };
    } catch (error) {
        console.error(`Error in proof validation: ${error.message}`);
        return {
            isValid: false,
            error: error.message
        };
    }
}

// Helper to wait for proof registration
async function waitForProofRegistration(user, proofHash, zkpManager, maxAttempts = 5) {
    for (let i = 0; i < maxAttempts; i++) {
        const isValid = await zkpManager.validateProof(user.address, proofHash);
        if (isValid) {
            return true;
        }
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
}

// Helper to check and refresh proof if needed
async function ensureValidProof(user, role, zkpManager, dlacManager) {
    try {
        // Check if user has a recent valid proof
        const existingProof = await zkpManager.getLatestProof(user.address);
        if (existingProof) {
            const isValid = await zkpManager.validateProof(user.address, existingProof);
            if (isValid) {
                // If reusing existing proof, we need to reconstruct proper format
                const zkProof = ethers.utils.randomBytes(32); // New proof bytes
                return {
                    zkProof,
                    proofHash: existingProof,
                    isValid: true,
                    reused: true
                };
            }
        }
        
        // If no valid proof exists, create new one
        return await submitAndVerifyProof(user, role, zkpManager, dlacManager);
    } catch (error) {
        console.error(`Error ensuring valid proof: ${error.message}`);
        return {
            isValid: false,
            error: error.message
        };
    }
}

module.exports = {
    submitAndVerifyProof,
    waitForProofRegistration,
    ensureValidProof
};