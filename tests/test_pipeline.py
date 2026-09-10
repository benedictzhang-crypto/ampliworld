import unittest
from pathlib import Path

from ampliworld.evaluation import evaluate_result
from ampliworld.calibration import CalibrationState
from ampliworld.io import load_event, load_universe
from ampliworld.personas import load_personas
from ampliworld.pipeline import SimulationPipeline
from ampliworld.portfolio import construct_portfolio
from ampliworld.simulation import aggregate_signals, simulate_agents


ROOT = Path(__file__).resolve().parents[1]
PERSONAS = ROOT / "vendor/MatrAIx-Persona-8B/persona/datasets/matraix-persona-dev-sample"
EVENT = ROOT / "examples/events/ev_demand_shock.json"
UNIVERSE = ROOT / "config/universe.json"


class PipelineTests(unittest.TestCase):
    def test_persona_adapter_financializes_upstream_records(self):
        personas = load_personas(PERSONAS, sample_size=12, seed=3)
        self.assertEqual(len(personas), 12)
        self.assertEqual(round(sum(p.weight for p in personas)), 8_300_000_000)
        self.assertTrue(all(0 <= p.risk_tolerance <= 1 for p in personas))

    def test_event_reaches_ranked_signals_and_constrained_portfolio(self):
        event = load_event(EVENT)
        personas = load_personas(PERSONAS, sample_size=20, seed=5)
        assets = load_universe(UNIVERSE)
        responses = simulate_agents(event, personas)
        signals = aggregate_signals(event, assets, responses)
        portfolio = construct_portfolio(signals, assets)
        self.assertEqual(len(responses), 60)
        self.assertIn(signals[0].symbol, {"AAPL", "NVDA"})
        self.assertTrue(portfolio)
        self.assertLessEqual(sum(position.weight for position in portfolio), 1.000001)
        self.assertTrue(all(position.stop_loss < position.take_profit for position in portfolio))
        self.assertTrue(all(position.stop_loss < 0.10 for position in portfolio))

    def test_pipeline_is_deterministic_for_fixed_seed(self):
        pipeline = SimulationPipeline(PERSONAS, UNIVERSE)
        first = pipeline.run(EVENT, sample_size=25, seed=11).to_dict()
        second = pipeline.run(EVENT, sample_size=25, seed=11).to_dict()
        self.assertEqual(first, second)

    def test_evaluation_measures_direction_rank_and_portfolio(self):
        result = SimulationPipeline(PERSONAS, UNIVERSE).run(EVENT, sample_size=20, seed=5)
        realized = {"AAPL": 0.011, "NVDA": 0.018, "MCD": -0.004, "KO": 0.002}
        evaluation = evaluate_result(result.to_dict(), realized)
        self.assertEqual(evaluation.observations, 4)
        self.assertTrue(0.0 <= evaluation.directional_accuracy <= 1.0)
        self.assertTrue(-1.0 <= evaluation.rank_information_coefficient <= 1.0)

    def test_calibration_updates_from_realized_returns(self):
        result = SimulationPipeline(PERSONAS, UNIVERSE).run(EVENT, sample_size=20, seed=5)
        state = CalibrationState()
        state.update(result.signals, {"AAPL": 0.011, "NVDA": 0.018})
        self.assertEqual(state.observations, 2)
        self.assertGreater(state.return_scale, 1.0)
        self.assertEqual(state.directional_accuracy, 1.0)


if __name__ == "__main__":
    unittest.main()
