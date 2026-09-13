// New metre-space block. City origin and asset transforms are data, not mesh JSX.
export const DISTRICT = {
  id: 'GC-GARDENS-B01',
  originWorldMeters: [-625, 8, -125],
  sizeMeters: [220, 360],
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
  mall: { id: 'GC-GARDENS-M01', assetId: 'GC-MALL-001', x: 0, z: -124 },
  spawnLocalMeters: [0, -68],
  limitations: [
    'Four instances of one residential type, not four architectural designs.',
    'Metro pavilion is not yet connected to fares or train travel.',
    'Economy services are retained for future integration; retired legacy scene has no player route.',
  ],
} as const;

// Surface heights from the exported street kit, not a flat offset above every surface.
export function districtGroundHeight(x: number, z: number) {
  if (z < -81 && Math.abs(x) < 52 && z > -167) return 0.17;
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
