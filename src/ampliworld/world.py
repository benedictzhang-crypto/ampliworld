from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from datetime import date
from pathlib import Path

from .models import Event


DOMAIN_KEYWORDS = {
    "war_security": ("war", "attack", "missile", "military", "ceasefire", "conflict", "sanction"),
    "politics_policy": ("election", "president", "congress", "tariff", "regulation", "government"),
    "finance_credit": ("bank", "rates", "inflation", "credit", "recession", "fed", "earnings"),
    "currency": ("currency", "dollar", "yen", "euro", "forex", "exchange rate"),
    "food_dining": ("food", "restaurant", "coffee", "beverage", "crop", "dining"),
    "travel": ("travel", "flight", "airline", "hotel", "tourism", "booking"),
    "fashion_luxury": ("fashion", "apparel", "luxury", "handbag", "jewelry", "clothing"),
    "electronics": ("smartphone", "chip", "electronics", "computer", "device", "semiconductor"),
    "energy_commodities": ("oil", "gas", "gold", "uranium", "copper", "mining", "commodity"),
    "health": ("drug", "vaccine", "hospital", "health", "biotech", "disease"),
    "technology": ("ai", "software", "cloud", "robot", "cyber", "data center"),
    "climate_disaster": ("hurricane", "earthquake", "flood", "wildfire", "drought", "climate"),
}

DOMAIN_TO_SECTORS = {
    "war_security": {"defense": 0.8, "energy": 0.35, "gold": 0.30, "travel": -0.45},
    "politics_policy": {"broad_market": 0.25, "defense": 0.15, "critical_minerals": 0.15},
    "finance_credit": {"broad_market": 0.65, "banks": 0.55, "gold": 0.20},
    "currency": {"currency": 0.85, "travel": 0.18, "luxury": 0.18},
    "food_dining": {"restaurants": 0.70, "consumer_staples": 0.55, "agriculture": 0.35},
    "travel": {"travel": 0.85, "energy": 0.15, "restaurants": 0.15},
    "fashion_luxury": {"apparel": 0.65, "luxury": 0.80, "consumer_discretionary": 0.35},
    "electronics": {"consumer_technology": 0.75, "semiconductors": 0.70},
    "energy_commodities": {"energy": 0.65, "gold": 0.35, "uranium": 0.35, "critical_minerals": 0.35},
    "health": {"healthcare": 0.75, "biotechnology": 0.60},
    "technology": {"consumer_technology": 0.45, "semiconductors": 0.55, "software": 0.65},
    "climate_disaster": {"insurance": -0.50, "agriculture": -0.40, "energy": 0.20},
}


def classify_domains(headline: str, summary: str = "", channels: tuple[str, ...] = ()) -> tuple[str, ...]:
    text = f"{headline} {summary}".lower()
    matched = {domain for domain, words in DOMAIN_KEYWORDS.items() if any(word in text for word in words)}
    for channel in channels:
        if channel in DOMAIN_KEYWORDS:
            matched.add(channel)
    return tuple(sorted(matched or {"general_world"}))


def infer_sector_impacts(event: Event) -> dict[str, float]:
    impacts = dict(event.affected_sectors)
    direction = 1.0 if event.sentiment >= 0 else -1.0
    for domain in classify_domains(event.headline, event.summary, event.channels):
        for sector, loading in DOMAIN_TO_SECTORS.get(domain, {}).items():
            inferred = direction * loading
            impacts[sector] = max(-1.0, min(1.0, impacts.get(sector, 0.0) + inferred * 0.35))
    return impacts


@dataclass
class WorldMemory:
    turn: int = 0
    as_of: str = ""
    domain_pressure: dict[str, float] = field(default_factory=dict)
    sector_pressure: dict[str, float] = field(default_factory=dict)
    seen_event_ids: list[str] = field(default_factory=list)
    recent_events: list[dict[str, str | float | list[str]]] = field(default_factory=list)

    @classmethod
    def load(cls, path: Path) -> "WorldMemory":
        if not path.exists():
            return cls()
        return cls(**json.loads(path.read_text(encoding="utf-8")))

    def advance(self, events: list[Event], as_of: str | None = None, decay: float = 0.92) -> list[Event]:
        self.turn += 1
        self.as_of = as_of or date.today().isoformat()
        self.domain_pressure = {k: v * decay for k, v in self.domain_pressure.items() if abs(v * decay) > 1e-4}
        self.sector_pressure = {k: v * decay for k, v in self.sector_pressure.items() if abs(v * decay) > 1e-4}
        accepted = []
        seen = set(self.seen_event_ids)
        for event in events:
            identity = event.event_id or hashlib.sha256(f"{event.timestamp}|{event.headline}".encode()).hexdigest()[:16]
            if identity in seen:
                continue
            seen.add(identity)
            accepted.append(event)
            impulse = event.sentiment * (0.25 + 0.75 * abs(event.surprise)) * event.confidence
            domains = classify_domains(event.headline, event.summary, event.channels)
            for domain in domains:
                self.domain_pressure[domain] = max(-3.0, min(3.0, self.domain_pressure.get(domain, 0.0) + impulse))
            for sector, exposure in infer_sector_impacts(event).items():
                self.sector_pressure[sector] = max(
                    -3.0, min(3.0, self.sector_pressure.get(sector, 0.0) + abs(impulse) * exposure)
                )
            self.recent_events.append(
                {"event_id": identity, "timestamp": event.timestamp, "headline": event.headline,
                 "impulse": impulse, "domains": list(domains)}
            )
        self.seen_event_ids = list(seen)[-5000:]
        self.recent_events = self.recent_events[-200:]
        return accepted

    def composite_event(self) -> Event:
        sectors = {k: max(-1.0, min(1.0, v)) for k, v in self.sector_pressure.items() if abs(v) >= 0.01}
        total = sum(self.domain_pressure.values())
        sentiment = max(-1.0, min(1.0, total / max(1.0, len(self.domain_pressure))))
        return Event(
            event_id=f"world-turn-{self.turn}", timestamp=self.as_of,
            headline=f"AmpliWorld persistent world state, turn {self.turn}",
            summary="A decayed state composed from current and prior world events.",
            sentiment=sentiment, surprise=min(1.0, sum(abs(v) for v in self.domain_pressure.values()) / 5.0),
            confidence=min(0.90, 0.45 + 0.02 * len(self.recent_events)), affected_sectors=sectors,
            channels=tuple(sorted(self.domain_pressure)), source_urls=(),
        )

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(asdict(self), indent=2, ensure_ascii=False), encoding="utf-8")
