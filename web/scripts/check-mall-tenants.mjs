import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOUR_DESTINATIONS} from '../app/world-client/tour-destinations.ts';
const root='../public/assets/3d/ampliworld/';
const read=p=>JSON.parse(readFileSync(new URL(root+p,import.meta.url)));
const m=read('GC-MALL-TENANTS-001/tenants-manifest.json');
const all=[...m.colliders,...read('GC-MALL-002/mall-manifest.json').colliders,...read('GC-MALL-LEISURE-001/leisure-manifest.json').colliders,...read('GC-MALL-FITOUT-001/fitout-manifest.json').colliders,...read('GC-MALL-SPORTS-001/sports-manifest.json').colliders,...read('GC-MALL-GARAGE-002/garage-manifest.json').colliders];
const blocked=(x,y,z)=>all.find(c=>x>c.min[0]-.32&&x<c.max[0]+.32&&z>c.min[2]-.32&&z<c.max[2]+.32&&c.max[1]>y+.29&&c.min[1]<y+2.08);
assert.equal(m.shops.length,26);
for(const theme of ['auto-showroom','shoes','alterations','watch-repair','concierge','members','styling','spa','art-gallery'])assert.ok(m.shops.some(s=>s.theme===theme),theme);
assert.ok(TOUR_DESTINATIONS.some(d=>d.id==='GC-AUTO-001'),'Existing 4S campus has a safe arrival');
assert.equal(m.colliders.filter(c=>c.id==='Display vehicle').length,4,'Four physically solid display cars');
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
  if(['auto-showroom','shoes','alterations','watch-repair','concierge','members','styling','spa','art-gallery'].includes(s.theme)){
    for(let i=0;i<=80;i++){
      const z=s.entry[2]+(s.z-s.entry[2])*i/80;
      assert.equal(blocked(s.x,s.floorY,z),undefined,s.id+' central accessible aisle');
    }
  }
}
assert.ok(TOUR_DESTINATIONS.some(d=>d.id==='GC-MALL-ROOF-GARDEN'));
assert.ok(m.meshes<=650&&m.triangles<1800000);
assert.equal(new Set(m.shops.map(s=>s.unitId)).size,26,'Stable unique physical units');
assert.equal(new Set(m.shops.map(s=>s.asset)).size,26,'Independently replaceable assets');
for(const s of m.shops){
  assert.ok(s.meshes<=32&&s.triangles<350000,s.id+' per-unit budget');
  assert.ok(readFileSync(new URL(root+'GC-MALL-TENANTS-001/units/'+s.id+'.glb',import.meta.url)).length>1000,s.id+' exported');
}
assert.ok(readFileSync(new URL(root+'GC-MALL-TENANTS-001/shared.glb',import.meta.url)).length>1000);
assert.ok(readFileSync(new URL(root+'GC-MALL-TENANTS-001/tenants.glb',import.meta.url)).length<20*1024*1024);
console.log('PASS: 26 real footprints, nine service/retail additions, four solid display cars, existing 4S arrival, combined collision-safe entrances and render budget.');
