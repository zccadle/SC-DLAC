// healthcare-workflow-simulations.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

class HealthcareWorkflowSimulator {
    constructor() {
        this.results = {
            description: "Real-world healthcare workflow simulations and performance analysis",
            testDate: new Date().toISOString(),
            hospitalAdmission: {
                description: "Complete patient admission workflow from ER to discharge",
                data: [],
                metrics: {}
            },
            emergencyResponse: {
                description: "Emergency response scenarios (trauma, cardiac, stroke)",
                data: [],
                metrics: {}
            },
            consultationWorkflow: {
                description: "Multi-specialist consultation and care coordination",
                data: [],
                metrics: {}
            },
            interHospitalTransfer: {
                description: "Patient transfer between healthcare facilities",
                data: [],
                metrics: {}
            },
            chronicCareManagement: {
                description: "Long-term chronic disease management workflows",
                data: [],
                metrics: {}
            },
            complianceWorkflows: {
                description: "HIPAA and regulatory compliance workflow testing",
                data: [],
                metrics: {}
            },
            patientConsentManagement: {
                description: "Dynamic patient consent and privacy management",
                data: [],
                metrics: {}
            }
        };
        this.workflowSteps = [];
        this.participants = {};
    }

    async measureWorkflowStep(stepName, operation, category, participants = []) {
        const start = performance.now();
        let success = false;
        let gasUsed = 0;
        let error = null;
        let result = null;

        try {
            result = await operation();
            if (result && result.wait) {
                const receipt = await result.wait();
                gasUsed = receipt.gasUsed ? receipt.gasUsed.toNumber() : 0;
            }
            success = true;
        } catch (err) {
            error = err.message;
            success = false;
        }

        const end = performance.now();
        const duration = end - start;

        const stepResult = {
            stepName,
            success,
            duration,
            gasUsed,
            error,
            participants,
            timestamp: new Date().toISOString(),
            result
        };

        this.results[category].data.push(stepResult);
        this.workflowSteps.push(stepResult);
        return stepResult;
    }

    async simulateWorkflow(workflowName, steps, category) {
        console.log(`\nSimulating ${workflowName}...`);
        const workflowStart = performance.now();
        let totalGas = 0;
        let successfulSteps = 0;

        for (const step of steps) {
            console.log(`  ${step.name}...`);
            const result = await this.measureWorkflowStep(
                step.name, 
                step.operation, 
                category, 
                step.participants || []
            );
            
            if (result.success) {
                successfulSteps++;
                totalGas += result.gasUsed;
                console.log(`    ✓ Success (${result.duration.toFixed(2)}ms, ${result.gasUsed} gas)`);
            } else {
                console.log(`    ✗ Failed: ${result.error}`);
            }
            
            // Simulate realistic delays between workflow steps
            await new Promise(resolve => setTimeout(resolve, step.delay || 500));
        }

        const workflowEnd = performance.now();
        const totalDuration = workflowEnd - workflowStart;

        const workflowSummary = {
            workflowName,
            totalSteps: steps.length,
            successfulSteps,
            totalDuration,
            totalGasUsed: totalGas,
            successRate: (successfulSteps / steps.length) * 100,
            averageStepDuration: totalDuration / steps.length
        };

        console.log(`  Workflow completed: ${successfulSteps}/${steps.length} steps successful`);
        console.log(`  Total time: ${totalDuration.toFixed(2)}ms, Total gas: ${totalGas}`);

        return workflowSummary;
    }

    generatePatientData(severity = 'normal') {
        const baseData = {
            'vital-signs': 'Heart rate: 72bpm, BP: 120/80, O2: 98%, Temp: 98.6°F',
            'medical-history': 'No known allergies, Previous surgery: Appendectomy 2019',
            'current-medications': 'Lisinopril 10mg daily, Metformin 500mg twice daily',
            'allergies': 'NKDA (No Known Drug Allergies)',
            'insurance': 'Blue Cross Blue Shield - Policy #BC123456789'
        };

        if (severity === 'critical') {
            baseData['vital-signs'] = 'Heart rate: 140bpm, BP: 80/40, O2: 88%, Temp: 103.2°F';
            baseData['emergency-notes'] = 'CRITICAL: Severe hypotension, tachycardia, hypoxemia';
        } else if (severity === 'emergency') {
            baseData['vital-signs'] = 'Heart rate: 110bpm, BP: 160/95, O2: 92%, Temp: 101.1°F';
            baseData['emergency-notes'] = 'URGENT: Hypertensive crisis, mild respiratory distress';
        }

        return baseData;
    }
}

async function main() {
    console.log("Starting comprehensive healthcare workflow simulations...");
    
    const simulator = new HealthcareWorkflowSimulator();
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Deploy contracts
    console.log("Deploying contracts for healthcare workflow simulation...");
    
    const ZKPManager = await ethers.getContractFactory("ZKPVerifier");
    const zkpManager = await ZKPManager.deploy();
    await zkpManager.deployed();
    
    const DLACManager = await ethers.getContractFactory("EnhancedRBAC");
    const dlacManager = await DLACManager.deploy(ethers.constants.AddressZero, zkpManager.address);
    await dlacManager.deployed();
    
    const DIDManager = await ethers.getContractFactory("DIDRegistry");
    const didManager = await DIDManager.deploy(dlacManager.address);
    await didManager.deployed();
    
    await dlacManager.updateDIDRegistry(didManager.address);
    
    const AuditLogger = await ethers.getContractFactory("EnhancedAuditLog");
    const auditLogger = await AuditLogger.deploy();
    await auditLogger.deployed();
    
    const EHRManager = await ethers.getContractFactory("UpdatedPatientDataStorage");
    const ehrManager = await EHRManager.deploy(
        dlacManager.address,
        auditLogger.address,
        didManager.address,
        zkpManager.address
    );
    await ehrManager.deployed();
    
    // Authorize EHR Manager to use AuditLogger
    await auditLogger.authorizeLogger(ehrManager.address);

    // Get healthcare participants
    const [
        owner, 
        patient1, patient2, patient3,
        erDoctor, cardiologist, radiologist, nurseManager, nurse1, nurse2,
        paramedic1, paramedic2, pharmacist, labTech, 
        administrator, auditor, socialWorker
    ] = await ethers.getSigners();

    // Setup comprehensive healthcare environment
    console.log("Setting up healthcare simulation environment...");
    
    simulator.participants = {
        patients: { patient1, patient2, patient3 },
        doctors: { erDoctor, cardiologist, radiologist },
        nurses: { nurseManager, nurse1, nurse2 },
        emergency: { paramedic1, paramedic2 },
        support: { pharmacist, labTech, socialWorker },
        admin: { administrator, auditor }
    };

    // Create DIDs for all participants
    const allParticipants = [
        patient1, patient2, patient3, erDoctor, cardiologist, radiologist,
        nurseManager, nurse1, nurse2, paramedic1, paramedic2, pharmacist,
        labTech, administrator, auditor, socialWorker
    ];

    for (const participant of allParticipants) {
        const did = `did:ethr:${participant.address}`;
        await didManager.connect(participant).createDID(did, []);
    }

    // Assign healthcare roles
    const roleAssignments = [
        { user: erDoctor, role: "DOCTOR", delegated: true },     // ER doctors need emergency access
        { user: cardiologist, role: "DOCTOR", delegated: true }, // Specialists need emergency access
        { user: radiologist, role: "DOCTOR", delegated: true },  // Radiologists need emergency access
        { user: nurseManager, role: "NURSE", delegated: true },  // Nurse managers may need emergency access
        { user: nurse1, role: "NURSE", delegated: false },
        { user: nurse2, role: "NURSE", delegated: false },
        { user: paramedic1, role: "PARAMEDIC", delegated: true },
        { user: paramedic2, role: "PARAMEDIC", delegated: true },
        { user: pharmacist, role: "PHARMACIST", delegated: false },
        { user: administrator, role: "ADMIN", delegated: false },
        { user: auditor, role: "AUDITOR", delegated: false }
    ];

    for (const assignment of roleAssignments) {
        const credential = ethers.utils.keccak256(
            ethers.utils.toUtf8Bytes(`${assignment.role}_${assignment.user.address}`)
        );
        const did = `did:ethr:${assignment.user.address}`;
        
        await dlacManager.connect(owner).assignRole(
            assignment.user.address,
            assignment.role,
            credential,
            did,
            365 * 24 * 60 * 60,
            assignment.delegated
        );
    }

    // Grant comprehensive permissions
    await dlacManager.connect(owner).grantPermission("DOCTOR", "view_data");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "update_data");
    await dlacManager.connect(owner).grantPermission("DOCTOR", "create_record");
    await dlacManager.connect(owner).grantPermission("NURSE", "view_data");
    await dlacManager.connect(owner).grantPermission("NURSE", "update_data");
    await dlacManager.connect(owner).grantPermission("PARAMEDIC", "view_data");
    await dlacManager.connect(owner).grantPermission("PARAMEDIC", "update_data");
    await dlacManager.connect(owner).grantPermission("PHARMACIST", "view_data");
    await dlacManager.connect(owner).grantPermission("AUDITOR", "view_data");

    // Helper function for proof setup
    const setupProof = async (user) => {
        const zkProof = ethers.utils.randomBytes(32);
        const proofHash = ethers.utils.keccak256(zkProof);
        await zkpManager.connect(user).submitProof(proofHash);
        return zkProof;
    };

    // Helper function for emergency access proof setup
    const setupEmergencyProof = async (user) => {
        const zkProof = ethers.utils.randomBytes(32);
        // For emergency access, we need to combine role credential with proof
        const roleHash = await dlacManager.getRoleCredential(user.address);
        const combinedProofHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [roleHash, zkProof]));
        await zkpManager.connect(user).submitProof(combinedProofHash);
        return zkProof;
    };

    // Helper function to create emergency policy and get policy ID
    const createEmergencyPolicy = async (patient, provider, dataCategory, permission, validityHours = 24) => {
        const tx = await ehrManager.connect(patient).createDelegationPolicy(
            provider.address,
            dataCategory,
            permission,
            validityHours * 60 * 60
        );
        const receipt = await tx.wait();
        const event = receipt.events.find(e => e.event === 'PolicyCreated');
        return event ? event.args.policyID.toNumber() : nextPolicyId++;
    };

    // Track policy IDs for proper reference
    let nextPolicyId = 1;
    const policyTracker = {};

    console.log("Healthcare simulation environment setup completed.");

    // Workflow 1: Complete Hospital Admission Process
    const admissionWorkflow = [
        {
            name: "Patient arrives at ER - Initial triage",
            participants: ["patient1", "nurse1"],
            operation: async () => {
                return await ehrManager.connect(erDoctor).createPatientRecord(patient1.address);
            }
        },
        {
            name: "ER physician initial assessment",
            participants: ["erDoctor", "patient1"],
            operation: async () => {
                const proof = await setupProof(erDoctor);
                const patientData = simulator.generatePatientData('emergency');
                return await ehrManager.connect(erDoctor).updatePatientData(
                    patient1.address, "initial-assessment", 
                    "Chest pain, shortness of breath. Possible cardiac event. Admit for observation.", 
                    proof
                );
            }
        },
        {
            name: "Vital signs monitoring setup",
            participants: ["nurse1", "patient1"],
            operation: async () => {
                const proof = await setupProof(nurse1);
                return await ehrManager.connect(nurse1).updatePatientData(
                    patient1.address, "vital-signs", 
                    "Initial: HR 95, BP 145/90, O2 94%, Temp 99.1F", 
                    proof
                );
            },
            delay: 800
        },
        {
            name: "Cardiology consultation request",
            participants: ["erDoctor", "cardiologist"],
            operation: async () => {
                return await ehrManager.connect(patient1).createDelegationPolicy(
                    cardiologist.address, "initial-assessment", "read/write", 48 * 60 * 60
                );
            }
        },
        {
            name: "Cardiologist emergency access",
            participants: ["cardiologist", "patient1"],
            operation: async () => {
                const proof = await setupEmergencyProof(cardiologist);
                return await ehrManager.connect(cardiologist).requestDelegatedEmergencyAccess(
                    patient1.address, "Cardiology consultation for chest pain", proof, 1
                );
            }
        },
        {
            name: "Cardiologist assessment and orders",
            participants: ["cardiologist", "patient1"],
            operation: async () => {
                const proof = await setupProof(cardiologist);
                return await ehrManager.connect(cardiologist).updatePatientData(
                    patient1.address, "cardiology-notes", 
                    "EKG shows ST elevations in leads II, III, aVF. Recommend cath lab activation. Start dual antiplatelet therapy.", 
                    proof
                );
            },
            delay: 1200
        },
        {
            name: "Radiology imaging orders",
            participants: ["cardiologist", "radiologist"],
            operation: async () => {
                return await ehrManager.connect(patient1).createDelegationPolicy(
                    radiologist.address, "cardiology-notes", "read", 24 * 60 * 60
                );
            }
        },
        {
            name: "Transfer to cardiac unit",
            participants: ["nurse2", "patient1"],
            operation: async () => {
                const proof = await setupProof(nurse2);
                return await ehrManager.connect(nurse2).updatePatientData(
                    patient1.address, "transfer-notes", 
                    "Patient transferred to cardiac unit. Stable condition. Continuous monitoring initiated.", 
                    proof
                );
            },
            delay: 600
        }
    ];

    await simulator.simulateWorkflow("Hospital Admission Process", admissionWorkflow, "hospitalAdmission");

    // Workflow 2: Emergency Response - Trauma Scenario
    // Store trauma policy IDs
    simulator.traumaPolicyIds = simulator.traumaPolicyIds || [];
    
    const traumaWorkflow = [
        {
            name: "Ambulance dispatch and patient assessment",
            participants: ["paramedic1", "patient2"],
            operation: async () => {
                return await ehrManager.connect(erDoctor).createPatientRecord(patient2.address);
            }
        },
        {
            name: "Pre-hospital emergency delegation",
            participants: ["patient2", "paramedic1"],
            operation: async () => {
                const tx = await ehrManager.connect(patient2).createDelegationPolicy(
                    paramedic1.address, "emergency-vitals", "read/write", 24 * 60 * 60
                );
                const receipt = await tx.wait();
                const event = receipt.events.find(e => e.event === 'PolicyCreated');
                if (event) {
                    simulator.traumaPolicyIds.push(event.args.policyID.toNumber());
                }
                return tx;
            }
        },
        {
            name: "Paramedic emergency access request",
            participants: ["paramedic1", "patient2"],
            operation: async () => {
                const proof = await setupEmergencyProof(paramedic1);
                const policyId = simulator.traumaPolicyIds.length > 0 ? simulator.traumaPolicyIds[0] : 1;
                return await ehrManager.connect(paramedic1).requestDelegatedEmergencyAccess(
                    patient2.address, "Motor vehicle accident - multiple trauma", proof, policyId
                );
            }
        },
        {
            name: "Field assessment and stabilization",
            participants: ["paramedic1", "patient2"],
            operation: async () => {
                const proof = await setupProof(paramedic1);
                return await ehrManager.connect(paramedic1).updatePatientData(
                    patient2.address, "field-assessment", 
                    "MVA with rollover. Conscious but altered. Suspected internal bleeding. IV access x2, 2L NS running.", 
                    proof
                );
            },
            delay: 1000
        },
        {
            name: "Hospital pre-arrival notification",
            participants: ["paramedic1", "erDoctor"],
            operation: async () => {
                const tx = await ehrManager.connect(patient2).createDelegationPolicy(
                    erDoctor.address, "field-assessment", "read/write", 48 * 60 * 60
                );
                const receipt = await tx.wait();
                const event = receipt.events.find(e => e.event === 'PolicyCreated');
                if (event) {
                    simulator.traumaPolicyIds.push(event.args.policyID.toNumber());
                }
                return tx;
            }
        },
        {
            name: "ER trauma team activation",
            participants: ["erDoctor", "patient2"],
            operation: async () => {
                const proof = await setupEmergencyProof(erDoctor);
                const policyId = simulator.traumaPolicyIds.length > 1 ? simulator.traumaPolicyIds[1] : 2;
                return await ehrManager.connect(erDoctor).requestDelegatedEmergencyAccess(
                    patient2.address, "Trauma team activation - Level 1 trauma", proof, policyId
                );
            }
        },
        {
            name: "Multi-specialist emergency consultation",
            participants: ["erDoctor", "cardiologist", "radiologist"],
            operation: async () => {
                const consultations = await Promise.all([
                    ehrManager.connect(patient2).createDelegationPolicy(
                        cardiologist.address, "field-assessment", "read", 24 * 60 * 60
                    ),
                    ehrManager.connect(patient2).createDelegationPolicy(
                        radiologist.address, "field-assessment", "read", 24 * 60 * 60
                    )
                ]);
                
                // Extract policy IDs
                for (const tx of consultations) {
                    const receipt = await tx.wait();
                    const event = receipt.events.find(e => e.event === 'PolicyCreated');
                    if (event) {
                        simulator.traumaPolicyIds.push(event.args.policyID.toNumber());
                    }
                }
                
                return consultations;
            }
        },
        {
            name: "Concurrent specialist assessments",
            participants: ["cardiologist", "radiologist"],
            operation: async () => {
                const [cardioProof, radioProof] = await Promise.all([
                    setupEmergencyProof(cardiologist),
                    setupEmergencyProof(radiologist)
                ]);
                
                const cardioPolicyId = simulator.traumaPolicyIds.length > 2 ? simulator.traumaPolicyIds[2] : 3;
                const radioPolicyId = simulator.traumaPolicyIds.length > 3 ? simulator.traumaPolicyIds[3] : 4;
                
                const assessments = [
                    ehrManager.connect(cardiologist).requestDelegatedEmergencyAccess(
                        patient2.address, "Cardiac assessment for trauma patient", cardioProof, cardioPolicyId
                    ),
                    ehrManager.connect(radiologist).requestDelegatedEmergencyAccess(
                        patient2.address, "Emergency imaging for trauma", radioProof, radioPolicyId
                    )
                ];
                return await Promise.all(assessments);
            },
            delay: 800
        }
    ];

    await simulator.simulateWorkflow("Emergency Trauma Response", traumaWorkflow, "emergencyResponse");

    // Workflow 3: Multi-Specialist Consultation
    // Store consultation policy IDs
    simulator.consultationPolicyIds = simulator.consultationPolicyIds || [];
    
    const consultationWorkflow = [
        {
            name: "Primary care referral initialization",
            participants: ["erDoctor", "patient3"],
            operation: async () => {
                await ehrManager.connect(erDoctor).createPatientRecord(patient3.address);
                const proof = await setupProof(erDoctor);
                return await ehrManager.connect(erDoctor).updatePatientData(
                    patient3.address, "referral-notes", 
                    "Complex cardiac case requiring multi-disciplinary approach. Refer to cardiology and radiology.", 
                    proof
                );
            }
        },
        {
            name: "Patient consent for multi-specialist access",
            participants: ["patient3", "cardiologist", "radiologist"],
            operation: async () => {
                const consents = await Promise.all([
                    ehrManager.connect(patient3).createDelegationPolicy(
                        cardiologist.address, "referral-notes", "read/write", 72 * 60 * 60
                    ),
                    ehrManager.connect(patient3).createDelegationPolicy(
                        radiologist.address, "referral-notes", "read", 72 * 60 * 60
                    )
                ]);
                
                // Extract policy IDs
                for (const tx of consents) {
                    const receipt = await tx.wait();
                    const event = receipt.events.find(e => e.event === 'PolicyCreated');
                    if (event) {
                        simulator.consultationPolicyIds.push(event.args.policyID.toNumber());
                    }
                }
                
                return consents;
            }
        },
        {
            name: "Cardiology specialist access",
            participants: ["cardiologist", "patient3"],
            operation: async () => {
                const proof = await setupEmergencyProof(cardiologist);
                const policyId = simulator.consultationPolicyIds.length > 0 ? simulator.consultationPolicyIds[0] : 1;
                return await ehrManager.connect(cardiologist).requestDelegatedEmergencyAccess(
                    patient3.address, "Specialized cardiology consultation", proof, policyId
                );
            }
        },
        {
            name: "Cardiologist detailed assessment",
            participants: ["cardiologist", "patient3"],
            operation: async () => {
                const proof = await setupProof(cardiologist);
                return await ehrManager.connect(cardiologist).updatePatientData(
                    patient3.address, "cardiology-detailed", 
                    "Echo shows EF 35%, moderate MR. Recommend cardiac cath and possible intervention. Start ACE inhibitor.", 
                    proof
                );
            },
            delay: 1500
        },
        {
            name: "Radiology imaging coordination",
            participants: ["radiologist", "patient3"],
            operation: async () => {
                const proof = await setupEmergencyProof(radiologist);
                const policyId = simulator.consultationPolicyIds.length > 1 ? simulator.consultationPolicyIds[1] : 2;
                return await ehrManager.connect(radiologist).requestDelegatedEmergencyAccess(
                    patient3.address, "Cardiac imaging interpretation", proof, policyId
                );
            }
        },
        {
            name: "Cross-specialist consultation",
            participants: ["cardiologist", "radiologist"],
            operation: async () => {
                // Simulate specialists accessing each other's notes for coordination
                const [cardioProof, radioProof] = await Promise.all([
                    setupProof(cardiologist),
                    setupProof(radiologist)
                ]);
                
                const coordination = [
                    ehrManager.connect(cardiologist).getPatientData(patient3.address, "referral-notes", cardioProof),
                    ehrManager.connect(radiologist).getPatientData(patient3.address, "cardiology-detailed", radioProof)
                ];
                return await Promise.all(coordination);
            },
            delay: 700
        }
    ];

    await simulator.simulateWorkflow("Multi-Specialist Consultation", consultationWorkflow, "consultationWorkflow");

    // Workflow 4: Inter-Hospital Transfer
    const transferWorkflow = [
        {
            name: "Transfer request initiation",
            participants: ["erDoctor", "patient1"],
            operation: async () => {
                const proof = await setupProof(erDoctor);
                return await ehrManager.connect(erDoctor).updatePatientData(
                    patient1.address, "transfer-request", 
                    "Patient requires specialized cardiac surgery not available at this facility. Recommend transfer to cardiac center.", 
                    proof
                );
            }
        },
        {
            name: "Receiving hospital access delegation",
            participants: ["patient1", "cardiologist"],
            operation: async () => {
                const tx = await ehrManager.connect(patient1).createDelegationPolicy(
                    cardiologist.address, "transfer-request", "read/write", 96 * 60 * 60
                );
                const receipt = await tx.wait();
                const event = receipt.events.find(e => e.event === 'PolicyCreated');
                const policyId = event ? event.args.policyID.toNumber() : null;
                
                // Store policy ID for next step
                simulator.transferPolicyIds = simulator.transferPolicyIds || [];
                simulator.transferPolicyIds.push(policyId);
                
                return tx;
            }
        },
        {
            name: "Medical records transfer",
            participants: ["cardiologist", "patient1"],
            operation: async () => {
                const proof = await setupEmergencyProof(cardiologist);
                const policyId = simulator.transferPolicyIds && simulator.transferPolicyIds.length > 0 
                    ? simulator.transferPolicyIds[0] 
                    : 1; // fallback to 1 if no policy ID stored
                
                const transferAccess = await ehrManager.connect(cardiologist).requestDelegatedEmergencyAccess(
                    patient1.address, "Inter-hospital transfer - receiving facility", proof, policyId
                );
                
                // Simulate accessing comprehensive patient data
                const accessProof = await setupProof(cardiologist);
                await ehrManager.connect(cardiologist).getPatientData(patient1.address, "cardiology-notes", accessProof);
                await ehrManager.connect(cardiologist).getPatientData(patient1.address, "vital-signs", accessProof);
                
                return transferAccess;
            },
            delay: 1200
        },
        {
            name: "Transport team handoff",
            participants: ["paramedic2", "patient1"],
            operation: async () => {
                const delegationTx = await ehrManager.connect(patient1).createDelegationPolicy(
                    paramedic2.address, "transfer-request", "read", 12 * 60 * 60
                );
                
                const receipt = await delegationTx.wait();
                const event = receipt.events.find(e => e.event === 'PolicyCreated');
                const policyId = event ? event.args.policyID.toNumber() : 2; // fallback to 2
                
                const proof = await setupEmergencyProof(paramedic2);
                return await ehrManager.connect(paramedic2).requestDelegatedEmergencyAccess(
                    patient1.address, "Inter-hospital transport", proof, policyId
                );
            }
        },
        {
            name: "Receiving facility admission",
            participants: ["cardiologist", "patient1"],
            operation: async () => {
                const proof = await setupProof(cardiologist);
                return await ehrManager.connect(cardiologist).updatePatientData(
                    patient1.address, "admission-notes", 
                    "Patient received from outside facility. Stable for transport. Ready for cardiac surgery evaluation.", 
                    proof
                );
            },
            delay: 900
        }
    ];

    await simulator.simulateWorkflow("Inter-Hospital Transfer", transferWorkflow, "interHospitalTransfer");

    // Workflow 5: Chronic Care Management
    // Store chronic care policy IDs
    simulator.chronicCarePolicyIds = simulator.chronicCarePolicyIds || [];
    
    const chronicCareWorkflow = [
        {
            name: "Chronic care program enrollment",
            participants: ["erDoctor", "patient2"],
            operation: async () => {
                const proof = await setupProof(erDoctor);
                return await ehrManager.connect(erDoctor).updatePatientData(
                    patient2.address, "chronic-care-plan", 
                    "Enrolled in diabetes management program. Baseline HbA1c 8.2%. Target <7%.", 
                    proof
                );
            }
        },
        {
            name: "Care team access setup",
            participants: ["patient2", "nurse1", "pharmacist"],
            operation: async () => {
                const delegations = await Promise.all([
                    ehrManager.connect(patient2).createDelegationPolicy(
                        nurse1.address, "chronic-care-plan", "read/write", 365 * 24 * 60 * 60
                    ),
                    ehrManager.connect(patient2).createDelegationPolicy(
                        pharmacist.address, "chronic-care-plan", "read", 365 * 24 * 60 * 60
                    )
                ]);
                
                // Extract policy IDs
                for (const tx of delegations) {
                    const receipt = await tx.wait();
                    const event = receipt.events.find(e => e.event === 'PolicyCreated');
                    if (event) {
                        simulator.chronicCarePolicyIds.push(event.args.policyID.toNumber());
                    }
                }
                
                return delegations;
            }
        },
        {
            name: "Regular monitoring updates",
            participants: ["nurse1", "patient2"],
            operation: async () => {
                const proof = await setupProof(nurse1);
                return await ehrManager.connect(nurse1).updatePatientData(
                    patient2.address, "monitoring-data", 
                    "Monthly check: Weight stable, BP 135/85, patient reports good adherence to medications.", 
                    proof
                );
            },
            delay: 600
        },
        {
            name: "Medication management review",
            participants: ["pharmacist", "patient2"],
            operation: async () => {
                // Pharmacist already has read access via delegation policy
                const proof = await setupProof(pharmacist);
                return await ehrManager.connect(pharmacist).getPatientData(
                    patient2.address, "chronic-care-plan", proof
                );
            }
        }
    ];

    await simulator.simulateWorkflow("Chronic Care Management", chronicCareWorkflow, "chronicCareManagement");

    // Workflow 6: Compliance and Audit Workflows
    const complianceWorkflow = [
        {
            name: "Audit trail generation for compliance",
            participants: ["auditor"],
            operation: async () => {
                return await auditLogger.getAccessRecordCount();
            }
        },
        {
            name: "Patient access history review",
            participants: ["auditor", "patient1"],
            operation: async () => {
                return await auditLogger.getPatientAccessRecords(patient1.address);
            }
        },
        {
            name: "Provider access pattern analysis",
            participants: ["auditor", "erDoctor"],
            operation: async () => {
                // Get all access records and filter for this provider
                const totalRecords = await auditLogger.getAccessRecordCount();
                const providerRecords = [];
                for (let i = 0; i < totalRecords; i++) {
                    const record = await auditLogger.getAccessRecord(i);
                    if (record.user === erDoctor.address) {
                        providerRecords.push(record);
                    }
                }
                return providerRecords;
            }
        },
        {
            name: "Emergency access compliance check",
            participants: ["auditor"],
            operation: async () => {
                const allRecords = await auditLogger.getPatientAccessRecords(patient2.address);
                return {
                    totalAccess: allRecords.length,
                    emergencyAccess: allRecords.filter(r => r.isEmergency).length
                };
            }
        }
    ];

    await simulator.simulateWorkflow("Compliance and Audit", complianceWorkflow, "complianceWorkflows");

    // Workflow 7: Patient Consent Management
    // Store consent policy IDs
    simulator.consentPolicyIds = simulator.consentPolicyIds || [];
    
    const consentWorkflow = [
        {
            name: "Initial consent setup",
            participants: ["patient3"],
            operation: async () => {
                const tx = await ehrManager.connect(patient3).createDelegationPolicy(
                    erDoctor.address, "consent-test", "read/write", 30 * 24 * 60 * 60
                );
                const receipt = await tx.wait();
                const event = receipt.events.find(e => e.event === 'PolicyCreated');
                if (event) {
                    simulator.consentPolicyIds.push(event.args.policyID.toNumber());
                }
                return tx;
            }
        },
        {
            name: "Consent modification - add specialist",
            participants: ["patient3", "cardiologist"],
            operation: async () => {
                const tx = await ehrManager.connect(patient3).createDelegationPolicy(
                    cardiologist.address, "consent-test", "read", 14 * 24 * 60 * 60
                );
                const receipt = await tx.wait();
                const event = receipt.events.find(e => e.event === 'PolicyCreated');
                if (event) {
                    simulator.consentPolicyIds.push(event.args.policyID.toNumber());
                }
                return tx;
            }
        },
        {
            name: "Consent revocation test",
            participants: ["patient3", "cardiologist"],
            operation: async () => {
                // First ensure cardiologist has access
                const proof = await setupEmergencyProof(cardiologist);
                const policyId = simulator.consentPolicyIds.length > 1 ? simulator.consentPolicyIds[1] : 2;
                await ehrManager.connect(cardiologist).requestDelegatedEmergencyAccess(
                    patient3.address, "Consent management test", proof, policyId
                );
                
                // Then revoke access
                return await ehrManager.connect(patient3).revokeDelegatedEmergencyAccess(cardiologist.address);
            }
        },
        {
            name: "Verify consent enforcement",
            participants: ["cardiologist", "patient3"],
            operation: async () => {
                const proof = await setupProof(cardiologist);
                // This should fail after revocation
                return await ehrManager.connect(cardiologist).getPatientData(
                    patient3.address, "consent-test", proof
                );
            }
        }
    ];

    await simulator.simulateWorkflow("Patient Consent Management", consentWorkflow, "patientConsentManagement");

    // Calculate comprehensive metrics
    for (const category of Object.keys(simulator.results)) {
        if (category === 'description' || category === 'testDate') continue;
        
        const data = simulator.results[category].data;
        if (data.length > 0) {
            simulator.results[category].metrics = {
                totalSteps: data.length,
                successfulSteps: data.filter(s => s.success).length,
                failedSteps: data.filter(s => !s.success).length,
                successRate: (data.filter(s => s.success).length / data.length) * 100,
                averageStepLatency: data.reduce((sum, s) => sum + s.duration, 0) / data.length,
                minStepLatency: Math.min(...data.map(s => s.duration)),
                maxStepLatency: Math.max(...data.map(s => s.duration)),
                totalGasUsed: data.reduce((sum, s) => sum + s.gasUsed, 0),
                averageGasPerStep: data.reduce((sum, s) => sum + s.gasUsed, 0) / data.length,
                participantCount: new Set(data.flatMap(s => s.participants)).size,
                workflowComplexity: data.length / new Set(data.flatMap(s => s.participants)).size
            };
        }
    }

    // Save comprehensive results
    const filename = `healthcare-workflows-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(resultsDir, filename),
        JSON.stringify(simulator.results, null, 2)
    );

    // Generate detailed summary report
    console.log("\n=== HEALTHCARE WORKFLOW SIMULATION SUMMARY ===");
    let totalWorkflowSteps = 0;
    let totalSuccessfulSteps = 0;
    let totalWorkflowTime = 0;
    let totalWorkflowGas = 0;

    for (const [category, results] of Object.entries(simulator.results)) {
        if (category === 'description' || category === 'testDate') continue;
        
        const metrics = results.metrics;
        console.log(`\n${category.toUpperCase()}:`);
        console.log(`  Workflow Steps: ${metrics.totalSteps}`);
        console.log(`  Success Rate: ${metrics.successRate.toFixed(2)}%`);
        console.log(`  Average Step Latency: ${metrics.averageStepLatency.toFixed(2)}ms`);
        console.log(`  Latency Range: ${metrics.minStepLatency.toFixed(2)}ms - ${metrics.maxStepLatency.toFixed(2)}ms`);
        console.log(`  Total Gas Used: ${metrics.totalGasUsed.toLocaleString()}`);
        console.log(`  Participants Involved: ${metrics.participantCount}`);
        console.log(`  Workflow Complexity: ${metrics.workflowComplexity.toFixed(2)} steps/participant`);

        totalWorkflowSteps += metrics.totalSteps;
        totalSuccessfulSteps += metrics.successfulSteps;
        totalWorkflowTime += metrics.averageStepLatency * metrics.totalSteps;
        totalWorkflowGas += metrics.totalGasUsed;
    }

    console.log("\n=== OVERALL SIMULATION SUMMARY ===");
    console.log(`Total Workflow Steps Executed: ${totalWorkflowSteps}`);
    console.log(`Overall Success Rate: ${((totalSuccessfulSteps / totalWorkflowSteps) * 100).toFixed(2)}%`);
    console.log(`Total Simulation Time: ${totalWorkflowTime.toFixed(2)}ms`);
    console.log(`Total Gas Consumption: ${totalWorkflowGas.toLocaleString()}`);
    console.log(`Average Gas Per Step: ${(totalWorkflowGas / totalWorkflowSteps).toFixed(0)}`);

    console.log(`\nResults saved to: ${filename}`);
    console.log("Healthcare workflow simulation completed!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });