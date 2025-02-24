import matplotlib.pyplot as plt
import numpy as np

# Data from enhanced-gas-analysis.json
contracts = ['ZKP_Manager', 'DLAC_Manager', 'DID_Manager', 'AuditLogger', 'EHR_Manager']
gas_costs = [292943, 2391738, 1195591, 813096, 2405196]

# Create figure
plt.figure(figsize=(10, 6))
bars = plt.bar(contracts, gas_costs, color='#4682B4')

# Annotate bars with values
for bar in bars:
    height = bar.get_height()
    plt.annotate(f'{height:,}',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3),  # 3 points vertical offset
                textcoords="offset points",
                ha='center', va='bottom', fontsize=9)

# Customize chart
plt.title('Smart Contract Deployment Gas Costs', fontsize=14, fontweight='bold')
plt.xlabel('Smart Contract', fontsize=12)
plt.ylabel('Gas Used', fontsize=12)
plt.xticks(rotation=45, ha='right')
plt.grid(axis='y', linestyle='--', alpha=0.7)
plt.tight_layout()

# Save figure
plt.savefig('deployment_gas_costs.jpg', dpi=300, bbox_inches='tight')
plt.close()