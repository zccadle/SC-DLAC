import matplotlib.pyplot as plt
import numpy as np

# Data from access-flow-performance.json aggregated results
components = ['Access Request', 'Policy Verification', 'Enforcement', 'Response']
times = [47.48, 29.04, 14.37, 25.20]  # Average times in ms
errors = [    # Min and max differences from average
    [5.85, 14.34],  # Access Request
    [13.00, 4.00],  # Policy Verification
    [9.29, 2.46],   # Enforcement
    [10.59, 7.09]   # Response
]

plt.figure(figsize=(10, 6))

# Create error bar plot
x_pos = np.arange(len(components))
bars = plt.bar(x_pos, times, yerr=np.array(errors).T, capsize=5,
               color=['#3182CE', '#2C5282', '#2B6CB0', '#1A365D'])

# Annotate bars
for bar in bars:
    height = bar.get_height()
    plt.annotate(f'{height:.2f}ms',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),
                textcoords="offset points",
                ha='center', va='bottom', fontsize=9)

# Customize chart
plt.title('Access Flow Time Breakdown', fontsize=14, fontweight='bold')
plt.xlabel('Component', fontsize=12)
plt.ylabel('Time (ms)', fontsize=12)
plt.xticks(x_pos, components, rotation=15)
plt.grid(axis='y', linestyle='--', alpha=0.7)

plt.tight_layout()
plt.savefig('access_flow_breakdown.jpg', dpi=300, bbox_inches='tight')
plt.close()