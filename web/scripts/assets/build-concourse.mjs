/** Original metric AmpliWorld open plazas and walk-connected underground concourse. */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mkdir, writeFile } from 'node:fs/promises';

if (!globalThis.FileReader)
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((value) => {
        this.result = value;
        this.onloadend?.();
      });
    }
  };
const out = new URL(
  '../../public/assets/3d/ampliworld/GC-CBD-CONCOURSE-001/',
  import.meta.url,
);
await mkdir(out, { recursive: true });
const FLOOR = -4.2,
  GROUND = 0.035,
  CEILING = -0.7;
const materials = {};
for (const [name, color, metalness, roughness] of [
  ['concrete', 0x899497, 0.05, 0.87],
  ['ivory', 0xe4e6df, 0.08, 0.53],
  ['gold', 0xbd9b52, 0.72, 0.3],
  ['paving', 0xbdc7c6, 0.05, 0.82],
  ['graphite', 0x233941, 0.42, 0.43],
  ['soil', 0x384436, 0, 1],
  ['leaf', 0x59796b, 0, 0.95],
  ['blue', 0x76d4e2, 0.12, 0.35],
  ['wood', 0x8b7152, 0.1, 0.8],
])
  materials[name] = new T.MeshStandardMaterial({
    name,
    color,
    metalness,
    roughness,
  });
materials.blue.emissive = new T.Color(0x39a8cc);
materials.blue.emissiveIntensity = 0.9;
const buckets = {},
  colliders = [];
function geometry(g, material, x = 0, y = 0, z = 0) {
  g.translate(x, y, z);
  if (g.index) g = g.toNonIndexed();
  delete g.attributes.uv;
  (buckets[material] ??= []).push(g);
}
function box(material, x, y, z, w, h, d, collision = false, id = material) {
  geometry(new T.BoxGeometry(w, h, d), material, x, y, z);
  if (collision)
    colliders.push({
      id: `${id}-${colliders.length}`,
      min: [x - w / 2, y - h / 2, z - d / 2],
      max: [x + w / 2, y + h / 2, z + d / 2],
    });
}
const rect = (x0, z0, x1, z1, id) => ({ id, min: [x0, z0], max: [x1, z1] });
const plazaSpecs = [
  { id: 'WEST-GARDEN', x: -310, z: -360, rampX: -310 },
  { id: 'EAST-GARDEN', x: 310, z: -360, rampX: 310 },
  // Offset is deliberate: the ramp must not occupy the northbound tunnel.
  { id: 'SOUTH-GARDEN', x: 0, z: -770, rampX: 18 },
];
const plazas = plazaSpecs.map((p) =>
  rect(p.x - 32, p.z - 32, p.x + 32, p.z + 32, p.id),
);
const corridors = [
  rect(-310, -366, 310, -354, 'EAST-WEST-SPINE'),
  rect(-6, -770, 6, -320, 'NORTH-SOUTH-SPINE'),
  rect(-6, -326, 126.5, -314, 'MALL-LINK'),
  rect(114.5, -320, 126.5, -128, 'MALL-APPROACH'),
];
const ramps = plazaSpecs.map((p) => ({
  ...rect(p.rampX - 6, p.z + 32, p.rampX + 6, p.z + 74, `${p.id}-RAMP`),
  lowY: FLOOR,
  highY: GROUND,
  slopeAxis: 'z',
  ascendingDirection: '+Z',
}));
const holes = [...plazas, ...ramps].map(({ id, min, max }) => ({
  id,
  min,
  max,
}));
const flatAreas = [...plazas, ...corridors];
const inside = (r, x, z) =>
  x > r.min[0] - 1e-7 &&
  x < r.max[0] + 1e-7 &&
  z > r.min[1] - 1e-7 &&
  z < r.max[1] + 1e-7;
const has = (areas, x, z) => areas.some((r) => inside(r, x, z));
// A rectilinear union makes all four corridor crossings real openings, not wall overlaps.
const xs = [
  ...new Set([...flatAreas, ...ramps].flatMap((r) => [r.min[0], r.max[0]])),
].sort((a, b) => a - b);
const zs = [
  ...new Set([...flatAreas, ...ramps].flatMap((r) => [r.min[1], r.max[1]])),
].sort((a, b) => a - b);
const surfaceRects = [],
  roofRects = [];
for (let ix = 0; ix < xs.length - 1; ix++)
  for (let iz = 0; iz < zs.length - 1; iz++) {
    const x0 = xs[ix],
      x1 = xs[ix + 1],
      z0 = zs[iz],
      z1 = zs[iz + 1],
      x = (x0 + x1) / 2,
      z = (z0 + z1) / 2;
    if (!has(flatAreas, x, z)) continue;
    const w = x1 - x0,
      d = z1 - z0;
    const area = rect(x0, z0, x1, z1, `WALK-${ix}-${iz}`);
    surfaceRects.push({ ...area, y: FLOOR });
    box('paving', x, FLOOR - 0.1, z, w, 0.2, d);
    if (!has(plazas, x, z) && !has(ramps, x, z)) {
      roofRects.push(area);
      box('concrete', x, CEILING + 0.175, z, w, 0.35, d, true, 'tunnel-roof');
    }
    // Sample across each cell edge; adjacent union cells never receive a divider.
    for (const [axis, a, b, c, sign] of [
      ['x', x0, z0, z1, -1],
      ['x', x1, z0, z1, 1],
      ['z', z0, x0, x1, -1],
      ['z', z1, x0, x1, 1],
    ]) {
      const midpoint = (b + c) / 2;
      const ox = axis === 'x' ? a + sign * 0.05 : midpoint;
      const oz = axis === 'z' ? a + sign * 0.05 : midpoint;
      if (has(flatAreas, ox, oz) || has(ramps, ox, oz)) continue;
      // Mall's rear-wall portal remains open for the consumer to attach its basement.
      if (
        axis === 'z' &&
        Math.abs(a + 128) < 1e-6 &&
        midpoint > 114.4 &&
        midpoint < 126.6
      )
        continue;
      const isPlaza = has(plazas, x, z),
        top = isPlaza ? GROUND : CEILING;
      const length = c - b,
        height = top - FLOOR;
      const wx = axis === 'x' ? a + sign * 0.2 : midpoint;
      const wz = axis === 'z' ? a + sign * 0.2 : midpoint;
      box(
        'concrete',
        wx,
        FLOOR + height / 2,
        wz,
        axis === 'x' ? 0.4 : length,
        height,
        axis === 'z' ? 0.4 : length,
        true,
        'retaining-wall',
      );
      box(
        'ivory',
        axis === 'x' ? a - sign * 0.028 : midpoint,
        FLOOR + 1.3,
        axis === 'z' ? a - sign * 0.028 : midpoint,
        axis === 'x' ? 0.055 : length,
        0.65,
        axis === 'z' ? 0.055 : length,
      );
      box(
        'blue',
        axis === 'x' ? a - sign * 0.06 : midpoint,
        FLOOR + 0.22,
        axis === 'z' ? a - sign * 0.06 : midpoint,
        axis === 'x' ? 0.07 : length,
        0.045,
        axis === 'z' ? 0.07 : length,
      );
      if (isPlaza) {
        box(
          'gold',
          wx,
          GROUND + 0.66,
          wz,
          axis === 'x' ? 0.07 : length,
          0.07,
          axis === 'z' ? 0.07 : length,
        );
        box(
          'gold',
          wx,
          GROUND + 1.08,
          wz,
          axis === 'x' ? 0.07 : length,
          0.07,
          axis === 'z' ? 0.07 : length,
        );
        for (let s = b + 0.15; s < c; s += 3)
          box(
            'graphite',
            axis === 'x' ? wx : s,
            GROUND + 0.55,
            axis === 'z' ? wz : s,
            0.09,
            1.1,
            0.09,
          );
        const gw = axis === 'x' ? 0.15 : length,
          gd = axis === 'z' ? 0.15 : length;
        colliders.push({
          id: `plaza-guard-${colliders.length}`,
          min: [wx - gw / 2, GROUND, wz - gd / 2],
          max: [wx + gw / 2, GROUND + 1.1, wz + gd / 2],
        });
      }
    }
  }
// Ramps are genuine sloped meshes. No AABB spans their walkable volume.
for (const r of ramps) {
  const [x0, z0] = r.min,
    [x1, z1] = r.max,
    w = x1 - x0,
    d = z1 - z0;
  const g = new T.BoxGeometry(w, 0.18, d);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getZ(i) + d / 2) / d;
    pos.setY(i, pos.getY(i) + r.lowY + (r.highY - r.lowY) * t - 0.09);
  }
  g.computeVertexNormals();
  geometry(g, 'paving', (x0 + x1) / 2, 0, (z0 + z1) / 2);
  for (const x of [x0 - 0.18, x1 + 0.18]) {
    // Side-wall panels follow the slope; stair-stepping hidden below ground is safe.
    for (let i = 0; i < 14; i++) {
      const z = z0 + ((i + 0.5) * d) / 14;
      const low = r.lowY + (r.highY - r.lowY) * (i / 14);
      box(
        'concrete',
        x,
        (low + GROUND) / 2,
        z,
        0.36,
        Math.max(0.1, GROUND - low),
        d / 14,
        true,
        'ramp-wall',
      );
      const rail = new T.BoxGeometry(0.08, 0.08, d / 14 + 0.03);
      rail.rotateX(-Math.atan2(r.highY - r.lowY, d));
      const floor = r.lowY + ((r.highY - r.lowY) * (i + 0.5)) / 14;
      geometry(rail, 'gold', x, floor + 1.03, z);
      box('graphite', x, floor + 0.52, z, 0.08, 1.04, 0.08);
    }
  }
  for (let z = z0 + 2; z < z1; z += 4)
    box(
      'blue',
      x0 + 0.25,
      r.lowY + ((r.highY - r.lowY) * (z - z0)) / d + 0.03,
      z,
      0.15,
      0.025,
      0.55,
    );
}
for (const p of plazaSpecs) {
  // Four planted terraces leave both cardinal portal axes and central crossing clear.
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const px = p.x + sx * 23,
        pz = p.z + sz * 19;
      box('ivory', px, FLOOR + 0.55, pz, 9, 1.1, 12, true, 'terrace-planter');
      box('soil', px, FLOOR + 1.1, pz, 8.5, 0.1, 11.5);
      box(
        'concrete',
        px + sx * 1.2,
        FLOOR + 1.0,
        pz,
        6,
        2,
        10,
        true,
        'upper-planter',
      );
      box('leaf', px + sx * 1.2, FLOOR + 2.05, pz, 5.6, 0.55, 9.6);
      for (let n = 0; n < 3; n++)
        geometry(
          new T.IcosahedronGeometry(1.25, 0),
          'leaf',
          px + sx * 1.2,
          FLOOR + 2.8,
          pz + (n - 1) * 3,
        );
      const bx = p.x + sx * 14,
        bz = p.z + sz * 21;
      box('graphite', bx, FLOOR + 0.23, bz, 3.8, 0.46, 0.8, true, 'bench');
      box('wood', bx, FLOOR + 0.49, bz, 4, 0.14, 0.9);
      box('gold', bx, FLOOR + 0.8, bz + sz * 0.38, 4, 0.5, 0.08);
    }
  // Rectilinear paving inlays and low uplights, not floating decorative buildings.
  for (const offset of [-10, 10]) {
    box('gold', p.x + offset, FLOOR + 0.012, p.z, 0.11, 0.02, 48);
    box('gold', p.x, FLOOR + 0.012, p.z + offset, 48, 0.02, 0.11);
  }
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const x = p.x + sx * 10,
        z = p.z + sz * 12;
      box('graphite', x, FLOOR + 0.4, z, 0.26, 0.8, 0.26, true, 'path-bollard');
      box('blue', x, FLOOR + 0.81, z, 0.29, 0.16, 0.29);
    }
}
// Repeated luminous ribs define the underground routes while leaving 12m circulation.
for (const r of corridors) {
  const horizontal = r.max[0] - r.min[0] > r.max[1] - r.min[1];
  const lo = horizontal ? r.min[0] : r.min[1],
    hi = horizontal ? r.max[0] : r.max[1];
  for (let s = lo + 8; s < hi; s += 14) {
    const x = horizontal ? s : (r.min[0] + r.max[0]) / 2,
      z = horizontal ? (r.min[1] + r.max[1]) / 2 : s;
    if (has(plazas, x, z) || has(ramps, x, z)) continue;
    box(
      'blue',
      x,
      CEILING - 0.07,
      z,
      horizontal ? 0.12 : 9.5,
      0.1,
      horizontal ? 9.5 : 0.12,
    );
    box(
      'gold',
      x,
      FLOOR + 0.018,
      z,
      horizontal ? 0.1 : 9.4,
      0.025,
      horizontal ? 9.4 : 0.1,
    );
  }
}
const scene = new T.Scene();
scene.name = 'GC-CBD-CONCOURSE-001';
let triangles = 0;
for (const [name, geometries] of Object.entries(buckets)) {
  const merged = mergeGeometries(geometries, false);
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  triangles += merged.attributes.position.count / 3;
  const mesh = new T.Mesh(merged, materials[name]);
  mesh.name = `Concourse-${name}`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
const data = await new GLTFExporter().parseAsync(scene, { binary: true });
if (data.byteLength > 5_000_000)
  throw new Error(`Asset exceeds 5 MB: ${data.byteLength}`);
await writeFile(new URL('concourse.glb', out), Buffer.from(data));
const manifest = {
  id: 'GC-CBD-CONCOURSE-001',
  name: 'Golden City Garden Concourse',
  units: 'METERS',
  upAxis: 'Y',
  origin: [0, 0, 0],
  floorY: FLOOR,
  groundY: GROUND,
  ceilingY: CEILING,
  provenance: {
    creator: 'AmpliWorld',
    type: 'ORIGINAL_PROCEDURAL_GEOMETRY',
    externalAssets: [],
  },
  glb: 'concourse.glb',
  plazas: plazaSpecs,
  corridors,
  surfaces: surfaceRects,
  surfaceRects,
  ramps,
  holes,
  colliders,
  roofRects,
  portals: [
    {
      id: 'MALL-BASEMENT',
      center: [120.5, FLOOR, -128],
      width: 12,
      height: 3.5,
    },
  ],
  notes: [
    'Central plaza ramp is offset to x=18m so the north-south underground corridor remains open.',
    'Consumer must carve all holes from terrain and attach its open mall rear wall at z=-128.',
    'Only flat corridor areas outside plaza and ramp holes receive roofs; plazas are open to the sky.',
    'Ramp surface takes precedence over flat surfaces. No imported textures or proprietary geometry.',
  ],
  stats: {
    triangles,
    drawCalls: scene.children.length,
    bytes: data.byteLength,
  },
};
await writeFile(
  new URL('concourse-manifest.json', out),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    id: manifest.id,
    ...manifest.stats,
    plazas: plazas.length,
    holes: holes.length,
    surfaces: surfaceRects.length,
    colliders: colliders.length,
  }),
);
