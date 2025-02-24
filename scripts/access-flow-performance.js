// access-flow-performance.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const { submitAndVerifyProof, ensureValidProof } = require('./role-proof-helper');
const config = require('./test-config');

async function setupProofForDoctor(doctor, dlacManager, zkpManager) {
  try {
      // Get role credential
      const roleHash = await dlacManager.getRoleCredential(doctor.address);
      
      // Generate and format proof
      const zkProof = ethers.utils.randomBytes(32);
      const proofHash = ethers.utils.keccak256(zkProof);
      
      // Submit the raw proof hash
      const submitTx = await zkpManager.connect(doctor).submitProof(proofHash, {
          gasLimit: config.gasLimits.proofSubmission
      });
      await submitTx.wait();
      
      // Verify it was registered
      const isValid = await zkpManager.validateProof(doctor.address, proofHash);
      if (!isValid) {
          throw new Error("Proof validation failed after submission");
      }
      
      return {
          zkProof,
          proofHash,
          isValid: true
      };
  } catch (error) {
      console.error("Error in proof setup:", error);
      return {
          isValid: false,
          error: error.message
      };
  }
}

// Helper function to measure execution time
async function measureTime(func) {
  const start = performance.now();
  const result = await func();
  const end = performance.now();
  return { result, timeMs: end - start };
}

// Helper function for concurrent requests with proper error handling
async function runConcurrentRequests(func, count, batchSize = config.batchProcessing.batchSize) {
  try {
    if (count <= batchSize) {
      const promises = [];
      for (let i = 0; i < count; i++) {
        promises.push(func(i));
      }
      const start = performance.now();
      const results = await Promise.all(promises);
      const end = performance.now();
      
      const totalTime = end - start;
      const avgTime = totalTime / count;
      const throughput = (count * 1000) / totalTime;
      
      return { totalTime, avgTime, throughput, results, error: null };
    } else {
      // Process in batches
      let totalResults = [];
      let totalTime = 0;
      const batches = Math.ceil(count / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const currentBatchSize = Math.min(batchSize, count - i * batchSize);
        console.log(`  Processing batch ${i+1}/${batches}: ${currentBatchSize} requests`);
        
        const { totalTime: batchTime, results: batchResults } = await runConcurrentRequests(
          func, 
          currentBatchSize,
          currentBatchSize
        );
        
        totalTime += batchTime;
        totalResults = totalResults.concat(batchResults);
        
        // Wait between batches
        if (i < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, config.batchProcessing.delayBetweenBatches));
        }
      }
      
      const avgTime = totalTime / count;
      const throughput = (count * 1000) / totalTime;
      
      return { totalTime, avgTime, throughput, results: totalResults, error: null };
    }
  } catch (error) {
    console.error(`Error in concurrent requests: ${error.message}`);
    return {
      totalTime: 0,
      avgTime: 0,
      throughput: 0,
      results: [],
      error: error.message
    };
  }
}

async function main() {
  // Initialize results structure
  let results = {
    description: "Access flow performance evaluation",
    testDate: new Date().toISOString(),
    iterations: config.iterations.default,
    accessFlowBreakdown: {
      description: "Detailed timing breakdown of the complete access flow",
      data: []
    },
    accessPolicyOperations: {
      description: "Timing of access policy operations",
      data: {
        registration: [],
        delegation: [],
        verification: [],
        enforcement: []
      }
    },
    systemResponsiveness: {
      description: "System responsiveness under different loads",
      data: {
        accessRequest: {
          requestRates: [],
          latency: [],
          throughput: []
        },
        policyVerification: {
          requestRates: [],
          latency: [],
          throughput: []
        },
        enforcement: {
          requestRates: [],
          latency: [],
          throughput: []
        }
      }
    }
  };
  
  // Create results directory
  const resultsDir = path.join(__dirname, '../results');
  if (!fs.existsSync(resultsDir)){
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  console.log("Deploying contracts for access flow performance testing...");
  
  try {
    // Deploy contracts
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
    
    // Get signers for different roles
    const [owner, doctor, nurse, patient, paramedic] = await ethers.getSigners();
    
    // Setup test environment
    console.log("\nSetting up test environment...");
    
    // Create DIDs with proper error handling
    const dids = {
      doctor: `did:ethr:${doctor.address}`,
      nurse: `did:ethr:${nurse.address}`,
      patient: `did:ethr:${patient.address}`,
      paramedic: `did:ethr:${paramedic.address}`
    };
    
    for (const [role, did] of Object.entries(dids)) {
      try {
        await didManager.connect(eval(role)).createDID(did, []);
        console.log(`Created DID for ${role}: ${did}`);
      } catch (error) {
        console.error(`Error creating DID for ${role}:`, error.message);
        throw error;
      }
    }
    
    // Assign roles with proper proof validation
    const roleAssignments = [
      { user: doctor, role: "DOCTOR", credential: "DOCTOR_CREDENTIAL" },
      { user: nurse, role: "NURSE", credential: "NURSE_CREDENTIAL" },
      { user: paramedic, role: "PARAMEDIC", credential: "PARAMEDIC_CREDENTIAL", delegated: true }
    ];
    
    for (const assignment of roleAssignments) {
      try {
        const credential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(assignment.credential));
        await dlacManager.connect(owner).assignRole(
          assignment.user.address,
          assignment.role,
          credential,
          dids[assignment.role.toLowerCase()],
          365 * 24 * 60 * 60,
          assignment.delegated || false
        );
        console.log(`Assigned ${assignment.role} role`);
      } catch (error) {
        console.error(`Error assigning ${assignment.role} role:`, error.message);
        throw error;
      }
    }
    
    // Grant permissions
    try {
      await dlacManager.connect(owner).grantPermission("DOCTOR", "view_data");
      await dlacManager.connect(owner).grantPermission("DOCTOR", "update_data");
      await dlacManager.connect(owner).grantPermission("DOCTOR", "create_record");
      await dlacManager.connect(owner).grantPermission("NURSE", "view_data");
      console.log("Granted permissions to roles");
    } catch (error) {
      console.error("Error granting permissions:", error.message);
      throw error;
    }
    
    // Create patient record
    try {
      await ehrManager.connect(doctor).createPatientRecord(patient.address);
      console.log(`Created patient record for ${patient.address}`);
    } catch (error) {
      console.error("Error creating patient record:", error.message);
      throw error;
    }
    
    // Submit initial proof and create test data
    try {
      // Use setupProofForDoctor instead of ensureValidProof
      const proofResult = await setupProofForDoctor(doctor, dlacManager, zkpManager);
      if (!proofResult.isValid) {
          throw new Error(`Failed to set up doctor's proof: ${proofResult.error}`);
      }
      console.log("Submitted doctor's ZK proof");

      const updateTx = await ehrManager.connect(doctor).updatePatientData(
          patient.address,
          "vital-signs",
          "Heart rate: 70bpm, BP: 120/80, O2: 98%",
          proofResult.zkProof,
          { gasLimit: config.gasLimits.dataUpdate }
      );
        await updateTx.wait();
        console.log("Initial test data created");
    } catch (error) {
        console.error("Error in initial setup:", error.message);
        throw error; // Rethrow to stop the test if initial setup fails
    }
      
    // Create delegation policy
    try {
      const policyTx = await ehrManager.connect(patient).createDelegationPolicy(
        paramedic.address,
        "vital-signs",
        "read",
        24 * 60 * 60,
        { gasLimit: config.gasLimits.policyCreation }
      );
      const policyReceipt = await policyTx.wait();
      const policyEvent = policyReceipt.events.find(e => e.event === 'PolicyCreated');
      console.log(`Delegation policy created: ID ${policyEvent.args.policyID}`);
    } catch (error) {
      console.error("Error creating delegation policy:", error.message);
    }
    
    console.log("Test environment setup completed!");
    
    // Warmup period
    await new Promise(resolve => setTimeout(resolve, config.timing.warmupDelay));
    
    // Test 1: Complete Access Flow Breakdown
    console.log("\n1. Measuring Complete Access Flow Breakdown...");
    
    for (let i = 0; i < results.iterations; i++) {
        console.log(`\nIteration ${i+1}/${results.iterations}...`);
      
        try {
            // Generate new proof for access
            const zkProof = ethers.utils.randomBytes(32);
            const roleHash = await dlacManager.getRoleCredential(doctor.address);
            const proofHash = ethers.utils.keccak256(zkProof);

            // 1. Access Request Phase
            const { timeMs: requestTime } = await measureTime(async () => {
                const submitTx = await zkpManager.connect(doctor).submitProof(proofHash, {
                    gasLimit: config.gasLimits.proofSubmission
                });
                await submitTx.wait();
                return proofHash;
            });
            
            // 2. Policy Verification Phase
            const { timeMs: verificationTime } = await measureTime(async () => {
                const hasRole = await dlacManager.hasRole(doctor.address, "DOCTOR");
                const hasPermission = await dlacManager.hasPermission(doctor.address, "view_data");
                return hasRole && hasPermission;
            });
            
            // 3. Policy Enforcement Phase
            const { timeMs: enforcementTime } = await measureTime(async () => {
                return await zkpManager.validateProof(doctor.address, proofHash);
            });

            // 4. Access Response Phase
            const { timeMs: responseTime } = await measureTime(async () => {
                const result = await ehrManager.connect(doctor).getPatientData(
                    patient.address,
                    "vital-signs",
                    zkProof
                );
                return result;
            });
            
            const totalTime = requestTime + verificationTime + enforcementTime + responseTime;
            
            // Store results
            results.accessFlowBreakdown.data.push({
                iteration: i + 1,
                requestTime,
                verificationTime,
                enforcementTime,
                responseTime,
                totalTime
            });
            
            console.log(`Request time: ${requestTime.toFixed(2)} ms`);
            console.log(`Verification time: ${verificationTime.toFixed(2)} ms`);
            console.log(`Enforcement time: ${enforcementTime.toFixed(2)} ms`);
            console.log(`Response time: ${responseTime.toFixed(2)} ms`);
            console.log(`Total time: ${totalTime.toFixed(2)} ms`);

            // Add cooldown between iterations
            await new Promise(resolve => setTimeout(resolve, config.timing.cooldownPeriod));
        } catch (error) {
            console.error(`Error in iteration ${i+1}:`, error.message);
        }
    }
    
    // Calculate averages
    if (results.accessFlowBreakdown.data.length > 0) {
      results.accessFlowBreakdown.averages = {
        requestTime: results.accessFlowBreakdown.data.reduce((sum, item) => sum + item.requestTime, 0) / results.iterations,
        verificationTime: results.accessFlowBreakdown.data.reduce((sum, item) => sum + item.verificationTime, 0) / results.iterations,
        enforcementTime: results.accessFlowBreakdown.data.reduce((sum, item) => sum + item.enforcementTime, 0) / results.iterations,
        responseTime: results.accessFlowBreakdown.data.reduce((sum, item) => sum + item.responseTime, 0) / results.iterations,
        totalTime: results.accessFlowBreakdown.data.reduce((sum, item) => sum + item.totalTime, 0) / results.iterations
      };
      
      console.log("\nAccess Flow Breakdown Averages:");
      console.log(`Avg Request: ${results.accessFlowBreakdown.averages.requestTime.toFixed(2)} ms`);
      console.log(`Avg Verification: ${results.accessFlowBreakdown.averages.verificationTime.toFixed(2)} ms`);
      console.log(`Avg Enforcement: ${results.accessFlowBreakdown.averages.enforcementTime.toFixed(2)} ms`);
      console.log(`Avg Response: ${results.accessFlowBreakdown.averages.responseTime.toFixed(2)} ms`);
      console.log(`Avg Total: ${results.accessFlowBreakdown.averages.totalTime.toFixed(2)} ms`);
    }
    
    // Test 2: Access Policy Operations
    console.log("\n2. Measuring Access Policy Operations...");
    
    // 2.1 Policy Registration Times
    console.log("\n2.1. Measuring Access Policy Registration Times...");
    for (let i = 0; i < results.iterations; i++) {
      try {
        const { timeMs } = await measureTime(async () => {
          const tx = await ehrManager.connect(patient).createDelegationPolicy(
            paramedic.address,
            `emergency-data-${i}`,
            "read",
            24 * 60 * 60,
            { gasLimit: config.gasLimits.policyCreation }
          );
          return await tx.wait();
        });
        
        results.accessPolicyOperations.data.registration.push({
          iteration: i + 1,
          timeMs
        });
        
        console.log(`Registration time: ${timeMs.toFixed(2)} ms`);
      } catch (error) {
        console.error(`Error in registration iteration ${i+1}:`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, config.timing.cooldownPeriod));
    }
    
    // 2.2 Delegation Times
    console.log("\n2.2. Measuring Access Right Delegation Times...");
    for (let i = 0; i < results.iterations; i++) {
      try {
        // Create unique role for each iteration
        const delegatedRoleId = `DELEGATE_${i}_${Date.now()}`;
        await dlacManager.connect(owner).addRole(delegatedRoleId, `Delegated role ${i}`);
        
        const { timeMs } = await measureTime(async () => {
          const delegatedCredential = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`DELEGATED_CRED_${i}`));
          const tx = await dlacManager.connect(owner).assignRole(
            paramedic.address,
            delegatedRoleId,
            delegatedCredential,
            dids.paramedic,
            24 * 60 * 60,
            true,
            { gasLimit: config.gasLimits.policyCreation }
          );
          return await tx.wait();
        });
        
        results.accessPolicyOperations.data.delegation.push({
          iteration: i + 1,
          timeMs
        });
        
        console.log(`Delegation time: ${timeMs.toFixed(2)} ms`);
      } catch (error) {
        console.error(`Error in delegation iteration ${i+1}:`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, config.timing.cooldownPeriod));
    }
    
    // 2.3 Policy Verification Times
    console.log("\n2.3. Measuring Policy Verification Times...");
    for (let i = 0; i < results.iterations; i++) {
      try {
        const { timeMs } = await measureTime(async () => {
          return await ehrManager.getPolicy(i + 1);
        });
        
        results.accessPolicyOperations.data.verification.push({
          iteration: i + 1,
          timeMs
        });
        
        console.log(`Verification time: ${timeMs.toFixed(2)} ms`);
      } catch (error) {
        console.error(`Error in verification iteration ${i+1}:`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Shorter delay for view functions
    }
    
    // 2.4 Policy Enforcement Times
    console.log("\n2.4. Measuring Policy Enforcement Times...");
    for (let i = 0; i < results.iterations; i++) {
      try {
        const { timeMs } = await measureTime(async () => {
          return await dlacManager.hasPermission(doctor.address, "view_data");
        });
        
        results.accessPolicyOperations.data.enforcement.push({
          iteration: i + 1,
          timeMs
        });
        
        console.log(`Enforcement time: ${timeMs.toFixed(2)} ms`);
      } catch (error) {
        console.error(`Error in enforcement iteration ${i+1}:`, error.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Shorter delay for view functions
    }
    
    // Calculate averages for access policy operations
    results.accessPolicyOperations.averages = {
      registration: results.accessPolicyOperations.data.registration.reduce((sum, item) => sum + item.timeMs, 0) / results.iterations,
      delegation: results.accessPolicyOperations.data.delegation.reduce((sum, item) => sum + item.timeMs, 0) / results.iterations,
      verification: results.accessPolicyOperations.data.verification.reduce((sum, item) => sum + item.timeMs, 0) / results.iterations,
      enforcement: results.accessPolicyOperations.data.enforcement.reduce((sum, item) => sum + item.timeMs, 0) / results.iterations
    };
    
    console.log("\nAccess Policy Operations Averages:");
    console.log(`Avg Registration: ${results.accessPolicyOperations.averages.registration.toFixed(2)} ms`);
    console.log(`Avg Delegation: ${results.accessPolicyOperations.averages.delegation.toFixed(2)} ms`);
    console.log(`Avg Verification: ${results.accessPolicyOperations.averages.verification.toFixed(2)} ms`);
    console.log(`Avg Enforcement: ${results.accessPolicyOperations.averages.enforcement.toFixed(2)} ms`);
    
    // Test 3: System Responsiveness
    console.log("\n3. Measuring System Responsiveness Under Load...");
    
    // Use request rates from config
    const requestRates = config.requestRates.steps;
    
    // 3.1 Access Request Responsiveness
    console.log("\n3.1. Measuring Access Request Responsiveness...");
    
    for (const rate of requestRates) {
      console.log(`\nTesting with ${rate} concurrent access requests...`);
      
      try {
        // Ensure valid proof before batch processing
        const proofResult = await setupProofForDoctor(doctor, dlacManager, zkpManager);
        if (!proofResult.isValid) {
          console.error(`Failed to validate proof for rate ${rate}: ${proofResult.error}`);
          continue;
        }
        
        const { totalTime, avgTime, throughput, error } = await runConcurrentRequests(
          async (index) => {
            try {
              return await ehrManager.connect(doctor).getPatientData(
                patient.address,
                "vital-signs",
                proofResult.zkProof
              );
            } catch (e) {
              return null; // Fail gracefully for measurement
            }
          },
          rate
        );
        
        if (!error) {
          results.systemResponsiveness.data.accessRequest.requestRates.push(rate);
          results.systemResponsiveness.data.accessRequest.latency.push(avgTime);
          results.systemResponsiveness.data.accessRequest.throughput.push(throughput);
          
          console.log(`  Total time: ${totalTime.toFixed(2)} ms`);
          console.log(`  Average latency: ${avgTime.toFixed(2)} ms per request`);
          console.log(`  Throughput: ${throughput.toFixed(2)} tx/s`);
        } else {
          console.error(`  Failed at ${rate} RPS:`, error);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, config.timing.cooldownPeriod));
      } catch (error) {
        console.error(`Error testing ${rate} RPS:`, error.message);
        break;
      }
    }
    
    // 3.2 Policy Verification Responsiveness
    console.log("\n3.2. Measuring Policy Verification Responsiveness...");
    
    for (const rate of requestRates) {
      console.log(`\nTesting with ${rate} concurrent policy verifications...`);
      
      try {
        const { totalTime, avgTime, throughput, error } = await runConcurrentRequests(
          async (index) => {
            return await dlacManager.hasRole(doctor.address, "DOCTOR");
          },
          rate
        );
        
        if (!error) {
          results.systemResponsiveness.data.policyVerification.requestRates.push(rate);
          results.systemResponsiveness.data.policyVerification.latency.push(avgTime);
          results.systemResponsiveness.data.policyVerification.throughput.push(throughput);
          
          console.log(`  Total time: ${totalTime.toFixed(2)} ms`);
          console.log(`  Average latency: ${avgTime.toFixed(2)} ms per request`);
          console.log(`  Throughput: ${throughput.toFixed(2)} tx/s`);
        } else {
          console.error(`  Failed at ${rate} RPS:`, error);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, config.timing.cooldownPeriod));
      } catch (error) {
        console.error(`Error testing ${rate} RPS:`, error.message);
        break;
      }
    }
    
    // 3.3 Enforcement Responsiveness
    console.log("\n3.3. Measuring Enforcement Responsiveness...");
    
    for (const rate of requestRates) {
      console.log(`\nTesting with ${rate} concurrent enforcement checks...`);
      
      try {
        const { totalTime, avgTime, throughput, error } = await runConcurrentRequests(
          async (index) => {
            return await dlacManager.hasPermission(doctor.address, "view_data");
          },
          rate
        );
        
        if (!error) {
          results.systemResponsiveness.data.enforcement.requestRates.push(rate);
          results.systemResponsiveness.data.enforcement.latency.push(avgTime);
          results.systemResponsiveness.data.enforcement.throughput.push(throughput);
          
          console.log(`  Total time: ${totalTime.toFixed(2)} ms`);
          console.log(`  Average latency: ${avgTime.toFixed(2)} ms per request`);
          console.log(`  Throughput: ${throughput.toFixed(2)} tx/s`);
        } else {
          console.error(`  Failed at ${rate} RPS:`, error);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, config.timing.cooldownPeriod));
      } catch (error) {
        console.error(`Error testing ${rate} RPS:`, error.message);
        break;
      }
    }
    
  } catch (error) {
    console.error("Fatal error during testing:", error);
    throw error;
  }
  
  // Save results
  fs.writeFileSync(
    path.join(resultsDir, "access-flow-performance.json"),
    JSON.stringify(results, null, 2)
  );
  
  console.log("\nAccess flow performance testing complete!");
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });