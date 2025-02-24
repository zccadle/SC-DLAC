import matplotlib.pyplot as plt
import numpy as np

# Data from enhanced-encryption-comparison.json
sizes = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072]

# AES-256 data
aes256_encryption = [0.21610, 0.04523, 0.03853, 0.03283, 0.04956, 0.08073, 0.17459, 0.40330, 0.71676, 1.10250, 2.50176, 4.51050, 9.28003, 18.55373, 38.20393, 72.61310, 138.42936, 274.22363]
aes256_decryption = [0.02679, 0.02476, 0.02723, 0.02720, 0.03933, 0.07513, 0.19210, 0.50203, 0.85169, 1.92746, 3.72753, 7.00543, 15.18863, 31.21363, 57.17419, 132.91143, 236.42463, 492.77816]

# AES-192 data
aes192_encryption = [0.03106, 0.36726, 0.01653, 0.02306, 0.05803, 0.08440, 0.19253, 0.48903, 0.74706, 1.06059, 2.23320, 3.97393, 8.88499, 16.21799, 31.81133, 64.82553, 126.70053, 265.47803]
aes192_decryption = [0.01836, 0.01916, 0.02013, 0.02879, 0.05513, 0.09146, 0.19116, 0.59829, 0.89199, 1.90369, 3.23329, 6.55763, 12.78530, 26.33643, 54.84926, 106.60159, 207.69699, 443.24316]

# Create figure with logarithmic x-axis
plt.figure(figsize=(12, 7))

# Plot lines with markers
plt.plot(sizes, aes256_encryption, 'o-', color='#2A4365', linewidth=2, markersize=8, label='AES-256 Encryption')
plt.plot(sizes, aes256_decryption, 's-', color='#2B6CB0', linewidth=2, markersize=8, label='AES-256 Decryption')
plt.plot(sizes, aes192_encryption, '^-', color='#C05621', linewidth=2, markersize=8, label='AES-192 Encryption')
plt.plot(sizes, aes192_decryption, 'D-', color='#DD6B20', linewidth=2, markersize=8, label='AES-192 Decryption')

# Customize chart
plt.xscale('log')
plt.yscale('log')  # Added log scale for y-axis due to large range
plt.title('Encryption/Decryption Performance Comparison', fontsize=14, fontweight='bold')
plt.xlabel('Data Size (KB)', fontsize=12)
plt.ylabel('Time (ms)', fontsize=12)
plt.grid(True, which="both", ls="-", alpha=0.2)
plt.legend(fontsize=10, bbox_to_anchor=(1.05, 1), loc='upper left')

# Adjust layout to prevent label cutoff
plt.tight_layout()

# Save figure
plt.savefig('encryption_decryption_performance.jpg', dpi=300, bbox_inches='tight')
plt.close()