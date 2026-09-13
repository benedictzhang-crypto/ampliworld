/** Original AmpliWorld B1 mall garage. Install as scripts/assets/build-mall-garage.mjs.
 * LOCAL coordinates relative to mall placement (world0,-188). No imported art.
 */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontJson from 'three/examples/fonts/helvetiker_regular.typeface.json' with { type: 'json' };
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
  '../../public/assets/3d/ampliworld/GC-MALL-GARAGE-001/',
  import.meta.url,
);
const FLOOR = -4.2,
  CEILING = -0.45,
  buckets = {},
  materials = {},
  colliders = [],
  surfaces = [],
  bays = [],
  cars = [];
const font = new FontLoader().parse(fontJson);
for (const [name, color, metalness, roughness] of [
  ['charcoal', 0x36444c, 0.1, 0.73],
  ['concrete', 0xaeb7b8, 0.07, 0.81],
  ['ivory', 0xd9dfdb, 0.14, 0.5],
  ['gold', 0xc4a566, 0.73, 0.29],
  ['zoneBlue', 0x3f7390, 0.23, 0.47],
  ['zoneGreen', 0x52847a, 0.19, 0.52],
  ['steel', 0xa7b8c0, 0.84, 0.25],
  ['dark', 0x1e303c, 0.3, 0.44],
  ['light', 0xffe9bc, 0.2, 0.3],
  ['carBlue', 0x557990, 0.82, 0.25],
  ['carWhite', 0xd7dedb, 0.67, 0.25],
  ['carGold', 0xc1ab88, 0.76, 0.3],
  ['carRed', 0x954e4a, 0.73, 0.27],
  ['carSilver', 0x97a6ad, 0.82, 0.25],
  ['rubber', 0x14202a, 0.03, 0.91],
  ['glass', 0x2a4758, 0.6, 0.18],
  ['red', 0xcf6656, 0.12, 0.48],
])
  materials[name] = new T.MeshStandardMaterial({
    name,
    color,
    metalness,
    roughness,
  });
materials.light.emissive = new T.Color(0xffdda0);
materials.light.emissiveIntensity = 0.95;
function add(g, m, x = 0, y = 0, z = 0, ry = 0) {
  if (ry) g.rotateY(ry);
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
function slab(id, x0, z0, x1, z1) {
  box(
    'charcoal',
    (x0 + x1) / 2,
    FLOOR - 0.1,
    (z0 + z1) / 2,
    x1 - x0,
    0.2,
    z1 - z0,
  );
  surfaces.push({ id, min: [x0, z0], max: [x1, z1], y: FLOOR });
}
function wall(id, x0, z0, x1, z1) {
  const w = x1 - x0,
    d = z1 - z0;
  box(
    'concrete',
    (x0 + x1) / 2,
    (FLOOR + CEILING) / 2,
    (z0 + z1) / 2,
    w,
    CEILING - FLOOR,
    d,
  );
  solid(id, [x0, FLOOR, z0], [x1, CEILING, z1]);
}
function rod(m, a, b, r = 0.05, n = 7) {
  const p = new T.Vector3(...a),
    q = new T.Vector3(...b),
    d = q.clone().sub(p),
    g = new T.CylinderGeometry(r, r, d.length(), n);
  g.applyQuaternion(
    new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      d.normalize(),
    ),
  );
  const c = p.add(q).multiplyScalar(0.5);
  add(g, m, c.x, c.y, c.z);
}
function label(text, x, y, z, size = 1, ry = 0, flat = false, mat = 'ivory') {
  const g = new TextGeometry(text, {
    font,
    size,
    depth: 0.008,
    curveSegments: 2,
    bevelEnabled: false,
  });
  g.computeBoundingBox();
  g.translate(-(g.boundingBox.max.x - g.boundingBox.min.x) / 2, 0, 0);
  if (flat) g.rotateX(-Math.PI / 2);
  add(g, mat, x, y, z, ry);
}
// MALL-APPROACH pedestrian concourse is x114.5..126.5,z-132..60 in
// mall-local coordinates. This garage never enters that existing corridor.
slab('garage-floor', -104, -85, 114, 70);
slab('west-turn-mouth', 114, 62, 115, 70);
box('concrete', 5, CEILING + 0.1, -7.5, 218, 0.2, 155);
solid('garage-ceiling', [-104, CEILING, -85], [114, CEILING + 0.2, 70]);
// No geometry at all across the open descent x115..126,z72..108.
wall('west-wall', -104, -85, -103.55, 70);
wall('north-wall', -104, -85, 114, -84.55);
wall('south-wall', -104, 69.55, 114, 70);
wall('east-wall-concourse-separation', 113.5, -85, 113.95, 61.5);
// Portal remains open along eastx114, z62..70; no gate or threshold step.
box('gold', 113.99, -0.78, 66, 0.22, 0.32, 8);
label('B1  PARKING', 108, -1.65, 65.8, 0.8, Math.PI / 2);
solid('portal-lintel', [113.88, -0.94, 62], [114.1, -0.62, 70]);
label('WELCOME', 101, -4.175, 65, 1.25, Math.PI / 2, true, 'gold');

// Premium two-bank layout:176 large marked bays, mostly intentionally empty.
const rowZ = [-62, -37, -5, 20],
  bankStarts = [-95, 20];
for (let r = 0; r < rowZ.length; r++)
  for (let bank = 0; bank < 2; bank++)
    for (let q = 0; q < 22; q++) {
      const x = bankStarts[bank] + q * 3.3,
        z = rowZ[r],
        id = `B1-${String.fromCharCode(65 + r)}${bank + 1}-${String(q + 1).padStart(2, '0')}`;
      bays.push({
        id,
        center: [x, FLOOR, z],
        width: 3.15,
        length: 6,
        zone: String.fromCharCode(65 + r),
      });
      for (const s of [-1, 1])
        box('ivory', x + s * 1.57, FLOOR + 0.007, z, 0.075, 0.014, 6);
      box('ivory', x, FLOOR + 0.007, z + 3, 3.15, 0.014, 0.075);
      box(
        r % 2 ? 'zoneGreen' : 'zoneBlue',
        x,
        FLOOR + 0.006,
        z + 2.65,
        3,
        0.012,
        0.55,
      );
      box('concrete', x, FLOOR + 0.1, z + 2.25, 1.7, 0.2, 0.16);
      solid(
        `wheel-stop-${id}`,
        [x - 0.85, FLOOR, z + 2.17],
        [x + 0.85, FLOOR + 0.2, z + 2.33],
      );
      if (q % 4 === 0)
        label(id, x, FLOOR + 0.016, z + 2.85, 0.34, Math.PI, true);
    }
// Wide unobstructed aisle junctions; painted arrows point into the garage.
for (const z of [-49.5, -21, 41, 64])
  for (const x of [-75, -25, 35, 87]) {
    box('gold', x, FLOOR + 0.01, z, 4, 0.02, 0.14);
    const g = new T.ConeGeometry(0.48, 0.95, 3);
    g.rotateZ(-Math.PI / 2);
    g.scale(1, 0.08, 1);
    add(g, 'gold', x - 2.3, FLOOR + 0.035, z);
  }
// A marked pedestrian promenade remains clear along the central north/south axis.
box('zoneBlue', 4, FLOOR + 0.006, -7, 5, 0.012, 145);
for (const x of [1.3, 6.7]) box('gold', x, FLOOR + 0.014, -7, 0.13, 0.02, 145);
for (const z of [41, 63])
  for (let x = -96; x < 105; x += 3)
    box('ivory', x, FLOOR + 0.016, z, 1.35, 0.016, 2.8);
label('B1', -10, FLOOR + 0.022, 55, 5.5, 0, true, 'gold');
label('GOLDEN GALLERY', -10, FLOOR + 0.022, 47, 1.0, 0, true, 'ivory');

// Genuine columns, protected bases and readable zone bands.
for (const x of [-99, -47, 10, 63, 106])
  for (const z of [-76, -23, 49]) {
    box('concrete', x, (FLOOR + CEILING) / 2, z, 0.95, CEILING - FLOOR, 0.95);
    box('zoneBlue', x, FLOOR + 0.95, z, 1.0, 1.9, 1.0);
    box('gold', x, FLOOR + 0.23, z, 1.22, 0.46, 1.22);
    solid(
      `column-${x}-${z}`,
      [x - 0.61, FLOOR, z - 0.61],
      [x + 0.61, CEILING, z + 0.61],
    );
    label('B1', x, FLOOR + 1.25, z + 0.515, 0.36);
  }
for (const [i, z] of [-72, -47, -15, 11, 42].entries()) {
  // Ceiling fittings are solid luminous strips, with steel housings.
  for (const x of [-77, -43, -9, 25, 59, 93]) {
    box('dark', x, -0.67, z, 19, 0.14, 0.75);
    solid(
      `light-housing-${x}-${z}`,
      [x - 9.5, -0.77, z - 0.375],
      [x + 9.5, -0.6, z + 0.375],
    );
    box('light', x, -0.752, z, 18.6, 0.036, 0.43);
  }
  rod('steel', [-100, -0.97, z + 7], [110, -0.97, z + 7], 0.13, 8);
  for (const x of [-86, -35, 16, 67])
    rod('steel', [x, -0.96, z + 7], [x, -0.56, z + 7], 0.027, 5);
  // Zone graphics on small hung signs; bottom above2.6m from floor.
  box('zoneBlue', -4, -1.13, z, 6, 0.7, 0.15);
  solid(`suspended-sign-${z}`, [-7, -1.48, z - 0.075], [-1, -0.78, z + 0.1]);
  solid(`transverse-pipe-${z}`, [-100, -1.1, z + 6.87], [110, -0.84, z + 7.13]);
  label(`B1  ${String.fromCharCode(65 + i)}`, -4, -1.34, z + 0.085, 0.48);
}
for (const x of [-73, 41]) {
  box('steel', x, -0.87, -6, 1.3, 0.34, 142);
  solid(`ventilation-duct-${x}`, [x - 0.65, -1.071, -77], [x + 0.65, -0.7, 65]);
  for (let z = -72; z < 61; z += 18) {
    box('dark', x, -1.045, z, 0.9, 0.015, 2.4);
    for (let q = 0; q < 7; q++)
      box('steel', x, -1.061, z - 1.0 + q * 0.33, 0.91, 0.019, 0.055);
  }
}

// Original lightweight closed cars: sedan, coupe, SUV and van proportions.
function vehicle(x, z, kind, color, index, flip = false) {
  const isTall = kind === 'SUV' || kind === 'van',
    length = kind === 'van' ? 5.3 : kind === 'coupe' ? 4.65 : 5.0,
    width = isTall ? 1.99 : 1.9,
    height = kind === 'van' ? 2.12 : kind === 'SUV' ? 1.83 : 1.49;
  const scaleX = length / 4.8,
    scaleY = height / 1.49,
    scaleZ = width / 1.88;
  const emit = (g, m, a = 0, b = 0, c = 0) => {
    g.translate(a, b, c);
    g.scale(scaleX, scaleY, scaleZ);
    g.rotateY(flip ? -Math.PI / 2 : Math.PI / 2);
    add(g, m, x, FLOOR, z);
  };
  const b = (m, a, y, c, w, h, d) =>
    emit(new T.BoxGeometry(w, h, d), m, a, y, c);
  const shape = new T.Shape();
  shape.moveTo(-2.4, 0.27);
  shape.bezierCurveTo(-2.4, 0.66, -1.92, 0.9, -1.2, 0.93);
  shape.lineTo(1.12, 0.94);
  shape.bezierCurveTo(1.8, 0.9, 2.35, 0.7, 2.4, 0.35);
  shape.lineTo(2.27, 0.25);
  shape.lineTo(-2.23, 0.25);
  shape.closePath();
  const body = new T.ExtrudeGeometry(shape, {
    depth: 1.75,
    bevelEnabled: true,
    bevelSize: 0.026,
    bevelThickness: 0.026,
    bevelSegments: 1,
    curveSegments: 5,
  });
  body.translate(0, 0, -0.875);
  emit(body, color);
  const roof = new T.Shape();
  roof.moveTo(-1.16, 0.9);
  roof.lineTo(-0.67, 1.43);
  roof.quadraticCurveTo(0.1, 1.5, 0.72, 1.4);
  roof.lineTo(1.34, 0.93);
  roof.closePath();
  const glazing = new T.ExtrudeGeometry(roof, {
    depth: 1.49,
    bevelEnabled: false,
    curveSegments: 5,
  });
  glazing.translate(0, 0, -0.745);
  emit(glazing, 'glass');
  b(color, 0.1, 1.438, 0, 1.3, 0.075, 1.53);
  if (kind === 'van') b(color, 0.77, 1.13, 0, 0.38, 0.55, 1.55);
  for (const a of [-1.45, 1.42])
    for (const c of [-0.91, 0.91]) {
      const tyre = new T.TorusGeometry(0.245, 0.085, 6, 20);
      emit(tyre, 'rubber', a, 0.33, c);
      const rim = new T.CylinderGeometry(0.224, 0.224, 0.025, 12);
      rim.rotateX(Math.PI / 2);
      emit(rim, 'steel', a, 0.33, c + (c > 0 ? 0.054 : -0.054));
      for (let q = 0; q < 5; q++) {
        const g = new T.BoxGeometry(0.029, 0.37, 0.03);
        g.rotateZ((q * Math.PI) / 5);
        emit(g, 'gold', a, 0.33, c + (c > 0 ? 0.075 : -0.075));
      }
    }
  for (const c of [-0.62, 0.62]) {
    b('light', -2.375, 0.65, c, 0.025, 0.07, 0.36);
    b('red', 2.37, 0.65, c, 0.027, 0.06, 0.33);
  }
  b('dark', -2.397, 0.42, 0, 0.024, 0.13, 0.91);
  for (const c of [-0.758, 0.758]) b(color, 0.13, 1.17, c, 0.072, 0.55, 0.024);
  const hx = width / 2 + 0.08,
    hz = length / 2 + 0.06,
    id = `garage-car-${index}`;
  solid(id, [x - hx, FLOOR, z - hz], [x + hx, FLOOR + height + 0.05, z + hz]);
  cars.push({
    id,
    type: kind,
    position: [x, FLOOR, z],
    yaw: flip ? -Math.PI / 2 : Math.PI / 2,
    dimensions: [width, height, length],
    original: true,
  });
}
//24 cars spread through different zones;152 bays remain genuinely empty.
let ci = 0;
for (let r = 0; r < 4; r++)
  for (const [bank, q] of [
    [0, 1],
    [0, 7],
    [0, 15],
    [1, 3],
    [1, 11],
    [1, 19],
  ]) {
    vehicle(
      bankStarts[bank] + q * 3.3,
      rowZ[r],
      ['sedan', 'SUV', 'coupe', 'sedan', 'van', 'coupe'][ci % 6],
      ['carBlue', 'carWhite', 'carGold', 'carSilver', 'carRed'][ci % 5],
      ci,
      r % 2 === 0,
    );
    ci++;
  }
// Service/emergency equipment with discrete object collision, never aisle walls.
for (const x of [-92, -8, 89]) {
  box('red', x, -2.8, -84.22, 0.7, 1.2, 0.24);
  solid(`fire-cabinet-${x}`, [x - 0.36, -3.4, -84.4], [x + 0.36, -2.2, -84.05]);
}
label('GOLDEN CITY / B1', -40, -2.0, -84.25, 1.2);
label('EXIT  >', 90, -2.0, 69.28, 1.4, Math.PI);

const scene = new T.Group();
scene.name = 'Golden Gallery B1';
let triangles = 0;
for (const [name, list] of Object.entries(buckets)) {
  const g = mergeGeometries(list, false);
  if (!g) throw new Error(`Merge failed:${name}`);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  for (const n of g.attributes.position.array)
    if (!Number.isFinite(n)) throw new Error('Non-finite garage geometry');
  triangles += g.attributes.position.count / 3;
  const obj = new T.Mesh(g, materials[name]);
  obj.name = `GC-MALL-GARAGE-001-${name}`;
  scene.add(obj);
  for (const source of list) source.dispose();
}
if (triangles > 100000)
  throw new Error(`Garage exceeds100k triangle target:${triangles}`);
scene.updateMatrixWorld(true);
const bounds = new T.Box3().setFromObject(scene);
const manifest = {
  id: 'GC-MALL-GARAGE-001',
  name: 'Golden Gallery B1',
  nameZh: '鎏金广场地下停车场',
  version: 1,
  units: 'meters',
  file: 'garage.glb',
  coordinateSystem: 'Mall-local Y-up; place at world[0,0,-188]',
  bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  floorY: FLOOR,
  ceilingUndersideY: CEILING,
  structuralClearanceMeters: 3.75,
  minimumServicesClearanceMeters: 2.72,
  colliders,
  surfaces,
  triangles,
  materialDrawCalls: scene.children.length,
  bays,
  cars,
  stats: {
    bays: bays.length,
    cars: cars.length,
    emptyBays: bays.length - cars.length,
  },
  entry: [114.5, 66],
  entrance: [114.5, 66],
  portal: {
    axis: 'x',
    x: 114.5,
    zMin: 62,
    zMax: 70,
    floorY: FLOOR,
    clearHeight: 3.26,
    directionIntoGarage: '-X',
    requiredLegacyOpening: {
      colliderId: 'b1-vestibule-wall-114.825',
      removeSection: { zMin: 62, zMax: 70 },
      preservePedestrianPortalAtZ: 60,
    },
  },
  reservedConcourse: {
    min: [114.5, -132],
    max: [126.5, 60],
    geometryExcluded: true,
  },
  rampThroat: {
    min: [115, 72],
    max: [126, 108],
    floorAndCeilingExcluded: true,
  },
  lighting: {
    anchors: [
      [-70, -1.15, -48],
      [30, -1.15, -48],
      [-70, -1.15, 17],
      [30, -1.15, 17],
      [88, -1.15, 54],
    ],
    warmColor: 0xffdfab,
    requiresRuntimeLights: true,
  },
  provenance: {
    type: 'original-procedural',
    author: 'AmpliWorld',
    externalImages: [],
    externalMeshes: [],
    vehicleBrands: [],
  },
  limitations: [
    'Parked vehicles are original simplified display geometry, not individual physics actors.',
    'Runtime local lights must be added for the enclosed space.',
    'Existing west vestibule wall geometry and collider require the declared portal cut during integration.',
    'No automatic parking, elevators or service simulation implemented.',
  ],
};
await mkdir(out, { recursive: true });
await writeFile(
  new URL('garage.glb', out),
  Buffer.from(
    await new GLTFExporter().parseAsync(scene, {
      binary: true,
      onlyVisible: true,
    }),
  ),
);
await writeFile(
  new URL('garage-manifest.json', out),
  JSON.stringify(manifest, null, 2) + '\n',
);
process.stdout.write(
  JSON.stringify({
    id: manifest.id,
    triangles,
    drawCalls: scene.children.length,
    ...manifest.stats,
  }) + '\n',
);
