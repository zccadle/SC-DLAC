export const CONTRACT_ADDRESSES = {
    RBAC: "YOUR_RBAC_ADDRESS",
    PATIENT_STORAGE: "YOUR_PATIENT_STORAGE_ADDRESS",
    AUDIT_LOG: "YOUR_AUDIT_LOG_ADDRESS",
    DID_REGISTRY: "YOUR_DID_REGISTRY_ADDRESS",
    ZKP_VERIFIER: "YOUR_ZKP_VERIFIER_ADDRESS"
  };
  
  export enum Role {
    NONE,
    PATIENT,
    NURSE,
    PARAMEDIC,
    DOCTOR,
    ADMIN,
    AUDITOR
  }
  
  export const PERMISSIONS = {
    VIEW_DATA: "view_data",
    UPDATE_DATA: "update_data",
    CREATE_RECORD: "create_record",
    REQUEST_EMERGENCY: "request_emergency"
  };