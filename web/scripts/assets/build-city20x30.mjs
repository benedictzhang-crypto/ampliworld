/** Original deterministic city masterplan + metre-space tile assets.
 * Install as web/scripts/assets/build-city20x30.mjs. No imagery/imported meshes.
 * Generated exterior massing, not hand-authored interiors or a calibrated city.
 */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mkdir, writeFile } from 'node:fs/promises';
import metropolitan from '../../app/world-client/metropolitan-plan.json' with { type: 'json' };
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
  '../../public/assets/3d/ampliworld/GC-CITY-2030/',
  import.meta.url,
);
const GROUND = 0.18,
  materials = {},
  tiles = [],
  allBuildings = [],
  overviewRoot = new T.Group();
overviewRoot.name = 'GC-CITY-2030-overview';
let totalTriangles = 0,
  totalCompounds = 0,
  overviewTriangles = 0;
for (const [name, color, metalness, roughness] of [
  ['white', 0xd9ded9, 0.18, 0.45],
  ['ivory', 0xd9cfb6, 0.16, 0.52],
  ['gold', 0xbba06a, 0.65, 0.32],
  ['blue', 0x57798c, 0.7, 0.24],
  ['glass', 0x94b0b8, 0.65, 0.23],
  ['dark', 0x34454d, 0.28, 0.48],
  ['paving', 0x999f9d, 0.05, 0.8],
  ['leaf', 0x587a56, 0, 0.85],
  ['wood', 0x785c46, 0, 0.9],
  ['field', 0x65845c, 0, 0.95],
  ['red', 0xa45d53, 0.05, 0.72],
])
  materials[name] = new T.MeshStandardMaterial({
    name,
    color,
    metalness,
    roughness,
  });
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function riverX(z) {
  return 2200 + 550 * Math.sin(z / 3500);
}
function intersectsCore(x, z, hx, hz) {
  return x + hx > -650 && x - hx < 650 && z + hz > -1150 && z - hz < 1150;
}
function allowed(x, z, hx, hz) {
  if (
    metropolitan.reservedSubcenters.some(
      (r) =>
        x + hx > r.min[0] &&
        x - hx < r.max[0] &&
        z + hz > r.min[1] &&
        z - hz < r.max[1],
    )
  )
    return false;
  if (intersectsCore(x, z, hx, hz) || z + hz > 13000) return false;
  const r = [riverX(z - hz), riverX(z), riverX(z + hz)];
  if (x + hx > Math.min(...r) - 500 && x - hx < Math.max(...r) + 500)
    return false;
  return Math.abs(x) + hx < 10000 && Math.abs(z) + hz < 15000;
}
function addTo(buckets, g, mat, x = 0, y = 0, z = 0, ry = 0) {
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  if (g.index) g = g.toNonIndexed();
  delete g.attributes.uv;
  (buckets[mat] ??= []).push(g);
}
function sceneFrom(buckets, name) {
  const scene = new T.Group();
  scene.name = name;
  let triangles = 0;
  for (const [mat, list] of Object.entries(buckets)) {
    const g = mergeGeometries(list, false);
    if (!g) throw new Error(`Merge: ${name}/${mat}`);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    triangles += g.attributes.position.count / 3;
    const mesh = new T.Mesh(g, materials[mat]);
    mesh.name = `${name}-${mat}`;
    scene.add(mesh);
    for (const source of list) source.dispose();
  }
  return { scene, triangles };
}
function district(x, z) {
  const ns = z < -5000 ? 'North' : z > 5000 ? 'South' : 'Central',
    ew = x < -3300 ? 'West' : x > 3300 ? 'East' : 'Inner';
  return `${ns}-${ew}`;
}
await mkdir(out, { recursive: true });

for (let k = -9; k <= 9; k++)
  for (let j = -14; j <= 12; j++) {
    const cx = k * 1000,
      cz = j * 1000,
      id = `GC-TILE-${String(k + 10).padStart(2, '0')}-${String(j + 15).padStart(2, '0')}`;
    const seed = (((k + 23) * 73856093) ^ ((j + 31) * 19349663)) >>> 0,
      random = rng(seed),
      buckets = {},
      overviewBuckets = {},
      colliders = [],
      buildings = [],
      compounds = [];
    const add = (g, m, x = 0, y = 0, z = 0, r = 0) =>
      addTo(buckets, g, m, x, y, z, r);
    const box = (m, x, y, z, w, h, d) =>
      add(new T.BoxGeometry(w, h, d), m, x, y, z);
    const solid = (name, min, max) => {
      const c = { id: name, min, max };
      colliders.push(c);
      return c;
    };
    const cylinder = (m, x, y, z, top, bottom, h, n = 10) =>
      add(new T.CylinderGeometry(top, bottom, h, n), m, x, y, z);
    const tree = (x, z) => {
      cylinder('wood', x, GROUND + 1.25, z, 0.18, 0.24, 2.5, 5);
      add(new T.IcosahedronGeometry(2.2, 0), 'leaf', x, GROUND + 3.8, z);
    };
    const inner = Math.hypot(cx, cz * 0.7) < 7000;
    const offsets = inner
      ? [
          [-210, -210],
          [210, -210],
          [-210, 210],
          [210, 210],
        ]
      : (k + j) % 2
        ? [
            [-210, -210],
            [210, 210],
          ]
        : [
            [210, -210],
            [-210, 210],
          ];
    for (const [qi, [dx, dz]] of offsets.entries()) {
      const px = cx + dx,
        pz = cz + dz;
      if (!allowed(px, pz, 174, 174)) continue;
      const compoundId = `${id}-C${qi}`,
        cseed = (seed + qi * 1140071481) >>> 0,
        cr = rng(cseed);
      const wealth = cr(),
        civicRoll = cr();
      let kind =
        civicRoll < 0.025
          ? 'hospital'
          : civicRoll < 0.06
            ? 'school'
            : civicRoll < 0.074
              ? 'cyber-church'
              : wealth > 0.77
                ? 'high-end'
                : wealth < 0.32
                  ? 'working-residential'
                  : inner && wealth > 0.53
                    ? 'office-campus'
                    : 'middle-residential';
      const compound = {
        id: compoundId,
        x: px,
        z: pz,
        dimensionsMeters: [340, 340],
        district: district(px, pz),
        type: kind,
        buildingIds: [],
        seed: cseed,
        entrance: [px, GROUND, pz + 170],
        interiorStatus: 'Exterior massing only',
      };
      compounds.push(compound);
      totalCompounds++;
      box('paving', px, 0.085, pz, 338, 0.17, 338);
      // Four perimeter driveways enclose a pedestrian courtyard. No public ROW.
      for (const sx of [-1, 1])
        box('dark', px + sx * 148, 0.179, pz, 12, 0.018, 302);
      for (const sz of [-1, 1])
        box('dark', px, 0.179, pz + sz * 148, 302, 0.018, 12);
      box('ivory', px, 0.2, pz, 80, 0.04, 72);
      if (kind !== 'school')
        for (const sx of [-1, 1])
          for (const sz of [-1, 1]) tree(px + sx * 30, pz + sz * 25);
      if (
        kind === 'working-residential' ||
        kind === 'middle-residential' ||
        kind === 'high-end'
      ) {
        const wh = kind === 'high-end' ? 2.2 : 1.8;
        for (const sx of [-1, 1]) {
          box('ivory', px + sx * 169, GROUND + wh / 2, pz, 1, wh, 338);
          solid(
            `${compoundId}-wall-x${sx}`,
            [px + sx * 169 - 0.5, GROUND, pz - 169],
            [px + sx * 169 + 0.5, GROUND + wh, pz + 169],
          );
        }
        box('ivory', px, GROUND + wh / 2, pz - 169, 338, wh, 1);
        solid(
          `${compoundId}-wall-back`,
          [px - 169, GROUND, pz - 169.5],
          [px + 169, GROUND + wh, pz - 168.5],
        );
        for (const sx of [-1, 1]) {
          box('ivory', px + sx * 89, GROUND + wh / 2, pz + 169, 160, wh, 1);
          solid(
            `${compoundId}-front-${sx}`,
            [px + sx * 89 - 80, GROUND, pz + 168.5],
            [px + sx * 89 + 80, GROUND + wh, pz + 169.5],
          );
        }
        // Actual 18 m gap, with no spanning closed collision box.
        for (const sx of [-1, 1]) {
          box('gold', px + sx * 9.5, GROUND + 2.1, pz + 169, 1, 4.2, 2);
          solid(
            `${compoundId}-gatepost-${sx}`,
            [px + sx * 9.5 - 0.5, GROUND, pz + 168],
            [px + sx * 9.5 + 0.5, GROUND + 4.2, pz + 170],
          );
        }
        if (kind === 'high-end') {
          // Visible private basement gate. Closed: no fake traversable garage.
          box('dark', px + 122, GROUND + 2, pz + 123, 13, 4, 0.5);
          box('gold', px + 122, GROUND + 4.1, pz + 123, 14, 0.25, 1);
          for (let q = 0; q < 9; q++)
            box(
              'gold',
              px + 116 + q * 1.5,
              GROUND + 2,
              pz + 123.32,
              0.08,
              3.8,
              0.08,
            );
          solid(
            `${compoundId}-basement-closed-gate`,
            [px + 115, GROUND, pz + 122.5],
            [px + 129, GROUND + 4.25, pz + 123.5],
          );
          compound.basementEntrance = {
            anchor: [px + 122, GROUND, pz + 125],
            state: 'closed-gate',
            garageBuilt: false,
          };
        }
      }
      const slots = [
        [-100, -92],
        [0, -92],
        [100, -92],
        [-100, 88],
        [0, 88],
        [100, 88],
      ];
      for (const [bi, [bx, bz]] of slots.entries()) {
        const x = px + bx,
          z = pz + bz,
          bid = `${compoundId}-B${bi}`,
          br = rng((cseed + bi * 2654435761) >>> 0);
        let w = 26 + br() * 18,
          d = 29 + br() * 21,
          h = 18 + br() * 35,
          type = kind,
          variant = Math.floor(br() * 5),
          mat = ['white', 'ivory', 'blue', 'glass'][Math.floor(br() * 4)];
        if (kind === 'high-end') {
          w = 34 + br() * 15;
          d = 35 + br() * 15;
          h = 26 + br() * 55;
        }
        if (kind === 'office-campus') {
          w = 32 + br() * 20;
          d = 34 + br() * 19;
          h = 55 + br() * 105;
        }
        if (kind === 'hospital') {
          w = 43;
          d = 40;
          h = bi === 1 ? 53 : 18 + br() * 16;
          mat = 'white';
        }
        if (kind === 'school') {
          w = 45;
          d = 29;
          h = 12 + br() * 9;
          mat = 'ivory';
        }
        if (kind === 'cyber-church' && bi > 0) {
          w = 25;
          d = 29;
          h = 9 + br() * 10;
          mat = 'white';
          type = 'church-annex';
        }
        const min = [x - w / 2, GROUND, z - d / 2],
          max = [x + w / 2, GROUND + h, z + d / 2];
        const bc = [];
        if (kind === 'cyber-church' && bi === 0) {
          type = 'cyber-church-main';
          w = 50;
          d = 52;
          h = 61;
          box('white', x, GROUND + 8, z, 50, 16, 52);
          const dome = new T.SphereGeometry(
            20,
            12,
            6,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          );
          add(dome, 'gold', x, GROUND + 16, z);
          for (const sx of [-1, 1]) {
            cylinder('white', x + sx * 19, GROUND + 27, z + 17, 2.5, 4, 54, 8);
            add(
              new T.ConeGeometry(3.2, 7, 8),
              'gold',
              x + sx * 19,
              GROUND + 57.5,
              z + 17,
            );
          }
          const arch = new T.TorusGeometry(10, 1.2, 4, 16, Math.PI);
          add(arch, 'gold', x, GROUND + 11, z + 27);
          bc.push(
            solid(
              `${bid}-body`,
              [x - 25, GROUND, z - 26],
              [x + 25, GROUND + 16, z + 26],
            ),
          );
          for (const sx of [-1, 1])
            bc.push(
              solid(
                `${bid}-spire-${sx}`,
                [x + sx * 19 - 4, GROUND, z + 13],
                [x + sx * 19 + 4, GROUND + 61, z + 21],
              ),
            );
        } else {
          // Every variant is fully volumetric, sealed and genuinely grounded.
          const baseH = Math.min(5, h * 0.16);
          box('dark', x, GROUND + baseH / 2, z, w, baseH, d);
          if (variant === 0 || kind === 'office-campus') {
            const radius = Math.min(w, d) / 2,
              g = new T.CylinderGeometry(
                radius * (0.68 + br() * 0.22),
                radius,
                h - baseH,
                10,
              );
            g.scale(w / (radius * 2), 1, d / (radius * 2));
            add(g, mat, x, GROUND + baseH + (h - baseH) / 2, z);
            for (const f of [0.3, 0.6, 0.86]) {
              const r = radius * (1 - 0.24 * f);
              const band = new T.CylinderGeometry(r, r, 0.5, 10);
              band.scale(w / (radius * 2), 1, d / (radius * 2));
              add(band, 'gold', x, GROUND + h * f, z);
            }
          } else if (variant === 1) {
            box(mat, x, GROUND + h * 0.31, z, w, h * 0.62, d);
            box(
              mat,
              x + w * 0.09,
              GROUND + h * 0.81,
              z - d * 0.06,
              w * 0.72,
              h * 0.38,
              d * 0.76,
            );
            box(
              'gold',
              x + w * 0.09,
              GROUND + h * 0.985,
              z - d * 0.06,
              w * 0.74,
              h * 0.03,
              d * 0.78,
            );
          } else if (variant === 2) {
            box(mat, x - w * 0.17, GROUND + h / 2, z, w * 0.66, h, d * 0.8);
            box(
              'glass',
              x + w * 0.28,
              GROUND + h * 0.38,
              z + d * 0.1,
              w * 0.44,
              h * 0.76,
              d * 0.8,
            );
            box(
              'white',
              x - w * 0.17,
              GROUND + h - 0.22,
              z,
              w * 0.67,
              0.44,
              d * 0.82,
            );
          } else {
            box(mat, x, GROUND + h / 2, z, w, h, d);
            box(
              variant === 3 ? 'gold' : 'white',
              x,
              GROUND + h - 0.3,
              z,
              w + 1,
              0.6,
              d + 1,
            );
            for (const sx of [-1, 1])
              box(
                'glass',
                x + sx * (w / 2 + 0.055),
                GROUND + h * 0.53,
                z,
                0.1,
                h * 0.71,
                d * 0.72,
              );
            for (const sz of [-1, 1])
              box(
                'glass',
                x,
                GROUND + h * 0.53,
                z + sz * (d / 2 + 0.055),
                w * 0.73,
                h * 0.71,
                0.1,
              );
          }
          // Street-scale entrance canopy and roof plant screen.
          box('gold', x, GROUND + 3.9, z + d / 2 + 1.8, w * 0.42, 0.24, 4.2);
          box('dark', x, GROUND + h + 0.65, z, w * 0.24, 1.3, d * 0.22);
          h += 1.3;
          bc.push(
            solid(
              `${bid}-envelope`,
              [x - w / 2 - 0.5, GROUND, z - d / 2 - 0.5],
              [x + w / 2 + 0.5, GROUND + h, z + d / 2 + 0.5],
            ),
          );
          bc.push(
            solid(
              `${bid}-canopy`,
              [x - w * 0.21, GROUND + 3.78, z + d / 2 - 0.3],
              [x + w * 0.21, GROUND + 4.02, z + d / 2 + 3.9],
            ),
          );
        }
        if (kind === 'hospital' && bi === 1) {
          box('red', x, GROUND + h * 0.66, z + d / 2 + 0.6, 2.1, 9, 0.3);
          box('red', x, GROUND + h * 0.66, z + d / 2 + 0.7, 8, 2.1, 0.3);
        }
        const record = {
          id: bid,
          tileId: id,
          compoundId,
          district: compound.district,
          type,
          position: [x, GROUND, z],
          dimensionsMeters: { width: w, depth: d, height: h },
          footprint: {
            min: [x - w / 2, z - d / 2],
            max: [x + w / 2, z + d / 2],
          },
          colliders: bc,
          variant,
          parameterSignature: `${bid}:${variant}:${w.toFixed(4)}:${d.toFixed(4)}:${h.toFixed(4)}:${mat}`,
          provenance:
            'Original deterministic procedural variant; no claim of unique hand authoring',
          interiorBuilt: false,
        };
        buildings.push(record);
        allBuildings.push(record);
        compound.buildingIds.push(bid);
        // Far representation uses the SAME position and footprint, not duplicates
        // in the near scene. Root enables this separate file only in overview.
        addTo(
          overviewBuckets,
          new T.BoxGeometry(w, h, d),
          mat === 'blue' || mat === 'glass' ? 'blue' : 'white',
          x,
          GROUND + h / 2,
          z,
        );
      }
      if (kind === 'school') {
        box('field', px, 0.205, pz, 92, 0.03, 63);
        for (const sx of [-1, 1])
          box('white', px + sx * 43, 0.224, pz, 0.25, 0.012, 58);
        for (const sz of [-1, 1])
          box('white', px, 0.224, pz + sz * 29, 86, 0.012, 0.25);
        box('white', px, 0.224, pz, 0.25, 0.012, 58);
        for (const sx of [-1, 1]) {
          box('white', px + sx * 44, 1.7, pz - 5, 0.15, 3, 0.15);
          box('white', px + sx * 44, 1.7, pz + 5, 0.15, 3, 0.15);
          box('white', px + sx * 44, 3.2, pz, 0.15, 0.15, 10);
        }
        compound.campusFeatures = [
          'six teaching blocks',
          'marked outdoor sports field',
          'goal frames',
        ];
      }
      if (kind === 'hospital')
        compound.campusFeatures = [
          'clinical tower',
          'five clinical/support buildings',
          'medical cross marker',
          'perimeter service drive',
        ];
      if (kind === 'cyber-church')
        compound.campusFeatures = [
          'solid sanctuary',
          'gold dome',
          'dimensional entrance arch',
          'paired spires',
          'five annexes',
        ];
    }
    if (!buildings.length) continue;
    const { scene, triangles } = sceneFrom(buckets, id);
    totalTriangles += triangles;
    if (totalTriangles > 2000000)
      throw new Error(
        `City geometry exceeds 2m triangle budget at ${id}: ${totalTriangles}`,
      );
    const file = `${id}.glb`,
      glb = await new GLTFExporter().parseAsync(scene, {
        binary: true,
        onlyVisible: true,
      });
    await writeFile(new URL(file, out), Buffer.from(glb));
    const bounds = new T.Box3().setFromObject(scene);
    tiles.push({
      id,
      cx,
      cz,
      file,
      absoluteCoordinates: true,
      district: district(cx, cz),
      groundY: GROUND,
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      colliders,
      buildingIds: buildings.map((b) => b.id),
      compounds,
      stats: {
        buildings: buildings.length,
        triangles,
        drawCalls: scene.children.length,
      },
    });
    const overviewTile = sceneFrom(overviewBuckets, id);
    overviewRoot.add(overviewTile.scene);
    overviewTriangles += overviewTile.triangles;
    for (const mesh of scene.children) mesh.geometry.dispose();
  }
await writeFile(
  new URL('city-overview.glb', out),
  Buffer.from(
    await new GLTFExporter().parseAsync(overviewRoot, {
      binary: true,
      onlyVisible: true,
    }),
  ),
);
await writeFile(
  new URL('city-buildings.json', out),
  JSON.stringify({ buildings: allBuildings }) + '\n',
);
const manifest = {
  id: 'GC-CITY-2030',
  version: 1,
  units: 'meters',
  absoluteCoordinates: true,
  bounds: { min: [-10000, -15000], max: [10000, 15000] },
  groundY: GROUND,
  status:
    'Full-extent generated district masterplan and streamed exterior massing; not a finished detailed city',
  reservedCore: { min: [-650, -1150], max: [650, 1150] },
  reservedSubcenters: metropolitan.reservedSubcenters,
  river: {
    centerline: 'x=2320+550*sin(z/3500)',
    halfWidth: 300,
    planningBufferCenterline: 'x=2200+550*sin(z/3500)',
    noBuildBuffer: 500,
  },
  coast: { noBuildingsSouthOfZ: 13000 },
  roads: {
    verticalCenters: '1000*k+500, k=-10..9',
    horizontalCenters: '1000*j+500, j=-15..14',
    rightOfWayHalfWidth: 45,
    geometryOwner: 'separate infrastructure generator',
  },
  buildingMetadataFile: 'city-buildings.json',
  streaming: {
    tileSizeMeters: 1000,
    suggestedWalkingLoadRadiusMeters: 1500,
    overviewFile: 'city-overview.glb',
    overviewTileGroupNames:
      'Exactly equal to tile.id; hide group when detail GLB is ready',
    overviewMaterialsPerTile: 2,
  },
  generation: {
    deterministic: true,
    compoundMaxSize: [340, 340],
    buildingVariants:
      'Seeded dimensions, heights, materials, crowns and mass combinations; procedural variants, not hand-authored unique buildings',
  },
  tiles,
  stats: {
    tiles: tiles.length,
    compounds: totalCompounds,
    buildings: allBuildings.length,
    triangles: totalTriangles,
    overviewTriangles,
  },
  provenance: {
    author: 'AmpliWorld',
    original: true,
    externalImages: [],
    externalMeshes: [],
  },
  limitations: [
    'No interiors, working lifts or accessible underground garages generated.',
    'High-end basement gates are visibly closed.',
    'Roads/sidewalks/utilities and full functional economy integration are separate.',
    'Simple exterior collision envelopes remain conservative.',
  ],
};
await writeFile(
  new URL('city-manifest.json', out),
  JSON.stringify(manifest) + '\n',
);
process.stdout.write(JSON.stringify(manifest.stats) + '\n');
