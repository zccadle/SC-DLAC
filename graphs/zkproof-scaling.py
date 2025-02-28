import matplotlib.pyplot as plt
import numpy as np

# Data from enhanced-zkproof-performance.json
request_rates = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 10000]
latencies = [31.47, 12.81, 8.51, 4.40, 4.28, 3.39, 2.75, 2.15, 1.23, 1.30, 1.15, 1.19, 1.12, 1.05, 1.03]
throughput = [31.77, 78.01, 117.42, 227.18, 233.20, 294.21, 363.15, 464.68, 829.66, 716.87, 808.14, 822.65, 897.96, 858.09, 905.92]

# Create figure with two subplots
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))

# Plot 1: Latency
ax1.plot(request_rates, latencies, 'o-', color='#3182CE', linewidth=2, markersize=6)
ax1.set_xscale('log')
ax1.set_title('ZK Proof Latency vs Request Rate', fontsize=13, fontweight='bold')
ax1.set_xlabel('Request Submission Rate (RPS)', fontsize=11)
ax1.set_ylabel('Latency (ms)', fontsize=11)
ax1.grid(True, which="both", ls="-", alpha=0.2)

# Plot 2: Throughput
ax2.plot(request_rates, throughput, 'o-', color='#805AD5', linewidth=2, markersize=6)
ax2.set_xscale('log')
ax2.set_title('ZK Proof Throughput vs Request Rate', fontsize=13, fontweight='bold')
ax2.set_xlabel('Request Submission Rate (RPS)', fontsize=11)
ax2.set_ylabel('Throughput (tx/s)', fontsize=11)
ax2.grid(True, which="both", ls="-", alpha=0.2)

plt.tight_layout()

# Save figure
plt.savefig('zkproof_scaling.jpg', dpi=300, bbox_inches='tight')
plt.close()