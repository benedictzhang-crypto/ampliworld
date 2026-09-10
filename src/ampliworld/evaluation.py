from __future__ import annotations

import math
from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class Evaluation:
    observations: int
    directional_accuracy: float
    mean_absolute_error: float
    rank_information_coefficient: float
    simulated_portfolio_return: float

    def to_dict(self) -> dict[str, float | int]:
        return asdict(self)


def _ranks(values: list[float]) -> list[float]:
    order = sorted(range(len(values)), key=values.__getitem__)
    ranks = [0.0] * len(values)
    index = 0
    while index < len(order):
        end = index + 1
        while end < len(order) and values[order[end]] == values[order[index]]:
            end += 1
        average_rank = (index + end - 1) / 2.0
        for position in range(index, end):
            ranks[order[position]] = average_rank
        index = end
    return ranks


def _correlation(left: list[float], right: list[float]) -> float:
    if len(left) < 2:
        return 0.0
    left_mean = sum(left) / len(left)
    right_mean = sum(right) / len(right)
    numerator = sum((a - left_mean) * (b - right_mean) for a, b in zip(left, right))
    denominator = math.sqrt(sum((a - left_mean) ** 2 for a in left)) * math.sqrt(
        sum((b - right_mean) ** 2 for b in right)
    )
    return numerator / denominator if denominator else 0.0


def evaluate_result(result: dict, realized_returns: dict[str, float]) -> Evaluation:
    signals = [s for s in result.get("signals", []) if s["symbol"] in realized_returns]
    predicted = [float(s["expected_return"]) for s in signals]
    realized = [float(realized_returns[s["symbol"]]) for s in signals]
    observations = len(signals)
    directional = (
        sum((p >= 0) == (r >= 0) for p, r in zip(predicted, realized)) / observations
        if observations
        else 0.0
    )
    mae = sum(abs(p - r) for p, r in zip(predicted, realized)) / observations if observations else 0.0
    rank_ic = _correlation(_ranks(predicted), _ranks(realized)) if observations else 0.0
    portfolio_return = 0.0
    for position in result.get("portfolio", []):
        if position["symbol"] in realized_returns:
            direction = 1.0 if position["side"] == "long" else -1.0
            portfolio_return += direction * float(position["weight"]) * realized_returns[position["symbol"]]
    return Evaluation(observations, directional, mae, rank_ic, portfolio_return)
