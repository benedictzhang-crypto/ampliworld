# AmpliWorld

AmpliWorld is an open financial world model for event-driven market simulation.
It injects a real-world event into a heterogeneous synthetic population,
simulates consumer and investor responses, maps those responses to listed
assets, and produces a risk-constrained portfolio proposal.

The project uses [MatrAIx Persona 8B](https://github.com/MatrAIx-ai/MatrAIx-Persona-8B)
as an upstream population foundation. Persona 8B describes 8.3 billion persona
records across 1,290 categorical dimensions. AmpliWorld runs tractable,
weighted cohorts rather than one LLM process per person.

## Core loop

1. Ingest news, filings, search interest, sentiment, footfall and spending proxies.
2. Select the population cohorts and market participants exposed to the event.
3. Simulate base, amplification and disconfirmation scenarios.
4. Aggregate demand, belief, order intent, flows and volatility.
5. Rank assets and solve for weights under liquidity, concentration and risk limits.
6. Compare the simulation with realized behavior and recalibrate the agent model.

AmpliWorld treats this loop as a persistent game rather than a stateless batch
prediction. The world advances one turn per day. Prior events decay instead of
disappearing, duplicate stories are ignored, and the next simulation begins from
the political, geopolitical, consumer and market pressures left by earlier turns.

## Repository status

The upstream simulation framework is available under `vendor/MatrAIx-Persona-8B`
as a Git submodule. AmpliWorld's financial behavior layer, market arena, signal
engine and evaluation suite live in this repository.

## Upstream setup

```bash
git submodule update --init --recursive
```

The repository includes the upstream 200-person development sample. The public
Persona 1M dataset is excluded from Git history; download it locally with:

```bash
./scripts/download_persona_1m.sh
```

## Run the research prototype

The first working vertical slice uses deterministic cohort behavior so that the
entire decision path is inspectable and testable. It does not claim that the
synthetic population is already a calibrated market forecast.

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e .
ampliworld run examples/events/ev_demand_shock.json --output runs/demo.json
ampliworld evaluate runs/demo.json examples/realized_returns.json
ampliworld calibrate runs/demo.json examples/realized_returns.json
ampliworld day examples/events/world_day_001.json --output runs/world-day-001.json
ampliworld world-news --limit-per-domain 5 --output runs/world-news.json
```

Each run records the source event, weighted population, scenario probabilities,
asset-level evidence, expected return, uncertainty, confidence, portfolio weight,
stop, take-profit and thesis invalidation condition.
After returns become observable, `calibrate` updates a local state file. Future
`run` calls load that state to rescale expected returns and confidence. This is
the first daily learning loop; richer cohort-level calibration remains planned.

The `day` command accepts a bundle of world events—not only finance. Its initial
ontology covers war and security, politics and policy, credit, currencies, food
and dining, travel, fashion and luxury, electronics, energy and commodities,
health, technology, and climate or disasters. Events update persistent domain
and sector pressures in `data/cache/world_memory.json`; that memory is then
translated into the day's investable world state.

`world-news` searches all twelve initial domains and preserves each headline's
source, timestamp, URL and originating query. This is an evidence collector, not
yet a production-grade event parser: sentiment, surprise, entity resolution and
point-in-time validation must be supplied or modeled before a headline enters a
trading simulation.

## What is real today

- Public Persona 8B source and the 200-person development sample are vendored as
  a pinned submodule.
- The official Persona 1M sample can be downloaded into ignored local storage.
- A reproducible event-to-portfolio pipeline and outcome evaluator run locally.
- Google News RSS can be collected as evidence with `ampliworld news`.

The next research layer is empirical calibration: replace hand-initialized
behavioral priors with measured consumer, attention and market outcomes; enforce
point-in-time data; then evaluate walk-forward performance including costs.

## Project principles

- Simulation produces hypotheses, not ground truth.
- Every portfolio decision must retain its event, cohort and scenario lineage.
- Probability calibration matters before profit attribution.
- Backtests include transaction costs and reject look-ahead data.
- Live execution remains separated from the open research environment.

## Organization

AmpliWorld is developed by AmpliAlpha, Inc.
