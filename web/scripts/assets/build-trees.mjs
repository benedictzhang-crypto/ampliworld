/** Original full-volume evergreen broadleaf tree, rooted at local Y=0. No planes. */
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
  '../../public/assets/3d/ampliworld/GC-TREE-001/',
  import.meta.url,
);
await mkdir(out, { recursive: true });
const buckets = {},
  materials = {};
for (const [name, color] of [
  ['bark', 0x615446],
  ['barkRidge', 0x84715b],
  ['leafDeep', 0x315e43],
  ['leafMid', 0x527b4d],
  ['leafSun', 0x76955d],
])
  materials[name] = new T.MeshStandardMaterial({
    name,
    color,
    roughness: name.startsWith('leaf') ? 0.88 : 0.97,
    metalness: 0,
  });
function add(g, m) {
  if (g.index) g = g.toNonIndexed();
  delete g.attributes.uv;
  (buckets[m] ??= []).push(g);
}
function rand(n) {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}
// Each branch is a closed, bending tapered tube with genuine radial bark corrugation.
function branch(points, radii, sides = 8, material = 'bark', seed = 0) {
  const positions = [],
    indices = [],
    p = points.map((v) => new T.Vector3(...v));
  for (let j = 0; j < p.length; j++) {
    const tangent = p[Math.min(j + 1, p.length - 1)]
      .clone()
      .sub(p[Math.max(0, j - 1)])
      .normalize();
    const reference =
      Math.abs(tangent.y) > 0.93
        ? new T.Vector3(1, 0, 0)
        : new T.Vector3(0, 1, 0);
    const u = new T.Vector3().crossVectors(tangent, reference).normalize(),
      v = new T.Vector3().crossVectors(tangent, u).normalize();
    for (let k = 0; k < sides; k++) {
      const a = (k * Math.PI * 2) / sides,
        wrinkle =
          1 + 0.09 * Math.sin(a * 3 + seed) + 0.025 * Math.sin(j * 1.7 + a * 2);
      const q = p[j]
        .clone()
        .addScaledVector(u, Math.cos(a) * radii[j] * wrinkle)
        .addScaledVector(v, Math.sin(a) * radii[j] * wrinkle);
      positions.push(q.x, Math.max(0, q.y), q.z);
    }
  }
  for (let j = 0; j < p.length - 1; j++)
    for (let k = 0; k < sides; k++) {
      const a = j * sides + k,
        b = j * sides + ((k + 1) % sides),
        c = (j + 1) * sides + ((k + 1) % sides),
        d = (j + 1) * sides + k;
      indices.push(a, b, d, b, c, d);
    }
  const bottom = positions.length / 3;
  positions.push(...p[0].toArray());
  const top = positions.length / 3;
  positions.push(...p[p.length - 1].toArray());
  for (let k = 0; k < sides; k++) {
    indices.push(bottom, (k + 1) % sides, k);
    const a = (p.length - 1) * sides + k,
      b = (p.length - 1) * sides + ((k + 1) % sides);
    indices.push(top, a, b);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  add(g, material);
}
const trunk = [
  [0, 0, 0],
  [0.025, 0.4, -0.035],
  [-0.04, 1.1, -0.08],
  [0.075, 1.95, -0.055],
  [0.17, 2.85, 0.015],
  [0.1, 3.75, 0.1],
  [0.23, 4.6, 0.02],
  [0.12, 5.5, -0.09],
  [0.25, 6.4, -0.16],
  [0.17, 7.0, -0.08],
];
branch(
  trunk,
  [0.28, 0.245, 0.22, 0.19, 0.165, 0.137, 0.11, 0.075, 0.044, 0.014],
  12,
);
for (let i = 0; i < 6; i++) {
  const a = (i * Math.PI) / 3;
  branch(
    [
      [0, 0.24, 0],
      [Math.cos(a) * 0.36, 0.12, Math.sin(a) * 0.36],
      [Math.cos(a) * 0.62, 0.025, Math.sin(a) * 0.62],
    ],
    [0.12, 0.085, 0.014],
    6,
    'bark',
    i,
  );
}
// Slender raised bark seams follow the bends instead of being a flat bark texture.
for (let i = 0; i < 9; i++) {
  const a = (i * 2 * Math.PI) / 9,
    path = [];
  for (let j = 1; j < 7; j++) {
    const p = trunk[j],
      r = [0, 0.245, 0.22, 0.19, 0.165, 0.137, 0.11][j];
    path.push([
      p[0] + Math.cos(a) * r * 1.005,
      p[1],
      p[2] + Math.sin(a) * r * 1.005,
    ]);
  }
  branch(path, [0.009, 0.012, 0.009, 0.011, 0.006, 0.002], 4, 'barkRidge', i);
}
const clusters = [];
for (let i = 0; i < 7; i++) {
  const a = i * 2.39996,
    reach = 1.85 + rand(i) * 0.65,
    baseY = 2.75 + (i % 3) * 0.52,
    endY = 5.05 + (i % 3) * 0.48;
  const root = [0.14, baseY, 0.02],
    bend = [Math.cos(a) * 0.8, baseY + 0.62, Math.sin(a) * 0.8],
    end = [Math.cos(a) * reach, endY, Math.sin(a) * reach];
  branch(
    [
      root,
      bend,
      [Math.cos(a) * reach * 0.78, endY - 0.48, Math.sin(a) * reach * 0.78],
      end,
    ],
    [0.105, 0.085, 0.05, 0.016],
    8,
    'bark',
    i,
  );
  for (let j = 0; j < 3; j++) {
    const yaw = a + (j - 1) * 0.42,
      rr = reach * (0.62 + j * 0.16),
      y = endY - 0.38 + j * 0.31;
    clusters.push({
      x: Math.cos(yaw) * rr,
      y,
      z: Math.sin(yaw) * rr,
      r: 0.57 + rand(i * 8 + j) * 0.3,
      seed: i * 8 + j,
    });
  }
  for (const side of [-1, 1]) {
    const yaw = a + side * 0.58,
      e = [
        Math.cos(yaw) * (reach + 0.05),
        endY + 0.64,
        Math.sin(yaw) * (reach + 0.05),
      ];
    branch(
      [
        [Math.cos(a) * reach * 0.68, endY - 0.62, Math.sin(a) * reach * 0.68],
        [(end[0] + e[0]) / 2, endY + 0.1, (end[2] + e[2]) / 2],
        e,
      ],
      [0.044, 0.025, 0.007],
      6,
      'bark',
      i + side,
    );
    clusters.push({
      x: e[0],
      y: e[1],
      z: e[2],
      r: 0.52 + rand(i + 20) * 0.2,
      seed: i * 13 + side + 40,
    });
  }
}
for (let i = 0; i < 6; i++)
  clusters.push({
    x: Math.cos(i * 2.4) * 0.72,
    y: 6.4 + (i % 3) * 0.34,
    z: Math.sin(i * 2.4) * 0.72,
    r: 0.63 + rand(i + 80) * 0.14,
    seed: i + 100,
  });
const leafMats = ['leafDeep', 'leafMid', 'leafSun'];
// Forty-one overlapping irregular closed leaf volumes, never a single crown sphere.
for (const [index, c] of clusters.entries()) {
  const g = new T.SphereGeometry(1, 9, 6),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    // Continuous deformation keeps all duplicated seam vertices coincident and closed.
    const n =
      1 +
      0.16 * Math.sin(x * 7 + c.seed) * Math.cos(z * 6 - c.seed) +
      0.08 * Math.sin(y * 8 + x * 3);
    p.setXYZ(
      i,
      c.x + x * c.r * n * (0.91 + rand(c.seed) * 0.25),
      c.y + y * c.r * n * 0.73,
      c.z + z * c.r * n * (0.95 + rand(c.seed + 4) * 0.2),
    );
  }
  g.computeVertexNormals();
  add(g, leafMats[index % 3]);
  // Fine solid pointed leaf sprays break the outer silhouette without alpha planes.
  for (let j = 0; j < 4; j++) {
    const a = rand(c.seed * 9 + j) * Math.PI * 2,
      yy = (rand(c.seed + j + 30) - 0.2) * 0.8;
    const g2 = new T.OctahedronGeometry(1, 0);
    g2.scale(0.19 + rand(j + c.seed) * 0.09, 0.038, 0.07);
    g2.rotateZ(-0.6 + rand(c.seed + j) * 1.2);
    g2.rotateY(a);
    g2.translate(
      c.x + Math.cos(a) * c.r * 0.91,
      c.y + yy * c.r,
      c.z + Math.sin(a) * c.r * 0.91,
    );
    add(g2, leafMats[(index + j + 1) % 3]);
  }
}
const scene = new T.Scene();
scene.name = 'GC-TREE-001';
let triangles = 0;
const rawGeometries = {};
let maxY = 0;
for (const [m, list] of Object.entries(buckets)) {
  const g = mergeVertices(mergeGeometries(list, false));
  g.computeBoundingBox();
  maxY = Math.max(maxY, g.boundingBox.max.y);
  rawGeometries[m] = g;
}
for (const [m, g] of Object.entries(rawGeometries)) {
  g.scale(1, 8 / maxY, 1);
  g.computeVertexNormals();
  g.computeBoundingBox();
  g.computeBoundingSphere();
  triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
  const mesh = new T.Mesh(g, materials[m]);
  mesh.name = `Tree_${m}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
if (triangles >= 8000)
  throw new Error(`Tree exceeds 8,000 triangle budget: ${triangles}`);
const bounds = new T.Box3().setFromObject(scene);
const core = [];
for (const z of [-14.2, 14.2])
  for (const x of [-99, -77, -23, 23, 77, 99])
    core.push({ id: `tree-${x}-${z}`, position: [x, 0.7595, z] });
for (const x of [-14.2, 14.2])
  for (const z of [-69, -51, -25, 25, 51, 69])
    core.push({ id: `tree-${x}-${z}`, position: [x, 0.7595, z] });
const south = [];
function streetPlacements(x, z, length, vertical) {
  for (let p = -length / 2 + 24; p < length / 2 - 24; p += 45)
    for (const side of [-1, 1]) {
      const tx = x + (vertical ? side * 23 : p),
        tz = z + (vertical ? p : side * 23);
      south.push({ id: `tree-${tx}-${tz}`, position: [tx, 0.17, tz] });
    }
}
for (const x of [-440, 440]) {
  streetPlacements(x, 470, 900, true);
  streetPlacements(x, 995, 70, true);
}
streetPlacements(0, 940, 830, false);
for (const side of [-1, 1]) {
  streetPlacements(side * 550, -500, 180, false);
  streetPlacements(side * 500, 1112.5, 75, true);
}
for (const x of [-250, -320])
  for (let z = 310; z <= 790; z += 80)
    for (const dx of [-10, 10])
      south.push({
        id: `park-tree-${x + dx}-${z}`,
        position: [x + dx, 0.1, z],
      });
const data = await new GLTFExporter().parseAsync(scene, { binary: true });
await writeFile(new URL('tree.glb', out), Buffer.from(data));
const manifest = {
  id: 'GC-TREE-001',
  name: 'AmpliWorld evergreen broadleaf street tree',
  nameZh: '常绿阔叶街树',
  units: 'METERS',
  upAxis: 'Y',
  root: [0, 0, 0],
  heightMeters: 8,
  bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  triangles,
  drawCalls: scene.children.length,
  bytes: data.byteLength,
  colliders: [{ id: 'trunk', min: [-0.31, 0, -0.31], max: [0.4, 3.55, 0.31] }],
  replacementPlacements: { core, south },
  glb: 'tree.glb',
  provenance: {
    creator: 'AmpliWorld',
    type: 'ORIGINAL_PROCEDURAL_CLOSED_GEOMETRY',
    externalAssets: [],
    billboards: false,
  },
  notes: [
    'Closed tapered bending branches, bark seams, irregular crown lobes and solid pointed leaf sprays; no planes, alpha cards or external textures.',
    'Core root Y=.7595 is the existing raised planter soil top, not sidewalk grade.',
    'South street root Y=.17 and south park root Y=.1 preserve existing ground surfaces.',
    'Preserve existing planter and trunk collision; replace only the old bark/leaf or wood/leaf render meshes.',
    'Designed as a reusable mesh; consumer should instance its five material meshes, not create one React component per leaf.',
  ],
};
await writeFile(
  new URL('tree-manifest.json', out),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    id: manifest.id,
    triangles,
    drawCalls: scene.children.length,
    bytes: data.byteLength,
    coreTrees: core.length,
    southTrees: south.length,
  }),
);
