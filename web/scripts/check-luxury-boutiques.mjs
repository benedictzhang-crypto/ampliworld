import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boutiqueStairHeight} from '../app/world-client/mall-luxury-circulation.ts';
import {districtGroundHeight} from '../app/district/registry.ts';
import {createMallLifts,requestMallLift,stepMallLift} from '../app/world-client/mall-circulation.ts';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const plan=read('../app/world-client/mall-luxury-plan.json');
const shell=read('../public/assets/3d/ampliworld/GC-MALL-002/mall-manifest.json');
const fit=read('../public/assets/3d/ampliworld/GC-MALL-FITOUT-001/fitout-manifest.json');
assert.deepEqual(new Set(fit.boutiques.map(s=>s.id)),new Set(plan.shops.map(s=>s.id)));
for(const h of [plan.stairs,plan.lift])for(const slab of shell.surfaces.filter(p=>p.level==='L2'))
  assert.ok(!(slab.min[0]<h.max[0]&&slab.max[0]>h.min[0]&&slab.min[1]<h.max[1]&&slab.max[1]>h.min[1]),'Duplex opening has no hidden floor');
const s=plan.stairs,x=(s.min[0]+s.max[0])/2;
let y=s.low;
for(let z=s.min[1];z<=s.max[1];z+=.1){const next=boutiqueStairHeight(x,z,y);assert.ok(next!==undefined);assert.ok(Math.abs(next-y)<.2);y=next;assert.equal(districtGroundHeight(x,z-188,y),y);}
assert.ok(Math.abs(y-s.high)<.001);
for(let z=s.max[1];z>=s.min[1];z-=.1){const next=boutiqueStairHeight(x,z,y);assert.ok(next!==undefined);assert.ok(Math.abs(next-y)<.2);y=next;}
assert.equal(boutiqueStairHeight(x,65,16.08),undefined,'Higher floors must not snap to L1 staircase');
for(const room of fit.boutiques){
  assert.ok(shell.shops.some(s=>s.label===room.label&&s.floorY===room.floorY),'Directory matches actual boutique');
  for(const c of fit.colliders){
    const blocked=room.centerX>c.min[0]-.35&&room.centerX<c.max[0]+.35&&55>c.min[2]-.35&&55<c.max[2]+.35&&c.max[1]>room.floorY+.29&&c.min[1]<room.floorY+2.08;
    assert.equal(blocked,false,'Arrival apron is clear');
  }
}
const lift=createMallLifts().find(c=>c.id==='GUCCI');
assert.ok(requestMallLift(lift,6.48));for(let i=0;i<600;i++)stepMallLift(lift,1/60);assert.equal(lift.y,6.48);assert.equal(lift.phase,'idle');
assert.equal(requestMallLift(lift,31.05),false);
console.log('PASS: five distinct brands, six room interiors, real duplex slab cutouts, bidirectional stair support and restricted private lift.');
