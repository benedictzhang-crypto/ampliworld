import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3,Vector3,Ray} from 'three';
import {carBlocked,stepVehicleMotion} from '../app/world-client/vehicle-physics.ts';
import {districtGroundHeight as floor} from '../app/district/registry.ts';
import {GARAGE_COLLIDERS,MALL_GARAGE as garage,parkedGarageBay} from '../app/world-client/mall-garage.ts';
import {findVehicleExit,clipVehicleCamera} from '../app/world-client/vehicle-safety.ts';
import {walkerCameraOffset} from '../app/world-client/walk-camera-profile.ts';
const read=p=>JSON.parse(readFileSync(new URL('../public/assets/3d/ampliworld/'+p,import.meta.url)));
const obstacles=[...GARAGE_COLLIDERS,...read('GC-MALL-002/mall-manifest.json').colliders.map(c=>({...c,min:[c.min[0],c.min[1],c.min[2]-188],max:[c.max[0],c.max[1],c.max[2]-188]})),...read('GC-CBD-CONCOURSE-001/concourse-manifest.json').colliders,...read('GC-CBD-STREET-001/street-manifest.json').colliders,...read('GC-STREET-001/street-manifest.json').colliders].map(c=>new Box3(new Vector3(...c.min),new Vector3(...c.max)));
assert.equal(garage.levels.length,4);assert.equal(garage.bays.length,800);assert.equal(new Set(garage.bays.map(b=>b.id)).size,800);assert.equal(garage.cars.length,96);
for(const level of garage.levels){
 assert.equal(garage.bays.filter(b=>b.level===level.id).length,level.id==='B1'?152:216);
 assert.ok(level.ceilingY-level.floorY>=5.59);assert.ok(level.minimumServicesClearance>=4.8);
 const b=garage.bays.find(b=>b.level===level.id),s={x:b.center[0],z:b.center[2]-188,y:level.floorY,yaw:Math.PI,speed:0};
 assert.equal(floor(s.x,s.z,s.y),s.y);assert.equal(parkedGarageBay(s)?.id,b.id);
 assert.equal(parkedGarageBay({...s,yaw:Math.PI/2}),undefined,'Crosswise car is not parked');
 const exit=findVehicleExit(s,obstacles,floor);assert.ok(exit&&Math.abs(exit.y-level.floorY)<.01,'Exit remains on correct level');
 const target=new Vector3(-50,level.floorY+1.4,-247),eye=new Vector3(-50,5,-240),offset=new Vector3();
 walkerCameraOffset(offset,eye,target,level.floorY,9);eye.copy(target).add(offset);
 assert.ok(Math.abs(eye.y-(level.floorY+2.6))<1e-6);assert.ok(Math.abs(Math.hypot(offset.x,offset.z)-5.5)<1e-6);
 eye.set(-50,10,-247);clipVehicleCamera(eye,target,obstacles,new Ray(),new Vector3(),new Vector3());assert.ok(eye.y<level.ceilingY,'Camera cannot cross upper slab');
}
for(const fps of [20,30,60])for(const x of [117,120.5,124]){
 const s={x,z:-68,y:floor(x,-68,0),yaw:0,speed:0};let frames=0;
 while(s.z>-115&&frames++<fps*20)assert.ok(stepVehicleMotion(s,{throttle:1,steer:0,brake:false},1/fps,obstacles,floor),`Offset ramp entry ${x}/${fps}`);
 assert.ok(s.z<=-115);assert.ok(s.y<-4,'Reached final metre of external slope');
}
for(const level of garage.levels)for(const c of garage.cars.filter(c=>c.level===level.id))assert.ok(carBlocked(c.position[0],c.position[2]-188,obstacles,floor,level.floorY,0),'Parked cars remain physical');
assert.equal(floor(-50,-247,0),.17,'Mall ground floor remains independent');
assert.ok(carBlocked(0,0,[],()=>-5,-5),'Water remains forbidden');
console.log(JSON.stringify({status:'passed',levels:4,bays:800,parkedCars:96,offCentreEntryCases:9,layerAwareParkingAndExits:true,cameraClippedOnEveryLevel:true}));
