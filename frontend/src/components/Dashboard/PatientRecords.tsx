import React, { useState } from 'react';
import { PatientRecord } from '../../types';

interface PatientRecordsProps {
  isConnected: boolean;
  userAddress?: string | null;
}

const PatientRecords: React.FC<PatientRecordsProps> = ({ isConnected, userAddress }) => {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPatientRecords = async () => {
    setLoading(true);
    try {
      // TODO: Implement contract call
      // This is mock data for now
      setRecords([
        {
          id: '1',
          address: '0x123...',
          lastUpdated: new Date().toISOString(),
          status: 'Active'
        },
        {
          id: '2',
          address: '0x456...',
          lastUpdated: new Date().toISOString(),
          status: 'Emergency'
        }
      ]);
    } catch (error) {
      console.error('Error loading patient records:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #e0e0e0', borderRadius: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Patient Records</h2>
        <button
          onClick={loadPatientRecords}
          disabled={!isConnected || loading}
          style={{
            padding: '8px 16px',
            borderRadius: '5px',
            border: 'none',
            backgroundColor: '#2196F3',
            color: 'white',
            cursor: isConnected ? 'pointer' : 'not-allowed',
            opacity: isConnected ? 1 : 0.7
          }}
        >
          {loading ? 'Loading...' : 'Refresh Records'}
        </button>
      </div>

      {records.length > 0 ? (
        <div style={{ display: 'grid', gap: '10px' }}>
          {records.map(record => (
            <div
              key={record.id}
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
                  Patient: {record.address}
                </p>
                <p style={{ margin: '0', fontSize: '0.9em', color: '#666' }}>
                  Last Updated: {new Date(record.lastUpdated).toLocaleString()}
                </p>
              </div>
              <span style={{
                padding: '5px 10px',
                borderRadius: '15px',
                backgroundColor: record.status === 'Emergency' ? '#ffebee' : '#e8f5e9',
                color: record.status === 'Emergency' ? '#c62828' : '#2e7d32',
                fontSize: '0.9em'
              }}>
                {record.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#666' }}>
          {isConnected ? 'No records found' : 'Connect wallet to view patient records'}
        </p>
      )}
    </div>
  );
};

export default PatientRecords;