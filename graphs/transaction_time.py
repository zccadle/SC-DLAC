import matplotlib.pyplot as plt
import numpy as np

# Data
operations = ['Policy Registration', 'Access Right Delegation', 'Emergency Access Request', 'Data Update']
avg_times = [41.33, 51.61, 65.26, 59.87]

# Calculate error bars (min and max values)
min_times = [
    min([54.72, 36.06, 46.28, 44.73, 24.86]),
    min([47.73, 83.03, 46.71, 40.83, 39.76]),
    min([82.97, 63.58, 49.24]),
    min([62.53, 67.55, 55.77, 57.41, 56.08])
]

max_times = [
    max([54.72, 36.06, 46.28, 44.73, 24.86]),
    max([47.73, 83.03, 46.71, 40.83, 39.76]),
    max([82.97, 63.58, 49.24]),
    max([62.53, 67.55, 55.77, 57.41, 56.08])
]

# Calculate error bar heights
yerr_min = [avg_times[i] - min_times[i] for i in range(len(avg_times))]
yerr_max = [max_times[i] - avg_times[i] for i in range(len(avg_times))]
yerr = [yerr_min, yerr_max]

# Create figure
plt.figure(figsize=(10, 6))
bars = plt.bar(operations, avg_times, color='#3182CE', yerr=yerr, capsize=10)

# Annotate bars with values
for bar in bars:
    height = bar.get_height()
    plt.annotate(f'{height:.2f} ms',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),  # 3 points vertical offset
                textcoords="offset points",
                ha='center', va='bottom', fontsize=9)

# Customize chart
plt.title('Average Transaction Execution Times', fontsize=14, fontweight='bold')
plt.xlabel('Operation Type', fontsize=12)
plt.ylabel('Time (ms)', fontsize=12)
plt.ylim(0, 90)  # Set y-axis limit
plt.xticks(rotation=15, ha='right')
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()

# Save figure
plt.savefig('transaction_times.jpg', dpi=300, bbox_inches='tight')
plt.close()