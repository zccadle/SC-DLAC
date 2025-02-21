import matplotlib.pyplot as plt
import numpy as np

# Data
concurrent_txs = [1, 2, 4, 8]
latency_ms = [35.30, 16.81, 10.07, 7.85]
throughput_tps = [28.33, 59.48, 99.30, 127.35]

# Create figure with two subplots
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))

# Latency plot
ax1.plot(concurrent_txs, latency_ms, 'o-', color='#3182CE', linewidth=2, markersize=8)
ax1.set_title('Transaction Latency vs. Concurrent Load', fontsize=13, fontweight='bold')
ax1.set_xlabel('Concurrent Transactions', fontsize=11)
ax1.set_ylabel('Avg. Latency (ms)', fontsize=11)
ax1.grid(linestyle='--', alpha=0.7)

# Throughput plot
ax2.plot(concurrent_txs, throughput_tps, 'o-', color='#805AD5', linewidth=2, markersize=8)
ax2.set_title('Transaction Throughput vs. Concurrent Load', fontsize=13, fontweight='bold')
ax2.set_xlabel('Concurrent Transactions', fontsize=11)
ax2.set_ylabel('Throughput (tx/s)', fontsize=11)
ax2.grid(linestyle='--', alpha=0.7)

# Set x-ticks to show all data points
ax1.set_xticks(concurrent_txs)
ax2.set_xticks(concurrent_txs)

plt.tight_layout()

# Save figure
plt.savefig('system_responsiveness.jpg', dpi=300, bbox_inches='tight')
plt.close()