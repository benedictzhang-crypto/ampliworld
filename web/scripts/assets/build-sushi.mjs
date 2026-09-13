/** GC-SUSHI-001: original, geometry-built street sushi restaurant. Front is +Z. */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import {
  mergeGeometries,
  mergeVertices,
} from 'three/addons/utils/BufferGeometryUtils.js';
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
  '../../public/assets/3d/ampliworld/GC-SUSHI-001/',
  import.meta.url,
);
await mkdir(out, { recursive: true });
const FLOOR = 0.18,
  buckets = {},
  colliders = [],
  materials = {};
for (const [name, color, metalness, roughness] of [
  ['cedar', 0x855f3f, 0.03, 0.75],
  ['hinoki', 0xc7a773, 0.02, 0.65],
  ['dark', 0x28302e, 0.2, 0.72],
  ['plaster', 0xe4ded0, 0, 0.91],
  ['stone', 0x787f76, 0.02, 0.91],
  ['bronze', 0xa1854d, 0.75, 0.35],
  ['paper', 0xffdea0, 0, 0.7],
  ['rice', 0xf2eee1, 0, 0.88],
  ['salmon', 0xd88970, 0, 0.63],
  ['nori', 0x293c30, 0, 0.83],
  ['celadon', 0x90aaa1, 0.12, 0.32],
  ['bottle', 0x416b59, 0.2, 0.28],
  ['indigo', 0x334753, 0, 0.95],
  ['leaf', 0x4e7459, 0, 0.94],
])
  materials[name] = new T.MeshStandardMaterial({
    name,
    color,
    metalness,
    roughness,
  });
materials.paper.emissive = new T.Color(0xffc674);
materials.paper.emissiveIntensity = 0.65;
materials.glass = new T.MeshStandardMaterial({
  name: 'Clear blue display glazing',
  color: 0xcadbd6,
  transparent: true,
  opacity: 0.2,
  roughness: 0.13,
  metalness: 0.02,
  side: T.DoubleSide,
  depthWrite: false,
});
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
function cylinder(m, x, y, z, r, h, segments = 12, r2 = r) {
  add(new T.CylinderGeometry(r, r2, h, segments), m, x, y, z);
}
function ellipsoid(m, x, y, z, rx, ry, rz, segments = 10) {
  const g = new T.SphereGeometry(1, segments, 6);
  g.scale(rx, ry, rz);
  add(g, m, x, y, z);
}
function rail(m, a, b, r = 0.025) {
  const dir = new T.Vector3(...b).sub(new T.Vector3(...a)),
    g = new T.CylinderGeometry(r, r, dir.length(), 6);
  g.applyQuaternion(
    new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      dir.normalize(),
    ),
  );
  add(g, m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
}
// Plinth and individually modelled floorboards. No room-sized solid collider.
box('stone', 0, 0.04, 0, 20, 0.22, 14);
box('stone', 0, 0.055, 8.8, 18, 0.25, 3.6);
box('cedar', 0, 0.1625, 0, 19.65, 0.025, 13.65);
for (let x = -9.65; x < 9.8; x += 0.27)
  box('hinoki', x, 0.1775, 0, 0.25, 0.005, 13.58);
for (const z of [7.4, 8.2, 9, 9.8, 10.5])
  box('plaster', 0, 0.182, z, 17.7, 0.006, 0.015);
// Complete rear and side envelopes. Front is segmented around two windows and a 4m door.
box('plaster', 0, 2.25, -6.88, 20, 4.14, 0.24, true, 'rear-wall');
for (const x of [-9.88, 9.88])
  box('plaster', x, 2.25, 0, 0.24, 4.14, 14, true, 'side-wall');
for (const sign of [-1, 1]) {
  box('stone', sign * 6, 0.68, 6.9, 8, 1, 0.2, true, 'front-window-base');
  box('cedar', sign * 6, 3.62, 6.9, 8, 1.56, 0.24, true, 'front-upper-wall');
  for (const x of [sign * 2.15, sign * 9.75])
    box('cedar', x, 2.25, 6.9, 0.3, 4.14, 0.35, true, 'front-post');
  // Transparent glass remains a real impassable window, not an invisible door.
  box(
    'glass',
    sign * 6,
    2.0,
    6.92,
    7.25,
    1.65,
    0.055,
    true,
    'front-display-window',
  );
  for (const x of [sign * 3.7, sign * 5.25, sign * 6.8, sign * 8.35])
    box('cedar', x, 2.02, 7.0, 0.075, 1.8, 0.13);
  box('hinoki', sign * 6, 1.18, 7.04, 7.5, 0.1, 0.36);
}
box('cedar', 0, 4.02, 6.9, 4, 0.6, 0.32, true, 'door-lintel');
// Deep timber facade fins wrap the sides; their depth casts real shadow and parallax.
for (const sign of [-1, 1]) {
  for (let z = -6.8; z < 6.6; z += 0.42)
    box('cedar', sign * 10.04, 2.3, z, 0.27, 4.1, 0.085);
  for (let x = 2.4; x < 9.7; x += 0.31)
    box('cedar', sign * x, 0.71, 7.1, 0.095, 0.95, 0.23);
}
for (let x = -9.6; x < 9.7; x += 0.55)
  box('cedar', x, 2.3, -7.04, 0.11, 4.1, 0.22);
// Noren hangs above head height; all four metres of the central doorway are walkable.
for (const x of [-1.49, -0.5, 0.5, 1.49]) {
  box('indigo', x, 3.3, 7.02, 0.93, 0.62, 0.035);
  cylinder('paper', x, 3.32, 7.06, 0.075, 0.025, 8);
}
// Fully three-dimensional shallow gabled roof with deep eaves, ridge and exposed rafters.
for (const sign of [-1, 1]) {
  const d = 8.55,
    g = new T.BoxGeometry(22.6, 0.26, d),
    a = g.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const worldZ = sign * 4.275 + a.getZ(i);
    a.setY(i, a.getY(i) + 5.35 - Math.abs(worldZ) * 0.105);
  }
  g.computeVertexNormals();
  add(g, 'dark', 0, 0, sign * 4.275);
  box('bronze', 0, 4.48, sign * 8.55, 22.7, 0.12, 0.11);
  for (let x = -10.8; x < 11; x += 0.65) {
    const beam = new T.BoxGeometry(0.13, 0.2, 8.65);
    beam.rotateX(sign * 0.105);
    add(beam, 'cedar', x, 4.83, sign * 4.1);
  }
}
box('bronze', 0, 5.51, 0, 22.75, 0.12, 0.22);
colliders.push({
  id: 'roof-clearance',
  min: [-11.375, 4.38, -8.605],
  max: [11.375, 5.65, 8.605],
});
// Hand-authored raised lettering, not a facade photograph or sign texture.
const glyphs = {
  M: ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
};
const title = 'MORI SUSHI',
  pixel = 0.075,
  total =
    Array.from(title).reduce(
      (n, c) => n + (c === ' ' ? 3 : glyphs[c][0].length + 1),
      0,
    ) * pixel;
let tx = -total / 2;
box('dark', 0, 3.89, 7.08, total + 0.55, 0.76, 0.1);
for (const c of title) {
  if (c === ' ') {
    tx += pixel * 3;
    continue;
  }
  const rows = glyphs[c];
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < rows[y].length; x++)
      if (rows[y][x] === '1')
        box(
          'paper',
          tx + x * pixel,
          4.12 - y * pixel,
          7.15,
          pixel * 0.76,
          pixel * 0.76,
          0.04,
        );
  tx += (rows[0].length + 1) * pixel;
}
function lantern(x, y, z, scale = 1) {
  cylinder('paper', x, y, z, 0.26 * scale, 0.7 * scale, 16, 0.26 * scale);
  for (const dy of [-0.35, 0.35])
    cylinder('dark', x, y + dy * scale, z, 0.27 * scale, 0.045 * scale, 16);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    box(
      'bronze',
      x + Math.cos(a) * 0.258 * scale,
      y,
      z + Math.sin(a) * 0.258 * scale,
      0.015 * scale,
      0.67 * scale,
      0.015 * scale,
    );
  }
  rail('dark', [x, y + 0.38 * scale, z], [x, 4.25, z], 0.018);
}
for (const x of [-7.4, -4.0, 4.0, 7.4]) lantern(x, 2.85, 7.95, 1.05);
for (const x of [-5, -1.7, 1.7, 5]) lantern(x, 3.26, -0.25, 0.9);
// Refined central hinoki sushi counter; chef aisle remains open behind it.
box('cedar', 0, 0.7, -2.1, 11, 1.04, 1.45, true, 'sushi-counter');
box('hinoki', 0, 1.27, -2.1, 11.35, 0.16, 1.75, true, 'countertop');
box('dark', 0, 0.34, -1.35, 10.9, 0.16, 0.035);
for (let x = -5.2; x < 5.3; x += 0.3)
  box('hinoki', x, 0.75, -1.355, 0.08, 0.72, 0.06);
rail('bronze', [-5.3, 0.44, -0.85], [5.3, 0.44, -0.85], 0.035);
function stool(x, z) {
  cylinder('dark', x, 0.22, z, 0.31, 0.075, 12);
  cylinder('bronze', x, 0.52, z, 0.055, 0.62, 8);
  cylinder('cedar', x, 0.88, z, 0.33, 0.15, 16);
  const ring = new T.TorusGeometry(0.22, 0.022, 5, 12);
  ring.rotateX(Math.PI / 2);
  add(ring, 'bronze', x, 0.47, z);
  box('cedar', x, 1.12, z + 0.25, 0.52, 0.32, 0.07);
  colliders.push({
    id: `stool-${colliders.length}`,
    min: [x - 0.34, FLOOR, z - 0.34],
    max: [x + 0.34, 1.3, z + 0.34],
  });
}
for (const x of [-4.6, -3.05, -1.52, 0, 1.52, 3.05, 4.6]) stool(x, -0.1);
// Back wall storage: real shelves, ceramic bowls and original geometric sake bottles.
box('cedar', 0, 0.8, -6.22, 14, 1.24, 0.9, true, 'back-cabinet');
for (const y of [1.48, 2.15, 2.8]) box('hinoki', 0, y, -6.33, 13.8, 0.09, 0.7);
for (const x of [-6.6, -3.3, 0, 3.3, 6.6])
  box('cedar', x, 2.17, -6.35, 0.1, 1.43, 0.7);
function bottle(x, y, z, scale = 1) {
  cylinder('bottle', x, y + 0.135 * scale, z, 0.07 * scale, 0.27 * scale, 10);
  cylinder('bottle', x, y + 0.32 * scale, z, 0.032 * scale, 0.12 * scale, 8);
  cylinder('bronze', x, y + 0.39 * scale, z, 0.035 * scale, 0.035 * scale, 8);
  box(
    'rice',
    x,
    y + 0.16 * scale,
    z + 0.071 * scale,
    0.09 * scale,
    0.13 * scale,
    0.01,
  );
}
for (let x = -6; x <= 6; x += 0.8) {
  bottle(x, 1.53, -6.26, 1 + (Math.round(x * 10) % 3) * 0.09);
  if (Math.round(x * 10) % 2 === 0) bottle(x, 2.2, -6.3, 0.85);
}
function sushiPlate(x, y, z) {
  cylinder('celadon', x, y + 0.018, z, 0.22, 0.035, 16);
  for (const dz of [-0.075, 0.075]) {
    ellipsoid('rice', x, y + 0.075, z + dz, 0.11, 0.045, 0.052);
    ellipsoid('salmon', x, y + 0.115, z + dz, 0.13, 0.022, 0.06);
    for (const dx of [-0.055, 0, 0.055])
      box('rice', x + dx, y + 0.134, z + dz, 0.008, 0.005, 0.08);
  }
  ellipsoid('leaf', x + 0.16, y + 0.065, z - 0.05, 0.036, 0.03, 0.04);
}
for (const x of [-4.5, -2.9, -1.5, 0, 1.5, 2.9, 4.5]) {
  sushiPlate(x, 1.35, -1.8);
  bottle(x + 0.4, 1.35, -2.45, 0.8);
  for (const dx of [-0.04, 0.04])
    rail(
      'cedar',
      [x + 0.28 + dx, 1.37, -1.62],
      [x + 0.32 + dx, 1.37, -2.05],
      0.009,
    );
  cylinder('dark', x + 0.45, 1.365, -1.82, 0.065, 0.025, 10);
}
// Small side dining bays leave the central door-to-counter approach unobstructed.
for (const sign of [-1, 1])
  for (const z of [1.5, 4.7]) {
    const x = sign * 7.1;
    box('cedar', x, 0.79, z, 1.55, 0.13, 1.35, true, 'dining-table');
    box('dark', x, 0.48, z, 0.22, 0.6, 0.22, true, 'table-pedestal');
    for (const dz of [-1, 1]) {
      box('cedar', x, 0.48, z + dz, 1.35, 0.16, 0.5, true, 'bench-seat');
      box('indigo', x, 0.59, z + dz, 1.25, 0.08, 0.46);
      for (const dx of [-0.5, 0.5])
        box('dark', x + dx, 0.3, z + dz, 0.1, 0.38, 0.36);
    }
    sushiPlate(x - 0.3, 0.87, z);
    sushiPlate(x + 0.3, 0.87, z + 0.1);
  }
// Exterior menu and two quiet porch seats; neither occupies x[-2,2] door approach.
box('cedar', 4.0, 0.78, 9.35, 0.12, 1.2, 0.12, true, 'menu-post');
const menu = new T.BoxGeometry(0.8, 0.08, 0.7);
menu.rotateX(0.32);
add(menu, 'dark', 4, 1.42, 9.35);
for (let i = 0; i < 5; i++)
  box(
    'paper',
    4,
    1.48 + i * 0.012,
    9.15 + i * 0.065,
    0.56 - (i % 2) * 0.12,
    0.012,
    0.014,
  );
for (const x of [-6.8, -4.8]) {
  box('cedar', x, 0.47, 9.35, 1.35, 0.16, 0.58, true, 'outdoor-bench');
  for (const dx of [-0.48, 0.48])
    box('dark', x + dx, 0.29, 9.35, 0.12, 0.3, 0.5);
}
for (const x of [-8.5, 8.5]) {
  box('stone', x, 0.53, 9.2, 0.7, 0.7, 0.7, true, 'porch-planter');
  for (let i = 0; i < 5; i++) {
    const bx = x + (i - 2) * 0.1,
      bz = 9.2 + (i % 2) * 0.15;
    rail('leaf', [bx, 0.86, bz], [bx, 2.3 + (i % 3) * 0.15, bz], 0.028);
    for (let k = 0; k < 3; k++) {
      const leaf = new T.SphereGeometry(1, 6, 4);
      leaf.scale(0.24, 0.035, 0.08);
      leaf.rotateZ((k % 2 ? 1 : -1) * 0.5);
      add(leaf, 'leaf', bx + (k % 2 ? 0.14 : -0.14), 1.25 + k * 0.36, bz);
    }
  }
}
const scene = new T.Scene();
scene.name = 'GC-SUSHI-001';
let triangles = 0;
for (const [name, list] of Object.entries(buckets)) {
  const g = mergeVertices(mergeGeometries(list, false));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
  const mesh = new T.Mesh(g, materials[name]);
  mesh.name = `MoriSushi-${name}`;
  mesh.castShadow = name !== 'glass';
  mesh.receiveShadow = true;
  scene.add(mesh);
}
if (triangles >= 60000)
  throw new Error(`Triangle budget exceeded: ${triangles}`);
const bounds = new T.Box3().setFromObject(scene);
const data = await new GLTFExporter().parseAsync(scene, { binary: true });
await writeFile(new URL('sushi.glb', out), Buffer.from(data));
const manifest = {
  id: 'GC-SUSHI-001',
  name: 'Mori Sushi',
  nameZh: '森间寿司',
  units: 'METERS',
  upAxis: 'Y',
  frontAxis: '+Z',
  floorY: FLOOR,
  mainFootprintMeters: [20, 14],
  entrance: [0, 7.2],
  entranceWidth: 4,
  bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  colliders,
  surfaces: [
    { min: [-9.76, -6.76], max: [9.76, 6.8], y: FLOOR },
    { min: [-9, 6.8], max: [9, 10.6], y: FLOOR },
  ],
  triangles,
  drawCalls: scene.children.length,
  bytes: data.byteLength,
  glb: 'sushi.glb',
  provenance: {
    creator: 'AmpliWorld',
    type: 'ORIGINAL_PROCEDURAL_GEOMETRY',
    externalImages: [],
    externalAssets: [],
  },
  functionality: 'VISUAL_ENTERABLE_RESTAURANT_ONLY',
  notes: [
    'Original geometry, not an imported photograph or proprietary restaurant replica.',
    'Real four-sided envelope, projecting fins, deep roof, lanterns, counter, stools and geometric food.',
    'Door approach x[-2,2] remains unobstructed. Room has wall/furniture colliders, never a full-volume collider.',
    'Interior is visually enterable; no ordering, checkout, staffing or simulated restaurant service is implemented.',
    'Main building is 20×14m; roof eaves and porch extend beyond that footprint.',
  ],
};
await writeFile(
  new URL('sushi-manifest.json', out),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    id: manifest.id,
    triangles,
    drawCalls: manifest.drawCalls,
    bytes: data.byteLength,
    colliders: colliders.length,
  }),
);
