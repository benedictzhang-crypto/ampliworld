# Open issues and AI research direction

This is a working register, not a claim that every concern raised during city
development has been fixed. The active product has two coupled but separately
testable parts: a playable, observable city and a synthetic society/market
experiment. Visual fidelity, resident plausibility and forecasting accuracy
must never be treated as interchangeable evidence.

## What earlier reviews taught us

| Area | Current state | Unresolved acceptance gate |
|---|---|---|
| City scale and art | One 20 × 30 km metre-space plan contains a detailed core and coarser generated parcels. Original GLB assets now replace some primitive shells. | A contiguous 2 × 2 km reference district must pass ground-level visual review at human scale. Every named asset needs a stable ID, position, bounds, entrances, collision data and provenance. No image pasted on one face may stand in for a building. |
| World continuity | Buildings, roads, water, terrain and entrances share coordinates; some housing and metro assets load near the player or inspection camera. | Drive and walk end-to-end routes without missing pavement, floating trees, sudden large-asset disappearance, water/road breaks, wall clipping or a camera falling through terrain. Record failing coordinates before cosmetic edits. |
| Navigation and performance | Player movement, cars, city map and outdoor teleport exist. Population rendering is capped to a nearby sample; map wheel updates are coalesced. | Measure frame time and memory on representative laptop/mobile hardware, including a long session. Map zoom/drag, teleport, walking, driving, garage and rides need reproducible interaction tests. A successful build is not a frame-rate benchmark. |
| Transit | Metro entrances, alignment and a visual elevated pilot exist. | Train timetable, boarding, doors, fares, elevators/escalators and passenger travel must share one clock, connect to jobs/homes and be verified physically. A teleport to an entrance is not a metro journey. |
| Resident economy | Thirty thousand records have households, jobs, money, housing and bounded needs/memory. Payroll and shopping ledgers expose shortfalls. | Model the missing customers/contracts of office and service firms, travel/work time, rent/credit defaults and realistic occupational/wealth distributions. Preserve money and inventory conservation; compare against observed population data before calling the society realistic. |
| Social/health | Food, hydration, work, family events, physical/mental-health-like scores and adaptive preferences affect choices. | Add appropriately scoped social networks, childcare, pets, illness/care and long-run demographic transitions only with explicit state, costs and validation. Current scores are simulation variables, not clinical measures or human consciousness. |
| Market/AI | News interventions and timestamped paper-market snapshots can change investor choices. The Python signal/portfolio pipeline is heuristic. | Obtain licensed point-in-time data; freeze research hypotheses and OOS periods; demonstrate incremental net-of-cost predictive value against simple baselines. No profitable, scalable trading edge is established. |

The archive in the README records many individual fixes (housing counts,
garage floors, yachts, venues, staffing and map controls). It does **not** prove
that the full route network, every parcel, every interior or every NPC is
finished. Before another large expansion, resolve defects in a small reference
district and retain regression coordinates/screenshots for each fix.

## The AI-human question

The intended research is not to attach a chat model to every visible NPC. An
individual needs a stable identity and **state that constrains action**:
household and social ties, physical needs, resources, debt, job, location,
information available at that instant, beliefs, goals and episodic memory.
The world needs prices, inventory, opening hours, firm budgets, transport,
market quotes and event provenance. These are distinct from the rendered mesh.

At present, decisions are largely explicit rules with bounded preference
updates. The proposed learned layer is a conditional transition and policy
model, not a claim that a large-language-model narrative is a human mind:

`(xᵢ,t+1, zᵢ,t+1) ~ pθ(· | xᵢ,t, zᵢ,t, gₜ, aᵢ,t, socialᵢ,t)`

`aᵢ,t ~ πθ(· | xᵢ,t, zᵢ,t, information_available_at_t)`

Here `x` is inspectable individual state, `g` is shared world state, and `z`
is a **future learned** latent belief/preference representation. It is not
currently trained. Model proposals may change a goal or hypothesis; ledgers,
age/asset constraints, safety limits and event timestamps remain authoritative.
Large population scale should use heterogeneous cohorts and selective active
agents, while keeping individual records queryable. Neither 30,000 stored
people nor an upstream 8.3-billion-persona frame means 30,000 or 8.3 billion
independent LLM minds are running.

## Experiments that would make this research credible

1. **Behavior first:** use consented or appropriately licensed real outcomes
   for a narrow question, such as price-change substitution among groceries.
   Hold out people, places and future periods. Compare the rule baseline,
   a conventional statistical model and any learned agent model; report
   subgroup error and abstention. Training and testing only against our own
   rules merely measures imitation of our simulator.
2. **World dynamics:** pre-register event scenarios, preserve as-of and
   available-at times, and evaluate 1-, 7-, 30- and 90-day distributions.
   Report calibration, conservation violations, drift, feedback loops and
   how uncertainty compounds. A visually convincing reaction is not a causal
   estimate of what real people would do.
3. **Market incrementality:** map behavior to company revenue/expectations and
   only then to market outcomes. Compare against price-only, event-only and
   consensus-surprise baselines. Use a sealed walk-forward OOS ledger with
   delistings, turnover, fees, spread, slippage, impact, capacity, financing,
   factor exposure and P&L attribution. Do not turn hypothetical portfolio
   return into a performance claim.
4. **Operations:** benchmark simulation time, per-agent memory, storage and
   client frame time independently. A city rendering optimization does not
   improve model validity, and a better model does not fix wall collision.

The immediate priority is a reproducible behavioral benchmark plus a
physically reliable 2 × 2 km city slice. The deeper state/transition/evaluation
contract is in [WORLD_MODEL_RESEARCH_PROTOCOL.md](WORLD_MODEL_RESEARCH_PROTOCOL.md).
