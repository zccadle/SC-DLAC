import matplotlib.pyplot as plt
import numpy as np

# Data from access-flow-performance.json
operations = ['Registration', 'Delegation', 'Verification', 'Enforcement']
times = [49.56, 43.20, 14.17, 18.99]  # Updated values

plt.figure(figsize=(10, 6))
bars = plt.bar(operations, times, color='#4299E1', width=0.6)  # Reduced width

# Annotate bars
for bar in bars:
    height = bar.get_height()
    plt.annotate(f'{height:.2f} ms',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),
                textcoords="offset points",
                ha='center', va='bottom', fontsize=9)

# Customize chart
plt.title('Access Policy Operations', fontsize=14, fontweight='bold')
plt.xlabel('Access Policy Operations', fontsize=12)  # Updated label
plt.ylabel('Average Time (ms)', fontsize=12)
plt.ylim(0, max(times) * 1.2)
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()

plt.savefig('access_policy_operations.jpg', dpi=300, bbox_inches='tight')
plt.close()