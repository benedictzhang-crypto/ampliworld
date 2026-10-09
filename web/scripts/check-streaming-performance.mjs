import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3,Vector3} from 'three';
import {SpatialBoxIndex} from '../app/world-client/spatial-box-index.ts';
import {stepVehicleMotion} from '../app/world-client/vehicle-physics.ts';
import {selectMallUnits,admitMallUnits,TENANT_LIMIT} from '../app/world-client/mall-streaming.ts';
const manifest=JSON.parse(readFileSync('public/assets/3d/ampliworld/GC-MALL-TENANTS-001/tenants-manifest.json','utf8'));
for(const unit of manifest.shops){
  const desired=selectMallUnits(manifest.shops,unit.x,unit.floorY+2,unit.z-188);
  assert.ok(desired.includes(unit.id),unit.id+' must load at its own entrance');
  assert.ok(desired.length<=TENANT_LIMIT);
  let current=[];
  for(let i=0;i<TENANT_LIMIT;i++){const next=admitMallUnits(desired,current);assert.ok(next.length<=current.length+1);current=next;}
  assert.deepEqual(new Set(current),new Set(desired));
}
assert.deepEqual(selectMallUnits(manifest.shops,6500,10,13200),[]);
assert.deepEqual(selectMallUnits(manifest.shops,0,10000,0),[]);
assert.deepEqual(admitMallUnits([],['dior']),[]);
let seed=7;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
const boxes=Array.from({length:12000},()=>{const x=random()*20000-10000,z=random()*30000-15000,y=random()*60;return new Box3(new Vector3(x,y,z),new Vector3(x+random()*70,y+4,z+random()*70));});
// Giant slabs take the large-box path; negative and exact cell boundaries count.
boxes.push(new Box3(new Vector3(-10000,-1,-15000),new Vector3(10000,0,15000)),new Box3(new Vector3(-24,2,-24),new Vector3(0,4,0)));
const index=new SpatialBoxIndex(boxes),out=[];
let checked=0;
for(let n=0;n<400;n++){
 const x=n===0?-24:random()*20000-10000,z=n===0?-24:random()*30000-15000,r=4+random()*25;
 const expected=boxes.filter(b=>b.max.x>=x-r&&b.min.x<=x+r&&b.max.z>=z-r&&b.min.z<=z+r);
 const actual=index.query(x-r,z-r,x+r,z+r,out);
 assert.equal(actual,out);assert.equal(new Set(actual).size,actual.length);
 assert.deepEqual(new Set(actual),new Set(expected));checked+=actual.length;
}
console.log('PASS: every shop reachable; six-unit cap; one new mount/tick; distant/overview eviction; 400 broad-phase queries match brute force over',boxes.length,'boxes. Average candidates:',(checked/400).toFixed(1));
const drivingBoxes=Array.from({length:200},(_,i)=>new Box3(new Vector3((i%20)*12-120,0,Math.floor(i/20)*12+300),new Vector3((i%20)*12-118,3,Math.floor(i/20)*12+302)));
const drivingIndex=new SpatialBoxIndex(drivingBoxes),candidates=[];
for(let run=0;run<40;run++){
 const a={x:random()*220-110,z:random()*120+280,y:0,yaw:random()*Math.PI*2,speed:44.4},b={...a};
 for(let frame=0;frame<90;frame++){
  const input={throttle:1,steer:Math.sin(frame/20),brake:false};
  stepVehicleMotion(a,input,.06,drivingBoxes,()=>0);
  stepVehicleMotion(b,input,.06,drivingIndex.query(b.x-8,b.z-8,b.x+8,b.z+8,candidates),()=>0);
  assert.deepEqual(b,a,'Indexed vehicle trajectory must match exhaustive collision tests');
 }
}
console.log('PASS: 3,600 maximum-speed vehicle steps match exhaustive collision trajectories.');
