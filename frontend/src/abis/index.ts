export const RBAC_ABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getUserRole",
      "outputs": [
        {
          "internalType": "enum IEnhancedRBAC.Role",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
    // Add other functions from your RBAC contract
  ];