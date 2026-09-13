import plan from './housing-parcels.json';
import housing from '../../public/assets/3d/ampliworld/GC-HOUSING-KIT-001/kit-manifest.json';
import amenities from '../../public/assets/3d/ampliworld/GC-NEIGHBORHOOD-KIT-001/amenities-manifest.json';
export const HOUSING_PLAN = plan;
export const HOUSING_LABELS: Record<string, string> = {
  low: '老城里',
  lowerMiddle: '宜居家园',
  high: '锦庭府',
  ultra: '云境天邸',
  mixedVilla: '城市御墅',
  largeDetached: '山麓庄园',
};
export const HOUSING_COLORS: Record<string, string> = {
  low: '#b9aa90',
  lowerMiddle: '#b4c3a3',
  high: '#739f8d',
  ultra: '#c6ad68',
  mixedVilla: '#cba38c',
  largeDetached: '#a59ab8',
};
export const HOUSING_MODELS = [
  ...housing.prototypes.map((p) => ({ ...p, kit: 'GC-HOUSING-KIT-001' })),
  ...amenities.prototypes.map((p) => ({
    ...p,
    kit: 'GC-NEIGHBORHOOD-KIT-001',
  })),
];
export type HousingParcel = (typeof plan.placements)[number];
export type HousingInstance = {
  id: string;
  model: number;
  x: number;
  z: number;
  y: number;
  localX: number;
  localZ: number;
  yaw: number;
  parcel: string;
  role: 'home' | 'amenity';
};
export type HousingBox = {
  id: string;
  x: number;
  z: number;
  y: number;
  w: number;
  d: number;
  h: number;
  yaw: number;
  kind: 'garden' | 'road' | 'walk' | 'wall' | 'gate';
};
export function housingPoint(
  p: HousingParcel,
  x: number,
  z: number,
): [number, number] {
  return [
    p.x + x * Math.cos(p.angle) + z * Math.sin(p.angle),
    p.z - x * Math.sin(p.angle) + z * Math.cos(p.angle),
  ];
}
export const HOUSING_INSTANCES: HousingInstance[] = [];
export const HOUSING_BOXES: HousingBox[] = [];
export const HOUSING_TREES: { x: number; z: number; y: number; yaw: number }[] =
  [];
function box(
  p: HousingParcel,
  id: string,
  x: number,
  z: number,
  w: number,
  d: number,
  h: number,
  y: number,
  kind: HousingBox['kind'],
) {
  const q = housingPoint(p, x, z);
  HOUSING_BOXES.push({
    id: p.id + '/' + id,
    x: q[0],
    z: q[1],
    y,
    w,
    d,
    h,
    yaw: p.angle,
    kind,
  });
}
function add(
  p: HousingParcel,
  model: number,
  x: number,
  z: number,
  role: HousingInstance['role'],
) {
  const q = housingPoint(p, x, z);
  HOUSING_INSTANCES.push({
    id: p.id + '/' + role + '-' + HOUSING_INSTANCES.length,
    model,
    x: q[0],
    z: q[1],
    localX: x,
    localZ: z,
    y: model < 8 ? 0.14 : 0,
    yaw: p.angle,
    parcel: p.id,
    role,
  });
}
for (const p of plan.placements) {
  if (p.retainExistingFootprints) {
    add(p, 8, 50, -180, 'amenity');
    continue;
  }
  const cols =
    p.type === 'ultra' || p.type === 'high'
      ? 2
      : p.type === 'lowerMiddle' || p.type === 'largeDetached' || p.width < 400
        ? 4
        : 6;
  const rows = Math.ceil(p.buildingCount / cols),
    inset = p.type === 'ultra' ? 130 : 65;
  const xExtent = p.width / 2 - inset,
    z0 = -p.depth / 2 + 60,
    z1 = p.depth / 2 - 95;
  for (let i = 0; i < p.buildingCount; i++) {
    const x =
        -xExtent +
        ((i % cols) * 2 * xExtent) / (cols - 1) +
        (Math.floor(i / cols) % 2 ? 4 : -4),
      z = z0 + (Math.floor(i / cols) * (z1 - z0)) / Math.max(1, rows - 1);
    const model =
      p.type === 'low'
        ? i % 2
        : p.type === 'lowerMiddle'
          ? 2 + (i % 2)
          : p.type === 'high'
            ? 4 + (i % 2)
            : p.type === 'ultra'
              ? 6 + (i % 2)
              : p.type === 'mixedVilla'
                ? [13, 14, 12][i % 3]
                : 12;
    add(p, model, x, z, 'home');
    if (p.type !== 'low' || i % 3 === 0) {
      const q = housingPoint(p, x + HOUSING_MODELS[model].bounds.max[0] + 5, z);
      HOUSING_TREES.push({ x: q[0], z: q[1], y: 0.18, yaw: 0 });
    }
  }
  box(p, 'garden', 0, 0, p.width, p.depth, 0.15, 0.105, 'garden');
  for (let j = 0; j < 5; j++) {
    const a = housingPoint(
      p,
      j === 0 ? 0 : Math.sin(j * 1.7) * 6,
      -p.depth / 2 + 30 + (j * (p.depth - 30)) / 5,
    );
    const b = housingPoint(
      p,
      j === 4 ? 0 : Math.sin((j + 1) * 1.7) * 6,
      -p.depth / 2 + 30 + ((j + 1) * (p.depth - 30)) / 5,
    );
    HOUSING_BOXES.push({
      id: p.id + '/winding-lane-' + j,
      x: (a[0] + b[0]) / 2,
      z: (a[1] + b[1]) / 2,
      w: 12,
      d: Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.3,
      h: 0.025,
      y: 0.1925,
      yaw: Math.atan2(b[0] - a[0], b[1] - a[1]),
      kind: 'road',
    });
  }
  if (['high', 'ultra', 'largeDetached'].includes(p.type))
    for (let tz = -p.depth / 2 + 45; tz < p.depth / 2 - 85; tz += 24) {
      if (
        Array.from(
          { length: rows },
          (_, r) => z0 + (r * (z1 - z0)) / Math.max(1, rows - 1) + 25,
        ).some((z) => Math.abs(z - tz) < 10)
      )
        continue;
      for (const tx of [-42, -24, 24, 42]) {
        const q = housingPoint(p, tx, tz);
        HOUSING_TREES.push({ x: q[0], z: q[1], y: 0.18, yaw: tz * 0.1 });
      }
    }
  for (let r = 0; r < rows; r++)
    box(
      p,
      'row-' + r,
      0,
      z0 + (r * (z1 - z0)) / Math.max(1, rows - 1) + 25,
      p.width - 40,
      8,
      0.025,
      0.1925,
      'road',
    );
  for (const side of [-1, 1])
    box(
      p,
      'loop-' + side,
      side * (p.width / 2 - 20),
      0,
      8,
      p.depth - 40,
      0.025,
      0.1925,
      'road',
    );
  for (const side of [-1, 1])
    box(
      p,
      'side-wall-' + side,
      (side * p.width) / 2,
      0,
      0.6,
      p.depth,
      2.2,
      1.28,
      'wall',
    );
  box(p, 'rear-wall', 0, -p.depth / 2, p.width, 0.6, 2.2, 1.28, 'wall');
  for (const side of [-1, 1])
    box(
      p,
      'front-wall-' + side,
      (side * (p.width + p.gateWidth)) / 4,
      p.depth / 2,
      (p.width - p.gateWidth) / 2,
      0.6,
      2.2,
      1.28,
      'wall',
    );
  if (p.type === 'lowerMiddle') add(p, 8, -48, p.depth / 2 - 34, 'amenity');
  if (['high', 'ultra', 'mixedVilla', 'largeDetached'].includes(p.type)) {
    add(p, 10, p.gateWidth / 2 + 6, p.depth / 2 - 10, 'amenity');
    add(p, 9, -34, p.depth / 2 - 18, 'amenity');
    box(p, 'access-gate', 0, p.depth / 2, p.gateWidth, 0.4, 1.5, 0.93, 'gate');
  }
  if (p.type === 'ultra' || p.type === 'largeDetached')
    add(p, 11, -p.width / 2 + 65, p.depth / 2 - 38, 'amenity');
  for (let r = 0; r < rows; r++)
    for (const side of [-1, 1])
      box(
        p,
        `walk-${r}-${side}`,
        0,
        z0 + (r * (z1 - z0)) / Math.max(1, rows - 1) + 25 + side * 6,
        p.width - 40,
        3,
        0.03,
        0.2,
        'walk',
      );
  for (const home of HOUSING_INSTANCES.filter(
    (i) => i.parcel === p.id && i.role === 'home',
  )) {
    const model = HOUSING_MODELS[home.model];
    const door = model.entrance;
    const start = home.localZ + door[1],
      end = home.localZ + 25;
    if (end > start)
      box(
        p,
        home.id + '/entry-walk',
        home.localX + door[0],
        (start + end) / 2,
        3,
        end - start,
        0.03,
        0.2,
        'walk',
      );
  }
  for (let i = 1; i < p.connector.points.length; i++) {
    const a = p.connector.points[i - 1],
      b = p.connector.points[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1];
    HOUSING_BOXES.push({
      id: p.id + '/connector-' + i,
      x: (a[0] + b[0]) / 2,
      z: (a[1] + b[1]) / 2,
      w: 12,
      d: Math.hypot(dx, dz) + 0.1,
      h: 0.025,
      y: 0.0525,
      yaw: Math.atan2(dx, dz),
      kind: 'road',
    });
  }
}
function collider(b: HousingBox) {
  const c = Math.abs(Math.cos(b.yaw)),
    s = Math.abs(Math.sin(b.yaw)),
    w = (b.w * c + b.d * s) / 2,
    d = (b.w * s + b.d * c) / 2;
  return {
    id: b.id,
    min: [b.x - w, b.y - b.h / 2, b.z - d],
    max: [b.x + w, b.y + b.h / 2, b.z + d],
  };
}
// A folded gate occupies the wall-side pocket, not an uncollidable overhead bar.
export function housingGateBox(b: HousingBox, open: boolean): HousingBox {
  if (!open) return b;
  const offset = b.w / 2 + 1.25;
  return {
    ...b,
    x: b.x + offset * Math.cos(b.yaw),
    z: b.z - offset * Math.sin(b.yaw),
    w: 2.5,
  };
}
export function canCloseHousingGate(
  id: string,
  x: number,
  z: number,
  radius = 1,
) {
  const b = HOUSING_BOXES.find((b) => b.id === id + '/access-gate');
  if (!b) return false;
  const dx = x - b.x,
    dz = z - b.z;
  return (
    Math.abs(dx * Math.cos(b.yaw) - dz * Math.sin(b.yaw)) > b.w / 2 + radius ||
    Math.abs(dx * Math.sin(b.yaw) + dz * Math.cos(b.yaw)) > b.d / 2 + radius
  );
}
const collisionCache = new Map<string, ReturnType<typeof collider>[]>();
export function housingColliders(
  x: number,
  z: number,
  open: ReadonlySet<string>,
) {
  return plan.placements
    .filter((p) => Math.abs(p.x - x) < 1900 && Math.abs(p.z - z) < 1900)
    .flatMap((p) => {
      let result = collisionCache.get(p.id);
      if (!result) {
        result = [];
        for (const i of HOUSING_INSTANCES.filter((i) => i.parcel === p.id))
          for (const c of HOUSING_MODELS[i.model].colliders) {
            const w = c.max[0] - c.min[0],
              d = c.max[2] - c.min[2],
              n = c.min[1] < 3 ? Math.ceil(w / 3) : 1,
              m = c.min[1] < 3 ? Math.ceil(d / 3) : 1;
            for (let a = 0; a < n; a++)
              for (let b = 0; b < m; b++) {
                const q = housingPoint(
                  p,
                  i.localX + c.min[0] + ((a + 0.5) * w) / n,
                  i.localZ + c.min[2] + ((b + 0.5) * d) / m,
                );
                result.push(
                  collider({
                    id: i.id + '/' + c.id,
                    x: q[0],
                    z: q[1],
                    y: i.y + (c.min[1] + c.max[1]) / 2,
                    w: w / n,
                    d: d / m,
                    h: c.max[1] - c.min[1],
                    yaw: p.angle,
                    kind: 'wall',
                  }),
                );
              }
          }
        for (const b of HOUSING_BOXES.filter(
          (b) => b.id.startsWith(p.id + '/') && b.kind === 'wall',
        )) {
          const n = Math.ceil(Math.max(b.w, b.d) / 6);
          for (let j = 0; j < n; j++) {
            const offset = (j + 0.5) / n - 0.5,
              dx = b.w > b.d ? offset * b.w : 0,
              dz = b.d >= b.w ? offset * b.d : 0;
            result.push(
              collider({
                ...b,
                x: b.x + dx * Math.cos(b.yaw) + dz * Math.sin(b.yaw),
                z: b.z - dx * Math.sin(b.yaw) + dz * Math.cos(b.yaw),
                w: b.w > b.d ? b.w / n : b.w,
                d: b.d >= b.w ? b.d / n : b.d,
              }),
            );
          }
        }
        collisionCache.set(p.id, result);
      }
      return [
        ...result,
        ...HOUSING_BOXES.filter((b) => b.id === p.id + '/access-gate').map(
          (b) => collider(housingGateBox(b, open.has(p.id))),
        ),
      ];
    });
}
const surfacesByCell = new Map<string, HousingBox[]>();
for (const b of HOUSING_BOXES.filter(
  (b) => b.kind === 'road' || b.kind === 'walk',
)) {
  const bounds = collider(b);
  for (
    let x = Math.floor(bounds.min[0] / 500);
    x <= Math.floor(bounds.max[0] / 500);
    x++
  )
    for (
      let z = Math.floor(bounds.min[2] / 500);
      z <= Math.floor(bounds.max[2] / 500);
      z++
    ) {
      const key = x + ',' + z,
        a = surfacesByCell.get(key) || [];
      a.push(b);
      surfacesByCell.set(key, a);
    }
}
const instancesByParcel = new Map(
  plan.placements.map((p) => [
    p.id,
    HOUSING_INSTANCES.filter((i) => i.parcel === p.id),
  ]),
);
export function housingGroundHeight(
  x: number,
  z: number,
  currentY: number,
): number | undefined {
  let support: number | undefined;
  for (const b of surfacesByCell.get(
    Math.floor(x / 500) + ',' + Math.floor(z / 500),
  ) || []) {
    const dx = x - b.x,
      dz = z - b.z,
      c = Math.cos(b.yaw),
      s = Math.sin(b.yaw),
      top = b.y + b.h / 2;
    if (
      Math.abs(dx * c - dz * s) <= b.w / 2 &&
      Math.abs(dx * s + dz * c) <= b.d / 2 &&
      top <= currentY + 0.29
    )
      support = Math.max(support ?? -Infinity, top);
  }
  for (const p of plan.placements) {
    const dx = x - p.x,
      dz = z - p.z,
      c = Math.cos(p.angle),
      s = Math.sin(p.angle),
      lx = dx * c - dz * s,
      lz = dx * s + dz * c;
    if (Math.abs(lx) > p.width / 2 || Math.abs(lz) > p.depth / 2) continue;
    let y = p.retainExistingFootprints
      ? support
      : Math.max(0.18, support ?? -Infinity);
    for (const i of instancesByParcel.get(p.id)!)
      for (const f of HOUSING_MODELS[i.model].surfaces)
        if (
          lx - i.localX >= f.min[0] &&
          lx - i.localX <= f.max[0] &&
          lz - i.localZ >= f.min[1] &&
          lz - i.localZ <= f.max[1] &&
          f.y + i.y <= currentY + 0.29
        )
          y = Math.max(y ?? -Infinity, f.y + i.y);
    return y;
  }
  return support;
}
