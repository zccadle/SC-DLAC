import matplotlib.pyplot as plt
import numpy as np

# Data (sorted by gas cost)
functions = [
    'requestDelegatedEmergencyAccess', 'createPatientRecord', 'updatePatientData',
    'createDID', 'revokeDelegatedEmergencyAccess', 'assignRole', 'createDelegationPolicy', 
    'submitProof', 'addRole', 'addAttribute', 'grantPermission', 
    'updateDIDRegistry', 'revokePermission', 'updatePolicy'
]
gas_costs = [
    529692, 325834, 257562, 227129, 202191, 192274, 191438, 
    114493, 102054, 63561, 53554, 47251, 31745, 25696
]

# Create horizontal bar chart
plt.figure(figsize=(12, 8))
bars = plt.barh(functions[::-1], gas_costs[::-1], color='#5A67D8')

# Annotate bars with values
for bar in bars:
    width = bar.get_width()
    plt.annotate(f'{width:,}',
                xy=(width, bar.get_y() + bar.get_height()/2),
                xytext=(5, 0),  # 5 points horizontal offset
                textcoords="offset points",
                ha='left', va='center', fontsize=8)

# Customize chart
plt.title('Operational Gas Costs for DACEMS Functions', fontsize=14, fontweight='bold')
plt.xlabel('Gas Used', fontsize=12)
plt.grid(axis='x', linestyle='--', alpha=0.7)
plt.tight_layout()

# Save figure
plt.savefig('operational_gas_costs.jpg', dpi=300, bbox_inches='tight')
plt.close()