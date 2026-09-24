import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CIVIC_COLLIDERS,CIVIC_PLACES} from '../app/world-client/civic-registry';
import {CITY_INFRA} from '../app/world-client/city-surface';
import {CITY} from '../app/world-client/city-layer';
import {HOUSING_PLAN} from '../app/world-client/housing-registry';
import {districtGroundHeight} from '../app/district/registry';
import {TOUR_DESTINATIONS} from '../app/world-client/tour-destinations';

const id='GC-CRESCENT-COMMONS-001';
const site=CIVIC_PLACES.find(place=>place.id===id);
assert.ok(site);
const path=new URL('../public/assets/3d/ampliworld/GC-CRESCENT-COMMONS-001/commons.glb',import.meta.url);
const glb=readFileSync(path);
assert.equal(glb.toString('ascii',0,4),'glTF');
assert.equal(glb.length,site.manifest.bytes);
assert.ok(site.manifest.triangles>15000);
assert.ok(site.manifest.facilities.some(name=>name.includes('roof tennis')));

const parcel={minX:650,maxX:1290,minZ:1085,maxZ:1375};
const overlap=(a:{minX:number;maxX:number;minZ:number;maxZ:number})=>
  a.minX<parcel.maxX&&a.maxX>parcel.minX&&a.minZ<parcel.maxZ&&a.maxZ>parcel.minZ;
assert.equal(CITY_INFRA.roadrects.filter(road=>overlap({minX:road.min[0],maxX:road.max[0],minZ:road.min[1],maxZ:road.max[1]})).length,0);
assert.equal(CITY.tiles.flatMap(tile=>tile.compounds).filter(compound=>overlap({minX:compound.x-170,maxX:compound.x+170,minZ:compound.z-170,maxZ:compound.z+170})).length,0);
assert.equal(HOUSING_PLAN.placements.filter(home=>overlap({minX:home.x-home.width/2,maxX:home.x+home.width/2,minZ:home.z-home.depth/2,maxZ:home.z+home.depth/2})).length,0);
assert.equal(CIVIC_COLLIDERS.filter(collider=>!collider.id.startsWith(`${id}/`)&&overlap({minX:collider.min[0],maxX:collider.max[0],minZ:collider.min[2],maxZ:collider.max[2]})).length,0);

const destination=TOUR_DESTINATIONS.find(item=>item.id===id);
assert.ok(destination?.featured);
assert.ok(destination.searchText.includes('bowling'));
assert.ok(districtGroundHeight(destination.arrivalX,destination.arrivalZ)>=.2);

let feet=.22;
for(let step=1;step<=54;step++){
  const z=site.z+131-step;
  const next=districtGroundHeight(site.x+267,z,feet);
  assert.ok(next>=feet&&next-feet<=.29,`step ${step} discontinuity: ${feet} -> ${next}`);
  feet=next;
}
assert.ok(Math.abs(feet-11.02)<.03);
assert.ok(Math.abs(districtGroundHeight(site.x+250,site.z+77,feet)-11.02)<.03);

const doorX=site.x+216,doorZ=site.z+57+28+1.5;
const atDoor=CIVIC_COLLIDERS.filter(c=>c.id.startsWith(`${id}/`)&&doorX>c.min[0]-.2&&doorX<c.max[0]+.2&&doorZ>c.min[2]-.2&&doorZ<c.max[2]+.2&&c.max[1]>1&&c.min[1]<1.8);
assert.deepEqual(atDoor.map(c=>c.id),['GC-CRESCENT-COMMONS-001/bowling-entry-pier']);
const sideDoorX=doorX+6;
assert.equal(CIVIC_COLLIDERS.filter(c=>c.id.startsWith(`${id}/`)&&sideDoorX>c.min[0]-.2&&sideDoorX<c.max[0]+.2&&doorZ>c.min[2]-.2&&doorZ<c.max[2]+.2&&c.max[1]>1&&c.min[1]<1.8).length,0);
console.log(JSON.stringify({status:'passed',site:id,triangles:site.manifest.triangles,colliders:site.manifest.colliders.length,surfaces:site.manifest.surfaces.length,roofFeet:feet,teleport:[destination.arrivalX,destination.arrivalZ]}));
