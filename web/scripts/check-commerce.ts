import assert from 'node:assert/strict';
import {createLifeWorld,advanceLifeWorld,upgradeLifeWorld,moneyTotal} from '../app/life-sim/engine';
import {encodeSnapshot} from '../app/life-sim/snapshot-codec';
async function main(){
let w=createLifeWorld();const opening=moneyTotal(w),shops=Object.values(w.businesses!).filter(b=>b.type==='retail-shop');
assert.equal(shops.length,108);for(const b of shops)assert(b.staffIds.length>=2&&b.staffIds.length<=6);
const ids=Object.values(w.businesses!).flatMap(b=>b.staffIds);assert.equal(ids.length,new Set(ids).size);assert.equal(ids.length,1920);assert(Object.values(w.businesses!).every(b=>b.staffIds.length>0));
for(const b of Object.values(w.businesses!)){for(const id of b.staffIds){const r=w.residents.find(r=>r.id===id)!;assert(r.identity!.age>=18);assert.equal(r.employment!.placeId,b.id);}if(b.type==='restaurant')assert(b.staffIds.includes(b.ownerId!));}
const old=structuredClone(w);delete old.commerceVersion;delete old.businesses;old.treasury+=Object.values(w.businesses!).reduce((n,b)=>n+b.cash,0);
const upgraded=upgradeLifeWorld(old);assert.equal(moneyTotal(upgraded),moneyTotal(old));
for(const r of old.residents){const a=upgraded.residents.find(a=>a.id===r.id)!;assert.equal(a.cash,r.cash);assert.equal(a.savings,r.savings);assert.equal(a.home.toString(),r.home.toString());assert.equal(a.profile!.nonCashAssets,r.profile!.nonCashAssets);assert.equal(a.profile!.debt,r.profile!.debt);}
for(let d=0;d<30;d++)w=advanceLifeWorld(w,1440);
assert.equal(moneyTotal(w),opening);const encoded=await encodeSnapshot(w);
assert(Object.values(w.businesses!).some(b=>b.type==='restaurant'&&b.revenue>0));
console.log({passed:true,shops:shops.length,staff:ids.length,compressed:encoded.length,restaurants:Object.values(w.businesses!).filter(b=>b.type==='restaurant').map(b=>({name:b.name,visits:b.visits,revenue:b.revenue}))});
}
main().catch(e=>{console.error(e);process.exitCode=1;});
