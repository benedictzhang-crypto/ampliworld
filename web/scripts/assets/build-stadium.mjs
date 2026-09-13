/** Original AmpliWorld stadium: open roof, real football pitch and seating bowl.
 * Install as web/scripts/assets/build-stadium.mjs. All dimensions are metres.
 * No imported geometry, images, facades, names or licensed stadium replicas.
 */
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
  '../../public/assets/3d/ampliworld/GC-STADIUM-001/',
  import.meta.url,
);
const buckets = {},
  materials = {},
  colliders = [],
  Y = 0.18;
for (const [name, color, metalness, roughness] of [
  ['white', 0xe5e7e1, 0.36, 0.35],
  ['gold', 0xc2a15f, 0.76, 0.27],
  ['silver', 0xb3c4cb, 0.68, 0.29],
  ['dark', 0x203b4b, 0.4, 0.43],
  ['blue', 0x547f98, 0.25, 0.5],
  ['seat', 0x85a5ae, 0.18, 0.52],
  ['stone', 0xbfc5c1, 0.04, 0.83],
  ['grassA', 0x488349, 0, 0.97],
  ['grassB', 0x38763e, 0, 0.97],
  ['net', 0xd5e2d5, 0.05, 0.78],
  ['light', 0xffedbd, 0.25, 0.3],
])
  materials[name] = new T.MeshStandardMaterial({
    name,
    color,
    metalness,
    roughness,
  });
materials.light.emissive = new T.Color(0xffdf9f);
materials.light.emissiveIntensity = 0.7;
function add(g, m, x = 0, y = 0, z = 0) {
  g.translate(x, y, z);
  if (g.index) g = g.toNonIndexed();
  delete g.attributes.uv;
  (buckets[m] ??= []).push(g);
}
function box(m, x, y, z, w, h, d) {
  add(new T.BoxGeometry(w, h, d), m, x, y, z);
}
function solid(id, min, max) {
  colliders.push({ id, min, max });
}
function geometry(v, f) {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
  // Annular coordinates advance clockwise when viewed from above: reverse
  // wedge winding so top faces and every shell wall face outward.
  for (let i = 0; i < f.length; i += 3)
    [f[i + 1], f[i + 2]] = [f[i + 2], f[i + 1]];
  g.setIndex(f);
  g.computeVertexNormals();
  return g;
}
function rod(m, a, b, r = 0.06, radial = 6) {
  const av = new T.Vector3(...a),
    bv = new T.Vector3(...b),
    delta = bv.clone().sub(av);
  const g = new T.CylinderGeometry(r, r, delta.length(), radial);
  g.applyQuaternion(
    new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      delta.normalize(),
    ),
  );
  const c = av.add(bv).multiplyScalar(0.5);
  add(g, m, c.x, c.y, c.z);
}
function curved(m, points, r = 0.1, segments = 32, radial = 5, closed = false) {
  const p = points.map((a) => (a.isVector3 ? a : new T.Vector3(...a)));
  add(
    new T.TubeGeometry(
      new T.CatmullRomCurve3(p, closed),
      segments,
      r,
      radial,
      closed,
    ),
    m,
  );
  if (!closed)
    for (const end of [p[0], p[p.length - 1]])
      add(new T.SphereGeometry(r, 8, 4), m, end.x, end.y, end.z);
}
function ellipse(a, rx, rz, y) {
  return [Math.cos(a) * rx, y, Math.sin(a) * rz];
}
const GAP0 = (Math.PI * 5) / 12,
  GAP1 = (Math.PI * 7) / 12;
function entranceSector(a0, a1) {
  return a1 > GAP0 + 1e-7 && a0 < GAP1 - 1e-7;
}
// Closed curved wedge (top, underside, inner/outer walls and radial end caps).
function wedge(m, a0, a1, ix, iz, ox, oz, bottom, top) {
  const ys = typeof bottom === 'function' ? bottom : () => bottom,
    yt = typeof top === 'function' ? top : () => top;
  const v = [
    ...ellipse(a0, ix, iz, ys(a0, 0)),
    ...ellipse(a0, ox, oz, ys(a0, 1)),
    ...ellipse(a1, ix, iz, ys(a1, 0)),
    ...ellipse(a1, ox, oz, ys(a1, 1)),
    ...ellipse(a0, ix, iz, yt(a0, 0)),
    ...ellipse(a0, ox, oz, yt(a0, 1)),
    ...ellipse(a1, ix, iz, yt(a1, 0)),
    ...ellipse(a1, ox, oz, yt(a1, 1)),
  ];
  add(
    geometry(
      v,
      [
        0, 2, 3, 0, 3, 1, 4, 5, 7, 4, 7, 6, 0, 4, 6, 0, 6, 2, 1, 3, 7, 1, 7, 5,
        0, 1, 5, 0, 5, 4, 2, 6, 7, 2, 7, 3,
      ],
    ),
    m,
  );
}

// Full parcel slab is ground support only, NOT an impassable building collider.
box('stone', 0, 0.085, 0, 288, 0.17, 356);
// Runoff surrounds the turf, never underneath it at the same surface height.
// Coplanar turf/runoff produced flickering stripes in the aerial camera.
for (const x of [-44.5,44.5]) box('dark',x,0.175,0,21,0.01,163);
for (const z of [-67,67]) box('dark',0,0.175,z,68,0.01,29);
// Natural grass pitch exactly 68 m wide x 105 m long, visible through roof.
for (let i = 0; i < 15; i++)
  box(
    i % 2 ? 'grassA' : 'grassB',
    0,
    0.179,
    -52.5 + (i + 0.5) * 7,
    68,
    0.002,
    7,
  );
const paintY = 0.193,
  paintH = 0.012,
  paintW = 0.12;
function line(x, z, w, d) {
  box('white', x, paintY, z, w, paintH, d);
}
for (const x of [-34, 34]) line(x, 0, paintW, 105);
for (const z of [-52.5, 0, 52.5]) line(0, z, 68, paintW);
function flatArc(cx, cz, r, a0, a1) {
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const a = a0 + ((a1 - a0) * i) / 40;
    pts.push(new T.Vector3(cx + r * Math.cos(a), 0, cz + r * Math.sin(a)));
  }
  const g = new T.TubeGeometry(
    new T.CatmullRomCurve3(pts),
    40,
    0.065,
    4,
    false,
  );
  g.scale(1, 0.08, 1);
  add(g, 'white', 0, paintY, 0);
}
flatArc(0, 0, 9.15, 0, Math.PI * 2);
for (const z of [0, -41.5, 41.5])
  add(new T.CylinderGeometry(0.15, 0.15, 0.016, 12), 'white', 0, paintY, z);
for (const s of [-1, 1]) {
  // Penalty area: 40.32 x16.5; goal area:18.32 x5.5.
  for (const [width, depth] of [
    [40.32, 16.5],
    [18.32, 5.5],
  ]) {
    line(0, s * (52.5 - depth), width, paintW);
    for (const sx of [-1, 1])
      line((sx * width) / 2, s * (52.5 - depth / 2), paintW, depth);
  }
  const cut = Math.asin(5.5 / 9.15);
  flatArc(
    0,
    s * 41.5,
    9.15,
    s > 0 ? Math.PI + cut : cut,
    s > 0 ? 2 * Math.PI - cut : Math.PI - cut,
  );
  for (const sx of [-1, 1]) {
    const cornerA =
      s > 0 ? (sx > 0 ? Math.PI : Math.PI * 1.5) : sx > 0 ? Math.PI / 2 : 0;
    flatArc(sx * 34, s * 52.5, 1, cornerA, cornerA + Math.PI / 2);
    rod(
      'white',
      [sx * 34, Y, s * 52.5],
      [sx * 34, Y + 1.5, s * 52.5],
      0.026,
      5,
    );
    box('gold', sx * 34 + 0.13, Y + 1.35, s * 52.5, 0.3, 0.22, 0.025);
  }
}

// Goal frames and real open net strings; each goal 7.32x2.44 m, 2 m depth.
for (const s of [-1, 1]) {
  const front = s * 52.5,
    back = s * 54.5,
    top = Y + 2.44;
  for (const x of [-3.66, 3.66]) {
    rod('white', [x, Y, front], [x, top, front], 0.065, 8);
    rod('white', [x, top, front], [x, top - 0.23, back], 0.035, 6);
    rod('white', [x, Y, back], [x, top - 0.23, back], 0.035, 6);
    rod('white', [x, Y + 0.025, front], [x, Y + 0.025, back], 0.03, 6);
  }
  rod('white', [-3.66, top, front], [3.66, top, front], 0.065, 8);
  rod('white', [-3.66, top - 0.23, back], [3.66, top - 0.23, back], 0.035, 6);
  // Back mesh, roof mesh and two side meshes are actual cylindrical fibres.
  for (let i = 0; i <= 24; i++) {
    const x = -3.66 + (i * 7.32) / 24;
    rod('net', [x, Y + 0.03, back], [x, top - 0.23, back], 0.011, 4);
    rod('net', [x, top, front], [x, top - 0.23, back], 0.011, 4);
  }
  for (let i = 0; i <= 8; i++) {
    const y = Y + 0.03 + i * (2.18 / 8);
    rod('net', [-3.66, y, back], [3.66, y, back], 0.011, 4);
    for (const x of [-3.66, 3.66])
      rod('net', [x, y, front], [x, y, back], 0.011, 4);
  }
  for (let i = 0; i <= 7; i++) {
    const t = i / 7,
      z = front + (back - front) * t,
      y = top - 0.23 * t;
    rod('net', [-3.66, y, z], [3.66, y, z], 0.011, 4);
    for (const x of [-3.66, 3.66])
      rod('net', [x, Y + 0.03, z], [x, y, z], 0.011, 4);
  }
  // Only posts obstruct walking; the field/goal mouth has no giant box.
  for (const x of [-3.66, 3.66])
    solid(
      `goal-${s}-post-${x}`,
      [x - 0.07, Y, front - 0.07],
      [x + 0.07, top, front + 0.07],
    );
}

// Twenty-eight ascending terraces, including thin separate seat/back bands.
const tiers = 28,
  sectors = 96;
for (let row = 0; row < tiers; row++) {
  const ix = 54 + row * 2.4,
    iz = 80 + row * 2.5,
    ox = ix + 2.4,
    oz = iz + 2.5;
  const bottom = Y + row * 0.82,
    top = Y + (row + 1) * 0.82;
  for (let i = 0; i < sectors; i++) {
    const a0 = (i * Math.PI * 2) / sectors,
      a1 = ((i + 1) * Math.PI * 2) / sectors;
    if (entranceSector(a0, a1)) continue;
    wedge('stone', a0, a1, ix, iz, ox, oz, bottom, top);
    // Radial circulation aisles interrupt coloured seating, not the floor.
    if (i % 12 !== 0) {
      wedge(
        row % 9 < 2 ? 'gold' : row % 3 === 0 ? 'blue' : 'seat',
        a0,
        a1,
        ix + 0.9,
        iz + 0.95,
        ix + 1.9,
        iz + 2.0,
        top,
        top + 0.16,
      );
      wedge(
        row % 9 < 2 ? 'gold' : 'dark',
        a0,
        a1,
        ix + 1.8,
        iz + 1.9,
        ix + 1.98,
        iz + 2.1,
        top + 0.16,
        top + 0.48,
      );
    }
  }
}
// Conservative segmented stands, no collider spanning the centre or south gap.
for (let i = 0; i < 48; i++) {
  const a0 = (i * Math.PI * 2) / 48,
    a1 = ((i + 1) * Math.PI * 2) / 48;
  if (entranceSector(a0, a1)) continue;
  const bounds = new T.Box3();
  for (const a of [a0, (a0 + a1) / 2, a1])
    for (const [rx, rz] of [
      [54, 80],
      [121.2, 150],
    ])
      bounds.expandByPoint(new T.Vector3(...ellipse(a, rx, rz, Y)));
  solid(
    `stand-sector-${i}`,
    [bounds.min.x, Y, bounds.min.z],
    [bounds.max.x, Y + tiers * 0.82 + 0.5, bounds.max.z],
  );
}
// Exterior concourse ribbon and visible grounded support pylons.
for (let i = 0; i < 96; i++) {
  const a0 = (i * Math.PI * 2) / 96,
    a1 = ((i + 1) * Math.PI * 2) / 96;
  if (entranceSector(a0, a1)) continue;
  wedge('dark', a0, a1, 122, 151, 130, 160, Y, Y + 0.24);
}

// The roof is an asymmetric flowing annulus, never a disk. Its inner opening
// is 144 x204 m, substantially wider than the complete 68 x105 m pitch.
function roofY(a, r) {
  return (
    44 +
    9 * Math.cos(a - 0.38) +
    5 * Math.sin(2 * a + 0.7) +
    r * (8 + 4 * Math.cos(a + 1))
  );
}
for (let band = 0; band < 5; band++)
  for (let i = 0; i < 128; i++) {
    const a0 = (i * Math.PI * 2) / 128,
      a1 = ((i + 1) * Math.PI * 2) / 128,
      r0 = band / 5,
      r1 = (band + 1) / 5;
    const ix = 72 + (140 - 72) * r0,
      iz = 102 + (174 - 102) * r0,
      ox = 72 + (140 - 72) * r1,
      oz = 102 + (174 - 102) * r1;
    wedge(
      band === 0 ? 'gold' : 'white',
      a0,
      a1,
      ix,
      iz,
      ox,
      oz,
      (a, outer) => roofY(a, outer ? r1 : r0) - 1.2,
      (a, outer) => roofY(a, outer ? r1 : r0),
    );
  }
// Sculptural radial ribs and segmented perimeter light; no interior roof cover.
for (let i = 0; i < 28; i++) {
  const a = (i * Math.PI * 2) / 28,
    points = [];
  for (let step = 0; step <= 16; step++) {
    const r = step / 16;
    points.push(
      ellipse(
        a + 0.018 * Math.sin(r * Math.PI),
        72 + 68 * r,
        102 + 72 * r,
        roofY(a, r) + 0.36,
      ),
    );
  }
  curved(i % 3 ? 'silver' : 'gold', points, 0.45, 24, 6);
  if (a < GAP0 || a > GAP1) {
    const base = ellipse(a, 126, 155, Y),
      cap = ellipse(a, 133, 165, roofY(a, 0.9) - 1.2);
    rod('white', base, cap, 0.68, 10);
    solid(
      `roof-pylon-${i}`,
      [Math.min(base[0], cap[0]) - 0.7, Y, Math.min(base[2], cap[2]) - 0.7],
      [
        Math.max(base[0], cap[0]) + 0.7,
        cap[1] + 0.7,
        Math.max(base[2], cap[2]) + 0.7,
      ],
    );
  }
}
const rim = [];
for (let i = 0; i < 128; i++) {
  const a = (i * Math.PI * 2) / 128;
  rim.push(ellipse(a, 72, 102, roofY(a, 0) - 0.4));
}
curved('light', rim, 0.22, 128, 6, true);

// Open south arrival forecourt: no fence, closed gate or invisible stopper.
for (const x of [-23, 23]) {
  box('white', x, 4.0, 167, 1.7, 7.64, 1.7);
  box('gold', x, 8.04, 167, 2, 0.32, 2);
  solid(`arrival-pier-${x}`, [x - 0.85, Y, 166.15], [x + 0.85, 8.2, 167.85]);
}
for (const x of [-18, 18]) box('gold', x, 0.2, 155, 0.18, 0.035, 40);
// Small original sideline benches remain outside the marked pitch.
for (const x of [-42, 42]) {
  box('dark', x, 0.6, 0, 2, 0.84, 14);
  box('gold', x, 1.04, 0, 2.1, 0.08, 14.1);
  solid(`sideline-bench-${x}`, [x - 1.05, Y, -7.05], [x + 1.05, 1.08, 7.05]);
}

const scene = new T.Group();
scene.name = 'Aureole Stadium';
let triangles = 0;
for (const [name, list] of Object.entries(buckets)) {
  const g = mergeGeometries(list, false);
  if (!g) throw new Error(`Merge failed: ${name}`);
  for (const n of g.attributes.position.array)
    if (!Number.isFinite(n)) throw new Error('Non-finite stadium vertex');
  g.computeBoundingBox();
  g.computeBoundingSphere();
  triangles += g.attributes.position.count / 3;
  const mesh = new T.Mesh(g, materials[name]);
  mesh.name = `GC-STADIUM-001-${name}`;
  scene.add(mesh);
  for (const source of list) source.dispose();
}
if (triangles >= 180000)
  throw new Error(`Stadium exceeds triangle budget: ${triangles}`);
scene.updateMatrixWorld(true);
const bounds = new T.Box3().setFromObject(scene);
if (bounds.max.x - bounds.min.x > 290 || bounds.max.z - bounds.min.z > 360)
  throw new Error('Stadium exceeds parcel');
const manifest = {
  id: 'GC-STADIUM-001',
  name: 'Aureole Stadium',
  nameZh: '晖环体育场',
  version: 1,
  units: 'meters',
  coordinateSystem: 'Local origin; right-handed Y-up; south entrance +Z',
  file: 'stadium.glb',
  bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  colliders,
  surfaces: [
    { id: 'parcel-and-field', min: [-144, -178], max: [144, 178], y: Y },
    { id: 'south-access', min: [-14, 52.5], max: [14, 178], y: Y },
    { id: 'football-pitch', min: [-34, -52.5], max: [34, 52.5], y: Y },
  ],
  triangles,
  materialDrawCalls: scene.children.length,
  entrance: [0, 176],
  pitch: {
    widthMeters: 68,
    lengthMeters: 105,
    center: [0, 0],
    surfaceY: Y,
    markings: [
      'boundary',
      'halfway',
      'centre circle',
      'penalty areas',
      'goal areas',
      'penalty arcs',
      'corner arcs',
      'spots',
    ],
    goals: {
      widthMeters: 7.32,
      heightMeters: 2.44,
      depthMeters: 2,
      netGeometry: true,
    },
  },
  roof: {
    type: 'asymmetric flowing annulus',
    openOculusMeters: [144, 204],
    solidCappedPanels: true,
  },
  seating: {
    tiers: 28,
    southOpeningDegrees: 30,
    standAccess: 'not traversable; conservative sectional collision',
  },
  provenance: {
    type: 'original-procedural',
    author: 'AmpliWorld',
    externalMeshes: [],
    externalImages: [],
    note: 'Original mathematically authored geometry, not a reproduced real stadium.',
  },
  limitations: [
    'No animated crowd or football gameplay.',
    'Seating terraces are blocked by sectional collision; central field and south passage remain accessible.',
    'Roof overhead collision is not included; ground traversal only.',
    'No interior concourses or concessions.',
  ],
};
await mkdir(out, { recursive: true });
await writeFile(
  new URL('stadium.glb', out),
  Buffer.from(
    await new GLTFExporter().parseAsync(scene, {
      binary: true,
      onlyVisible: true,
    }),
  ),
);
await writeFile(
  new URL('stadium-manifest.json', out),
  JSON.stringify(manifest, null, 2) + '\n',
);
process.stdout.write(
  JSON.stringify({
    id: manifest.id,
    triangles,
    drawCalls: scene.children.length,
    bounds: manifest.bounds,
  }) + '\n',
);
