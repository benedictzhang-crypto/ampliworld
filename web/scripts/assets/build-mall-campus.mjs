/** Original six-storey courtyard retail asset; metric geometry, not image facades. */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontJson from 'three/examples/fonts/helvetiker_regular.typeface.json' with { type: 'json' };
import { mkdir, writeFile } from 'node:fs/promises';
import { merchandise } from './mall-merchandise.mjs';
import { buildParking } from './mall-parking.mjs';
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
  '../../public/assets/3d/ampliworld/GC-MALL-002/',
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

const W = 225,
  D = 180,
  IW = 90,
  ID = 70;
const solids = [],
  shops = [];
function solid(id, min, max) {
  solids.push({ id, min, max });
}
function wall(id, x, y, z, w, h, d) {
  box('stone', x, y, z, w, h, d);
  solid(
    id,
    [x - w / 2, y - h / 2, z - d / 2],
    [x + w / 2, y + h / 2, z + d / 2],
  );
}
function ring(m, y, h, w = W, d = D) {
  const p = roundPath(w, d, 14),
    hole = roundPath(
      m === 'dark' ? IW : IW - 0.8,
      m === 'dark' ? ID : ID - 0.8,
      9,
    );
  p.holes.push(new T.Path(hole.getPoints(16).reverse()));
  const g = new T.ExtrudeGeometry(p, {
    depth: h,
    bevelEnabled: false,
    curveSegments: 12,
  });
  g.rotateX(-Math.PI / 2);
  add(g, m, 0, y, 0);
}
ring('stone', 0, 0.17);
ring('dark', 6, 24);
for (let k = 0; k < 6; k++) {
  const y = 6 + k * 4.8;
  ring('ivory', y, 0.48, W + 2 + Math.sin(k) * 1.5, D + 2 + Math.sin(k) * 1.5);
  ring(
    'gold',
    y + 0.48,
    0.06,
    W + 2 + Math.sin(k) * 1.5,
    D + 2 + Math.sin(k) * 1.5,
  );
}
ring('ivory', 30.55, 0.5);
// Rear/side wings remain closed shells. Ground-floor south galleries are genuinely hollow.
for (const s of [-1, 1]) {
  wall('rear-wing-' + s, s * 59.25, 3, -62.5, 106.5, 6, 55);
  for (const z of [-20.5, 20.5])
    wall('side-wing-' + s + '-' + z, s * 78.75, 3, z, 67.5, 6, 29);
  solid(
    'upper-ns-' + s,
    [-114, 6, s * 62.5 - 27.5],
    [114, 31.1, s * 62.5 + 27.5],
  );
  solid(
    'upper-ew-' + s,
    [s * 78.75 - 33.75, 6, -35],
    [s * 78.75 + 33.75, 31.1, 35],
  );
  // Enclosed but enterable indoor galleries, connected to the central garden passage.
  const cx = s * 59.25;
  box('ivory', cx, 0.085, 62.5, 106.5, 0.17, 55);
  wall('hall-front-' + s, cx, 3, 89.8, 106.5, 6, 0.4);
  wall('hall-back-' + s, cx, 3, 35.2, 106.5, 6, 0.4);
  wall('hall-side-' + s, s * 112.3, 3, 62.5, 0.4, 6, 55);
  wall('portal-wall-inner-' + s, s * 6, 3, 51.4, 0.4, 6, 32.8);
  wall('portal-wall-front-' + s, s * 6, 3, 85.2, 0.4, 6, 9.6);
  // 12 metre doorway at z68..80, with open twin glass door leaves and bronze jambs.
  for (const z of [68, 80]) {
    box('gold', s * 6, 2.75, z, 0.45, 5.5, 0.45);
    box('glass', s * 8.2, 2.6, z, 4.1, 5, 0.06);
    solid(
      'open-door-' + s + '-' + z,
      [s * 8.2 - 2.05, 0, z - 0.1],
      [s * 8.2 + 2.05, 5.2, z + 0.1],
    );
  }
  box('gold', s * 6, 5.55, 74, 0.7, 0.35, 12.8);
  text3d(
    s < 0 ? 'WEST GALLERY' : 'EAST GALLERY',
    s * 5.72,
    5.1,
    74,
    0.62,
    s < 0 ? Math.PI / 2 : -Math.PI / 2,
  );
  for (let x = 18; x < 105; x += 18) {
    box('light', s * x, 5.66, 64, 11, 0.08, 0.5);
    box('gold', s * x, 5.8, 64, 12, 0.12, 0.9);
    wall('hall-column-' + s + '-' + x, s * x, 3, 43, 0.7, 6, 0.7);
    // Human-scale indoor counters leave a continuous aisle near z74.
    box('ivory', s * x, 0.72, 52, 5, 1.1, 2);
    solid(
      'counter-' + s + '-' + x,
      [s * x - 2.5, 0, 51],
      [s * x + 2.5, 1.3, 53],
    );
    merchandise(
      T,
      add,
      box,
      x % 36 ? 'handbag' : 'necklace',
      s * x,
      1.3,
      52,
      0,
    );
  }
}
// Human-scale shopfront module reused, with more storefronts rather than enlarged products.
const kinds = ['handbag', 'shoe-pair', 'coat', 'necklace', 'watch', 'ring'];
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
  for (let x = -101; x <= 101; x += 12) {
    if (Math.abs(x) < 10) continue;
    windowAt(x, s * 90, s > 0 ? 0 : Math.PI, idx++);
  }
for (const s of [-1, 1])
  for (let z = -77; z <= 77; z += 12) {
    if (Math.abs(z) < 10) continue;
    windowAt(s * 112.5, z, s > 0 ? Math.PI / 2 : -Math.PI / 2, idx++);
  }
for (let y = 8.6; y < 30; y += 4.8) {
  for (const z of [-90.04, 90.04])
    for (let x = -98; x <= 98; x += 6) box('gold', x, y, z, 0.13, 4.2, 0.3);
  for (const x of [-112.54, 112.54])
    for (let z = -76; z <= 76; z += 6) box('gold', x, y, z, 0.3, 4.2, 0.13);
  for (const z of [-35.04, 35.04])
    for (let x = -36; x <= 36; x += 6) box('gold', x, y, z, 0.13, 4.2, 0.25);
}
for (const z of [-91, 91]) {
  box('gold', 0, 5.8, z, 14, 0.2, 10);
  box('light', 0, 5.64, z, 12, 0.08, 8);
}
text3d('AUREA GALLERIA', 0, 6.75, 90.3, 1.05);
box('ivory', 0, 0.085, 0, 90, 0.17, 70);
for (const x of [-27, 27])
  for (const z of [-19, 19]) {
    box('stone', x, 0.45, z, 28, 0.56, 20);
    box('leaf', x, 0.76, z, 27.4, 0.06, 19.4);
    solid('garden-' + x + '-' + z, [x - 14, 0, z - 10], [x + 14, 0.8, z + 10]);
    for (const u of [-8, 8]) {
      add(new T.CylinderGeometry(0.2, 0.3, 4, 10), 'wood', x + u, 2.76, z);
      const g = new T.IcosahedronGeometry(3.1, 1);
      g.scale(1, 0.9, 1);
      add(g, 'leaf', x + u, 5.4, z);
    }
    box('wood', x, 0.7, z > 0 ? 7 : -7, 12, 0.2, 1);
    solid(
      'garden-seat-' + x + '-' + z,
      [x - 6, 0, (z > 0 ? 7 : -7) - 0.5],
      [x + 6, 0.8, (z > 0 ? 7 : -7) + 0.5],
    );
  }
box('water', 0, 0.19, 0, 8, 0.025, 8);
solid('garden-basin', [-4, 0, -4], [4, 0.3, 4]);
add(new T.TorusKnotGeometry(2, 0.28, 72, 10), 'gold', 0, 3, 0);
const parking = buildParking(T, add, box, solid, text3d);
// Outdoor forecourt and drop-off loop; leave vehicle access rightward to parking.
box('ivory', 0, 0.08, 98, 225, 0.16, 12);
box('stone', 0.75, 0.035, 113, 226.5, 0.07, 16);
box('stone', 159.75, 0.035, 113, 65.5, 0.07, 16);
box('stone', 120.5, 0.085, 114.5, 13, 0.17, 13);
for (let x = -105; x < 190; x += 10) box('ivory', x, 0.18, 113, 4, 0.01, 0.15);
for (const x of [-86, -52, 52, 86]) {
  box('stone', x, 0.38, 102, 16, 0.44, 2.5);
  box('leaf', x, 0.62, 102, 15.5, 0.05, 2.1);
  solid('forecourt-planter-' + x, [x - 8, 0, 100.75], [x + 8, 0.7, 103.25]);
}
const scene = new T.Scene();
scene.name = 'GC-MALL-002_Aurea_Galleria_Campus';
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
      id: 'GC-MALL-002',
      name: 'Aurea Galleria Campus',
      units: 'metres',
      stories: 6,
      height: 31.1,
      mainBuildingFootprint: [225, 180],
      mainFootprintRatioToPrevious: 6.25,
      courtyard: [90, 70],
      asset: 'mall-lod0.glb',
      bytes: binary.byteLength,
      triangles,
      shops,
      colliders: solids,
      parking,
      indoorEntrances: [
        [-6, 0.17, 74],
        [6, 0.17, 74],
      ],
      status:
        'Ground galleries and courtyard walkable; upper floors and full B1 parking interior pending',
      designReferences: [
        'https://hope.design/cn/projects/7898/',
        'https://www.kpf.com/project/wf-central',
      ],
    },
    null,
    2,
  ),
);
await writeFile(
  new URL('FONT-LICENSE.txt', out),
  fontJson.original_font_information.license_description,
);
console.log(
  JSON.stringify({
    triangles,
    bytes: binary.byteLength,
    shops: shops.length,
    colliders: solids.length,
    parking,
  }),
);
