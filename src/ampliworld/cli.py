from __future__ import annotations

import argparse
import json
from pathlib import Path

from .evaluation import evaluate_result
from .io import write_json
from .news import fetch_google_news
from .pipeline import SimulationPipeline


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

    news = sub.add_parser("news", help="Fetch a Google News RSS evidence batch")
    news.add_argument("query")
    news.add_argument("--limit", type=int, default=10)
    news.add_argument("--output", type=Path, default=Path("runs/news.json"))

    evaluate = sub.add_parser("evaluate", help="Compare a simulation with realized asset returns")
    evaluate.add_argument("simulation", type=Path)
    evaluate.add_argument("realized_returns", type=Path)
    evaluate.add_argument("--output", type=Path, default=Path("runs/evaluation.json"))
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.command == "news":
        items = fetch_google_news(args.query, args.limit)
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
    pipeline = SimulationPipeline(args.personas, args.universe)
    result = pipeline.run_to_file(args.event, args.output, args.sample_size, args.seed)
    print(json.dumps(result.to_dict(), indent=2))


if __name__ == "__main__":
    main()
