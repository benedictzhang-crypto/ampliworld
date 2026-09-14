import assert from 'node:assert/strict';
import {createLifeWorld,advanceLifeWorld,upgradeLifeWorld,moneyTotal} from '../app/life-sim/engine';
import {encodeSnapshot,decodeSnapshot} from '../app/life-sim/snapshot-codec';
import catalog from '../app/life-sim/occupancy-catalog.json';
async function main(){
let w=createLifeWorld();
assert.equal(w.residents.length,3000);assert.equal(Object.keys(w.housing!).length,1000);
const units=new Set<string>(),owners=new Set<string>(),occupancy=new Map<string,number>();
for(const h of Object.values(w.housing!)){
 assert(!units.has(h.unitId));units.add(h.unitId);assert.equal(h.residentIds.length,3);
 occupancy.set(h.buildingId,(occupancy.get(h.buildingId)||0)+1);
 assert(h.loanBalanceCents<=h.propertyValueCents);assert(h.monthlyMortgageCents<=h.affordabilityLimitCents);
 for(const id of h.residentIds){const r=w.residents.find(r=>r.id===id)!;assert.equal(r.dwellingId,h.familyId);assert.equal(r.identity!.familyId,h.familyId);}
 if(h.ownerResidentId){assert(!owners.has(h.ownerResidentId));owners.add(h.ownerResidentId);const r=w.residents.find(r=>r.id===h.ownerResidentId)!;assert(r.identity!.age>=18);assert(h.downPaymentCents<=r.profile!.nonCashAssets-r.profile!.debt);}
}
for(const [id,count] of occupancy)assert(count<=catalog.homes.find(h=>h.id===id)!.unitCapacity);
assert(owners.size>0);assert.equal(new Set(Object.values(w.housing!).map(h=>h.group)).size,53);
const old=structuredClone(w);delete old.housing;delete old.residencyVersion;delete old.censusVersion;old.residents=old.residents.slice(0,300);old.openingMoney=moneyTotal(old);
const migrated=upgradeLifeWorld(old);assert.equal(moneyTotal(migrated),old.openingMoney);
for(const r of old.residents){const n=migrated.residents.find(n=>n.id===r.id)!;assert.equal(n.cash,r.cash);assert.equal(n.savings,r.savings);assert.deepEqual(n.profile,r.profile);}
for(let day=0;day<30;day++)w=advanceLifeWorld(w,1440);
const encoded=await encodeSnapshot(w);assert(encoded.length<1900000);assert.deepEqual(await decodeSnapshot(encoded),JSON.parse(JSON.stringify(w)));
console.log(JSON.stringify({people:3000,households:1000,ownerHouseholds:owners.size,occupiedBuildings:occupancy.size,compressedBytes:encoded.length,daysTested:30,passed:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
