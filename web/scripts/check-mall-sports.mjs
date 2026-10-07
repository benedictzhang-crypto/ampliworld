import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {districtGroundHeight} from '../app/district/registry.ts';
import {sportsGroundHeight,golfVertexHeight} from '../app/world-client/mall-sports-surface.ts';
import {TOUR_DESTINATIONS} from '../app/world-client/tour-destinations.ts';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url)));
const p=read('../app/world-client/mall-sports-plan.json');
const root='../public/assets/3d/ampliworld/';
const m=read(root+'GC-MALL-SPORTS-001/sports-manifest.json');
const all=[...m.colliders,...read(root+'GC-MALL-002/mall-manifest.json').colliders,...read(root+'GC-MALL-LEISURE-001/leisure-manifest.json').colliders,...read(root+'GC-MALL-FITOUT-001/fitout-manifest.json').colliders];
const blocked=(x,y,z)=>all.find(c=>x>c.min[0]-.32&&x<c.max[0]+.32&&z>c.min[2]-.32&&z<c.max[2]+.32&&c.max[1]>y+.29&&c.min[1]<y+2.08);
function route(a,b){
  const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*5);
  for(let i=0;i<=n;i++){
    const x=a[0]+(b[0]-a[0])*i/n,z=a[1]+(b[1]-a[1])*i/n,y=districtGroundHeight(x,z-188,p.floorY);
    assert.equal(blocked(x,y,z),undefined,`Route blocked ${x}, ${z}`);
    assert.ok(Number.isFinite(y));
  }
}
assert.equal(m.shops.length,3);
for(const s of p.shops){
  assert.ok(s.min[0]>=125&&s.max[0]<190&&s.min[1]>-85&&s.max[1]<85);
  assert.ok((s.max[0]-s.min[0])*(s.max[1]-s.min[1])>2000);
  assert.ok(TOUR_DESTINATIONS.some(d=>d.id==='GC-MALL-'+s.id));
  route([120,s.entry[1]],[140,s.entry[1]]);
}
route([128,-42],[158,-42]);route([158,-42],[158,-62]);route([120,-79],[120,79]);
route([128,55],[177,55]);
assert.deepEqual([p.court.max[0]-p.court.min[0],p.court.max[1]-p.court.min[1]],[15,14]);
assert.ok(p.court.clearHeight>6);
assert.ok(blocked(147,p.floorY,-63),'Glass sides collide');
assert.ok(!blocked(158,p.floorY,-52),'Court doorway stays open');
const g=p.green;
for(let x=g.min[0];x<=g.max[0];x+=g.step)for(let z=g.min[1];z<=g.max[1];z+=g.step){
  assert.ok(Math.abs(sportsGroundHeight(x,z,p.floorY)-(p.floorY+.012+golfVertexHeight(x,z)))<1e-9);
  assert.ok(golfVertexHeight(x,z)<=g.maxRise);
  if(x+g.step<=g.max[0])assert.ok(Math.abs(golfVertexHeight(x+g.step,z)-golfVertexHeight(x,z))<.15);
}
assert.equal(sportsGroundHeight(150,50,8.17),undefined,'Upper floor unaffected');
assert.equal(sportsGroundHeight(150,50,-7.2),undefined,'B1 remains reserved');
assert.ok(m.meshes<=20);assert.ok(m.triangles<400000);
assert.ok(readFileSync(new URL(root+'GC-MALL-SPORTS-001/sports.glb',import.meta.url)).length<8*1024*1024);
console.log('PASS: three large anchors, clear shared gallery/entries, glass half court, matching rolling terrain, floor isolation, render budget.');
