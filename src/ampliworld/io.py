from __future__ import annotations

import json
from pathlib import Path

from .models import Asset, Event


def load_event(path: Path) -> Event:
    data = json.loads(path.read_text(encoding="utf-8"))
    return Event(
        event_id=data["event_id"],
        timestamp=data["timestamp"],
        headline=data["headline"],
        summary=data.get("summary", ""),
        sentiment=float(data["sentiment"]),
        surprise=float(data["surprise"]),
        confidence=float(data.get("confidence", 0.5)),
        affected_sectors={k: float(v) for k, v in data["affected_sectors"].items()},
        channels=tuple(data.get("channels", [])),
        source_urls=tuple(data.get("source_urls", [])),
    )


def load_events(path: Path) -> list[Event]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows = payload if isinstance(payload, list) else payload.get("events", [payload])
    events = []
    for row in rows:
        events.append(Event(
            event_id=row["event_id"], timestamp=row["timestamp"], headline=row["headline"],
            summary=row.get("summary", ""), sentiment=float(row["sentiment"]),
            surprise=float(row["surprise"]), confidence=float(row.get("confidence", 0.5)),
            affected_sectors={k: float(v) for k, v in row.get("affected_sectors", {}).items()},
            channels=tuple(row.get("channels", [])), source_urls=tuple(row.get("source_urls", [])),
        ))
    return events


def load_universe(path: Path) -> list[Asset]:
    rows = json.loads(path.read_text(encoding="utf-8"))["assets"]
    return [Asset(**row) for row in rows]


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
