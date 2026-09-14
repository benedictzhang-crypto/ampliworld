import assert from 'node:assert/strict';
import {
  advanceLifeWorld,
  createLifeWorld,
  moneyTotal,
  upgradeLifeWorld,
  residentNetWorth,
} from '../app/life-sim/engine';
import { WEALTH_REFERENCE } from '../app/life-sim/society';
import {CENSUS_SIZE} from '../app/life-sim/census';
let world = createLifeWorld();
assert.equal(world.residents.length, CENSUS_SIZE);
assert.equal(
  world.residents.reduce((n, r) => n + residentNetWorth(r, world.minute), 0),
  WEALTH_REFERENCE.scenarioTotalCents,
);
for (const group of WEALTH_REFERENCE.groups) {
  const members = world.residents.filter((r) => r.profile?.cohort === group.id);
  assert.equal(members.length, group.people*CENSUS_SIZE/100);
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
assert.equal(migrated.residents.length, CENSUS_SIZE);
const old=structuredClone(world);
old.residents=old.residents.slice(0,100).reverse();
delete old.censusVersion;
for(const r of old.residents){delete r.identity;delete r.bankAccountId;}
old.residents[0].profile!.debt=123456;
const upgraded=upgradeLifeWorld(old);
for(const before of old.residents){const after=upgraded.residents.find(r=>r.id===before.id)!;
  assert.equal(after.identity?.id,before.id);
  for(const key of ['cash','savings','shares'] as const)assert.equal(after[key],before[key]);
  assert.equal(after.profile!.debt,before.profile!.debt);
  assert.equal(after.profile!.nonCashAssets,before.profile!.nonCashAssets);}
assert.deepEqual(upgradeLifeWorld(upgraded),upgraded,'idempotent identity upgrade');
assert.deepEqual(JSON.parse(JSON.stringify(upgraded)),upgraded,'all resident states survive JSON persistence');
assert.equal(new Set(upgraded.residents.map(r=>r.id)).size,CENSUS_SIZE);
for(const r of world.residents){
  assert.equal(r.id,r.identity!.id);
  for(const link of r.identity!.relations){const other=world.residents.find(x=>x.identity!.index===link.index)!;assert(other);assert(other.identity!.relations.some(x=>x.index===r.identity!.index));}
  if(r.identity!.age<18){assert.equal(r.wage,0);assert.equal(r.identity!.guardianIds.length,2);for(const id of r.identity!.guardianIds)assert(world.residents.find(x=>x.id===id)!.identity!.age>=18);}
}
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
    if(r.identity!.age<18){assert.equal(r.shares,0);assert(!r.memory.some(m=>m.text.includes('工资到账')||m.text.includes('买入虚拟')));}
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
