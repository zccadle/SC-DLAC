import React, { useState, useEffect } from 'react';
import { useContracts } from '../../hooks/useContracts';
import { AccessLog } from '../../types';

interface AuditLogProps {
  isConnected: boolean;
  userAddress?: string | null;
}

const AuditLog: React.FC<AuditLogProps> = ({ isConnected, userAddress }) => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { getAccessLogs, isInitialized } = useContracts();

  const loadLogs = async () => {
    if (!isConnected || !userAddress || !isInitialized) return;
    
    setLoading(true);
    try {
      const accessLogs = await getAccessLogs(userAddress);
      setLogs(accessLogs);
    } catch (error) {
      console.error('Error loading access logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isConnected && userAddress && isInitialized) {
      loadLogs();
    }
  }, [isConnected, userAddress, isInitialized]);

  return (
    <div style={{ padding: '20px', border: '1px solid #e0e0e0', borderRadius: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Access Logs</h2>
        <button
          onClick={loadLogs}
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
          {loading ? 'Loading...' : 'Refresh Logs'}
        </button>
      </div>

      {logs.length > 0 ? (
        <div style={{ display: 'grid', gap: '10px' }}>
          {logs.map(log => (
            <div
              key={log.id}
              style={{
                padding: '15px',
                border: '1px solid #e0e0e0',
                borderRadius: '5px'
              }}
            >
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                User: {log.user}
              </p>
              <p style={{ margin: '0 0 5px 0' }}>
                Action: {log.action}
              </p>
              <p style={{ margin: '0', fontSize: '0.9em', color: '#666' }}>
                Time: {new Date(log.timestamp).toLocaleString()}
              </p>
              {log.isEmergency && (
                <span style={{
                  display: 'inline-block',
                  marginTop: '5px',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#ffebee',
                  color: '#c62828',
                  fontSize: '0.8em'
                }}>
                  Emergency Access
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#666' }}>
          {isConnected ? 'No access logs found' : 'Connect wallet to view access logs'}
        </p>
      )}
    </div>
  );
};

export default AuditLog;