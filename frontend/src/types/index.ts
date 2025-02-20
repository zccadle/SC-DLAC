export interface PatientRecord {
    id: string;
    address: string;
    lastUpdated: string;
    status: 'Active' | 'Emergency';
  }
  
  export interface EmergencyRequest {
    id: string;
    patient: string;
    requestTime: string;
    status: 'Pending' | 'Approved' | 'Rejected';
  }
  
  export interface AccessLog {
    id: string;
    user: string;
    action: string;
    timestamp: string;
    isEmergency: boolean;
  }