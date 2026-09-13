/** Original modest metric residential prototypes; no textures or external models. */
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
  '../../public/assets/3d/ampliworld/GC-MID-001/',
  import.meta.url,
);
await mkdir(out, { recursive: true });
const specs = [
  {
    id: 'GC-MID-001-A',
    file: 'midrise-6.glb',
    storeys: 6,
    name: 'Courtyard Six',
    nameZh: '庭院六层住宅',
    accent: 0x8e9d91,
  },
  {
    id: 'GC-MID-001-B',
    file: 'midrise-8.glb',
    storeys: 8,
    name: 'Garden Eight',
    nameZh: '花园八层住宅',
    accent: 0xa5aba2,
  },
  {
    id: 'GC-MID-001-C',
    file: 'midrise-10.glb',
    storeys: 10,
    name: 'Neighbourhood Ten',
    nameZh: '邻里十层住宅',
    accent: 0x939e96,
  },
];
const prototypes = [];
for (const spec of specs) {
  const FLOOR = 0.18,
    roof = spec.storeys * 3 + 0.3,
    height = spec.storeys * 3 + 2,
    buckets = {},
    colliders = [],
    materials = {};
  for (const [name, color, metalness, roughness] of [
    ['concrete', 0xc4c8c4, 0, 0.9],
    ['offwhite', 0xe2e0d7, 0.03, 0.8],
    ['sage', spec.accent, 0, 0.84],
    ['glass', 0x526c73, 0.28, 0.24],
    ['metal', 0x606c67, 0.48, 0.47],
    ['wood', 0x8a7357, 0.04, 0.82],
  ])
    materials[name] = new T.MeshStandardMaterial({
      name,
      color,
      metalness,
      roughness,
    });
  function add(g, m) {
    if (g.index) g = g.toNonIndexed();
    delete g.attributes.uv;
    (buckets[m] ??= []).push(g);
  }
  function solid(id, x, y, z, w, h, d) {
    colliders.push({
      id,
      min: [x - w / 2, y - h / 2, z - d / 2],
      max: [x + w / 2, y + h / 2, z + d / 2],
    });
  }
  function box(m, x, y, z, w, h, d, collision = false, id = m) {
    const g = new T.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    add(g, m);
    if (collision) solid(`${id}-${colliders.length}`, x, y, z, w, h, d);
  }
  // Ground structure is explicitly split: the front lobby is genuinely hollow.
  box('concrete', 0, 0.08, 0, 28, 0.2, 20);
  box('offwhite', 0, 0.165, 7.1, 5.6, 0.03, 5.8);
  box('sage', -8.4, 1.68, 0, 11.2, 3, 20, true, 'ground-west-wing');
  box('sage', 8.4, 1.68, 0, 11.2, 3, 20, true, 'ground-east-wing');
  box('concrete', 0, 1.68, -2.85, 5.6, 3, 14.3, true, 'ground-rear-core');
  // Lobby side reveals, solid rear wall and structural soffit frame a real 3m door.
  for (const x of [-2.72, 2.72])
    box('offwhite', x, 1.665, 7.2, 0.16, 2.97, 5.6, true, 'lobby-side-wall');
  box('offwhite', 0, 1.665, 4.34, 5.6, 2.97, 0.16, true, 'lobby-rear-wall');
  box('offwhite', 0, 3.115, 7.1, 5.6, 0.13, 5.8, true, 'lobby-ceiling');
  for (const x of [-2.15, 2.15])
    box('sage', x, 1.66, 9.92, 1.3, 2.96, 0.16, true, 'lobby-front-return');
  box('metal', 0, 2.92, 10.02, 3.15, 0.2, 0.18, true, 'door-header');
  for (const x of [-1.54, 1.54])
    box('metal', x, 1.52, 10.02, 0.08, 2.68, 0.18, true, 'door-jamb');
  // Fixed glazed side lights and a parked-open door leaf never obstruct the opening.
  for (const x of [-2.12, 2.12])
    box('glass', x, 1.63, 10.035, 1.05, 2.2, 0.035);
  box('wood', -2.49, 1.3, 7.1, 0.18, 2.15, 1.15, true, 'mailbox-wall');
  for (const y of [0.7, 1.15, 1.6])
    for (const z of [6.7, 7.1, 7.5])
      box('metal', -2.375, y, z, 0.05, 0.33, 0.29);
  box('wood', 1.7, 0.43, 5.1, 1.4, 0.5, 0.45, true, 'lobby-bench');
  box('metal', 0, 3.23, 10.32, 5.4, 0.14, 1.7);
  box('offwhite', 0, 3.33, 10.32, 5.45, 0.06, 1.72);
  box('wood', 0, 2.77, 4.445, 2.2, 0.28, 0.035);
  // Upper homes are sealed exterior volumes; only the named ground lobby is enterable.
  box(
    'concrete',
    0,
    (3.18 + roof) / 2,
    0,
    28,
    roof - 3.18,
    20,
    true,
    'upper-residential-envelope',
  );
  for (const sign of [-1, 1]) {
    box('sage', sign * 13.94, (3.18 + roof) / 2, 0, 0.17, roof - 3.18, 3.5);
    box(
      'offwhite',
      sign * 13.94,
      (3.18 + roof) / 2,
      -8.5,
      0.17,
      roof - 3.18,
      2.7,
    );
  }
  function window(x, y, z, w, side = 0, door = false) {
    const h = door ? 2.15 : 1.4,
      centerY = y + (door ? 1.15 : 1.6);
    if (side === 0) {
      box('glass', x, centerY, z, w, h, 0.075);
      box(
        'offwhite',
        x,
        y + (door ? 0.12 : 0.88),
        z + (z > 0 ? 0.07 : -0.07),
        w + 0.22,
        0.1,
        0.28,
      );
    } else {
      box('glass', x, centerY, z, 0.075, h, w);
      box(
        'offwhite',
        x + (x > 0 ? 0.07 : -0.07),
        y + 0.88,
        z,
        0.28,
        0.1,
        w + 0.22,
      );
    }
  }
  function balcony(x, y, sign) {
    const z = sign * 10.73,
      edge = sign * 11.42,
      w = 4.2;
    box('offwhite', x, y - 0.06, z, w, 0.16, 1.48, true, 'balcony-slab');
    box('metal', x, y + 1.04, edge, w, 0.065, 0.065);
    for (const dx of [-2.06, 2.06]) {
      box('metal', x + dx, y + 0.53, edge, 0.06, 1.02, 0.06);
      box('metal', x + dx, y + 1.04, z, 0.06, 0.065, 1.42);
    }
    for (const dx of [-1, 0, 1])
      box('metal', x + dx, y + 0.55, edge, 0.045, 0.98, 0.045);
    solid(
      `balcony-guard-${colliders.length}`,
      x,
      y + 0.55,
      edge,
      w,
      1.04,
      0.09,
    );
    for (const dx of [-2.06, 2.06])
      solid(
        `balcony-side-guard-${colliders.length}`,
        x + dx,
        y + 0.55,
        z,
        0.09,
        1.04,
        1.42,
      );
  }
  for (let floor = 0; floor < spec.storeys; floor++) {
    const y = FLOOR + floor * 3;
    if (floor > 0)
      for (const sign of [-1, 1])
        box('offwhite', 0, y + 0.04, sign * 10.025, 28, 0.13, 0.16);
    for (const x of [-8, 0, 8])
      for (const sign of [-1, 1]) {
        if (floor === 0 && sign === 1 && x === 0) continue;
        const hasBalcony = floor > 0 && (sign === 1 || x !== 0);
        window(x, y, sign * 10.055, hasBalcony ? 2.1 : 2.7, 0, hasBalcony);
        if (hasBalcony) balcony(x, y, sign);
      }
    for (const sign of [-1, 1])
      for (const z of [-6, 0, 6]) window(sign * 14.055, y, z, 2.2, 1);
  }
  // Roof edge, rainwater downpipes, compact plant and access housing are fully 3D.
  box('metal', 0, roof + 0.06, 0, 28.1, 0.12, 20.1);
  for (const sign of [-1, 1]) {
    box('offwhite', 0, roof + 0.45, sign * 9.87, 28, 0.75, 0.22);
    box('offwhite', sign * 13.87, roof + 0.45, 0, 0.22, 0.75, 20);
    for (const z of [-9.7, 9.7])
      box(
        'metal',
        sign * 13.78,
        (FLOOR + roof) / 2,
        z,
        0.11,
        roof - FLOOR,
        0.11,
      );
  }
  box('sage', 0, roof + 0.85, -3, 4.2, 1.7, 3.3);
  box('offwhite', 0, roof + 1.72, -3, 4.45, 0.06, 3.55);
  // The small roof hood establishes the exact requested height (20/26/32m).
  box('metal', 0, height - 0.035, -3, 1.2, 0.07, 0.7);
  for (const x of [-7, 6]) {
    box('metal', x, roof + 0.3, 1.8, 2, 0.5, 1.6);
    for (let q = 0; q < 4; q++)
      box('offwhite', x - 0.7 + q * 0.46, roof + 0.555, 1.8, 0.13, 0.06, 1.35);
  }
  const scene = new T.Group();
  scene.name = spec.id;
  let triangles = 0;
  for (const [name, list] of Object.entries(buckets)) {
    const g = mergeVertices(mergeGeometries(list, false));
    g.computeBoundingBox();
    g.computeBoundingSphere();
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    const mesh = new T.Mesh(g, materials[name]);
    mesh.name = `${spec.id}-${name}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
  const bounds = new T.Box3().setFromObject(scene),
    data = await new GLTFExporter().parseAsync(scene, { binary: true });
  if (data.byteLength > 600000)
    throw new Error(`${spec.id} exceeds 0.6MB: ${data.byteLength}`);
  await writeFile(new URL(spec.file, out), Buffer.from(data));
  prototypes.push({
    ...spec,
    height,
    floorY: FLOOR,
    footprint: [28, 20],
    bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
    colliders,
    surfaces: [
      { id: 'walk-in-lobby', min: [-2.6, 4.42], max: [2.6, 10.12], y: FLOOR },
    ],
    entrance: [0, 10.15],
    entranceWidth: 3,
    triangles,
    bytes: data.byteLength,
    materialDrawCalls: scene.children.length,
    limitations: [
      'Ground-floor lobby only; upper apartments, stairs and elevators are not accessible.',
      'Roof and balconies are exterior geometry; no occupancy or property transaction system is supplied.',
    ],
  });
}
const manifest = {
  id: 'GC-MID-001',
  name: 'AmpliWorld middle-income neighbourhood residences',
  nameZh: '邻里社区住宅组',
  units: 'METERS',
  upAxis: 'Y',
  frontAxis: '+Z',
  prototypes,
  provenance: {
    creator: 'AmpliWorld',
    type: 'ORIGINAL_PROCEDURAL_GEOMETRY',
    externalAssets: [],
    textures: [],
  },
  placementNotes: [
    'Three original modest 6/8/10-storey prototypes intended for a 15-building community.',
    'LocalY=0; consumer may place the group atY=.04. Lobby walking surface then lies atY=.22.',
    'Keep door approach atlocalX[-1.5,1.5],Z10..12 clear; no full-body ground collision covers it.',
    'Balconies extend toZ±11.46; side windows toX±14.14. Allow at least32×24m physical building envelopes plus garden spacing.',
  ],
};
if (prototypes.reduce((n, p) => n + p.bytes, 0) > 2000000)
  throw new Error('Prototype pack exceeds 2MB');
await writeFile(
  new URL('midrise-manifest.json', out),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    prototypes.map(({ id, bytes, triangles, height }) => ({
      id,
      bytes,
      triangles,
      height,
    })),
  ),
);
