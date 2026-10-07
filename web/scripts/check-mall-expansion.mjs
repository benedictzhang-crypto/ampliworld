import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {districtGroundHeight} from '../app/district/registry.ts';
import {cinemaGroundHeight} from '../app/world-client/mall-cinema-surface.ts';
import {TOUR_DESTINATIONS} from '../app/world-client/tour-destinations.ts';
import {createMallLifts,requestMallLift,stepMallLift,liftContains} from '../app/world-client/mall-circulation.ts';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const spatial=read('../app/world-client/mall-spatial-plan.json');
const base='../public/assets/3d/ampliworld/';
const shell=read(base+'GC-MALL-002/mall-manifest.json');
const fit=read(base+'GC-MALL-FITOUT-001/fitout-manifest.json');
const leisure=read(base+'GC-MALL-LEISURE-001/leisure-manifest.json');
const garage=read(base+'GC-MALL-GARAGE-002/garage-manifest.json');
assert.deepEqual(shell.mainBuildingFootprint,[380,170]);
for(const f of spatial.floors)for(const x of [f.id==='L6'?-121:-150,150])assert.equal(districtGroundHeight(x,-168,f.y),f.y);
for(const x of [-140,140])assert.equal(districtGroundHeight(x,-168,-7.2),-7.2,'B1 wings have a real support floor');
assert.equal(garage.levels[0].structuralClearance,6.8);
assert.equal(garage.bays.length,800,'Expansion preserves existing parking inventory');
assert.equal(leisure.arcade.machines.length,24);
assert.equal(new Set(leisure.arcade.machines.map(m=>m.kind)).size,8);
assert.equal(leisure.cinema.halls.length,5);
const blocked=(list,x,y,z)=>list.some(b=>x>b.min[0]-.32&&x<b.max[0]+.32&&z>b.min[2]-.32&&z<b.max[2]+.32&&b.max[1]>y+.29&&b.min[1]<y+2.08);
for(const hall of leisure.cinema.halls){
  assert.ok(hall.min[0]>=-190&&hall.max[0]<=190&&hall.min[2]>=-85&&hall.max[2]<=85);
  assert.ok(hall.max[1]<spatial.roofY,'Auditorium fits below the actual roof');
  assert.equal(hall.seats,216);
  const z=(hall.min[2]+hall.max[2])/2;let y=spatial.floors[5].y;
  for(let x=-121;x>=-179;x-=.1){
    const next=cinemaGroundHeight(x,z,y)??spatial.floors[5].y;
    assert.ok(Math.abs(next-y)<.201,'Auditorium rises in walkable steps, not jumps');y=next;
    assert.equal(blocked([...shell.colliders,...leisure.colliders],x,y,z),false,'Auditorium entry/centre aisle clear at '+x);
  }
}
for(const s of fit.boutiques.filter(s=>['hotpot','grill','sushi','noodles','steak','cantonese','seafood'].includes(s.id))){
  for(let z=67;z<79;z+=.2)assert.equal(blocked([...shell.colliders,...fit.colliders],s.centerX-5.1,s.floorY,z),false,s.label+' has a real kitchen rear exit');
}
for(const f of spatial.floors){
  for(let z=-83;z>=-93.3;z-=.2)assert.equal(blocked([...shell.colliders,...leisure.colliders],60,f.y,z),false,'Freight bridge is clear');
}
for(let z=-82;z>=-93.3;z-=.2)assert.equal(blocked([...garage.colliders,...leisure.colliders],60,-7.2,z),false,'B1 rear freight approach clear');
const freight=createMallLifts().find(c=>c.id==='SERVICE');
assert.ok(freight.width>=6&&freight.depth>=8);assert.ok(liftContains(freight,freight.x+2,freight.z,.17));
for(const l of freight.levels){assert.ok(requestMallLift(freight,l.y));for(let n=0;n<2000;n++){stepMallLift(freight,1/60);if(freight.phase==='idle')break;}assert.equal(freight.y,l.y);}
for(const id of ['GC-MALL-ARCADE','GC-MALL-CINEMA-1','GC-MALL-CINEMA-5','GC-MALL-SERVICE','GC-MALL-B1-WEST','GC-MALL-B1-EAST'])assert.ok(TOUR_DESTINATIONS.some(d=>d.id===id),id+' discoverable');
for(const p of ['GC-MALL-LEISURE-001/leisure.glb','GC-MALL-FITOUT-001/fitout.glb'])assert.ok(readFileSync(new URL(base+p,import.meta.url)).length<25*1024*1024,'Hosted asset under size cap');
console.log('PASS: 380×170m shell, full B1, 5 physical auditoria / 1080 seats, 24 cabinets / 8 types, kitchen exits and B1-to-roof freight route.');
