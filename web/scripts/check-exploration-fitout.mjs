import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3,Vector3,Ray} from 'three';
import {WALK_SPEED,SPRINT_SPEED} from '../app/world-client/locomotion.ts';
import {VEHICLE_LIMITS,stepVehicleMotion} from '../app/world-client/vehicle-physics.ts';
const input={throttle:1,steer:0,brake:false};
const car={x:1000,z:1000,y:0,yaw:0,speed:0};
for(let i=0;i<600;i++)stepVehicleMotion(car,input,1/60,[],()=>0);
assert.equal(car.speed,VEHICLE_LIMITS.forward);
assert.equal(Math.round(car.speed*3.6),160);
const wall=new Box3(new Vector3(990,0,car.z-8),new Vector3(1010,3,car.z-7.9));
for(let i=0;i<20;i++)stepVehicleMotion(car,input,.06,[wall],()=>0);
assert.equal(car.speed,0,'High speed still stops before a thin wall');
const garage={x:0,z:-188,y:-7.2,yaw:0,speed:44};
stepVehicleMotion(garage,input,1/60,[],()=>-7.2);
assert.equal(garage.speed,VEHICLE_LIMITS.garage);
assert.equal(WALK_SPEED,8);assert.equal(SPRINT_SPEED,12);
const load=p=>JSON.parse(readFileSync(new URL('../public/assets/3d/ampliworld/'+p,import.meta.url)));
const fit=load('GC-MALL-FITOUT-001/fitout-manifest.json');
const shell=load('GC-MALL-002/mall-manifest.json');
const blocked=(x,z)=>fit.colliders.some(b=>x>b.min[0]-.35&&x<b.max[0]+.35&&z>b.min[2]-.35&&z<b.max[2]+.35&&b.max[1]>.46&&b.min[1]<2.25);
for(let z=104;z>=-34;z-=.25)assert.equal(blocked(0,z),false,'Entrance and central route clear');
for(const z of [-43,43])for(let x=-106;x<=106;x+=.25)assert.equal(blocked(x,z),false,'Gallery cross-route clear');
for(const shop of shell.shops.filter(s=>s.level==='L1'))assert.equal(blocked(shop.door[0],shop.door[2]),false,'Shop doorway clear');
for(const g of shell.liftGroups)for(const b of fit.colliders)assert.ok(!(b.min[0]<g.max[0]&&b.max[0]>g.min[0]&&b.min[2]<g.max[1]&&b.max[2]>g.min[1]),'Lift well clear');
assert.ok(fit.meshes<=12,'Interior draw batches bounded');
assert.ok(fit.triangles<=120000,'Fit-out triangle budget respected');
assert.ok(fit.colliders.length>=30);
assert.equal(new Set(fit.colliders.map(c=>c.id)).size,fit.colliders.length,'Collider identifiers are unique');
for(const shopX of [-54,-33,46,67])for(const side of [-1,1]){
  const ray=new Ray(new Vector3(shopX,1.57,62),new Vector3(side,0,0));
  let nearest=Infinity;
  for(const b of fit.colliders){const hit=ray.intersectBox(new Box3(new Vector3(...b.min),new Vector3(...b.max)),new Vector3());if(hit)nearest=Math.min(nearest,hit.distanceTo(ray.origin));}
  assert.ok(nearest<7.3,'Camera meets the new lining before the old structural wall');
}
assert.equal(fit.boutiques.length,4);
const blockedL2=(x,z)=>fit.colliders.some(b=>x>b.min[0]-.35&&x<b.max[0]+.35&&z>b.min[2]-.35&&z<b.max[2]+.35&&b.max[1]>6.77&&b.min[1]<8.56);
for(let z=-34;z<=34;z+=.25)assert.equal(blockedL2(-53,z),false,'L2 west lounge keeps through route clear');
for(const z of [-43,43])for(let x=-106;x<=106;x+=.25)assert.equal(blockedL2(x,z),false,'L2 gallery clear');
for(const shop of shell.shops.filter(s=>s.level==='L2'))assert.equal(blockedL2(shop.door[0],shop.door[2]),false,'L2 doors clear');
for(const shop of fit.boutiques){
  for(let z=48;z<=72;z+=.25)assert.equal(blocked(shop.centerX,z),false,'Boutique centre aisle remains clear');
}
const glb=readFileSync(new URL('../public/assets/3d/ampliworld/GC-MALL-FITOUT-001/fitout.glb',import.meta.url));
const model=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)));
assert.ok(model.images.length>=6,'Stone, timber and fabric basecolor/normal maps embedded in GLB');
assert.ok(model.materials.filter(m=>m.normalTexture).length>=3);
console.log('PASS: 8/12 m/s exploration, 160 km/h forward cap, 20 km/h garage cap, thin-wall stopping, fit-out doors/galleries/lifts clear.');
