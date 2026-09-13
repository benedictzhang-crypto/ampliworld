import assert from 'node:assert/strict';
import { HOUSING_PLAN,HOUSING_INSTANCES,HOUSING_MODELS,housingPoint,housingGroundHeight,housingColliders } from '../app/world-client/housing-registry.ts';
const allOpen=new Set(HOUSING_PLAN.placements.map(p=>p.id));
let lobbies=0,markets=0,gates=0,sealedTowers=0;
const blocked=(cs,x,z,y)=>cs.some(c=>x>c.min[0]-.35&&x<c.max[0]+.35&&z>c.min[2]-.35&&z<c.max[2]+.35&&c.max[1]>y+.29&&c.min[1]<y+2.08);
for(const p of HOUSING_PLAN.placements){
 const cs=housingColliders(p.x,p.z,allOpen);
 for(const i of HOUSING_INSTANCES.filter(i=>i.parcel===p.id&&i.model<=8)){
  const m=HOUSING_MODELS[i.model],door=m.entrance;
  let hit=false,previous;
  for(let z=m.bounds.max[2]+2;z>=door[1]-1.5;z-=.2){const q=housingPoint(p,i.localX+door[0],i.localZ+z),y=housingGroundHeight(...q,.215)??.035;
    if(previous!==undefined)assert.ok(Math.abs(y-previous)<=.29,'No unwalkable floor step');previous=y;
    if(blocked(cs,...q,y)){hit=true;break;}
  }
  if(i.model===6||i.model===7){assert.ok(hit,'Declared sealed tower must stay solid');sealedTowers++;}
  else{assert.ok(!hit,'Entry blocked: '+i.id);i.model===8?markets++:lobbies++;}
 }
 if(p.retainExistingFootprints)continue;
 for(let z=p.depth/2+8;z>=p.depth/2-8;z-=.2){const q=housingPoint(p,0,z),y=housingGroundHeight(...q,.215)??.035;assert.ok(!blocked(cs,...q,y),'Open gate passage: '+p.id);}
 gates++;
}
assert.equal(markets,15);assert.equal(sealedTowers,11);
console.log(JSON.stringify({status:'passed',openLobbies:lobbies,supermarkets:markets,openGatePassages:gates,sealedTowers,bodyRadius:.35,bodyHeight:2.08,stepHeight:.29}));
