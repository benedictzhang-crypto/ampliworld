/** Original dry-bank estuary lookout gardens, absolute metric world coordinates. */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import {
  mergeGeometries,
  mergeVertices,
} from 'three/addons/utils/BufferGeometryUtils.js';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  riverCenterX as riverX,
  riverHalfWidth as halfWidth,
} from '../../app/world-client/river-profile.mjs';
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
  '../../public/assets/3d/ampliworld/GC-ESTUARY-001/',
  import.meta.url,
);
await mkdir(out, { recursive: true });
const mouthX = riverX(13200),
  buckets = {},
  materials = {},
  colliders = [],
  surfaces = [],
  placements = [];
for (const [name, color, metalness, roughness] of [
  ['stone', 0xc5ccc8, 0.05, 0.84],
  ['white', 0xe5e6dc, 0.04, 0.64],
  ['gold', 0xb39a65, 0.7, 0.35],
  ['dark', 0x354b52, 0.35, 0.42],
  ['wood', 0x896e50, 0.02, 0.83],
  ['leaf', 0x547e62, 0, 0.9],
  ['lightLeaf', 0x89a372, 0, 0.9],
  ['soil', 0x535b43, 0, 0.98],
  ['light', 0xffe0a0, 0, 0.55],
])
  materials[name] = new T.MeshStandardMaterial({
    name,
    color,
    metalness,
    roughness,
  });
materials.light.emissive = new T.Color(0xffcc79);
materials.light.emissiveIntensity = 0.8;
function add(g, m, x = 0, y = 0, z = 0) {
  g.translate(x, y, z);
  if (g.index) g = g.toNonIndexed();
  delete g.attributes.uv;
  (buckets[m] ??= []).push(g);
}
function box(m, x, y, z, w, h, d, collision = false, id = m) {
  add(new T.BoxGeometry(w, h, d), m, x, y, z);
  if (collision)
    colliders.push({
      id: `${id}-${colliders.length}`,
      min: [x - w / 2, y - h / 2, z - d / 2],
      max: [x + w / 2, y + h / 2, z + d / 2],
    });
}
function cyl(m, x, y, z, r, h, sides = 12, top = r) {
  add(new T.CylinderGeometry(top, r, h, sides), m, x, y, z);
}
function rod(m, a, b, r = 0.08, top = r, sides = 6) {
  const p = new T.Vector3(...a),
    q = new T.Vector3(...b),
    delta = q.clone().sub(p),
    g = new T.CylinderGeometry(top, r, delta.length(), sides);
  g.applyQuaternion(
    new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      delta.normalize(),
    ),
  );
  const center = p.add(q).multiplyScalar(0.5);
  add(g, m, center.x, center.y, center.z);
}
function floor(id, x, z, w, d, y = 0.18) {
  for (const px of [x - w / 2, x + w / 2])
    for (const pz of [z - d / 2, z + d / 2])
      if (pz >= 13200 || Math.abs(px - riverX(pz)) <= halfWidth(pz) + 15)
        throw new Error(`Floor ${id} enters water/bank reserve`);
  box('stone', x, (y + 0.035) / 2, z, w, y - 0.035, d);
  surfaces.push({
    id,
    min: [x - w / 2, z - d / 2],
    max: [x + w / 2, z + d / 2],
    y,
  });
}
function palm(x, z, height = 9) {
  const y = 0.18,
    lean = 0.7;
  rod('wood', [x, y, z], [x + 0.2, y + height * 0.38, z + 0.08], 0.23, 0.17, 8);
  rod(
    'wood',
    [x + 0.2, y + height * 0.38, z + 0.08],
    [x + 0.55, y + height * 0.75, z + 0.15],
    0.17,
    0.13,
    8,
  );
  rod(
    'wood',
    [x + 0.55, y + height * 0.75, z + 0.15],
    [x + lean, y + height, z + 0.12],
    0.13,
    0.08,
    8,
  );
  colliders.push({
    id: `palm-${colliders.length}`,
    min: [x - 0.26, y, z - 0.26],
    max: [x + 0.6, y + 3, z + 0.4],
  });
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      root = [x + lean, y + height, z + 0.12],
      tip = [
        root[0] + Math.cos(a) * 2.9,
        root[1] - 0.85,
        root[2] + Math.sin(a) * 2.9,
      ];
    rod('leaf', root, tip, 0.055, 0.013, 5);
    for (let j = 0; j < 3; j++) {
      const t = 0.38 + j * 0.25,
        cx = root[0] + (tip[0] - root[0]) * t,
        cy = root[1] + 0.25 - 1.1 * t,
        cz = root[2] + (tip[2] - root[2]) * t;
      const g = new T.OctahedronGeometry(1, 0);
      g.scale(0.76 - 0.11 * j, 0.075, 0.31);
      g.rotateZ(-0.25);
      g.rotateY(-a);
      add(g, i % 2 ? 'lightLeaf' : 'leaf', cx, cy, cz);
    }
  }
}
for (const side of [-1, 1]) {
  const x = mouthX + side * 1100,
    z = 13130,
    id = side < 0 ? 'WEST-ESTUARY' : 'EAST-ESTUARY';
  placements.push({
    id,
    center: [x, 0.18, z],
    lighthouse: [x + side * 26, 0.18, 13160],
    groundConnection: [x, 0.035, 13005],
  });
  floor(`${id}-arrival-walk`, x, 13047.5, 12, 85, 0.18);
  floor(`${id}-lookout-square`, x, 13132.5, 104, 95, 0.18);
  // Paired low seating terraces are true slab volumes, below the normal step limit.
  for (const sign of [-1, 1]) {
    floor(`${id}-terrace-${sign}`, x + sign * 37, 13129, 23, 58, 0.32);
    for (const pz of [13107, 13123, 13139]) {
      box('white', x + sign * 41, 0.72, pz, 4.2, 0.8, 7, true, 'planter');
      box('soil', x + sign * 41, 1.145, pz, 3.8, 0.06, 6.6);
      box('leaf', x + sign * 41, 1.36, pz, 3.5, 0.38, 6.2);
      box(
        'wood',
        x + sign * 35,
        0.68,
        pz,
        1.2,
        0.2,
        5.3,
        true,
        'terrace-bench',
      );
      for (const dz of [-1.8, 1.8])
        box('dark', x + sign * 35, 0.49, pz + dz, 0.6, 0.38, 0.2);
    }
  }
  for (const dx of [-22, 22])
    for (const pz of [13100, 13144]) palm(x + dx, pz, 8.2 + (dx > 0 ? 0.9 : 0));
  // Open colonnades frame water views. No wall or giant roof blocks the square.
  for (const sx of [-1, 1]) {
    const px = x + sx * 14;
    for (let pz = 13096; pz <= 13136; pz += 10) {
      box('white', px, 2.62, pz, 0.55, 4.88, 0.75, true, 'colonnade-pier');
      box('gold', px, 4.9, pz, 0.68, 0.12, 0.86);
    }
    box('dark', px, 5.1, 13116, 0.8, 0.23, 42);
    for (let pz = 13097; pz <= 13135; pz += 2)
      box('wood', px - sx * 2.3, 5.19, pz, 5.3, 0.16, 0.2);
  }
  // Modest faceted lighthouse flavour: sealed tower and visible lantern, no fake access.
  const tx = x + side * 26,
    tz = 13160;
  cyl('white', tx, 1.03, tz, 4.7, 1.7, 12);
  cyl('stone', tx, 8.5, tz, 3.3, 13.3, 12, 2.55);
  cyl('white', tx, 16.3, tz, 2.6, 2.3, 12, 2.35);
  cyl('dark', tx, 17.56, tz, 3.2, 0.22, 12);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    box(
      'gold',
      tx + Math.cos(a) * 2.28,
      18.7,
      tz + Math.sin(a) * 2.28,
      0.13,
      2.2,
      0.13,
    );
  }
  cyl('light', tx, 18.6, tz, 0.72, 1.4, 12);
  cyl('dark', tx, 19.85, tz, 3.0, 0.22, 12);
  add(new T.ConeGeometry(3.15, 1.3, 12), 'gold', tx, 20.59, tz);
  colliders.push({
    id: `${id}-sealed-beacon`,
    min: [tx - 4.7, 0.18, tz - 4.7],
    max: [tx + 4.7, 21.3, tz + 4.7],
  });
  // Open pedestrian entries are retained to the north and west/east. Only the
  // south lookout edge receives a low safety rail; it is still 20m before sea.
  for (const pz of [13179]) {
    box('gold', x, 1.21, pz, 104, 0.075, 0.075);
    box('gold', x, 0.73, pz, 104, 0.055, 0.055);
    for (let dx = -51; dx <= 51; dx += 6)
      box('dark', x + dx, 0.71, pz, 0.075, 1.06, 0.075);
    colliders.push({
      id: `${id}-lookout-guard`,
      min: [x - 52, 0.18, pz - 0.12],
      max: [x + 52, 1.28, pz + 0.12],
    });
  }
  for (const dx of [-7, 7])
    for (const pz of [13015, 13045, 13075, 13102, 13143]) {
      box('dark', x + dx, 0.6675, pz, 0.22, 1.265, 0.22, true, 'path-light');
      box('light', x + dx, 1.33, pz, 0.27, 0.12, 0.27);
    }
  // Geometric paving inlays indicate an uninterrupted north/south approach.
  for (const dx of [-4, 4])
    box('gold', x + dx, 0.189, 13110, 0.065, 0.018, 138);
}
const scene = new T.Group();
scene.name = 'GC-ESTUARY-001';
let triangles = 0;
for (const [m, list] of Object.entries(buckets)) {
  const g = mergeVertices(mergeGeometries(list, false));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
  const mesh = new T.Mesh(g, materials[m]);
  mesh.name = `Estuary-${m}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
const bounds = new T.Box3().setFromObject(scene),
  data = await new GLTFExporter().parseAsync(scene, { binary: true });
if (data.byteLength > 600000)
  throw new Error(`Estuary asset exceeds 0.6MB: ${data.byteLength}`);
await writeFile(new URL('estuary-gardens.glb', out), Buffer.from(data));
surfaces.sort((a, b) => b.y - a.y);
const manifest = {
  id: 'GC-ESTUARY-001',
  name: 'Twin Estuary Lookout Gardens',
  nameZh: '河口双岸观景花园',
  units: 'METERS',
  upAxis: 'Y',
  absoluteCoordinates: true,
  origin: [0, 0, 0],
  file: 'estuary-gardens.glb',
  placements,
  colliders,
  surfaces,
  bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  triangles,
  bytes: data.byteLength,
  materialDrawCalls: scene.children.length,
  hydrology: {
    riverCenterOffset: 2320,
    riverAmplitude: 550,
    riverPeriodScale: 3500,
    riverHalfWidth: 300,
    estuaryEndHalfWidth: 1000,
    estuaryStartZ: 13000,
    estuaryEndZ: 13200,
  },
  provenance: {
    type: 'ORIGINAL_PROCEDURAL_GEOMETRY',
    creator: 'AmpliWorld',
    externalAssets: [],
    textures: [],
  },
  limitations: [
    'Original dry-bank promenade/colonnade/palm/beacon geometry, not hydrological simulation.',
    'Lighthouse structures are sealed architectural markers, not enterable buildings or operational maritime equipment.',
    'Northern pedestrian approaches end on continuous existing dry terrain atZ13005; no new road or bridge connection is claimed.',
    'Water, waterfall and bank rails remain owned by the separate city infrastructure asset.',
  ],
};
await writeFile(
  new URL('estuary-manifest.json', out),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    id: manifest.id,
    triangles,
    bytes: data.byteLength,
    placements: placements.length,
    surfaces: surfaces.length,
  }),
);
