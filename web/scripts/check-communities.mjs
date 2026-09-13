import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HOMES, COMMUNITY_KITS, COMMUNITY_COLLIDERS, COMMUNITY_SURFACES, homeBounds, communityGroundHeight} from '../app/world-client/community-registry.ts';
import {CIVIC_COLLIDERS} from '../app/world-client/civic-registry.ts';
import {CITY_INFRA, riverX} from '../app/world-client/city-surface.ts';
const city=JSON.parse(readFileSync(new URL('../public/assets/3d/ampliworld/GC-CITY-2030/city-manifest.json',import.meta.url)));
assert.equal(HOMES.filter(p=>p.kind==='middle').length,15);
assert.equal(HOMES.filter(p=>p.kind==='villa').length,60);
assert.equal(new Set(HOMES.map(p=>p.id)).size,75);
const overlap=(a,b)=>a.min[0]<b.max[0]&&a.max[0]>b.min[0]&&a.min[1]<b.max[1]&&a.max[1]>b.min[1];
const footprint=c=>({min:[c.min[0],c.min[2]],max:[c.max[0],c.max[2]]});
const bounds=HOMES.map(p=>{const model=COMMUNITY_KITS[p.kind].manifest.prototypes[p.prototype];return {...homeBounds(p,[model.bounds.min[0],model.bounds.min[2]],[model.bounds.max[0],model.bounds.max[2]]),id:p.id};});
for(let i=0;i<bounds.length;i++){
 const b=bounds[i],p=HOMES[i];
 for(let j=i+1;j<bounds.length;j++)assert.ok(!overlap(b,bounds[j]),`${b.id} overlaps ${bounds[j].id}`);
 for(const c of city.tiles.flatMap(t=>t.compounds))assert.ok(!overlap(b,{min:[c.x-170,c.z-170],max:[c.x+170,c.z+170]}),`${b.id} overlaps existing ${c.id}`);
 for(const c of CIVIC_COLLIDERS)if(c.max[1]>.3)assert.ok(!overlap(b,footprint(c)),`${b.id} covers civic ${c.id}`);
 for(const r of CITY_INFRA.roadrects)assert.ok(!overlap(b,r),`${b.id} covers global road`);
 if(p.kind==='villa')for(const z of [b.min[1],b.max[1]])assert.ok(b.max[0]<riverX(z)-180,`${b.id} enters river`);
}
let bytes=0;
for(const kit of Object.values(COMMUNITY_KITS))for(const p of kit.manifest.prototypes){
 const file=readFileSync(new URL(`../public/assets/3d/ampliworld/${kit.id}/${p.file}`,import.meta.url));bytes+=file.length;
 assert.equal(file.toString('ascii',0,4),'glTF');
 const gltf=JSON.parse(file.toString('utf8',20,20+file.readUInt32LE(12)));assert.equal(gltf.images?.length||0,0);
 assert.ok(p.colliders.length>0);assert.ok(p.surfaces.length>0);
}
assert.ok(bytes<5000000);
const blocked=(x,z,y)=>COMMUNITY_COLLIDERS.some(c=>x+.38>c.min[0]&&x-.38<c.max[0]&&z+.38>c.min[2]&&z-.38<c.max[2]&&y+.1<c.max[1]&&y+1.8>c.min[1]);
for(const p of HOMES.filter(p=>p.kind==='middle')){
 let y=.045;
 for(let z=p.z+27;z>=p.z+5;z-=.2){y=communityGroundHeight(p.x,z,y)??.035;assert.ok(!blocked(p.x,z,y),`${p.id} lobby blocked at ${z}`);}
 assert.ok(blocked(p.x,p.z+3,y),`${p.id} rear wall missing`);
}
// Drive/walk ingress remains an actual ground route, not a teleport trigger.
for(const [x0,z0,x1,z1] of [[-440,907,-720,907],[1500,1000,riverX(1000)-463,1000],[-895,500,-895,552]]){
 const d=Math.hypot(x1-x0,z1-z0);let y=.065;
 for(let t=0;t<=d;t+=.5){const x=x0+(x1-x0)*t/d,z=z0+(z1-z0)*t/d;const next=communityGroundHeight(x,z,y)??.035;assert.ok(Math.abs(next-y)<.29);y=next;assert.ok(!blocked(x,z,y),'Community gate route is blocked');}
}
console.log(JSON.stringify({status:'passed',homes:75,middle:15,villas:60,prototypeBytes:bytes,colliders:COMMUNITY_COLLIDERS.length,roadAndPathSurfaces:COMMUNITY_SURFACES.length,lobbies:'15 open and rear-wall blocked',existingBuildingsPreserved:true}));
