import matplotlib.pyplot as plt
import numpy as np

# Data from access-flow-performance.json
request_rates = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 10000]

# Latency data for each operation
access_latency = [31.39, 9.19, 5.69, 3.46, 1.89, 1.60, 1.50, 1.44, 1.23, 1.30, 1.15, 1.19, 1.12, 1.05, 1.03]
policy_latency = [19.47, 7.89, 5.04, 2.91, 1.73, 0.99, 0.93, 0.86, 0.82, 0.82, 0.85, 0.82, 0.81, 0.82, 0.83]
enforce_latency = [22.15, 3.30, 5.02, 2.90, 1.05, 1.28, 0.96, 0.95, 0.90, 0.82, 0.83, 0.83, 0.83, 0.82, 0.83]

# Throughput data for each operation
access_throughput = [31.84, 108.80, 175.63, 288.92, 528.04, 621.16, 663.59, 691.90, 811.12, 767.15, 863.67, 835.32, 892.09, 949.98, 968.36]
policy_throughput = [51.34, 126.58, 198.31, 343.28, 577.22, 1006.62, 1067.38, 1154.44, 1219.03, 1215.94, 1173.27, 1209.08, 1221.71, 1205.58, 1200.52]
enforce_throughput = [45.12, 302.15, 198.92, 343.83, 943.46, 777.82, 1035.34, 1049.22, 1106.15, 1215.81, 1203.82, 1197.11, 1203.70, 1212.32, 1201.85]

# Create figure with two subplots
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))

# Plot 1: Latency
ax1.plot(request_rates, access_latency, 'o-', label='Access Request', color='#3182CE')
ax1.plot(request_rates, policy_latency, 's-', label='Policy Verification', color='#805AD5')
ax1.plot(request_rates, enforce_latency, '^-', label='Enforcement', color='#2C7A7B')
ax1.set_xscale('log')
ax1.set_yscale('log')
ax1.set_title('Transaction Latency vs Request Rate', fontsize=13, fontweight='bold')
ax1.set_xlabel('Request Submission Rate (RPS)', fontsize=11)
ax1.set_ylabel('Latency (ms)', fontsize=11)
ax1.grid(True, which="both", ls="-", alpha=0.2)
ax1.legend()

# Plot 2: Throughput
ax2.plot(request_rates, access_throughput, 'o-', label='Access Request', color='#3182CE')
ax2.plot(request_rates, policy_throughput, 's-', label='Policy Verification', color='#805AD5')
ax2.plot(request_rates, enforce_throughput, '^-', label='Enforcement', color='#2C7A7B')
ax2.set_xscale('log')
ax2.set_title('Transaction Throughput vs Request Rate', fontsize=13, fontweight='bold')
ax2.set_xlabel('Request Submission Rate (RPS)', fontsize=11)
ax2.set_ylabel('Throughput (tx/s)', fontsize=11)
ax2.grid(True, which="both", ls="-", alpha=0.2)
ax2.legend()

plt.tight_layout()
plt.savefig('system_responsiveness.jpg', dpi=300, bbox_inches='tight')
plt.close()