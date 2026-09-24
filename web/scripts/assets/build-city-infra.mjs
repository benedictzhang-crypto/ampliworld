/** Original AmpliWorld metropolitan infrastructure: true metres, original geometry. */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import {
  mergeGeometries,
  mergeVertices,
} from 'three/addons/utils/BufferGeometryUtils.js';
import { mkdir, writeFile } from 'node:fs/promises';
import housingPlan from '../../app/world-client/housing-parcels.json' with { type: 'json' };
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
  '../../public/assets/3d/ampliworld/GC-CITY-INFRA-001/',
  import.meta.url,
);
await mkdir(out, { recursive: true });
const GROUND = 0.035,
  ROAD = 0.065,
  ROW = 90,
  MIN_X = -10000,
  MAX_X = 10000,
  MIN_Z = -15000,
  MAX_Z = 15000;
const columns = Array.from({ length: 20 }, (_, i) => (i - 10) * 1000 + 500);
const rows = Array.from({ length: 28 }, (_, i) => (i - 15) * 1000 + 500);
// A surveyed, building-clear curved neighborhood loop. Its four cardinal
// crossings join the existing -4500 m east/west and north/south streets.
const curvedRoads = [{ id: 'SOUTHWEST-GARDEN-LOOP', x: -4500, z: -4500,
  radiusX: 225, radiusZ: 185, carriagewayWidth: 20,
  cycleWidth: 3, sidewalkWidth: 4, segments: 96 }];
const palette = {
  terrain: [0x84957f, 0, 0.95],
  bank: [0x687873, 0, 0.95],
  asphalt: [0x404d53, 0.1, 0.9],
  walk: [0xc4c8bd, 0.05, 0.82],
  cycle: [0x638a81, 0, 0.85],
  gold: [0xc5aa6b, 0.7, 0.33],
  white: [0xe3e1cd, 0.1, 0.7],
  concrete: [0x9aa3a1, 0.03, 0.8],
  water: [0x396d80, 0.3, 0.18],
  fall: [0xaccbcb, 0.1, 0.3],
};
const mats = {},
  buckets = {},
  colliders = [],
  roadrects = [],
  ramps = [],
  surfaces = [],
  endings = [];
for (const [name, [color, metalness, roughness]] of Object.entries(palette))
  mats[name] = new T.MeshStandardMaterial({
    name,
    color,
    metalness,
    roughness,
    side: T.DoubleSide,
  });
function add(g, m) {
  if (g.index) g = g.toNonIndexed();
  delete g.attributes.uv;
  (buckets[m] ??= []).push(g);
}
function quad(m, a, b, c, d) {
  const g = new T.BufferGeometry();
  g.setAttribute(
    'position',
    new T.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3),
  );
  g.computeVertexNormals();
  add(g, m);
}
function slab(m, x0, z0, x1, z1, y0, y1 = y0, axis = 'x') {
  quad(
    m,
    [x0, y0, z0],
    [x0, axis === 'z' ? y1 : y0, z1],
    [x1, y1, z1],
    [x1, axis === 'z' ? y0 : y1, z0],
  );
}
function box(m, x, y, z, w, h, d, collision = false, id = m) {
  const g = new T.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  add(g, m);
  if (collision)
    colliders.push({
      id: `${id}-${colliders.length}`,
      min: [x - w / 2, y - h / 2, z - d / 2],
      max: [x + w / 2, y + h / 2, z + d / 2],
    });
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const bridges = rows.map((z) => ({
  id: `BRIDGE-Z${z}`,
  z,
  xMin: riverX(z) - halfWidth(z) - 270,
  xMax: riverX(z) + halfWidth(z) + 270,
  deckMinX: riverX(z) - halfWidth(z) - 50,
  deckMaxX: riverX(z) + halfWidth(z) + 50,
  y: 6,
  width: 26,
  deckWidth: 90,
  rampLength: 220,
}));
function bridgeHeight(b, x) {
  if (x < b.xMin || x > b.xMax) return ROAD;
  if (x < b.deckMinX) return ROAD + ((6 - ROAD) * (x - b.xMin)) / 220;
  if (x > b.deckMaxX) return ROAD + ((6 - ROAD) * (b.xMax - x)) / 220;
  return 6;
}
function northHeight(x, z) {
  let y = ROAD;
  for (const b of bridges) {
    if (x < b.xMin || x > b.xMax) continue;
    const strength = clamp(1 - (Math.abs(z - b.z) - 45) / 220, 0, 1);
    y = Math.max(y, ROAD + (bridgeHeight(b, x) - ROAD) * strength);
  }
  return y;
}
function coreBlocked(x, z) {
  return Math.abs(x) < 650 && Math.abs(z) < 1150;
}
function northAllowed(x, z) {
  return !coreBlocked(x, z) && Math.abs(x - riverX(z)) >= halfWidth(z) + 50;
}
export function infraGroundHeight(x, z) {
  if (z >= 13200) return -8;
  if (Math.abs(x - riverX(z)) < halfWidth(z)) {
    const b = bridges.find(
      (b) => Math.abs(z - b.z) <= 45 && x >= b.xMin && x <= b.xMax,
    );
    return b ? bridgeHeight(b, x) : -4;
  }
  for (const b of bridges)
    if (Math.abs(z - b.z) <= 45 && !coreBlocked(x, z))
      return bridgeHeight(b, x);
  for (const cx of columns)
    if (Math.abs(x - cx) <= 45 && northAllowed(cx, z))
      return northHeight(cx, z);
  return GROUND;
}
// River banks form actual cut terrain, never a water plane hidden by a giant ground sheet.
const terrainZ = [
  ...new Set([
    MIN_Z,
    -1100,
    1100,
    13000,
    13200,
    ...rows.flatMap((z) => [z - 45, z + 45]),
    ...Array.from({ length: 283 }, (_, i) => MIN_Z + i * 100),
  ]),
]
  .filter((z) => z >= MIN_Z && z <= 13200)
  .sort((a, b) => a - b);
for (let i = 0; i < terrainZ.length - 1; i++) {
  const z0 = terrainZ[i],
    z1 = terrainZ[i + 1],
    zm = (z0 + z1) / 2;
  const l0 = riverX(z0) - halfWidth(z0),
    l1 = riverX(z1) - halfWidth(z1),
    r0 = riverX(z0) + halfWidth(z0),
    r1 = riverX(z1) + halfWidth(z1);
  if (zm > -1100 && zm < 1100) {
    slab('terrain', MIN_X, z0, -600, z1, GROUND);
    quad(
      'terrain',
      [600, GROUND, z0],
      [600, GROUND, z1],
      [l1, GROUND, z1],
      [l0, GROUND, z0],
    );
  } else
    quad(
      'terrain',
      [MIN_X, GROUND, z0],
      [MIN_X, GROUND, z1],
      [l1, GROUND, z1],
      [l0, GROUND, z0],
    );
  quad(
    'terrain',
    [r0, GROUND, z0],
    [r1, GROUND, z1],
    [MAX_X, GROUND, z1],
    [MAX_X, GROUND, z0],
  );
  quad('water', [l0, -4, z0], [l1, -4, z1], [r1, -4, z1], [r0, -4, z0]);
  for (const [a, b] of [
    [l0, l1],
    [r0, r1],
  ])
    quad('bank', [a, GROUND, z0], [b, GROUND, z1], [b, -4, z1], [a, -4, z0]);
  const portal = rows.some((z) => Math.abs(z - zm) < 45);
  if (!portal)
    for (const [a, b] of [
      [l0, l1],
      [r0, r1],
    ]) {
      // Collision uses short conservative boxes around curved bank segments.
      colliders.push({
        id: `river-bank-${i}-${a < riverX(z0) ? 'W' : 'E'}`,
        min: [Math.min(a, b) - 1, GROUND - 4, z0],
        max: [Math.max(a, b) + 1, GROUND + 1.05, z1],
      });
      const length = Math.hypot(b - a, z1 - z0),
        g = new T.BoxGeometry(0.12, 0.12, length);
      g.rotateY(Math.atan2(b - a, z1 - z0));
      g.translate((a + b) / 2, GROUND + 1, (z0 + z1) / 2);
      add(g, 'gold');
      for (let z = z0 + 5; z < z1; z += 20)
        box(
          'concrete',
          a + ((b - a) * (z - z0)) / (z1 - z0),
          GROUND + 0.5,
          z,
          0.2,
          1,
          0.2,
        );
    }
}
slab('water', MIN_X, 13200, MAX_X, MAX_Z, -8);
const mouth = riverX(13200);
quad(
  'fall',
  [mouth - 1000, -4, 13200],
  [mouth - 1000, -8, 13200],
  [mouth + 1000, -8, 13200],
  [mouth + 1000, -4, 13200],
);
for (let i = 0; i < 50; i++)
  box('fall', mouth - 990 + i * 40, -6.1, 13200.12, 4, 3.8, 0.4);
for (const [a, b] of [
  [MIN_X, mouth - 1000],
  [mouth + 1000, MAX_X],
])
  quad(
    'bank',
    [a, GROUND, 13200],
    [a, -8, 13200],
    [b, -8, 13200],
    [b, GROUND, 13200],
  );
const bands = [
  [-45, -43, 'walk'],
  [-43, -36, 'asphalt'],
  [-35, -28, 'asphalt'],
  [-26, -21, 'walk'],
  [-19, -15, 'cycle'],
  [-13, 13, 'asphalt'],
  [15, 19, 'cycle'],
  [21, 26, 'walk'],
  [28, 35, 'asphalt'],
  [36, 43, 'asphalt'],
  [43, 45, 'walk'],
];
// Keep raised sidewalks/cycle bands out of housing driveway mouths.
const housingJunctions = new Map();
for (const p of housingPlan.placements) {
  const road = p.connector?.joinsRoad, points = p.connector?.points;
  if (!road || !points || points.length < 2) continue; // Qingting joins a core road.
  const axis = road.axis, along = axis === 'x' ? 0 : 1, normal = 1 - along;
  const end = points.at(-1), before = points.at(-2);
  const dx = end[0] - before[0], dz = end[1] - before[1], length = Math.hypot(dx, dz);
  if (!length || (axis !== 'x' && axis !== 'z')) continue;
  const direction = [dx / length, dz / length];
  if (Math.abs(direction[normal]) < 0.1) continue;
  // Project the complete driveway through the 90m ROW; add a 2m clear shoulder.
  const halfWidth = (p.connector.width / 2) / Math.abs(direction[normal])
    + ROW / 2 * Math.abs(direction[along] / direction[normal]) + 2;
  const key = axis + ':' + end[normal], list = housingJunctions.get(key) || [];
  list.push({ id: p.id, min: end[along] - halfWidth, max: end[along] + halfWidth });
  housingJunctions.set(key, list);
}
function segment(axis, center, a, b, y0, y1, intersection = false, splitHousing = true) {
  if (b - a < 0.01) return;
  if (splitHousing && !intersection) {
    const joins = (housingJunctions.get(axis + ':' + center) || [])
      .filter((j) => j.max > a && j.min < b);
    if (joins.length) {
      const cuts = [...new Set([a, b, ...joins.flatMap((j) =>
        [Math.max(a, j.min), Math.min(b, j.max)])])].sort((x, z) => x - z);
      for (let i = 1; i < cuts.length; i++) {
        const lo = cuts[i - 1], hi = cuts[i], mid = (lo + hi) / 2;
        const clear = joins.some((j) => mid >= j.min && mid <= j.max);
        segment(axis, center, lo, hi,
          y0 + (y1 - y0) * (lo - a) / (b - a),
          y0 + (y1 - y0) * (hi - a) / (b - a), clear, false);
      }
      return;
    }
  }
  const min = axis === 'x' ? [a, center - 45] : [center - 45, a],
    max = axis === 'x' ? [b, center + 45] : [center + 45, b];
  const entry = { min, max, y: (y0 + y1) / 2, axis, startY: y0, endY: y1 };
  roadrects.push(entry);
  surfaces.push(entry);
  if (Math.abs(y1 - y0) > 0.001)
    ramps.push({
      ...entry,
      lowY: Math.min(y0, y1),
      highY: Math.max(y0, y1),
      slopeAxis: axis,
      ascendingDirection:
        y1 > y0 ? `+${axis.toUpperCase()}` : `-${axis.toUpperCase()}`,
    });
  const face = (m, c0, c1, offset = 0) =>
    axis === 'x'
      ? slab(m, a, center + c0, b, center + c1, y0 + offset, y1 + offset, 'x')
      : slab(m, center + c0, a, center + c1, b, y0 + offset, y1 + offset, 'z');
  face('asphalt', -45, 45);
  if (!intersection) {
    for (const [c0, c1, m] of bands)
      face(m, c0, c1, m === 'walk' ? 0.13 : 0.012);
    for (const offset of [-13.4, 13.4, -27, 27])
      face('white', offset - 0.07, offset + 0.07, 0.021);
    for (let p = Math.ceil(a / 60) * 60; p < b - 8; p += 60) {
      const q = Math.min(p + 8, b),
        t = (p - a) / (b - a),
        u = (q - a) / (b - a),
        ya = y0 + (y1 - y0) * t + 0.025,
        yb = y0 + (y1 - y0) * u + 0.025;
      for (const c of [-6.5, 0, 6.5])
        if (axis === 'x')
          slab('white', p, center + c - 0.07, q, center + c + 0.07, ya, yb);
        else
          slab(
            'white',
            center + c - 0.07,
            p,
            center + c + 0.07,
            q,
            ya,
            yb,
            'z',
          );
    }
  }
}
// East/west owns each crossroads. North/south terminates exactly at its ROW boundaries.
for (const b of bridges) {
  const cuts = [
    MIN_X,
    MAX_X,
    -650,
    650,
    b.xMin,
    b.deckMinX,
    b.deckMaxX,
    b.xMax,
    ...columns.flatMap((x) => [x - 45, x + 45]),
  ]
    .filter((x) => x >= MIN_X && x <= MAX_X)
    .sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i],
      c = cuts[i + 1],
      x = (a + c) / 2;
    if (coreBlocked(x, b.z)) continue;
    const intersection = columns.some(
      (cx) => Math.abs(x - cx) < 45 && northAllowed(cx, b.z),
    );
    segment(
      'x',
      b.z,
      a,
      c,
      bridgeHeight(b, a),
      bridgeHeight(b, c),
      intersection,
    );
  }
  box(
    'concrete',
    (b.deckMinX + b.deckMaxX) / 2,
    5.54,
    b.z,
    b.deckMaxX - b.deckMinX,
    0.9,
    90,
  );
  for (const offset of [-45, 45])
    for (const [a, c] of [
      [b.xMin, b.deckMinX],
      [b.deckMaxX, b.xMax],
    ])
      quad(
        'concrete',
        [a, GROUND, b.z + offset],
        [c, GROUND, b.z + offset],
        [c, bridgeHeight(b, c) - 0.01, b.z + offset],
        [a, bridgeHeight(b, a) - 0.01, b.z + offset],
      );
  for (const offset of [-45, 45]) {
    for (const [a, c] of [
      [b.xMin, b.deckMinX],
      [b.deckMinX, b.deckMaxX],
      [b.deckMaxX, b.xMax],
    ]) {
      const y0 = bridgeHeight(b, a) + 1.15,
        y1 = bridgeHeight(b, c) + 1.15;
      const g = new T.BoxGeometry(c - a, 0.12, 0.16);
      g.rotateZ(Math.atan2(y1 - y0, c - a));
      g.translate((a + c) / 2, (y0 + y1) / 2, b.z + offset);
      add(g, 'gold');
      for (let x = a; x < c; x += 12)
        box(
          'concrete',
          x,
          bridgeHeight(b, x) + 0.53,
          b.z + offset,
          0.25,
          1.06,
          0.25,
        );
    }
    // Sloping ramp rails use sampled colliders; never put an AABB across the carriageway.
    for (let x = b.xMin; x < b.xMax; x += 20) {
      const e = Math.min(x + 20, b.xMax),
        y0 = bridgeHeight(b, x),
        y1 = bridgeHeight(b, e);
      colliders.push({
        id: `${b.id}-rail-${x}-${offset}`,
        min: [x, Math.min(y0, y1), b.z + offset - 0.25],
        max: [e, Math.max(y0, y1) + 1.2, b.z + offset + 0.25],
      });
    }
  }
  for (const x of [b.deckMinX + 55, b.deckMaxX - 55])
    for (const offset of [-31, 31])
      box('concrete', x, 0.5, b.z + offset, 5, 10, 6);
}
for (const x of columns) {
  const cuts = [
    MIN_Z,
    13000,
    -1150,
    1150,
    ...Array.from({ length: 141 }, (_, i) => MIN_Z + i * 200),
    ...rows.flatMap((z) => [z - 265, z - 45, z + 45, z + 265]),
  ]
    .filter((z) => z >= MIN_Z && z <= 13000)
    .sort((a, b) => a - b);
  let prior = false;
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i],
      b = cuts[i + 1],
      z = (a + b) / 2;
    const cross = rows.some((r) => Math.abs(z - r) < 45);
    const allowed =
      northAllowed(x, z) &&
      northAllowed(x, a + 0.1) &&
      northAllowed(x, b - 0.1);
    if (cross) {
      prior = false;
      continue;
    }
    if (!allowed) {
      if (prior) endings.push({ x, z: a, reason: 'RIVER_OR_CORE_AVOIDANCE' });
      prior = false;
      continue;
    }
    segment('z', x, a, b, northHeight(x, a), northHeight(x, b));
    prior = true;
  }
}
for (const e of endings) {
  box('concrete', e.x, 0.38, e.z, 24, 0.65, 0.5, true, 'road-termination');
  box('gold', e.x, 0.76, e.z, 24, 0.12, 0.52);
}
for (const loop of curvedRoads) {
  const edge = (angle, offset) => {
    const cx = Math.cos(angle), sz = Math.sin(angle);
    const nx = cx / loop.radiusX, nz = sz / loop.radiusZ;
    const norm = Math.hypot(nx, nz);
    return [loop.x + loop.radiusX * cx + offset * nx / norm,
      loop.z + loop.radiusZ * sz + offset * nz / norm];
  };
  for (let i = 0; i < loop.segments; i++) {
    const a = 2 * Math.PI * i / loop.segments;
    const b = 2 * Math.PI * (i + 1) / loop.segments;
    for (const [lo, hi, material, lift] of [
      [-20, -16, 'walk', .13], [-16, -13, 'cycle', .02],
      [-13, 13, 'asphalt', 0], [13, 16, 'cycle', .02], [16, 20, 'walk', .13],
      [-13.2, -13.05, 'white', .028], [13.05, 13.2, 'white', .028],
    ]) {
      const p = edge(a, lo), q = edge(a, hi), r = edge(b, hi), s = edge(b, lo);
      quad(material, [p[0], ROAD + lift, p[1]], [q[0], ROAD + lift, q[1]],
        [r[0], ROAD + lift, r[1]], [s[0], ROAD + lift, s[1]]);
    }
  }
}
const scene = new T.Scene();
scene.name = 'GC-CITY-INFRA-001';
let triangles = 0;
for (const [m, list] of Object.entries(buckets)) {
  const g = mergeVertices(mergeGeometries(list, false));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
  const mesh = new T.Mesh(g, mats[m]);
  mesh.name = `GlobalInfra-${m}`;
  mesh.receiveShadow = true;
  scene.add(mesh);
}
const data = await new GLTFExporter().parseAsync(scene, { binary: true });
if (data.byteLength > 25_000_000)
  throw new Error(`Infra GLB exceeds 25MB: ${data.byteLength}`);
await writeFile(new URL('globalinfra.glb', out), Buffer.from(data));
const manifest = {
  id: 'GC-CITY-INFRA-001',
  name: 'AmpliWorld 20 × 30 km metropolitan infrastructure',
  units: 'METERS',
  upAxis: 'Y',
  bounds: { min: [MIN_X, MIN_Z], max: [MAX_X, MAX_Z] },
  groundY: GROUND,
  coreTerrainHole: { min: [-600, -1100], max: [600, 1100] },
  coreRoadExclusion: { min: [-650, -1150], max: [650, 1150] },
  glb: 'globalinfra.glb',
  water: {
    riverFormula: '2320 + 550 * Math.sin(z / 3500)',
    halfWidth: 300,
    westBankPreserved: true,
    y: -4,
    zMin: MIN_Z,
    riverEnd: 13000,
    estuaryEnd: 13200,
    estuaryEndHalfWidth: 1000,
    seaY: -8,
    seaZMin: 13200,
    waterfallZ: 13200,
    waterfallDrop: 4,
  },
  grid: {
    columns,
    rows,
    spacing: 1000,
    rightOfWay: 90,
    carriagewayWidth: 26,
    cycleLaneWidth: 4,
    sidewalkWidth: 5,
    serviceLaneWidth: 7,
    parkingStripWidth: 7,
  },
  bridges,
  curvedRoads,
  roadrects,
  surfaces,
  ramps,
  colliders,
  terminations: endings,
  provenance: {
    creator: 'AmpliWorld',
    type: 'ORIGINAL_PROCEDURAL_GEOMETRY',
    externalAssets: [],
  },
  limitations: [
    'Planning-grade original infrastructure, not finished photoreal city art.',
    'Core terrain and roads remain excluded; core-edge integration is supplied by the consuming scene.',
    'North/south road pieces entering the river corridor are omitted; no road is placed on water.',
    'North/south bridge-approach intersections rise to the matching east/west level over 220m.',
    'Water and landform are static; traffic, ship navigation, hydrology and regional streaming are not implemented.',
  ],
  stats: {
    triangles,
    drawCalls: scene.children.length,
    bytes: data.byteLength,
  },
};
await writeFile(
  new URL('infra-manifest.json', out),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    id: manifest.id,
    ...manifest.stats,
    bridges: bridges.length,
    roadrects: roadrects.length,
    colliders: colliders.length,
  }),
);
