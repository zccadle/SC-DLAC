import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { RBAC_ABI } from '../abis';

export class ContractService {
  private provider: ethers.providers.Web3Provider;
  private signer: ethers.Signer;
  private contracts: any;

  constructor(provider: ethers.providers.Web3Provider) {
    this.provider = provider;
    this.signer = provider.getSigner();
    this.initializeContracts();
  }

  private initializeContracts() {
    this.contracts = {
      rbac: new ethers.Contract(CONTRACT_ADDRESSES.RBAC, RBAC_ABI, this.signer),
      // Initialize other contracts here
    };
  }

  async getUserRole(address: string): Promise<number> {
    try {
      return await this.contracts.rbac.getUserRole(address);
    } catch (error) {
      console.error('Error getting user role:', error);
      throw error;
    }
  }

  async requestEmergencyAccess(patientAddress: string, reason: string): Promise<any> {
    try {
      // Generate a random proof (in real system, this would be a proper ZKP)
      const zkProof = ethers.utils.randomBytes(32);
      const roleHash = await this.contracts.rbac.getRoleCredential(await this.signer.getAddress());
      const proofHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [roleHash, zkProof])
      );

      // Submit the proof and request access
      const tx = await this.contracts.patientStorage.requestEmergencyAccess(
        patientAddress,
        reason,
        zkProof
      );
      
      return await tx.wait();
    } catch (error) {
      console.error('Error requesting emergency access:', error);
      throw error;
    }
  }

  async getPatientRecords(patientAddress: string): Promise<any> {
    try {
      // Implement based on your contract's structure
      return await this.contracts.patientStorage.getPatientRecords(patientAddress);
    } catch (error) {
      console.error('Error getting patient records:', error);
      throw error;
    }
  }

  async getAccessLogs(patientAddress: string): Promise<any> {
    try {
      return await this.contracts.auditLog.getPatientAccessRecords(patientAddress);
    } catch (error) {
      console.error('Error getting access logs:', error);
      throw error;
    }
  }
}