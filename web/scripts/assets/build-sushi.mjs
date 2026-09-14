/** GC-SUSHI-001: original, geometry-built street sushi restaurant. Front is +Z. */
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
const out = new URL('../../public/assets/3d/ampliworld/GC-SUSHI-001/', import.meta.url);
await mkdir(out, { recursive: true });
const FLOOR = 0.18,
  buckets = {},
  colliders = [],
  materials = {};
for (const [name, color, metalness, roughness] of [
  ['cedar', 0x855f3f, 0.03, 0.75],
  ['hinoki', 0xc7a773, 0.02, 0.65],
  ['dark', 0x28302e, 0.2, 0.72],
  ['plaster', 0xe4ded0, 0, 0.91],
  ['stone', 0x787f76, 0.02, 0.91],
  ['bronze', 0xa1854d, 0.75, 0.35],
  ['paper', 0xffdea0, 0, 0.7],
  ['rice', 0xf2eee1, 0, 0.88],
  ['salmon', 0xd88970, 0, 0.63],
  ['nori', 0x293c30, 0, 0.83],
  ['celadon', 0x90aaa1, 0.12, 0.32],
  ['bottle', 0x416b59, 0.2, 0.28],
  ['indigo', 0x334753, 0, 0.95],
  ['leaf', 0x4e7459, 0, 0.94],
  ['stainless', 0xb4bcc1, 0.8, 0.3],
  ['tile', 0xa6ada6, 0.02, 0.72],
])
  materials[name] = new T.MeshStandardMaterial({
    name,
    color,
    metalness,
    roughness,
  });
materials.paper.emissive = new T.Color(0xffc674);
materials.paper.emissiveIntensity = 0.65;
materials.glass = new T.MeshStandardMaterial({
  name: 'Clear blue display glazing',
  color: 0xcadbd6,
  transparent: true,
  opacity: 0.2,
  roughness: 0.13,
  metalness: 0.02,
  side: T.DoubleSide,
  depthWrite: false,
});
function add(g, m, x = 0, y = 0, z = 0) {
  g.translate(x, y, z);
  if (g.index) g = g.toNonIndexed();
  delete g.attributes.uv;
  (buckets[m] ??= []).push(g);
}
function box(m, x, y, z, w, h, d, collision = false, id = m) {
  add(new T.BoxGeometry(w, h, d), m, x, y, z);
  if (collision)
    colliders.push({
      id: `${id}-${colliders.length}`,
      min: [x - w / 2, y - h / 2, z - d / 2],
      max: [x + w / 2, y + h / 2, z + d / 2],
    });
}
function cylinder(m, x, y, z, r, h, segments = 12, r2 = r) {
  add(new T.CylinderGeometry(r, r2, h, segments), m, x, y, z);
}
function ellipsoid(m, x, y, z, rx, ry, rz, segments = 10) {
  const g = new T.SphereGeometry(1, segments, 6);
  g.scale(rx, ry, rz);
  add(g, m, x, y, z);
}
function rail(m, a, b, r = 0.025) {
  const dir = new T.Vector3(...b).sub(new T.Vector3(...a)),
    g = new T.CylinderGeometry(r, r, dir.length(), 6);
  g.applyQuaternion(
    new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      dir.normalize(),
    ),
  );
  add(g, m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
}
// Plinth and individually modelled floorboards. No room-sized solid collider.
box('stone', 0, 0.04, -1, 24, 0.22, 20);
box('stone', 0, 0.055, 10.8, 22, 0.25, 3.6);
box('cedar', 0, 0.1625, 1.1, 23.65, 0.025, 15.5);
for (let x = -11.65; x < 11.7; x += 0.27)
  box('hinoki', x, 0.1775, 1.1, 0.25, 0.005, 15.5);
box('tile', 0, 0.1725, -8.7, 23.65, 0.015, 4.3);
for (let x = -11.5; x < 11.8; x += 0.7)
  box('plaster', x, 0.181, -8.7, 0.012, 0.002, 4.25);
for (let z = -10.6; z < -6.5; z += 0.7)
  box('plaster', 0, 0.181, z, 23.6, 0.002, 0.012);
for (const z of [9.4, 10.2, 11, 11.8, 12.5])
  box('plaster', 0, 0.182, z, 21.7, 0.006, 0.015);
// Complete rear and side envelopes. Front is segmented around two windows and a 4m door.
box('plaster', 0, 2.25, -10.88, 24, 4.14, 0.24, true, 'rear-wall');
for (const x of [-11.88, 11.88])
  box('plaster', x, 2.25, -1, 0.24, 4.14, 20, true, 'side-wall');
for (const sign of [-1, 1]) {
  box('stone', sign * 7, 0.68, 8.9, 10, 1, 0.2, true, 'front-window-base');
  box('cedar', sign * 7, 3.62, 8.9, 10, 1.56, 0.24, true, 'front-upper-wall');
  for (const x of [sign * 2.15, sign * 11.75])
    box('cedar', x, 2.25, 8.9, 0.3, 4.14, 0.35, true, 'front-post');
  // Transparent glass remains a real impassable window, not an invisible door.
  box(
    'glass',
    sign * 7,
    2.0,
    8.92,
    9.25,
    1.65,
    0.055,
    true,
    'front-display-window',
  );
  for (const x of [sign * 3.7, sign * 5.25, sign * 6.8, sign * 8.35, sign * 10])
    box('cedar', x, 2.02, 9.0, 0.075, 1.8, 0.13);
  box('hinoki', sign * 7, 1.18, 9.04, 9.5, 0.1, 0.36);
}
box('cedar', 0, 4.02, 8.9, 4, 0.6, 0.32, true, 'door-lintel');
// Deep timber facade fins wrap the sides; their depth casts real shadow and parallax.
for (const sign of [-1, 1]) {
  for (let z = -10.8; z < 8.6; z += 0.42)
    box('cedar', sign * 12.04, 2.3, z, 0.27, 4.1, 0.085);
  for (let x = 2.4; x < 11.7; x += 0.31)
    box('cedar', sign * x, 0.71, 9.1, 0.095, 0.95, 0.23);
}
for (let x = -11.6; x < 11.7; x += 0.55)
  box('cedar', x, 2.3, -11.04, 0.11, 4.1, 0.22);
// Noren hangs above head height; all four metres of the central doorway are walkable.
for (const x of [-1.49, -0.5, 0.5, 1.49]) {
  box('indigo', x, 3.3, 9.02, 0.93, 0.62, 0.035);
  cylinder('paper', x, 3.32, 9.06, 0.075, 0.025, 8);
}
// Fully three-dimensional shallow gabled roof with deep eaves, ridge and exposed rafters.
for (const sign of [-1, 1]) {
  const d = 11.55,
    g = new T.BoxGeometry(26.6, 0.26, d),
    a = g.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const worldZ = sign * 5.775 + a.getZ(i);
    a.setY(i, a.getY(i) + 5.7 - Math.abs(worldZ) * 0.105);
  }
  g.computeVertexNormals();
  add(g, 'dark', 0, 0, -1 + sign * 5.775);
  box('bronze', 0, 4.48, -1 + sign * 11.55, 26.7, 0.12, 0.11);
  for (let x = -12.8; x < 13; x += 0.65) {
    const beam = new T.BoxGeometry(0.13, 0.2, 11.65);
    beam.rotateX(sign * 0.105);
    add(beam, 'cedar', x, 4.96, -1 + sign * 5.6);
  }
}
box('bronze', 0, 5.86, -1, 26.75, 0.12, 0.22);
colliders.push({
  id: 'roof-clearance',
  min: [-13.375, 4.38, -12.605],
  max: [13.375, 5.95, 10.605],
});
// Hand-authored raised lettering, not a facade photograph or sign texture.
const glyphs = {
  M: ['10001', '11011', '10101', '10001', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
};
const title = 'MORI SUSHI',
  pixel = 0.075,
  total =
    Array.from(title).reduce(
      (n, c) => n + (c === ' ' ? 3 : glyphs[c][0].length + 1),
      0,
    ) * pixel;
let tx = -total / 2;
box('dark', 0, 3.89, 9.08, total + 0.55, 0.76, 0.1);
for (const c of title) {
  if (c === ' ') {
    tx += pixel * 3;
    continue;
  }
  const rows = glyphs[c];
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < rows[y].length; x++)
      if (rows[y][x] === '1')
        box(
          'paper',
          tx + x * pixel,
          4.12 - y * pixel,
          9.15,
          pixel * 0.76,
          pixel * 0.76,
          0.04,
        );
  tx += (rows[0].length + 1) * pixel;
}
function lantern(x, y, z, scale = 1) {
  cylinder('paper', x, y, z, 0.26 * scale, 0.7 * scale, 16, 0.26 * scale);
  for (const dy of [-0.35, 0.35])
    cylinder('dark', x, y + dy * scale, z, 0.27 * scale, 0.045 * scale, 16);
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    box(
      'bronze',
      x + Math.cos(a) * 0.258 * scale,
      y,
      z + Math.sin(a) * 0.258 * scale,
      0.015 * scale,
      0.67 * scale,
      0.015 * scale,
    );
  }
  rail('dark', [x, y + 0.38 * scale, z], [x, 4.25, z], 0.018);
}
for (const x of [-9.4, -4.0, 4.0, 9.4]) lantern(x, 2.85, 9.95, 1.05);
for (const x of [-5, -1.7, 1.7, 5]) lantern(x, 3.26, -0.25, 0.9);
// Refined central hinoki sushi counter; chef aisle remains open behind it.
box('cedar', 0, 0.7, -2.1, 11, 1.04, 1.45, true, 'sushi-counter');
box('hinoki', 0, 1.27, -2.1, 11.35, 0.16, 1.75, true, 'countertop');
box('dark', 0, 0.34, -1.35, 10.9, 0.16, 0.035);
for (let x = -5.2; x < 5.3; x += 0.3)
  box('hinoki', x, 0.75, -1.355, 0.08, 0.72, 0.06);
rail('bronze', [-5.3, 0.44, -0.85], [5.3, 0.44, -0.85], 0.035);
function stool(x, z) {
  cylinder('dark', x, 0.22, z, 0.31, 0.075, 12);
  cylinder('bronze', x, 0.52, z, 0.055, 0.62, 8);
  cylinder('cedar', x, 0.88, z, 0.33, 0.15, 16);
  const ring = new T.TorusGeometry(0.22, 0.022, 5, 12);
  ring.rotateX(Math.PI / 2);
  add(ring, 'bronze', x, 0.47, z);
  box('cedar', x, 1.12, z + 0.25, 0.52, 0.32, 0.07);
  colliders.push({
    id: `stool-${colliders.length}`,
    min: [x - 0.34, FLOOR, z - 0.34],
    max: [x + 0.34, 1.3, z + 0.34],
  });
}
for (const x of [-4.6, -3.05, -1.52, 0, 1.52, 3.05, 4.6]) stool(x, -0.1);
// Back wall storage: real shelves, ceramic bowls and original geometric sake bottles.
box('cedar', 0, 0.8, -6.22, 14, 1.24, 0.9, true, 'back-cabinet');
for (const y of [1.48, 2.15, 2.8]) box('hinoki', 0, y, -6.33, 13.8, 0.09, 0.7);
for (const x of [-6.6, -3.3, 0, 3.3, 6.6])
  box('cedar', x, 2.17, -6.35, 0.1, 1.43, 0.7);
function bottle(x, y, z, scale = 1) {
  cylinder('bottle', x, y + 0.135 * scale, z, 0.07 * scale, 0.27 * scale, 10);
  cylinder('bottle', x, y + 0.32 * scale, z, 0.032 * scale, 0.12 * scale, 8);
  cylinder('bronze', x, y + 0.39 * scale, z, 0.035 * scale, 0.035 * scale, 8);
  box(
    'rice',
    x,
    y + 0.16 * scale,
    z + 0.071 * scale,
    0.09 * scale,
    0.13 * scale,
    0.01,
  );
}
for (let x = -6; x <= 6; x += 0.8) {
  bottle(x, 1.53, -6.26, 1 + (Math.round(x * 10) % 3) * 0.09);
  if (Math.round(x * 10) % 2 === 0) bottle(x, 2.2, -6.3, 0.85);
}
function sushiPlate(x, y, z) {
  cylinder('celadon', x, y + 0.018, z, 0.22, 0.035, 16);
  for (const dz of [-0.075, 0.075]) {
    ellipsoid('rice', x, y + 0.075, z + dz, 0.11, 0.045, 0.052);
    ellipsoid('salmon', x, y + 0.115, z + dz, 0.13, 0.022, 0.06);
    for (const dx of [-0.055, 0, 0.055])
      box('rice', x + dx, y + 0.134, z + dz, 0.008, 0.005, 0.08);
  }
  ellipsoid('leaf', x + 0.16, y + 0.065, z - 0.05, 0.036, 0.03, 0.04);
}
for (const x of [-4.5, -2.9, -1.5, 0, 1.5, 2.9, 4.5]) {
  sushiPlate(x, 1.35, -1.8);
  bottle(x + 0.4, 1.35, -2.45, 0.8);
  for (const dx of [-0.04, 0.04])
    rail(
      'cedar',
      [x + 0.28 + dx, 1.37, -1.62],
      [x + 0.32 + dx, 1.37, -2.05],
      0.009,
    );
  cylinder('dark', x + 0.45, 1.365, -1.82, 0.065, 0.025, 10);
}
// Four-legged Japanese timber dining furniture; aisle and front approach remain open.
function chair(x,z, facing) {
  box('cedar',x,0.64,z,0.62,0.12,0.6,true,'timber-chair-seat');
  box('indigo',x,0.717,z,0.53,0.035,0.5);
  for (const dx of [-0.23,0.23]) for (const dz of [-0.22,0.22])
    box('cedar',x+dx,0.385,z+dz,0.075,0.41,0.075);
  for (const dx of [-0.25,0.25])
    box('cedar',x+dx,0.96,z-facing*0.25,0.065,0.7,0.065);
  box('hinoki',x,1.22,z-facing*0.25,0.59,0.16,0.07,true,'timber-chair-back');
  for (const dx of [-0.14,0,0.14])
    box('cedar',x+dx,1.01,z-facing*0.25,0.035,0.27,0.04);
}
for (const sign of [-1, 1])
  for (const z of [1.5, 5.4]) {
    const x = sign * 8.1;
    box('hinoki', x, 0.97, z, 2, 0.14, 1.55, true, 'dining-table');
    for (const dx of [-0.8,0.8]) for (const dz of [-0.57,0.57])
      box('cedar', x+dx,0.55,z+dz,0.13,0.74,0.13,true,'table-pedestal');
    box('cedar',x,0.58,z,1.7,0.1,0.12);
    for (const dz of [-1, 1]) {
      for (const dx of [-0.53,0.53]) chair(x+dx,z+dz*1.12,-dz);
    }
    sushiPlate(x - 0.53, 1.05, z-0.36);
    sushiPlate(x + 0.53, 1.05, z+0.36);
  }
// Rear kitchen separated from dining: open 1.8m staff door at x[7.3,9.1].
box('plaster',-2.35,2.2,-6.7,19.3,4.04,0.18,true,'kitchen-partition');
box('plaster',10.55,2.2,-6.7,2.9,4.04,0.18,true,'kitchen-partition');
box('cedar',8.2,3.7,-6.7,1.8,1.04,0.2,true,'staff-door-lintel');
for (const x of [7.23,9.17]) box('cedar',x,1.63,-6.69,0.14,2.9,0.24,true,'staff-door-jamb');
// Real sliding door leaf is parked left of the aperture, never blocking circulation.
box('cedar',6.36,1.61,-6.81,1.6,2.8,0.09,true,'staff-door-open-leaf');
box('glass',6.36,2.02,-6.75,1.16,0.68,0.035);
rail('bronze',[6.9,1.15,-6.71],[6.9,1.53,-6.71],0.022);
rail('dark',[5.5,3.08,-6.77],[9.2,3.08,-6.77],0.035);
function steelTable(x,z,w,d,id) {
  box('stainless',x,1.08,z,w,0.1,d,true,id);
  box('stainless',x,0.43,z,w-0.12,0.055,d-0.12);
  for(const dx of [-w/2+0.09,w/2-0.09]) for(const dz of [-d/2+0.09,d/2-0.09])
    box('stainless',x+dx,0.61,z+dz,0.07,0.86,0.07);
}
steelTable(-7.8,-9.9,5.4,1.3,'kitchen-prep');
box('stainless',-7.8,1.33,-10.49,5.4,0.5,0.06);
for(const x of [-9.3,-7.8,-6.3]) {
  box('hinoki',x,1.16,-9.85,0.7,0.05,0.48);
  cylinder('celadon',x+0.25,1.25,-10.1,0.17,0.15,12);
}
// Twin-bowl sink: walls and inset bases form visibly recessed bowls.
steelTable(-2.65,-9.9,3.8,1.3,'kitchen-sink-base');
for(const x of [-3.55,-1.75]) {
  box('dark',x,1.145,-9.9,1.35,0.02,0.85);
  box('stainless',x,1.16,-9.9,1.05,0.025,0.57);
  for(const dx of [-0.57,0.57]) box('stainless',x+dx,1.22,-9.9,0.06,0.15,0.7);
  for(const dz of [-0.37,0.37]) box('stainless',x,1.22,-9.9+dz,1.2,0.15,0.06);
  rail('stainless',[x,1.15,-10.4],[x,1.68,-10.4],0.035);
  rail('stainless',[x,1.68,-10.4],[x,1.68,-10.05],0.035);
  rail('stainless',[x,1.68,-10.05],[x,1.58,-10.05],0.035);
}
// Commercial range with six burners, control knobs, oven front and overhead hood.
box('stainless',2.1,0.69,-9.95,3.3,1.02,1.2,true,'kitchen-range');
box('dark',2.1,1.225,-9.95,3.2,0.05,1.1);
for(const x of [1.05,2.1,3.15]) for(const z of [-10.25,-9.7]) {
  cylinder('dark',x,1.27,z,0.19,0.06,12);
  rail('stainless',[x-0.23,1.31,z],[x+0.23,1.31,z],0.02);
  rail('stainless',[x,1.31,z-0.23],[x,1.31,z+0.23],0.02);
}
for(const x of [0.9,1.5,2.1,2.7,3.3]) ellipsoid('dark',x,1.06,-9.32,0.055,0.055,0.035);
box('dark',2.1,0.63,-9.335,2.6,0.51,0.04);
rail('stainless',[1,0.87,-9.28],[3.2,0.87,-9.28],0.035);
box('stainless',2.1,2.8,-9.9,3.75,0.43,1.65,true,'kitchen-extractor-hood');
box('dark',2.1,2.57,-9.9,3.4,0.035,1.35);
for(let x=0.5;x<3.8;x+=0.2) box('stainless',x,2.54,-9.9,0.055,0.05,1.2);
box('stainless',2.1,3.58,-10.1,1.15,1.15,0.8);
// Open pantry shelving at the east end, clear of the doorway aisle.
for(const y of [0.42,1.16,1.9,2.64]) box('stainless',10.45,y,-9.35,1.65,0.065,2.4,true,'kitchen-pantry-shelf');
for(const x of [9.72,11.18]) for(const z of [-10.45,-8.25]) box('stainless',x,1.43,z,0.07,2.5,0.07);
for(const y of [0.5,1.24,1.98]) for(const z of [-10.1,-9.35,-8.65]) {
  cylinder('rice',10.2,y+0.17,z,0.19,0.34,10);
  cylinder('dark',10.2,y+0.35,z,0.2,0.035,10);
  box('hinoki',10.8,y+0.13,z,0.4,0.26,0.44);
}
// Exterior menu and two quiet porch seats; neither occupies x[-2,2] door approach.
box('cedar', 4.0, 0.78, 9.35, 0.12, 1.2, 0.12, true, 'menu-post');
const menu = new T.BoxGeometry(0.8, 0.08, 0.7);
menu.rotateX(0.32);
add(menu, 'dark', 4, 1.42, 9.35);
for (let i = 0; i < 5; i++)
  box(
    'paper',
    4,
    1.48 + i * 0.012,
    9.15 + i * 0.065,
    0.56 - (i % 2) * 0.12,
    0.012,
    0.014,
  );
for (const x of [-6.8, -4.8]) {
  box('cedar', x, 0.47, 9.35, 1.35, 0.16, 0.58, true, 'outdoor-bench');
  for (const dx of [-0.48, 0.48])
    box('dark', x + dx, 0.29, 9.35, 0.12, 0.3, 0.5);
}
for (const x of [-8.5, 8.5]) {
  box('stone', x, 0.53, 9.2, 0.7, 0.7, 0.7, true, 'porch-planter');
  for (let i = 0; i < 5; i++) {
    const bx = x + (i - 2) * 0.1,
      bz = 9.2 + (i % 2) * 0.15;
    rail('leaf', [bx, 0.86, bz], [bx, 2.3 + (i % 3) * 0.15, bz], 0.028);
    for (let k = 0; k < 3; k++) {
      const leaf = new T.SphereGeometry(1, 6, 4);
      leaf.scale(0.24, 0.035, 0.08);
      leaf.rotateZ((k % 2 ? 1 : -1) * 0.5);
      add(leaf, 'leaf', bx + (k % 2 ? 0.14 : -0.14), 1.25 + k * 0.36, bz);
    }
  }
}
const scene = new T.Scene();
scene.name = 'GC-SUSHI-001';
let triangles = 0;
for (const [name, list] of Object.entries(buckets)) {
  const g = mergeVertices(mergeGeometries(list, false));
  g.computeBoundingBox();
  g.computeBoundingSphere();
  triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
  const mesh = new T.Mesh(g, materials[name]);
  mesh.name = `MoriSushi-${name}`;
  mesh.castShadow = name !== 'glass';
  mesh.receiveShadow = true;
  scene.add(mesh);
}
if (triangles >= 60000)
  throw new Error(`Triangle budget exceeded: ${triangles}`);
const bounds = new T.Box3().setFromObject(scene);
const data = await new GLTFExporter().parseAsync(scene, { binary: true });
await writeFile(new URL('sushi.glb', out), Buffer.from(data));
const manifest = {
  id: 'GC-SUSHI-001',
  name: 'Mori Sushi',
  nameZh: '森间寿司',
  units: 'METERS',
  upAxis: 'Y',
  frontAxis: '+Z',
  floorY: FLOOR,
  mainFootprintMeters: [24, 20],
  entrance: [0, 9.2],
  entranceWidth: 4,
  bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
  colliders,
  surfaces: [
    { min: [-11.76, -10.76], max: [11.76, 8.8], y: FLOOR },
    { min: [-11, 8.8], max: [11, 12.6], y: FLOOR },
  ],
  triangles,
  drawCalls: scene.children.length,
  bytes: data.byteLength,
  glb: 'sushi.glb',
  provenance: {
    creator: 'AmpliWorld',
    type: 'ORIGINAL_PROCEDURAL_GEOMETRY',
    externalImages: [],
    externalAssets: [],
  },
  functionality: 'VISUAL_ENTERABLE_RESTAURANT_ONLY',
  notes: [
    'Original geometry, not an imported photograph or proprietary restaurant replica.',
    'Real four-sided envelope, projecting fins, deep roof, lanterns, counter, stools and geometric food.',
    'Door approach x[-2,2] remains unobstructed. Room has wall/furniture colliders, never a full-volume collider.',
    'Interior is visually enterable; no ordering, checkout, staffing or simulated restaurant service is implemented.',
    'Main building is 24×20m including rear kitchen; roof eaves and porch extend beyond that footprint.',
    'Seven counter stools and sixteen Japanese timber dining chairs; unobstructed central circulation.',
    'Back kitchen z[-10.7,-6.5] has prep benches, twin sinks, six-burner range, extractor and stocked shelves. Staff aperture x[7.3,9.1] at z=-6.7 remains open.',
  ],
};
await writeFile(
  new URL('sushi-manifest.json', out),
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    id: manifest.id,
    triangles,
    drawCalls: manifest.drawCalls,
    bytes: data.byteLength,
    colliders: colliders.length,
  }),
);
