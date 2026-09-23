"""Read-only provenance/cost audit of a NoobTrade backtest JSON.

This does not rerun the strategy or certify an untouched out-of-sample result.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def audit(path: Path) -> dict:
    data = json.loads(path.read_text(encoding="utf-8"))
    meta, summary = data.get("metadata", {}), data.get("summary", {})
    trades = data.get("trades", [])
    capital = float(meta["initialCapital"])
    if capital <= 0 or not isinstance(trades, list):
        raise ValueError("Invalid capital or trades")
    scenarios = []
    for bps in (0, 5, 10, 20, 50):
        extra_cost = 0.0
        for trade in trades:
            shares = float(trade["shares"])
            entry = shares * float(trade["entryPrice"])
            exit_value = shares * float(trade["exitPrice"])
            extra_cost += (entry + exit_value) * bps / 10_000
        adjusted_pnl = sum(float(t["pnl"]) for t in trades) - extra_cost
        scenarios.append(
            {
                "additional_bps_per_side": bps,
                "estimated_extra_cost": round(extra_cost, 2),
                "closed_trade_pnl_after_extra_cost": round(adjusted_pnl, 2),
                "return_on_initial_capital_pct": round(100 * adjusted_pnl / capital, 4),
            }
        )
    return {
        "source_file": str(path.resolve()),
        "reported_blind_test_trading_days": meta.get("blindTestTradingDays"),
        "reported_transaction_costs": {
            "commission_pct": meta.get("commissionPct"),
            "slippage_pct": meta.get("slippagePct"),
        },
        "reported_max_drawdown_pct": summary.get("maxDrawdownPct"),
        "trades_in_file": len(trades),
        "cost_sensitivity_only_not_a_rebacktest": scenarios,
        "independently_verified": {
            "untouched_2_to_3_year_oos": False,
            "point_in_time_source_and_corporate_actions": False,
            "delisting_and_survivorship_handling": False,
            "turnover_market_impact_and_capacity": False,
        },
        "limitations": "Post-hoc costs do not replay sizing, fills or mark-to-market drawdowns. Blind-test labels and data provenance require independent audit.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path)
    args = parser.parse_args()
    print(json.dumps(audit(args.report), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
