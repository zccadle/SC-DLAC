import matplotlib.pyplot as plt
import numpy as np

# Data
sizes = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024]
encryption_times = [0.57, 0.06, 0.06, 0.10, 0.30, 0.14, 0.32, 0.43, 0.80, 1.54, 2.55]
decryption_times = [0.08, 0.03, 0.03, 0.06, 0.12, 0.14, 0.22, 0.53, 0.92, 1.86, 3.76]

# Create figure with logarithmic x-axis
plt.figure(figsize=(10, 6))
plt.plot(sizes, encryption_times, 'o-', color='#2A4365', linewidth=2, markersize=8, label='Encryption')
plt.plot(sizes, decryption_times, 's-', color='#C05621', linewidth=2, markersize=8, label='Decryption')

# Customize chart
plt.xscale('log')
plt.title('Encryption and Decryption Performance', fontsize=14, fontweight='bold')
plt.xlabel('Data Size (KB)', fontsize=12)
plt.ylabel('Time (ms)', fontsize=12)
plt.grid(linestyle='--', alpha=0.7)
plt.legend(fontsize=12)

# Set x-ticks to show all data points
plt.xticks(sizes, [str(x) for x in sizes])

plt.tight_layout()

# Save figure
plt.savefig('encryption_decryption_performance.jpg', dpi=300, bbox_inches='tight')
plt.close()