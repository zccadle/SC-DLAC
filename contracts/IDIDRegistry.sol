// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IDIDRegistry {
    function createDID(
        string memory did,
        string[] memory initialControllers
    ) external returns (bool);
    
    function addAttribute(
        string memory did,
        string memory name,
        string memory value
    ) external;
    
    function getDIDDocument(string memory did) 
        external 
        view 
        returns (
            address owner,
            bool isActive,
            uint256 lastUpdated,
            string[] memory controllers
        );
    
    function getAttribute(
        string memory did,
        string memory name
    ) external view returns (string memory);
    
    function getDIDByAddress(address addr) external view returns (string memory);
    
    function verifyDIDControl(
        address addr,
        string memory did
    ) external view returns (bool);
    
    function verifyDIDRole(
        string memory did,
        string memory role
    ) external view returns (bool);
}