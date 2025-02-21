import matplotlib.pyplot as plt
import numpy as np

# Data
complexity = [1, 2, 4, 8, 16, 32, 64, 128]
generation_times = [0.54, 0.04, 0.06, 0.05, 0.05, 0.07, 0.12, 0.25]
validation_times = [0.03, 0.01, 0.01, 0.02, 0.10, 0.02, 0.04, 0.06]

# Create figure with logarithmic x-axis
plt.figure(figsize=(10, 6))
plt.plot(complexity, generation_times, 'o-', color='#2B6CB0', linewidth=2, markersize=8, label='Proof Generation')
plt.plot(complexity, validation_times, 's-', color='#9C4221', linewidth=2, markersize=8, label='Proof Validation')

# Customize chart
plt.xscale('log')
plt.title('ZK Proof Generation and Validation Performance', fontsize=14, fontweight='bold')
plt.xlabel('Proof Complexity Level', fontsize=12)
plt.ylabel('Time (ms)', fontsize=12)
plt.grid(linestyle='--', alpha=0.7)
plt.legend(fontsize=12)

# Set x-ticks to show all data points
plt.xticks(complexity, [str(x) for x in complexity])

plt.tight_layout()

# Save figure
plt.savefig('zkproof_performance.jpg', dpi=300, bbox_inches='tight')
plt.close()