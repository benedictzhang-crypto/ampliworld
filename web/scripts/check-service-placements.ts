import assert from 'node:assert/strict';
import {statSync} from 'node:fs';
import {CITY_SERVICE_COLLIDERS,CULTURAL_SITES,FORECOURT_PARKING_SITES,MOBILITY_SUPPORT_SITES,MODELED_STOREFRONT_SITES,NEIGHBORHOOD_SITES,SPECIAL_SERVICE_SITES,STREET_SERVICE_SITES,neighborhoodVariant,venueVariant} from '../app/world-client/city-service-buildings';
import housing from '../app/world-client/housing-parcels.json';
import {CIVIC_PLACES} from '../app/world-client/civic-registry';
import {METROPOLITAN_PLACES} from '../app/world-client/metropolitan-registry';
import {riverCenterX,riverHalfWidth} from '../app/world-client/river-profile.mjs';
import {WORLD_SOLID_FOOTPRINTS} from '../app/world-spatial-registry';
import kit from '../public/assets/3d/ampliworld/GC-STREET-SERVICE-KIT-001/manifest.json';
import specialKit from '../public/assets/3d/ampliworld/GC-FITNESS-ARCADE-001/manifest.json';
import mall from '../public/assets/3d/ampliworld/GC-MALL-002/mall-manifest.json';
import {SERVICE_SITES,WATERFRONT_OPERATORS} from '../app/life-sim/city-service-plan';
import neighborhood from '../public/assets/3d/ampliworld/GC-NEIGHBORHOOD-001/manifest.json';
import yachts from '../public/assets/3d/ampliworld/GC-YACHT-FLEET-001/manifest.json';
import marina from '../public/assets/3d/ampliworld/GC-MARINA-001/marina-manifest.json';
import {advanceLifeWorld,createLifeWorld,moneyTotal,upgradeLifeWorld} from '../app/life-sim/engine';
import {RESTAURANT_TIER_PLAN} from '../app/life-sim/city-capacity-standard';

type Box={left:number;right:number;back:number;front:number};
const box=(x:number,z:number):Box=>({left:x-21,right:x+21,back:z-16,front:z+34});
const intersects=(a:Box,b:Box)=>a.left<b.right&&a.right>b.left&&a.back<b.front&&a.front>b.back;
const sites=STREET_SERVICE_SITES.map(site=>({id:site.id,box:box(site.x,site.z)}));
assert.equal(new Set(sites.map(site=>site.id)).size,sites.length);
for(let i=0;i<sites.length;i++){
  const site=sites[i];
  for(let j=i+1;j<sites.length;j++)assert(!intersects(site.box,sites[j].box),`${site.id} overlaps ${sites[j].id}`);
  for(const place of [...CIVIC_PLACES,...METROPOLITAN_PLACES]){
    const bounds=place.manifest.bounds;
    assert(!intersects(site.box,{left:place.x+bounds.min[0],right:place.x+bounds.max[0],back:place.z+bounds.min[2],front:place.z+bounds.max[2]}),`${site.id} overlaps ${place.id}`);
  }
  for(const parcel of housing.placements){
    const c=Math.cos(parcel.angle),s=Math.sin(parcel.angle);
    const cx=(site.box.left+site.box.right)/2-parcel.x;
    const cz=(site.box.back+site.box.front)/2-parcel.z;
    const localX=cx*c-cz*s,localZ=cx*s+cz*c;
    const hx=(site.box.right-site.box.left)/2,hz=(site.box.front-site.box.back)/2;
    assert(Math.abs(localX)>=parcel.width/2+hx*Math.abs(c)+hz*Math.abs(s)||Math.abs(localZ)>=parcel.depth/2+hx*Math.abs(s)+hz*Math.abs(c),`${site.id} overlaps housing parcel ${parcel.id}`);
  }
  for(const solid of WORLD_SOLID_FOOTPRINTS){
    const c=Math.cos(solid.rotationRadians||0),s=Math.sin(solid.rotationRadians||0);
    const halfX=solid.halfExtents[0]*Math.abs(c)+solid.halfExtents[1]*Math.abs(s);
    const halfZ=solid.halfExtents[0]*Math.abs(s)+solid.halfExtents[1]*Math.abs(c);
    assert(!intersects(site.box,{left:solid.center[0]-halfX,right:solid.center[0]+halfX,back:solid.center[1]-halfZ,front:solid.center[1]+halfZ}),`${site.id} overlaps ${solid.id}`);
  }
  for(const z of [site.box.back,(site.box.back+site.box.front)/2,site.box.front])
    assert(Math.abs((site.box.left+site.box.right)/2-riverCenterX(z))>=riverHalfWidth(z)+21,`${site.id} enters the river`);
}
assert(MODELED_STOREFRONT_SITES.length>250);
for(const site of MODELED_STOREFRONT_SITES){
  assert(!CITY_SERVICE_COLLIDERS.some(c=>c.id===`${site.id}/building`),`${site.id} retains a solid-box facade collision`);
  assert(CITY_SERVICE_COLLIDERS.some(c=>c.id===`${site.id}/entry-left`));
}
assert.equal(statSync(new URL('../public/assets/3d/ampliworld/GC-STREET-SERVICE-KIT-001/model.glb',import.meta.url)).size,kit.bytes);
assert.equal(SERVICE_SITES.filter(s=>s.type==='gym').length,10);
assert.equal(SERVICE_SITES.filter(s=>s.type==='arcade').length,2);
assert.equal(SERVICE_SITES.filter(s=>s.type==='gym'&&s.placement==='mall').length,1);
assert.equal(SERVICE_SITES.filter(s=>s.type==='arcade'&&s.placement==='mall').length,1);
assert.equal(SPECIAL_SERVICE_SITES.length,10);
assert.equal(SERVICE_SITES.filter(s=>s.type==='small-restaurant').length,
  RESTAURANT_TIER_PLAN.find(tier=>tier.id==='neighborhood')!.count);
assert.equal(SERVICE_SITES.filter(s=>s.type==='fresh-market').length,24);
assert.equal(SERVICE_SITES.filter(s=>s.type==='tutoring-center').length,18);
assert.equal(SERVICE_SITES.filter(s=>s.type==='children-arts').length,10);
assert.equal(SERVICE_SITES.filter(s=>s.type==='music-school').length,8);
assert.equal(SERVICE_SITES.filter(s=>s.type==='dance-school').length,8);
for(const type of ['small-restaurant','fresh-market','tutoring-center','children-arts','music-school','dance-school']){
  for(const site of SERVICE_SITES.filter(s=>s.type===type)){
    const nearest=Math.min(...housing.placements.map(parcel=>Math.hypot(site.x-parcel.x,site.z-parcel.z)));
    assert(nearest<400,`${site.id} is ${Math.round(nearest)}m from the nearest residential parcel`);
  }
}
assert.equal(CULTURAL_SITES.length,2);
for(const site of CULTURAL_SITES){
  assert(CITY_SERVICE_COLLIDERS.some(c=>c.id===`${site.id}/left-glazing`));
  assert(!CITY_SERVICE_COLLIDERS.some(c=>c.id===`${site.id}/building`));
}
assert.equal(SERVICE_SITES.filter(s=>s.type==='car-wash').length,6);
assert.equal(SERVICE_SITES.filter(s=>s.type==='parking-garage').length,8);
assert.equal(MOBILITY_SUPPORT_SITES.length,14);
assert(FORECOURT_PARKING_SITES.length>500);
for(const site of MOBILITY_SUPPORT_SITES){
  assert(!CITY_SERVICE_COLLIDERS.some(c=>c.id===`${site.id}/building`));
  assert(CITY_SERVICE_COLLIDERS.some(c=>c.id.startsWith(`${site.id}/`)));
}
assert.equal(WATERFRONT_OPERATORS.length,3);
assert.equal(SERVICE_SITES.filter(s=>s.type==='budget-hotel').length,8);
assert.equal(SERVICE_SITES.filter(s=>s.type==='fire').length,6);
assert.equal(SERVICE_SITES.filter(s=>s.type==='gas-station').length,12);
assert.equal(SERVICE_SITES.filter(s=>s.type==='detention').length,1);
assert.equal(SERVICE_SITES.filter(s=>s.type==='prison').length,1);
assert.equal(NEIGHBORHOOD_SITES.length,40);
for(const site of NEIGHBORHOOD_SITES){
  const variant=neighborhoodVariant(site.id,site.type)!;
  const model=neighborhood.variants[variant as keyof typeof neighborhood.variants];
  assert(model,`${site.id}: no neighborhood model`);
  assert.equal(statSync(new URL(`../public/assets/3d/ampliworld/GC-NEIGHBORHOOD-001/${variant}.glb`,import.meta.url)).size,model.bytes);
  assert(!CITY_SERVICE_COLLIDERS.some(c=>c.id===`${site.id}/building`),`${site.id}: obsolete solid box`);
}
assert.equal(marina.berthCount,150);
assert.equal(marina.berths.filter(berth=>berth.occupied).length,marina.dockedYachtCount);
for(const [length,model] of Object.entries(yachts.variants)){
  assert.equal(statSync(new URL(`../public/assets/3d/ampliworld/GC-YACHT-FLEET-001/${length}m.glb`,import.meta.url)).size,model.bytes);
  assert(marina.berths.some(berth=>berth.occupied&&berth.yachtLength===Number(length)));
}
for(const site of SPECIAL_SERVICE_SITES){
  const variant=venueVariant(site.id,site.type)!;
  const asset=specialKit.venues[variant];
  assert(asset,`${site.id}: no venue asset`);
  const path=new URL(`../public/assets/3d/ampliworld/GC-FITNESS-ARCADE-001/${variant}.glb`,import.meta.url);
  assert.equal(statSync(path).size,asset.bytes,`${site.id}: stale asset manifest`);
  assert(CITY_SERVICE_COLLIDERS.some(c=>c.id===`${site.id}/entry-left`));
  assert(!CITY_SERVICE_COLLIDERS.some(c=>c.id===`${site.id}/building`),`${site.id}: solid box blocks venue`);
}
for(const site of SERVICE_SITES){
  if(!('shopId' in site)||!(site.type==='gym'||site.type==='arcade'))continue;
  const shop=mall.shops.find(shop=>shop.id===site.shopId);
  assert(shop&&shop.level===site.floor,`${site.id}: unmatched mall floor/room`);
  assert(site.type==='gym'?shop.label.includes('Fitness'):shop.label.includes('Arcade'),`${site.id}: mall room does not match venue`);
}
const world=createLifeWorld();
assert.equal(Object.values(world.businesses||{}).filter(b=>b.type==='gym').length,10);
assert.equal(Object.values(world.businesses||{}).filter(b=>b.type==='arcade').length,2);
assert.equal(Object.values(world.businesses||{}).filter(b=>b.type==='fire').length,6);
assert.equal(Object.values(world.businesses||{}).filter(b=>b.type==='prison').length,1);
assert.equal(Object.values(world.businesses||{}).filter(b=>b.type==='detention').length,1);
assert.equal(Object.values(world.businesses||{}).filter(b=>b.type==='car-wash').length,6);
assert.equal(Object.values(world.businesses||{}).filter(b=>b.type==='parking-garage').length,8);
assert.equal(Object.values(world.businesses||{}).filter(b=>b.type==='boat-rental').length,2);
assert.equal(Object.values(world.businesses||{}).filter(b=>b.type==='river-cruise').length,1);
const operated=advanceLifeWorld(world,1440);
for(const type of ['car-wash','parking-garage','boat-rental','river-cruise']){
  assert(Object.values(operated.businesses||{}).filter(b=>b.type===type).reduce((sum,b)=>sum+b.todayVisits,0)>0,`${type} received no daily demand`);
}
assert.equal(moneyTotal(operated),moneyTotal(world),'urban service demand must transfer, not create, money');
const movedSite=STREET_SERVICE_SITES[0],old=structuredClone(world);
delete old.serviceLayoutVersion;
old.businesses![movedSite.id].entry=[0,0];
const employee=old.residents.find(resident=>resident.employment?.placeId===movedSite.id);
assert(employee);
employee.employment!.entry=[0,0];
const beforeMoney=moneyTotal(old),beforeWage=employee.wage,beforeJob=employee.job;
const upgraded=upgradeLifeWorld(old);
assert.deepEqual(upgraded.businesses![movedSite.id].entry,[movedSite.x,movedSite.z]);
const after=upgraded.residents.find(resident=>resident.id===employee.id)!;
assert.deepEqual(after.employment!.entry,[movedSite.x,movedSite.z]);
assert.equal(after.wage,beforeWage);
assert.equal(after.job,beforeJob);
assert.equal(moneyTotal(upgraded),beforeMoney);
assert.equal(upgradeLifeWorld(upgraded),upgraded);
console.log(JSON.stringify({passed:true,streetSites:sites.length,modeledStorefronts:MODELED_STOREFRONT_SITES.length,physicalColliders:CITY_SERVICE_COLLIDERS.length,kitTriangles:kit.triangles}));
