// test-config.js

module.exports = {
    // Role proof settings
    proofValidation: {
        maxAttempts: 5,
        retryDelay: 1000, // ms
        gasLimit: 300000
    },
    
    
    // Test iterations
    iterations: {
        default: 3,
        highLoad: 5
    },
    
    // Request rates for scaling tests (RPS)
    requestRates: {
        start: 1,
        max: 10000,
        steps: [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 10000]
    },
    
    // Batch processing settings
    batchProcessing: {
        batchSize: 64,
        delayBetweenBatches: 2000 // ms
    },
    
    // Data size settings (KB)
    dataSizes: {
        small: [1, 2, 4, 8, 16, 32],
        medium: [64, 128, 256, 512],
        large: [1024, 2048, 4096, 8192],
        huge: [16384, 32768, 65536, 131072]
    },
    
    // Timeouts and delays
    timing: {
        operationTimeout: 30000, // ms
        cooldownPeriod: 5000, // ms between major operations
        warmupDelay: 2000 // ms before measurements
    },
    
    // Gas limits for different operations
    gasLimits: {
        proofSubmission: 300000,
        dataUpdate: 9000000,
        policyCreation: 500000,
        emergencyAccess: 800000
    }
};