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
import {MIN_HOURLY_WAGE_CENTS,hourlyWageCents} from '../app/life-sim/housing-finance';
let world = createLifeWorld();
assert.equal(world.residents.length, CENSUS_SIZE);
assert.equal(hourlyWageCents(300_000,.85),MIN_HOURLY_WAGE_CENTS);
assert.equal(hourlyWageCents(0),0);
assert(world.residents.every(r=>r.wage===0||r.wage>=MIN_HOURLY_WAGE_CENTS));
assert(world.residents.every(r=>!r.employment||r.employment.monthlyGrossCents===r.wage*176));
const initialWellbeing={
  happiness:world.residents.reduce((sum,r)=>sum+r.happiness,0)/CENSUS_SIZE,
  mood:world.residents.reduce((sum,r)=>sum+r.wellbeing!.mood,0)/CENSUS_SIZE,
  stress:world.residents.reduce((sum,r)=>sum+r.stress,0)/CENSUS_SIZE,
  mental:world.residents.reduce((sum,r)=>sum+r.wellbeing!.mentalHealth,0)/CENSUS_SIZE,
};
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
const underpaid=old.residents.find(r=>r.wage>0)!;
underpaid.wage=1_700;
underpaid.employment!.monthlyGrossCents=underpaid.wage*176;
old.residents[0].profile!.debt=123456;
const upgraded=upgradeLifeWorld(old);
assert.equal(upgraded.residents.find(r=>r.id===underpaid.id)!.wage,MIN_HOURLY_WAGE_CENTS);
assert.equal(upgraded.residents.find(r=>r.id===underpaid.id)!.employment!.monthlyGrossCents,MIN_HOURLY_WAGE_CENTS*176);
for(const before of old.residents){const after=upgraded.residents.find(r=>r.id===before.id)!;
  assert.equal(after.identity?.id,before.id);
  for(const key of ['cash','savings','shares'] as const)assert.equal(after[key],before[key]);
  assert.equal(after.profile!.debt,before.profile!.debt);
  assert.equal(after.profile!.nonCashAssets,before.profile!.nonCashAssets);}
assert.deepEqual(upgradeLifeWorld(upgraded),upgraded,'idempotent identity upgrade');
assert.deepEqual(JSON.parse(JSON.stringify(upgraded)),upgraded,'all resident states survive JSON persistence');
assert.equal(new Set(upgraded.residents.map(r=>r.id)).size,CENSUS_SIZE);
const byIndex=new Map(world.residents.map(r=>[r.identity!.index,r]));
const byId=new Map(world.residents.map(r=>[r.id,r]));
for(const r of world.residents){
  assert.equal(r.id,r.identity!.id);
  for(const link of r.identity!.relations){const other=byIndex.get(link.index)!;assert(other);assert(other.identity!.relations.some(x=>x.index===r.identity!.index));}
  if(r.identity!.age<18){assert.equal(r.wage,0);assert.equal(r.identity!.guardianIds.length,2);for(const id of r.identity!.guardianIds)assert(byId.get(id)!.identity!.age>=18);}
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
    assert(r.adaptivePolicy);
    assert(r.adaptivePolicy.experiences.length<=8);
    assert(r.adaptivePolicy.riskMultiplier>=.4&&r.adaptivePolicy.riskMultiplier<=1.1);
    assert(r.wellbeing);
    if(r.payroll){
      assert.equal(r.payroll.earnedCents,r.payroll.paidCents+r.payroll.outstandingCents);
      assert.equal(Object.values(r.payroll.arrearsByPayerCents).reduce((sum,amount)=>sum+amount,0),r.payroll.outstandingCents);
    }
    for(const value of [r.wellbeing.mood,r.wellbeing.mentalHealth,r.wellbeing.eventPressure])assert(Number.isFinite(value)&&value>=0&&value<=100);
    if(r.identity!.age<18){assert.equal(r.shares,0);assert(!r.memory.some(m=>m.text.includes('工资到账')||m.text.includes('买入虚拟')));}
    assert(Number.isFinite(r.x) && Number.isFinite(r.z));
    maxShares = Math.max(maxShares, r.shares);
  }
  executions = world.daily.reduce((n, d) => n + d.trades, 0);
}
const finalWellbeing={
  happiness:world.residents.reduce((sum,r)=>sum+r.happiness,0)/CENSUS_SIZE,
  mood:world.residents.reduce((sum,r)=>sum+r.wellbeing!.mood,0)/CENSUS_SIZE,
  stress:world.residents.reduce((sum,r)=>sum+r.stress,0)/CENSUS_SIZE,
  mental:world.residents.reduce((sum,r)=>sum+r.wellbeing!.mentalHealth,0)/CENSUS_SIZE,
};
for(const key of ['happiness','mood','stress','mental'] as const)assert(Math.abs(finalWellbeing[key]-initialWellbeing[key])<5,`${key} should not drift without an external event`);
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
    initialWellbeing:Object.fromEntries(Object.entries(initialWellbeing).map(([key,value])=>[key,Number(value.toFixed(2))])),
    finalWellbeing:Object.fromEntries(Object.entries(finalWellbeing).map(([key,value])=>[key,Number(value.toFixed(2))])),
  }),
);
