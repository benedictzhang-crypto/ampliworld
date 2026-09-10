from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class Event:
    event_id: str
    timestamp: str
    headline: str
    summary: str
    sentiment: float
    surprise: float
    confidence: float
    affected_sectors: dict[str, float]
    channels: tuple[str, ...] = ()
    source_urls: tuple[str, ...] = ()


@dataclass(frozen=True)
class Persona:
    persona_id: str
    weight: float
    dimensions: dict[str, str]
    risk_tolerance: float
    market_familiarity: float
    consumption_sensitivity: float
    news_attention: float


@dataclass(frozen=True)
class Scenario:
    name: str
    probability: float
    response_multiplier: float
    volatility_multiplier: float


@dataclass(frozen=True)
class AgentResponse:
    persona_id: str
    scenario: str
    population_weight: float
    consumption_delta: float
    belief_delta: float
    order_intent: float
    conviction: float


@dataclass(frozen=True)
class Asset:
    symbol: str
    sector: str
    event_beta: float
    volatility: float
    liquidity: float
    max_weight: float


@dataclass(frozen=True)
class AssetSignal:
    symbol: str
    sector: str
    expected_return: float
    uncertainty: float
    score: float
    confidence: float
    evidence: dict[str, float]


@dataclass(frozen=True)
class Position:
    symbol: str
    side: str
    weight: float
    expected_return: float
    confidence: float
    stop_loss: float
    take_profit: float
    invalidation: str


@dataclass
class SimulationResult:
    event: Event
    personas_used: int
    effective_population: float
    scenario_probabilities: dict[str, float]
    signals: list[AssetSignal] = field(default_factory=list)
    portfolio: list[Position] = field(default_factory=list)
    diagnostics: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

