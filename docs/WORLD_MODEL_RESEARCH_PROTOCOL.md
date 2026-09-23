# From a living-city baseline to a testable world model

This document is an implementation and evaluation contract, not a claim that
AmpliWorld already has a trained frontier model or a profitable strategy.

## State, action and transition

At time `t`, preserve three separately versioned states:

- **Individual** `xᵢ,t`: health, hydration, nutrition, energy, happiness,
  stress, cash, savings, debt, stock holdings, work schedule, family/social
  links, location, memories and information actually available to person `i`.
- **World** `gₜ`: venue staffing/prices/inventory, wages, transport, housing,
  public events, market quotes and their observation/availability times.
- **Latent** `zᵢ,t`: a *future learned* compact representation of unobserved
  preferences, beliefs and behavioral persistence. Today's heuristic variables
  are not a trained latent state.

The proposed learning problem is

`zᵢ,t+1, xᵢ,t+1 ~ pθ(. | zᵢ,t, xᵢ,t, gₜ, aᵢ,t, socialᵢ,t)`;
`aᵢ,t ~ πθ(. | zᵢ,t, xᵢ,t, information_available_at_t)`.

The current code uses explicit rules for needs, household interaction and an
interpretable stock-search baseline. Money moves through the authoritative
ledger, not free-form model text. Future learned transitions must preserve
hard constraints (nonnegative balances, ownership, temporal availability)
and report uncertainty rather than output a single persuasive story.

## Current implemented baseline

- 30,000 persistent synthetic resident records. Client rendering shows a
  spatial sample; this does **not** mean 30,000 simultaneous LLM calls.
- Each resident now has a bounded stress state alongside health, hydration,
  nutrition, energy and happiness. Work and wages, rest, fruit, meal quality,
  household conflict/support, price shocks and held-stock gains/losses change
  these states with inspectable rules and individual memory.
- A versioned, per-resident adaptive policy now stores a bounded experience
  trace and slowly updates food/leisure preference, perceived family support,
  work reliability, market style and risk budget from observed outcomes.
  Repeated adverse returns on a newly entered position can change the next
  market-search style and reduce its position budget. Daily drift prevents
  permanently frozen preferences. This is deterministic online heuristic
  adaptation, not a trained autonomous agent or evidence of predictive edge.
- Wellbeing has separate individual happiness and stress setpoints, a faster
  transient mood state, and a slower simulated mental-health state. Routine
  rewards fade rather than compounding forever. Public-news shocks are held
  per resident as pressure that decays gradually; negative news can shift the
  city mean without any aggregate clamp. The six-axis view is available for
  an individual and for the full 30,000-person city, calculated before the
  client receives its 1,200-person spatial sample. It adds physical health
  and a cash-buffer-based financial-security estimate. These
  are synthetic research scores, not clinical assessments or empirically
  calibrated population norms. Milk headlines currently affect perceived
  affordability; the bread scenario additionally reprices the model's food
  basket, but full merchant-level repricing is pending.
- The $18/hour nominal wage floor is distinct from cash actually paid. The
  resident payroll ledger records earned, paid, outstanding and subsequently
  repaid cents; private payroll is constrained by business cash, public
  payroll by the public account. Day-boundary arrears settlement transfers
  available money without minting it. A new work hour is offered only when
  the employer has cash (or a finite public backstop has been explicitly
  selected); residents with an unfunded shift record an underemployed day.
  Cash can still change between scheduling and completion, so arrears are
  retained rather than erased. Grocery baskets now pay the operating store,
  and the resident's last purchase records that store ID. This makes wage
  reliability, demand flow and underemployment separately testable.
  `npm run check:payroll-counterfactual` compares that default with a finite
  public-account backstop on the same opening city for 30 days, recording
  wages paid, arrears, support costs and wellbeing. The backstop is an
  experimental fiscal intervention, not a free guarantee or policy proposal.
  In the superseded, pre-demand-routing/pre-funded-shift paired run, the
  default paid 41.8% of accrued wages and ended
  with roughly $45.0m owed; the finite backstop paid 74.5%, spent $24.0m of
  public funds and still owed roughly $19.8m. Mean mental health ended at
  61.73 versus 62.20 under the backstop, compared with 64.93 initially;
  stress did not consistently improve. These are synthetic accounting
  diagnostics, not empirical estimates. Employer revenue/productivity and
  cash-circulation closure remain a priority before using this world to
  forecast economic outcomes. In particular, office and some transport and
  maintenance employers still lack modeled customers/contracts; suppressing
  unfunded shifts is not evidence that their workers are productively employed.
  `npm run check:firm-funding` is the seven-day sector and conservation gate.
  Its first run paid 97.72% of accrued wages but logged 37,007
  underemployed resident-days; office firms generated zero modeled sales.
  The reduced arrears must therefore be read alongside lost working time.
  In the revised 30-day pair, the default accrued $33.78m, paid 98.02% and
  owed $0.67m; the public-backstop world accrued $58.01m, paid 87.37%, owed
  $7.33m and used $20.78m in public support. Under the current simultaneous
  scheduling rule, a backstop invites more shifts than it can ultimately
  finance. The two scenarios therefore do not hold labor hours constant.
- The food basket contains bread, protein foods, sweets and fruit. A
  subsistence constraint, daily budget and heterogeneous preference determine
  quantities. Bread demand can be locally Giffen-like when a price rise pushes
  protein out of a narrowly constrained basket; a small transfer may buy
  sweets while a larger or differently preferred basket buys protein/fruit.
  The low-income transfer currently uses the bottom-wealth cohort as an
  eligibility proxy and is funded by the simulated treasury. These are
  scenario mechanisms, not calibrated demand elasticities or claims about
  universal poor-household preferences. Compare planned choices with actual
  store purchases and eventually observed data.
- A market snapshot supplies 1–50 symbols with cent prices, source, `asOf`
  and `availableAt`. The API rejects future or backwards observations and
  requires explicit zero-value delisting rather than silently dropping a
  held symbol. Residents search the available symbols using heterogeneous
  heuristic styles, risk and stress; they may buy fractional shares, sell or
  abstain. Holdings use integer milli-shares to keep the ledger deterministic. This is a
  paper-world behavior experiment, not evidence of trading alpha.
- Existing index trading remains as a clearly synthetic fallback when no
  market snapshot is loaded. The market form is manual; vendor licensing,
  point-in-time corporate actions and historical replay are not established.

### Synthetic equilibrium check (30,000 residents)

In a deterministic 30-day run with no injected news, city-mean happiness was
59.5 → 60.1, transient mood 69.5 → 68.6, and stress 33.0 → 33.0. Simulated
mental health moved 64.9 → 61.7; wage reliability and household/economic
dynamics still require separate calibration. A 20% milk-price headline moved
the immediate means to happiness 58.3, mood 66.1 and stress 34.9. One day
later, the treated city remained below a no-news control by about 2.1
happiness points and 1.1 mood points. These are **unit/scenario results from
our own synthetic rules**, not measurements of real human responses. The
headline changes perceived pressure; it does not yet reprice merchant stock.

## Training and experimental design

1. Build an immutable input ledger for every event, quote, filing and outcome:
   source, license, as-of time, first available time, universe membership,
   revisions, model version and random seed. Preserve delisted constituents.
2. Measure individual transitions with consented or appropriately licensed
   observations. Synthetic trajectories can test mechanics, but training and
   evaluating only on synthetic rules would merely teach a model to imitate
   those rules; it cannot establish real-world predictive validity.
3. Fit a small transition baseline before a large model. Compare independent
   needs, graph-aware household interactions and latent recurrent dynamics.
   Freeze train/validation/test periods and document all hyperparameter trials.
4. For event interventions, compare treated and matched control cohorts;
   distinguish exogenous information from outcomes already priced in. Do not
   interpret one generated counterfactual as causal identification.
5. Forecast 1, 7, 30 and 90-day distributions for purchases, stress, work,
   wealth and market participation. Evaluate calibration, log score/CRPS,
   subgroup errors, constraint violations and error compounding. Report where
   the model abstains or fails.
6. Only then test whether simulated behavior adds incremental signal to
   market baselines. Use walk-forward and purged validation, a sealed 2–3-year
   out-of-sample period where data permit, transaction costs, slippage,
   turnover, borrow, market impact, capacity, factor neutrality, delisting,
   multiple-testing adjustment and P&L/drawdown attribution.

No training result, long-horizon real-world score or untouched 2–3-year OOS
result is currently reported. The desktop NoobTrade reports are read-only
research evidence, not the point-in-time market feed. A local audit helper at
`scripts/audit_noobtrade_backtest.py` stress-tests reported trades against
additional costs without copying those files or calling it a rebacktest.

For a **historical scenario only**, `scripts/export_noobtrade_market_scenario.py`
reads selected daily closes from a local SQLite archive in read-only mode and
emits small NDJSON snapshots. From `web/`, pipe that output to
`node --import tsx scripts/replay-market-scenario.ts`. The latter advances the
30,000-resident world and reports stock participation, needs and cash
conservation. It does not save the archive in Git. Archived `created_at` is
used conservatively as availability metadata, so historical observations
that were bulk imported later are *not* transformed into point-in-time data.
The replay is an intervention/behavior smoke test, not a historical alpha test.
