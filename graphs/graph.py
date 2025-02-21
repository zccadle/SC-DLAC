import matplotlib.pyplot as plt

# Data from deployment-gas-costs.json
deployment_gas_costs = {
    "ZKPVerifier": 292943,
    "EnhancedRBAC": 2391738,
    "DIDRegistry": 1195579,
    "EnhancedAuditLog": 813096,
    "UpdatedPatientDataStorage": 2486605
}

# Data from operational-gas-costs.json (only numeric gas costs)
operational_gas_costs = {
    "updateDIDRegistry": 47251,
    "addRole": 102054,
    "createDID": 227129,
    "addAttribute": 63561,
    "assignRole": 192274,
    "grantPermission": 53554,
    "createPatientRecord": 325834,
    "submitProof": 114493,
    "updatePatientData": 257562,
    "createDelegationPolicy": 191438,
    "updatePolicy": 25696,
    "requestDelegatedEmergencyAccess": 529692,
    "revokeDelegatedEmergencyAccess": 202191,
    "revokePermission": 31745
    # View functions are omitted because they have "no gas cost"
}

# Data from performance-results.json
performance_results = {
    "encryptionDecryption": {
        "description": "Measures time taken to encrypt and decrypt data of varying sizes",
        "data": [
            {"sizeKB": 1, "encryptionTimeMs": 0.5716, "decryptionTimeMs": 0.0781},
            {"sizeKB": 2, "encryptionTimeMs": 0.0647, "decryptionTimeMs": 0.0271},
            {"sizeKB": 4, "encryptionTimeMs": 0.0557, "decryptionTimeMs": 0.0343},
            {"sizeKB": 8, "encryptionTimeMs": 0.0951, "decryptionTimeMs": 0.0587},
            {"sizeKB": 16, "encryptionTimeMs": 0.2971, "decryptionTimeMs": 0.1176},
            {"sizeKB": 32, "encryptionTimeMs": 0.1424, "decryptionTimeMs": 0.1412},
            {"sizeKB": 64, "encryptionTimeMs": 0.3195, "decryptionTimeMs": 0.2208},
            {"sizeKB": 128, "encryptionTimeMs": 0.4324, "decryptionTimeMs": 0.5288},
            {"sizeKB": 256, "encryptionTimeMs": 0.8018, "decryptionTimeMs": 0.9169},
            {"sizeKB": 512, "encryptionTimeMs": 1.5425, "decryptionTimeMs": 1.8637},
            {"sizeKB": 1024, "encryptionTimeMs": 2.5469, "decryptionTimeMs": 3.7553}
        ]
    },
    "zkProofOperations": {
        "description": "Measures time taken for ZK proof generation and validation with varying complexities",
        "data": [
            {"complexity": 1, "generationTimeMs": 0.5391, "validationTimeMs": 0.0257},
            {"complexity": 2, "generationTimeMs": 0.0391, "validationTimeMs": 0.0099},
            {"complexity": 4, "generationTimeMs": 0.0618, "validationTimeMs": 0.0061},
            {"complexity": 8, "generationTimeMs": 0.0517, "validationTimeMs": 0.0206},
            {"complexity": 16, "generationTimeMs": 0.0523, "validationTimeMs": 0.0996},
            {"complexity": 32, "generationTimeMs": 0.0669, "validationTimeMs": 0.0233},
            {"complexity": 64, "generationTimeMs": 0.1188, "validationTimeMs": 0.0368},
            {"complexity": 128, "generationTimeMs": 0.2473, "validationTimeMs": 0.0610}
        ]
    },
    "transactionTimes": {
        "description": "Measures average execution time for contract operations",
        "data": {
            "policyRegistration": {"iterations": 5, "times": [54.7244, 36.0634, 46.2801, 44.7290, 24.8560], "averageMs": 41.33058},
            "accessRightDelegation": {"iterations": 5, "times": [47.7254, 83.0287, 46.7142, 40.8313, 39.7627], "averageMs": 51.61246},
            "emergencyAccessRequest": {"iterations": 3, "times": [82.9698, 63.5752, 49.2433], "averageMs": 65.26277},
            "dataUpdate": {"iterations": 5, "times": [62.5309, 67.5531, 55.7669, 57.4064, 56.0775], "averageMs": 59.86696}
        }
    },
    "responsiveness": {
        "description": "Measures system responsiveness under different loads",
        "latency": [
            {"concurrentTxs": 1, "totalTimeMs": 35.3027, "avgLatencyMs": 35.3027},
            {"concurrentTxs": 2, "totalTimeMs": 33.625, "avgLatencyMs": 16.8125},
            {"concurrentTxs": 4, "totalTimeMs": 40.2831, "avgLatencyMs": 10.07078},
            {"concurrentTxs": 8, "totalTimeMs": 62.8187, "avgLatencyMs": 7.85234}
        ],
        "throughput": [
            {"concurrentTxs": 1, "throughputTps": 28.32645},
            {"concurrentTxs": 2, "throughputTps": 59.47955},
            {"concurrentTxs": 4, "throughputTps": 99.29722},
            {"concurrentTxs": 8, "throughputTps": 127.35061}
        ]
    }
}

# ------------------------------
# 1. Deployment Gas Costs Visualization
# ------------------------------
fig, ax = plt.subplots()
contracts = list(deployment_gas_costs.keys())
costs = list(deployment_gas_costs.values())
ax.bar(contracts, costs, color='skyblue')
ax.set_title("Deployment Gas Costs")
ax.set_xlabel("Contracts")
ax.set_ylabel("Gas Cost")
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()

# ------------------------------
# 2. Operational Gas Costs Visualization
# ------------------------------
fig, ax = plt.subplots(figsize=(10,6))
ops = list(operational_gas_costs.keys())
op_costs = list(operational_gas_costs.values())
ax.bar(ops, op_costs, color='lightgreen')
ax.set_title("Operational Gas Costs")
ax.set_xlabel("Operations")
ax.set_ylabel("Gas Cost")
plt.xticks(rotation=90)
plt.tight_layout()
plt.show()

# ------------------------------
# 3a. Encryption/Decryption Performance Visualization
# ------------------------------
enc_data = performance_results["encryptionDecryption"]["data"]
sizes = [d["sizeKB"] for d in enc_data]
encryption_times = [d["encryptionTimeMs"] for d in enc_data]
decryption_times = [d["decryptionTimeMs"] for d in enc_data]

fig, ax = plt.subplots()
ax.plot(sizes, encryption_times, marker='o', label='Encryption Time (ms)')
ax.plot(sizes, decryption_times, marker='o', label='Decryption Time (ms)')
ax.set_title("Encryption/Decryption Performance")
ax.set_xlabel("Data Size (KB)")
ax.set_ylabel("Time (ms)")
ax.legend()
ax.grid(True)
plt.show()

# ------------------------------
# 3b. ZK Proof Operations Performance Visualization
# ------------------------------
zk_data = performance_results["zkProofOperations"]["data"]
complexities = [d["complexity"] for d in zk_data]
gen_times = [d["generationTimeMs"] for d in zk_data]
val_times = [d["validationTimeMs"] for d in zk_data]

fig, ax = plt.subplots()
ax.plot(complexities, gen_times, marker='o', label='Generation Time (ms)')
ax.plot(complexities, val_times, marker='o', label='Validation Time (ms)')
ax.set_title("ZK Proof Operations Performance")
ax.set_xlabel("Complexity")
ax.set_ylabel("Time (ms)")
ax.legend()
ax.grid(True)
plt.show()

# ------------------------------
# 3c. Transaction Times Visualization
# ------------------------------
tx_data = performance_results["transactionTimes"]["data"]
tx_ops = list(tx_data.keys())
avg_times = [tx_data[op]["averageMs"] for op in tx_ops]

fig, ax = plt.subplots()
ax.bar(tx_ops, avg_times, color='salmon')
ax.set_title("Average Transaction Times")
ax.set_xlabel("Operation")
ax.set_ylabel("Average Time (ms)")
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()

# ------------------------------
# 3d. Responsiveness Visualization - Latency
# ------------------------------
latency_data = performance_results["responsiveness"]["latency"]
concurrent_txs = [d["concurrentTxs"] for d in latency_data]
avg_latency = [d["avgLatencyMs"] for d in latency_data]

fig, ax = plt.subplots()
ax.plot(concurrent_txs, avg_latency, marker='o', color='purple')
ax.set_title("System Latency vs. Concurrent Transactions")
ax.set_xlabel("Concurrent Transactions")
ax.set_ylabel("Average Latency (ms)")
ax.grid(True)
plt.show()

# ------------------------------
# 3e. Responsiveness Visualization - Throughput
# ------------------------------
throughput_data = performance_results["responsiveness"]["throughput"]
concurrent_txs_throughput = [d["concurrentTxs"] for d in throughput_data]
throughput = [d["throughputTps"] for d in throughput_data]

fig, ax = plt.subplots()
ax.plot(concurrent_txs_throughput, throughput, marker='o', color='orange')
ax.set_title("System Throughput vs. Concurrent Transactions")
ax.set_xlabel("Concurrent Transactions")
ax.set_ylabel("Throughput (TPS)")
ax.grid(True)
plt.show()
