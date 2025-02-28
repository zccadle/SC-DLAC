import matplotlib.pyplot as plt
import numpy as np

# Data from enhanced-data-intensity.json
categories = ['Data-Intensive Policy', 'Non-Data-Intensive Policy']
times = [166.83, 41.77]  # Updated with actual average values

# Create figure with reduced size
plt.figure(figsize=(8, 5))  # Reduced from (10, 6) to (8, 5)
bars = plt.bar(categories, times, color=['#E53E3E', '#38A169'], width=0.3)  # Further reduced width

# Annotate bars with values
for bar in bars:
    height = bar.get_height()
    plt.annotate(f'{height:.2f} ms',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),  # 3 points vertical offset
                textcoords="offset points",
                ha='center', va='bottom', fontsize=10)

# Add explanatory text about on-chain data limits
plt.figtext(0.5, 0.01, 
           "Note: Tests limited to 8KB due to practical on-chain storage constraints.",
           ha="center", fontsize=8, bbox={"facecolor":"orange", "alpha":0.1, "pad":5})

# Customize chart
plt.title('Data-Intensive vs. Non-Data-Intensive Policy Performance', fontsize=12, fontweight='bold')
plt.ylabel('Average Processing Time (ms)', fontsize=10)
plt.ylim(0, max(times) * 1.2)
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout(rect=[0, 0.05, 1, 1])  # Adjust layout to make room for text

# Save figure
plt.savefig('data_policy_performance.jpg', dpi=300, bbox_inches='tight')
plt.close()