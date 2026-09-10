from __future__ import annotations

from pathlib import Path

from .calibration import CalibrationState
from .io import load_event, load_universe, write_json
from .models import Event, SimulationResult
from .personas import load_personas
from .portfolio import construct_portfolio
from .simulation import DEFAULT_SCENARIOS, aggregate_signals, simulate_agents


class SimulationPipeline:
    def __init__(self, persona_dir: Path, universe_path: Path, calibration_path: Path | None = None):
        self.persona_dir = persona_dir
        self.universe_path = universe_path
        self.calibration_path = calibration_path

    def run(self, event_path: Path, sample_size: int = 200, seed: int = 7) -> SimulationResult:
        return self.run_event(load_event(event_path), sample_size, seed)

    def run_event(self, event: Event, sample_size: int = 200, seed: int = 7) -> SimulationResult:
        personas = load_personas(self.persona_dir, sample_size=sample_size, seed=seed)
        assets = load_universe(self.universe_path)
        responses = simulate_agents(event, personas)
        signals = aggregate_signals(event, assets, responses)
        calibration = CalibrationState.load(self.calibration_path) if self.calibration_path else CalibrationState()
        if calibration.observations:
            signals = [
                type(signal)(
                    **{
                        **signal.__dict__,
                        "expected_return": signal.expected_return * calibration.return_scale,
                        "confidence": min(1.0, signal.confidence * calibration.confidence_scale),
                    }
                )
                for signal in signals
            ]
        portfolio = construct_portfolio(signals, assets)
        return SimulationResult(
            event=event,
            personas_used=len(personas),
            effective_population=sum(p.weight for p in personas),
            scenario_probabilities={s.name: s.probability for s in DEFAULT_SCENARIOS},
            signals=signals,
            portfolio=portfolio,
            diagnostics={
                "agent_responses": len(responses),
                "calibration_observations": calibration.observations,
                "gross_exposure": sum(position.weight for position in portfolio),
            },
        )

    def run_to_file(self, event_path: Path, output_path: Path, sample_size: int = 200, seed: int = 7) -> SimulationResult:
        result = self.run(event_path, sample_size=sample_size, seed=seed)
        write_json(output_path, result.to_dict())
        return result
