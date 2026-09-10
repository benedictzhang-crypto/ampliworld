from __future__ import annotations

from .models import Asset, AssetSignal, Position


def construct_portfolio(
    signals: list[AssetSignal],
    assets: list[Asset],
    gross_limit: float = 1.0,
    min_confidence: float = 0.04,
    max_positions: int = 8,
) -> list[Position]:
    by_symbol = {asset.symbol: asset for asset in assets}
    eligible = [s for s in signals if s.confidence >= min_confidence and abs(s.score) > 1e-8][:max_positions]
    if not eligible:
        return []
    denominator = sum(abs(signal.score) * by_symbol[signal.symbol].liquidity for signal in eligible)
    raw = []
    for signal in eligible:
        asset = by_symbol[signal.symbol]
        proposed = gross_limit * abs(signal.score) * asset.liquidity / denominator
        raw.append((signal, min(proposed, asset.max_weight)))
    gross = sum(weight for _, weight in raw) or 1.0
    scale = min(1.0, gross_limit / gross)
    positions = []
    for signal, raw_weight in raw:
        weight = raw_weight * scale
        uncertainty = max(signal.uncertainty, 0.005)
        positions.append(
            Position(
                symbol=signal.symbol,
                side="long" if signal.expected_return >= 0 else "short",
                weight=weight,
                expected_return=signal.expected_return,
                confidence=signal.confidence,
                stop_loss=1.25 * uncertainty,
                take_profit=2.25 * uncertainty,
                invalidation=f"Event thesis weakens or {signal.sector} response reverses",
            )
        )
    return positions

