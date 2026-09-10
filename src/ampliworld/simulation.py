from __future__ import annotations

import math
from collections import defaultdict

from .models import AgentResponse, Asset, AssetSignal, Event, Persona, Scenario


DEFAULT_SCENARIOS = (
    Scenario("base", 0.55, 1.00, 1.00),
    Scenario("amplification", 0.25, 1.45, 1.35),
    Scenario("disconfirmation", 0.20, -0.40, 1.20),
)


def _clip(value: float, low: float = -1.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def simulate_agents(
    event: Event,
    personas: list[Persona],
    scenarios: tuple[Scenario, ...] = DEFAULT_SCENARIOS,
) -> list[AgentResponse]:
    responses: list[AgentResponse] = []
    event_force = _clip(event.sentiment * (0.35 + 0.65 * abs(event.surprise)))
    for scenario in scenarios:
        for persona in personas:
            attention = persona.news_attention * event.confidence
            belief = _clip(event_force * scenario.response_multiplier * attention)
            consumption = _clip(belief * persona.consumption_sensitivity)
            trading_activation = 0.15 + 0.55 * persona.market_familiarity + 0.30 * persona.risk_tolerance
            order_intent = _clip(belief * trading_activation)
            conviction = _clip(abs(belief) * (0.55 + 0.45 * persona.risk_tolerance), 0.0, 1.0)
            responses.append(
                AgentResponse(
                    persona_id=persona.persona_id,
                    scenario=scenario.name,
                    population_weight=persona.weight * scenario.probability,
                    consumption_delta=consumption,
                    belief_delta=belief,
                    order_intent=order_intent,
                    conviction=conviction,
                )
            )
    return responses


def aggregate_signals(
    event: Event,
    assets: list[Asset],
    responses: list[AgentResponse],
    scenarios: tuple[Scenario, ...] = DEFAULT_SCENARIOS,
) -> list[AssetSignal]:
    totals = defaultdict(float)
    weight_total = sum(r.population_weight for r in responses) or 1.0
    for response in responses:
        totals["consumption"] += response.consumption_delta * response.population_weight
        totals["belief"] += response.belief_delta * response.population_weight
        totals["orders"] += response.order_intent * response.population_weight
        totals["conviction"] += response.conviction * response.population_weight
    means = {key: value / weight_total for key, value in totals.items()}
    scenario_variance = sum(
        s.probability * (s.response_multiplier - 1.0) ** 2 for s in scenarios
    )

    signals: list[AssetSignal] = []
    for asset in assets:
        sector_force = event.affected_sectors.get(asset.sector, 0.0)
        if sector_force == 0:
            continue
        behavioral_force = 0.48 * means["consumption"] + 0.22 * means["belief"] + 0.30 * means["orders"]
        # Convert the behavioral response into a one-session return estimate.
        # Asset volatility is annualized, so uncertainty is scaled to one day.
        expected_return = 0.04 * sector_force * asset.event_beta * behavioral_force
        uncertainty = (asset.volatility / math.sqrt(252.0)) * math.sqrt(0.15 + scenario_variance)
        score = expected_return / max(uncertainty, 1e-6)
        confidence = _clip(event.confidence * means["conviction"] * asset.liquidity, 0.0, 1.0)
        signals.append(
            AssetSignal(
                symbol=asset.symbol,
                sector=asset.sector,
                expected_return=expected_return,
                uncertainty=uncertainty,
                score=score,
                confidence=confidence,
                evidence={
                    "sector_force": sector_force,
                    "consumption": means["consumption"],
                    "belief": means["belief"],
                    "order_intent": means["orders"],
                },
            )
        )
    return sorted(signals, key=lambda item: abs(item.score), reverse=True)
