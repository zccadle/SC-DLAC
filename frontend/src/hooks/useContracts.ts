import { useState, useEffect } from 'react';
import { ContractService } from '../services/contracts';
import { useWeb3 } from './useWeb3';

export const useContracts = () => {
  const { provider, address } = useWeb3();
  const [contractService, setContractService] = useState<ContractService | null>(null);
  const [userRole, setUserRole] = useState<number | null>(null);

  useEffect(() => {
    if (provider && address) {
      const service = new ContractService(provider);
      setContractService(service);

      // Get user role
      service.getUserRole(address)
        .then(role => setUserRole(role))
        .catch(console.error);
    }
  }, [provider, address]);

  const requestEmergencyAccess = async (patientAddress: string) => {
    if (!contractService) throw new Error('Contract service not initialized');
    return await contractService.requestEmergencyAccess(
      patientAddress,
      'Emergency situation requires immediate access'
    );
  };

  const getPatientRecords = async (patientAddress: string) => {
    if (!contractService) throw new Error('Contract service not initialized');
    return await contractService.getPatientRecords(patientAddress);
  };

  const getAccessLogs = async (patientAddress: string) => {
    if (!contractService) throw new Error('Contract service not initialized');
    return await contractService.getAccessLogs(patientAddress);
  };

  return {
    userRole,
    requestEmergencyAccess,
    getPatientRecords,
    getAccessLogs,
    isInitialized: !!contractService
  };
};