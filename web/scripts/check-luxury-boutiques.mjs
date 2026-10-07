import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {boutiqueStairHeight} from '../app/world-client/mall-luxury-circulation.ts';
import {districtGroundHeight} from '../app/district/registry.ts';
import {createMallLifts,requestMallLift,stepMallLift} from '../app/world-client/mall-circulation.ts';
import {TOUR_DESTINATIONS} from '../app/world-client/tour-destinations.ts';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const plan=read('../app/world-client/mall-luxury-plan.json');
const spatial=read('../app/world-client/mall-spatial-plan.json');
const shell=read('../public/assets/3d/ampliworld/GC-MALL-002/mall-manifest.json');
const fit=read('../public/assets/3d/ampliworld/GC-MALL-FITOUT-001/fitout-manifest.json');
assert.deepEqual(new Set(fit.boutiques.map(s=>s.id)),new Set(plan.shops.map(s=>s.id)));
assert.equal(plan.shops.length,19);
assert.equal(fit.boutiques.length,20);
assert.deepEqual(fit.boutiques.find(s=>s.id==='tiffany').inventory,['smile arc necklaces','solitaire rings','diamond stud earrings']);
for(const room of fit.boutiques.filter(r=>r.level)){
  assert.ok(room.inventory.length>=3,room.label+' has modeled contents');
  const d=TOUR_DESTINATIONS.find(d=>d.id==='GC-MALL-'+room.id.toUpperCase());
  assert.ok(d,room.label+' has a map entry');
  assert.equal(d.arrivalY,room.floorY,'Map carries the exact floor, not only X/Z');
  assert.equal(districtGroundHeight(d.arrivalX,d.arrivalZ,d.arrivalY),room.floorY,'Arrival has a real supporting floor');
}
for(const h of [plan.stairs,plan.lift])for(const slab of shell.surfaces.filter(p=>p.level==='L2'))
  assert.ok(!(slab.min[0]<h.max[0]&&slab.max[0]>h.min[0]&&slab.min[1]<h.max[1]&&slab.max[1]>h.min[1]),'Duplex opening has no hidden floor');
const s=plan.stairs,x=(s.min[0]+s.max[0])/2;
let y=s.low;
for(let z=s.min[1];z<=s.max[1];z+=.1){const next=boutiqueStairHeight(x,z,y);assert.ok(next!==undefined);assert.ok(Math.abs(next-y)<.201);y=next;assert.equal(districtGroundHeight(x,z-188,y),y);}
assert.ok(Math.abs(y-s.high)<.001);
for(let z=s.max[1];z>=s.min[1];z-=.1){const next=boutiqueStairHeight(x,z,y);assert.ok(next!==undefined);assert.ok(Math.abs(next-y)<.201);y=next;}
assert.equal(boutiqueStairHeight(x,65,spatial.floors[2].y),undefined,'Higher floors must not snap to L1 staircase');
for(const room of fit.boutiques){
  assert.ok(shell.shops.some(s=>s.label===room.label&&s.floorY===room.floorY),'Directory matches actual boutique');
  for(const c of fit.colliders){
    const blocked=room.centerX>c.min[0]-.35&&room.centerX<c.max[0]+.35&&55>c.min[2]-.35&&55<c.max[2]+.35&&c.max[1]>room.floorY+.29&&c.min[1]<room.floorY+2.08;
    assert.equal(blocked,false,'Arrival apron is clear');
  }
}
const lift=createMallLifts().find(c=>c.id==='GUCCI');
assert.ok(requestMallLift(lift,s.high));for(let i=0;i<600;i++)stepMallLift(lift,1/60);assert.equal(lift.y,s.high);assert.equal(lift.phase,'idle');
assert.equal(requestMallLift(lift,spatial.roofY),false);
assert.equal(fit.restrooms.length,6);
for(const wc of fit.restrooms){
  const floor=spatial.floors.find(f=>f.id===wc.level);
  assert.equal(wc.floorY,floor.y);
  assert.equal(wc.privateCubicles,4);assert.equal(wc.washbasins,6);
  const d=TOUR_DESTINATIONS.find(d=>d.name===`Restrooms · ${wc.level}`);
  assert.ok(d);assert.equal(d.arrivalY,wc.floorY);
  assert.equal(districtGroundHeight(d.arrivalX,d.arrivalZ,d.arrivalY),wc.floorY);
  for(let z=-48;z>=-67;z-=.25){
    assert.equal(fit.colliders.some(b=>wc.centerX>b.min[0]-.35&&wc.centerX<b.max[0]+.35&&z>b.min[2]-.35&&z<b.max[2]+.35&&b.max[1]>wc.floorY+.29&&b.min[1]<wc.floorY+2.08),false,'Restroom entrance and central aisle remain clear');
  }
}
console.log('PASS: 19 distinct businesses / 20 interiors, Tiffany merchandise, 14 floor-aware shop arrivals, duplex openings, stairs and private lift.');
