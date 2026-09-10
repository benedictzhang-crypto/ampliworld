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

## Repository status

The upstream simulation framework is available under `vendor/MatrAIx-Persona-8B`
as a Git submodule. AmpliWorld's financial behavior layer, market arena, signal
engine and evaluation suite live in this repository.

## Upstream setup

```bash
git submodule update --init --recursive
```

The full Persona 1M dataset is intentionally excluded from Git history. A
download command and data contract will be included with the financial persona
adapter.

## Project principles

- Simulation produces hypotheses, not ground truth.
- Every portfolio decision must retain its event, cohort and scenario lineage.
- Probability calibration matters before profit attribution.
- Backtests include transaction costs and reject look-ahead data.
- Live execution remains separated from the open research environment.

## Organization

AmpliWorld is developed by AmpliAlpha, Inc.
