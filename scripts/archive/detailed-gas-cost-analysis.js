// detailed-gas-cost-analysis.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

class DetailedGasCostAnalyzer {
    constructor() {
        this.results = {
            description: "Detailed gas cost analysis by smart contract function",
            testDate: new Date().toISOString(),
            functionGasCosts: {
                description: "Gas costs for individual smart contract functions",
                data: [],
                summary: {}
            },
            operationalCategories: {
                description: "Gas costs grouped by operational categories",
                data: [],
                summary: {}
            },
            gasOptimizationOpportunities: {
                description: "Identified opportunities for gas optimization",
                data: [],
                summary: {}
            },
            comparativeAnalysis: {
                description: "Comparison with baseline and best practices",
                data: [],
                summary: {}
            }
        };
        this.gasTracker = new Map();
    }

    async measureFunctionGas(functionName, contractOperation, category = "general", description = "") {
        const start = performance.now();
        let gasUsed = 0;
        let success = false;
        let error = null;
        let transactionHash = null;

        try {
            const tx = await contractOperation();
            if (tx && tx.wait) {
                const receipt = await tx.wait();
                gasUsed = receipt.gasUsed ? receipt.gasUsed.toNumber() : 0;
                transactionHash = receipt.transactionHash;
            } else if (tx && typeof tx === 'object' && tx.gasUsed) {
                gasUsed = tx.gasUsed.toNumber();
            }
            success = true;
        } catch (err) {
            error = err.message;
            success = false;
        }

        const end = performance.now();
        const duration = end - start;

        const gasData = {
            functionName,
            category,
            description,
            gasUsed,
            success,
            duration,
            error,
            transactionHash,
            gasEfficiency: this.calculateGasEfficiency(gasUsed, category),
            timestamp: new Date().toISOString()
        };

        this.results.functionGasCosts.data.push(gasData);
        
        // Track category totals
        if (!this.gasTracker.has(category)) {
            this.gasTracker.set(category, { totalGas: 0, count: 0, functions: [] });
        }
        const categoryData = this.gasTracker.get(category);
        categoryData.totalGas += gasUsed;
        categoryData.count += 1;
        categoryData.functions.push({ functionName, gasUsed });

        return gasData;
    }

    calculateGasEfficiency(gasUsed, category) {
        // Define expected gas ranges for different categories
        const gasThresholds = {
            'Identity Management': { low: 50000, medium: 150000, high: 300000 },
            'Access Control': { low: 75000, medium: 200000, high: 400000 },
            'Patient Data': { low: 100000, medium: 250000, high: 500000 },
            'Emergency Access': { low: 150000, medium: 350000, high: 600000 },
            'Audit Logging': { low: 60000, medium: 120000, high: 250000 },
            'ZK Proof': { low: 80000, medium: 180000, high: 350000 },
            'Policy Management': { low: 120000, medium: 280000, high: 550000 },
            'general': { low: 100000, medium: 250000, high: 500000 }
        };

        const thresholds = gasThresholds[category] || gasThresholds['general'];
        
        if (gasUsed <= thresholds.low) return 'Excellent';
        if (gasUsed <= thresholds.medium) return 'Good';
        if (gasUsed <= thresholds.high) return 'Acceptable';
        return 'Needs Optimization';
    }

    generateCategorySummary() {
        const categories = {};
        
        for (const [category, data] of this.gasTracker.entries()) {
            categories[category] = {
                totalGasUsed: data.totalGas,
                functionCount: data.count,
                averageGasPerFunction: Math.round(data.totalGas / data.count),
                functions: data.functions.sort((a, b) => b.gasUsed - a.gasUsed),
                efficiency: this.calculateCategoryEfficiency(data.totalGas, data.count)
            };
        }

        this.results.operationalCategories.summary = categories;
        return categories;
    }

    calculateCategoryEfficiency(totalGas, functionCount) {
        const avgGas = totalGas / functionCount;
        if (avgGas < 150000) return 'Excellent';
        if (avgGas < 300000) return 'Good';
        if (avgGas < 500000) return 'Acceptable';
        return 'Needs Optimization';
    }

    identifyOptimizationOpportunities() {
        const opportunities = [];
        const data = this.results.functionGasCosts.data;

        // High gas usage functions
        const highGasFunctions = data.filter(f => f.gasUsed > 400000);
        if (highGasFunctions.length > 0) {
            opportunities.push({
                type: 'High Gas Usage',
                severity: 'High',
                description: `${highGasFunctions.length} functions use >400k gas`,
                affectedFunctions: highGasFunctions.map(f => ({ name: f.functionName, gas: f.gasUsed })),
                recommendation: 'Consider optimizing storage operations and reducing external calls'
            });
        }

        // Inconsistent gas usage within categories
        for (const [category, data] of this.gasTracker.entries()) {
            if (data.functions.length > 1) {
                const gasValues = data.functions.map(f => f.gasUsed);
                const max = Math.max(...gasValues);
                const min = Math.min(...gasValues);
                const variance = max - min;
                
                if (variance > 200000) {
                    opportunities.push({
                        type: 'High Variance',
                        severity: 'Medium',
                        description: `${category} functions show high gas variance (${variance.toLocaleString()} gas)`,
                        affectedFunctions: data.functions,
                        recommendation: 'Standardize function implementations to reduce gas variance'
                    });
                }
            }
        }

        // Gas efficiency below acceptable thresholds
        const inefficientFunctions = data.filter(f => f.gasEfficiency === 'Needs Optimization');
        if (inefficientFunctions.length > 0) {
            opportunities.push({
                type: 'Gas Inefficiency',
                severity: 'Medium',
                description: `${inefficientFunctions.length} functions need optimization`,
                affectedFunctions: inefficientFunctions.map(f => ({ name: f.functionName, gas: f.gasUsed, efficiency: f.gasEfficiency })),
                recommendation: 'Review and optimize storage patterns, loop structures, and external calls'
            });
        }

        this.results.gasOptimizationOpportunities.data = opportunities;
        return opportunities;
    }

    generateComparativeAnalysis() {
        const totalGas = this.results.functionGasCosts.data.reduce((sum, f) => sum + f.gasUsed, 0);
        const avgGasPerFunction = totalGas / this.results.functionGasCosts.data.length;
        
        // Define baseline expectations for healthcare DApps
        const baselineMetrics = {
            identityManagement: 120000,
            accessControl: 180000,
            dataStorage: 250000,
            emergencyAccess: 300000,
            auditLogging: 100000,
            zkProofVerification: 150000
        };

        const analysis = {
            totalSystemGasUsage: totalGas,
            averageGasPerFunction: Math.round(avgGasPerFunction),
            comparedToBaseline: {},
            recommendations: []
        };

        // Compare each category to baseline
        for (const [category, data] of this.gasTracker.entries()) {
            const categoryAvg = data.totalGas / data.count;
            const baselineKey = this.mapCategoryToBaseline(category);
            const baseline = baselineMetrics[baselineKey] || 200000;
            
            const percentageDiff = ((categoryAvg - baseline) / baseline) * 100;
            
            analysis.comparedToBaseline[category] = {
                actual: Math.round(categoryAvg),
                baseline: baseline,
                percentageDifference: Math.round(percentageDiff),
                status: percentageDiff <= 20 ? 'Within Range' : percentageDiff <= 50 ? 'Above Baseline' : 'Significantly Above'
            };

            if (percentageDiff > 50) {
                analysis.recommendations.push(`${category}: ${Math.round(percentageDiff)}% above baseline - requires optimization`);
            }
        }

        this.results.comparativeAnalysis.summary = analysis;
        return analysis;
    }

    mapCategoryToBaseline(category) {
        const mapping = {
            'Identity Management': 'identityManagement',
            'Access Control': 'accessControl',
            'Patient Data': 'dataStorage',
            'Emergency Access': 'emergencyAccess',
            'Audit Logging': 'auditLogging',
            'ZK Proof': 'zkProofVerification'
        };
        return mapping[category] || 'dataStorage';
    }

    generateDetailedReport() {
        const categorySummary = this.generateCategorySummary();
        const optimizationOpportunities = this.identifyOptimizationOpportunities();
        const comparativeAnalysis = this.generateComparativeAnalysis();

        console.log("\n" + "=".repeat(80));
        console.log("📊 DETAILED GAS COST ANALYSIS REPORT");
        console.log("=".repeat(80));

        console.log("\n🔧 FUNCTION-LEVEL GAS COSTS:");
        const sortedFunctions = this.results.functionGasCosts.data
            .filter(f => f.success)
            .sort((a, b) => b.gasUsed - a.gasUsed);

        sortedFunctions.slice(0, 15).forEach((func, index) => {
            console.log(`${(index + 1).toString().padStart(2)}. ${func.functionName.padEnd(35)} ${func.gasUsed.toLocaleString().padStart(10)} gas (${func.gasEfficiency})`);
        });

        console.log("\n📊 OPERATIONAL CATEGORIES:");
        Object.entries(categorySummary).forEach(([category, data]) => {
            console.log(`\n${category}:`);
            console.log(`  Total Gas Usage: ${data.totalGasUsed.toLocaleString()}`);
            console.log(`  Function Count: ${data.functionCount}`);
            console.log(`  Average per Function: ${data.averageGasPerFunction.toLocaleString()}`);
            console.log(`  Efficiency Rating: ${data.efficiency}`);
        });

        console.log("\n⚡ OPTIMIZATION OPPORTUNITIES:");
        optimizationOpportunities.forEach(opp => {
            console.log(`\n${opp.type} (${opp.severity}):`);
            console.log(`  ${opp.description}`);
            console.log(`  Recommendation: ${opp.recommendation}`);
        });

        console.log("\n📈 COMPARATIVE ANALYSIS:");
        console.log(`Total System Gas: ${comparativeAnalysis.totalSystemGasUsage.toLocaleString()}`);
        console.log(`Average per Function: ${comparativeAnalysis.averageGasPerFunction.toLocaleString()}`);
        
        Object.entries(comparativeAnalysis.comparedToBaseline).forEach(([category, comparison]) => {
            console.log(`\n${category}:`);
            console.log(`  Actual: ${comparison.actual.toLocaleString()} | Baseline: ${comparison.baseline.toLocaleString()} | Status: ${comparison.status}`);
        });

        if (comparativeAnalysis.recommendations.length > 0) {
            console.log("\n🎯 PRIORITY RECOMMENDATIONS:");
            comparativeAnalysis.recommendations.forEach(rec => console.log(`  • ${rec}`));
        }

        console.log("\n" + "=".repeat(80));
    }
}

async function main() {
    console.log("Starting detailed gas cost analysis...");
    
    const analyzer = new DetailedGasCostAnalyzer();
    const resultsDir = path.join(__dirname, '../results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Deploy contracts for gas analysis
    console.log("Deploying contracts for gas analysis...");
    
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

    // Get signers for testing
    const [owner, doctor, nurse, patient, paramedic, pharmacist, specialist] = await ethers.getSigners();

    // Helper function to setup ZK proof
    const setupProof = async (user) => {
        const zkProof = ethers.utils.randomBytes(32);
        const proofHash = ethers.utils.keccak256(zkProof);
        await zkpManager.connect(user).submitProof(proofHash);
        return zkProof;
    };

    console.log("Analyzing gas costs for Identity Management functions...");
    
    // Identity Management - DID operations
    await analyzer.measureFunctionGas(
        "Create DID", 
        () => didManager.connect(doctor).createDID(`did:ethr:${doctor.address}`, []),
        "Identity Management",
        "Creating a new decentralized identifier"
    );

    await analyzer.measureFunctionGas(
        "Add DID Attribute", 
        () => didManager.connect(doctor).addAttribute(`did:ethr:${doctor.address}`, "specialty", "cardiology"),
        "Identity Management",
        "Adding attribute to existing DID"
    );

    await analyzer.measureFunctionGas(
        "Update DID Attribute", 
        () => didManager.connect(doctor).updateAttribute(`did:ethr:${doctor.address}`, "specialty", "internal medicine"),
        "Identity Management",
        "Updating existing DID attribute"
    );

    await analyzer.measureFunctionGas(
        "Add DID Controller", 
        () => didManager.connect(doctor).addController(`did:ethr:${doctor.address}`, `did:ethr:${nurse.address}`),
        "Identity Management",
        "Adding controller to DID"
    );

    console.log("Analyzing gas costs for Access Control functions...");

    // Access Control - Role and permission management
    await analyzer.measureFunctionGas(
        "Add Role", 
        () => dlacManager.connect(owner).addRole("CARDIOLOGIST", "Specialized cardiac care provider"),
        "Access Control",
        "Creating new role in RBAC system"
    );

    await analyzer.measureFunctionGas(
        "Assign Role", 
        () => dlacManager.connect(owner).assignRole(
            doctor.address, 
            "DOCTOR", 
            ethers.utils.keccak256(ethers.utils.toUtf8Bytes("DOCTOR_CREDENTIAL")), 
            `did:ethr:${doctor.address}`, 
            365 * 24 * 60 * 60, 
            false
        ),
        "Access Control",
        "Assigning role to user with credentials"
    );

    await analyzer.measureFunctionGas(
        "Grant Permission", 
        () => dlacManager.connect(owner).grantPermission("DOCTOR", "view_data"),
        "Access Control",
        "Granting permission to role"
    );

    await analyzer.measureFunctionGas(
        "Revoke Permission", 
        () => dlacManager.connect(owner).revokePermission("DOCTOR", "view_data"),
        "Access Control",
        "Revoking permission from role"
    );

    await analyzer.measureFunctionGas(
        "Update Role", 
        () => dlacManager.connect(owner).updateRole(doctor.address, "CARDIOLOGIST", 365 * 24 * 60 * 60, true),
        "Access Control",
        "Updating user role assignment"
    );

    console.log("Analyzing gas costs for Patient Data functions...");

    // Patient Data - EHR operations
    await analyzer.measureFunctionGas(
        "Create Patient Record", 
        () => ehrManager.connect(doctor).createPatientRecord(patient.address),
        "Patient Data",
        "Creating new patient record"
    );

    const doctorProof = await setupProof(doctor);
    await analyzer.measureFunctionGas(
        "Update Patient Data", 
        () => ehrManager.connect(doctor).updatePatientData(
            patient.address, 
            "vital-signs", 
            "Heart rate: 72bpm, BP: 120/80, O2: 98%", 
            doctorProof
        ),
        "Patient Data",
        "Updating patient medical data"
    );

    const readProof = await setupProof(doctor);
    await analyzer.measureFunctionGas(
        "Get Patient Data", 
        () => ehrManager.connect(doctor).getPatientData(patient.address, "vital-signs", readProof),
        "Patient Data",
        "Retrieving patient medical data"
    );

    console.log("Analyzing gas costs for Policy Management functions...");

    // Policy Management - Delegation policies
    await analyzer.measureFunctionGas(
        "Create Delegation Policy", 
        () => ehrManager.connect(patient).createDelegationPolicy(
            nurse.address, 
            "vital-signs", 
            "read", 
            24 * 60 * 60
        ),
        "Policy Management",
        "Creating data access delegation policy"
    );

    await analyzer.measureFunctionGas(
        "Update Policy Status", 
        () => ehrManager.connect(patient).updatePolicy(1, false),
        "Policy Management",
        "Deactivating delegation policy"
    );

    console.log("Analyzing gas costs for Emergency Access functions...");

    // Emergency Access operations
    await analyzer.measureFunctionGas(
        "Create Emergency Policy", 
        () => ehrManager.connect(patient).createDelegationPolicy(
            paramedic.address, 
            "vital-signs", 
            "read", 
            48 * 60 * 60
        ),
        "Emergency Access",
        "Creating emergency access delegation"
    );

    // Setup emergency proof
    const emergencyProof = ethers.utils.randomBytes(32);
    const roleHash = await dlacManager.getRoleCredential(paramedic.address);
    const combinedProofHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(['bytes32', 'bytes'], [roleHash, emergencyProof]));
    await zkpManager.connect(paramedic).submitProof(combinedProofHash);

    await analyzer.measureFunctionGas(
        "Request Emergency Access", 
        () => ehrManager.connect(paramedic).requestDelegatedEmergencyAccess(
            patient.address, 
            "Emergency medical intervention required", 
            emergencyProof, 
            2
        ),
        "Emergency Access",
        "Requesting delegated emergency access"
    );

    await analyzer.measureFunctionGas(
        "Revoke Emergency Access", 
        () => ehrManager.connect(patient).revokeDelegatedEmergencyAccess(paramedic.address),
        "Emergency Access",
        "Revoking emergency access delegation"
    );

    console.log("Analyzing gas costs for ZK Proof functions...");

    // ZK Proof operations
    const zkProof1 = ethers.utils.randomBytes(32);
    const zkProofHash1 = ethers.utils.keccak256(zkProof1);
    await analyzer.measureFunctionGas(
        "Submit ZK Proof", 
        () => zkpManager.connect(specialist).submitProof(zkProofHash1),
        "ZK Proof",
        "Submitting zero-knowledge proof"
    );

    await analyzer.measureFunctionGas(
        "Validate ZK Proof", 
        () => zkpManager.validateProof(specialist.address, zkProofHash1),
        "ZK Proof",
        "Validating zero-knowledge proof"
    );

    console.log("Analyzing gas costs for Audit Logging functions...");

    // Audit Logging operations
    await analyzer.measureFunctionGas(
        "Log Access Event", 
        () => auditLogger.logAccess(
            doctor.address, 
            patient.address, 
            "view_data", 
            "Routine patient data access", 
            false
        ),
        "Audit Logging",
        "Logging access event to audit trail"
    );

    await analyzer.measureFunctionGas(
        "Log Emergency Event", 
        () => auditLogger.logAccess(
            paramedic.address, 
            patient.address, 
            "emergency_access", 
            "Emergency medical intervention", 
            true
        ),
        "Audit Logging",
        "Logging emergency access event"
    );

    // Generate comprehensive analysis
    analyzer.generateDetailedReport();

    // Save results
    const filename = `detailed-gas-analysis-${Date.now()}.json`;
    fs.writeFileSync(
        path.join(resultsDir, filename),
        JSON.stringify(analyzer.results, null, 2)
    );

    console.log(`\n💾 Detailed gas analysis saved to: ${filename}`);
    console.log("Gas cost analysis completed!");
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });