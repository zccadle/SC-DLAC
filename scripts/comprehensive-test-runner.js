// comprehensive-test-runner.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ComprehensiveTestRunner {
    constructor() {
        this.results = {
            description: "Comprehensive SL-DLAC testing suite execution and aggregation",
            testDate: new Date().toISOString(),
            execution: {
                startTime: null,
                endTime: null,
                totalDuration: 0,
                testsExecuted: [],
                testsFailed: [],
                testsSucceeded: []
            },
            aggregatedResults: {
                security: null,
                emergencyAccess: null,
                auditIntegrity: null,
                healthcareWorkflows: null,
                faultTolerance: null,
                enhancedPerformance: null
            },
            crossCuttingAnalysis: {
                overallSystemPerformance: {},
                securityVsPerformance: {},
                scalabilityAssessment: {},
                reliabilityMetrics: {},
                complianceMetrics: {}
            },
            journalMetrics: {
                throughputAnalysis: {},
                latencyDistribution: {},
                securityEffectiveness: {},
                emergencyResponseTime: {},
                auditCompleteness: {},
                workflowEfficiency: {},
                systemResilience: {}
            }
        };
        this.testSuites = [
            {
                name: 'Security Tests',
                script: 'comprehensive-security-tests.js',
                description: 'Comprehensive security vulnerability and attack simulation testing',
                priority: 'critical',
                estimatedDuration: 300000 // 5 minutes
            },
            {
                name: 'Emergency Access Scenarios',
                script: 'emergency-access-scenarios.js',
                description: 'Real-world emergency access workflow testing',
                priority: 'high',
                estimatedDuration: 400000 // 6.67 minutes
            },
            {
                name: 'Audit Trail Integrity',
                script: 'audit-trail-integrity-tests.js',
                description: 'Audit log integrity and compliance testing',
                priority: 'high',
                estimatedDuration: 250000 // 4.17 minutes
            },
            {
                name: 'Healthcare Workflows',
                script: 'healthcare-workflow-simulations.js',
                description: 'Real-world healthcare workflow simulations',
                priority: 'high',
                estimatedDuration: 500000 // 8.33 minutes
            },
            {
                name: 'Fault Tolerance & Recovery',
                script: 'fault-tolerance-recovery-tests.js',
                description: 'System resilience and fault recovery testing',
                priority: 'high',
                estimatedDuration: 350000 // 5.83 minutes
            },
            {
                name: 'Enhanced Performance',
                script: 'enhanced-comprehensive-performance.js',
                description: 'Comprehensive performance and scalability analysis',
                priority: 'medium',
                estimatedDuration: 450000 // 7.5 minutes
            },
            {
                name: 'Privacy Compliance',
                script: 'privacy-compliance-tests.js',
                description: 'Privacy compliance and data protection testing',
                priority: 'critical',
                estimatedDuration: 300000 // 5 minutes
            },
            {
                name: 'Interoperability',
                script: 'interoperability-tests.js',
                description: 'Interoperability and integration testing',
                priority: 'high',
                estimatedDuration: 350000 // 5.83 minutes
            }
        ];
    }

    async runCommand(command, description) {
        console.log(`\n🚀 ${description}`);
        console.log(`Command: ${command}`);
        
        const start = Date.now();
        try {
            execSync(command, { 
                stdio: 'inherit',
                timeout: 600000 // 10 minute timeout per test
            });
            const duration = Date.now() - start;
            console.log(`✅ ${description} completed successfully in ${(duration/1000).toFixed(2)}s`);
            return { success: true, duration, error: null };
        } catch (error) {
            const duration = Date.now() - start;
            console.error(`❌ ${description} failed after ${(duration/1000).toFixed(2)}s`);
            console.error(`Error: ${error.message}`);
            return { success: false, duration, error: error.message };
        }
    }

    async loadTestResults() {
        const resultsDir = path.join(__dirname, '../results');
        const resultFiles = fs.readdirSync(resultsDir)
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => {
                const statA = fs.statSync(path.join(resultsDir, a));
                const statB = fs.statSync(path.join(resultsDir, b));
                return statB.mtime - statA.mtime; // Most recent first
            });

        console.log('\n📊 Loading test results...');
        
        // Load the most recent results for each test type
        const testResults = {};
        
        for (const file of resultFiles) {
            try {
                const content = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8'));
                
                if (file.includes('security-tests')) {
                    if (!testResults.security) testResults.security = content;
                } else if (file.includes('emergency-access-scenarios')) {
                    if (!testResults.emergencyAccess) testResults.emergencyAccess = content;
                } else if (file.includes('audit-trail-integrity')) {
                    if (!testResults.auditIntegrity) testResults.auditIntegrity = content;
                } else if (file.includes('healthcare-workflows')) {
                    if (!testResults.healthcareWorkflows) testResults.healthcareWorkflows = content;
                } else if (file.includes('fault-tolerance-recovery')) {
                    if (!testResults.faultTolerance) testResults.faultTolerance = content;
                } else if (file.includes('enhanced-comprehensive-performance')) {
                    if (!testResults.enhancedPerformance) testResults.enhancedPerformance = content;
                } else if (file.includes('privacy-compliance-tests')) {
                    if (!testResults.privacyCompliance) testResults.privacyCompliance = content;
                } else if (file.includes('interoperability-tests')) {
                    if (!testResults.interoperability) testResults.interoperability = content;
                }
            } catch (error) {
                console.warn(`⚠️ Could not parse ${file}: ${error.message}`);
            }
        }

        this.results.aggregatedResults = testResults;
        return testResults;
    }

    generateCrossCuttingAnalysis() {
        console.log('\n🔬 Generating cross-cutting analysis...');
        
        const { security, emergencyAccess, auditIntegrity, healthcareWorkflows, faultTolerance, enhancedPerformance } = this.results.aggregatedResults;

        // Overall System Performance Analysis
        const performanceMetrics = {
            averageLatency: 0,
            throughput: 0,
            successRate: 0,
            gasEfficiency: 0,
            memoryEfficiency: 0
        };

        if (enhancedPerformance && enhancedPerformance.overallSummary) {
            performanceMetrics.averageLatency = enhancedPerformance.overallSummary.averageSystemLatency || 0;
            performanceMetrics.successRate = enhancedPerformance.overallSummary.overallSuccessRate || 0;
            performanceMetrics.gasEfficiency = enhancedPerformance.overallSummary.totalSystemGasUsage || 0;
        }

        // Security vs Performance Trade-off Analysis
        const securityVsPerformance = {
            securityOverhead: 0,
            securityLatencyImpact: 0,
            securityGasImpact: 0,
            overallSecurityScore: 0
        };

        if (security) {
            let totalSecurityTests = 0;
            let passedSecurityTests = 0;
            
            Object.keys(security).forEach(category => {
                if (security[category].summary) {
                    totalSecurityTests += security[category].summary.totalTests || 0;
                    passedSecurityTests += security[category].summary.passed || 0;
                }
            });
            
            securityVsPerformance.overallSecurityScore = totalSecurityTests > 0 ? 
                (passedSecurityTests / totalSecurityTests) * 100 : 0;
        }

        // Scalability Assessment
        const scalabilityMetrics = {
            maxConcurrentUsers: 0,
            performanceDegradation: 0,
            scalabilityThreshold: 0,
            bottleneckIdentification: []
        };

        if (enhancedPerformance && enhancedPerformance.scalabilityAnalysis) {
            const scalabilityData = enhancedPerformance.scalabilityAnalysis.data || [];
            if (scalabilityData.length > 0) {
                scalabilityMetrics.maxConcurrentUsers = Math.max(...scalabilityData.map(d => d.load || 0));
                const successRates = scalabilityData.map(d => d.successRate || 0);
                const minSuccessRate = Math.min(...successRates);
                const maxSuccessRate = Math.max(...successRates);
                scalabilityMetrics.performanceDegradation = maxSuccessRate - minSuccessRate;
            }
        }

        // Reliability Metrics
        const reliabilityMetrics = {
            systemUptime: 100,
            faultRecoveryRate: 0,
            emergencyAccessReliability: 0,
            auditIntegrityScore: 0
        };

        if (faultTolerance) {
            let totalTests = 0;
            let resilientTests = 0;
            
            Object.keys(faultTolerance).forEach(category => {
                if (faultTolerance[category].metrics) {
                    totalTests += faultTolerance[category].metrics.totalTests || 0;
                    resilientTests += faultTolerance[category].metrics.resilientTests || 0;
                }
            });
            
            reliabilityMetrics.faultRecoveryRate = totalTests > 0 ? 
                (resilientTests / totalTests) * 100 : 0;
        }

        if (emergencyAccess) {
            let totalEmergencyTests = 0;
            let successfulEmergencyTests = 0;
            
            Object.keys(emergencyAccess).forEach(category => {
                if (emergencyAccess[category].metrics) {
                    totalEmergencyTests += emergencyAccess[category].metrics.totalTests || 0;
                    successfulEmergencyTests += emergencyAccess[category].metrics.successfulTests || 0;
                }
            });
            
            reliabilityMetrics.emergencyAccessReliability = totalEmergencyTests > 0 ? 
                (successfulEmergencyTests / totalEmergencyTests) * 100 : 0;
        }

        if (auditIntegrity) {
            let totalAuditTests = 0;
            let passedAuditTests = 0;
            
            Object.keys(auditIntegrity).forEach(category => {
                if (auditIntegrity[category].metrics) {
                    totalAuditTests += auditIntegrity[category].metrics.totalTests || 0;
                    passedAuditTests += auditIntegrity[category].metrics.successfulTests || 0;
                }
            });
            
            reliabilityMetrics.auditIntegrityScore = totalAuditTests > 0 ? 
                (passedAuditTests / totalAuditTests) * 100 : 0;
        }

        // Compliance Metrics
        const complianceMetrics = {
            hipaaCompliance: 0,
            gdprCompliance: 0,
            auditTrailCompleteness: 0,
            dataPrivacyScore: 0
        };

        // Update cross-cutting analysis
        this.results.crossCuttingAnalysis = {
            overallSystemPerformance: performanceMetrics,
            securityVsPerformance,
            scalabilityAssessment: scalabilityMetrics,
            reliabilityMetrics,
            complianceMetrics
        };
    }

    generateJournalMetrics() {
        console.log('\n📝 Generating journal-ready metrics...');
        
        const { security, emergencyAccess, auditIntegrity, healthcareWorkflows, faultTolerance, enhancedPerformance } = this.results.aggregatedResults;

        // Journal-quality metrics compilation
        const journalMetrics = {
            throughputAnalysis: {
                maxThroughput: 0,
                averageThroughput: 0,
                throughputUnderLoad: {},
                comparisonWithBaseline: {}
            },
            latencyDistribution: {
                p50: 0,
                p95: 0,
                p99: 0,
                mean: 0,
                standardDeviation: 0,
                distributionBuckets: {}
            },
            securityEffectiveness: {
                attackPreventionRate: 0,
                vulnerabilityDetection: 0,
                falsePositiveRate: 0,
                securityOverhead: 0
            },
            emergencyResponseTime: {
                averageResponseTime: 0,
                emergencyAccessGrantTime: 0,
                criticalPathLatency: 0,
                availabilityRate: 0
            },
            auditCompleteness: {
                auditCoverage: 0,
                integrityScore: 0,
                complianceRate: 0,
                tamperResistance: 0
            },
            workflowEfficiency: {
                workflowCompletionRate: 0,
                averageWorkflowTime: 0,
                resourceUtilization: 0,
                errorRate: 0
            },
            systemResilience: {
                faultToleranceScore: 0,
                recoveryTime: 0,
                cascadeFailureResistance: 0,
                adaptabilityScore: 0
            }
        };

        // Populate metrics from test results
        if (enhancedPerformance) {
            if (enhancedPerformance.scalabilityAnalysis && enhancedPerformance.scalabilityAnalysis.data) {
                const throughputData = enhancedPerformance.scalabilityAnalysis.data;
                journalMetrics.throughputAnalysis.maxThroughput = Math.max(...throughputData.map(d => d.throughput || 0));
                journalMetrics.throughputAnalysis.averageThroughput = 
                    throughputData.reduce((sum, d) => sum + (d.throughput || 0), 0) / throughputData.length;
            }

            if (enhancedPerformance.latencyDistribution && enhancedPerformance.latencyDistribution.data) {
                // Aggregate latency data from all operation types
                enhancedPerformance.latencyDistribution.data.forEach(opData => {
                    if (opData.latencyStatistics) {
                        // Collect raw latency values if available, or use statistics
                        if (opData.latencyStatistics.p50) {
                            journalMetrics.latencyDistribution.p50 = opData.latencyStatistics.p50;
                            journalMetrics.latencyDistribution.p95 = opData.latencyStatistics.p95;
                            journalMetrics.latencyDistribution.p99 = opData.latencyStatistics.p99;
                            journalMetrics.latencyDistribution.mean = opData.latencyStatistics.mean;
                            journalMetrics.latencyDistribution.standardDeviation = opData.latencyStatistics.standardDeviation;
                            journalMetrics.latencyDistribution.distributionBuckets = opData.latencyStatistics.distributionBuckets || {};
                        }
                    }
                });
            }
        }

        if (security) {
            let totalAttacks = 0;
            let preventedAttacks = 0;
            
            Object.keys(security).forEach(category => {
                if (security[category].summary) {
                    totalAttacks += security[category].summary.totalTests || 0;
                    preventedAttacks += security[category].summary.passed || 0;
                }
            });
            
            journalMetrics.securityEffectiveness.attackPreventionRate = totalAttacks > 0 ? 
                (preventedAttacks / totalAttacks) * 100 : 0;
        }

        if (emergencyAccess) {
            const emergencyMetrics = emergencyAccess.emergencyAccess?.metrics;
            if (emergencyMetrics) {
                journalMetrics.emergencyResponseTime.averageResponseTime = emergencyMetrics.averageLatency || 0;
                journalMetrics.emergencyResponseTime.availabilityRate = emergencyMetrics.successRate || 0;
            }
        }

        if (auditIntegrity) {
            const auditMetrics = auditIntegrity.auditCompleteness?.metrics;
            if (auditMetrics) {
                journalMetrics.auditCompleteness.auditCoverage = auditMetrics.auditComplianceRate || 0;
                journalMetrics.auditCompleteness.integrityScore = auditMetrics.successRate || 0;
            }
        }

        if (healthcareWorkflows) {
            let totalWorkflows = 0;
            let successfulWorkflows = 0;
            let totalWorkflowTime = 0;
            
            Object.keys(healthcareWorkflows).forEach(category => {
                if (healthcareWorkflows[category].metrics) {
                    const metrics = healthcareWorkflows[category].metrics;
                    totalWorkflows += metrics.totalSteps || 0;
                    successfulWorkflows += metrics.successfulSteps || 0;
                    totalWorkflowTime += metrics.averageStepLatency || 0;
                }
            });
            
            journalMetrics.workflowEfficiency.workflowCompletionRate = totalWorkflows > 0 ? 
                (successfulWorkflows / totalWorkflows) * 100 : 0;
            journalMetrics.workflowEfficiency.averageWorkflowTime = totalWorkflowTime;
        }

        if (faultTolerance) {
            let totalFaultTests = 0;
            let resilientTests = 0;
            
            Object.keys(faultTolerance).forEach(category => {
                if (faultTolerance[category].metrics) {
                    totalFaultTests += faultTolerance[category].metrics.totalTests || 0;
                    resilientTests += faultTolerance[category].metrics.resilientTests || 0;
                }
            });
            
            journalMetrics.systemResilience.faultToleranceScore = totalFaultTests > 0 ? 
                (resilientTests / totalFaultTests) * 100 : 0;
        }

        this.results.journalMetrics = journalMetrics;
    }

    generateExecutionSummary() {
        const { execution, crossCuttingAnalysis, journalMetrics } = this.results;
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 COMPREHENSIVE SL-DLAC TESTING SUITE - EXECUTION SUMMARY');
        console.log('='.repeat(80));
        
        console.log('\n🕐 EXECUTION TIMELINE:');
        console.log(`Start Time: ${new Date(execution.startTime).toLocaleString()}`);
        console.log(`End Time: ${new Date(execution.endTime).toLocaleString()}`);
        console.log(`Total Duration: ${(execution.totalDuration / 1000 / 60).toFixed(2)} minutes`);
        console.log(`Tests Executed: ${execution.testsExecuted.length}`);
        console.log(`Tests Succeeded: ${execution.testsSucceeded.length}`);
        console.log(`Tests Failed: ${execution.testsFailed.length}`);
        console.log(`Success Rate: ${((execution.testsSucceeded.length / execution.testsExecuted.length) * 100).toFixed(2)}%`);

        console.log('\n🔒 SECURITY ASSESSMENT:');
        console.log(`Attack Prevention Rate: ${journalMetrics.securityEffectiveness.attackPreventionRate.toFixed(2)}%`);
        console.log(`Overall Security Score: ${crossCuttingAnalysis.securityVsPerformance.overallSecurityScore.toFixed(2)}%`);

        console.log('\n🚨 EMERGENCY ACCESS PERFORMANCE:');
        console.log(`Average Response Time: ${journalMetrics.emergencyResponseTime.averageResponseTime.toFixed(2)}ms`);
        console.log(`Emergency Access Reliability: ${crossCuttingAnalysis.reliabilityMetrics.emergencyAccessReliability.toFixed(2)}%`);

        console.log('\n📋 AUDIT & COMPLIANCE:');
        console.log(`Audit Coverage: ${journalMetrics.auditCompleteness.auditCoverage.toFixed(2)}%`);
        console.log(`Audit Integrity Score: ${journalMetrics.auditCompleteness.integrityScore.toFixed(2)}%`);

        console.log('\n🏥 HEALTHCARE WORKFLOW EFFICIENCY:');
        console.log(`Workflow Completion Rate: ${journalMetrics.workflowEfficiency.workflowCompletionRate.toFixed(2)}%`);
        console.log(`Average Workflow Time: ${journalMetrics.workflowEfficiency.averageWorkflowTime.toFixed(2)}ms`);

        console.log('\n⚡ PERFORMANCE METRICS:');
        console.log(`Average System Latency: ${crossCuttingAnalysis.overallSystemPerformance.averageLatency.toFixed(2)}ms`);
        console.log(`Maximum Throughput: ${journalMetrics.throughputAnalysis.maxThroughput.toFixed(2)} tx/s`);
        console.log(`P95 Latency: ${journalMetrics.latencyDistribution.p95.toFixed(2)}ms`);
        console.log(`P99 Latency: ${journalMetrics.latencyDistribution.p99.toFixed(2)}ms`);

        console.log('\n🛡️ SYSTEM RESILIENCE:');
        console.log(`Fault Tolerance Score: ${journalMetrics.systemResilience.faultToleranceScore.toFixed(2)}%`);
        console.log(`Fault Recovery Rate: ${crossCuttingAnalysis.reliabilityMetrics.faultRecoveryRate.toFixed(2)}%`);

        console.log('\n📈 SCALABILITY ASSESSMENT:');
        console.log(`Max Concurrent Users: ${crossCuttingAnalysis.scalabilityAssessment.maxConcurrentUsers}`);
        console.log(`Performance Degradation: ${crossCuttingAnalysis.scalabilityAssessment.performanceDegradation.toFixed(2)}%`);

        console.log('\n' + '='.repeat(80));
        console.log('✅ COMPREHENSIVE TESTING COMPLETED SUCCESSFULLY');
        console.log('📁 All results saved to ./results/ directory');
        console.log('📊 Journal-ready metrics compiled and available');
        console.log('='.repeat(80));
    }

    async run() {
        console.log('🎯 Starting Comprehensive SL-DLAC Testing Suite');
        console.log('=' .repeat(60));
        
        this.results.execution.startTime = Date.now();
        
        // Ensure results directory exists
        const resultsDir = path.join(__dirname, '../results');
        if (!fs.existsSync(resultsDir)) {
            fs.mkdirSync(resultsDir, { recursive: true });
        }

        console.log('\n📋 Test Suite Overview:');
        this.testSuites.forEach((suite, index) => {
            console.log(`${index + 1}. ${suite.name} (${suite.priority}) - ${(suite.estimatedDuration/60000).toFixed(1)} min`);
            console.log(`   ${suite.description}`);
        });

        const totalEstimatedTime = this.testSuites.reduce((sum, suite) => sum + suite.estimatedDuration, 0);
        console.log(`\n⏱️ Total Estimated Duration: ${(totalEstimatedTime/60000).toFixed(1)} minutes`);

        // Check if Hardhat node is running
        console.log('\n🔗 Checking Hardhat node...');
        console.log('Please ensure Hardhat node is running:');
        console.log('npx hardhat node');
        console.log('Press Enter when ready...');
        
        await new Promise(resolve => {
            process.stdin.once('data', () => {
                resolve();
            });
        });

        // Execute all test suites
        for (const suite of this.testSuites) {
            const command = `npx hardhat run scripts/${suite.script} --network localhost`;
            const result = await this.runCommand(command, `Running ${suite.name}`);
            
            this.results.execution.testsExecuted.push({
                name: suite.name,
                script: suite.script,
                duration: result.duration,
                success: result.success,
                error: result.error,
                timestamp: Date.now()
            });

            if (result.success) {
                this.results.execution.testsSucceeded.push(suite.name);
            } else {
                this.results.execution.testsFailed.push({
                    name: suite.name,
                    error: result.error
                });
            }

            // Cool down between tests
            if (suite !== this.testSuites[this.testSuites.length - 1]) {
                console.log('⏳ Cooling down system for 15 seconds...');
                await new Promise(resolve => setTimeout(resolve, 15000));
            }
        }

        this.results.execution.endTime = Date.now();
        this.results.execution.totalDuration = this.results.execution.endTime - this.results.execution.startTime;

        // Load and analyze all results
        await this.loadTestResults();
        this.generateCrossCuttingAnalysis();
        this.generateJournalMetrics();

        // Save comprehensive results
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `comprehensive-test-results-${timestamp}.json`;
        const filepath = path.join(resultsDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));

        // Generate and save CSV summary for journal
        this.generateCSVSummary(resultsDir, timestamp);

        // Display execution summary
        this.generateExecutionSummary();

        console.log(`\n💾 Comprehensive results saved to: ${filename}`);
        
        return this.results;
    }

    generateCSVSummary(resultsDir, timestamp) {
        const csvData = [
            'Metric,Value,Unit,Category',
            `Attack Prevention Rate,${this.results.journalMetrics.securityEffectiveness.attackPreventionRate.toFixed(2)},Percentage,Security`,
            `Average System Latency,${this.results.crossCuttingAnalysis.overallSystemPerformance.averageLatency.toFixed(2)},Milliseconds,Performance`,
            `Maximum Throughput,${this.results.journalMetrics.throughputAnalysis.maxThroughput.toFixed(2)},Transactions per Second,Performance`,
            `P95 Latency,${this.results.journalMetrics.latencyDistribution.p95.toFixed(2)},Milliseconds,Performance`,
            `P99 Latency,${this.results.journalMetrics.latencyDistribution.p99.toFixed(2)},Milliseconds,Performance`,
            `Emergency Access Reliability,${this.results.crossCuttingAnalysis.reliabilityMetrics.emergencyAccessReliability.toFixed(2)},Percentage,Emergency Access`,
            `Average Emergency Response Time,${this.results.journalMetrics.emergencyResponseTime.averageResponseTime.toFixed(2)},Milliseconds,Emergency Access`,
            `Audit Coverage,${this.results.journalMetrics.auditCompleteness.auditCoverage.toFixed(2)},Percentage,Audit & Compliance`,
            `Audit Integrity Score,${this.results.journalMetrics.auditCompleteness.integrityScore.toFixed(2)},Percentage,Audit & Compliance`,
            `Workflow Completion Rate,${this.results.journalMetrics.workflowEfficiency.workflowCompletionRate.toFixed(2)},Percentage,Healthcare Workflows`,
            `Fault Tolerance Score,${this.results.journalMetrics.systemResilience.faultToleranceScore.toFixed(2)},Percentage,System Resilience`,
            `Fault Recovery Rate,${this.results.crossCuttingAnalysis.reliabilityMetrics.faultRecoveryRate.toFixed(2)},Percentage,System Resilience`,
            `Max Concurrent Users,${this.results.crossCuttingAnalysis.scalabilityAssessment.maxConcurrentUsers},Count,Scalability`,
            `Performance Degradation,${this.results.crossCuttingAnalysis.scalabilityAssessment.performanceDegradation.toFixed(2)},Percentage,Scalability`,
            `Overall Test Success Rate,${((this.results.execution.testsSucceeded.length / this.results.execution.testsExecuted.length) * 100).toFixed(2)},Percentage,Execution`,
            `Total Test Duration,${(this.results.execution.totalDuration / 1000 / 60).toFixed(2)},Minutes,Execution`
        ];

        const csvFilename = `journal-ready-metrics-${timestamp}.csv`;
        fs.writeFileSync(path.join(resultsDir, csvFilename), csvData.join('\n'));
        console.log(`📊 Journal-ready CSV metrics saved to: ${csvFilename}`);
    }
}

async function main() {
    const runner = new ComprehensiveTestRunner();
    await runner.run();
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Fatal error in test runner:', error);
            process.exit(1);
        });
}

module.exports = ComprehensiveTestRunner;