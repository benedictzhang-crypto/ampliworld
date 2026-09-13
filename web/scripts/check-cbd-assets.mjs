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
  assert.ok(m.colliders.some(c=>c.id==='plaza-support'&&Math.abs(c.max[1]-.18)<.001),'Plaza support collider');
  const p={minX:b.x-78,maxX:b.x+78,minZ:b.z-78,maxZ:b.z+78};
  for(const q of parcels) assert.ok(p.maxX<=q.minX||p.minX>=q.maxX||p.maxZ<=q.minZ||p.minZ>=q.maxZ,'No parcel overlap');
  assert.ok(p.maxZ<-278,'Tower does not cover existing mall or parking');
  parcels.push(p);
}
for(const x of [-440,440])for(let z=-1025;z<0;z+=5)assert.equal(districtGroundHeight(x,z),.035,'CBD ring road continuous height');
assert.ok(districtGroundHeight(120.5,-110)<0,'Basement cutout preserved');
const c=JSON.parse(readFileSync(new URL('GC-CBD-CONCOURSE-001/concourse-manifest.json',assetRoot)));
const blocked=(x,z)=>c.colliders.some(b=>x>b.min[0]-.35&&x<b.max[0]+.35&&z>b.min[2]-.35&&z<b.max[2]+.35&&b.max[1]>-3.91&&b.min[1]<-2.12);
for(const [a,b] of [[[-310,-360],[310,-360]],[[0,-770],[0,-323]],[[0,-323],[120.5,-323]],[[120.5,-323],[120.5,-128]]]){
  const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1]));
  for(let i=0;i<=n;i++){const x=a[0]+(b[0]-a[0])*i/n,z=a[1]+(b[1]-a[1])*i/n;assert.equal(blocked(x,z),false,`Concourse passage blocked ${x},${z}`);assert.equal(districtGroundHeight(x,z,-4.2),-4.2);}
}
console.log('PASS: new skyline metric heights, spaced parcels, ring roads, all three connected underground plazas and mall portal.');
