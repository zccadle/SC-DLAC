import matplotlib.pyplot as plt
import numpy as np

# Data from original and additional measurements
operations = [
    'Policy Registration', 
    'Access Delegation',
    'Policy Verification',
    'Authorization',
    'Emergency Access',
    'Data Update'
]

times = [
    57.10,  # Registration
    53.02,  # Delegation
    12.28,  # Verification
    13.77,  # Authorization
    65.26,  # Emergency Access (from original data)
    59.87   # Data Update (from original data)
]

# Create figure
plt.figure(figsize=(12, 7))
colors = ['#4299E1', '#4299E1', '#4299E1', '#4299E1', '#805AD5', '#805AD5']
bars = plt.bar(operations, times, color=colors)

# Annotate bars with values
for bar in bars:
    height = bar.get_height()
    plt.annotate(f'{height:.2f} ms',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),  # 3 points vertical offset
                textcoords="offset points",
                ha='center', va='bottom', fontsize=9)

# Customize chart
plt.title('Transaction Times for Key Operations', fontsize=14, fontweight='bold')
plt.xlabel('Operation Type', fontsize=12)
plt.ylabel('Average Time (ms)', fontsize=12)
plt.ylim(0, 80)  # Set y-axis limit
plt.xticks(rotation=15, ha='right')
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()

# Add a legend to differentiate categories
import matplotlib.patches as mpatches
blue_patch = mpatches.Patch(color='#4299E1', label='Access Policy Operations')
purple_patch = mpatches.Patch(color='#805AD5', label='Data Operations')
plt.legend(handles=[blue_patch, purple_patch], loc='upper right')

# Save figure
plt.savefig('combined_transaction_times.jpg', dpi=300, bbox_inches='tight')
plt.close()