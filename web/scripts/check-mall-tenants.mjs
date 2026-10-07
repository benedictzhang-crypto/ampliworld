import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOUR_DESTINATIONS} from '../app/world-client/tour-destinations.ts';
const root='../public/assets/3d/ampliworld/';
const read=p=>JSON.parse(readFileSync(new URL(root+p,import.meta.url)));
const m=read('GC-MALL-TENANTS-001/tenants-manifest.json');
const all=[...m.colliders,...read('GC-MALL-002/mall-manifest.json').colliders,...read('GC-MALL-LEISURE-001/leisure-manifest.json').colliders,...read('GC-MALL-FITOUT-001/fitout-manifest.json').colliders,...read('GC-MALL-SPORTS-001/sports-manifest.json').colliders,...read('GC-MALL-GARAGE-002/garage-manifest.json').colliders];
const blocked=(x,y,z)=>all.find(c=>x>c.min[0]-.32&&x<c.max[0]+.32&&z>c.min[2]-.32&&z<c.max[2]+.32&&c.max[1]>y+.29&&c.min[1]<y+2.08);
assert.equal(m.shops.length,17);
for(const s of m.shops){
  assert.ok(Math.abs(s.x)+s.w/2<190&&Math.abs(s.z)+s.d/2<85,s.id);
  assert.ok(TOUR_DESTINATIONS.some(d=>d.id==='GC-MALL-TENANT-'+s.id),s.id+' destination');
  for(let i=0;i<=20;i++){
    const p=s.entry.map((v,k)=>v+(s.inside[k]-v)*i/20);
    assert.equal(blocked(...p),undefined,`${s.id}: entrance route blocked at ${p}: ${blocked(...p)?.id}`);
  }
  for(const other of m.shops){if(other===s||other.level!==s.level)continue;
    assert.ok(Math.abs(s.x-other.x)>=(s.w+other.w)/2||Math.abs(s.z-other.z)>=(s.d+other.d)/2,'overlap '+s.id+' '+other.id);
  }
}
assert.ok(TOUR_DESTINATIONS.some(d=>d.id==='GC-MALL-ROOF-GARDEN'));
assert.ok(m.meshes<=40&&m.triangles<1200000);
assert.ok(readFileSync(new URL(root+'GC-MALL-TENANTS-001/tenants.glb',import.meta.url)).length<20*1024*1024);
console.log('PASS: 17 real footprints, floor-aware destinations, unobstructed entrances with combined mall/garage colliders, roof destination and render budget.');
