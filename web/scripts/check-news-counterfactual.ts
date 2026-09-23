import assert from 'node:assert/strict';
import {
  advanceLifeWorld,
  createLifeWorld,
  moneyTotal,
} from '../app/life-sim/engine';
import { applyWorldEvent } from '../app/life-sim/world-events';
import { populationWellbeingScores } from '../app/life-sim/wellbeing';

const base = createLifeWorld();
const treated = applyWorldEvent(base, 'Milk prices rise 20%');
const immediate = populationWellbeingScores(treated.residents);
const controlDay = advanceLifeWorld(base, 1440);
const treatedDay = advanceLifeWorld(treated, 1440);
const control = populationWellbeingScores(controlDay.residents);
const intervention = populationWellbeingScores(treatedDay.residents);
const difference = {
  happiness: intervention.happiness - control.happiness,
  mood: intervention.mood - control.mood,
  stress:
    100 - intervention.stressManagement - (100 - control.stressManagement),
};
assert(
  immediate.happiness < populationWellbeingScores(base.residents).happiness,
);
assert(
  difference.happiness < 0 && difference.mood < 0 && difference.stress > 0,
  'news effects should persist relative to an identical one-day control',
);
assert.equal(
  moneyTotal(controlDay),
  moneyTotal(treatedDay),
  'public information alone cannot create or destroy cash',
);
const round = (value: number) => Number(value.toFixed(2));
console.log(
  JSON.stringify({
    passed: true,
    residents: base.residents.length,
    headline: 'Milk prices rise 20%',
    immediate: {
      happiness: round(immediate.happiness),
      mood: round(immediate.mood),
      stress: round(100 - immediate.stressManagement),
    },
    dayOneControl: {
      happiness: round(control.happiness),
      mood: round(control.mood),
      stress: round(100 - control.stressManagement),
    },
    dayOneTreated: {
      happiness: round(intervention.happiness),
      mood: round(intervention.mood),
      stress: round(100 - intervention.stressManagement),
    },
    treatedMinusControl: Object.fromEntries(
      Object.entries(difference).map(([key, value]) => [key, round(value)]),
    ),
  }),
);
