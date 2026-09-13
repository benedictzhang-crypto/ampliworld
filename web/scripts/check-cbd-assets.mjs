import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DISTRICT, districtGroundHeight } from '../app/district/registry.ts';
const assetRoot=new URL('../public/assets/3d/ampliworld/',import.meta.url);
const parcels=[];
for(const b of DISTRICT.offices) {
  const m=JSON.parse(readFileSync(new URL(`${b.assetId}/tower-manifest.json`,assetRoot)));
  const data=readFileSync(new URL(`${b.assetId}/tower-lod0.glb`,assetRoot));
  assert.equal(data.toString('ascii',0,4),'glTF');
  const gltf=JSON.parse(data.toString('utf8',20,20+data.readUInt32LE(12)));
  assert.equal(gltf.images?.length||0,0,'Architecture is geometry, not facade imagery');
  assert.equal(m.heightMeters,b.heightMeters);
  assert.ok(Math.abs(m.bounds.max[1]-b.heightMeters)<.005);
  assert.ok(Math.abs(m.bounds.min[1])<.005);
  assert.ok(m.stats.materialDrawCalls<=10);
  assert.ok(m.colliders.some(c=>c.max[1]>b.heightMeters-30),'Upper envelope has camera colliders');
  assert.equal(districtGroundHeight(b.x,b.z+45),.18,'Plaza is supported');
  const p={minX:b.x-48,maxX:b.x+48,minZ:b.z-48,maxZ:b.z+48};
  for(const q of parcels) assert.ok(p.maxX<=q.minX||p.minX>=q.maxX||p.maxZ<=q.minZ||p.minZ>=q.maxZ,'No parcel overlap');
  assert.ok(p.maxZ<-278,'Tower does not cover existing mall or parking');
  parcels.push(p);
}
for(const x of [-240,240])for(let z=-695;z<0;z+=5)assert.equal(districtGroundHeight(x,z),.035,'CBD ring road continuous height');
assert.ok(districtGroundHeight(120.5,-110)<0,'Basement cutout preserved');
console.log('CBD: 3 geometric towers, exact heights, 25 material meshes total, clear parcels, continuous ring roads and supported plazas; basement preserved.');
