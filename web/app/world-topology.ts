export type WorldPoint = readonly [x: number, z: number];

export type WorldSectorId =
  | 'STARTER_OUTER_RING'
  | 'CBD_CORE'
  | 'WATERFRONT_MARINA'
  | 'CROWN_RESIDENTIAL'
  | 'MIDSLOPE_VILLAS'
  | 'CIVIC_MEDICAL'
  | 'ENERGY_RESEARCH'
  | 'FOOD_RETAIL';

export type WorldSector = {
  id: WorldSectorId;
  name: string;
  center: WorldPoint;
  bounds: readonly [minX: number, maxX: number, minZ: number, maxZ: number];
  streamRadius: number;
  detailRadius: number;
  status: 'PLAYABLE' | 'SHELL' | 'PLANNED';
  description: string;
};

export type MetroHub = {
  id: string;
  name: string;
  sector: WorldSectorId;
  position: WorldPoint;
  lines: readonly string[];
};

export type RoadConnector = {
  id: string;
  name: string;
  class: 'TRUNK' | 'ARTERIAL' | 'SCENIC';
  width: number;
  points: readonly WorldPoint[];
};

/**
 * The rendered core is intentionally compressed like a large open-world game.
 * Its 160 × 160 engine units communicate a 6.4 × 6.4 km walkable city core,
 * while the atlas describes a much larger 320 × 240 km regional economy.
 */
export const PLAYABLE_CORE_KM = 6.4;
export const REPRESENTED_REGION_WIDTH_KM = 320;
export const REPRESENTED_REGION_HEIGHT_KM = 240;
export const REPRESENTED_REGION_KM = REPRESENTED_REGION_WIDTH_KM;
export const WORLD_CORE_UNITS = 160;
export const METERS_PER_WORLD_UNIT = PLAYABLE_CORE_KM * 1000 / WORLD_CORE_UNITS;

export const WORLD_SECTORS: readonly WorldSector[] = [
  {
    id: 'CBD_CORE',
    name: 'Civic Exchange Core',
    center: [0, -14],
    bounds: [-43, 43, -58, 30],
    streamRadius: 86,
    detailRadius: 52,
    status: 'PLAYABLE',
    description: 'Grand boulevard, exchange rotunda, art axis, offices, hotels and high-rise homes.',
  },
  {
    id: 'WATERFRONT_MARINA',
    name: 'Azure Waterfront',
    center: [-61, -42],
    bounds: [-80, -42, -76, 4],
    streamRadius: 82,
    detailRadius: 48,
    status: 'PLAYABLE',
    description: 'Public coast, ferry piers, working harbor, yacht basin and a continuous seaside promenade.',
  },
  {
    id: 'CROWN_RESIDENTIAL',
    name: 'Crown Residential',
    center: [38, -45],
    bounds: [18, 61, -78, -20],
    streamRadius: 70,
    detailRadius: 42,
    status: 'PLAYABLE',
    description: 'Dense premium towers, sky gardens and the residential edge of the city core.',
  },
  {
    id: 'MIDSLOPE_VILLAS',
    name: 'Millionaire Ridge',
    center: [62, -1],
    bounds: [43, 80, -34, 40],
    streamRadius: 78,
    detailRadius: 46,
    status: 'PLAYABLE',
    description: 'A climbable hillside of detached homes, overlooks, forest roads and gated view corridors.',
  },
  {
    id: 'CIVIC_MEDICAL',
    name: 'Meridian Civic & Medical Campus',
    center: [45, 46],
    bounds: [20, 70, 27, 68],
    streamRadius: 68,
    detailRadius: 40,
    status: 'SHELL',
    description: 'Hospital, emergency services, police, schools, laboratories, parks and public transport.',
  },
  {
    id: 'ENERGY_RESEARCH',
    name: 'North Grid & Energy Research Campus',
    center: [-48, 58],
    bounds: [-76, -21, 36, 80],
    streamRadius: 72,
    detailRadius: 38,
    status: 'SHELL',
    description: 'Grid control, clean generation research, secure utilities and a landscaped buffer zone.',
  },
  {
    id: 'FOOD_RETAIL',
    name: 'Canopy Food & Retail District',
    center: [-22, 24],
    bounds: [-46, 8, 7, 45],
    streamRadius: 62,
    detailRadius: 40,
    status: 'SHELL',
    description: 'Restaurants, markets, groceries, hotels, nightlife and day-to-day services.',
  },
  {
    id: 'STARTER_OUTER_RING',
    name: 'Starter Outer Ring',
    center: [0, 76],
    bounds: [-25, 25, 68, 80],
    streamRadius: 65,
    detailRadius: 34,
    status: 'PLAYABLE',
    description: 'High-density starter housing linked to the city by rail, buses and the southern trunk road.',
  },
] as const;

export const METRO_HUBS: readonly MetroHub[] = [
  { id: 'MTR-S01', name: 'Outer Ring Central', sector: 'STARTER_OUTER_RING', position: [0, 71], lines: ['M1', 'M4'] },
  { id: 'MTR-C01', name: 'Exchange Grand Avenue', sector: 'CBD_CORE', position: [0, 25], lines: ['M1', 'M2', 'M3'] },
  { id: 'MTR-C02', name: 'Rotunda South', sector: 'CBD_CORE', position: [0, -39], lines: ['M1', 'M3'] },
  { id: 'MTR-W01', name: 'Azure Waterfront', sector: 'WATERFRONT_MARINA', position: [-53, -27], lines: ['M2'] },
  { id: 'MTR-R01', name: 'Crown Towers', sector: 'CROWN_RESIDENTIAL', position: [34, -33], lines: ['M3'] },
  { id: 'MTR-H01', name: 'Ridge Gate', sector: 'MIDSLOPE_VILLAS', position: [48, 5], lines: ['M3', 'M5'] },
  { id: 'MTR-M01', name: 'Meridian Medical', sector: 'CIVIC_MEDICAL', position: [34, 43], lines: ['M1', 'M5'] },
  { id: 'MTR-E01', name: 'North Grid Research', sector: 'ENERGY_RESEARCH', position: [-36, 54], lines: ['M4'] },
  { id: 'MTR-F01', name: 'Canopy Market', sector: 'FOOD_RETAIL', position: [-18, 23], lines: ['M2', 'M4'] },
] as const;

export const ROAD_CONNECTORS: readonly RoadConnector[] = [
  {
    id: 'RD-A01',
    name: 'Grand Market Avenue',
    class: 'TRUNK',
    width: 15.6,
    points: [[0, 76], [0, 45], [0, 25], [0, 2], [0, -39], [0, -65]],
  },
  {
    id: 'RD-A02',
    name: 'Harbor Crescent',
    class: 'ARTERIAL',
    width: 10.5,
    points: [[0, -22], [-22, -26], [-45, -35], [-61, -52]],
  },
  {
    id: 'RD-A03',
    name: 'Civic Parkway',
    class: 'ARTERIAL',
    width: 11.5,
    points: [[0, 25], [23, 32], [45, 46]],
  },
  {
    id: 'RD-A04',
    name: 'Ridge Scenic Drive',
    class: 'SCENIC',
    width: 8,
    points: [[18, -18], [36, -11], [48, 5], [59, 23]],
  },
  {
    id: 'RD-A05',
    name: 'North Utility Boulevard',
    class: 'ARTERIAL',
    width: 10,
    points: [[0, 45], [-24, 49], [-48, 58]],
  },
] as const;

export function worldUnitsToKilometers(units: number) {
  return units * METERS_PER_WORLD_UNIT / 1000;
}

export function distanceBetween(a: WorldPoint, b: WorldPoint) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function nearbyWorldSectors(position: WorldPoint, extraRadius = 0) {
  return WORLD_SECTORS.filter((sector) => distanceBetween(position, sector.center) <= sector.streamRadius + extraRadius);
}

export function detailedWorldSectors(position: WorldPoint) {
  return WORLD_SECTORS.filter((sector) => distanceBetween(position, sector.center) <= sector.detailRadius);
}

export function nearestMetroHub(position: WorldPoint) {
  return METRO_HUBS.reduce((nearest, hub) => (
    distanceBetween(position, hub.position) < distanceBetween(position, nearest.position) ? hub : nearest
  ));
}
