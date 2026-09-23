"""Export a SMALL historical scenario from a local NoobTrade SQLite archive.

Read-only. Emits newline-delimited market snapshots to stdout. The archive is
not certified point-in-time data; this output must not be used as OOS evidence.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path


def export(database: Path, symbols: list[str], days: int) -> list[dict]:
    if not database.is_file() or not 2 <= len(symbols) <= 20 or not 2 <= days <= 60:
        raise ValueError("Expected an existing database, 2–20 symbols and 2–60 days")
    if len(set(symbols)) != len(symbols) or any(not s.isascii() or not s.replace(".", "").isalpha() for s in symbols):
        raise ValueError("Invalid or duplicate stock symbols")
    connection = sqlite3.connect(f"file:{database.resolve()}?mode=ro", uri=True)
    try:
        placeholders = ",".join("?" for _ in symbols)
        rows = connection.execute(
            f"SELECT p.trade_date,s.symbol,p.close,p.created_at FROM daily_prices p "
            f"JOIN symbols s ON s.id=p.symbol_id WHERE s.symbol IN ({placeholders}) "
            f"ORDER BY p.trade_date DESC LIMIT ?",
            [*symbols, days * len(symbols) * 3],
        ).fetchall()
    finally:
        connection.close()
    by_date: dict[str, dict[str, tuple[str, str]]] = {}
    for date, symbol, close, created_at in rows:
        by_date.setdefault(date, {})[symbol] = (str(close), created_at)
    complete = sorted((date for date, values in by_date.items() if set(values) == set(symbols)))[-days:]
    if len(complete) < days:
        raise ValueError(f"Only {len(complete)} dates have every requested symbol")
    snapshots = []
    last_available = datetime.min.replace(tzinfo=timezone.utc)
    for date in complete:
        observed = datetime.fromisoformat(date + "T21:00:00+00:00")
        archive_times = [datetime.fromisoformat(by_date[date][symbol][1]).replace(tzinfo=timezone.utc) for symbol in symbols]
        # Conservative archive availability, NOT original market release time.
        available = max(observed, last_available, *archive_times)
        last_available = available
        snapshots.append(
            {
                "asOf": observed.isoformat().replace("+00:00", "Z"),
                "availableAt": available.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
                "source": "NoobTrade local archive; historical scenario, not PIT verified",
                "quotes": {
                    symbol: int((Decimal(by_date[date][symbol][0]) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
                    for symbol in symbols
                },
            }
        )
    return snapshots


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path)
    parser.add_argument("--symbols", default="AAPL,MSFT,GE,META")
    parser.add_argument("--days", type=int, default=5)
    args = parser.parse_args()
    for snapshot in export(args.database, args.symbols.split(","), args.days):
        print(json.dumps(snapshot, separators=(",", ":")))


if __name__ == "__main__":
    main()
