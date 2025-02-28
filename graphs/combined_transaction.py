import matplotlib.pyplot as plt
import numpy as np

# Data from our test results
operations = [
    # DID Operations
    'DID Registration', 
    'Add Attribute',
    'Verify DID Control', 
    
    # Access Policy Operations
    'Policy Registration', 
    'Access Delegation',
    'Policy Verification',
    'Enforcement',
    
    # Data Operations
    'Emergency Access', 
    'Data Update',
    
    # ZKP Operations
    'Proof Generation',
    'Proof Verification',
    'Proof Validation'
]

# Average times from test results (ms)
times = [
    # DID Operations
    49.56, 
    19.34, 
    12.47,
    
    # Access Policy Operations
    48.81, 
    47.08, 
    10.19, 
    19.69,
    
    # Data Operations
    75.26,  # Emergency access
    59.87,  # Data update
    
    # ZKP Operations
    1.90,   # Generation
    0.24,   # Verification
    58.73   # Validation
]

# Create figure
plt.figure(figsize=(14, 8))
colors = [
    # DID Operations
    '#4299E1', '#4299E1', '#4299E1',
    
    # Access Policy Operations
    '#805AD5', '#805AD5', '#805AD5', '#805AD5',
    
    # Data Operations
    '#C05621', '#C05621',
    
    # ZKP Operations
    '#2C7A7B', '#2C7A7B', '#2C7A7B'
]

bars = plt.bar(operations, times, color=colors)

# Annotate bars with values
for bar in bars:
    height = bar.get_height()
    plt.annotate(f'{height:.2f} ms',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),  # 3 points vertical offset
                textcoords="offset points",
                ha='center', va='bottom', fontsize=8)

# Customize chart
plt.title('Core Transaction Operations Performance', fontsize=14, fontweight='bold')
plt.xlabel('Core Transaction Operations', fontsize=12)
plt.ylabel('Average Time (ms)', fontsize=12)
plt.ylim(0, max(times) * 1.2)
plt.xticks(rotation=45, ha='right')
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()

# Add a legend to differentiate categories
import matplotlib.patches as mpatches
blue_patch = mpatches.Patch(color='#4299E1', label='DID Operations')
purple_patch = mpatches.Patch(color='#805AD5', label='Access Policy Operations')
orange_patch = mpatches.Patch(color='#C05621', label='Data Operations')
teal_patch = mpatches.Patch(color='#2C7A7B', label='ZKP Operations')
plt.legend(handles=[blue_patch, purple_patch, orange_patch, teal_patch], loc='upper right')

# Save figure
plt.savefig('combined_transaction_times.jpg', dpi=300, bbox_inches='tight')
plt.close()