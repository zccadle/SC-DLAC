import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { RBAC_ABI } from '../abis';

declare global {
  interface Window {
    ethereum: any;
  }
}

export const getProvider = () => {
  if (window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  throw new Error("Please install MetaMask!");
};

export const getContracts = (signer: ethers.Signer) => {
  const rbac = new ethers.Contract(
    CONTRACT_ADDRESSES.RBAC,
    RBAC_ABI,
    signer
  );

  return { rbac };
};