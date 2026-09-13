/** Original six-storey courtyard retail asset; metric geometry, not image facades. */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontJson from 'three/examples/fonts/helvetiker_regular.typeface.json' with { type: 'json' };
import { mkdir, writeFile } from 'node:fs/promises';
import { merchandise } from './mall-merchandise.mjs';
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
  '../../asset-library/archived/GC-MALL-001/',
  import.meta.url,
);
await mkdir(out, { recursive: true });
const materials = {};
for (const [key, color, metalness, roughness] of [
  ['ivory', 0xe5e1d5, 0.1, 0.42],
  ['gold', 0xb99957, 0.72, 0.28],
  ['dark', 0x18303b, 0.5, 0.2],
  ['stone', 0x9fa5a5, 0.05, 0.85],
  ['light', 0xffe6ac, 0.15, 0.3],
  ['leather', 0x613a28, 0.1, 0.64],
  ['red', 0x993c46, 0.1, 0.42],
  ['diamond', 0xd6f7ff, 0.5, 0.08],
  ['leaf', 0x426957, 0, 0.9],
  ['wood', 0x75543d, 0, 0.8],
  ['water', 0x559795, 0.5, 0.16],
])
  materials[key] = new T.MeshStandardMaterial({
    name: key,
    color,
    metalness,
    roughness,
  });
materials.light.emissive = new T.Color(0xffca78);
materials.light.emissiveIntensity = 0.7;
materials.glass = new T.MeshStandardMaterial({
  name: 'Clear display glass',
  color: 0xc3dce0,
  transparent: true,
  opacity: 0.17,
  roughness: 0.1,
  metalness: 0.05,
  side: T.DoubleSide,
  depthWrite: false,
});
const buckets = {};
function add(g, m, x = 0, y = 0, z = 0, ry = 0) {
  g.rotateY(ry);
  g.translate(x, y, z);
  if (g.index) g = g.toNonIndexed();
  delete g.attributes.uv;
  (buckets[m] ??= []).push(g);
}
const font = new FontLoader().parse(fontJson);
function text3d(label, x, y, z, size, ry = 0) {
  const g = new TextGeometry(label, {
    font,
    size,
    depth: 0.045,
    curveSegments: 3,
    bevelEnabled: false,
  });
  g.computeBoundingBox();
  g.translate(-(g.boundingBox.max.x - g.boundingBox.min.x) / 2, 0, 0);
  add(g, 'gold', x, y, z, ry);
}
function box(m, x, y, z, w, h, d, ry = 0) {
  add(new T.BoxGeometry(w, h, d), m, x, y, z, ry);
}
function roundPath(w, d, r) {
  const p = new T.Shape(),
    x = -w / 2,
    z = -d / 2;
  p.moveTo(x + r, z);
  p.lineTo(-x - r, z);
  p.quadraticCurveTo(-x, z, -x, z + r);
  p.lineTo(-x, -z - r);
  p.quadraticCurveTo(-x, -z, -x - r, -z);
  p.lineTo(x + r, -z);
  p.quadraticCurveTo(x, -z, x, -z - r);
  p.lineTo(x, z + r);
  p.quadraticCurveTo(x, z, x + r, z);
  return p;
}
function ring(m, y, h, w = 90, d = 72) {
  const p = roundPath(w, d, 8);
  const hole = m === 'dark' ? roundPath(36, 28, 5) : roundPath(35.2, 27.2, 4.6);
  p.holes.push(new T.Path(hole.getPoints(16).reverse()));
  const g = new T.ExtrudeGeometry(p, {
    depth: h,
    bevelEnabled: false,
    curveSegments: 12,
  });
  g.rotateX(-Math.PI / 2);
  add(g, m, 0, y, 0);
}
// Real open courtyard and projecting curved floor slabs. No roof over garden.
ring('stone', 0, 0.17);
ring('dark', 6, 24);
for (let k = 0; k <= 5; k++) {
  const y = 6 + k * 4.8;
  ring(
    'ivory',
    y,
    0.48,
    92 + Math.sin(k * 0.9) * 1.6,
    74 + Math.sin(k * 0.9) * 1.6,
  );
  ring(
    'gold',
    y + 0.48,
    0.065,
    92 + Math.sin(k * 0.9) * 1.6,
    74 + Math.sin(k * 0.9) * 1.6,
  );
}
ring('ivory', 30.55, 0.5, 90, 72);
const solids = [];
function solid(id, min, max) {
  solids.push({ id, min, max });
}
// Four 12m openings below the upper storeys, aligned with garden paths.
for (const s of [-1, 1])
  for (const x of [-25.5, 25.5]) {
    box('stone', x, 2.9, s * 25, 39, 5.8, 22);
    solid(
      'ground-ns-' + s + '-' + x,
      [x - 19.5, 0, s * 25 - 11],
      [x + 19.5, 6, s * 25 + 11],
    );
  }
for (const s of [-1, 1])
  for (const z of [-10, 10]) {
    box('stone', s * 31.5, 2.9, z, 27, 5.8, 8);
    solid(
      'ground-ew-' + s + '-' + z,
      [s * 31.5 - 13.5, 0, z - 4],
      [s * 31.5 + 13.5, 6, z + 4],
    );
  }
for (const s of [-1, 1]) {
  solid('upper-ns-' + s, [-46, 6, s * 25 - 11], [46, 31.1, s * 25 + 11]);
  solid(
    'upper-ew-' + s,
    [s * 31.5 - 13.5, 6, -14],
    [s * 31.5 + 13.5, 31.1, 14],
  );
}
// Storefront recesses: display boxes sit outside opaque shop volumes, with transparent street glass.
const kinds = ['handbag', 'shoe-pair', 'coat', 'necklace', 'watch', 'ring'];
const shops = [];
function windowAt(x, z, ry, index) {
  const c = Math.cos(ry),
    s = Math.sin(ry);
  const b = (m, u, y, v, w, h, d) =>
    box(m, x + u * c + v * s, y, z - u * s + v * c, w, h, d, ry);
  b('dark', 0, 2.65, 0, 9, 5.1, 0.16);
  b('ivory', 0, 0.62, 0.95, 9, 1.15, 2);
  b('gold', 0, 5.27, 1, 9.35, 0.22, 2.2);
  b('light', 0, 5.1, 1, 8.7, 0.07, 1.7);
  b('glass', 0, 2.97, 2, 8.6, 4.05, 0.04);
  if (Math.abs(c) > 0.5)
    solid(
      'display-' + index,
      [x - 4.7, 0, Math.min(z, z + 2.1 * c)],
      [x + 4.7, 5.8, Math.max(z, z + 2.1 * c)],
    );
  else
    solid(
      'display-' + index,
      [Math.min(x, x + 2.1 * s), 0, z - 4.7],
      [Math.max(x, x + 2.1 * s), 5.8, z + 4.7],
    );
  for (const u of [-4.55, 4.55]) b('gold', u, 2.95, 1.96, 0.16, 4.9, 0.16);
  const kind = kinds[index % 6];
  for (const u of [-2.7, 0, 2.7]) {
    b(index % 2 ? 'gold' : 'ivory', u, 1.25, 1.1, 1.25, 0.28, 1.15);
    merchandise(
      T,
      add,
      box,
      kind,
      x + u * c + 1.1 * s,
      1.4,
      z - u * s + 1.1 * c,
      ry,
    );
  }
  const labels = {
    handbag: 'MARO',
    'shoe-pair': 'STRIDE',
    coat: 'ATELIER',
    necklace: 'JOAILLE',
    watch: 'TEMPO',
    ring: 'AUREL',
  };
  text3d(labels[kind], x + 1.9 * s, 5.52, z + 1.9 * c, 0.39, ry);
  shops.push({
    id: 'GC-MALL-S' + String(index + 1).padStart(2, '0'),
    category: kind,
    position: [x, 0, z],
    rotationY: ry,
  });
}
let idx = 0;
for (const s of [-1, 1])
  for (const x of [-35, -23, -11, 11, 23, 35])
    windowAt(x, s * 36, s > 0 ? 0 : Math.PI, idx++);
for (const s of [-1, 1])
  for (const z of [-25, -13, 13, 25])
    windowAt(s * 45, z, s > 0 ? Math.PI / 2 : -Math.PI / 2, idx++);
// Tall bronze fins on all four sides; curved ribbons define the silhouette.
for (let y = 8.6; y < 30; y += 4.8) {
  for (const z of [-36.05, 36.05])
    for (let x = -35; x <= 35; x += 5) box('gold', x, y, z, 0.12, 4.25, 0.25);
  for (const x of [-45.05, 45.05])
    for (let z = -26; z <= 26; z += 5.2) box('gold', x, y, z, 0.25, 4.25, 0.12);
  for (const z of [-14.05, 14.05])
    for (let x = -15; x <= 15; x += 5) box('gold', x, y, z, 0.12, 4.25, 0.22);
  for (const x of [-18.05, 18.05])
    for (let z = -10; z <= 10; z += 5) box('gold', x, y, z, 0.22, 4.25, 0.12);
}
// Arrival canopies and lit portal soffits, clear above avatar jump envelope.
for (const z of [-37, 37]) {
  box('gold', 0, 5.8, z, 12, 0.2, 8);
  box('light', 0, 5.64, z, 10, 0.08, 6);
}
for (const x of [-46, 46]) {
  box('gold', x, 5.8, 0, 8, 0.2, 12);
  box('light', x, 5.64, 0, 6, 0.08, 10);
}
text3d('AUREA GALLERIA', 0, 6.7, 36.28, 0.86);
text3d('AUREA GALLERIA', 0, 6.7, -36.28, 0.86, Math.PI);
// Garden: cross paths stay clear; sunken reflecting basin and planted quadrants.
box('ivory', 0, 0.065, 0, 36, 0.13, 28);
for (const x of [-10, 10])
  for (const z of [-7, 7]) {
    box('stone', x, 0.4, z, 10, 0.5, 6);
    box('leaf', x, 0.66, z, 9.6, 0.12, 5.6);
    solid('planter-' + x + '-' + z, [x - 5, 0, z - 3], [x + 5, 0.76, z + 3]);
    add(new T.CylinderGeometry(0.15, 0.24, 3, 9), 'wood', x, 2.15, z);
    const crown = new T.IcosahedronGeometry(2.25, 1);
    crown.scale(1, 0.75, 1);
    add(crown, 'leaf', x, 4, z);
    box('wood', x, 0.62, z + (z > 0 ? 4 : -4), 4, 0.15, 0.7);
    solid(
      'seat-' + x + '-' + z,
      [x - 2, 0, z + (z > 0 ? 3.65 : -4.35)],
      [x + 2, 0.72, z + (z > 0 ? 4.35 : -3.65)],
    );
  }
box('water', 0, 0.145, 0, 4, 0.025, 4);
solid('garden-basin', [-2, 0, -2], [2, 0.25, 2]);
const sculpture = new T.TorusKnotGeometry(1.2, 0.19, 60, 8);
add(sculpture, 'gold', 0, 2.2, 0);
// Additional forecourt paving plus shared road continuation is part of reusable parcel asset.
box('ivory', 0, -0.03, 0, 104, 0.06, 86);
const scene = new T.Scene();
scene.name = 'GC-MALL-001_Aurea_Galleria';
let triangles = 0;
for (const [m, parts] of Object.entries(buckets)) {
  const g = mergeGeometries(parts);
  const mesh = new T.Mesh(g, materials[m]);
  mesh.name = 'mall_' + m;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  triangles += g.attributes.position.count / 3;
}
const binary = await new GLTFExporter().parseAsync(scene, { binary: true });
await writeFile(new URL('mall-lod0.glb', out), new Uint8Array(binary));
await writeFile(
  new URL('mall-manifest.json', out),
  JSON.stringify(
    {
      id: 'GC-MALL-001',
      name: 'Aurea Galleria',
      units: 'metres',
      stories: 6,
      height: 31.1,
      footprint: [100, 82],
      courtyard: [36, 28],
      asset: 'mall-lod0.glb',
      bytes: binary.byteLength,
      triangles,
      drawCalls: Object.keys(buckets).length,
      shops,
      entrances: [
        [0, 0, 36],
        [0, 0, -36],
        [45, 0, 0],
        [-45, 0, 0],
      ],
      colliders: solids,
      license: 'Original AmpliAlpha geometry; no third-party logos or textures',
      status:
        'Exterior, display windows and walkable garden; upper floor interiors deferred',
    },
    null,
    2,
  ),
);
await writeFile(new URL('FONT-LICENSE.txt',out), fontJson.original_font_information.license_description);
console.log(
  JSON.stringify({
    triangles,
    bytes: binary.byteLength,
    shops: shops.length,
    colliders: solids.length,
  }),
);
