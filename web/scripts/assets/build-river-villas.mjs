/** Four original AmpliWorld river-villa prototypes, no imported art or textures.
 * Install as scripts/assets/build-river-villas.mjs. +Z street; -Z river.
 * Parent owns placement of60 detached homes; this file only exports reusable kits.
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
  '../../public/assets/3d/ampliworld/GC-VILLA-001/',
  import.meta.url,
);
const palettes = {
  ivory: [0xe3e1d3, 0.15, 0.51],
  stone: [0xaeb5b1, 0.07, 0.76],
  gold: [0xbea36d, 0.73, 0.3],
  dark: [0x253d4b, 0.55, 0.35],
  glazing: [0x779da8, 0.78, 0.2],
  glass: [0xb8d9da, 0.16, 0.12],
  wood: [0x917453, 0.1, 0.74],
  leaf: [0x54775c, 0, 0.93],
  water: [0x579eaa, 0.55, 0.15],
  light: [0xffe1a4, 0.22, 0.28],
};
const specs = [
  {
    id: 'RV-01',
    file: 'riverlight-terrace.glb',
    name: 'Riverlight Terrace',
    nameZh: '澜光叠院',
    kind: 'two-storey offset terraces',
    poolX: 4.2,
    pergolaX: -2.2,
    roofY: 7.36,
  },
  {
    id: 'RV-02',
    file: 'arc-pavilion.glb',
    name: 'Arc Pavilion',
    nameZh: '弧湾艺邸',
    kind: 'curved glass pavilion',
    poolX: -3.6,
    pergolaX: 1.5,
    roofY: 7.85,
  },
  {
    id: 'RV-03',
    file: 'lantern-courtyard.glb',
    name: 'Lantern Courtyard',
    nameZh: '灯庭水舍',
    kind: 'three-storey stepped lantern',
    poolX: 4.0,
    pergolaX: -2.0,
    roofY: 10.45,
  },
  {
    id: 'RV-04',
    file: 'folded-river-house.glb',
    name: 'Folded River House',
    nameZh: '折羽河居',
    kind: 'paired wings with folded roof',
    poolX: -3.8,
    pergolaX: 3.0,
    roofY: 7.48,
  },
];

function prototype(spec, index) {
  const buckets = {},
    materials = {},
    colliders = [],
    surfaces = [],
    features = [];
  for (const [name, [color, metalness, roughness]] of Object.entries(palettes))
    materials[name] = new T.MeshStandardMaterial({
      name,
      color,
      metalness,
      roughness,
    });
  materials.glass.transparent = true;
  materials.glass.opacity = 0.24;
  materials.glass.depthWrite = false;
  materials.glass.side = T.DoubleSide;
  materials.light.emissive = new T.Color(0xffd28b);
  materials.light.emissiveIntensity = 0.65;
  const add = (g, m, x = 0, y = 0, z = 0) => {
    g.translate(x, y, z);
    if (g.index) g = g.toNonIndexed();
    delete g.attributes.uv;
    (buckets[m] ??= []).push(g);
  };
  const box = (m, x, y, z, w, h, d) =>
    add(new T.BoxGeometry(w, h, d), m, x, y, z);
  const solid = (id, min, max) => colliders.push({ id, min, max });
  const support = (id, x0, z0, x1, z1, y) =>
    surfaces.push({ id, min: [x0, z0], max: [x1, z1], y });
  const rod = (m, a, b, r = 0.035, n = 6) => {
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
  };
  const plant = (x, y, z, r = 0.52) => {
    box('stone', x, y + 0.23, z, r * 1.75, 0.46, r * 1.75);
    add(new T.IcosahedronGeometry(r, 0), 'leaf', x, y + 0.46 + r * 0.65, z);
  };
  function rail(x0, z0, x1, z1, y, height = 1.04) {
    const dx = x1 - x0,
      dz = z1 - z0,
      length = Math.hypot(dx, dz);
    const g = new T.BoxGeometry(length, height, 0.045);
    g.rotateY(-Math.atan2(dz, dx));
    add(g, 'glass', (x0 + x1) / 2, y + height / 2, (z0 + z1) / 2);
    rod('gold', [x0, y + height, z0], [x1, y + height, z1], 0.035);
    const count = Math.max(1, Math.ceil(length / 2.6));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      rod(
        'gold',
        [x0 + dx * t, y, z0 + dz * t],
        [x0 + dx * t, y + height, z0 + dz * t],
        0.024,
        5,
      );
    }
    solid(
      `rail-${colliders.length}`,
      [Math.min(x0, x1) - 0.05, y, Math.min(z0, z1) - 0.05],
      [Math.max(x0, x1) + 0.05, y + height + 0.04, Math.max(z0, z1) + 0.05],
    );
  }
  function mass(id, x, z, w, d, bottom, height, material = 'glazing') {
    box(material, x, bottom + height / 2, z, w, height, d);
    box('ivory', x, bottom + 0.12, z, w + 0.28, 0.24, d + 0.28);
    box('ivory', x, bottom + height - 0.14, z, w + 0.4, 0.28, d + 0.4);
    solid(
      id,
      [x - w / 2, bottom, z - d / 2],
      [x + w / 2, bottom + height, z + d / 2],
    );
    for (const s of [-1, 1])
      box(
        'ivory',
        x + s * (w / 2 - 0.12),
        bottom + height / 2,
        z,
        0.26,
        height,
        d + 0.18,
      );
    for (let xx = x - w / 2 + 2; xx < x + w / 2 - 1; xx += 2.5)
      for (const s of [-1, 1])
        box(
          'gold',
          xx,
          bottom + height / 2,
          z + s * (d / 2 + 0.025),
          0.035,
          height - 0.3,
          0.045,
        );
  }
  function balcony(id, x, z, w, d, y) {
    box('ivory', x, y - 0.15, z, w, 0.3, d);
    box('gold', x, y - 0.285, z, w + 0.05, 0.055, d + 0.05);
    support(id, x - w / 2, z - d / 2, x + w / 2, z + d / 2, y);
    solid(
      `${id}-slab`,
      [x - w / 2, y - 0.3, z - d / 2],
      [x + w / 2, y, z + d / 2],
    );
    rail(
      x - w / 2 + 0.12,
      z - d / 2 + 0.12,
      x + w / 2 - 0.12,
      z - d / 2 + 0.12,
      y,
    );
    rail(
      x - w / 2 + 0.12,
      z - d / 2 + 0.12,
      x - w / 2 + 0.12,
      z + d / 2 - 0.12,
      y,
    );
    rail(
      x + w / 2 - 0.12,
      z - d / 2 + 0.12,
      x + w / 2 - 0.12,
      z + d / 2 - 0.12,
      y,
    );
  }
  function pergola(x, z, y, w = 6.4, d = 4.0) {
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        rod(
          'gold',
          [x + (sx * w) / 2, y, z + (sz * d) / 2],
          [x + (sx * w) / 2, y + 2.15, z + (sz * d) / 2],
          0.065,
          8,
        );
    for (const s of [-1, 1])
      box('gold', x, y + 2.19, z + (s * d) / 2, w + 0.22, 0.14, 0.16);
    for (let i = 0; i < 12; i++)
      box('wood', x - w / 2 + (i * w) / 11, y + 2.22, z, 0.16, 0.2, d + 0.4);
  }
  function closedGarage(x, z, w = 6.0, d = 6.2) {
    mass('sealed-garage', x, z, w, d, 0.18, 3.15, 'ivory');
    box('dark', x, 1.46, z + d / 2 + 0.11, w - 0.48, 2.55, 0.08);
    for (let y = 0.3; y < 2.72; y += 0.24)
      box('gold', x, y, z + d / 2 + 0.16, w - 0.62, 0.025, 0.035);
    box('light', x, 2.91, z + d / 2 + 0.23, w - 0.75, 0.045, 0.12);
    return [x, 0.18, z + d / 2 + 0.18];
  }
  // Local baseline0; the parent adds its placementY=.04. No terrain excavation.
  box('stone', 0, 0.03, 0, 26, 0.06, 28);
  support('parcel', -13, -14, 13, 14, 0.06);
  box('ivory', 0, 0.1, 3, 21.8, 0.16, 17.8);
  support('main-entry-paving', -10.9, -5.9, 10.9, 11.9, 0.18);
  for (const s of [-1, 1]) {
    box('dark', s * 11.8, 0.46, 0, 0.48, 0.8, 25);
    solid(
      `boundary-side-${s}`,
      [s * 11.8 - 0.24, 0.06, -12.5],
      [s * 11.8 + 0.24, 0.86, 12.5],
    );
  }
  // Real front gap: privacy piers do not close the street approach.
  for (const s of [-1, 1]) {
    box('ivory', s * 10.55, 1.12, 11.6, 1.3, 2.12, 1.3);
    solid(
      `arrival-pier-${s}`,
      [s * 10.55 - 0.65, 0.06, 10.95],
      [s * 10.55 + 0.65, 2.18, 12.25],
    );
  }

  let entrance = [-2, 0.18, 7.45],
    garage;
  if (index === 0) {
    mass('ground-residence', -2, -0.1, 14.2, 13.8, 0.18, 3.5);
    mass('upper-offset-residence', -3.4, -0.3, 12.2, 11.8, 3.68, 3.68);
    balcony('river-balcony', -2.4, -7.1, 13.3, 2.7, 3.7);
    balcony('east-bedroom-balcony', 4.0, -1.0, 2.5, 7.0, 7.36);
    garage = closedGarage(7.1, 4.9, 6.2, 6.0);
    box('ivory', -2, 3.3, 7.1, 5.4, 0.22, 2.5);
    entrance = [-2, 0.18, 6.91];
  }
  if (index === 1) {
    // Rounded full-volume pavilion, not a cylindrical texture on a box.
    const shape = new T.Shape(),
      w = 16.2,
      d = 13.6,
      r = 3.3;
    shape.moveTo(-w / 2 + r, -d / 2);
    shape.lineTo(w / 2 - r, -d / 2);
    shape.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
    shape.lineTo(w / 2, d / 2 - r);
    shape.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
    shape.lineTo(-w / 2 + r, d / 2);
    shape.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
    shape.lineTo(-w / 2, -d / 2 + r);
    shape.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
    for (const [y, h, m] of [
      [0.18, 7.67, 'glazing'],
      [0.18, 0.25, 'ivory'],
      [3.83, 0.26, 'ivory'],
      [7.59, 0.26, 'ivory'],
    ]) {
      const g = new T.ExtrudeGeometry(shape, {
        depth: h,
        bevelEnabled: false,
        curveSegments: 8,
      });
      g.rotateX(-Math.PI / 2);
      add(g, m, 0, y, -0.4);
    }
    solid('sealed-rounded-pavilion', [-8.1, 0.18, -7.2], [8.1, 7.85, 6.4]);
    for (let a = 0; a < 28; a++) {
      const angle = (a * Math.PI * 2) / 28;
      rod(
        'gold',
        [8.13 * Math.cos(angle), 0.45, -0.4 + 6.83 * Math.sin(angle)],
        [8.13 * Math.cos(angle), 7.55, -0.4 + 6.83 * Math.sin(angle)],
        0.038,
        5,
      );
    }
    balcony('curved-pavilion-river-deck', 1.6, -7.2, 12.8, 2.5, 3.85);
    garage = closedGarage(-7.0, 6.5, 6.4, 5.8);
    entrance = [3.2, 0.18, 6.55];
  }
  if (index === 2) {
    mass('lantern-ground', -2, 0.1, 14.8, 13.5, 0.18, 3.35);
    mass('lantern-middle', -1.1, -0.35, 13.4, 12.0, 3.53, 3.4);
    mass('lantern-penthouse', -2.5, -0.1, 9.7, 8.9, 6.93, 3.52);
    balcony('middle-river-balcony', -0.6, -7.0, 14.4, 3.0, 3.55);
    balcony('penthouse-river-terrace', -1.4, -6.6, 12.0, 3.7, 6.96);
    garage = closedGarage(7.2, 5.2, 6.4, 6.1);
    entrance = [-2.6, 0.18, 6.91];
  }
  if (index === 3) {
    mass('west-wing', -5.6, -0.1, 7.7, 13.8, 0.18, 7.3);
    mass('east-wing', 5.1, -1.3, 7.8, 11.4, 0.18, 7.3);
    mass('sealed-central-foyer', -0.1, 2.5, 3.6, 7.8, 0.18, 3.6, 'dark');
    mass('upper-glass-gallery', 0, -0.1, 6.8, 9.5, 3.78, 3.7);
    balcony('west-river-balcony', -5.6, -7.6, 8.6, 2.7, 3.88);
    balcony('east-river-balcony', 5.1, -7.4, 8.7, 2.6, 3.88);
    // Thick, capped folded roof planes visibly change silhouette.
    for (const s of [-1, 1]) {
      const g = new T.BoxGeometry(9.1, 0.28, 14.5);
      g.rotateZ(s * 0.12);
      add(g, 'ivory', s * 5.2, 8.2, -0.1);
      rod('gold', [s * 0.8, 8.74, -7.35], [s * 0.8, 8.74, 7.15], 0.1, 7);
    }
    garage = closedGarage(6.9, 7.1, 6.2, 5.5);
    entrance = [-0.1, 0.18, 6.49];
  }
  // All entries and garage doors are genuinely CLOSED, no fake traversable portal.
  box('wood', entrance[0], 1.47, entrance[2] + 0.1, 1.42, 2.58, 0.16);
  box('gold', entrance[0] + 0.47, 1.52, entrance[2] + 0.21, 0.045, 0.67, 0.035);
  solid(
    'closed-street-door',
    [entrance[0] - 0.75, 0.18, entrance[2]],
    [entrance[0] + 0.75, 2.8, entrance[2] + 0.22],
  );
  box('light', entrance[0], 2.95, entrance[2] + 0.16, 1.8, 0.065, 0.14);
  // Roof gardens/pergolas are real elevations and geometry, not scaled ground props.
  pergola(spec.pergolaX, -0.3, spec.roofY, 6.2, 4.0);
  for (const x of [-4.5, 0, 4.5]) plant(x, spec.roofY, 3.4, 0.62);
  support(
    'roof-garden-provisional',
    spec.pergolaX - 3.1,
    -2.3,
    spec.pergolaX + 3.1,
    1.7,
    spec.roofY,
  );
  box('wood', spec.pergolaX, spec.roofY + 0.055, -0.3, 6.25, 0.11, 4.1);
  box('ivory', spec.pergolaX, spec.roofY + 0.31, 0.8, 3.4, 0.52, 0.82);

  // Raised plunge pool: real basin depth1.03m, no uncut terrain under water.
  const px = spec.poolX,
    pz = -10.65,
    pw = 7.4,
    pd = 4.0,
    deckY = 1.18;
  box('dark', px, 0.11, pz, pw, 0.14, pd);
  for (const s of [-1, 1]) {
    box('ivory', px + s * (pw / 2 + 0.15), 0.63, pz, 0.3, 1.1, pd + 0.6);
    box('ivory', px, 0.63, pz + s * (pd / 2 + 0.15), pw, 1.1, 0.3);
  }
  box('water', px, 1.065, pz, pw - 0.1, 0.035, pd - 0.1);
  for (const s of [-1, 1]) {
    box('gold', px + s * (pw / 2 + 0.15), deckY, pz, 0.35, 0.08, pd + 0.65);
    box('gold', px, deckY, pz + s * (pd / 2 + 0.15), pw + 0.35, 0.08, 0.35);
  }
  // Transparent safety fencing makes the non-swimmable pool boundary visible.
  rail(
    px - pw / 2 - 0.38,
    pz - pd / 2 - 0.38,
    px + pw / 2 + 0.38,
    pz - pd / 2 - 0.38,
    deckY,
    0.96,
  );
  rail(
    px - pw / 2 - 0.38,
    pz + pd / 2 + 0.38,
    px + pw / 2 + 0.38,
    pz + pd / 2 + 0.38,
    deckY,
    0.96,
  );
  for (const s of [-1, 1])
    rail(
      px + s * (pw / 2 + 0.38),
      pz - pd / 2 - 0.38,
      px + s * (pw / 2 + 0.38),
      pz + pd / 2 + 0.38,
      deckY,
      0.96,
    );
  solid(
    'pool-basin',
    [px - pw / 2 - 0.32, 0.04, pz - pd / 2 - 0.32],
    [px + pw / 2 + 0.32, deckY, pz + pd / 2 + 0.32],
  );
  // Furnished dry river terrace, separate from the pool water volume.
  const tx = px > 0 ? -6.8 : 6.8;
  box('wood', tx, 0.61, -10.65, 6.5, 1.1, 4.9);
  support('river-dry-terrace', tx - 3.25, -13.1, tx + 3.25, -8.2, 1.16);
  solid(
    'river-terrace-platform',
    [tx - 3.25, 0.06, -13.1],
    [tx + 3.25, 1.16, -8.2],
  );
  for (const dx of [-1.25, 1.25]) {
    const g = new T.BoxGeometry(0.85, 0.22, 1.8);
    g.rotateX(-0.1);
    add(g, 'ivory', tx + dx, 1.49, -10.5);
    for (const z of [-11.1, -9.9])
      box('gold', tx + dx, 1.31, z, 0.7, 0.3, 0.09);
  }
  rail(tx - 3.15, -13.0, tx + 3.15, -13.0, 1.16);
  // Side access to raised terrace: six real183mm risers, all support rectangles.
  const stepX = tx + (tx < 0 ? -2.5 : 2.5);
  for (let i = 0; i < 6; i++) {
    const sy = 0.06 + ((i + 1) * 1.1) / 6,
      z1 = -5.2 - i * 0.5,
      z0 = z1 - 0.5;
    box('stone', stepX, (0.06 + sy) / 2, (z0 + z1) / 2, 1.3, sy - 0.06, 0.5);
    support(`river-terrace-step-${i}`, stepX - 0.65, z0, stepX + 0.65, z1, sy);
    solid(
      `river-terrace-step-solid-${i}`,
      [stepX - 0.65, 0.06, z0],
      [stepX + 0.65, sy, z1],
    );
  }
  for (const x of [-10.55, 10.55])
    for (const z of [-6.8, 1.0, 8.5]) plant(x, 0.18, z, 0.6);
  for (const x of [-5, 0, 5]) box('gold', x, 0.19, 10.5, 3.2, 0.016, 0.055);

  const scene = new T.Group();
  scene.name = spec.name;
  let triangles = 0;
  for (const [mat, list] of Object.entries(buckets)) {
    const g = mergeGeometries(list, false);
    if (!g) throw new Error(`Cannot merge:${mat}`);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    for (const n of g.attributes.position.array)
      if (!Number.isFinite(n)) throw new Error('Non-finite villa vertex');
    triangles += g.attributes.position.count / 3;
    const mesh = new T.Mesh(g, materials[mat]);
    mesh.name = `${spec.id}-${mat}`;
    scene.add(mesh);
    for (const source of list) source.dispose();
  }
  scene.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(scene);
  if (
    bounds.min.x < -13.001 ||
    bounds.max.x > 13.001 ||
    bounds.min.z < -14.001 ||
    bounds.max.z > 14.001
  )
    throw new Error(`Footprint violation:${spec.id}`);
  if (bounds.max.y < 9 || bounds.max.y > 13.01)
    throw new Error(`Height violation:${spec.id}:${bounds.max.y}`);
  // Only exterior ground/terrace supports are active; interior stairs/lifts and
  // access to balconies/roof gardens are explicitly a later gameplay layer.
  const exteriorSurfaces = surfaces.filter(
    (s) =>
      !s.id.includes('balcony') &&
      !s.id.includes('penthouse') &&
      !s.id.includes('roof-garden'),
  );
  exteriorSurfaces.sort((a, b) => b.y - a.y);
  return {
    scene,
    manifest: {
      id: spec.id,
      file: spec.file,
      name: spec.name,
      nameZh: spec.nameZh,
      kind: spec.kind,
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      height: bounds.max.y,
      footprintMeters: { width: 26, depth: 28 },
      localBaselineY: 0,
      parcelSurfaceY: 0.06,
      entryFloorY: 0.18,
      entrance,
      garageEntrance: garage,
      frontAxis: '+Z',
      riverViewAxis: '-Z',
      colliders,
      surfaces: exteriorSurfaces,
      upperSurfaces: surfaces.filter((s) => !exteriorSurfaces.includes(s)),
      triangles,
      drawCalls: scene.children.length,
      pool: {
        center: [px, pz],
        width: pw,
        depth: pd,
        waterY: 1.065,
        basinBottomY: 0.18,
        raisedBasin: true,
        swimmingEnabled: false,
      },
      provenance: {
        type: 'original-procedural',
        author: 'AmpliWorld',
        externalTextures: [],
        externalMeshes: [],
        notAReplica: true,
      },
      limitations: [
        'Street door and garage are closed; no implied playable interior.',
        'Upper balconies and roof gardens have geometry but access is future work.',
        'Plunge pools have visible safety fences; swimming is not implemented.',
      ],
    },
  };
}

const generated = [];
let totalBytes = 0,
  totalTriangles = 0;
for (const [i, spec] of specs.entries()) {
  const { scene, manifest } = prototype(spec, i),
    buffer = Buffer.from(
      await new GLTFExporter().parseAsync(scene, {
        binary: true,
        onlyVisible: true,
      }),
    );
  manifest.bytes = buffer.byteLength;
  totalBytes += buffer.byteLength;
  totalTriangles += manifest.triangles;
  generated.push({ buffer, manifest });
}
if (totalBytes > 3000000)
  throw new Error(`Four villa GLBs exceed3MB:${totalBytes}`);
await mkdir(out, { recursive: true });
for (const item of generated)
  await writeFile(new URL(item.manifest.file, out), item.buffer);
const manifest = {
  id: 'GC-VILLA-001',
  version: 1,
  units: 'meters',
  prototypeCount: 4,
  recommendedInstanceCount: 60,
  prototypes: generated.map((item) => item.manifest),
  stats: { totalBytes, totalTriangles },
  placementContract: {
    parentOwnsInstances: true,
    suggestedParentY: 0.04,
    frontAxis: '+Z',
    riverViewAxis: '-Z',
    maxLocalFootprint: { min: [-13, -14], max: [13, 14] },
  },
  claim:
    'Four original reusable villa designs; sixty placed instances require parent registry integration, not sixty hand-authored unique homes.',
};
await writeFile(
  new URL('villa-manifest.json', out),
  JSON.stringify(manifest, null, 2) + '\n',
);
process.stdout.write(JSON.stringify(manifest.stats) + '\n');
