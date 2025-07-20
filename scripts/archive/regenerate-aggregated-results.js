const fs = require('fs');
const path = require('path');

function findLatestResultFile(pattern) {
    const resultsDir = path.join(__dirname, '../results');
    const files = fs.readdirSync(resultsDir);
    
    const matchingFiles = files.filter(file => {
        if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(file);
        }
        return file.includes(pattern);
    });
    
    if (matchingFiles.length === 0) return null;
    
    // Get the most recent file based on modification time
    const fileStats = matchingFiles.map(file => {
        const filePath = path.join(resultsDir, file);
        const stats = fs.statSync(filePath);
        return { file, mtime: stats.mtime };
    });
    
    fileStats.sort((a, b) => b.mtime - a.mtime);
    return fileStats[0].file;
}

function loadLatestResults() {
    const resultsDir = path.join(__dirname, '../results');
    const aggregatedResults = {
        description: "Aggregated test results for SC-DLAC system",
        generatedDate: new Date().toISOString(),
        testSuites: {},
        summary: {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            overallSuccessRate: 0,
            performanceMetrics: {},
            securityMetrics: {},
            reliabilityMetrics: {}
        }
    };
    
    // Define test patterns to look for
    const testPatterns = [
        { pattern: 'security-tests-*.json', key: 'security' },
        { pattern: 'emergency-access-scenarios-*.json', key: 'emergencyAccess' },
        { pattern: 'audit-trail-integrity-*.json', key: 'auditIntegrity' },
        { pattern: 'healthcare-workflows-*.json', key: 'healthcareWorkflows' },
        { pattern: 'fault-tolerance-recovery-*.json', key: 'faultTolerance' },
        { pattern: 'enhanced-comprehensive-performance-*.json', key: 'performance' },
        { pattern: 'system-responsiveness-analysis-*.json', key: 'responsiveness' },
        { pattern: 'detailed-gas-analysis-*.json', key: 'gasAnalysis' }
    ];
    
    // Load each test suite's latest results
    testPatterns.forEach(({ pattern, key }) => {
        const fileName = findLatestResultFile(pattern);
        if (fileName) {
            try {
                const filePath = path.join(resultsDir, fileName);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                aggregatedResults.testSuites[key] = {
                    fileName,
                    lastModified: fs.statSync(filePath).mtime,
                    data
                };
                console.log(`✅ Loaded ${key}: ${fileName}`);
            } catch (error) {
                console.error(`❌ Failed to load ${key}: ${error.message}`);
            }
        } else {
            console.warn(`⚠️ No results found for ${key} (pattern: ${pattern})`);
        }
    });
    
    // Calculate aggregate metrics
    let totalOperations = 0;
    let successfulOperations = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    
    // Security metrics
    if (aggregatedResults.testSuites.security) {
        const securityData = aggregatedResults.testSuites.security.data;
        let totalSecurityTests = 0;
        let passedSecurityTests = 0;
        
        Object.values(securityData).forEach(category => {
            if (category.summary) {
                totalSecurityTests += category.summary.totalTests || 0;
                passedSecurityTests += category.summary.passed || 0;
            }
        });
        
        aggregatedResults.summary.securityMetrics = {
            totalTests: totalSecurityTests,
            passedTests: passedSecurityTests,
            attackPreventionRate: totalSecurityTests > 0 ? (passedSecurityTests / totalSecurityTests) * 100 : 0
        };
        
        totalOperations += totalSecurityTests;
        successfulOperations += passedSecurityTests;
    }
    
    // Performance metrics
    if (aggregatedResults.testSuites.performance) {
        const perfData = aggregatedResults.testSuites.performance.data;
        
        if (perfData.latencyDistribution && perfData.latencyDistribution.data) {
            perfData.latencyDistribution.data.forEach(opData => {
                if (opData.latencyStatistics) {
                    const stats = opData.latencyStatistics;
                    if (stats.mean) {
                        totalLatency += stats.mean;
                        latencyCount++;
                    }
                    
                    // Store key performance metrics
                    if (!aggregatedResults.summary.performanceMetrics.latencyStats) {
                        aggregatedResults.summary.performanceMetrics.latencyStats = {
                            p50: stats.p50 || 0,
                            p95: stats.p95 || 0,
                            p99: stats.p99 || 0,
                            mean: stats.mean || 0
                        };
                    }
                }
                
                totalOperations += opData.samples || 0;
                successfulOperations += opData.successfulSamples || 0;
            });
        }
        
        if (perfData.overallSummary) {
            aggregatedResults.summary.performanceMetrics.throughput = 
                perfData.overallSummary.averageSystemLatency || 0;
        }
    }
    
    // Healthcare workflow metrics
    if (aggregatedResults.testSuites.healthcareWorkflows) {
        const workflowData = aggregatedResults.testSuites.healthcareWorkflows.data;
        let totalWorkflows = 0;
        let successfulWorkflows = 0;
        
        Object.values(workflowData).forEach(workflow => {
            if (workflow.metrics) {
                totalWorkflows += workflow.metrics.totalSteps || 0;
                successfulWorkflows += workflow.metrics.successfulSteps || 0;
            }
        });
        
        aggregatedResults.summary.reliabilityMetrics.workflowCompletionRate = 
            totalWorkflows > 0 ? (successfulWorkflows / totalWorkflows) * 100 : 0;
        
        totalOperations += totalWorkflows;
        successfulOperations += successfulWorkflows;
    }
    
    // Overall metrics
    aggregatedResults.summary.totalTests = totalOperations;
    aggregatedResults.summary.passedTests = successfulOperations;
    aggregatedResults.summary.failedTests = totalOperations - successfulOperations;
    aggregatedResults.summary.overallSuccessRate = 
        totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 0;
    aggregatedResults.summary.performanceMetrics.averageLatency = 
        latencyCount > 0 ? totalLatency / latencyCount : 0;
    
    return aggregatedResults;
}

// Main execution
console.log('🔄 Regenerating aggregated results...\n');

const aggregatedResults = loadLatestResults();

// Save the aggregated results
const outputPath = path.join(__dirname, '../results/aggregated_results.json');
fs.writeFileSync(outputPath, JSON.stringify(aggregatedResults, null, 2));

console.log('\n📊 Summary:');
console.log(`Total Tests: ${aggregatedResults.summary.totalTests}`);
console.log(`Passed Tests: ${aggregatedResults.summary.passedTests}`);
console.log(`Failed Tests: ${aggregatedResults.summary.failedTests}`);
console.log(`Overall Success Rate: ${aggregatedResults.summary.overallSuccessRate.toFixed(2)}%`);
console.log(`Attack Prevention Rate: ${aggregatedResults.summary.securityMetrics.attackPreventionRate?.toFixed(2)}%`);
console.log(`Average Latency: ${aggregatedResults.summary.performanceMetrics.averageLatency?.toFixed(2)}ms`);
console.log(`P95 Latency: ${aggregatedResults.summary.performanceMetrics.latencyStats?.p95?.toFixed(2)}ms`);
console.log(`P99 Latency: ${aggregatedResults.summary.performanceMetrics.latencyStats?.p99?.toFixed(2)}ms`);

console.log('\n✅ Aggregated results saved to:', outputPath);