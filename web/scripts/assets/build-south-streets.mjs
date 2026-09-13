/** Original south sports neighborhood. Metre-space connected street geometry. */
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
  '../../public/assets/3d/ampliworld/GC-SPORT-STREET-001/',
  import.meta.url,
);
const materials = Object.fromEntries(
  Object.entries({
    road: 0x4d5e63,
    paving: 0xc4c9c3,
    cycle: 0x607e78,
    white: 0xe9e6d6,
    gold: 0xb19b6e,
    wood: 0x654e3d,
    leaf: 0x538263,
    grass: 0x76936b,
    light: 0xffd19b,
  }).map(([name, color]) => [
    name,
    new T.MeshStandardMaterial({ name, color, roughness: 0.72 }),
  ]),
);
materials.light.emissive = new T.Color(0xffc185);
materials.light.emissiveIntensity = 0.9;
const buckets = {},
  surfaces = [],
  colliders = [],
  routes = [];
function add(g, m, x = 0, y = 0, z = 0) {
  g.translate(x, y, z);
  if (g.index) g = g.toNonIndexed();
  delete g.attributes.uv;
  (buckets[m] ??= []).push(g);
}
function box(m, x, y, z, w, h, d) {
  add(new T.BoxGeometry(w, h, d), m, x, y, z);
}
function floor(m, x, z, w, d, y = 0.17) {
  box(m, x, y / 2, z, w, y, d);
  surfaces.push({
    min: [x - w / 2, z - d / 2],
    max: [x + w / 2, z + d / 2],
    y,
  });
}
function solid(id, x, y, z, w, h, d) {
  colliders.push({
    id,
    min: [x - w / 2, y - h / 2, z - d / 2],
    max: [x + w / 2, y + h / 2, z + d / 2],
  });
}
function street(x, z, length, vertical) {
  const band = (m, offset, w, y) =>
    floor(
      m,
      x + (vertical ? offset : 0),
      z + (vertical ? 0 : offset),
      vertical ? w : length,
      vertical ? length : w,
      y,
    );
  band('road', 0, 26, 0.035);
  for (const side of [-1, 1]) {
    band('cycle', side * 15, 4, 0.035);
    band('paving', side * 21, 8, 0.17);
  }
  for (let p = -length / 2 + 8; p < length / 2 - 6; p += 12)
    box(
      'white',
      x + (vertical ? 0 : p),
      0.045,
      z + (vertical ? p : 0),
      vertical ? 0.15 : 4,
      0.015,
      vertical ? 4 : 0.15,
    );
  for (let p = -length / 2 + 24; p < length / 2 - 24; p += 45)
    for (const side of [-1, 1]) {
      const tx = x + (vertical ? side * 23 : p),
        tz = z + (vertical ? p : side * 23);
      add(new T.CylinderGeometry(0.22, 0.32, 3, 7), 'wood', tx, 1.67, tz);
      add(new T.IcosahedronGeometry(2.8, 1), 'leaf', tx, 5.0, tz);
      solid(`tree-${tx}-${tz}`, tx, 1.67, tz, 0.7, 3, 0.7);
      const lx = tx + (vertical ? 0 : 9),
        lz = tz + (vertical ? 9 : 0);
      box('gold', lx, 4.17, lz, 0.18, 8, 0.18);
      box('light', lx, 8.1, lz, 1.2, 0.15, 1.2);
      solid(`lamp-${lx}-${lz}`, lx, 4.17, lz, 0.24, 8, 0.24);
    }
  routes.push({ x, z, length, vertical });
}
// Existing core loop to the sports district. Junction boxes replace curb strips.
for (const x of [-440, 440]) {
  street(x, 470, 900, true); // z20..920
  floor('road', x, 940, 50, 40, 0.035);
  street(x, 995, 70, true); // z960..1030
  floor('road', x, 1050, 50, 40, 0.035);
}
street(0, 940, 830, false);
for (const side of [-1, 1]) {
  street(side * 550, -500, 180, false); // x460..640, meets pre-existing road ROW at650
  floor('road', side * 650, -500, 20, 50, 0.035);
  // South return connects to the global north/south avenue at x±500,z1150.
  floor('road', side * 470, 1050, 60, 50, 0.035);
  floor('road', side * 500, 1050, 50, 50, 0.035);
  street(side * 500, 1112.5, 75, true); // z1075..1150
}
// Stadium's pedestrian forecourt and an actual marked surface car park.
floor('paving', 0, 225, 16, 290, 0.17);
floor('paving', 0, 370, 374, 14, 0.17);
for (const x of [-180, 180]) floor('paving', x, 590, 14, 440, 0.17);
floor('paving', 0, 810, 374, 14, 0.17);
floor('paving', 0, 850, 290, 130, 0.17);
floor('paving', 0, 919, 28, 10, 0.17);
floor('road', 275, 680, 110, 270, 0.035);
for (let row = 0; row < 22; row++)
  for (const side of [-1, 1]) {
    const x = 275 + side * 36,
      z = 557 + row * 11;
    for (const dx of [-2.7, 2.7])
      box('white', x + dx, 0.045, z, 0.12, 0.018, 6);
    box('white', x, 0.045, z - 3, 5.5, 0.018, 0.12);
  }
floor('road', 275, 867.5, 14, 105, 0.035);
floor('road', 275, 932, 26, 24, 0.035);
floor('paving', 210, 680, 12, 270, 0.17);
// Restaurant front connects to the existing east-side sidewalk (z−20).
floor('paving', 180, -28, 25, 16, 0.17);
// Modest park strips, deliberately kept clear of pitch, entrance and carriageways.
for (const x of [-250, -320])
  for (let z = 310; z <= 790; z += 80) {
    floor('grass', x, z, 38, 54, 0.1);
    for (const dx of [-10, 10]) {
      add(new T.CylinderGeometry(0.3, 0.4, 3.4, 7), 'wood', x + dx, 1.8, z);
      add(new T.IcosahedronGeometry(4, 1), 'leaf', x + dx, 5.8, z);
      solid(`park-tree-${x + dx}-${z}`, x + dx, 1.8, z, 0.8, 3.4, 0.8);
    }
  }
const scene = new T.Group();
scene.name = 'GC-SPORT-STREET-001';
let triangles = 0;
for (const [m, gs] of Object.entries(buckets)) {
  const g = mergeGeometries(gs, false);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  triangles += g.attributes.position.count / 3;
  scene.add(new T.Mesh(g, materials[m]));
  gs.forEach((g) => g.dispose());
}
await mkdir(out, { recursive: true });
const bin = await new GLTFExporter().parseAsync(scene, { binary: true });
await writeFile(new URL('sports-streets.glb', out), Buffer.from(bin));
await writeFile(
  new URL('street-manifest.json', out),
  JSON.stringify(
    {
      id: scene.name,
      units: 'metres',
      surfaces,
      colliders,
      routes,
      triangles,
      parkingBays: 44,
      roadConnections: [
        [-650, -500],
        [650, -500],
        [-500, 1150],
        [500, 1150],
      ],
      limitations: [
        'No automated traffic, tolls or parking payment. Sports parking is surface parking, not a new underground garage.',
      ],
    },
    null,
    2,
  ),
);
console.log(scene.name, triangles, 'triangles');
