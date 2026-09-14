import assert from 'node:assert/strict';
import {createLifeWorld,advanceLifeWorld,moneyTotal} from '../app/life-sim/engine';
import {deliberate,validateDecision} from '../app/life-sim/deliberation';
async function main(){const w=createLifeWorld(),r=w.residents.find(r=>r.identity!.age>25)!;r.health=r.water=r.nutrition=80;const before=moneyTotal(w);
 assert.throws(()=>validateDecision(w,r.id,{action:'leisure',businessId:'invented',reason:'x'}));
 const cash=r.cash;r.cash=0;assert.throws(()=>validateDecision(w,r.id,{action:'leisure',businessId:'GC-NAILS-01',reason:'x'}));r.cash=cash;
 await assert.rejects(()=>deliberate(w,r.id,{}),/尚未配置/);
 await deliberate(w,r.id,{token:'test-only',model:'mock'},(async()=>Response.json({choices:[{message:{content:JSON.stringify({action:'home',reason:'先回家休息'})}}]})) as typeof fetch);
 const next=advanceLifeWorld(w,15);assert.equal(moneyTotal(next),before);assert.equal(next.deliberation!.status,'executing');
 assert.equal(Object.values(w.businesses!).filter(b=>b.type==='salon').length,3);const all=Object.values(w.businesses!).flatMap(b=>b.staffIds);assert.equal(all.length,new Set(all).size);
 console.log({passed:true,inference:'mock-only; live provider unconfigured',regionalBusinesses:5});}
main().catch(e=>{console.error(e);process.exitCode=1;});
