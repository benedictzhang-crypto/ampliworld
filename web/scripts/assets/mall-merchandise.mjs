/**
 * Original AmpliWorld miniature retail merchandise, authored 2026-09-13.
 * No logos, imported meshes or third-party artwork. All coordinates are metres.
 * x/y/z is the centre of the footprint at the supporting shelf/floor height.
 * Kinds: handbag, heel, sneaker, coat, watch, ring, necklace, shoe-pair.
 * add(geometry, materialKey, x, y, z, yaw=0) must consume each fresh geometry.
 */
export function merchandise(THREE, add, box, kind, x, y, z, ry = 0) {
  const {
    BoxGeometry,
    SphereGeometry,
    CylinderGeometry,
    TorusGeometry,
    ConeGeometry,
    Shape,
    ExtrudeGeometry,
    Vector3,
    Quaternion,
  } = THREE;
  // Apply all product-local transforms before delegating world placement.
  const emit = (g, mat, a = 0, b = 0, c = 0, yaw = 0) => {
    if (yaw) g.rotateY(yaw);
    g.translate(a, b, c);
    if (ry) g.rotateY(ry);
    add(g, mat, x, y, z, 0);
  };
  const block = (m, a, b, c, w, h, d, r = 0) =>
    emit(new BoxGeometry(w, h, d), m, a, b, c, r);
  const ball = (m, a, b, c, rx, hy = rx, dz = rx) => {
    const g = new SphereGeometry(1, 12, 8);
    g.scale(rx, hy, dz);
    emit(g, m, a, b, c);
  };
  const rod = (m, a, b, c, d, e, f, r = 0.01, segments = 8) => {
    const start = new Vector3(a, b, c),
      end = new Vector3(d, e, f);
    const delta = end.clone().sub(start),
      midpoint = start.clone().add(end).multiplyScalar(0.5);
    const g = new CylinderGeometry(r, r, delta.length(), segments);
    g.applyQuaternion(
      new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        delta.normalize(),
      ),
    );
    emit(g, m, midpoint.x, midpoint.y, midpoint.z);
  };
  const tube = (m, a, b, c, r, t, arc = Math.PI * 2, rx = 0) => {
    const g = new TorusGeometry(r, t, 6, 24, arc);
    if (rx) g.rotateX(rx);
    emit(g, m, a, b, c);
  };
  const profile = (m, points, depth, a, b, c, bevel = 0.008) => {
    const shape = new Shape();
    points.forEach(([px, py], i) =>
      i ? shape.lineTo(px, py) : shape.moveTo(px, py),
    );
    shape.closePath();
    const g = new ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 1,
      steps: 1,
      curveSegments: 8,
    });
    g.translate(0, 0, -depth / 2);
    emit(g, m, a, b, c);
  };
  const bag = () => {
    profile(
      'leather',
      [
        [-0.235, 0],
        [0.235, 0],
        [0.215, 0.31],
        [-0.215, 0.31],
      ],
      0.17,
      0,
      0.018,
      0,
      0.014,
    );
    block('leather', 0, 0.305, 0.098, 0.425, 0.1, 0.025);
    // Repeated metallic clasp and feet are intentionally unbranded.
    block('gold', 0, 0.257, 0.119, 0.056, 0.035, 0.015);
    for (const a of [-0.145, 0.145])
      for (const c of [-0.06, 0.06])
        ball('gold', a, 0.012, c, 0.012, 0.009, 0.012);
    for (const c of [-0.06, 0.06]) {
      const g = new TorusGeometry(0.12, 0.012, 6, 20, Math.PI);
      emit(g, 'leather', 0, 0.32, c);
      for (const a of [-0.12, 0.12]) tube('gold', a, 0.323, c, 0.022, 0.005);
    }
    // Thin contrasting stitching strips retain a visible crafted edge.
    for (const a of [-0.205, 0.205])
      rod('ivory', a, 0.047, 0.092, a * 0.9, 0.277, 0.092, 0.0025, 4);
  };
  const heel = (offset = 0) => {
    // Long axis points toward +Z; raised arch and slim heel are real geometry.
    const g = new BoxGeometry(0.082, 0.016, 0.27);
    g.rotateX(-0.16);
    emit(g, 'dark', offset, 0.041, 0.005);
    ball('red', offset, 0.05, 0.098, 0.045, 0.028, 0.073);
    block('red', offset, 0.075, -0.078, 0.07, 0.035, 0.08);
    rod('gold', offset, 0.01, -0.1, offset, 0.1, -0.105, 0.008, 8);
    block('dark', offset, 0.006, -0.101, 0.026, 0.012, 0.028);
    // Open upper/vamp and ankle strap, not a solid boot silhouette.
    const vamp = new TorusGeometry(0.043, 0.009, 6, 16, Math.PI);
    vamp.scale(1, 1.03, 0.7);
    emit(vamp, 'red', offset, 0.056, 0.075);
    const strap = new TorusGeometry(0.035, 0.006, 6, 18);
    strap.rotateX(Math.PI / 2);
    emit(strap, 'red', offset, 0.126, -0.078);
    rod('red', offset, 0.085, -0.106, offset, 0.128, -0.106, 0.006, 6);
    block('gold', offset + 0.036, 0.128, -0.078, 0.01, 0.012, 0.01);
  };
  const sneaker = (offset = 0) => {
    ball('ivory', offset, 0.031, 0.01, 0.06, 0.03, 0.155);
    ball('light', offset, 0.066, 0.014, 0.056, 0.043, 0.14);
    ball('ivory', offset, 0.096, -0.067, 0.046, 0.058, 0.062);
    ball('dark', offset, 0.144, -0.063, 0.031, 0.008, 0.035);
    for (let i = 0; i < 4; i++)
      rod(
        'ivory',
        offset - 0.031,
        0.105 - i * 0.006,
        -0.016 + i * 0.021,
        offset + 0.031,
        0.105 - i * 0.006,
        -0.008 + i * 0.021,
        0.003,
        5,
      );
    for (const a of [-1, 1])
      block('leather', offset + a * 0.053, 0.071, -0.026, 0.008, 0.022, 0.083);
  };
  const coat = () => {
    // 1.72 m headless display mannequin, including pedestal and neck finial.
    emit(new CylinderGeometry(0.22, 0.23, 0.055, 16), 'dark', 0, 0.0275, 0);
    rod('gold', 0, 0.055, 0, 0, 0.54, 0, 0.023);
    for (const a of [-0.095, 0.095]) {
      rod('ivory', a, 0.19, 0.005, a, 0.85, 0, 0.041);
      ball('dark', a, 0.115, 0.046, 0.053, 0.045, 0.118);
    }
    // Distinct waisted long coat with dimensional lapels, cuffs, belt and buttons.
    profile(
      'ivory',
      [
        [-0.235, 0],
        [0.235, 0],
        [0.155, 0.44],
        [0.2, 0.76],
        [0.11, 0.89],
        [-0.11, 0.89],
        [-0.2, 0.76],
        [-0.155, 0.44],
      ],
      0.19,
      0,
      0.66,
      0,
      0.012,
    );
    for (const s of [-1, 1]) {
      rod('ivory', s * 0.18, 1.44, 0, s * 0.31, 1.07, 0.018, 0.073, 10);
      rod('ivory', s * 0.31, 1.07, 0.018, s * 0.32, 0.97, 0.025, 0.061, 10);
      ball('light', s * 0.32, 0.925, 0.025, 0.037, 0.065, 0.028);
      profile(
        'light',
        [
          [s * 0.025, 0],
          [s * 0.137, 0.23],
          [s * 0.061, 0.32],
        ],
        0.018,
        0,
        1.19,
        0.111,
        0,
      );
    }
    block('leather', 0, 1.125, 0.006, 0.327, 0.027, 0.219);
    block('gold', 0, 1.125, 0.125, 0.045, 0.036, 0.009);
    for (let i = 0; i < 3; i++)
      ball('gold', 0.045, 1.31 - i * 0.13, 0.111, 0.009, 0.009, 0.005);
    emit(new CylinderGeometry(0.034, 0.042, 0.075, 10), 'gold', 0, 1.588, 0);
    ball('ivory', 0, 1.658, 0, 0.046, 0.056, 0.044);
  };
  const watch = () => {
    // Upright 13 cm padded watch holder and true circular bezel/case.
    ball('leather', 0, 0.08, 0, 0.048, 0.073, 0.037);
    block('gold', 0, 0.081, 0.038, 0.023, 0.13, 0.008);
    const caseG = new CylinderGeometry(0.027, 0.027, 0.012, 20);
    caseG.rotateX(Math.PI / 2);
    emit(caseG, 'gold', 0, 0.092, 0.05);
    const faceG = new CylinderGeometry(0.022, 0.022, 0.002, 20);
    faceG.rotateX(Math.PI / 2);
    emit(faceG, 'dark', 0, 0.092, 0.058);
    for (let i = 0; i < 12; i++) {
      const q = (i * Math.PI) / 6;
      ball(
        'gold',
        Math.sin(q) * 0.018,
        0.092 + Math.cos(q) * 0.018,
        0.06,
        0.0015,
        0.002,
        0.001,
      );
    }
    rod('ivory', 0, 0.092, 0.061, -0.008, 0.101, 0.061, 0.0012, 4);
    rod('ivory', 0, 0.092, 0.062, 0.012, 0.098, 0.062, 0.001, 4);
    ball('gold', 0.029, 0.092, 0.05, 0.004, 0.004, 0.004);
  };
  const ring = () => {
    // Display mount is separate from the approximately 4 cm jewellery item.
    emit(
      new CylinderGeometry(0.048, 0.055, 0.025, 16),
      'leather',
      0,
      0.0125,
      0,
    );
    tube('gold', 0, 0.048, 0, 0.018, 0.003);
    emit(new CylinderGeometry(0.007, 0.011, 0.005, 6), 'gold', 0, 0.069, 0);
    const stone = new CylinderGeometry(0.008, 0.012, 0.007, 8, 1);
    emit(stone, 'diamond', 0, 0.076, 0);
    const pavilion = new ConeGeometry(0.012, 0.01, 8);
    pavilion.rotateX(Math.PI);
    emit(pavilion, 'diamond', 0, 0.068, 0);
    for (const a of [-1, 1])
      for (const c of [-1, 1])
        rod(
          'gold',
          a * 0.007,
          0.068,
          c * 0.005,
          a * 0.008,
          0.08,
          c * 0.006,
          0.0012,
          4,
        );
  };
  const necklace = () => {
    // Sculpted 35 cm bust, with a curved chain assembled from fine segments.
    emit(new CylinderGeometry(0.1, 0.135, 0.025, 16), 'dark', 0, 0.0125, 0);
    ball('ivory', 0, 0.15, 0, 0.146, 0.143, 0.07);
    emit(
      new CylinderGeometry(0.047, 0.065, 0.105, 12),
      'ivory',
      0,
      0.29,
      -0.011,
    );
    let previous = null;
    for (let i = 0; i <= 20; i++) {
      const u = i / 20,
        a = (u - 0.5) * 0.21,
        b = 0.24 - 0.12 * Math.sin(u * Math.PI),
        c = 0.065 + Math.sin(u * Math.PI) * 0.011;
      if (previous) rod('gold', ...previous, a, b, c, 0.0024, 5);
      previous = [a, b, c];
    }
    tube('gold', 0, 0.101, 0.08, 0.013, 0.0026);
    ball('diamond', 0, 0.099, 0.082, 0.008, 0.011, 0.004);
  };
  switch (kind) {
    case 'handbag':
      bag();
      break;
    case 'heel':
      heel();
      break;
    case 'sneaker':
      sneaker();
      break;
    case 'shoe-pair':
      heel(-0.063);
      heel(0.063);
      break;
    case 'coat':
      coat();
      break;
    case 'watch':
      watch();
      break;
    case 'ring':
      ring();
      break;
    case 'necklace':
      necklace();
      break;
    default:
      throw new Error(`Unknown original merchandise kind: ${kind}`);
  }
}

export function addMerchandise(THREE, add, box) {
  return (kind, x, y, z, ry = 0) =>
    merchandise(THREE, add, box, kind, x, y, z, ry);
}
