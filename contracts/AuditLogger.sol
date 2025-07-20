// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EnhancedAuditLog {
    // Access control - only authorized contracts can log
    mapping(address => bool) public authorizedLoggers;
    address public owner;
    
    modifier onlyAuthorized() {
        require(authorizedLoggers[msg.sender] || msg.sender == owner, "Unauthorized logger");
        _;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        authorizedLoggers[msg.sender] = true;
    }
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
    ) public onlyAuthorized {
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

    function getAccessRecordCount() public view returns (uint256) {
        return accessRecords.length;
    }

    function getAccessRecord(uint256 index) public view returns (AccessRecord memory) {
        require(index < accessRecords.length, "Index out of bounds");
        return accessRecords[index];
    }
    
    function authorizeLogger(address logger) public onlyOwner {
        authorizedLoggers[logger] = true;
    }
    
    function revokeLogger(address logger) public onlyOwner {
        authorizedLoggers[logger] = false;
    }
    
    // Add alias for getAuditCount to maintain compatibility
    function getAuditCount() public view returns (uint256) {
        return getAccessRecordCount();
    }
    
    // Add getAuditEntry for test compatibility
    function getAuditEntry(uint256 index) public view returns (
        address user,
        address patient,
        string memory accessType,
        string memory justification,
        uint256 timestamp,
        bool isEmergency
    ) {
        require(index < accessRecords.length, "Index out of bounds");
        AccessRecord memory record = accessRecords[index];
        return (
            record.user,
            record.patient,
            record.accessType,
            record.justification,
            record.timestamp,
            record.isEmergency
        );
    }
    
    // Get all access records for a specific provider
    function getProviderAccessRecords(address provider) 
        public 
        view 
        returns (AccessRecord[] memory) 
    {
        uint256 count = 0;
        // First count how many records for this provider
        for (uint256 i = 0; i < accessRecords.length; i++) {
            if (accessRecords[i].user == provider) {
                count++;
            }
        }
        
        // Create array of correct size
        AccessRecord[] memory records = new AccessRecord[](count);
        uint256 currentIndex = 0;
        
        // Fill the array
        for (uint256 i = 0; i < accessRecords.length; i++) {
            if (accessRecords[i].user == provider) {
                records[currentIndex] = accessRecords[i];
                currentIndex++;
            }
        }
        
        return records;
    }
    
    // Get emergency access records
    function getEmergencyAccessRecords() 
        public 
        view 
        returns (AccessRecord[] memory) 
    {
        uint256 count = 0;
        // First count emergency records
        for (uint256 i = 0; i < accessRecords.length; i++) {
            if (accessRecords[i].isEmergency) {
                count++;
            }
        }
        
        // Create array of correct size
        AccessRecord[] memory records = new AccessRecord[](count);
        uint256 currentIndex = 0;
        
        // Fill the array
        for (uint256 i = 0; i < accessRecords.length; i++) {
            if (accessRecords[i].isEmergency) {
                records[currentIndex] = accessRecords[i];
                currentIndex++;
            }
        }
        
        return records;
    }
    
    // Filter records by action type
    function getRecordsByAction(string memory action) 
        public 
        view 
        returns (AccessRecord[] memory) 
    {
        uint256 count = 0;
        // First count matching records
        for (uint256 i = 0; i < accessRecords.length; i++) {
            if (keccak256(abi.encodePacked(accessRecords[i].accessType)) == keccak256(abi.encodePacked(action))) {
                count++;
            }
        }
        
        // Create array of correct size
        AccessRecord[] memory records = new AccessRecord[](count);
        uint256 currentIndex = 0;
        
        // Fill the array
        for (uint256 i = 0; i < accessRecords.length; i++) {
            if (keccak256(abi.encodePacked(accessRecords[i].accessType)) == keccak256(abi.encodePacked(action))) {
                records[currentIndex] = accessRecords[i];
                currentIndex++;
            }
        }
        
        return records;
    }
}