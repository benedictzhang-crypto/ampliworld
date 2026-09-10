from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

from .models import AssetSignal


@dataclass
class CalibrationState:
    return_scale: float = 1.0
    confidence_scale: float = 1.0
    observations: int = 0
    mean_absolute_error: float = 0.0
    directional_accuracy: float = 0.0

    def to_dict(self) -> dict[str, float | int]:
        return asdict(self)

    @classmethod
    def load(cls, path: Path) -> "CalibrationState":
        if not path.exists():
            return cls()
        return cls(**json.loads(path.read_text(encoding="utf-8")))

    def update(self, signals: list[AssetSignal], realized_returns: dict[str, float], learning_rate: float = 0.10) -> None:
        pairs = [(s, realized_returns[s.symbol]) for s in signals if s.symbol in realized_returns]
        if not pairs:
            return
        mae = sum(abs(realized - s.expected_return * self.return_scale) for s, realized in pairs) / len(pairs)
        directional = sum((realized >= 0) == (s.expected_return >= 0) for s, realized in pairs) / len(pairs)
        predicted_abs = sum(abs(s.expected_return) for s, _ in pairs) / len(pairs)
        realized_abs = sum(abs(realized) for _, realized in pairs) / len(pairs)
        target_scale = realized_abs / predicted_abs if predicted_abs > 1e-9 else self.return_scale
        self.return_scale = (1 - learning_rate) * self.return_scale + learning_rate * min(3.0, target_scale)
        self.confidence_scale = (1 - learning_rate) * self.confidence_scale + learning_rate * directional
        total = self.observations + len(pairs)
        self.mean_absolute_error = (self.mean_absolute_error * self.observations + mae * len(pairs)) / total
        self.directional_accuracy = (self.directional_accuracy * self.observations + directional * len(pairs)) / total
        self.observations = total

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.to_dict(), indent=2), encoding="utf-8")
