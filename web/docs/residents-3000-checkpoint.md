# Original resident library: 3,000-person checkpoint

The initial cohort contains 3,000 original synthetic residents in 1,000 three-person households. IDs, accounts, family links, and simulation state refer to the same individuals. This is a CBD-centered metropolitan cohort across 53 named residential groups, not 3,000 inhabitants within the core block. No restricted MatrAIx records imported.

The occupancy catalog references 1,168 existing residential building IDs and 163 commercial/employer locations. Capacities, logical unit numbers, salaries, valuations and financing terms are hypothetical configuration, not measured demographics. Commercial premises are workplaces, not residences. Vacant buildings remain available.

Housing ownership is recorded once per household. Housing equity classifies existing non-cash wealth; it is never added again to net worth. Affordability uses household income, a 20% minimum equity requirement, a 3.6% hypothetical rate and a 30-year maximum term. Rental caps imply explicit scenario housing support, including some expensive units; they do not prove realistic market affordability. Existing cash, savings and aggregate assets/debt survive migration unchanged.

Completed: employment assignment, monthly salary estimates, residential unit allocation, sole-owner/renter records, opening mortgage balances and payment estimates, profile UI, compressed compatible snapshots, population/finance/storage invariants.

Added 21 September: rent and mortgage cashflow now executes every 30 simulated days. Adult household members pay from cash and then savings; shortfalls become explicit rent or mortgage arrears. Mortgage interest enters the public financial account, principal reduces the loan balance and becomes owner non-cash assets, and existing saves begin at their current simulated month without retroactive debits. This is a fictional accounting rule, not a calibrated lending or tenancy model.

Next: pensions and household transfers, taxes, arrears repayment and foreclosure policy, realistic rent-market calibration, capacity-aware service catchments, cross-district road/transit routing, per-floor indoor occupancy, and distribution validation. Long trips currently use disclosed distance-based abstract transit; they are not collision-checked physical paths.
