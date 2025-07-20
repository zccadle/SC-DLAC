/**
 * High-precision timer utility for accurate performance measurements
 * Uses process.hrtime.bigint() for nanosecond precision
 */

class HighPrecisionTimer {
    constructor() {
        this.marks = new Map();
    }

    /**
     * Start a timer with the given name
     * @param {string} name - Name of the timer
     */
    start(name) {
        this.marks.set(name, process.hrtime.bigint());
    }

    /**
     * End a timer and get the duration in various units
     * @param {string} name - Name of the timer
     * @returns {Object} Duration in different units
     */
    end(name) {
        if (!this.marks.has(name)) {
            throw new Error(`Timer '${name}' was not started`);
        }

        const startTime = this.marks.get(name);
        const endTime = process.hrtime.bigint();
        const durationNs = endTime - startTime;

        // Clean up
        this.marks.delete(name);

        return {
            nanoseconds: Number(durationNs),
            microseconds: Number(durationNs) / 1000,
            milliseconds: Number(durationNs) / 1_000_000,
            seconds: Number(durationNs) / 1_000_000_000,
            raw: durationNs
        };
    }

    /**
     * Measure the execution time of an async function
     * @param {Function} fn - Async function to measure
     * @param {string} name - Optional name for the measurement
     * @returns {Object} Result and timing information
     */
    async measureAsync(fn, name = 'operation') {
        const startTime = process.hrtime.bigint();
        let result, error;
        
        try {
            result = await fn();
        } catch (err) {
            error = err;
        }
        
        const endTime = process.hrtime.bigint();
        const durationNs = endTime - startTime;

        return {
            success: !error,
            result,
            error,
            timing: {
                nanoseconds: Number(durationNs),
                microseconds: Number(durationNs) / 1000,
                milliseconds: Number(durationNs) / 1_000_000,
                seconds: Number(durationNs) / 1_000_000_000,
                raw: durationNs
            }
        };
    }

    /**
     * Get current timestamp with nanosecond precision
     * @returns {bigint} Current timestamp in nanoseconds
     */
    static now() {
        return process.hrtime.bigint();
    }

    /**
     * Convert nanoseconds to milliseconds
     * @param {bigint|number} ns - Nanoseconds
     * @returns {number} Milliseconds
     */
    static nsToMs(ns) {
        return Number(ns) / 1_000_000;
    }

    /**
     * Calculate statistics from an array of timing measurements
     * @param {Array<number>} timings - Array of timing values in nanoseconds
     * @returns {Object} Statistical analysis
     */
    static calculateStats(timings) {
        if (timings.length === 0) return {};

        const sorted = [...timings].sort((a, b) => a - b);
        const sum = timings.reduce((acc, val) => acc + val, 0);
        const mean = sum / timings.length;
        
        // Calculate variance and standard deviation
        const variance = timings.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / timings.length;
        const stdDev = Math.sqrt(variance);

        // Calculate percentiles
        const percentile = (p) => {
            const index = (p / 100) * (sorted.length - 1);
            if (Math.floor(index) === index) {
                return sorted[index];
            } else {
                const lower = sorted[Math.floor(index)];
                const upper = sorted[Math.ceil(index)];
                return lower + (upper - lower) * (index - Math.floor(index));
            }
        };

        return {
            count: timings.length,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            mean: mean,
            median: percentile(50),
            stdDev: stdDev,
            p25: percentile(25),
            p50: percentile(50),
            p75: percentile(75),
            p90: percentile(90),
            p95: percentile(95),
            p99: percentile(99),
            p999: percentile(99.9),
            // Convert to milliseconds for readability
            meanMs: mean / 1_000_000,
            medianMs: percentile(50) / 1_000_000,
            p95Ms: percentile(95) / 1_000_000,
            p99Ms: percentile(99) / 1_000_000
        };
    }
}

module.exports = HighPrecisionTimer;