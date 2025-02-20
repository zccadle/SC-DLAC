import React, { useState } from 'react';
import { EmergencyRequest } from '../../types';

interface EmergencyAccessProps {
  isConnected: boolean;
  userAddress?: string | null;
}

const EmergencyAccess: React.FC<EmergencyAccessProps> = ({ isConnected, userAddress }) => {
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [patientAddress, setPatientAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const requestEmergencyAccess = async () => {
    if (!patientAddress) return;
    
    setLoading(true);
    try {
      // TODO: Implement contract call
      // This is mock data for now
      const newRequest: EmergencyRequest = {
        id: Date.now().toString(),
        patient: patientAddress,
        requestTime: new Date().toISOString(),
        status: 'Pending'
      };
      setRequests(prev => [newRequest, ...prev]);
      setPatientAddress('');
    } catch (error) {
      console.error('Error requesting emergency access:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #e0e0e0', borderRadius: '5px' }}>
      <h2>Emergency Access</h2>
      
      <div style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input
            type="text"
            value={patientAddress}
            onChange={(e) => setPatientAddress(e.target.value)}
            placeholder="Enter patient address"
            disabled={!isConnected || loading}
            style={{
              padding: '8px',
              borderRadius: '5px',
              border: '1px solid #e0e0e0',
              flex: 1
            }}
          />
          <button
            onClick={requestEmergencyAccess}
            disabled={!isConnected || !patientAddress || loading}
            style={{
              padding: '8px 16px',
              borderRadius: '5px',
              border: 'none',
              backgroundColor: '#f44336',
              color: 'white',
              cursor: isConnected && patientAddress ? 'pointer' : 'not-allowed',
              opacity: isConnected && patientAddress ? 1 : 0.7
            }}
          >
            {loading ? 'Requesting...' : 'Request Access'}
          </button>
        </div>

        <div style={{ display: 'grid', gap: '10px' }}>
          {requests.map(request => (
            <div
              key={request.id}
              style={{
                padding: '15px',
                border: '1px solid #e0e0e0',
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                  Patient: {request.patient}
                </p>
                <p style={{ margin: '0', fontSize: '0.9em', color: '#666' }}>
                  Requested: {new Date(request.requestTime).toLocaleString()}
                </p>
              </div>
              <span style={{
                padding: '5px 10px',
                borderRadius: '15px',
                backgroundColor: 
                  request.status === 'Approved' ? '#e8f5e9' :
                  request.status === 'Rejected' ? '#ffebee' : '#fff3e0',
                color: 
                  request.status === 'Approved' ? '#2e7d32' :
                  request.status === 'Rejected' ? '#c62828' : '#ef6c00',
                fontSize: '0.9em'
              }}>
                {request.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmergencyAccess;