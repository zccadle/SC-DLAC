import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getProvider, getContracts } from '../utils/web3';

interface Web3State {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  contracts: any | null;
  address: string | null;
  error: string | null;
}

export const useWeb3 = () => {
  const [state, setState] = useState<Web3State>({
    provider: null,
    signer: null,
    contracts: null,
    address: null,
    error: null
  });

  const connect = async () => {
    try {
      const provider = getProvider();
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const contracts = getContracts(signer);

      setState({
        provider,
        signer,
        contracts,
        address: accounts[0],
        error: null
      });
    } catch (err: any) {
      setState(prev => ({ ...prev, error: err.message }));
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setState(prev => ({ ...prev, address: accounts[0] }));
        } else {
          setState(prev => ({ ...prev, address: null }));
        }
      });
    }
  }, []);

  return { ...state, connect };
};