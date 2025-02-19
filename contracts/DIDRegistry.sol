// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IEnhancedRBAC.sol";

contract DIDRegistry {
    struct DIDDocument {
        string did;
        address owner;
        string[] controllers;
        mapping(string => string) attributes;
        bool isActive;
        uint256 lastUpdated;
    }

    // Main DID storage
    mapping(string => DIDDocument) private didDocuments;
    // Reverse lookup: address to DID
    mapping(address => string) private addressToDID;
    
    // Reference to RBAC for role verification
    IEnhancedRBAC public rbac;

    // Events
    event DIDCreated(string indexed did, address indexed owner);
    event DIDUpdated(string indexed did, string updateType);
    event DIDDeactivated(string indexed did);
    event AttributeAdded(string indexed did, string name);
    event ControllerAdded(string indexed did, string controller);

    constructor(address _rbacAddress) {
        rbac = IEnhancedRBAC(_rbacAddress);
    }

    modifier onlyOwner(string memory did) {
        require(didDocuments[did].owner == msg.sender, "Not the DID owner");
        _;
    }

    modifier didExists(string memory did) {
        require(didDocuments[did].isActive, "DID not found or inactive");
        _;
    }

    function createDID(
        string memory did,
        string[] memory initialControllers
    ) public returns (bool) {
        require(bytes(didDocuments[did].did).length == 0, "DID already exists");
        require(bytes(addressToDID[msg.sender]).length == 0, "Address already has a DID");

        DIDDocument storage doc = didDocuments[did];
        doc.did = did;
        doc.owner = msg.sender;
        doc.isActive = true;
        doc.lastUpdated = block.timestamp;

        // Add initial controllers
        for(uint i = 0; i < initialControllers.length; i++) {
            doc.controllers.push(initialControllers[i]);
        }

        addressToDID[msg.sender] = did;
        
        emit DIDCreated(did, msg.sender);
        return true;
    }

    function addAttribute(
        string memory did,
        string memory name,
        string memory value
    ) public onlyOwner(did) didExists(did) {
        didDocuments[did].attributes[name] = value;
        didDocuments[did].lastUpdated = block.timestamp;
        
        emit AttributeAdded(did, name);
        emit DIDUpdated(did, "attribute_added");
    }

    function addController(
        string memory did,
        string memory controller
    ) public onlyOwner(did) didExists(did) {
        didDocuments[did].controllers.push(controller);
        didDocuments[did].lastUpdated = block.timestamp;
        
        emit ControllerAdded(did, controller);
        emit DIDUpdated(did, "controller_added");
    }

    function deactivateDID(string memory did) 
        public 
        onlyOwner(did) 
        didExists(did) 
    {
        didDocuments[did].isActive = false;
        didDocuments[did].lastUpdated = block.timestamp;
        
        emit DIDDeactivated(did);
        emit DIDUpdated(did, "deactivated");
    }

    function getDIDDocument(string memory did) 
        public 
        view 
        didExists(did) 
        returns (
            address owner,
            bool isActive,
            uint256 lastUpdated,
            string[] memory controllers
        ) 
    {
        DIDDocument storage doc = didDocuments[did];
        return (
            doc.owner,
            doc.isActive,
            doc.lastUpdated,
            doc.controllers
        );
    }

    function getAttribute(
        string memory did,
        string memory name
    ) public view didExists(did) returns (string memory) {
        return didDocuments[did].attributes[name];
    }

    function getDIDByAddress(address addr) public view returns (string memory) {
        string memory did = addressToDID[addr];
        require(bytes(did).length > 0, "No DID found for address");
        require(didDocuments[did].isActive, "DID is inactive");
        return did;
    }

    function verifyDIDControl(
        address addr,
        string memory did
    ) public view returns (bool) {
        return didDocuments[did].owner == addr && didDocuments[did].isActive;
    }

    function verifyDIDRole(
        string memory did,
        IEnhancedRBAC.Role role
    ) public view returns (bool) {
        return rbac.getUserRole(didDocuments[did].owner) == role;
    }
}