/** Original AmpliWorld outdoor parking and open-top ramp, metric local space.
 * Mall footprint: x +/-112.5, z +/-90. This file contains no imported assets.
 * Parent terrain cut: x [114,127], z [58,109]. No complete garage is implied.
 */
export const RAMP = {
  xMin: 115,
  xMax: 126,
  zMin: 72,
  zMax: 108,
  bottomY: -4.2,
  topY: 0.17,
  landing: { xMin: 115, xMax: 126, zMin: 60, zMax: 72, y: -4.2 },
};
export function parkingRampHeight(x, z) {
  if (x >= 115 && x <= 126 && z >= 72 && z <= 108)
    return -4.2 + (z - 72) * (4.37 / 36);
  if (x >= 115 && x <= 126 && z >= 60 && z <= 72) return -4.2;
  return null;
}

export function buildParking(T, add, box, solid, text3d) {
  const B = (m, x, y, z, w, h, d, r = 0) => box(m, x, y, z, w, h, d, r);
  const cylinder = (m, x, y, z, r, h, n = 12) =>
    add(new T.CylinderGeometry(r, r, h, n), m, x, y, z);
  const sphere = (m, x, y, z, rx, ry, rz) => {
    const g = new T.SphereGeometry(1, 12, 8);
    g.scale(rx, ry, rz);
    add(g, m, x, y, z);
  };
  const panel = (m, verts, indices) => {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    add(g, m, 0, 0, 0);
  };
  const bar = (m, a, b, r = 0.035) => {
    const v = new T.Vector3(...a),
      w = new T.Vector3(...b),
      d = w.clone().sub(v);
    const g = new T.CylinderGeometry(r, r, d.length(), 6);
    g.applyQuaternion(
      new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        d.normalize(),
      ),
    );
    const c = v.add(w).multiplyScalar(0.5);
    add(g, m, c.x, c.y, c.z);
  };
  const curb = (id, x, z, w, d) => {
    B('stone', x, 0.25, z, w, 0.16, d);
    solid(id, [x - w / 2, 0.17, z - d / 2], [x + w / 2, 0.33, z + d / 2]);
  };

  // Forty-eight 2.8 x 5.2 metre perpendicular bays; twin 8 m aisles are
  // separated by a planted central median, with turning space at both ends.
  // Entire parking slab stays east of the open descent footprint.
  B('dark', 158.5, 0.085, 11, 63, 0.17, 118);
  curb('parking-west-curb', 122, -3, 0.35, 90);
  curb('parking-east-curb', 190, 0, 0.35, 96);
  curb('parking-north-curb', 156, -48, 68, 0.35);
  // Southern boundary remains open for vehicle and pedestrian access.
  const rows = [
    { x: 135, side: 1 },
    { x: 177, side: -1 },
  ];
  let bay = 0;
  for (const row of rows)
    for (let i = 0; i < 24; i++) {
      const z = -38 + i * 3.0;
      bay++;
      B('ivory', row.x, 0.178, z - 1.4, 5.2, 0.014, 0.085);
      B('ivory', row.x, 0.178, z + 1.4, 5.2, 0.014, 0.085);
      B('ivory', row.x - row.side * 2.58, 0.178, z, 0.085, 0.014, 2.8);
      B('stone', row.x - row.side * 1.88, 0.255, z, 0.18, 0.17, 1.45);
      if (i >= 21) {
        // Accessible bay: ivory mobility symbol on contrasting red paving.
        B('red', row.x, 0.174, z, 4.9, 0.009, 2.65);
        const ring = new T.TorusGeometry(0.42, 0.055, 5, 20);
        ring.rotateX(-Math.PI / 2);
        add(ring, 'ivory', row.x, 0.189, z + 0.15);
        const head = new T.CircleGeometry(0.15, 12);
        head.rotateX(-Math.PI / 2);
        add(head, 'ivory', row.x - 0.15, 0.192, z - 0.63);
        B('ivory', row.x - 0.15, 0.195, z - 0.23, 0.09, 0.012, 0.49);
        B('ivory', row.x + 0.1, 0.195, z + 0.01, 0.51, 0.012, 0.09);
        B('ivory', row.x + 0.32, 0.195, z + 0.3, 0.09, 0.012, 0.6);
        if (i === 23) {
          cylinder('gold', row.x - row.side * 3.45, 1.37, z, 0.035, 2.4);
          text3d('P', row.x - row.side * 3.45, 2.2, z, 0.45, 0);
        }
      }
    }
  // Direction arrows lie flat on the pavement and do not become obstacles.
  for (const laneX of [144, 168])
    for (const laneZ of [-27, 0, 39]) {
      B('ivory', laneX, 0.182, laneZ, 0.14, 0.013, 2.0);
      panel(
        'ivory',
        [
          laneX - 0.55,
          0.19,
          laneZ - 0.65,
          laneX + 0.55,
          0.19,
          laneZ - 0.65,
          laneX,
          0.19,
          laneZ - 1.5,
        ],
        [0, 1, 2],
      );
    }
  // Crosswalk between mall-side pavement and the central pedestrian median.
  for (let i = 0; i < 11; i++)
    B('ivory', 126 + i * 5.3, 0.181, 57, 2.3, 0.015, 4.8);
  B('light', 129, 0.245, 11, 4, 0.15, 115);
  for (const z of [-31, -7, 17, 39]) {
    curb(`parking-planter-${z}`, 156, z, 12, 15);
    B('wood', 156, 0.36, z, 11.6, 0.1, 14.6);
    for (const dx of [-3.8, 3.8]) {
      cylinder('wood', 156 + dx, 1.25, z, 0.12, 2.0);
      sphere('leaf', 156 + dx, 2.65, z, 0.95, 1.25, 0.95);
      sphere('leaf', 156 + dx + 0.38, 2.9, z - 0.22, 0.8, 0.9, 0.79);
    }
    B('stone', 156, 0.55, z + 5, 4.6, 0.65, 0.8);
    B('wood', 156, 0.92, z + 5, 4.8, 0.12, 0.9);
  }
  for (const x of [129, 184])
    for (const z of [-42, -12, 18, 48]) {
      cylinder('dark', x, 2.7, z, 0.065, 5.05);
      B('gold', x, 5.19, z, 1.4, 0.09, 0.48);
      B('light', x, 5.12, z, 1.15, 0.035, 0.32);
      solid(
        `parking-light-${x}-${z}`,
        [x - 0.09, 0.17, z - 0.09],
        [x + 0.09, 5.25, z + 0.09],
      );
    }

  // Small original cars: curved extruded body, sloped glass cabin, real wheels.
  const car = (cx, cz, yaw, color, index) => {
    const emit = (g, m, a, b, c, r = 0) => {
      if (r) g.rotateY(r);
      g.translate(a, b, c);
      g.rotateY(yaw);
      add(g, m, cx, 0.17, cz);
    };
    const cb = (m, a, b, c, w, h, d) =>
      emit(new T.BoxGeometry(w, h, d), m, a, b, c);
    const profile = new T.Shape();
    [
      [-2.12, 0.38],
      [-1.96, 0.7],
      [-1.52, 0.91],
      [1.5, 0.91],
      [2.0, 0.68],
      [2.1, 0.38],
      [1.94, 0.25],
      [-1.96, 0.25],
    ].forEach(([a, b], i) => (i ? profile.lineTo(a, b) : profile.moveTo(a, b)));
    profile.closePath();
    const body = new T.ExtrudeGeometry(profile, {
      depth: 1.73,
      bevelEnabled: true,
      bevelSize: 0.055,
      bevelThickness: 0.055,
      bevelSegments: 2,
      steps: 1,
    });
    body.translate(0, 0, -0.865);
    emit(body, color, 0, 0, 0);
    const cabin = new T.Shape();
    [
      [-1.12, 0.88],
      [-0.62, 1.52],
      [0.62, 1.5],
      [1.23, 0.88],
    ].forEach(([a, b], i) => (i ? cabin.lineTo(a, b) : cabin.moveTo(a, b)));
    cabin.closePath();
    const glazing = new T.ExtrudeGeometry(cabin, {
      depth: 1.52,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.02,
      bevelSegments: 1,
    });
    glazing.translate(0, 0, -0.76);
    emit(glazing, 'glass', 0, 0, 0);
    cb(color, 0, 1.51, 0, 1.29, 0.065, 1.58);
    for (const a of [-1.27, 1.27])
      for (const c of [-0.89, 0.89]) {
        const wheel = new T.CylinderGeometry(0.325, 0.325, 0.19, 16);
        wheel.rotateX(Math.PI / 2);
        emit(wheel, 'dark', a, 0.325, c);
        const rim = new T.CylinderGeometry(0.19, 0.19, 0.198, 12);
        rim.rotateX(Math.PI / 2);
        emit(rim, 'gold', a, 0.325, c);
      }
    for (const c of [-0.63, 0.63]) {
      cb('light', 2.071, 0.61, c, 0.05, 0.13, 0.32);
      cb('red', -2.074, 0.62, c, 0.05, 0.13, 0.31);
    }
    cb('dark', 2.116, 0.4, 0, 0.035, 0.16, 0.95);
    for (const c of [-0.798, 0.798]) {
      cb(color, 0, 1.19, c, 0.08, 0.58, 0.045);
      cb('gold', 0.18, 0.83, c, 0.2, 0.035, 0.027);
    }
    // Axis-aligned collider covers a parked car even when turned 180 degrees.
    solid(
      `parking-car-${index}`,
      [cx - 2.22, 0.17, cz - 0.99],
      [cx + 2.22, 1.78, cz + 0.99],
    );
  };
  const occupied = [0, 2, 4, 7, 10, 13, 16, 19];
  let index = 0;
  for (const [ri, row] of rows.entries())
    for (const i of occupied)
      car(
        row.x,
        -38 + i * 3,
        ri ? Math.PI : 0,
        ['ivory', 'red', 'dark', 'leather'][index % 4],
        index++,
      );

  // Open-top underground descent. There is deliberately NO slab/roof across
  // this rectangle. Parent terrain must remove this footprint, not cover it.
  panel(
    'stone',
    [115, -4.2, 72, 126, -4.2, 72, 115, 0.17, 108, 126, 0.17, 108],
    [0, 2, 1, 1, 2, 3],
  );
  const slope = Math.atan2(4.37, 36);
  const base = new T.BoxGeometry(11, 0.2, Math.hypot(36, 4.37));
  base.rotateX(-slope);
  add(base, 'stone', 120.5, -2.115, 90);
  B('stone', 120.5, -4.3, 66, 11, 0.2, 12);
  // Retaining walls have level tops but stepped/deep bases alongside ramp.
  const wall = (x0, x1, id) => {
    panel(
      'stone',
      [
        x0,
        -4.42,
        72,
        x1,
        -4.42,
        72,
        x0,
        -0.05,
        108,
        x1,
        -0.05,
        108,
        x0,
        0.9,
        72,
        x1,
        0.9,
        72,
        x0,
        0.9,
        108,
        x1,
        0.9,
        108,
      ],
      [
        0, 1, 5, 0, 5, 4, 2, 6, 7, 2, 7, 3, 0, 4, 6, 0, 6, 2, 1, 3, 7, 1, 7, 5,
        4, 5, 7, 4, 7, 6, 0, 2, 3, 0, 3, 1,
      ],
    );
    solid(id, [x0, -4.5, 72], [x1, 0.9, 108]);
  };
  wall(114.65, 115, 'ramp-west-wall');
  wall(126, 126.35, 'ramp-east-wall');
  // B1 arrival vestibule only; roof covers the terminal, NEVER the ramp.
  for (const x of [114.825, 126.175]) {
    B('stone', x, -2.25, 66, 0.35, 4.3, 12);
    solid(
      `b1-vestibule-wall-${x}`,
      [x - 0.175, -4.5, 60],
      [x + 0.175, -0.1, 72],
    );
  }
  B('stone', 120.5, -0.15, 66, 11, 0.1, 12);
  solid('b1-vestibule-roof', [115, -0.2, 60], [126, -0.1, 72]);
  for (const x of [117, 124]) {
    B('stone', x, -2.65, 60, 4, 3.1, 0.3);
    solid(`b1-entry-panel-${x}`, [x - 2, -4.5, 59.85], [x + 2, -1.1, 60.15]);
  }
  B('gold', 120.5, -1.05, 60, 3, 0.15, 0.35);
  B('stone', 120.5, -0.6, 60, 11, 1, 0.3);
  solid('b1-entry-upper-wall', [115, -1.1, 59.85], [126, -0.1, 60.15]);
  for (const x of [119, 122]) B('gold', x, -2.63, 60, 0.1, 3.1, 0.35);
  text3d('B1 ENTRY', 120.5, -0.66, 60.18, 0.3, 0);
  B('dark', 120.5, -2.62, 60, 3, 3.1, 0.18);
  solid('b1-future-garage-door', [119, -4.3, 59.9], [122, -1.05, 60.1]);
  for (const x of [114.8, 126.2])
    for (const z of [75, 84, 93, 102]) {
      const y = parkingRampHeight(120, z) + 0.3;
      B('light', x, y, z, 0.07, 0.1, 0.48);
    }
  // Sparse open portal and height bar only; a visible sky opening stays clear.
  for (const x of [114.6, 126.4]) {
    B('stone', x, 1.66, 107, 0.48, 3, 0.5);
    solid(
      `ramp-portal-${x}`,
      [x - 0.24, 0.17, 106.75],
      [x + 0.24, 3.16, 107.25],
    );
  }
  B('dark', 120.5, 3.18, 107, 12.3, 0.24, 0.65);
  B('gold', 120.5, 2.72, 107, 10.7, 0.11, 0.1);
  solid('ramp-height-bar', [115.15, 2.665, 106.93], [125.85, 2.78, 107.07]);
  for (let i = 0; i < 14; i++)
    B(i % 2 ? 'dark' : 'gold', 115.6 + i * 0.75, 2.72, 107, 0.4, 0.12, 0.14);
  text3d('P', 120.5, 3.43, 107.1, 0.86, 0);
  text3d('UNDERGROUND', 120.5, 2.96, 107.36, 0.24, 0);
  text3d('2.4 m', 120.5, 2.5, 107.14, 0.24, 0);
  // Central guidance line follows the actual declining surface.
  for (let z = 75; z < 106; z += 4) {
    const y = parkingRampHeight(120.5, z) + 0.012;
    const g = new T.BoxGeometry(0.12, 0.012, 1.8);
    g.rotateX(-slope);
    add(g, 'gold', 120.5, y, z);
  }
  return { bays: 48, cars: 16, ramp: RAMP, groundHeight: parkingRampHeight };
}
