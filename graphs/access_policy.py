import matplotlib.pyplot as plt
import numpy as np

# Data from additional-metrics.json
operations = ['Registration', 'Delegation', 'Verification', 'Authorization']
times = [57.10, 53.02, 12.28, 13.77]

# Create figure
plt.figure(figsize=(10, 6))
bars = plt.bar(operations, times, color='#4299E1')

# Annotate bars with values
for bar in bars:
    height = bar.get_height()
    plt.annotate(f'{height:.2f} ms',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),  # 3 points vertical offset
                textcoords="offset points",
                ha='center', va='bottom', fontsize=9)

# Customize chart
plt.title('Access Policy Operation Times', fontsize=14, fontweight='bold')
plt.xlabel('Operation Type', fontsize=12)
plt.ylabel('Average Time (ms)', fontsize=12)
plt.ylim(0, 70)  # Set y-axis limit
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()

# Save figure
plt.savefig('access_policy_operations.jpg', dpi=300, bbox_inches='tight')
plt.close()