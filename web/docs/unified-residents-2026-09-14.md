# Unified residents checkpoint

One resident ID links the street instance, persisted identity, family, personality, needs, memories, cash, bank savings, paper holdings, asset valuation and debt. There is no separate decorative population presented as active residents.

- Current implementation: 300 individual resident records, 100 logical three-person households. 30,000 CBD residents remains a target, not delivered population.
- Existing R IDs and financial balances survive identity migration, including loans and non-cash valuations. Migration is saved by the next successful advance operation; GET upgrades are deterministic but do not write the database.
- Street clicks and the resident browser select the same saved record. Identity includes age, occupation, logical home, personality parameters, guardians and reciprocal family/neighbour links. Co-workers are found among existing residents at the same workplace.
- Nearby stored positions can trigger template conversations, recorded in both participants' memories. This is not LLM dialogue or verified conversational realism.
- Minors cannot earn work wages or initiate trades; their existing assets are never deleted during migration.
- Individual wealth is a hypothetical initialization inspired by household shares, not a calibrated individual wealth or age distribution.

Remaining: building/unit ownership, itemized asset register, loan contracts and repayment schedules, richer household arrangements, age-consistent care scheduling, movement interpolation/collision review, large-population scheduling and empirical calibration. Accounts are internal simulated identities, not real-world bank accounts or human login accounts.
