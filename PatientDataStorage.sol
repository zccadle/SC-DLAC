// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SimpleRBAC.sol";
import "./AuditLog.sol";


contract PatientDataStorage {
    SimpleRBAC accessControl;
    AuditLog auditLog;

    struct PatientData {
        string encryptedData; // Store encrypted patient data
    }

    mapping(address => PatientData) private patientData;

    constructor(address _accessControlAddress, address _auditLogAddress) {
        accessControl = SimpleRBAC(_accessControlAddress);
        auditLog = AuditLog(_auditLogAddress);
    }

    // Update patient data (only for authorized roles)
    function updatePatientData(address patient, string memory encryptedData) public {
        require(accessControl.hasPermission(msg.sender, "update_data"), "Unauthorized access");
        patientData[patient] = PatientData({ encryptedData: encryptedData });
        auditLog.logAccess(msg.sender, patient, "update_data", "Patient data updated");
    }

    // Get patient data (only for authorized roles)
    function getPatientData(address patient) public view returns (string memory) {
        require(accessControl.hasPermission(msg.sender, "view_data"), "Unauthorized access");
        return patientData[patient].encryptedData;
    }
}
