/** Original AMPLI schematic street kit. No external assets. Metres, Y-up, road grade Y=0.
 * Run: THREE_MODULE_ROOT=/path/to/node_modules/three node build-street-block.mjs
 * STREET_OUTPUT_DIR defaults to this script's directory. Merged meshes by material.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const root =
  process.env.THREE_MODULE_ROOT || dirname(dirname(require.resolve('three')));
const THREE = await import(
  pathToFileURL(join(root, 'build/three.module.js')).href
);
const { GLTFExporter } = await import(
  pathToFileURL(join(root, 'examples/jsm/exporters/GLTFExporter.js')).href
);
const { mergeGeometries } = await import(
  pathToFileURL(join(root, 'examples/jsm/utils/BufferGeometryUtils.js')).href
);
if (!globalThis.FileReader)
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((r) => {
        this.result = r;
        this.onloadend?.();
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((r) => {
        this.result = `data:${blob.type};base64,${Buffer.from(r).toString('base64')}`;
        this.onloadend?.();
      });
    }
  };
const out =
  process.env.STREET_OUTPUT_DIR || dirname(fileURLToPath(import.meta.url));
await mkdir(out, { recursive: true });
const scene = new THREE.Scene();
scene.name = 'AMPLI_Original_Street_Block';
const make = (name, color, roughness = 0.85, metalness = 0) =>
  new THREE.MeshStandardMaterial({ name, color, roughness, metalness });
const mats = {
  ground: make('Pale grey urban plot', 0xcacbc5),
  road: make('Fine charcoal asphalt', 0x555b60),
  paving: make('White limestone pedestrian paving', 0xdfdfd5),
  curb: make('Precast pale granite curbs', 0xf2eee4),
  cycle: make('Desaturated blue green cycle lanes', 0x759597),
  white: make('White road and crossing paint', 0xf9f5df),
  gold: make('Warm bronze street metal', 0xb49a5e, 0.36, 0.75),
  dark: make('Metro structural graphite', 0x35434a, 0.6, 0.28),
  red: make('Metro wayfinding red', 0x9f443c, 0.58),
  soil: make('Planter dark soil', 0x555044),
  bark: make('Grounded tree trunks', 0x716456),
  leaf: make('Modest grey green canopy', 0x78927a),
  glass: make('Opaque blue grey canopy glass', 0x9eb9bd, 0.25, 0.2),
  light: new THREE.MeshStandardMaterial({
    name: 'Warm lamp diffuser',
    color: 0xfff2d1,
    emissive: 0xffd58c,
    emissiveIntensity: 0.65,
    roughness: 0.35,
  }),
};
const buckets = {};
const colliders = [];
function add(g, m, x, y, z, ry = 0) {
  g.rotateY(ry);
  g.translate(x, y, z);
  (buckets[m] ??= []).push(g);
}
function box(m, x, y, z, w, h, d, ry = 0) {
  add(new THREE.BoxGeometry(w, h, d), m, x, y, z, ry);
}
function cyl(m, x, y, z, r, h) {
  add(new THREE.CylinderGeometry(r, r, h, 8), m, x, y, z);
}
function solid(id, x, y, z, w, h, d) {
  colliders.push({
    id,
    min: [x - w / 2, y - h / 2, z - d / 2],
    max: [x + w / 2, y + h / 2, z + d / 2],
  });
}
function beam(m, a, b, r = 0.065) {
  const av = new THREE.Vector3(...a),
    bv = new THREE.Vector3(...b),
    d = bv.clone().sub(av);
  const g = new THREE.CylinderGeometry(r, r, d.length(), 6);
  g.applyQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      d.normalize(),
    ),
  );
  g.translate(...av.add(bv).multiplyScalar(0.5).toArray());
  (buckets[m] ??= []).push(g);
}
function stripe(x, z, w, d) {
  box('white', x, 0.025, z, w, 0.012, d);
}
// Roads are exactly 14 m wide and their top surface is at grade zero.
box('ground', 0, -0.14, 0, 220, 0.28, 160);
// Lift asphalt 15 mm above the base plot to avoid coplanar z-fighting.
box('road', 0, -0.025, 0, 220, 0.08, 14);
box('road', 0, -0.025, -43.5, 14, 0.08, 73);
box('road', 0, -0.025, 43.5, 14, 0.08, 73);
// Separated cycle tracks and pedestrian strips. Discontinue at crossings.
for (const s of [-1, 1])
  for (const side of [-1, 1]) {
    const x = side * 62,
      z = s * 13;
    box('cycle', x, 0.012, s * 8.5, 96, 0.035, 2.3);
    box('paving', x, 0.085, z, 96, 0.17, 6);
    box('curb', x, 0.13, s * 10, 96, 0.26, 0.25);
    box('curb', x, 0.1, s * 7.25, 96, 0.2, 0.28);
    const vz = side * 47;
    box('cycle', s * 8.5, 0.012, vz, 2.3, 0.035, 66);
    box('paving', s * 13, 0.085, vz, 6, 0.17, 66);
    box('curb', s * 10, 0.13, vz, 0.25, 0.26, 66);
    box('curb', s * 7.25, 0.1, vz, 0.28, 0.2, 66);
  }
// Wide corner landings leave the central carriageway unobstructed.
for (const sx of [-1, 1])
  for (const sz of [-1, 1]) box('paving', sx * 12, 0.065, sz * 12, 8, 0.13, 8);
// Four broad zebra crossings encircle an open intersection square.
for (let n = -5.5; n <= 5.6; n += 1.55)
  for (const s of [-1, 1]) {
    stripe(n, s * 11.8, 0.8, 5.9);
    stripe(s * 11.8, n, 5.9, 0.8);
  }
// Dashed lane separations and stop lines. No stripe painted through crossings.
for (let x = -102; x <= 102; x += 10)
  if (Math.abs(x) > 20) {
    stripe(x, 0, 5, 0.13);
    for (const s of [-1, 1]) stripe(x, s * 6.5, 5, 0.09);
  }
for (let z = -72; z <= 72; z += 10)
  if (Math.abs(z) > 20) {
    stripe(0, z, 0.13, 5);
    for (const s of [-1, 1]) stripe(s * 6.5, z, 0.09, 5);
  }
for (const s of [-1, 1]) {
  stripe(s * 17, -s * 3.6, 0.3, 6.3);
  stripe(s * 3.6, s * 17, 6.3, 0.3);
}
// Simple geometric cycle direction markings, generated with mesh triangles.
for (const s of [-1, 1])
  for (const x of [-92, -72, -24, 24, 72, 92]) {
    stripe(x, s * 8.5, 1.35, 0.12);
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [
          x + s * 0.9,
          0.043,
          s * 8.5,
          x - s * 0.05,
          0.043,
          s * 8.5 - s * 0.4,
          x - s * 0.05,
          0.043,
          s * 8.5 + s * 0.4,
        ],
        3,
      ),
    );
    g.computeVertexNormals();
    (buckets.white ??= []).push(g);
  }
// Secondary ground-level pedestrian links remain outside all reserved footprints.
for (const s of [-1, 1]) {
  box('paving', 0, 0.012, s * 65, 220, 0.025, 4);
  box('paving', s * 76, 0.012, 0, 4, 0.025, 160);
  box('paving', s * 105, 0.012, 0, 4, 0.025, 160);
}
// Omit transverse links across the traffic lanes by covering them with asphalt.
for (const s of [-1, 1]) {
  box('road', 0, 0.026, s * 65, 14, 0.014, 4.1);
  box('road', s * 76, 0.026, 0, 4.1, 0.014, 14);
  box('road', s * 105, 0.026, 0, 4.1, 0.014, 14);
}
function tree(x, z, id) {
  box('curb', x, 0.45, z, 2.5, 0.56, 2.5);
  box('soil', x, 0.742, z, 2.18, 0.035, 2.18);
  cyl('bark', x, 2.2, z, 0.15, 2.95);
  let g = new THREE.IcosahedronGeometry(1.65, 1);
  g.scale(1, 1.13, 1);
  add(g, 'leaf', x, 4.6, z);
  solid(id, x, 1.05, z, 2.5, 1.76, 2.5);
}
function lamp(x, z, id) {
  cyl('gold', x, 0.37, z, 0.24, 0.4);
  cyl('gold', x, 3.25, z, 0.075, 6.15);
  box('gold', x, 6.32, z, 1.6, 0.12, 0.44);
  box('light', x, 6.24, z, 1.34, 0.06, 0.29);
  solid(id, x, 3.28, z, 0.5, 6.22, 0.5);
}
for (const z of [-14.2, 14.2])
  for (const x of [-99, -77, -23, 23, 77, 99]) tree(x, z, `tree-${x}-${z}`);
for (const x of [-14.2, 14.2])
  for (const z of [-69, -51, -25, 25, 51, 69]) tree(x, z, `tree-${x}-${z}`);
for (const z of [-11.1, 11.1])
  for (const x of [-88, -58, -28, 28, 58, 88]) lamp(x, z, `lamp-${x}-${z}`);
for (const x of [-11.1, 11.1])
  for (const z of [-59, -32, 32, 59]) lamp(x, z, `lamp-${x}-${z}`);
// Small limestone benches in furnishing zones, never in car or bicycle lanes.
for (const x of [-87, 87])
  for (const z of [-14, 14]) {
    box('gold', x - 0.95, 0.45, z, 0.13, 0.56, 0.65);
    box('gold', x + 0.95, 0.45, z, 0.13, 0.56, 0.65);
    box('paving', x, 0.77, z, 2.5, 0.14, 0.75);
    solid(`bench-${x}-${z}`, x, 0.51, z, 2.5, 0.65, 0.75);
  }
// Beijing-inspired metro entrance: bronze posts, cool glazing, horizontal canopy,
// red wayfinding fascia and a visibly descending but sealed schematic stairwell.
// Not a model of a real station and not a usable underground transit connection.
const mx = 88,
  mz = 35;
box('paving', mx, 0.085, mz - 2, 10, 0.17, 10);
box('dark', mx, 0.19, mz, 7.3, 0.22, 4.5);
// Full stairwell remains a solid collider to prevent walking into the dark base.
solid('metro-closed-stairwell', mx, 0.7, mz, 7.3, 1.4, 4.5);
for (let i = 0; i < 7; i++)
  box(
    i % 2 ? 'paving' : 'dark',
    mx,
    0.21 + i * 0.042,
    mz - 1.85 + i * 0.55,
    6,
    0.055,
    0.48,
  );
for (const x of [mx - 3.7, mx + 3.7])
  for (const z of [mz - 2.25, mz + 2.25]) {
    box('gold', x, 1.86, z, 0.18, 3.38, 0.18);
    solid(`metro-post-${x}-${z}`, x, 1.86, z, 0.32, 3.38, 0.32);
  }
box('gold', mx, 3.64, mz, 8.3, 0.24, 5.5);
box('glass', mx, 3.82, mz, 7.95, 0.12, 5.1);
for (const x of [mx - 3.85, mx + 3.85])
  box('gold', x, 3.88, mz, 0.12, 0.16, 5.36);
// Shallow upturned end edges allude to Beijing's layered roof silhouettes.
box('gold', mx - 4.08, 3.86, mz, 0.19, 0.23, 5.5);
box('gold', mx + 4.08, 3.86, mz, 0.19, 0.23, 5.5);
box('red', mx, 3.26, mz - 2.66, 7.8, 0.5, 0.14);
// Original geometric M sign, 3D bronze rails on a pale vertical panel.
box('paving', mx, 3.26, mz - 2.76, 1.5, 0.44, 0.05);
const mzf = mz - 2.81;
beam('dark', [mx - 0.46, 3.1, mzf], [mx - 0.46, 3.4, mzf], 0.027);
beam('dark', [mx - 0.46, 3.4, mzf], [mx, 3.12, mzf], 0.027);
beam('dark', [mx, 3.12, mzf], [mx + 0.46, 3.4, mzf], 0.027);
beam('dark', [mx + 0.46, 3.4, mzf], [mx + 0.46, 3.1, mzf], 0.027);
for (const x of [mx - 3.55, mx + 3.55]) {
  for (const z of [mz - 2, mz - 1, mz, mz + 1, mz + 2])
    cyl('gold', x, 0.84, z, 0.045, 1.26);
  box('gold', x, 1.49, mz, 0.09, 0.09, 4.3);
  box('gold', x, 0.88, mz, 0.06, 0.06, 4.3);
  solid(`metro-side-rail-${x}`, x, 0.84, mz, 0.22, 1.5, 4.4);
}
box('gold', mx, 1.49, mz + 2.1, 7.2, 0.09, 0.09);
solid('metro-back-rail', mx, 0.84, mz + 2.1, 7.2, 1.5, 0.22);
const entry = {
  id: 'metro-entrance',
  label: 'Metro entrance · schematic',
  position: [88, 0, 29],
  forward: [0, 0, 1],
  interactionRadius: 4.5,
  operational: false,
};
const anchor = new THREE.Object3D();
anchor.name = 'Metro_Entry_Anchor';
anchor.position.fromArray(entry.position);
anchor.userData = entry;
scene.add(anchor);
let triangles = 0;
for (const [m, gs] of Object.entries(buckets)) {
  const normalized = gs.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.deleteAttribute('uv');
    return n;
  });
  const merged = mergeGeometries(normalized, false);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  const mesh = new THREE.Mesh(merged, mats[m]);
  mesh.name = `Street_${m}`;
  mesh.receiveShadow = true;
  mesh.castShadow = !['road', 'ground', 'cycle', 'white'].includes(m);
  mesh.userData = { static: true, materialRole: m };
  scene.add(mesh);
  triangles += merged.attributes.position.count / 3;
}
const reservedBuildingPlots = [
  [-46, -34],
  [46, -34],
  [-46, 34],
  [46, 34],
].map(([x, z], i) => ({
  id: `residence-${i + 1}`,
  center: [x, 0, z],
  footprint: { width: 32, depth: 24 },
  height: 29.1,
  clearanceBounds: { min: [x - 18, 0, z - 14], max: [x + 18, 29.1, z + 14] },
}));
scene.userData = {
  assetId: 'AMPLI-STREET-001',
  units: 'metres',
  upAxis: 'Y',
  entryAnchor: entry,
};
const glb = await new GLTFExporter().parseAsync(scene, {
  binary: true,
  onlyVisible: true,
  trs: false,
});
await writeFile(join(out, 'street-block.glb'), Buffer.from(glb));
const manifest = {
  id: 'AMPLI-STREET-001',
  name: 'AMPLI Original Crossroads and Metro Pavilion',
  version: 1,
  units: 'metres',
  upAxis: 'Y',
  groundY: 0,
  bounds: { min: [-110, -0.3, -80], max: [110, 6.5, 80] },
  roads: [
    { axis: 'X', center: [0, 0, 0], width: 14, length: 220 },
    { axis: 'Z', center: [0, 0, 0], width: 14, length: 160 },
  ],
  cycleLanes: { separateFromCarriageway: true, width: 2.3 },
  reservedBuildingPlots,
  entryAnchor: entry,
  colliders,
  collision: { type: 'aabb-compound', solids: colliders },
  metro: {
    center: [88, 0, 35],
    canopySize: [8.3, 5.5],
    schematicClosed: true,
    realTransit: false,
  },
  stats: {
    triangles,
    drawCalls: Object.keys(buckets).length,
    bytes: glb.byteLength,
  },
  license: 'Original procedural geometry; no external asset dependencies.',
  notes: [
    'Raised sidewalks are traversable; furniture and metro AABBs are supplied.',
    'Ground plot uses pale neutral paving; building reservation rectangles contain no fixtures.',
    'Metro stairwell is schematic and closed, not a real transit connection.',
  ],
};
await writeFile(
  join(out, 'street-manifest.json'),
  JSON.stringify(manifest, null, 2),
);
console.log(
  JSON.stringify({
    output: out,
    ...manifest.stats,
    colliders: colliders.length,
  }),
);
