/** AmpliWorld ORIGINAL structural skyline v2: voids, bridges and sculptural crowns.
 * Install as web/scripts/assets/build-cbd.mjs. All geometry is authored here.
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
const specs = [
  {
    id: 'GC-OFFICE-001',
    name: 'Aperture Arc',
    nameZh: '天隙之门',
    height: 500,
    design:
      'Two unequal leaning glass blades, a descending high cantilever and a colossal open aperture. No twist or needle crown.',
  },
  {
    id: 'GC-OFFICE-002',
    name: 'Orbit Twins',
    nameZh: '双轨云庭',
    height: 350,
    design:
      'Dissimilar curved towers, offset short skybridges, projecting sky terraces and broad split fork crowns.',
  },
  {
    id: 'GC-OFFICE-003',
    name: 'Halo Nexus',
    nameZh: '环穹枢纽',
    height: 420,
    design:
      'An offset broad curved volume with lateral structural ribs and a monumental tilted oval crown; no stepped spire.',
  },
];
const palette = {
  glass: [0x557e8d, 0.8, 0.2],
  blue: [0x274b61, 0.78, 0.22],
  pearl: [0xb8d0d0, 0.68, 0.22],
  gold: [0xc2a26a, 0.8, 0.27],
  white: [0xe5e6df, 0.45, 0.3],
  dark: [0x25333b, 0.42, 0.42],
  stone: [0xc4c4bc, 0.06, 0.72],
  light: [0xf4d8a2, 0.28, 0.35],
};

function generate(spec) {
  const buckets = {},
    colliders = [],
    mats = {};
  for (const [key, [color, metalness, roughness]] of Object.entries(palette)) {
    mats[key] = new T.MeshStandardMaterial({
      name: key,
      color,
      metalness,
      roughness,
    });
    if (key === 'light') {
      mats[key].emissive = new T.Color(0xf4d8a2);
      mats[key].emissiveIntensity = 0.7;
    }
  }
  function add(g, m) {
    if (g.index) g = g.toNonIndexed();
    delete g.attributes.uv;
    (buckets[m] ??= []).push(g);
  }
  function box(m, x, y, z, w, h, d) {
    const g = new T.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    add(g, m);
  }
  function solid(id, min, max) {
    colliders.push({ id, min, max });
  }
  function geometry(points, faces) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(points, 3));
    g.setIndex(faces);
    g.computeVertexNormals();
    return g;
  }
  function tube(points, r, m, steps = 48, radial = 5, closed = false) {
    const curve = new T.CatmullRomCurve3(
      points.map((p) => (p.isVector3 ? p : new T.Vector3(...p))),
      closed,
    );
    add(new T.TubeGeometry(curve, steps, r, radial, closed), m);
  }
  function roundedSlab(m, cx, y, cz, w, d, h, r = 8) {
    const p = new T.Shape(),
      x = -w / 2,
      z = -d / 2;
    p.moveTo(x + r, z);
    p.lineTo(-x - r, z);
    p.quadraticCurveTo(-x, z, -x, z + r);
    p.lineTo(-x, -z - r);
    p.quadraticCurveTo(-x, -z, -x - r, -z);
    p.lineTo(x + r, -z);
    p.quadraticCurveTo(x, -z, x, -z - r);
    p.lineTo(x, z + r);
    p.quadraticCurveTo(x, z, x + r, z);
    const g = new T.ExtrudeGeometry(p, {
      depth: h,
      bevelEnabled: false,
      curveSegments: 6,
    });
    g.rotateX(-Math.PI / 2);
    g.translate(cx, y, cz);
    add(g, m);
  }
  // Sweep closed sections, including their end caps. Collider bands track each
  // leg/bridge separately; the void between structures is never one giant box.
  function sweep(
    sample,
    levels = 72,
    sides = 40,
    mat = 'glass',
    colliderId = null,
  ) {
    const v = [],
      faces = [];
    for (let i = 0; i <= levels; i++)
      for (let j = 0; j <= sides; j++)
        v.push(...sample(i / levels, (j / sides) * Math.PI * 2));
    for (let i = 0; i < levels; i++)
      for (let j = 0; j < sides; j++) {
        const a = i * (sides + 1) + j,
          b = a + sides + 1;
        faces.push(a, b, a + 1, a + 1, b, b + 1);
      }
    add(geometry(v, faces), mat);
    for (const t of [0, 1]) {
      const ring = Array.from({ length: sides }, (_, j) =>
        sample(t, (j / sides) * Math.PI * 2),
      );
      const center = ring.reduce(
        (acc, p) => acc.map((u, k) => u + p[k] / sides),
        [0, 0, 0],
      );
      const f = [];
      for (let j = 0; j < sides; j++)
        f.push(
          ...(t
            ? [0, ((j + 1) % sides) + 1, j + 1]
            : [0, j + 1, ((j + 1) % sides) + 1]),
        );
      add(geometry([...center, ...ring.flat()], f), 'white');
    }
    if (colliderId)
      for (let start = 0; start < levels; start += 4) {
        const bounds = new T.Box3();
        for (let i = start; i <= Math.min(start + 4, levels); i++)
          for (let j = 0; j < sides; j++)
            bounds.expandByPoint(
              new T.Vector3(...sample(i / levels, (j / sides) * Math.PI * 2)),
            );
        solid(
          `${colliderId}-${start / 4}`,
          bounds.min.toArray(),
          bounds.max.toArray(),
        );
      }
  }
  function bands(sample, count, mat = 'white', sides = 40) {
    // Real thin metallic strips, not painted facade images.
    for (let k = 1; k < count; k++) {
      const v = [],
        faces = [],
        t = k / count;
      const ring = Array.from({ length: sides }, (_, j) =>
        sample(t, (j / sides) * Math.PI * 2),
      );
      const center = ring.reduce(
        (c, p) => [c[0] + p[0] / sides, c[1] + p[2] / sides],
        [0, 0],
      );
      for (let j = 0; j <= sides; j++) {
        const p = sample(t, (j / sides) * Math.PI * 2),
          x = center[0] + (p[0] - center[0]) * 1.005,
          z = center[1] + (p[2] - center[1]) * 1.005;
        v.push(x, p[1] - 0.13, z, x, p[1] + 0.13, z);
      }
      for (let j = 0; j < sides; j++) {
        const a = j * 2;
        faces.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
      add(geometry(v, faces), k % 12 === 0 ? 'gold' : mat);
    }
  }
  function ribs(sample, angles, material = 'white', radius = 0.32) {
    for (const a of angles) {
      const pts = [];
      for (let i = 0; i <= 48; i++) pts.push(sample(i / 48, a));
      tube(pts, radius, material, 48, 5);
    }
  }
  function bridge(points, halfHeight, halfDepth, mat, id) {
    // Preserve the existing local collision bands verbatim; only the visible
    // engineering is refined. Ground access, tower bodies and crowns are untouched.
    const legacyCurve = new T.CatmullRomCurve3(
      points.map((p) => new T.Vector3(...p)),
    );
    const legacySample = (t, a) => {
      const c = legacyCurve.getPoint(t),
        d = legacyCurve.getTangent(t);
      const n = new T.Vector3(d.y, -d.x, 0).normalize();
      return c
        .addScaledVector(n, Math.cos(a) * halfHeight)
        .add(new T.Vector3(0, 0, Math.sin(a) * halfDepth))
        .toArray();
    };
    for (let start = 0; start < 24; start += 4) {
      const bounds = new T.Box3();
      for (let i = start; i <= Math.min(start + 4, 24); i++)
        for (let j = 0; j < 20; j++)
          bounds.expandByPoint(
            new T.Vector3(...legacySample(i / 24, (j / 20) * Math.PI * 2)),
          );
      solid(`${id}-${start / 4}`, bounds.min.toArray(), bounds.max.toArray());
    }
    const h = Math.max(2.2, halfHeight * 0.6),
      d = halfDepth * 0.7;
    const control = points.map((p) => new T.Vector3(...p));
    const pieces = (control.length - 1) * 5;
    function frame(t) {
      const f = Math.min(t * (control.length - 1), control.length - 1 - 1e-9);
      const i = Math.floor(f),
        direction = control[i + 1].clone().sub(control[i]).normalize();
      const side = new T.Vector3()
        .crossVectors(direction, new T.Vector3(0, 1, 0))
        .normalize();
      const up = new T.Vector3().crossVectors(side, direction).normalize();
      return { c: control[i].clone().lerp(control[i + 1], f - i), side, up };
    }
    function p(t, y, z) {
      const f = frame(t);
      return f.c.addScaledVector(f.up, y).addScaledVector(f.side, z);
    }
    function panel(a, b, c, d, material) {
      add(
        geometry(
          [...a.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray()],
          [0, 1, 2, 0, 2, 3],
        ),
        material,
      );
    }
    function steel(a, b, width, depth, material = 'pearl') {
      const delta = b.clone().sub(a),
        length = delta.length();
      if (length < 0.001) return;
      const g = new T.BoxGeometry(width, length, depth);
      g.applyQuaternion(
        new T.Quaternion().setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          delta.normalize(),
        ),
      );
      g.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
      add(g, material);
    }
    // An eight-sided chamfered box-girder shell gives flat glass sides, hard
    // metal roof shoulders and a narrow blade-like soffit, not a swollen tube.
    const section = [
      [-h, -d * 0.72],
      [-h * 0.66, -d],
      [h * 0.66, -d],
      [h, -d * 0.72],
      [h, d * 0.72],
      [h * 0.66, d],
      [-h * 0.66, d],
      [-h, d * 0.72],
    ];
    for (let i = 0; i < pieces; i++) {
      const a = i / pieces,
        b = (i + 1) / pieces;
      for (let j = 0; j < section.length; j++) {
        const k = (j + 1) % section.length;
        const material = j === 1 || j === 5 ? 'glass' : j === 3 ? 'dark' : mat;
        panel(
          p(a, ...section[j]),
          p(a, ...section[k]),
          p(b, ...section[k]),
          p(b, ...section[j]),
          material,
        );
      }
      // Paired external Warren-truss webs tie the steel edge chords together.
      for (const side of [-1, 1]) {
        const z = side * (d + 0.12);
        const low = -h * 0.62,
          high = h * 0.62;
        steel(p(a, low, z), p(b, low, z), 0.23, 0.25, 'dark');
        steel(p(a, high, z), p(b, high, z), 0.21, 0.24, 'pearl');
        steel(
          p(a, i % 2 ? high : low, z),
          p(b, i % 2 ? low : high, z),
          0.16,
          0.2,
          'pearl',
        );
        steel(
          p(a, 0, z + side * 0.035),
          p(b, 0, z + side * 0.035),
          0.075,
          0.08,
          'gold',
        );
      }
      // Thin luminous soffit channels are visible geometry, not facade images.
      for (const side of [-1, 1])
        steel(
          p(a, -h - 0.035, side * d * 0.45),
          p(b, -h - 0.035, side * d * 0.45),
          0.085,
          0.12,
          'light',
        );
    }
    for (let i = 0; i <= pieces; i++) {
      const t = i / pieces;
      for (let j = 0; j < section.length; j++)
        steel(
          p(t, ...section[j]),
          p(t, ...section[(j + 1) % section.length]),
          0.15,
          0.19,
          i % 5 === 0 ? 'gold' : 'pearl',
        );
    }
    // Faceted bulkheads seat the enclosed bridge into the unchanged tower masses.
    for (const t of [0, 1]) {
      const ring = section.map(([y, z]) => p(t, y, z)),
        c = frame(t).c;
      for (let j = 0; j < ring.length; j++) {
        const first = t === 0 ? ring[(j + 1) % ring.length] : ring[j];
        const second = t === 0 ? ring[j] : ring[(j + 1) % ring.length];
        add(
          geometry(
            [...c.toArray(), ...first.toArray(), ...second.toArray()],
            [0, 1, 2],
          ),
          'dark',
        );
      }
      const near = t === 0 ? 0.12 : 0.88;
      for (const side of [-1, 1]) {
        const seat = p(t, -h * 0.8, side * d * 0.66),
          anchor = seat.clone();
        anchor.y -= Math.min(halfHeight * 0.9, 6);
        // Short paired bearing piers and diagonal haunches terminate inside the
        // endpoint tower/crown, instead of introducing new ground obstructions.
        steel(anchor, seat, 0.65, 0.75, 'dark');
        steel(anchor, p(near, -h * 0.88, side * d * 0.66), 0.42, 0.5, 'pearl');
        steel(
          p(t, -h * 0.83, side * d * 0.87),
          p(t, -h * 0.83, side * d * 0.4),
          0.42,
          0.45,
          'gold',
        );
      }
    }
  }
  function lobby(x, z, w = 33, d = 45) {
    roundedSlab('dark', x, 0.18, z, w, d, 6, 7);
    roundedSlab('gold', x, 6.1, z, w + 0.4, d + 0.4, 0.22, 7);
    solid(
      `sealed-lobby-${x}-${z}`,
      [x - w / 2, 0, z - d / 2],
      [x + w / 2, 6.32, z + d / 2],
    );
    box('blue', x, 2.8, z + d / 2 + 0.04, w * 0.57, 5.0, 0.14);
    for (const dx of [-w * 0.29, 0, w * 0.29])
      box('gold', x + dx, 2.8, z + d / 2 + 0.17, 0.18, 5.0, 0.26);
    roundedSlab('white', x, 5.3, z + d / 2 + 3, w * 0.85, 12, 0.55, 3);
    box('light', x, 5.24, z + d / 2 + 4, w * 0.71, 0.1, 0.6);
    solid(
      `canopy-${x}-${z}`,
      [x - w * 0.425, 5.24, z + d / 2 - 3],
      [x + w * 0.425, 5.85, z + d / 2 + 9],
    );
  }
  // Thin 156 m plaza is separate from compact leg-specific podiums.
  roundedSlab('stone', 0, 0, 0, 156, 156, 0.18, 12);
  solid('plaza-support', [-78, 0, -78], [78, 0.18, 78]);
  for (const x of [-65, 65])
    for (const z of [-48, 0, 48]) {
      box('dark', x, 0.53, z, 5, 0.7, 9);
      box('gold', x, 0.92, z, 5.1, 0.12, 9.1);
    }

  if (spec.id === 'GC-OFFICE-001') {
    lobby(-47, 0, 37, 51);
    lobby(47, 0, 37, 51);
    const left = (t, a) => {
      const x = -47 + 31 * Math.pow(t, 1.55),
        rx = 17.5 * (1 - 0.17 * t),
        rz = 23 * (1 - 0.3 * t);
      return [
        x + rx * Math.cos(a),
        6 + 494 * t,
        rz * Math.sin(a) + 6 * Math.sin(t * Math.PI),
      ];
    };
    const right = (t, a) => {
      const x = 47 - 9 * Math.sin(t * Math.PI * 0.85),
        rx = 16.5 * (1 - 0.22 * t),
        rz = 22 * (1 - 0.19 * t);
      return [
        x + rx * Math.cos(a),
        6 + 403 * t,
        rz * Math.sin(a) - 5 * Math.sin(t * Math.PI),
      ];
    };
    sweep(left, 92, 40, 'glass', 'arc-left');
    sweep(right, 80, 40, 'blue', 'arc-right');
    bands(left, 110);
    bands(right, 91);
    ribs(left, [0, Math.PI], 'white', 0.7);
    ribs(right, [0, Math.PI], 'gold', 0.55);
    // A deep descending inhabited cantilever ties the unequal blades together.
    bridge(
      [
        [-20, 477, 0],
        [7, 464, -3],
        [34, 427, -2],
        [55, 405, 0],
      ],
      14,
      18,
      'pearl',
      'arc-high-cantilever',
    );
    bridge(
      [
        [-35, 245, 0],
        [-11, 250, 0],
        [18, 242, 0],
        [39, 236, 0],
      ],
      3.2,
      7,
      'white',
      'arc-thin-crossing',
    );
    roundedSlab('gold', -16, 499.3, 0, 26, 32, 0.7, 7);
  }
  if (spec.id === 'GC-OFFICE-002') {
    lobby(-34, -7, 43, 48);
    lobby(36, 6, 37, 44);
    const left = (t, a) => {
      const rx = 20 * (1 - 0.22 * t),
        rz = 20 * (1 - 0.12 * t),
        cx = -34 + 9 * Math.sin(t * Math.PI * 0.7);
      return [
        cx + rx * Math.cos(a),
        6 + 310 * t,
        -7 + rz * Math.sin(a) + 8 * t,
      ];
    };
    const right = (t, a) => {
      const rx = 17 * (1 - 0.28 * t),
        rz = 18.5 * (1 - 0.2 * t),
        cx = 36 - 5 * Math.sin(t * Math.PI);
      return [cx + rx * Math.cos(a), 6 + 276 * t, 6 + rz * Math.sin(a) - 7 * t];
    };
    sweep(left, 78, 40, 'pearl', 'orbit-left');
    sweep(right, 68, 40, 'glass', 'orbit-right');
    bands(left, 72);
    bands(right, 65);
    ribs(left, [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2], 'white', 0.4);
    ribs(right, [0, Math.PI], 'gold', 0.5);
    bridge(
      [
        [-26, 132, 0],
        [-7, 137, 0],
        [13, 130, 0],
        [33, 128, 0],
      ],
      4,
      10,
      'white',
      'orbit-bridge-low',
    );
    bridge(
      [
        [-27, 232, 1],
        [-9, 225, 1],
        [12, 220, 1],
        [35, 227, 1],
      ],
      4.5,
      8,
      'gold',
      'orbit-bridge-high',
    );
    for (const [cx, y, cz, w, d] of [
      [-33, 175, -7, 55, 50],
      [38, 205, 4, 48, 43],
      [-25, 267, 0, 43, 45],
    ]) {
      roundedSlab('white', cx, y, cz, w, d, 1.1, 12);
      roundedSlab('gold', cx, y + 1.1, cz, w + 0.3, d + 0.3, 0.22, 12);
    }
    // Wide paired crown paddles, separated by visible air; neither is a needle.
    for (const [cx, start, end, radius] of [
      [-37, 305, 350, 6],
      [-17, 305, 340, 5.8],
      [27, 270, 314, 5.2],
      [43, 270, 303, 5],
    ]) {
      const paddle = (t, a) => [
        cx + t * t * 4 + radius * (1 - 0.22 * t) * Math.cos(a),
        start + (end - start) * t,
        1 + 11 * (1 - 0.18 * t) * Math.sin(a),
      ];
      sweep(paddle, 12, 24, 'blue', `orbit-crown-${cx}`);
      ribs(paddle, [0, Math.PI], 'gold', 0.25);
    }
  }
  if (spec.id === 'GC-OFFICE-003') {
    lobby(0, 0, 67, 64);
    const body = (t, a) => {
      const envelope = 1 - 0.48 * Math.pow(t, 1.2),
        cx = -8 + 25 * Math.sin(t * Math.PI * 0.58),
        rz = 29 * envelope;
      return [
        cx + 31 * envelope * (1 + 0.055 * Math.cos(3 * a)) * Math.cos(a),
        6 + 330 * t,
        rz * Math.sin(a) + 5 * t,
      ];
    };
    sweep(body, 84, 48, 'glass', 'halo-body');
    bands(body, 79, 'white', 48);
    ribs(
      body,
      [0, Math.PI * 0.3, Math.PI * 0.7, Math.PI, Math.PI * 1.3, Math.PI * 1.7],
      'white',
      0.66,
    );
    // Huge oval crown tilted in THREE dimensions. Ring thickness is solid
    // curved geometry; the oval centre remains physically and visually empty.
    const ringPoints = [];
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      ringPoints.push([
        13 + 48 * Math.cos(a),
        369 + 46 * Math.sin(a),
        5 + 19 * Math.cos(a) + 12 * Math.sin(a),
      ]);
    }
    tube(ringPoints, 5, 'pearl', 96, 10, true);
    tube(
      ringPoints.map(([x, y, z]) => [x, y, z + 4.65]),
      0.42,
      'gold',
      96,
      6,
      true,
    );
    // Local ring colliders follow the perimeter; never fill its central void.
    for (let i = 0; i < 96; i += 3) {
      const bounds = new T.Box3();
      for (let j = 0; j <= 3; j++)
        bounds.expandByPoint(new T.Vector3(...ringPoints[(i + j) % 96]));
      bounds.expandByScalar(5);
      solid(`halo-ring-${i / 3}`, bounds.min.toArray(), bounds.max.toArray());
    }
    for (const s of [-1, 1]) {
      bridge(
        [
          [s * 22, 274, 0],
          [s * 41, 300, 3],
          [s * 42 + 13, 330, 12],
          [s * 30 + 13, 338, 14],
        ],
        4.4,
        7,
        'white',
        `halo-lateral-${s}`,
      );
    }
  }
  const scene = new T.Group();
  scene.name = spec.name;
  let triangles = 0;
  for (const [key, list] of Object.entries(buckets)) {
    const g = mergeGeometries(list, false);
    if (!g) throw new Error(`Merge failed: ${key}`);
    triangles += g.attributes.position.count / 3;
    const mesh = new T.Mesh(g, mats[key]);
    mesh.name = `${spec.id}-${key}`;
    scene.add(mesh);
    for (const source of list) source.dispose();
  }
  // Normalize minuscule tube/crown extrema while keeping the ground at zero.
  // Exact height is a verified asset invariant, not an approximate label.
  scene.updateMatrixWorld(true);
  let bounds = new T.Box3().setFromObject(scene);
  const yScale = spec.height / bounds.max.y;
  for (const mesh of scene.children) {
    mesh.geometry.scale(1, yScale, 1);
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
    for (const n of mesh.geometry.attributes.position.array)
      if (!Number.isFinite(n)) throw new Error('Non-finite geometry');
  }
  for (const c of colliders) {
    c.min[1] *= yScale;
    c.max[1] *= yScale;
  }
  bounds = new T.Box3().setFromObject(scene);
  if (Math.abs(bounds.max.y - spec.height) > 0.002)
    throw new Error('Incorrect tower height');
  if (bounds.max.x - bounds.min.x > 160 || bounds.max.z - bounds.min.z > 160)
    throw new Error('Footprint exceeds 160 m');
  return {
    scene,
    manifest: {
      id: spec.id,
      name: spec.name,
      nameZh: spec.nameZh,
      assetVersion: 2,
      units: 'meters',
      coordinateSystem: 'right-handed Y-up; front +Z',
      heightMeters: spec.height,
      footprintMeters: { width: 156, depth: 156 },
      plazaTopY: 0.18 * yScale,
      bounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      files: { lod0: 'tower-lod0.glb' },
      lods: [
        {
          level: 0,
          file: 'tower-lod0.glb',
          triangles,
          drawCalls: scene.children.length,
        },
      ],
      colliders,
      design: spec.design,
      provenance: {
        type: 'original-procedural',
        author: 'AmpliWorld',
        externalMeshes: [],
        externalTextures: [],
        note: 'Original composed masses and parametric geometry. Broad structural ideas only; no landmark mesh, logo, image facade or exact architectural reproduction.',
      },
      stats: {
        triangles,
        meshes: scene.children.length,
        materialDrawCalls: scene.children.length,
      },
      limitations: [
        'Sealed ground lobbies; interiors and lifts not yet implemented.',
        'LOD0 only.',
        'Conservative local AABB bands around each mass; open apertures are not blocked by an overall building collider.',
      ],
    },
  };
}
let total = 0;
for (const spec of specs) {
  const { scene, manifest } = generate(spec);
  total += manifest.stats.triangles;
  if (total > 250000)
    throw new Error(`Combined skyline triangle budget exceeded: ${total}`);
  const out = new URL(
    `../../public/assets/3d/ampliworld/${spec.id}/`,
    import.meta.url,
  );
  await mkdir(out, { recursive: true });
  const glb = await new GLTFExporter().parseAsync(scene, {
    binary: true,
    onlyVisible: true,
  });
  await writeFile(new URL('tower-lod0.glb', out), Buffer.from(glb));
  await writeFile(
    new URL('tower-manifest.json', out),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  process.stdout.write(
    `${spec.id} ${spec.name}: ${manifest.heightMeters}m, ${manifest.stats.triangles} triangles, plazaY=${manifest.plazaTopY}\n`,
  );
}
process.stdout.write(`Combined: ${total} triangles\n`);
