import assert from 'node:assert/strict';
import {advanceLifeWorld,createLifeWorld,moneyTotal} from '../app/life-sim/engine';
let world=createLifeWorld();
const original=JSON.stringify(world);
const first=advanceLifeWorld(world,15);
assert.equal(JSON.stringify(world),original,'must not mutate input');
assert.deepEqual(first,advanceLifeWorld(world,15),'deterministic replay');
let executions=0,maxShares=0;
for(let day=0;day<30;day++){
  world=advanceLifeWorld(world,1440);
  assert.equal(moneyTotal(world),world.openingMoney,'cash conservation');
  for(const r of world.residents){
    for(const value of [r.cash,r.savings,r.shares,r.wage])assert(Number.isSafeInteger(value)&&value>=0,'nonnegative integer financial state');
    for(const value of [r.health,r.water,r.nutrition,r.energy,r.happiness])assert(Number.isFinite(value)&&value>=0&&value<=100,'need bounds');
    assert(r.worked<=480);assert(r.memory.length<=32);assert(Number.isFinite(r.x)&&Number.isFinite(r.z));maxShares=Math.max(maxShares,r.shares);
  }
  executions=world.daily.reduce((n,d)=>n+d.trades,0);
}
assert(executions>0&&maxShares>0,'trades must execute, not just count visits');
assert.throws(()=>advanceLifeWorld(world,100),'reject unsupported step');
console.log(JSON.stringify({passed:true,residents:world.residents.length,days:30,executions,maxShares,conservedCents:moneyTotal(world)}));
