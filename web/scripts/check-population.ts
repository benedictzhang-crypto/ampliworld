import assert from 'node:assert/strict';
import {
  advanceLifeWorld,
  createLifeWorld,
  moneyTotal,
  upgradeLifeWorld,
  residentNetWorth,
} from '../app/life-sim/engine';
import { WEALTH_REFERENCE } from '../app/life-sim/society';
let world = createLifeWorld();
assert.equal(world.residents.length, 100);
assert.equal(
  world.residents.reduce((n, r) => n + residentNetWorth(r, world.minute), 0),
  WEALTH_REFERENCE.scenarioTotalCents,
);
for (const group of WEALTH_REFERENCE.groups) {
  const members = world.residents.filter((r) => r.profile?.cohort === group.id);
  assert.equal(members.length, group.people);
  assert.equal(
    members.reduce((n, r) => n + residentNetWorth(r, world.minute), 0),
    (WEALTH_REFERENCE.scenarioTotalCents * group.share) / 100,
  );
}
const legacy = structuredClone(world);
delete legacy.societyVersion;
legacy.residents = legacy.residents.slice(0, 48);
legacy.treasury = 1000;
legacy.openingMoney = moneyTotal(legacy);
const migrated = upgradeLifeWorld(legacy);
assert.equal(moneyTotal(migrated), legacy.openingMoney);
assert(migrated.treasury >= 0);
assert.equal(migrated.residents[0].cash, legacy.residents[0].cash);
assert.equal(migrated.residents.length, 100);
const student = world.residents.find(
  (r) => r.profile?.occupation === 'student',
)!;
assert.equal(student.wage, 0);
const original = JSON.stringify(world);
const first = advanceLifeWorld(world, 15);
assert.equal(JSON.stringify(world), original, 'must not mutate input');
assert.deepEqual(first, advanceLifeWorld(world, 15), 'deterministic replay');
let executions = 0,
  maxShares = 0;
for (let day = 0; day < 30; day++) {
  world = advanceLifeWorld(world, 1440);
  assert.equal(moneyTotal(world), world.openingMoney, 'cash conservation');
  for (const r of world.residents) {
    for (const value of [r.cash, r.savings, r.shares, r.wage])
      assert(
        Number.isSafeInteger(value) && value >= 0,
        'nonnegative integer financial state',
      );
    for (const value of [r.health, r.water, r.nutrition, r.energy, r.happiness])
      assert(
        Number.isFinite(value) && value >= 0 && value <= 100,
        'need bounds',
      );
    assert(r.worked <= 480);
    assert(r.memory.length <= 32);
    assert(Number.isFinite(r.x) && Number.isFinite(r.z));
    maxShares = Math.max(maxShares, r.shares);
  }
  executions = world.daily.reduce((n, d) => n + d.trades, 0);
}
assert(
  executions > 0 && maxShares > 0,
  'trades must execute, not just count visits',
);
assert.throws(() => advanceLifeWorld(world, 100), 'reject unsupported step');
console.log(
  JSON.stringify({
    passed: true,
    residents: world.residents.length,
    days: 30,
    executions,
    maxShares,
    conservedCents: moneyTotal(world),
  }),
);
