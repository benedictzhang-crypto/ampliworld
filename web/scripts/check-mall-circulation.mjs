import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createMallLifts,MALL_LEVELS,LIFT_STATIC_SOLIDS,requestMallLift,stepMallLift,liftContains} from '../app/world-client/mall-circulation.ts';
import {districtGroundHeight} from '../app/district/registry.ts';
const read=p=>JSON.parse(readFileSync(new URL('../public/assets/3d/ampliworld/'+p,import.meta.url),'utf8'));
const mall=read('GC-MALL-002/mall-manifest.json'),garage=read('GC-MALL-GARAGE-002/garage-manifest.json');
assert.equal(mall.shops.length,108);assert.equal(mall.parking.bays,0);assert.equal(mall.parking.truckLoadingBays,3);
const cars=createMallLifts();assert.equal(cars.length,16);
for(const c of cars){
 for(const level of MALL_LEVELS){
  assert.ok(requestMallLift(c,level.y));
  for(let n=0;n<1600;n++){
   const prior=c.y;stepMallLift(c,1/60);
   assert.ok(Math.abs(c.y-prior)<=4/60+.00001,'Cab moves continuously, no floor teleport');
   if(c.phase==='moving')assert.equal(c.door,0,'Doors closed during movement');
   if(c.phase==='idle')break;
  }
  assert.equal(c.phase,'idle');assert.equal(c.y,level.y);assert.equal(c.door,1);
  assert.ok(liftContains(c,c.x,c.z,c.y));
  assert.ok(c.doors[MALL_LEVELS.indexOf(level)].isEmpty(),'Arrival opens correct landing door');
  c.doors.forEach((b,i)=>{if(i!==MALL_LEVELS.indexOf(level))assert.ok(!b.isEmpty(),'Other landings sealed');});
 }
}
for(const g of mall.liftGroups)for(const slab of mall.surfaces){
 assert.ok(!(slab.min[0]<g.max[0]&&slab.max[0]>g.min[0]&&slab.min[1]<g.max[1]&&slab.max[1]>g.min[1]),'No slab crosses lift well');
}
for(const level of MALL_LEVELS.filter(l=>l.y>=0)){
 assert.equal(districtGroundHeight(-76,-148,level.y),level.y,'Mall corridor floor correct');
}
for(const level of garage.levels)assert.equal(new Set(garage.bays.filter(b=>b.level===level.id).map(b=>b.zone)).size,4);
assert.ok(LIFT_STATIC_SOLIDS.length>0);
console.log(JSON.stringify({status:'passed',elevators:16,stopsEach:11,continuousCabRoutes:176,shops:108,garageBays:800,fourZonesEachLevel:true}));
