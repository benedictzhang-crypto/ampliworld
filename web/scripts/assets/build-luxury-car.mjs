/** Original AmpliWorld luxury fastback. Install as scripts/assets/build-luxury-car.mjs.
 * Metre units, forward -Z. All original geometry: no photo skin or branded mesh.
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
  '../../public/assets/3d/ampliworld/GC-CAR-001/',
  import.meta.url,
);
const root = new T.Group();
root.name = 'GC-CAR-001-Aureline';
const materials = {},
  bodyBuckets = {},
  wheels = [],
  wheelRadius = 0.35;
for (const [name, color, metalness, roughness] of [
  ['body', 0x53758a, 0.86, 0.24],
  ['champagne', 0xc7b591, 0.82, 0.28],
  ['silver', 0xc8d3d8, 0.9, 0.2],
  ['rubber', 0x111b22, 0.04, 0.91],
  ['dark', 0x1c303d, 0.5, 0.4],
  ['seat', 0xbda987, 0.1, 0.72],
  ['glass', 0x243f50, 0.18, 0.12],
  ['light', 0xe3f5ff, 0.3, 0.2],
  ['tail', 0xe25c54, 0.3, 0.2],
])
  materials[name] = new T.MeshStandardMaterial({
    name,
    color,
    metalness,
    roughness,
  });
materials.glass.transparent = true;
materials.glass.opacity = 0.64;
materials.glass.depthWrite = false;
materials.light.emissive = new T.Color(0xc5edff);
materials.light.emissiveIntensity = 2;
materials.tail.emissive = new T.Color(0xff4535);
materials.tail.emissiveIntensity = 1.3;
function add(buckets, g, m, x = 0, y = 0, z = 0) {
  g.translate(x, y, z);
  if (g.index) g = g.toNonIndexed();
  delete g.attributes.uv;
  (buckets[m] ??= []).push(g);
}
const put = (g, m, x = 0, y = 0, z = 0) => add(bodyBuckets, g, m, x, y, z);
function box(m, x, y, z, w, h, d) {
  put(new T.BoxGeometry(w, h, d), m, x, y, z);
}
function oval(m, x, y, z, rx, ry, rz) {
  const g = new T.SphereGeometry(1, 20, 12);
  g.scale(rx, ry, rz);
  put(g, m, x, y, z);
}
function rod(buckets, m, a, b, r = 0.015, n = 6) {
  const p = new T.Vector3(...a),
    q = new T.Vector3(...b),
    d = q.clone().sub(p);
  const g = new T.CylinderGeometry(r, r, d.length(), n);
  g.applyQuaternion(
    new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      d.normalize(),
    ),
  );
  const c = p.add(q).multiplyScalar(0.5);
  add(buckets, g, m, c.x, c.y, c.z);
}
function curve(buckets, m, points, r = 0.012, steps = 40) {
  const p = points.map((v) => new T.Vector3(...v));
  add(
    buckets,
    new T.TubeGeometry(new T.CatmullRomCurve3(p), steps, r, 6, false),
    m,
  );
  for (const e of [p[0], p[p.length - 1]])
    add(buckets, new T.SphereGeometry(r, 8, 4), m, e.x, e.y, e.z);
}
function loft(buckets, sample, steps, sides, m) {
  const v = [],
    f = [];
  for (let i = 0; i <= steps; i++)
    for (let a = 0; a <= sides; a++) v.push(...sample(i / steps, a % sides));
  for (let i = 0; i < steps; i++)
    for (let a = 0; a < sides; a++) {
      const q = i * (sides + 1) + a,
        n = q + sides + 1;
      f.push(q, n, q + 1, q + 1, n, n + 1);
    }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
  g.setIndex(f);
  g.computeVertexNormals();
  add(buckets, g, m);
  for (const t of [0, 1]) {
    const points = Array.from({ length: sides }, (_, a) => sample(t, a));
    const c = points.reduce(
        (acc, p) => acc.map((u, k) => u + p[k] / sides),
        [0, 0, 0],
      ),
      faces = [];
    for (let a = 0; a < sides; a++)
      faces.push(
        ...(t
          ? [0, ((a + 1) % sides) + 1, a + 1]
          : [0, a + 1, ((a + 1) % sides) + 1]),
      );
    const cap = new T.BufferGeometry();
    cap.setAttribute(
      'position',
      new T.Float32BufferAttribute([...c, ...points.flat()], 3),
    );
    cap.setIndex(faces);
    cap.computeVertexNormals();
    add(buckets, cap, m);
  }
}
function lerpProfile(points, z) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1];
    if (z <= b[0]) {
      const t = Math.max(0, (z - a[0]) / (b[0] - a[0]));
      return a[1] + (b[1] - a[1]) * (t * t * (3 - 2 * t));
    }
  }
  return points[points.length - 1][1];
}
const topProfile = [
  [-2.5, 0.64],
  [-2.25, 0.82],
  [-1.55, 0.96],
  [-0.6, 0.96],
  [0.6, 0.98],
  [1.4, 0.97],
  [2.2, 0.85],
  [2.5, 0.7],
];
const widthProfile = [
  [-2.5, 0.73],
  [-2.25, 0.89],
  [-1.55, 0.97],
  [-0.6, 0.96],
  [0.6, 0.95],
  [1.4, 0.99],
  [2.2, 0.91],
  [2.5, 0.75],
];
const axles = [-1.53, 1.42];
function arch(z) {
  let y = 0.27;
  for (const axle of axles) {
    const d = Math.abs(z - axle);
    if (d < 0.44)
      y = Math.max(y, 0.35 + Math.sqrt(Math.max(0, 0.44 * 0.44 - d * d)));
  }
  return y;
}
function bodySection(t, index) {
  const z = -2.5 + 5 * t,
    w = lerpProfile(widthProfile, z),
    h = lerpProfile(topProfile, z),
    lower = arch(z);
  // Wheel wells are actual negative space in the outer lower envelope. The
  // closed underside steps inboard of the tyres, leaving clearance at each arch.
  const p = [
    [0, h],
    [w * 0.6, h - 0.013],
    [w * 0.88, h - 0.05],
    [w, h - 0.11],
    [w * 0.995, lower],
    [0.66, lower],
    [0.56, 0.22],
    [-0.56, 0.22],
    [-0.66, lower],
    [-w * 0.995, lower],
    [-w, h - 0.11],
    [-w * 0.88, h - 0.05],
    [-w * 0.6, h - 0.013],
  ];
  return [p[index][0], p[index][1], z];
}
loft(bodyBuckets, bodySection, 160, 13, 'body');
// Raised fender lips trace the genuine arch apertures, not painted tyre circles.
for (const axle of axles)
  for (const s of [-1, 1]) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const a = (Math.PI * i) / 40,
        z = axle - 0.44 * Math.cos(a),
        w = lerpProfile(widthProfile, z);
      pts.push([s * (w + 0.006), 0.35 + 0.44 * Math.sin(a), z]);
    }
    curve(bodyBuckets, 'champagne', pts, 0.019, 40);
  }
// Separate narrow underbody rails leave the outboard wheel wells entirely open.
box('dark', 0, 0.185, 0, 1.12, 0.07, 4.48);
for (const s of [-1, 1])
  curve(
    bodyBuckets,
    'champagne',
    [
      [s * 0.93, 0.3, -1.02],
      [s * 0.96, 0.275, 0],
      [s * 0.94, 0.3, 0.94],
    ],
    0.025,
    30,
  );

// Closed glasshouse has a broad low roof and no needle/cone aesthetic.
const cabin = [
  [-0.91, 0.975, 0.72],
  [-0.48, 1.36, 0.68],
  [-0.18, 1.485, 0.64],
  [0.45, 1.485, 0.64],
  [0.94, 1.28, 0.7],
  [1.3, 0.99, 0.73],
];
function cabinSection(t, index) {
  const z = -0.91 + t * 2.21,
    h = lerpProfile(
      cabin.map((p) => [p[0], p[1]]),
      z,
    ),
    w = lerpProfile(
      cabin.map((p) => [p[0], p[2]]),
      z,
    );
  const floor = 0.94,
    p = [
      [0, h],
      [w * 0.78, h - 0.025],
      [w, h - 0.11],
      [w + 0.08, floor],
      [-w - 0.08, floor],
      [-w, h - 0.11],
      [-w * 0.78, h - 0.025],
    ];
  return [p[index][0], p[index][1], z];
}
loft(bodyBuckets, cabinSection, 56, 7, 'glass');
// Sculpted opaque roof cap reaches exactly 1.5 m and tapers into glazing.
const roof = [
  [-0.24, 1.471, 0.6],
  [-0.12, 1.5, 0.615],
  [0.38, 1.5, 0.615],
  [0.56, 1.463, 0.61],
];
function roofSection(t, index) {
  const z = -0.24 + 0.8 * t,
    h = lerpProfile(
      roof.map((p) => [p[0], p[1]]),
      z,
    ),
    w = lerpProfile(
      roof.map((p) => [p[0], p[2]]),
      z,
    ),
    p = [
      [0, h],
      [w * 0.8, h - 0.013],
      [w, h - 0.045],
      [w, h - 0.071],
      [-w, h - 0.071],
      [-w, h - 0.045],
      [-w * 0.8, h - 0.013],
    ];
  return [p[index][0], p[index][1], z];
}
loft(bodyBuckets, roofSection, 22, 7, 'body');
for (const s of [-1, 1]) {
  curve(
    bodyBuckets,
    'champagne',
    [
      [s * 0.74, 0.97, -0.9],
      [s * 0.68, 1.35, -0.48],
      [s * 0.64, 1.445, -0.18],
      [s * 0.64, 1.445, 0.45],
      [s * 0.72, 1.27, 0.94],
      [s * 0.77, 0.97, 1.3],
    ],
    0.023,
    56,
  );
  // Window sill and B pillar create genuine separated front/rear side glazing.
  curve(
    bodyBuckets,
    'silver',
    [
      [s * 0.78, 0.962, -0.82],
      [s * 0.79, 0.963, 0.3],
      [s * 0.79, 0.965, 1.18],
    ],
    0.014,
    36,
  );
  rod(
    bodyBuckets,
    'dark',
    [s * 0.73, 0.95, 0.28],
    [s * 0.64, 1.46, 0.28],
    0.034,
    6,
  );
  // Door shut-lines wrap down the side panel, clear of wheel arches.
  curve(
    bodyBuckets,
    'dark',
    [
      [s * 0.965, 0.86, -0.75],
      [s * 0.966, 0.7, -0.72],
      [s * 0.953, 0.36, -0.65],
      [s * 0.952, 0.33, 0.74],
      [s * 0.968, 0.62, 0.89],
      [s * 0.96, 0.9, 0.8],
    ],
    0.007,
    50,
  );
  box('silver', s * 0.973, 0.81, 0.4, 0.025, 0.035, 0.18);
  rod(
    bodyBuckets,
    'body',
    [s * 0.76, 1.01, -0.52],
    [s * 0.955, 1.02, -0.62],
    0.035,
    8,
  );
  oval('body', s * 0.993, 1.04, -0.65, 0.076, 0.056, 0.13);
  oval('silver', s * 1.046, 1.042, -0.63, 0.008, 0.036, 0.084);
  // Hood character creases and rear shoulder accents.
  curve(
    bodyBuckets,
    'champagne',
    [
      [s * 0.4, 0.835, -2.2],
      [s * 0.49, 0.953, -1.65],
      [s * 0.57, 0.973, -0.9],
    ],
    0.009,
    32,
  );
}
// Seats/headrests are simple original three-dimensional forms visible in glass.
for (const x of [-0.36, 0.36])
  for (const z of [-0.1, 0.75]) {
    oval('seat', x, 0.77, z, 0.22, 0.115, 0.27);
    const back = new T.SphereGeometry(1, 16, 10);
    back.scale(0.21, 0.28, 0.09);
    back.rotateX(-0.12);
    put(back, 'seat', x, 1.025, z + 0.14);
    oval('seat', x, 1.27, z + 0.17, 0.135, 0.1, 0.075);
  }
box('dark', 0, 0.925, -0.59, 1.19, 0.11, 0.29);
const steering = new T.TorusGeometry(0.135, 0.018, 6, 24);
steering.rotateX(-0.5);
put(steering, 'dark', -0.36, 1.035, -0.4);

// Front lower grille, distinct slim lamps and dimensional vent slats.
box('dark', 0, 0.415, -2.466, 1.19, 0.2, 0.047);
for (let i = 0; i < 15; i++)
  box('champagne', -0.54 + i * 0.077, 0.415, -2.494, 0.016, 0.16, 0.012);
for (const s of [-1, 1]) {
  curve(
    bodyBuckets,
    'light',
    [
      [s * 0.29, 0.729, -2.375],
      [s * 0.51, 0.742, -2.339],
      [s * 0.77, 0.766, -2.24],
    ],
    0.018,
    22,
  );
  box('dark', s * 0.75, 0.47, -2.346, 0.23, 0.13, 0.05);
  for (let i = 0; i < 3; i++)
    box('silver', s * 0.75, 0.43 + i * 0.038, -2.377, 0.2, 0.009, 0.015);
  curve(
    bodyBuckets,
    'tail',
    [
      [s * 0.19, 0.786, 2.3],
      [s * 0.49, 0.795, 2.27],
      [s * 0.77, 0.808, 2.18],
    ],
    0.018,
    22,
  );
}
curve(
  bodyBuckets,
  'champagne',
  [
    [-0.73, 0.27, 2.33],
    [0, 0.255, 2.42],
    [0.73, 0.27, 2.33],
  ],
  0.035,
  30,
);
box('dark', 0, 0.39, 2.476, 1.22, 0.16, 0.035);
for (const x of [-0.44, 0, 0.44])
  box('silver', x, 0.305, 2.45, 0.03, 0.1, 0.075);

// Each wheel is its own named, pivot-centred group, ready for root rotation.
for (const [name, s, z] of [
  ['wheel-fl', -1, -1.53],
  ['wheel-fr', 1, -1.53],
  ['wheel-rl', -1, 1.42],
  ['wheel-rr', 1, 1.42],
]) {
  const wb = {},
    group = new T.Group();
  group.name = name;
  group.position.set(s * 0.87, 0.35, z);
  const tyre = new T.TorusGeometry(0.265, 0.085, 12, 48);
  tyre.scale(1, 1, 1.3);
  tyre.rotateY(Math.PI / 2);
  add(wb, tyre, 'rubber');
  const rim = new T.CylinderGeometry(0.244, 0.244, 0.145, 40);
  rim.rotateZ(Math.PI / 2);
  add(wb, rim, 'dark');
  const disc = new T.CylinderGeometry(0.194, 0.194, 0.016, 32);
  disc.rotateZ(Math.PI / 2);
  add(wb, disc, 'silver', s * 0.047, 0, 0);
  for (const axial of [-0.076, 0.076]) {
    const lip = new T.TorusGeometry(0.234, 0.015, 6, 40);
    lip.rotateY(Math.PI / 2);
    add(wb, lip, 'silver', axial, 0, 0);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5;
    rod(
      wb,
      'silver',
      [s * 0.088, Math.cos(a) * 0.055, Math.sin(a) * 0.055],
      [s * 0.088, Math.cos(a + 0.13) * 0.227, Math.sin(a + 0.13) * 0.227],
      0.018,
      5,
    );
    const stud = new T.CylinderGeometry(0.008, 0.008, 0.016, 6);
    stud.rotateZ(Math.PI / 2);
    add(
      wb,
      stud,
      'champagne',
      s * 0.101,
      Math.cos(a) * 0.04,
      Math.sin(a) * 0.04,
    );
  }
  const hub = new T.CylinderGeometry(0.054, 0.054, 0.022, 16);
  hub.rotateZ(Math.PI / 2);
  add(wb, hub, 'silver', s * 0.098, 0, 0);
  // Fine grooves sit on the tyre shoulder, not embedded painted wheel circles.
  for (let i = 0; i < 36; i++) {
    const a = (i * Math.PI) / 18;
    rod(
      wb,
      'dark',
      [-0.073, Math.cos(a) * 0.332, Math.sin(a) * 0.332],
      [0.073, Math.cos(a + 0.035) * 0.332, Math.sin(a + 0.035) * 0.332],
      0.004,
      4,
    );
  }
  wheels.push({
    name,
    position: group.position.toArray(),
    radius: wheelRadius,
    rotationAxis: 'X',
    steeringAxis: 'Y',
  });
  mergeInto(wb, group);
  root.add(group);
}
let triangles = 0;
function mergeInto(buckets, group) {
  for (const [name, list] of Object.entries(buckets)) {
    const g = mergeGeometries(list, false);
    if (!g) throw new Error(`Merge failed: ${name}`);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    const mesh = new T.Mesh(g, materials[name]);
    mesh.name = `${group.name}-${name}`;
    group.add(mesh);
    for (const source of list) source.dispose();
  }
}
const body = new T.Group();
body.name = 'body';
mergeInto(bodyBuckets, body);
root.add(body);
root.updateMatrixWorld(true);
const bounds = new T.Box3().setFromObject(root);
root.traverse((o) => {
  if (o.isMesh) {
    triangles += o.geometry.attributes.position.count / 3;
    for (const n of o.geometry.attributes.position.array)
      if (!Number.isFinite(n)) throw new Error('Non-finite vertex');
  }
});
if (triangles > 60000)
  throw new Error(`Car exceeds triangle budget: ${triangles}`);
const size = bounds.getSize(new T.Vector3());
if (
  size.x > 2.15 ||
  Math.abs(size.z - 5) > 0.015 ||
  Math.abs(bounds.min.y) > 0.003 ||
  size.y > 1.51
)
  throw new Error(`Vehicle bounds incorrect: ${JSON.stringify(size)}`);
const manifest = {
  id: 'GC-CAR-001',
  name: 'Aureline',
  nameZh: '曜线',
  version: 1,
  file: 'car.glb',
  units: 'meters',
  frontAxis: '-Z',
  upAxis: '+Y',
  dimensions: { length: size.z, width: size.x, height: size.y },
  bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  triangles,
  wheels,
  design:
    'Original luxury fastback with sculpted closed body loft, real open wheel arches, restrained champagne trim and independent detailed wheels.',
  provenance: {
    type: 'original-procedural',
    author: 'AmpliWorld',
    externalMeshes: [],
    externalImages: [],
    brandedReference: false,
  },
  limitations: [
    'Visual vehicle asset only; driving physics supplied by application.',
    'Doors, mirrors and cabin are not interactive.',
    'Simplified cabin seating and transparent glass; not a fully enterable interior.',
    'No collision mesh or suspension rig included.',
  ],
};
await mkdir(out, { recursive: true });
await writeFile(
  new URL('car.glb', out),
  Buffer.from(
    await new GLTFExporter().parseAsync(root, {
      binary: true,
      onlyVisible: true,
    }),
  ),
);
await writeFile(
  new URL('car-manifest.json', out),
  JSON.stringify(manifest, null, 2) + '\n',
);
process.stdout.write(
  JSON.stringify({
    id: manifest.id,
    triangles,
    dimensions: manifest.dimensions,
    wheels: wheels.map((w) => w.name),
  }) + '\n',
);
