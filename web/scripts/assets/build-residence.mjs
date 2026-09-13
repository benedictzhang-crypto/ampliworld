/** Original AMPLI residence asset. Units: metres; +Y up; entrance faces +Z.
 * Run: THREE_MODULE_ROOT=/absolute/path/to/node_modules/three node build-residence.mjs
 * Without an override, resolves the project's installed `three` package.
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const threeRoot =
  process.env.THREE_MODULE_ROOT || dirname(dirname(require.resolve('three')));
const THREE = await import(
  pathToFileURL(join(threeRoot, 'build/three.module.js')).href
);
const { GLTFExporter } = await import(
  pathToFileURL(join(threeRoot, 'examples/jsm/exporters/GLTFExporter.js')).href
);
const { mergeGeometries } = await import(
  pathToFileURL(join(threeRoot, 'examples/jsm/utils/BufferGeometryUtils.js'))
    .href
);
if (!globalThis.FileReader)
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((x) => {
        this.result = x;
        this.onloadend?.();
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((x) => {
        this.result = `data:${blob.type};base64,${Buffer.from(x).toString('base64')}`;
        this.onloadend?.();
      });
    }
  };
const out =
  process.env.RESIDENCE_OUTPUT_DIR ||
  join(dirname(fileURLToPath(import.meta.url)), 'output');
await mkdir(out, { recursive: true });
const palette = {
  concrete: new THREE.MeshStandardMaterial({
    name: 'Warm architectural concrete',
    color: 0xa9aca9,
    roughness: 0.83,
  }),
  white: new THREE.MeshStandardMaterial({
    name: 'Ivory ceramic cladding',
    color: 0xe8e8dc,
    roughness: 0.46,
  }),
  gold: new THREE.MeshStandardMaterial({
    name: 'Champagne anodized bronze',
    color: 0xb69455,
    metalness: 0.8,
    roughness: 0.28,
  }),
  frame: new THREE.MeshStandardMaterial({
    name: 'Graphite mullions',
    color: 0x262c30,
    metalness: 0.72,
    roughness: 0.34,
  }),
  glazing: new THREE.MeshStandardMaterial({
    name: 'Recessed blue smoked glazing',
    color: 0x233d48,
    metalness: 0.48,
    roughness: 0.18,
  }),
  glass: new THREE.MeshStandardMaterial({
    name: 'Balustrade laminated clear blue glass',
    color: 0xb2d3d7,
    transparent: true,
    opacity: 0.36,
    metalness: 0.05,
    roughness: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  paving: new THREE.MeshStandardMaterial({
    name: 'Terrace limestone',
    color: 0xc6c1af,
    roughness: 0.88,
  }),
  soil: new THREE.MeshStandardMaterial({
    name: 'Planter soil',
    color: 0x373c2c,
    roughness: 1,
  }),
  foliage: new THREE.MeshStandardMaterial({
    name: 'Evergreen roof planting',
    color: 0x456448,
    roughness: 0.95,
  }),
  leaf: new THREE.MeshStandardMaterial({
    name: 'Sage low planting',
    color: 0x829079,
    roughness: 0.95,
  }),
  trunk: new THREE.MeshStandardMaterial({
    name: 'Tree bark',
    color: 0x625544,
    roughness: 1,
  }),
  light: new THREE.MeshStandardMaterial({
    name: 'Warm entry lighting',
    color: 0xffdf9a,
    emissive: 0xffc572,
    emissiveIntensity: 1.5,
    roughness: 0.3,
  }),
};
const manifest = {
  id: 'GC-RES-001',
  name: 'Aurea Terraces — original residential building',
  version: 1,
  units: 'metres',
  upAxis: 'Y',
  frontAxis: '+Z',
  footprintMetres: { width: 32, depth: 24 },
  roofHeightMetres: 29.1,
  stories: 8,
  storyHeights: [4.2, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 3.9],
  interiors: {
    strategy: 'deferred-instanced',
    note: 'Opaque structural volumes are intentional. Apartment interiors can be instantiated separately after selection.',
  },
  entryAnchor: {
    position: [0, 0.36, 12.2],
    rotationRadians: [0, 0, 0],
    forward: [0, 0, 1],
  },
  balconies: [],
  lods: [],
};
const collision = {
  units: 'metres',
  upAxis: 'Y',
  type: 'aabb-compound',
  bounds: { min: [-16, 0, -12], max: [16, 29.1, 12] },
  solids: [
    { id: 'podium', min: [-16, 0, -12], max: [16, 0.36, 12] },
    { id: 'main-mass', min: [-13.8, 0.36, -9.2], max: [13.8, 25.2, 9.2] },
    { id: 'penthouse', min: [-10, 25.2, -6], max: [10, 28.9, 6] },
  ],
  entryAnchor: manifest.entryAnchor,
};
let buckets, lod;
function add(g, mat, x, y, z, ry = 0) {
  g.rotateY(ry);
  g.translate(x, y, z);
  (buckets[mat] ??= []).push(g);
}
function box(mat, x, y, z, w, h, d, ry = 0) {
  add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, ry);
}
function cyl(mat, x, y, z, r, h) {
  add(new THREE.CylinderGeometry(r, r, h, lod ? 6 : 10), mat, x, y, z);
}
function crown(mat, x, y, z, r, sy = 1) {
  let g = new THREE.IcosahedronGeometry(r, lod ? 0 : 1);
  g.scale(1, sy, 1);
  add(g, mat, x, y, z);
}
function planter(x, z, w, d, y = 25.42) {
  box('white', x, y + 0.25, z, w, 0.5, d);
  box('soil', x, y + 0.51, z, w - 0.12, 0.035, d - 0.12);
  if (lod < 2) {
    for (let i = 0; i < Math.max(2, Math.round(w)); i++)
      crown(
        'leaf',
        x - w * 0.38 + (i * w * 0.76) / Math.max(1, Math.round(w) - 1),
        y + 0.8,
        z,
        0.37,
        0.8,
      );
  }
}
function tree(x, z, y = 25.8) {
  cyl('trunk', x, y + 0.75, z, 0.08, 1.5);
  crown('foliage', x, y + 1.9, z, 0.85, 1.25);
}
function balcony(face, c, y, width, index) {
  const side = face === 'east' || face === 'west';
  const sign = face === 'north' || face === 'east' ? 1 : -1;
  // North is the +Z entry facade. Balcony floors project 2.5m / 2.2m.
  const depth = side ? 2.125 : 2.5,
    base = side ? 13.8 : 9.2,
    outer = base + depth;
  const p = (u, v, h) => (side ? [sign * v, h, u] : [u, h, sign * v]);
  const b = (mat, u, v, h, w, t, d) => {
    const [x, yy, z] = p(u, v, h);
    box(mat, x, yy, z, side ? d : w, t, side ? w : d);
  };
  b('white', c, base + depth / 2, y + 0.02, width, 0.26, depth + 0.15);
  if (lod < 2) {
    b(
      'paving',
      c,
      base + depth / 2,
      y + 0.16,
      width - 0.14,
      0.045,
      depth - 0.14,
    );
    b('glass', c, outer - 0.055, y + 0.75, width - 0.08, 1.12, 0.035);
    b('gold', c, outer - 0.055, y + 1.33, width, 0.055, 0.055);
    for (const s of [-1, 1]) {
      b(
        'glass',
        c + s * (width / 2 - 0.035),
        base + depth / 2,
        y + 0.75,
        0.035,
        1.12,
        depth,
      );
      b(
        'gold',
        c + s * (width / 2 - 0.035),
        base + depth / 2,
        y + 1.33,
        0.055,
        0.055,
        depth,
      );
    }
  }
  if (lod === 0) {
    for (const s of [-1, 1])
      b(
        'frame',
        c + s * (width / 2 - 0.075),
        outer - 0.055,
        y + 0.76,
        0.055,
        1.18,
        0.065,
      );
    if (index % 3 === 0) {
      const [x, yy, z] = p(c - width * 0.29, base + depth * 0.45, y + 0.19);
      box('concrete', x, yy + 0.2, z, 0.9, 0.4, 0.7);
      crown('leaf', x, yy + 0.6, z, 0.42, 0.75);
    }
  }
  if (lod === 0) {
    const id = `${face}-level-${Math.round((y - 4.2) / 3.5) + 1}-bay-${index}`;
    const a = p(c - width / 2, base, y - 0.11),
      bnd = p(c + width / 2, outer, y + 1.36);
    const min = a.map((v, i) => Math.min(v, bnd[i])),
      max = a.map((v, i) => Math.max(v, bnd[i]));
    manifest.balconies.push({
      id,
      facade: face,
      level: Math.round((y - 4.2) / 3.5) + 1,
      projectionMetres: depth,
      bounds: { min, max },
    });
    collision.solids.push({
      id,
      min: [min[0], y - 0.11, min[2]],
      max: [max[0], y + 0.15, max[2]],
    });
  }
}
function facade(face) {
  const side = face === 'east' || face === 'west';
  const sign = face === 'north' || face === 'east' ? 1 : -1;
  const base = side ? 13.8 : 9.2;
  const centers = side ? [-6, 0, 6] : [-10.2, -3.4, 3.4, 10.2];
  const width = side ? 5.5 : 6.2;
  const b = (mat, u, v, y, w, h, d) =>
    box(
      mat,
      side ? sign * v : u,
      y,
      side ? u : sign * v,
      side ? d : w,
      h,
      side ? w : d,
    );
  for (let k = 0; k < 6; k++) {
    let y = 4.2 + k * 3.5;
    for (let i = 0; i < centers.length; i++) {
      const c = centers[i];
      b('glazing', c, base - 0.22, y + 1.78, width - 0.2, 2.82, 0.12);
      if (lod === 0) {
        for (const dx of [-(width - 0.2) / 2, 0, (width - 0.2) / 2])
          b('frame', c + dx, base - 0.13, y + 1.78, 0.075, 2.85, 0.12);
        b('frame', c, base - 0.13, y + 3.17, width - 0.13, 0.07, 0.12);
        b('frame', c, base - 0.13, y + 0.4, width - 0.13, 0.07, 0.12);
      }
      balcony(face, c, y, width, i);
    }
    // Substantial concrete piers stand forward of recessed glazing.
    for (let i = 0; i <= centers.length; i++) {
      const step = side ? 6 : 6.8;
      const u = centers[0] - step / 2 + i * step;
      b(
        i % 2 ? 'concrete' : 'white',
        u,
        base + 0.04,
        y + 1.85,
        0.48,
        3.36,
        0.64,
      );
      if (lod === 0)
        b('gold', u - 0.16, base + 0.38, y + 1.85, 0.055, 3.34, 0.035);
    }
  }
}
function makeScene(level) {
  lod = level;
  buckets = {};
  const scene = new THREE.Scene();
  scene.name = `Aurea_Residence_LOD${lod}`;
  box('concrete', 0, 0.18, 0, 32, 0.36, 24);
  // Solid foundations, central structural mass, full-height shear volumes.
  box('concrete', 0, 12.77, 0, 25.5, 24.82, 15.4);
  box('white', 0, 2.2, -8.3, 27.6, 3.68, 1.8);
  box('glazing', 0, 2.25, 8.97, 26.5, 3.55, 0.2);
  for (const x of [-13.3, -9.2, -5.1, 5.1, 9.2, 13.3])
    box('white', x, 2.21, 9.28, 0.58, 3.7, 0.9);
  for (const x of [-13.55, 13.55]) {
    box('glazing', x, 2.25, 0, 0.18, 3.55, 17.8);
    for (const z of [-8, -4, 0, 4, 8])
      box('concrete', x, 2.21, z, 0.65, 3.7, 0.6);
  }
  for (let k = 0; k <= 6; k++) {
    const y = 4.2 + k * 3.5;
    box('white', 0, y - 0.05, 0, 28.15, 0.32, 18.9);
    if (lod === 0) {
      for (const z of [-9.48, 9.48])
        box('gold', 0, y + 0.075, z, 28.15, 0.045, 0.04);
    }
  }
  if (lod < 2) {
    for (const f of ['north', 'south', 'east', 'west']) facade(f);
  } else {
    for (let k = 0; k < 6; k++) {
      let y = 4.2 + k * 3.5;
      box('white', 0, y, 0, 32, 0.24, 23.4);
    }
    for (const z of [-9.23, 9.23]) box('glazing', 0, 14.8, z, 26.8, 20.8, 0.06);
    for (const x of [-13.83, 13.83])
      box('glazing', x, 14.8, 0, 0.06, 20.8, 17.8);
  }
  // Entrance portal, double doors, projecting bronze canopy, accessible level arrival.
  box('frame', 0, 1.9, 9.42, 4.1, 3.25, 0.24);
  box('glazing', 0, 1.85, 9.58, 3.65, 3.05, 0.09);
  box('gold', 0, 1.87, 9.65, 0.065, 3.05, 0.055);
  box('gold', 0, 3.7, 10.32, 7.2, 0.2, 3.15);
  box('white', 0, 3.56, 10.32, 6.95, 0.11, 2.95);
  if (lod === 0) {
    for (const x of [-2.4, 0, 2.4])
      box('light', x, 3.48, 10.4, 0.12, 0.025, 1.65);
    for (const x of [-0.18, 0.18]) box('gold', x, 1.72, 9.74, 0.04, 0.65, 0.06);
  }
  // Penthouse rises from an accessible, planted setback terrace.
  box('paving', 0, 25.39, 0, 27.5, 0.12, 18.4);
  box('concrete', 0, 27.02, 0, 19.5, 3.28, 11.5);
  box('white', 0, 28.82, 0, 21, 0.32, 13);
  for (const z of [-6.02, 6.02]) {
    box('glazing', 0, 27.08, z, 19.8, 2.98, 0.12);
    if (lod < 2) {
      for (const x of [-10, -6, -2, 2, 6, 10])
        box('white', x, 27.08, z + 0.08, 0.25, 3.12, 0.42);
      box('gold', 0, 28.69, z + 0.15, 20.9, 0.09, 0.12);
    }
  }
  for (const x of [-10.02, 10.02])
    box('glazing', x, 27.08, 0, 0.12, 2.98, 11.85);
  if (lod < 2) {
    for (const z of [-9.27, 9.27]) {
      box('glass', 0, 25.98, z, 27.8, 1.13, 0.035);
      box('gold', 0, 26.56, z, 27.8, 0.05, 0.05);
    }
    for (const x of [-13.84, 13.84]) {
      box('glass', x, 25.98, 0, 0.035, 1.13, 18.5);
      box('gold', x, 26.56, 0, 0.05, 0.05, 18.5);
    }
    for (const x of [-11.65, 11.65])
      for (const z of [-6.7, 0, 6.7]) {
        planter(x, z, 2, 1.8);
        tree(x, z);
      }
    for (const z of [-7.85, 7.85]) {
      planter(-5.7, z, 5.3, 1);
      planter(5.7, z, 5.3, 1);
    }
    // Lightweight garden pergola, outdoor seating and discreet rooftop plant screen.
    for (const x of [-4, 4])
      for (const z of [-8.55, -6.6]) box('gold', x, 26.58, z, 0.1, 2.4, 0.1);
    for (let x = -4; x <= 4; x += 0.55)
      box('gold', x, 27.83, -7.57, 0.09, 0.12, 2.25);
    for (const x of [-5, 5]) {
      box('white', x, 25.77, 7.1, 2.7, 0.48, 0.65);
      box('paving', x, 26.06, 7.1, 2.75, 0.11, 0.68);
    }
  }
  box('white', 0, 28.99, 0, 20.5, 0.2, 12.5);
  // Forecourt plant beds stay within the 32 x 24 metre podium envelope.
  if (lod < 2)
    for (const x of [-10.7, 10.7]) {
      planter(x, 10.7, 4.6, 1, 0.36);
    }
  let tris = 0,
    verts = 0;
  for (const [mat, geos] of Object.entries(buckets)) {
    const normalized = geos.map((g) => (g.index ? g.toNonIndexed() : g));
    const merged = mergeGeometries(normalized, false);
    merged.computeBoundingBox();
    merged.computeBoundingSphere();
    const mesh = new THREE.Mesh(merged, palette[mat]);
    mesh.name = `${lod}_${mat}`;
    mesh.castShadow = mat !== 'glass';
    mesh.receiveShadow = true;
    mesh.userData = { materialRole: mat, static: true };
    scene.add(mesh);
    verts += merged.attributes.position.count;
    tris += merged.attributes.position.count / 3;
    for (const g of normalized) g.dispose();
  }
  scene.userData = {
    assetId: manifest.id,
    units: 'metres',
    lod,
    entryAnchor: manifest.entryAnchor,
    interiorStrategy: 'deferred-instanced',
  };
  return {
    scene,
    stats: {
      level: lod,
      file: `residence-lod${lod}.glb`,
      triangles: tris,
      vertices: verts,
      drawCalls: scene.children.length,
    },
  };
}
for (let level = 0; level < 3; level++) {
  const { scene, stats } = makeScene(level);
  const data = await new GLTFExporter().parseAsync(scene, {
    binary: true,
    onlyVisible: true,
    trs: false,
  });
  await writeFile(join(out, stats.file), Buffer.from(data));
  stats.bytes = data.byteLength;
  manifest.lods.push(stats);
  console.log(JSON.stringify(stats));
}
await writeFile(
  join(out, 'residence-manifest.json'),
  JSON.stringify(manifest, null, 2),
);
await writeFile(
  join(out, 'collision.json'),
  JSON.stringify(collision, null, 2),
);
await writeFile(
  join(out, 'entry-anchor.json'),
  JSON.stringify(
    { units: 'metres', upAxis: 'Y', ...manifest.entryAnchor },
    null,
    2,
  ),
);
console.log(
  `Exported ${manifest.balconies.length} semantic balconies to ${out}`,
);
