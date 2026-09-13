/** Six ORIGINAL angular skyline towers in two independently exported campus kits.
 * Install as scripts/assets/build-subcenters.mjs. Metres, local groundY=.035.
 */
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
const G = 0.18,
  configs = [
    {
      id: 'GC-SUBCENTER-001',
      name: 'Vector Finance and Innovation',
      nameZh: '向量金融创新副中心',
      flavor: 'cool blue, silver and structural gold',
      towers: [
        {
          id: 'SC1-T01',
          name: 'Vector Exchange',
          height: 280,
          x: -132,
          z: -90,
          type: 'vector',
        },
        {
          id: 'SC1-T02',
          name: 'Twin Fold',
          height: 220,
          x: 132,
          z: -90,
          type: 'twin',
        },
        {
          id: 'SC1-T03',
          name: 'Prism Stack',
          height: 170,
          x: 0,
          z: 130,
          type: 'stack',
        },
      ],
    },
    {
      id: 'GC-SUBCENTER-002',
      name: 'Southern Bay Culture and Hospitality',
      nameZh: '南湾文化酒店副中心',
      flavor: 'warm ivory, bronze, dark glass and planted terraces',
      towers: [
        {
          id: 'SC2-T01',
          name: 'Tidal Lantern',
          height: 245,
          x: -132,
          z: -90,
          type: 'tidal',
        },
        {
          id: 'SC2-T02',
          name: 'Harbor Ledger',
          height: 190,
          x: 132,
          z: -90,
          type: 'ledger',
        },
        {
          id: 'SC2-T03',
          name: 'Culture Beacon',
          height: 155,
          x: 0,
          z: 130,
          type: 'beacon',
        },
      ],
    },
  ];
function createCampus(config) {
  const buckets = {},
    colliders = [],
    surfaces = [],
    towers = [],
    materials = {};
  let activeBounds = null,
    towerTopY = Infinity;
  for (const [name, color, metalness, roughness] of [
    ['ivory', 0xe1e2d7, 0.18, 0.47],
    ['silver', 0xb8c6cd, 0.8, 0.28],
    ['gold', 0xc3a369, 0.76, 0.29],
    ['blue', 0x507889, 0.76, 0.21],
    ['glass', 0x8eacb5, 0.73, 0.23],
    ['dark', 0x283c48, 0.55, 0.39],
    ['stone', 0xb2bcb6, 0.06, 0.8],
    ['leaf', 0x5a7d61, 0, 0.9],
    ['light', 0xffdfa7, 0.17, 0.3],
  ])
    materials[name] = new T.MeshStandardMaterial({
      name,
      color,
      metalness,
      roughness,
    });
  materials.light.emissive = new T.Color(0xffdda4);
  materials.light.emissiveIntensity = 0.5;
  function add(g, m, x = 0, y = 0, z = 0) {
    g.translate(x, y, z);
    if (g.index) g = g.toNonIndexed();
    delete g.attributes.uv;
    g.computeBoundingBox();
    if (activeBounds) activeBounds.union(g.boundingBox);
    (buckets[m] ??= []).push(g);
  }
  function box(m, x, y, z, w, h, d) {
    add(new T.BoxGeometry(w, h, d), m, x, y, z);
  }
  function solid(id, min, max) {
    colliders.push({ id, min, max });
  }
  function surface(id, x0, z0, x1, z1, y) {
    surfaces.push({ id, min: [x0, z0], max: [x1, z1], y });
  }
  function rod(m, a, b, w = 0.3, d = 0.3) {
    a = [...a];
    b = [...b];
    // Terminate structural fins beneath crown caps, keeping exact tower heights.
    if (a[1] >= towerTopY - 0.001) a[1] -= 0.8;
    if (b[1] >= towerTopY - 0.001) b[1] -= 0.8;
    const p = new T.Vector3(...a),
      q = new T.Vector3(...b),
      v = q.clone().sub(p),
      g = new T.BoxGeometry(w, v.length(), d);
    g.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        v.normalize(),
      ),
    );
    const c = p.add(q).multiplyScalar(0.5);
    add(g, m, c.x, c.y, c.z);
  }
  const octagon = (rx, rz) => [
    [rx * 0.72, -rz],
    [rx, -rz * 0.66],
    [rx, rz * 0.66],
    [rx * 0.72, rz],
    [-rx * 0.72, rz],
    [-rx, rz * 0.66],
    [-rx, -rz * 0.66],
    [-rx * 0.72, -rz],
  ];
  // Closed, flat-shaded polygon loft. Welding later retains hard crease normals.
  function loft(id, cx, cz, rings, mat) {
    const v = [],
      f = [],
      n = rings[0].p.length;
    for (const ring of rings)
      for (const [x, z] of ring.p) v.push(cx + x, G + ring.y, cz + z);
    for (let i = 0; i < rings.length - 1; i++)
      for (let j = 0; j < n; j++) {
        const a = i * n + j,
          b = i * n + ((j + 1) % n),
          c = a + n,
          d = b + n;
        f.push(a, c, b, b, c, d);
      }
    for (const last of [false, true]) {
      const r = last ? rings.length - 1 : 0,
        ring = rings[r],
        c = ring.p.reduce(
          (acc, p) => [acc[0] + p[0] / n, acc[1] + p[1] / n],
          [0, 0],
        ),
        center = v.length / 3;
      v.push(cx + c[0], G + ring.y, cz + c[1]);
      for (let j = 0; j < n; j++)
        f.push(
          ...(last
            ? [center, r * n + ((j + 1) % n), r * n + j]
            : [center, r * n + j, r * n + ((j + 1) % n)]),
        );
    }
    let g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(v, 3));
    g.setIndex(f);
    g = g.toNonIndexed();
    g.computeVertexNormals();
    add(g, mat);
    if (id)
      for (let i = 0; i < rings.length - 1; i++) {
        const bounds = new T.Box3();
        for (const r of [rings[i], rings[i + 1]])
          for (const [x, z] of r.p)
            bounds.expandByPoint(new T.Vector3(cx + x, G + r.y, cz + z));
        solid(`${id}-${i}`, bounds.min.toArray(), bounds.max.toArray());
      }
  }
  function polygonSlab(cx, cz, y, p, thickness = 0.28, mat = 'silver') {
    loft(
      null,
      cx,
      cz,
      [
        { y: y - thickness, p },
        { y, p },
      ],
      mat,
    );
  }
  function ringsFrom(levels, shape) {
    return levels.map(([y, rx, rz, dx = 0, dz = 0]) => ({
      y,
      p: shape(rx, rz).map(([x, z]) => [x + dx, z + dz]),
    }));
  }
  function facadeBands(cx, cz, rings, step = 6) {
    for (let y = rings[0].y + step; y < rings.at(-1).y - 0.5; y += step) {
      let i = 0;
      while (i < rings.length - 2 && y > rings[i + 1].y) i++;
      const a = rings[i],
        b = rings[i + 1],
        t = (y - a.y) / (b.y - a.y),
        p = a.p.map((pt, j) => [
          pt[0] + (b.p[j][0] - pt[0]) * t,
          pt[1] + (b.p[j][1] - pt[1]) * t,
        ]);
      polygonSlab(
        cx,
        cz,
        y,
        p.map(([x, z]) => [x * 1.004, z * 1.004]),
        0.2,
        Math.round(y / step) % 6 === 0 ? 'gold' : 'silver',
      );
    }
  }
  function tree(x, y, z) {
    box('stone', x, y + 0.35, z, 3.5, 0.7, 3.5);
    add(new T.IcosahedronGeometry(1.4, 0), 'leaf', x, y + 1.5, z);
  }
  // Three separate podiums; the connective civic space stays open at ground.
  box('stone', 0, G / 2, 0, 500, G, 500);
  surface('campus', -250, -250, 250, 250, G);
  box('ivory', 0, G + 0.012, 0, 500, 0.024, 16);
  box('ivory', 0, G + 0.012, -95, 16, 0.024, 310);
  // Southern arrival doglegs around the southern tower rather than through it.
  box('ivory', 80, G + 0.012, 150, 16, 0.024, 200);
  box('ivory', 40, G + 0.012, 242, 80, 0.024, 16);
  box('ivory', 40, G + 0.012, 50, 80, 0.024, 16);
  for (const x of [-210, 210])
    for (const z of [-210, 210]) {
      box('dark', x, 0.6, z, 24, 1.13, 12);
      for (const dx of [-7, 0, 7]) tree(x + dx, 1.165, z);
    }
  for (const x of [-62, 62])
    for (const z of [-20, 24]) {
      box('ivory', x, 0.43, z, 18, 0.79, 2.4);
      box('gold', x, 0.85, z, 18.1, 0.05, 2.5);
      solid(
        `plaza-bench-${x}-${z}`,
        [x - 9, G, z - 1.25],
        [x + 9, 0.88, z + 1.25],
      );
    }

  for (const spec of config.towers) {
    const x = spec.x,
      z = spec.z,
      H = spec.height;
    activeBounds = new T.Box3();
    towerTopY = G + H;
    // Closed street lobbies have true grounded mass and dimensional door frames.
    const podium = octagon(42, 37);
    loft(
      `${spec.id}-podium`,
      x,
      z,
      [
        { y: 0, p: podium },
        { y: 6, p: podium },
      ],
      'dark',
    );
    polygonSlab(x, z, 6.2, octagon(43, 38), 0.25, 'ivory');
    box('gold', x, G + 3.0, z + 37.12, 12, 5.2, 0.24);
    box('blue', x, G + 2.9, z + 37.28, 10.8, 4.7, 0.12);
    box('ivory', x, G + 5.5, z + 40, 20, 0.35, 8);
    solid(
      `${spec.id}-entry-canopy`,
      [x - 10, G + 5.325, z + 36],
      [x + 10, G + 5.675, z + 44],
    );
    for (const s of [-1, 1]) {
      box('silver', x + s * 8.8, G + 2.75, z + 41, 0.3, 5.5, 0.3);
      solid(
        `${spec.id}-entry-column-${s}`,
        [x + s * 8.8 - 0.16, G, z + 40.84],
        [x + s * 8.8 + 0.16, G + 5.5, z + 41.16],
      );
    }
    let sections;
    if (spec.type === 'vector') {
      sections = ringsFrom(
        [
          [6, 29, 25],
          [78, 29, 25, 0, 0],
          [160, 25, 23, 8, 0],
          [234, 20, 20, 11, -2],
          [280, 12, 17, -2, 0],
        ],
        octagon,
      );
      loft(spec.id, x, z, sections, 'blue');
      facadeBands(x, z, sections, 6);
      for (const side of [0, 2, 4, 6])
        for (let i = 0; i < sections.length - 1; i++) {
          const a = sections[i],
            b = sections[i + 1];
          rod(
            'ivory',
            [x + a.p[side][0], G + a.y, z + a.p[side][1]],
            [x + b.p[side][0], G + b.y, z + b.p[side][1]],
            1.1,
            1.0,
          );
        }
    } else if (spec.type === 'twin') {
      for (const s of [-1, 1]) {
        const h = s < 0 ? 220 : 194;
        const r = ringsFrom(
          [
            [6, 12, 22, s * 15, 0],
            [98, 12, 21, s * 13, 0],
            [h, 9.5, 16, s * 10, s * 3],
          ],
          octagon,
        );
        loft(`${spec.id}-blade-${s}`, x, z, r, s < 0 ? 'glass' : 'blue');
        facadeBands(x, z, r, 6);
        for (const edge of [0, 4])
          rod(
            'ivory',
            [x + r[0].p[edge][0], G + 6, z + r[0].p[edge][1]],
            [x + r.at(-1).p[edge][0], G + h, z + r.at(-1).p[edge][1]],
            0.65,
            0.8,
          );
      }
      box('gold', x, G + 135, z, 46, 10, 13);
      solid(
        `${spec.id}-sky-link`,
        [x - 23, G + 130, z - 6.5],
        [x + 23, G + 140, z + 6.5],
      );
    } else if (spec.type === 'stack') {
      sections = ringsFrom(
        [
          [6, 29, 25],
          [55, 29, 25],
          [56, 24, 23, 5, 0],
          [111, 24, 23, 5, 0],
          [112, 18, 20, -3, 0],
          [170, 18, 20, -3, 0],
        ],
        octagon,
      );
      loft(spec.id, x, z, sections, 'glass');
      facadeBands(x, z, sections, 5.8);
      for (const [y, rx, rz, dx] of [
        [55.2, 31, 27, 0],
        [111.2, 26, 25, 5],
      ]) {
        polygonSlab(x + dx, z, y, octagon(rx, rz), 0.45, 'ivory');
        for (const sx of [-1, 1])
          tree(x + dx + sx * (rx - 3), G + y, z + rz - 4);
      }
    } else if (spec.type === 'tidal') {
      const chevron = (rx, rz) => [
        [rx, -rz],
        [rx, rz * 0.62],
        [rx * 0.28, rz],
        [0, rz * 0.28],
        [-rx * 0.28, rz],
        [-rx, rz * 0.62],
        [-rx, -rz],
        [0, -rz * 0.35],
      ];
      sections = ringsFrom(
        [
          [6, 29, 25],
          [85, 30, 24, 0, 0],
          [165, 25, 23, 5, 0],
          [231, 19, 20, 0, 2],
          [245, 18, 18, 0, 2],
        ],
        chevron,
      );
      loft(spec.id, x, z, sections, 'glass');
      facadeBands(x, z, sections, 6.5);
      for (const j of [0, 2, 4, 6])
        for (let i = 0; i < sections.length - 1; i++) {
          const a = sections[i],
            b = sections[i + 1];
          rod(
            'gold',
            [x + a.p[j][0], G + a.y, z + a.p[j][1]],
            [x + b.p[j][0], G + b.y, z + b.p[j][1]],
            0.65,
            0.65,
          );
        }
    } else if (spec.type === 'ledger') {
      sections = ringsFrom(
        [
          [6, 29, 17],
          [57, 29, 17],
          [58, 26, 17, 2, 0],
          [112, 26, 17, 2, 0],
          [113, 22, 16, -3, 1],
          [166, 22, 16, -3, 1],
          [167, 18, 15, 0, 1],
          [190, 18, 15, 0, 1],
        ],
        octagon,
      );
      loft(spec.id, x, z, sections, 'blue');
      facadeBands(x, z, sections, 5.7);
      for (const [y, rx] of [
        [57.3, 30],
        [112.3, 28],
        [166.3, 24],
      ]) {
        polygonSlab(x, z, y, octagon(rx, 21), 0.38, 'ivory');
        tree(x + rx - 3, G + y, z + 17);
        tree(x - rx + 3, G + y, z + 17);
      }
      for (const sx of [-1, 1])
        rod(
          'gold',
          [x + sx * 28, G + 6, z - 17],
          [x + sx * 18, G + 190, z - 14],
          0.75,
          0.8,
        );
    } else {
      const bevel = (rx, rz) => [
        [rx * 0.5, -rz],
        [rx, -rz * 0.4],
        [rx, rz * 0.45],
        [rx * 0.25, rz],
        [-rx * 0.7, rz],
        [-rx, rz * 0.2],
        [-rx, -rz * 0.6],
        [-rx * 0.4, -rz],
      ];
      sections = ringsFrom(
        [
          [6, 29, 26],
          [61, 29, 26],
          [119, 22, 22, 4, 0],
          [146, 24, 20, 0, -2],
          [155, 16, 13, -6, -2],
        ],
        bevel,
      );
      loft(spec.id, x, z, sections, 'glass');
      facadeBands(x, z, sections, 6.5);
      for (const j of [1, 3, 5, 7])
        for (let i = 0; i < sections.length - 1; i++) {
          const a = sections[i],
            b = sections[i + 1];
          rod(
            'ivory',
            [x + a.p[j][0], G + a.y, z + a.p[j][1]],
            [x + b.p[j][0], G + b.y, z + b.p[j][1]],
            0.9,
            0.9,
          );
        }
    }
    // Vertical champagne lobby fins at human scale, all grounded on the plinth.
    for (let f = -30; f <= 30; f += 5)
      box(
        config.id.endsWith('002') ? 'gold' : 'silver',
        x + f,
        G + 3,
        z - 37.05,
        0.22,
        5.8,
        0.4,
      );
    const measured = activeBounds.clone();
    activeBounds = null;
    towerTopY = Infinity;
    towers.push({
      ...spec,
      position: [x, G, z],
      height: H,
      bounds: { min: measured.min.toArray(), max: measured.max.toArray() },
      entrance: [x, G, z + 37.5],
      interiorState: 'closed-future',
      provenance:
        'Original parameterized solid geometry, not a landmark replica',
    });
  }
  const scene = new T.Group();
  scene.name = config.name;
  let triangles = 0,
    vertices = 0;
  for (const [name, list] of Object.entries(buckets)) {
    const merged = mergeGeometries(list, false);
    if (!merged) throw new Error(`Merge failed:${name}`);
    // Welding preserves coincident positions+normals and yields indexed GLB meshes.
    const g = mergeVertices(merged, 1e-5);
    merged.dispose();
    for (const source of list) source.dispose();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    for (const n of g.attributes.position.array)
      if (!Number.isFinite(n)) throw new Error('Invalid vertex');
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
    vertices += g.attributes.position.count;
    const mesh = new T.Mesh(g, materials[name]);
    mesh.name = `${config.id}-${name}`;
    scene.add(mesh);
  }
  scene.updateMatrixWorld(true);
  const bounds = new T.Box3().setFromObject(scene);
  if (
    bounds.min.x < -250.001 ||
    bounds.max.x > 250.001 ||
    bounds.min.z < -250.001 ||
    bounds.max.z > 250.001
  )
    throw new Error('Campus bounds exceeded');
  const minGap = Math.min(
    ...towers.flatMap((a, i) =>
      towers
        .slice(i + 1)
        .map((b) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(86, 76)),
    ),
  );
  if (minGap < 50)
    throw new Error(`Insufficient building separation:${minGap}`);
  return {
    scene,
    manifest: {
      id: config.id,
      name: config.name,
      nameZh: config.nameZh,
      flavor: config.flavor,
      version: 1,
      file: 'center.glb',
      units: 'meters',
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      groundY: G,
      colliders,
      surfaces,
      towers,
      connections: {
        east: [250, 0],
        west: [-250, 0],
        north: [0, -250],
        south: [0, 250],
      },
      routes: {
        southArrival: [
          [0, 250],
          [80, 242],
          [80, 50],
          [0, 50],
          [0, 0],
        ],
        otherConnections: 'Clear cardinal plaza spines',
      },
      stats: {
        triangles,
        vertices,
        drawCalls: scene.children.length,
        indexed: true,
        conservativeMinimumTowerGap: minGap,
      },
      provenance: {
        type: 'original-procedural',
        author: 'AmpliWorld',
        externalImages: [],
        externalMeshes: [],
        landmarkReplicas: false,
      },
      limitations: [
        'Closed ground lobbies; interiors, elevators and named commercial functions are future integration.',
        'Raised sky gardens are exterior geometry, not currently accessible gameplay spaces.',
        'Main CBD and subcenter world positions belong to parent registry.',
      ],
    },
  };
}
const assets = [];
let totalBytes = 0;
for (const config of configs) {
  const { scene, manifest } = createCampus(config),
    buffer = Buffer.from(
      await new GLTFExporter().parseAsync(scene, {
        binary: true,
        onlyVisible: true,
      }),
    );
  manifest.stats.bytes = buffer.byteLength;
  totalBytes += buffer.byteLength;
  assets.push({ manifest, buffer });
}
if (totalBytes > 1600000)
  throw new Error(`Combined indexed subcenter GLBs exceed1.6MB:${totalBytes}`);
for (const { manifest, buffer } of assets) {
  const out = new URL(
    `../../public/assets/3d/ampliworld/${manifest.id}/`,
    import.meta.url,
  );
  await mkdir(out, { recursive: true });
  await writeFile(new URL('center.glb', out), buffer);
  await writeFile(
    new URL('center-manifest.json', out),
    JSON.stringify(manifest, null, 2) + '\n',
  );
}
process.stdout.write(
  JSON.stringify({
    totalBytes,
    centers: assets.map((a) => ({ id: a.manifest.id, ...a.manifest.stats })),
  }) + '\n',
);
