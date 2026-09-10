from __future__ import annotations

import random
from pathlib import Path

from .models import Persona


FAMILIARITY = {
    "none": 0.05,
    "aware": 0.20,
    "familiar": 0.40,
    "proficient": 0.70,
    "expert": 0.95,
}


def _flat_yaml(path: Path) -> tuple[str, dict[str, str]]:
    """Read the flat `dimensions` block used by Persona 8B without PyYAML."""
    persona_id = path.stem.removeprefix("persona_")
    dimensions: dict[str, str] = {}
    in_dimensions = False
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        if raw_line.startswith("persona_id:"):
            persona_id = raw_line.split(":", 1)[1].strip().strip("'\"")
        elif raw_line == "dimensions:":
            in_dimensions = True
        elif in_dimensions and raw_line.startswith("  ") and ":" in raw_line:
            key, value = raw_line.strip().split(":", 1)
            dimensions[key] = value.strip().strip("'\"")
        elif in_dimensions and raw_line and not raw_line.startswith(" "):
            break
    return persona_id, dimensions


def _contains(value: str, token: str) -> bool:
    return token in value.lower()


def financialize(persona_id: str, dimensions: dict[str, str], weight: float) -> Persona:
    risk_text = dimensions.get("risk_tolerance", "")
    if _contains(risk_text, "tolerant"):
        risk = 0.82
    elif _contains(risk_text, "averse") or _contains(risk_text, "cautious"):
        risk = 0.24
    else:
        risk = 0.50

    familiarity = max(
        FAMILIARITY.get(dimensions.get("fam_quantitative_trading", "none").lower(), 0.05),
        FAMILIARITY.get(dimensions.get("fam_corporate_finance", "none").lower(), 0.05),
        FAMILIARITY.get(dimensions.get("fam_accounting", "none").lower(), 0.05),
    )
    income = dimensions.get("socioeconomic_band", "").lower()
    consumption = 0.85 if "low" in income else 0.62 if "middle" in income else 0.42
    motivation = dimensions.get("economic_motivation", "").lower()
    if "price" in motivation or "value" in motivation:
        consumption += 0.12
    media = dimensions.get("media_diet", "").lower()
    attention = 0.75 if "news" in media else 0.55
    if "active" in dimensions.get("linkedin_activity", "").lower():
        attention += 0.08

    return Persona(
        persona_id=persona_id,
        weight=weight,
        dimensions=dimensions,
        risk_tolerance=min(1.0, risk),
        market_familiarity=min(1.0, familiarity),
        consumption_sensitivity=min(1.0, consumption),
        news_attention=min(1.0, attention),
    )


def load_personas(dataset_dir: Path, sample_size: int, seed: int = 7) -> list[Persona]:
    paths = sorted(dataset_dir.glob("persona_*.yaml"))
    if not paths:
        raise FileNotFoundError(f"No Persona 8B YAML files found in {dataset_dir}")
    rng = random.Random(seed)
    chosen = rng.sample(paths, min(sample_size, len(paths)))
    population_weight = 8_300_000_000 / len(chosen)
    result = []
    for path in chosen:
        persona_id, dimensions = _flat_yaml(path)
        result.append(financialize(persona_id, dimensions, population_weight))
    return result

