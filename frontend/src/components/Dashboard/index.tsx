import React from 'react';
import { useWeb3 } from '../../hooks/useWeb3';
import PatientRecords from './PatientRecords';
import EmergencyAccess from './EmergencyAccess';
import AuditLog from './AuditLog';

const Dashboard: React.FC = () => {
  const { address, connect, error } = useWeb3();

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h1>DACEMS Dashboard</h1>
        <button 
          onClick={connect}
          style={{
            padding: '10px 20px',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: address ? '#4CAF50' : '#2196F3',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          {address ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          color: '#c62828',
          borderRadius: '5px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: '20px' }}>
        <PatientRecords isConnected={!!address} userAddress={address} />
        <EmergencyAccess isConnected={!!address} userAddress={address} />
        <AuditLog isConnected={!!address} userAddress={address} />
      </div>
    </div>
  );
};

export default Dashboard;