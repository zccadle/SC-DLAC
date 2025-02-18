// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// EnhancedAuditLog.sol
contract EnhancedAuditLog {
    struct AccessRecord {
        address user;
        address patient;
        string accessType;
        string justification;
        uint256 timestamp;
        bool isEmergency;
    }

    // Store all access records
    AccessRecord[] public accessRecords;
    
    // Map patient address to their access record indices
    mapping(address => uint256[]) private patientAccessRecords;
    
    event AccessLogged(
        address indexed user,
        address indexed patient,
        string accessType,
        string justification,
        bool isEmergency,
        uint256 timestamp
    );

    function logAccess(
        address user,
        address patient,
        string memory accessType,
        string memory justification,
        bool isEmergency
    ) public {
        uint256 recordIndex = accessRecords.length;
        
        AccessRecord memory record = AccessRecord({
            user: user,
            patient: patient,
            accessType: accessType,
            justification: justification,
            timestamp: block.timestamp,
            isEmergency: isEmergency
        });
        
        accessRecords.push(record);
        patientAccessRecords[patient].push(recordIndex);
        
        emit AccessLogged(
            user,
            patient,
            accessType,
            justification,
            isEmergency,
            block.timestamp
        );
    }

    function getPatientAccessRecords(address patient) 
        public 
        view 
        returns (AccessRecord[] memory) 
    {
        uint256[] memory indices = patientAccessRecords[patient];
        AccessRecord[] memory records = new AccessRecord[](indices.length);
        
        for (uint256 i = 0; i < indices.length; i++) {
            records[i] = accessRecords[indices[i]];
        }
        
        return records;
    }
}