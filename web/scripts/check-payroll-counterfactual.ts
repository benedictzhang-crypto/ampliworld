import assert from 'node:assert/strict';
import {
  advanceLifeWorld,
  createLifeWorld,
  moneyTotal,
  type LifeWorld,
} from '../app/life-sim/engine';
import { populationWellbeingScores } from '../app/life-sim/wellbeing';

const origin = createLifeWorld();
const openingMoney = moneyTotal(origin);
let cashConstrained = origin;
let publicBackstop: LifeWorld = {
  ...structuredClone(origin),
  payrollPolicy: 'public-backstop',
};
const checkpoints = [];

function report(world: LifeWorld) {
  const wellbeing = populationWellbeingScores(world.residents);
  const wages = world.residents.reduce(
    (totals, resident) => {
      totals.earned += resident.payroll?.earnedCents || 0;
      totals.paid += resident.payroll?.paidCents || 0;
      totals.outstanding += resident.payroll?.outstandingCents || 0;
      return totals;
    },
    { earned: 0, paid: 0, outstanding: 0 },
  );
  const round = (value: number) => Number(value.toFixed(2));
  return {
    happiness: round(wellbeing.happiness),
    mood: round(wellbeing.mood),
    stress: round(100 - wellbeing.stressManagement),
    mentalHealth: round(wellbeing.mentalHealth),
    financialSecurity: round(wellbeing.financialSecurity),
    wages,
    payrollFulfillment: round(
      wages.earned ? (wages.paid / wages.earned) * 100 : 100,
    ),
    publicSupportCents: world.publicPayrollSupportCents || 0,
    treasuryCents: world.treasury,
  };
}

for (let day = 1; day <= 30; day++) {
  cashConstrained = advanceLifeWorld(cashConstrained, 1440);
  publicBackstop = advanceLifeWorld(publicBackstop, 1440);
  assert.equal(moneyTotal(cashConstrained), openingMoney);
  assert.equal(moneyTotal(publicBackstop), openingMoney);
  if ([1, 7, 30].includes(day))
    checkpoints.push({
      day,
      cashConstrained: report(cashConstrained),
      publicBackstop: report(publicBackstop),
    });
}
assert.equal(cashConstrained.residents.length, publicBackstop.residents.length);
assert((publicBackstop.publicPayrollSupportCents || 0) > 0);
console.log(
  JSON.stringify({
    passed: true,
    residents: origin.residents.length,
    days: 30,
    comparison:
      'Same opening world; private payroll shortfalls draw from a finite public account in the intervention. No money is created.',
    checkpoints,
    conservedCents: openingMoney,
  }),
);
