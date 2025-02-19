# Delegated Access Control System for Emergency Medical Situations (DACEMS)

## Overview
DACEMS is a blockchain-based system designed to manage medical data access control in both regular and emergency situations. The system implements a secure and flexible framework that balances patient privacy with the need for immediate access during medical emergencies.

## Key Features

### Role-Based Access Control
- Multiple role types (Patient, Nurse, Paramedic, Doctor, Admin, Auditor)
- Granular permission management
- Time-bound role assignments
- Credential-based verification

### Emergency Access Management
- Immediate emergency access for authorized medical professionals
- 24-hour emergency access window
- Patient-controlled access revocation
- Comprehensive audit logging of emergency access

### Security Features
- Decentralized Identity (DID) management
- Zero-Knowledge Proof verification
- Encrypted data storage
- Role credential validation

### Audit System
- Complete access history tracking
- Differentiation between regular and emergency access
- Access justification logging
- Comprehensive audit trail retrieval

## System Architecture

### Smart Contracts
1. `DIDRegistry.sol`
   - Manages decentralized identifiers
   - Handles identity verification
   - Controls DID attributes and controllers

2. `EnhancedRBAC.sol`
   - Implements role-based access control
   - Manages permissions and role assignments
   - Handles role credential verification

3. `UpdatedPatientDataStorage.sol`
   - Stores encrypted patient data
   - Manages emergency access requests
   - Controls data access and updates

4. `EnhancedAuditLog.sol`
   - Records all system access
   - Maintains comprehensive audit trail
   - Provides access history retrieval

5. `ZKPVerifier.sol`
   - Handles zero-knowledge proof verification
   - Manages proof submission and validation
   - Controls proof expiration

## Setup and Deployment

### Prerequisites
```bash
npm install hardhat
npm install @openzeppelin/contracts
npm install ethers
```

### Deployment Steps
1. Deploy core contracts:
```bash
npx hardhat run scripts/deploy.js --network <network-name>
```

2. Setup initial roles and permissions:
```bash
npx hardhat run scripts/setup.js --network <network-name>
```

### Testing
Run the comprehensive test suite:
```bash
npx hardhat test
```

## Usage Examples

### Regular Medical Access
```javascript
// Example of doctor accessing patient data
await patientStorage.updatePatientData(
    patientAddress,
    "category",
    "encryptedData",
    zkProof
);
```

### Emergency Access
```javascript
// Example of emergency access request
await patientStorage.requestEmergencyAccess(
    patientAddress,
    "Emergency situation description",
    zkProof
);
```

### Audit Trail Retrieval
```javascript
// Example of accessing audit logs
const accessRecords = await auditLog.getPatientAccessRecords(patientAddress);
```

## Contributors
- Dongguk Lee / University College London
- Mpyana Mwamba Merlec / Korea University

## Contact
Dongguk Lee / zccadle@ucl.ac.uk
