/** Original AmpliWorld premium experience/dealership campus; metre geometry.
 * Install as scripts/assets/build-dealership.mjs. Front is +Z. No brand replica.
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
  '../../public/assets/3d/ampliworld/GC-AUTO-001/',
  import.meta.url,
);
const buckets = {},
  materials = {},
  colliders = [],
  surfaces = [],
  font = new FontLoader().parse(fontJson),
  cars = [];
for (const [name, color, metalness, roughness] of [
  ['concrete', 0xb3b6b5, 0.08, 0.78],
  ['white', 0xe2e5df, 0.22, 0.44],
  ['steel', 0x84969d, 0.83, 0.25],
  ['gold', 0xc1a570, 0.77, 0.3],
  ['dark', 0x24343d, 0.38, 0.47],
  ['glass', 0xa2c2ce, 0.16, 0.12],
  ['carBlue', 0x547489, 0.83, 0.24],
  ['carSilver', 0xb9c5c9, 0.83, 0.25],
  ['carRed', 0x98574e, 0.7, 0.3],
  ['rubber', 0x162028, 0.02, 0.9],
  ['seat', 0xb9a184, 0.12, 0.72],
  ['leaf', 0x52745b, 0, 0.9],
  ['light', 0xffe8b6, 0.2, 0.26],
])
  materials[name] = new T.MeshStandardMaterial({
    name,
    color,
    metalness,
    roughness,
  });
materials.glass.transparent = true;
materials.glass.opacity = 0.2;
materials.glass.depthWrite = false;
materials.glass.side = T.DoubleSide;
materials.light.emissive = new T.Color(0xffe3a3);
materials.light.emissiveIntensity = 0.65;
function add(g, m, x = 0, y = 0, z = 0, ry = 0) {
  if (ry) g.rotateY(ry);
  g.translate(x, y, z);
  if (g.index) g = g.toNonIndexed();
  delete g.attributes.uv;
  (buckets[m] ??= []).push(g);
}
function box(m, x, y, z, w, h, d, r = 0) {
  add(new T.BoxGeometry(w, h, d), m, x, y, z, r);
}
function solid(id, min, max) {
  colliders.push({ id, min, max });
}
function surface(id, x0, z0, x1, z1, y) {
  surfaces.push({ id, min: [x0, z0], max: [x1, z1], y });
}
function rod(m, a, b, r = 0.07, n = 8) {
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
function oval(m, x, y, z, rx, ry, rz) {
  const g = new T.SphereGeometry(1, 14, 8);
  g.scale(rx, ry, rz);
  add(g, m, x, y, z);
}
function text(label, x, y, z, size, ry = 0, m = 'gold') {
  const g = new TextGeometry(label, {
    font,
    size,
    depth: 0.045,
    curveSegments: 3,
    bevelEnabled: false,
  });
  g.computeBoundingBox();
  g.translate(-(g.boundingBox.max.x - g.boundingBox.min.x) / 2, 0, 0);
  add(g, m, x, y, z, ry);
}
function mesh(v, f, m) {
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
  g.setIndex(f);
  g.computeVertexNormals();
  add(g, m);
}
const roofY = (x, z) => 15 + 0.032 * x + 0.014 * z;
function panel(id, ax, az, bx, bz, mat = 'glass', bottom = 0.18) {
  const len = Math.hypot(bx - ax, bz - az),
    nx = (-(bz - az) / len) * 0.065,
    nz = ((bx - ax) / len) * 0.065,
    ta = roofY(ax, az) - 0.6,
    tb = roofY(bx, bz) - 0.6;
  const v = [
    ax + nx,
    bottom,
    az + nz,
    bx + nx,
    bottom,
    bz + nz,
    ax + nx,
    ta,
    az + nz,
    bx + nx,
    tb,
    bz + nz,
    ax - nx,
    bottom,
    az - nz,
    bx - nx,
    bottom,
    bz - nz,
    ax - nx,
    ta,
    az - nz,
    bx - nx,
    tb,
    bz - nz,
  ];
  mesh(
    v,
    [
      0, 1, 2, 1, 3, 2, 4, 6, 5, 5, 6, 7, 0, 4, 1, 1, 4, 5, 2, 3, 6, 3, 7, 6, 0,
      2, 4, 2, 6, 4, 1, 5, 3, 3, 5, 7,
    ],
    mat,
  );
  solid(
    id,
    [Math.min(ax, bx) - 0.08, bottom, Math.min(az, bz) - 0.08],
    [Math.max(ax, bx) + 0.08, Math.max(ta, tb), Math.max(az, bz) + 0.08],
  );
}
// Main campus remains190x240; a separately labelled east connector reachesx125.
box('concrete', 0, 0.01, 0, 190, 0.02, 240);
surface('campus', -95, -120, 95, 120, 0.02);
box('dark', 110, 0.01, 90, 30, 0.02, 12);
surface('east-road-connector', 95, 84, 125, 96, 0.02);
for (const z of [83, 97]) box('white', 110, 0.025, z, 30, 0.05, 2);
// Clear vehicle loop and front forecourt; entrance corridor z84..96 is empty.
for (const x of [-85, 85]) box('dark', x, 0.026, 0, 12, 0.012, 216);
box('dark', 0, 0.026, 90, 176, 0.012, 12);
box('dark', 0, 0.026, -105, 176, 0.012, 12);
for (const x of [-70, -40, 0, 40, 70])
  box('gold', x, 0.04, 90, 12, 0.025, 0.12);

// Open showroom: solid floor support is a walk surface, not a blocking volume.
box('white', 0, 0.09, -19, 140, 0.18, 86);
surface('showroom', -70, -62, 70, 24, 0.18);
panel('west-glazing', -70, 24, -70, -62);
panel('east-glazing', 70, -62, 70, 24);
panel('rear-glazing', -70, -62, 70, -62);
panel('front-left-glazing', -70, 24, -8, 24);
panel('front-right-glazing', 8, 24, 70, 24);
// Sixteen metre physical doorway; glass door leaves folded along jambs.
for (const s of [-1, 1]) {
  box('steel', s * 8.15, 3.3, 24, 0.25, 6.24, 0.4);
  box('glass', s * 8.35, 2.9, 26.25, 0.12, 5.45, 4.5);
  solid(
    `open-door-leaf-${s}`,
    [s * 8.35 - 0.09, 0.18, 24],
    [s * 8.35 + 0.09, 5.63, 28.5],
  );
}
box('steel', 0, 6.49, 24, 16.5, 0.2, 0.4);
text('WELCOME', 0, 5.94, 24.3, 0.52, 0, 'white');
// Four 4 cm threshold terraces link campus .02 to interior .18.
for (let i = 0; i < 4; i++) {
  const y = 0.02 + (i + 1) * 0.04,
    z1 = 30 - i * 1.5,
    z0 = z1 - 1.5;
  box('white', 0, y / 2, (z0 + z1) / 2, 16, y, z1 - z0);
  surface(`entry-threshold-${i}`, -8, z0, 8, z1, y);
}
// Exposed structural steel and lower concrete plinths, kept out of entry route.
for (const x of [-69, -46, -23, 23, 46, 69])
  for (const z of [-61, 23]) {
    const h = roofY(x, z) - 0.5;
    box('steel', x, 0.18 + (h - 0.18) / 2, z, 0.33, h - 0.18, 0.44);
    solid(
      `steel-column-${x}-${z}`,
      [x - 0.18, 0.18, z - 0.24],
      [x + 0.18, h, z + 0.24],
    );
  }
for (const x of [-70, 70])
  for (const z of [-44, -25, -6, 12]) {
    const h = roofY(x, z) - 0.6;
    box('steel', x, h / 2, z, 0.4, h, 0.28);
    solid(
      `side-mullion-${x}-${z}`,
      [x - 0.21, 0.18, z - 0.15],
      [x + 0.21, h, z + 0.15],
    );
  }
for (const z of [-45, -15, 15])
  rod(
    'steel',
    [-69, roofY(-69, z) - 0.7, z],
    [69, roofY(69, z) - 0.7, z],
    0.14,
    8,
  );

// Original irregular angular roof:148mwide,98mdeep including cantilever.
const poly = [
  [-74, -62],
  [65, -62],
  [74, -45],
  [72, 24],
  [44, 36],
  [-40, 30],
  [-74, 18],
];
const top = poly.map(([x, z]) => [x, roofY(x, z), z]),
  bottom = poly.map(([x, z]) => [x, roofY(x, z) - 0.62, z]);
const centre = top.reduce(
    (c, p) => c.map((n, i) => n + p[i] / top.length),
    [0, 0, 0],
  ),
  bc = [centre[0], centre[1] - 0.62, centre[2]];
const vv = [...top.flat(), ...bottom.flat(), ...centre, ...bc],
  ff = [],
  n = poly.length;
for (let i = 0; i < n; i++) {
  const q = (i + 1) % n;
  ff.push(2 * n, q, i, 2 * n + 1, i + n, q + n, i, q, i + n, q, q + n, i + n);
}
mesh(vv, ff, 'concrete');
solid('high-roof-only', [-74, 11.7, -62], [74, 18.0, 36]);
for (let i = 0; i < poly.length; i++) {
  const a = poly[i],
    b = poly[(i + 1) % poly.length];
  rod('steel', [a[0], roofY(...a), a[1]], [b[0], roofY(...b), b[1]], 0.16, 8);
}
// Strong independent angular entrance canopy without sealing the open portal.
const canopyShape = new T.Shape();
canopyShape.moveTo(-24, -3);
canopyShape.lineTo(21, -3);
canopyShape.lineTo(27, 7);
canopyShape.lineTo(-18, 10);
canopyShape.closePath();
const cg = new T.ExtrudeGeometry(canopyShape, {
  depth: 0.55,
  bevelEnabled: false,
});
cg.rotateX(-Math.PI / 2);
add(cg, 'steel', 0, 7.45, 26);
solid('entrance-canopy', [-24, 7.45, 16], [27, 8.0, 29]);
box('light', 0, 7.39, 26, 36, 0.1, 1.0);
text('AURELINE', 0, 10.5, 24.34, 2.6);
text('MOTOR EXPERIENCE', 0, 8.95, 24.35, 0.8, 0, 'white');

// Walkable rear mezzanine, reachable by24 steps of21.75cm each.
box('concrete', 0, 5.25, -41, 136, 0.3, 42);
surface('mezzanine', -68, -62, 68, -20, 5.4);
solid('mezzanine-slab', [-68, 5.1, -62], [68, 5.4, -20]);
for (let i = 0; i < 24; i++) {
  const y = 0.18 + (i + 1) * 0.2175,
    z1 = -7 - i * 0.56,
    z0 = z1 - 0.56;
  box('white', -62, (0.18 + y) / 2, (z0 + z1) / 2, 4, y - 0.18, 0.56);
  surface(`stair-${i}`, -64, z0, -60, z1, y);
  solid(`stair-tread-${i}`, [-64, 0.18, z0], [-60, y, z1]);
  // Each tread is a real solid; its thin gold nosing stays below step tolerance.
  box('gold', -62, y + 0.006, z1 - 0.045, 3.9, 0.012, 0.08);
  for (const x of [-64.18, -59.82]) {
    box('glass', x, y + 0.52, (z0 + z1) / 2, 0.04, 1.04, 0.56);
    solid(
      `stair-side-guard-${i}-${x}`,
      [x - 0.06, y, z0],
      [x + 0.06, y + 1.1, z1],
    );
    if (i % 4 === 0 || i === 23)
      rod('steel', [x, y, z0], [x, y + 1.1, z0], 0.026, 6);
  }
}
for (const x of [-64.18, -59.82])
  rod('gold', [x, 1.18, -7], [x, 6.4, -20.44], 0.045, 6);
for (const [xa, xb] of [
  [-68, -64.25],
  [-59.75, 68],
]) {
  rod('gold', [xa, 6.5, -19.85], [xb, 6.5, -19.85], 0.045, 6);
  box('glass', (xa + xb) / 2, 5.95, -19.85, xb - xa, 1.1, 0.08);
  solid(`mezzanine-rail-${xa}`, [xa, 5.4, -19.92], [xb, 6.52, -19.78]);
}
// Side guards close the two-metre gap between gallery slab and outer facade.
for (const x of [-68, 68]) {
  box('glass', x, 5.95, -40.9, 0.08, 1.1, 41.8);
  rod('gold', [x, 6.51, -61.8], [x, 6.51, -20], 0.045, 6);
  solid(
    `mezzanine-side-guard-${x}`,
    [x - 0.07, 5.4, -61.8],
    [x + 0.07, 6.56, -20],
  );
}
// Ground and mezzanine furniture: individually collidable at their real heights.
function lounge(x, y, z, prefix) {
  add(new T.CylinderGeometry(1.1, 1.0, 0.13, 18), 'gold', x, y + 0.7, z);
  add(new T.CylinderGeometry(0.23, 0.34, 0.62, 12), 'dark', x, y + 0.31, z);
  solid(`${prefix}-table`, [x - 1.1, y, z - 1.1], [x + 1.1, y + 0.77, z + 1.1]);
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const cx = x + Math.cos(a) * 2.25,
      cz = z + Math.sin(a) * 2.25;
    oval('seat', cx, y + 0.45, cz, 0.65, 0.2, 0.6);
    oval(
      'seat',
      cx + Math.cos(a) * 0.4,
      y + 0.91,
      cz + Math.sin(a) * 0.4,
      0.56,
      0.47,
      0.22,
    );
    solid(
      `${prefix}-chair-${a.toFixed(2)}`,
      [cx - 0.68, y, cz - 0.68],
      [cx + 0.68, y + 1.4, cz + 0.68],
    );
  }
}
for (const x of [16, 40]) lounge(x, 0.18, -44, `ground-lounge-${x}`);
for (const x of [-35, -10, 18, 43]) lounge(x, 5.4, -43, `upper-lounge-${x}`);
box('concrete', -35, 0.92, -43, 14, 1.48, 2.4);
box('gold', -35, 1.69, -43, 14.3, 0.08, 2.55);
solid('reception-desk', [-42, 0.18, -44.28], [-28, 1.73, -41.72]);
text('CONCIERGE', -35, 1.1, -41.67, 0.45);
for (const x of [-51, 54])
  for (const z of [-51, -12, 14]) {
    box('dark', x, 0.72, z, 1.2, 1.08, 1.2);
    oval('leaf', x, 1.85, z, 0.77, 1.15, 0.77);
    solid(
      `interior-planter-${x}-${z}`,
      [x - 0.65, 0.18, z - 0.65],
      [x + 0.65, 2.8, z + 0.65],
    );
  }

// Reusable ORIGINAL display coupe: closed smooth body and low-poly detail.
function car(x, y, z, rotation, color, id) {
  const emit = (g, m, a = 0, b = 0, c = 0) => {
    g.translate(a, b, c);
    g.rotateY(rotation);
    add(g, m, x, y, z);
  };
  const b = (m, a, h, c, w, hh, d) =>
    emit(new T.BoxGeometry(w, hh, d), m, a, h, c);
  const p = new T.Shape();
  p.moveTo(-2.4, 0.31);
  p.bezierCurveTo(-2.43, 0.66, -1.9, 0.89, -1.2, 0.92);
  p.lineTo(1.1, 0.94);
  p.bezierCurveTo(1.75, 0.93, 2.37, 0.73, 2.4, 0.36);
  p.lineTo(2.26, 0.25);
  p.lineTo(-2.23, 0.25);
  p.closePath();
  const body = new T.ExtrudeGeometry(p, {
    depth: 1.79,
    bevelEnabled: true,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    bevelSegments: 1,
    curveSegments: 8,
  });
  body.translate(0, 0, -0.895);
  emit(body, color);
  const cabin = new T.Shape();
  cabin.moveTo(-1.12, 0.9);
  cabin.bezierCurveTo(-0.88, 1.09, -0.57, 1.45, -0.27, 1.46);
  cabin.lineTo(0.51, 1.44);
  cabin.bezierCurveTo(0.88, 1.29, 1.13, 1.07, 1.28, 0.93);
  cabin.closePath();
  const glass = new T.ExtrudeGeometry(cabin, {
    depth: 1.52,
    bevelEnabled: false,
    curveSegments: 6,
  });
  glass.translate(0, 0, -0.76);
  emit(glass, 'dark');
  b(color, 0.1, 1.448, 0, 0.91, 0.05, 1.54);
  for (const a of [-1.48, 1.43])
    for (const c of [-0.92, 0.92]) {
      const wheel = new T.TorusGeometry(0.245, 0.085, 6, 24);
      emit(wheel, 'rubber', a, 0.33, c);
      const rim = new T.CylinderGeometry(0.222, 0.222, 0.025, 16);
      rim.rotateX(Math.PI / 2);
      emit(rim, 'steel', a, 0.33, c + (c > 0 ? 0.055 : -0.055));
      for (let q = 0; q < 5; q++) {
        const angle = (q * Math.PI * 2) / 5;
        const spoke = new T.BoxGeometry(0.035, 0.37, 0.035);
        spoke.rotateZ(angle);
        emit(spoke, 'gold', a, 0.33, c + (c > 0 ? 0.078 : -0.078));
      }
    }
  for (const c of [-0.62, 0.62]) {
    b('light', -2.361, 0.65, c, 0.035, 0.07, 0.39);
    b('carRed', 2.361, 0.66, c, 0.035, 0.06, 0.36);
  }
  b('dark', -2.401, 0.41, 0, 0.035, 0.14, 1.04);
  for (const c of [-0.78, 0.78]) {
    b(color, 0.16, 1.19, c, 0.07, 0.52, 0.035);
    b('steel', 0.45, 0.82, c, 0.2, 0.025, 0.025);
  }
  const hx =
      Math.abs(Math.cos(rotation)) * 2.47 + Math.abs(Math.sin(rotation)) * 0.99,
    hz =
      Math.abs(Math.sin(rotation)) * 2.47 + Math.abs(Math.cos(rotation)) * 0.99;
  solid(id, [x - hx, y, z - hz], [x + hx, y + 1.51, z + hz]);
  cars.push({
    id,
    position: [x, y, z],
    yaw: rotation,
    type: 'original-display-coupe',
  });
}
for (const [i, x] of [-46, -23, 23, 46].entries()) {
  car(
    x,
    0.28,
    2,
    i % 2 ? Math.PI * 0.27 : -Math.PI * 0.27,
    ['carBlue', 'carSilver', 'white', 'carRed'][i],
    `showroom-car-${i}`,
  );
  add(new T.CylinderGeometry(4.3, 4.3, 0.1, 32), 'dark', x, 0.23, 2);
  // Display pads are only10cm above floor, with explicit traversable tops.
  surface(`display-pad-${i}`, x - 4.3, -2.3, x + 4.3, 6.3, 0.28);
  box('steel', x, 1.04, 7.0, 0.42, 1.72, 0.36);
  solid(`spec-plinth-${i}`, [x - 0.25, 0.18, 6.78], [x + 0.25, 1.9, 7.22]);
}
for (const [i, x] of [-66, -48, -30, 30, 48, 66].entries()) {
  const z = 59;
  car(
    x,
    0.02,
    z,
    Math.PI / 2,
    ['carBlue', 'carSilver', 'white'][i % 3],
    `forecourt-car-${i}`,
  );
  for (const sx of [-1, 1]) box('white', x + sx * 3, 0.034, z, 0.1, 0.018, 7);
}
for (const [i, z] of [-88, -73, -58].entries())
  car(84, 0.02, z, Math.PI / 2, 'carSilver', `staff-car-${i}`);
for (const x of [-62, 62])
  for (const z of [108, -111]) {
    box('concrete', x, 0.5, z, 16, 0.96, 4);
    for (const dx of [-5, 0, 5]) oval('leaf', x + dx, 1.45, z, 1.8, 1.4, 1.4);
    solid(
      `exterior-planter-${x}-${z}`,
      [x - 8, 0.02, z - 2],
      [x + 8, 2.9, z + 2],
    );
  }
box('concrete', -86, 5.8, 54, 2.2, 11.56, 3);
text('A', -86, 8.1, 55.55, 2.2);
solid('arrival-monolith', [-87.1, 0.02, 52.5], [-84.9, 11.58, 55.5]);

// Roof purlins; omit subpixel paving lines that shimmer in overview.
for (const x of [-56, -28, 0, 28, 56])
  rod(
    'steel',
    [x, roofY(x, -51) - 0.81, -51],
    [x, roofY(x, 21) - 0.81, 21],
    0.055,
    6,
  );

const scene = new T.Group();
scene.name = 'Aureline Motor Experience';
let triangles = 0;
for (const [name, list] of Object.entries(buckets)) {
  const g = mergeGeometries(list, false);
  if (!g) throw new Error(`Merge failed: ${name}`);
  for (const n of g.attributes.position.array)
    if (!Number.isFinite(n)) throw new Error('Non-finite geometry');
  g.computeBoundingBox();
  g.computeBoundingSphere();
  triangles += g.attributes.position.count / 3;
  const obj = new T.Mesh(g, materials[name]);
  obj.name = `GC-AUTO-001-${name}`;
  scene.add(obj);
  for (const g of list) g.dispose();
}
if (triangles > 150000)
  throw new Error(`Dealership triangle budget exceeded: ${triangles}`);
scene.updateMatrixWorld(true);
const bounds = new T.Box3().setFromObject(scene);
// All elevations are active. The runtime must select a height-reachable support,
// not simply the first overlapping rectangle; each stacked floor is retained.
const elevatedSurfaces = surfaces.filter(
  (s) => s.id === 'mezzanine' || s.id.startsWith('stair-'),
);
const area = (s) => (s.max[0] - s.min[0]) * (s.max[1] - s.min[1]);
const activeSurfaces = [...surfaces].sort(
  (a, b) => b.y - a.y || area(a) - area(b),
);
const navigation = {
  requiresHeightAwareGroundSelection: true,
  maximumStairRiser: 0.2175,
  recommendedStepTolerance: 0.24,
  stairWidth: 4,
  stairRun: { min: [-64, -20.44], max: [-60, -7], bottomY: 0.18, topY: 5.4 },
  clearUpperLanding: { min: [-64, -25], max: [-58, -20.44], y: 5.4 },
  levels: [
    { id: 'showroom', y: 0.18 },
    { id: 'upper-gallery', y: 5.4 },
  ],
  retiredColliderIds: ['stairs-pending-layered-navigation'],
};
const manifest = {
  id: 'GC-AUTO-001',
  name: 'Aureline Motor Experience',
  nameZh: '曜线汽车体验中心',
  version: 2,
  units: 'meters',
  file: 'dealership.glb',
  bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  campusBounds: { min: [-95, 0, -120], max: [95, 18, 120] },
  mainBuildingBounds: { min: [-74, 0, -62], max: [74, 18, 36] },
  colliders,
  surfaces: activeSurfaces,
  elevatedSurfaces,
  navigation,
  triangles,
  materialDrawCalls: scene.children.length,
  entry: [0, 30],
  entrance: [0, 30],
  eastEntrance: [95, 90],
  roadConnection: [125, 90],
  connectorBounds: { min: [95, 0, 82], max: [125, 0.05, 98] },
  showroomFloorY: 0.18,
  campusFloorY: 0.02,
  mezzanineFloorY: 5.4,
  cars,
  provenance: {
    type: 'original-procedural',
    author: 'AmpliWorld',
    externalMeshes: [],
    externalImages: [],
    branding: 'Aureline original fictional marque',
    note: 'Original angular concrete/steel/glass experience campus. Broad modern automotive architecture inspiration only; not a Porsche building or branded replica.',
  },
  limitations: [
    'Display cars use original lightweight showroom geometry, not driveable actors.',
    'Two walkable levels and solid stairs require height-aware ground and step collision handling; a first-match surface resolver is not sufficient.',
    'Service equipment, interactive sales and real vehicle servicing are not implemented.',
  ],
};
await mkdir(out, { recursive: true });
await writeFile(
  new URL('dealership.glb', out),
  Buffer.from(
    await new GLTFExporter().parseAsync(scene, {
      binary: true,
      onlyVisible: true,
    }),
  ),
);
await writeFile(
  new URL('dealership-manifest.json', out),
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
