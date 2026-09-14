# Observable World Lab — enterprise-first transition

The detailed existing city is retained as an observation and field-investigation interface, not discarded. The primary entry now opens a city observation view with society, commerce/services and individual tracking panels. Walking, driving, weather, buildings and interiors remain available.

## This slice

- 100 synthetic household representatives, 16 occupation categories. Occupational counts and wages are design assumptions, not census or BLS estimates.
- Explicit student study with no wages, plus occupation-specific workplace routing and cumulative service hours for police, healthcare, teaching and grounds maintenance.
- Five restaurant categories, two supermarkets, two retail categories and four public-service entries. These are logical service points, not claims of newly built high-fidelity interiors. Existing detailed restaurant and mall assets remain intact.
- Grocery purchases create household food inventory; subsequent meals can be prepared at home. Restaurant/market/clinic visits and revenue are observable. Non-food retail purchase decisions remain future work.
- Existing simulation balances and memories are preserved. New residents are funded only from available treasury cash; no negative migration treasury or negative wages.

## Wealth reference and limits

Federal Reserve DFA / FRED, U.S. household net worth, **2026 Q1**, released June 18, 2026:

| Household group | Population share | Net-worth share | Source |
|---|---:|---:|---|
| Bottom 50% | 50% | 2.5% | https://fred.stlouisfed.org/series/WFRBSB50215 |
| 50th–90th | 40% | 29.6% | https://fred.stlouisfed.org/series/WFRBSN40188 |
| 90th–99th | 9% | 36.3% | https://fred.stlouisfed.org/series/WFRBSN09161 |
| Top 1% | 1% | 31.6% | https://fred.stlouisfed.org/series/WFRBST01134 |

New experiments scale these four shares to an **illustrative $100 million aggregate net worth**, not an estimate of the actual city or U.S. mean household wealth. Noncash assets are separate from cash, deposits and virtual shares. Members within each group currently have equal target net worth; debt, negative wealth, detailed asset composition and within-group tails are not calibrated. Migrated residents keep accumulated liquid wealth even when it exceeds a reference target. The live panel shows actual simulated shares rather than silently forcing the target every day.

One visible adult represents one household. This is not a complete demographic model: children, household structure, age, income/occupation/wealth correlations, labor participation and geographic calibration remain to be implemented. It is not globally representative. No LLM or MatrAIx integration or validated prediction accuracy is claimed.

## Verification and next stage

Type check, build and 30-day simulation test; exact fresh wealth shares and group counts; scarce-treasury legacy migration, preservation of existing cash; zero student wages; nonnegative balances and needs. Browser visual QA and deployed API interaction have not been completed in this bounded slice.

Next: continuous collision-tested pedestrian paths, working venue capacity and queues, realistic opening hours and shift schedules, non-food demand, household income and liabilities, differentiated agent models and empirical calibration. Service hours do not yet alter lawn geometry, crime rates or clinical outcomes. Keep 3D visual fidelity work on the existing asset pipeline, not billboard replacements.
