import matplotlib.pyplot as plt
import numpy as np

# Data from enhanced-zkproof-performance.json aggregated results
components_small = ['Signing', 'Generation', 'Verification']
components_large = ['Validation', 'Cumulative']

times_small = [0.4048, 1.9000, 0.2467]  # Average times in ms
times_large = [58.7349, 61.2866]  # Average times in ms

errors_small = [    # Min and max differences from average
    [0.1863, 0.8709],  # Signing
    [0.9203, 0.9838],  # Generation
    [0.0939, 0.1871],  # Verification
]
errors_large = [    # Min and max differences from average
    [12.2654, 12.0542],  # Validation
    [12.9707, 13.0999]   # Cumulative
]

# Create figure with two subplots
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))

# Plot 1: Small time components
x_pos_small = np.arange(len(components_small))
bars1 = ax1.bar(x_pos_small, times_small, yerr=np.array(errors_small).T, capsize=5,
                color=['#3182CE', '#2C5282', '#2B6CB0'])

# Annotate bars in first plot
for bar in bars1:
    height = bar.get_height()
    ax1.annotate(f'{height:.2f}ms',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),
                textcoords="offset points",
                ha='center', va='bottom', fontsize=9)

# Customize first plot
ax1.set_title('Proof Generation Components', fontsize=13, fontweight='bold')
ax1.set_xlabel('Component', fontsize=11)
ax1.set_ylabel('Time (ms)', fontsize=11)
ax1.set_xticks(x_pos_small)
ax1.set_xticklabels(components_small)
ax1.grid(axis='y', linestyle='--', alpha=0.7)

# Plot 2: Large time components
x_pos_large = np.arange(len(components_large))
bars2 = ax2.bar(x_pos_large, times_large, yerr=np.array(errors_large).T, capsize=5,
                color=['#2D3748', '#1A365D'])

# Annotate bars in second plot
for bar in bars2:
    height = bar.get_height()
    ax2.annotate(f'{height:.2f}ms',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),
                textcoords="offset points",
                ha='center', va='bottom', fontsize=9)

# Customize second plot
ax2.set_title('Validation Components', fontsize=13, fontweight='bold')
ax2.set_xlabel('Component', fontsize=11)
ax2.set_ylabel('Time (ms)', fontsize=11)
ax2.set_xticks(x_pos_large)
ax2.set_xticklabels(components_large)
ax2.grid(axis='y', linestyle='--', alpha=0.7)

# Add overall title
plt.suptitle('ZK Proof Component Performance Breakdown', fontsize=14, fontweight='bold', y=1.05)

plt.tight_layout()

# Save figure
plt.savefig('zkproof_breakdown.jpg', dpi=300, bbox_inches='tight')
plt.close()