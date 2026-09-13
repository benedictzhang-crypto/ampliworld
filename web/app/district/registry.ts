import cbdStreet from '../../public/assets/3d/ampliworld/GC-CBD-STREET-001/street-manifest.json';
// New metre-space block. City origin and asset transforms are data, not mesh JSX.
export const DISTRICT = {
  id: 'GC-GARDENS-B01',
  originWorldMeters: [-625, 8, -125],
  sizeMeters: [880, 1560],
  status: 'WALKABLE_BLOCK_PROTOTYPE',
  buildings: [
    {
      id: 'GC-GARDENS-R01',
      assetId: 'GC-RES-001',
      x: -46,
      z: -34,
      rotationY: 0,
    },
    {
      id: 'GC-GARDENS-R02',
      assetId: 'GC-RES-001',
      x: 46,
      z: -34,
      rotationY: 0,
    },
    {
      id: 'GC-GARDENS-R03',
      assetId: 'GC-RES-001',
      x: -46,
      z: 34,
      rotationY: Math.PI,
    },
    {
      id: 'GC-GARDENS-R04',
      assetId: 'GC-RES-001',
      x: 46,
      z: 34,
      rotationY: Math.PI,
    },
  ],
  mall: { id: 'GC-GARDENS-M01', assetId: 'GC-MALL-002', x: 0, z: -188 },
  offices: [
    { id: 'GC-CBD-O01', assetId: 'GC-OFFICE-001', name: '曜旋中心', heightMeters: 500, x: -150, z: -410 },
    { id: 'GC-CBD-O02', assetId: 'GC-OFFICE-002', name: '棱境中心', heightMeters: 350, x: 150, z: -410 },
    { id: 'GC-CBD-O03', assetId: 'GC-OFFICE-003', name: '星穹中心', heightMeters: 420, x: 0, z: -590 },
  ],
  spawnLocalMeters: [0, -68],
  limitations: [
    'Four instances of one residential type, not four architectural designs.',
    'Metro pavilion is not yet connected to fares or train travel.',
    'Economy services are retained for future integration; retired legacy scene has no player route.',
  ],
} as const;

// Surface heights from the exported street kit, not a flat offset above every surface.
export function districtGroundHeight(x: number, z: number) {
  for (const b of DISTRICT.offices) {
    const ax = Math.abs(x - b.x), az = Math.abs(z - b.z);
    if (ax <= 48 && az <= 48 && (ax <= 38 || az <= 38 || Math.hypot(ax - 38, az - 38) <= 10)) return 0.18;
  }
  for (const s of cbdStreet.surfaces)
    if (x >= s.min[0] && x <= s.max[0] && z >= s.min[1] && z <= s.max[1]) return s.y;
  const mz = z - DISTRICT.mall.z;
  if (x >= 115 && x <= 126 && mz >= 72 && mz <= 108)
    return -4.2 + ((mz - 72) * 4.37) / 36;
  if (x >= 115 && x <= 126 && mz >= 60 && mz < 72) return -4.2;
  if (x >= 114 && x <= 127 && mz >= 108 && mz <= 121) return 0.17;
  if (x >= 127 && x <= 131 && mz >= -46.5 && mz <= 68.5) return 0.32;
  if (x >= 127 && x <= 190 && mz >= -48 && mz <= 70) return 0.17;
  if (Math.abs(x) <= 112.5 && Math.abs(mz) <= 90) return 0.17;
  if (Math.abs(x) <= 112.5 && mz >= 92 && mz <= 104) return 0.16;
  if (x >= -112.5 && x <= 192.5 && mz >= 105 && mz <= 121) return 0.07;
  if (z < -80) return 0.035;
  const ax = Math.abs(x),
    az = Math.abs(z);
  if (ax < 7 || az < 7) return 0.035;
  if (x >= 83 && x <= 93 && z >= 28 && z <= 38) return 0.17;
  if (
    (ax >= 14 && Math.abs(az - 10) <= 0.125) ||
    (az >= 14 && Math.abs(ax - 10) <= 0.125)
  )
    return 0.26;
  if (
    (ax >= 14 && Math.abs(az - 7.25) <= 0.14) ||
    (az >= 14 && Math.abs(ax - 7.25) <= 0.14)
  )
    return 0.2;
  if ((ax >= 14 && az >= 10 && az <= 16) || (az >= 14 && ax >= 10 && ax <= 16))
    return 0.17;
  if (ax >= 8 && ax <= 16 && az >= 8 && az <= 16) return 0.13;
  if (
    (ax >= 14 && az >= 7.35 && az <= 9.65) ||
    (az >= 14 && ax >= 7.35 && ax <= 9.65)
  )
    return 0.03;
  if (
    Math.abs(az - 65) <= 2 ||
    Math.abs(ax - 76) <= 2 ||
    Math.abs(ax - 105) <= 2
  )
    return 0.025;
  return 0;
}

export function districtLocation(x: number, z: number) {
  if (z < -300) return '金庭 CBD · 曜旋 500 m / 棱境 350 m / 星穹 420 m · 办公室内部暂未开放';
  if (Math.abs(x) > 215) return 'CBD 环线大道 · 沿道路北行抵达摩天楼广场';
  const mz = z - DISTRICT.mall.z;
  if (x >= 115 && x <= 126 && mz >= 60 && mz < 72)
    return 'B1 入口厅 · 后方车库尚未开放';
  if (x >= 115 && x <= 126 && mz >= 72 && mz <= 108) return '地下停车入口坡道';
  if (x >= 127 && x <= 190 && mz >= -48 && mz <= 70)
    return '室外停车场 · 人行步道靠商场侧';
  if (Math.abs(x) > 6 && Math.abs(x) < 112 && mz > 35.5 && mz < 89.5)
    return x < 0 ? '西侧室内长廊' : '东侧室内长廊';
  if (Math.abs(x) < 45 && Math.abs(mz) < 35) return '中央露天花园';
  if (Math.abs(x) <= 6 && mz >= 35 && mz <= 90)
    return '花园通道 · 左右大门进入商场';
  return '金庭汇前街 · 直行花园与商场，右侧停车入口';
}
