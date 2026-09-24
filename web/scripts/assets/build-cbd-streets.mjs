/** Original, metre-scale connective streets; exported assets, not facade planes. */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mkdir, writeFile } from 'node:fs/promises';
if (!globalThis.FileReader)
  globalThis.FileReader = class {
    readAsArrayBuffer(b) {
      b.arrayBuffer().then((v) => {
        this.result = v;
        this.onloadend?.();
      });
    }
  };
const out = new URL(
  '../../public/assets/3d/ampliworld/GC-CBD-STREET-001/',
  import.meta.url,
);
await mkdir(out, { recursive: true });
const mats = Object.fromEntries(
  Object.entries({
    road: 0x586269,
    paving: 0xa8aea7,
    paint: 0xe0d7b2,
    cycle: 0x728e87,
    curb: 0x65736f,
    granite: 0x89948e,
    drain: 0x35464b,
    planter: 0x6b756d,
    leaf: 0x527456,
    wood: 0x806b53,
    blue: 0x12619a,
    bus: 0x2c85a8,
    window: 0x294854,
    red: 0xbd5148,
    white: 0xe9e9df,
    gold: 0xa48a57,
    light: 0xffe8b7,
  }).map(([name, color]) => [
    name,
    new T.MeshStandardMaterial({ name, color, roughness: 0.7 }),
  ]),
);
mats.light.emissive = new T.Color(0xffdc99);
mats.light.emissiveIntensity = 0.6;
const buckets = {},
  surfaces = [],
  colliders = [];
function box(m, x, y, z, w, h, d) {
  const g = new T.BoxGeometry(w, h, d).toNonIndexed();
  g.translate(x, y, z);
  delete g.attributes.uv;
  (buckets[m] ??= []).push(g);
}
function roundSign(m, x, y, z, radius, depth) {
  const g = new T.CylinderGeometry(radius, radius, depth, 24).toNonIndexed();
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  delete g.attributes.uv;
  (buckets[m] ??= []).push(g);
}
function floor(m, x, z, w, d, y) {
  box(m, x, y / 2, z, w, y, d);
  surfaces.push({
    min: [x - w / 2, z - d / 2],
    max: [x + w / 2, z + d / 2],
    y,
  });
}
function segment(x, z, length, vertical) {
  const rect = (m, offset, w, y) =>
    floor(
      m,
      x + (vertical ? offset : 0),
      z + (vertical ? 0 : offset),
      vertical ? w : length,
      vertical ? length : w,
      y,
    );
  rect('road', 0, 26, 0.035);
  for (const s of [-1, 1]) {
    rect('cycle', s * 15, 4, 0.035);
    rect('paving', s * 18.5, 3, 0.17);
    // Continuous raised curb separates pedestrians from the bike lane.
    box('curb', x + (vertical ? s * 17 : 0), .105, z + (vertical ? 0 : s * 17),
      vertical ? .15 : length, .19, vertical ? length : .15);
    for (let p = -length / 2 + 2; p < length / 2 - 2; p += 4.8) {
      // Jointed stone modules break up the previous featureless white strip.
      box('granite', x + (vertical ? s * 18.5 : p), .175,
        z + (vertical ? p : s * 18.5), vertical ? 2.65 : .055, .009,
        vertical ? .055 : 2.65);
    }
  }
  for (let p = -length / 2 + 8; p < length / 2 - 8; p += 28)
    for (const s of [-1, 1]) {
      const gx = x + (vertical ? s * 12.2 : p), gz = z + (vertical ? p : s * 12.2);
      box('drain', gx, .044, gz, vertical ? .72 : 1.1, .012, vertical ? 1.1 : .72);
      for (let i = -2; i <= 2; i++)
        box('curb', gx + (vertical ? i * .12 : 0), .052,
          gz + (vertical ? 0 : i * .12), vertical ? .035 : .9, .01, vertical ? .9 : .035);
    }
  for (let p = -length / 2 + 4; p < length / 2 - 3; p += 9)
    box(
      'paint',
      x + (vertical ? 0 : p),
      0.042,
      z + (vertical ? p : 0),
      vertical ? 0.15 : 3,
      0.014,
      vertical ? 3 : 0.15,
    );
  for (let p = -length / 2 + 12; p < length / 2 - 8; p += 34)
    for (const s of [-1, 1]) {
      const lx = x + (vertical ? s * 19 : p),
        lz = z + (vertical ? p : s * 19);
      box('gold', lx, 4.17, lz, 0.16, 8, 0.16);
      box('gold', lx, 8.12, lz, vertical ? 3 : 0.18, 0.18, vertical ? 0.18 : 3);
      box(
        'light',
        lx,
        8.02,
        lz,
        vertical ? 2.8 : 0.2,
        0.08,
        vertical ? 0.2 : 2.8,
      );
      colliders.push({
        id: `lamp-${lx}-${lz}`,
        min: [lx - 0.15, 0.17, lz - 0.15],
        max: [lx + 0.15, 8.21, lz + 0.15],
      });
    }
}
for (const x of [-440, 440]) {
  for (const [a, b] of [
    [-1010, -670],
    [-630, -520],
    [-480, -20],
  ])
    segment(x, (a + b) / 2, b - a, true);
  for (const z of [-1030, -650, -500, 0]) floor('road', x, z, 40, 40, 0.035);
}
for (const z of [-1030, -650]) segment(0, z, 840, false);
for (const x of [-265, 265]) segment(x, 0, 310, false);
// Crosswalks and refuge markings clarify the busiest CBD junctions.
for (const x of [-440, 440]) for (const z of [-1030, -650]) {
  for (const side of [-1, 1]) for (let i = -5; i <= 5; i++) {
    box('paint', x + i * 2.15, .052, z + side * 15.8, 1.35, .014, 3.1);
    box('paint', x + side * 15.8, .052, z + i * 2.15, 3.1, .014, 1.35);
  }
}
for (const [x, z, d] of [
  [-310, -402, 20],
  [310, -402, 20],
  [0, -812, 20],
])
  floor('paving', x, z, 14, d, 0.17);
// Small planted pause points make the frontage feel inhabited. All raised
// elements have explicit simple colliders instead of being walk-through props.
for (const [x, z] of [[-310,-402],[310,-402],[0,-812]]) {
  for (const side of [-1, 1]) {
    const px = x + side * 4.7;
    box('planter', px, .43, z, 2.25, .54, 2.25);
    box('leaf', px, .82, z, 1.85, .42, 1.85);
    colliders.push({ id: `planter-${px}-${z}`,
      min: [px-1.13,.17,z-1.13], max: [px+1.13,1.03,z+1.13] });
  }
  box('wood', x, .54, z-4, 2.6, .17, .72);
  box('curb', x-.9, .33, z-4, .11, .42, .11);
  box('curb', x+.9, .33, z-4, .11, .42, .11);
  colliders.push({ id: `bench-${x}-${z}`, min:[x-1.3,.17,z-4.36], max:[x+1.3,.63,z-3.64] });
}
// Road-facing speed signs, overhead blue direction boards, and public transit
// furniture are modelled at metre scale. Lettering is added by the client.
for (const [i,x,z] of [[0,-440,-915],[1,-440,-725],[2,440,-910],[3,440,-720]]) {
  const sx = x + (x < 0 ? -19 : 19);
  box('curb', sx, 2.2, z, .12, 4.1, .12);
  roundSign('red', sx, 3.85, z+.15, .72, .13);
  roundSign('white', sx, 3.85, z+.24, .58, .035);
  colliders.push({id:`speed-${i}`,min:[sx-.13,.17,z-.13],max:[sx+.13,4.25,z+.32]});
}
for (const [i,x,z] of [[0,-440,-790],[1,440,-790]]) {
  for(const dx of [-22,22]) {
    box('curb',x+dx,3.9,z,.24,7.5,.24);
    colliders.push({id:`direction-post-${i}-${dx}`,min:[x+dx-.13,.17,z-.13],max:[x+dx+.13,7.7,z+.13]});
  }
  box('blue',x,7.15,z,41,3.15,.35);
  box('white',x,5.5,z,41,.16,.16);
}
for(const [i,x,z] of [[0,-310,-402],[1,310,-402],[2,0,-812]]) {
  const px=x+5.8;
  box('curb',px,1.5,z,.12,2.8,.12);
  box('blue',px,2.82,z+.12,2.8,.75,.18);
  colliders.push({id:`pedestrian-wayfinding-${i}`,min:[px-.13,.17,z-.13],max:[px+.13,3.2,z+.22]});
}
for(const [i,x,z] of [[0,-466,-875],[1,466,-875],[2,-466,-570],[3,466,-570]]) {
  const sx=x+(x<0?-4:4);
  box('paving',sx,.16,z,8,.14,13);
  for(const dz of [-4.5,4.5]) {
    box('curb',sx,1.9,z+dz,3.4,3.5,.13);
    colliders.push({id:`bus-shelter-${i}-${dz}`,min:[sx-1.7,.17,z+dz-.08],max:[sx+1.7,3.65,z+dz+.08]});
  }
  box('blue',sx,3.7,z,4.4,.24,10.5);
  box('window',sx+(x<0?1.65:-1.65),1.9,z,.1,2.6,8.4);
  box('wood',sx, .6,z,2.4,.14,3.8);
  box('curb',sx-.7,.4,z,.1,.46,3.5);
  box('curb',sx+.7,.4,z,.1,.46,3.5);
  colliders.push({id:`bus-bench-${i}`,min:[sx-1.2,.17,z-1.9],max:[sx+1.2,.7,z+1.9]});
  box('blue',sx+3,2.1,z+5.1,.18,3.8,.18);
  box('blue',sx+3,3.75,z+5.1,.95,.62,.1);
  colliders.push({id:`bus-stop-${i}`,min:[sx+2.88,.17,z+5],max:[sx+3.12,4.1,z+5.2]});
}
// A full-sized bus at the west CBD stop; until routes are simulated it is
// parked, with its body registered as an obstacle rather than ghost geometry.
const busX=-446,busZ=-875;
box('bus',busX,1.6,busZ,2.7,2.9,11.8);
box('white',busX,3.08,busZ,2.55,.14,10.9);
for(const side of [-1,1]){
  for(let i=0;i<6;i++){
    const wz=busZ-4.6+i*1.67;
    box('window',busX+side*1.37,2.35,wz,.055,1.05,1.38);
    box('curb',busX+side*1.41,2.35,wz+.72,.07,1.14,.075);
  }
  box('white',busX+side*1.39,1.53,busZ,.055,.13,10.8);
}
box('window',busX,2.35,busZ+5.92,2.34,1.22,.055);
box('window',busX,2.22,busZ-5.92,2.2,.95,.055);
box('curb',busX, .76,busZ+5.96,2.72,.33,.15);
for(const dx of [-.95,.95]){
  box('light',busX+dx,1.12,busZ+6,.35,.24,.08);
  box('red',busX+dx,1.12,busZ-6,.35,.24,.08);
}
// Near-side folding passenger doors and a rooftop HVAC unit distinguish the
// bus from a generic delivery box when viewed from the sidewalk.
box('window',busX+1.39,1.63,busZ+2.9,.07,2.25,1.35);
box('curb',busX+1.45,1.63,busZ+2.9,.075,2.3,.055);
box('white',busX,3.2,busZ-.6,1.35,.18,2.2);
box('curb',busX,3.31,busZ-.6,1.2,.12,1.9);
for(const dz of [-4.2,4.2])for(const dx of [-1.15,1.15]){
  const g=new T.CylinderGeometry(.48,.48,.22,12).toNonIndexed();
  g.rotateZ(Math.PI/2);g.translate(busX+dx,.5,busZ+dz);
  delete g.attributes.uv;(buckets.drain??=[]).push(g);
}
colliders.push({id:'west-cbd-bus',min:[busX-1.4,.17,busZ-5.95],max:[busX+1.4,3.1,busZ+5.95]});
const scene = new T.Group();
scene.name = 'GC-CBD-STREET-001';
let triangles = 0;
for (const [m, gs] of Object.entries(buckets)) {
  const g = mergeGeometries(gs, false);
  triangles += g.attributes.position.count / 3;
  scene.add(new T.Mesh(g, mats[m]));
  gs.forEach((x) => x.dispose());
}
const bin = await new GLTFExporter().parseAsync(scene, { binary: true });
await writeFile(new URL('cbd-streets.glb', out), Buffer.from(bin));
await writeFile(
  new URL('street-manifest.json', out),
  JSON.stringify(
    {
      assetId: scene.name,
      units: 'metres',
      design: 'Original connected CBD boulevard kit',
      surfaces,
      colliders,
      triangles,
      bytes: bin.byteLength,
    },
    null,
    2,
  ),
);
console.log(scene.name, triangles, 'triangles', bin.byteLength, 'bytes');
