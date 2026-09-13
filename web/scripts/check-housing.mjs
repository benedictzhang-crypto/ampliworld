import assert from 'node:assert/strict';
import {HOUSING_PLAN,HOUSING_INSTANCES,HOUSING_MODELS,HOUSING_BOXES,housingGroundHeight,housingPoint,housingColliders} from '../app/world-client/housing-registry.ts';
const count={};for(const p of HOUSING_PLAN.placements)count[p.type]=(count[p.type]||0)+1;
assert.deepEqual(count,{ultra:2,high:5,mixedVilla:2,largeDetached:2,lowerMiddle:15,low:25});
for(const p of HOUSING_PLAN.placements){
 const items=HOUSING_INSTANCES.filter(i=>i.parcel===p.id),homes=items.filter(i=>i.role==='home');
 assert.equal(homes.length,p.retainExistingFootprints?0:p.buildingCount);
 if(p.type==='low')assert.ok(p.buildingCount>=20&&p.buildingCount<=35);
 if(p.type==='lowerMiddle'){assert.ok(p.buildingCount>=15&&p.buildingCount<=20);assert.equal(items.filter(i=>i.model===8).length,1);}
 if(p.type==='high'){assert.ok(p.buildingCount>=6&&p.buildingCount<=10);assert.ok(items.some(i=>i.model===9)&&items.some(i=>i.model===10));}
 if(p.type==='ultra'){assert.ok(p.buildingCount>=4&&p.buildingCount<=6);assert.ok(items.some(i=>i.model===11));}
 for(let j=0;j<items.length;j++){
  const i=items[j],b=HOUSING_MODELS[i.model].bounds;
  assert.ok(Math.abs(i.localX)+Math.max(Math.abs(b.min[0]),b.max[0])<p.width/2);
  assert.ok(Math.abs(i.localZ)+Math.max(Math.abs(b.min[2]),b.max[2])<p.depth/2);
  for(let k=j+1;k<items.length;k++){const t=items[k],c=HOUSING_MODELS[t.model].bounds;assert.ok(!(i.localX+b.min[0]<t.localX+c.max[0]&&i.localX+b.max[0]>t.localX+c.min[0]&&i.localZ+b.min[2]<t.localZ+c.max[2]&&i.localZ+b.max[2]>t.localZ+c.min[2]),'No model overlap: '+p.id);}
 }
 if(!p.retainExistingFootprints){const q=housingPoint(p,0,0);assert.equal(housingGroundHeight(q[0],q[1],.18),.18);}
}
const p=HOUSING_PLAN.placements.find(p=>p.type==='high');
const closed=housingColliders(p.x,p.z,new Set()),open=housingColliders(p.x,p.z,new Set([p.id]));
assert.equal(closed.length,open.length+1,'Gate collider really opens');
assert.equal(HOUSING_BOXES.filter(b=>b.kind==='gate').length,11);
console.log(JSON.stringify({status:'passed',counts:count,instances:HOUSING_INSTANCES.length,apartmentCommunities:47,newVillaCommunities:4,retainedRiverVillas:60,allModelFootprintsClear:true,interactiveGates:11}));
