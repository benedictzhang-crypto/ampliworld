from __future__ import annotations

import argparse
import json
from pathlib import Path

from .calibration import CalibrationState
from .evaluation import evaluate_result
from .io import load_events, write_json
from .models import AssetSignal
from .news import fetch_google_news, fetch_world_news
from .pipeline import SimulationPipeline
from .world import WorldMemory


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PERSONAS = ROOT / "vendor/MatrAIx-Persona-8B/persona/datasets/matraix-persona-dev-sample"
DEFAULT_UNIVERSE = ROOT / "config/universe.json"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="ampliworld")
    sub = parser.add_subparsers(dest="command", required=True)
    run = sub.add_parser("run", help="Run an event through the population and portfolio pipeline")
    run.add_argument("event", type=Path)
    run.add_argument("--personas", type=Path, default=DEFAULT_PERSONAS)
    run.add_argument("--universe", type=Path, default=DEFAULT_UNIVERSE)
    run.add_argument("--sample-size", type=int, default=200)
    run.add_argument("--seed", type=int, default=7)
    run.add_argument("--output", type=Path, default=Path("runs/latest.json"))
    run.add_argument("--calibration", type=Path, default=Path("data/cache/calibration.json"))

    news = sub.add_parser("news", help="Fetch a Google News RSS evidence batch")
    news.add_argument("query")
    news.add_argument("--limit", type=int, default=10)
    news.add_argument("--output", type=Path, default=Path("runs/news.json"))

    world_news = sub.add_parser("world-news", help="Fetch evidence across the full world-news ontology")
    world_news.add_argument("--limit-per-domain", type=int, default=5)
    world_news.add_argument("--output", type=Path, default=Path("runs/world-news.json"))

    evaluate = sub.add_parser("evaluate", help="Compare a simulation with realized asset returns")
    evaluate.add_argument("simulation", type=Path)
    evaluate.add_argument("realized_returns", type=Path)
    evaluate.add_argument("--output", type=Path, default=Path("runs/evaluation.json"))

    calibrate = sub.add_parser("calibrate", help="Update model calibration after returns are realized")
    calibrate.add_argument("simulation", type=Path)
    calibrate.add_argument("realized_returns", type=Path)
    calibrate.add_argument("--state", type=Path, default=Path("data/cache/calibration.json"))

    day = sub.add_parser("day", help="Advance the persistent world by one daily turn")
    day.add_argument("events", type=Path, help="JSON event or event bundle for the day")
    day.add_argument("--memory", type=Path, default=Path("data/cache/world_memory.json"))
    day.add_argument("--universe", type=Path, default=DEFAULT_UNIVERSE)
    day.add_argument("--personas", type=Path, default=DEFAULT_PERSONAS)
    day.add_argument("--calibration", type=Path, default=Path("data/cache/calibration.json"))
    day.add_argument("--sample-size", type=int, default=200)
    day.add_argument("--seed", type=int, default=7)
    day.add_argument("--output", type=Path, default=Path("runs/world-latest.json"))
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.command == "news":
        items = fetch_google_news(args.query, args.limit)
        write_json(args.output, items)
        print(json.dumps(items, indent=2))
        return
    if args.command == "world-news":
        items = fetch_world_news(args.limit_per_domain)
        write_json(args.output, items)
        print(json.dumps(items, indent=2))
        return
    if args.command == "evaluate":
        simulation = json.loads(args.simulation.read_text(encoding="utf-8"))
        realized = json.loads(args.realized_returns.read_text(encoding="utf-8"))
        evaluation = evaluate_result(simulation, realized).to_dict()
        write_json(args.output, evaluation)
        print(json.dumps(evaluation, indent=2))
        return
    if args.command == "calibrate":
        simulation = json.loads(args.simulation.read_text(encoding="utf-8"))
        realized = json.loads(args.realized_returns.read_text(encoding="utf-8"))
        signals = [AssetSignal(**signal) for signal in simulation.get("signals", [])]
        state = CalibrationState.load(args.state)
        state.update(signals, realized)
        state.save(args.state)
        print(json.dumps(state.to_dict(), indent=2))
        return
    if args.command == "day":
        memory = WorldMemory.load(args.memory)
        accepted = memory.advance(load_events(args.events))
        memory.save(args.memory)
        pipeline = SimulationPipeline(args.personas, args.universe, args.calibration)
        result = pipeline.run_event(memory.composite_event(), args.sample_size, args.seed)
        payload = result.to_dict()
        payload["world_memory"] = {
            "turn": memory.turn,
            "as_of": memory.as_of,
            "new_events": len(accepted),
            "remembered_events": len(memory.recent_events),
            "domain_pressure": memory.domain_pressure,
            "sector_pressure": memory.sector_pressure,
        }
        write_json(args.output, payload)
        print(json.dumps(payload, indent=2))
        return
    pipeline = SimulationPipeline(args.personas, args.universe, args.calibration)
    result = pipeline.run_to_file(args.event, args.output, args.sample_size, args.seed)
    print(json.dumps(result.to_dict(), indent=2))


if __name__ == "__main__":
    main()
