import matplotlib.pyplot as plt
import numpy as np

# Data from additional-metrics.json
categories = ['Data-Intensive Policy', 'Non-Data-Intensive Policy']
times = [74.38, 61.17]

# Create figure
plt.figure(figsize=(8, 6))
bars = plt.bar(categories, times, color=['#E53E3E', '#38A169'])

# Annotate bars with values
for bar in bars:
    height = bar.get_height()
    plt.annotate(f'{height:.2f} ms',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),  # 3 points vertical offset
                textcoords="offset points",
                ha='center', va='bottom', fontsize=10)

# Customize chart
plt.title('Data-Intensive vs. Non-Data-Intensive Policy Performance', fontsize=14, fontweight='bold')
plt.ylabel('Average Processing Time (ms)', fontsize=12)
plt.ylim(0, 90)  # Set y-axis limit
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()

# Save figure
plt.savefig('data_policy_performance.jpg', dpi=300, bbox_inches='tight')
plt.close()