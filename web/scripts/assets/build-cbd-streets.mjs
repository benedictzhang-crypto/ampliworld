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
    paving: 0xc8cdc8,
    paint: 0xe0d7b2,
    cycle: 0x728e87,
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
for (const [x, z, d] of [
  [-310, -402, 20],
  [310, -402, 20],
  [0, -812, 20],
])
  floor('paving', x, z, 14, d, 0.17);
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
