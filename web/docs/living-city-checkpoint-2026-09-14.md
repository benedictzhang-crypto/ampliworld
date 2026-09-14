# Living city — first implementation checkpoint

## Implemented

- 48 explicitly synthetic residents, not imported MatrAIx profiles or calibrated LLM agents.
- Independent simulation clock; water, nutrition, health, energy, happiness, cash, savings, work hours and virtual holdings.
- Budget-constrained rule selection for water, meals, paid work, rest, clinic care, leisure, park trips, bank transfers and paper trades.
- Integer-cent accounting with a finite shared counterparty treasury. Paper prices are a deterministic synthetic test series, not market forecasts.
- Per-resident reasons and a bounded 32-event memory; 31-day aggregate log.
- Server-owned per-user D1 snapshot with optimistic concurrency, no client-supplied balances. Migration: `population_runs`.
- City observer panel, selectable resident figures and service-point rings. Figures show simulation position snapshots, not continuous walking animation.
- Autoplay advances 15 simulated minutes every five visible-page seconds. Manual one-hour and one-day steps. Reload restores the snapshot; closing the page pauses advancement.

## Verification

- TypeScript check and production build passed.
- `node --import tsx scripts/check-population.ts`: 30 simulated days, conserved cash, nonnegative integer finances, bounded needs and memory, executable paper trades, deterministic replay, immutable input.
- Independent read-only audit verified the compare-and-swap update and 30-day invariants.
- Full browser interaction and deployed database verification remain to be performed. Do not claim visual or predictive validation from these unit checks.

## Explicit limitations / next short stage

1. Replace snapshot movement with continuous, collision-tested pedestrian paths and walking animation. Residents currently use a small core waypoint network, not full-city navmesh.
2. Bind service points to completed bank/hospital interiors, capacity, queues and opening hours; avoid claiming markers are finished buildings.
3. Add household budgets, richer nutrition, rent, illness dynamics, job schedules and employer accounts. A shift started before 17:00 may finish after 17:00.
4. Introduce an interchangeable decision-policy adapter and a clearly licensed persona importer; calibrate against real observations before making predictive claims.
5. Align simulation, weather and business clocks; add explicit offline advancement if wanted.

Prior unfinished housing/road/subcenter work is preserved. This stage does not claim completion of the deferred diverse housing asset generator.
