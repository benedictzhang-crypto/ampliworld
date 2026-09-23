# AmpliWorld: path from 30,000 to 300,000 residents

The 20 × 30 km world covers 600 km². A 30,000-person register represents 50
residents/km² across that whole rectangle; 300,000 would represent 500/km².
District-level density must be much higher in the CBD and lower in water,
industrial, park and mountain areas. The target is **300,000 distinct people**,
not ten copies of the current NPC set.

## Invariants before expansion

- One stable resident ID, household, age, name, occupation, employer, income,
  liquid assets, non-cash assets, debt, home and social graph per person.
- Exact household wealth-cohort counts and budget; no accidental coupling of
  wealth cohort to family type or age via modular index arithmetic.
- Housing placement uses ownership and market-rent affordability. Any
  subsidized placement is recorded, not disguised as an affordable luxury unit.
- Employers have specific physical locations and role-appropriate staff.
  Employment, customer demand, payroll funding and commuting are separate
  measurable quantities.
- Every intervention can be compared with a seeded control and preserves the
  cash ledger unless its policy explicitly transfers funds.

## Capacity gap

The 30,000-person seed contains 10,000 three-person households and 19,512
employed residents across 61 employer types. The current catalog has 24,174
physical dwelling slots. Holding household size and employment participation
constant, 300,000 residents require roughly 100,000 household slots and
195,000 jobs. That is an architectural target, **not** a justification for
inventing ~76,000 apartments or ~175,000 jobs in one bootstrap operation.
Population, usable floor area, businesses, demand and infrastructure must be
expanded together by district.

## Runtime architecture

1. Persist all 300,000 profiles in district/household partitions with stable
   IDs. Keep citizen biography and balance-sheet records separate from hot
   simulation state; retrieve a person by ID without loading the whole city.
2. Replace `structuredClone` of the entire world and every-five-minute scans
   of every resident with an event queue. Schedule the next action for active
   people, and advance inactive households with a coarser daily model.
3. Activate detailed behavior for observed districts, affected news cohorts,
   market participants and their social/economic neighbors. Do not equate
   "not rendered" with "not simulated"; preserve aggregates and event logs.
4. Store ledger deltas and checkpoint partitions. Salary, purchases, loans and
   taxes must remain reconstructable and cash-conserving across partitions.
5. Keep 3D draw distance and NPC LOD independent of census size. Visible
   pedestrians and traffic are spatial samples of persistent residents; the
   client never receives all 300,000 records in one response.

## Gates

Expand first to 60,000, then 100,000, then 300,000 only after measuring
world initialization, one-day and 30-day simulation time, memory, payload
size, resident lookup latency, district arrival flow, occupation mix,
affordability exceptions and accounting conservation. Keep the 30,000-person
scenario as a reproducible control during this transition. Existing saved
worlds must not be silently reallocated or overwritten by a new seed policy.

This plan is an engineering and synthetic-research target. A larger census
does not itself improve prediction accuracy; external calibration and
out-of-sample intervention tests remain separate requirements.
