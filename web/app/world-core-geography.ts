import { GOLDEN_CITY_PARCELS, type CoreParcelId } from './world-core-plan';

/** Design-stage metre-space geography; intentionally independent of live collision. */
export type GeographicPoint = readonly [xMeters: number, zMeters: number];
export type RiverStation = Readonly<{
  id: string;
  position: GeographicPoint;
  surfaceYMeters: number;
  widthMeters: number;
}>;

export const CORE_TERRAIN_PARAMETERS = Object.freeze({
  units: 'METERS',
  upAxis: 'Y',
  northAxis: '+Z',
  verticalDatum: 'LOCAL_MEAN_SEA_LEVEL',
  seaLevelYMeters: 0,
  sampleSpacingMeters: 20,
  baseElevationMeters: 8,
  eastRidgeRiseMeters: 100,
  ridgeStartXMeters: 350,
  ridgeEndXMeters: 1000,
  northRiseMeters: 22,
  riverBedDepthMeters: 5,
  channelBlendWidthMeters: 60,
} as const);

/** Upstream enters through the boundary; the duplicate XY stations form a fall. */
export const CORE_RIVER: readonly RiverStation[] = [
  { id: 'UPSTREAM', position: [1000, 680], surfaceYMeters: 62, widthMeters: 50 },
  { id: 'FALLS-CREST', position: [850, 640], surfaceYMeters: 60, widthMeters: 50 },
  { id: 'FALLS-TOE', position: [850, 640], surfaceYMeters: 26, widthMeters: 50 },
  { id: 'UPPER-GARDENS', position: [650, 580], surfaceYMeters: 24, widthMeters: 70 },
  { id: 'NORTHBANK', position: [380, 430], surfaceYMeters: 19, widthMeters: 90 },
  { id: 'CIVIC-REACH', position: [50, 300], surfaceYMeters: 13, widthMeters: 110 },
  { id: 'EXCHANGE-REACH', position: [-160, 100], surfaceYMeters: 9, widthMeters: 110 },
  { id: 'RIVER-PARK', position: [-320, -180], surfaceYMeters: 5, widthMeters: 120 },
  { id: 'MARINA-REACH', position: [-600, -500], surfaceYMeters: 1, widthMeters: 140 },
  { id: 'OCEAN-MOUTH', position: [-820, -740], surfaceYMeters: 0, widthMeters: 180 },
];

/** Closed coastline polygon. South/west edges continue into the future region. */
export const CORE_OCEAN_POLYGON: readonly GeographicPoint[] = [
  [-1000, -1000], [-1000, -460], [-780, -560],
  [-620, -760], [-520, -1000], [-1000, -1000],
];

export const CORE_WATERFALL = Object.freeze({
  id: 'GC-WATERFALL-01', name: 'Aurelian Falls',
  crestStationId: 'FALLS-CREST', toeStationId: 'FALLS-TOE',
  dropMeters: 34, status: 'SCHEMATIC_MESH',
});

export function isCoreOcean(x: number, z: number) {
  let inside = false;
  for (let i = 0, j = CORE_OCEAN_POLYGON.length - 1; i < CORE_OCEAN_POLYGON.length; j = i++) {
    const a = CORE_OCEAN_POLYGON[i];
    const b = CORE_OCEAN_POLYGON[j];
    if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

export function sampleCoreRiver(x: number, z: number) {
  let nearest = { distanceMeters: Infinity, surfaceYMeters: 0, widthMeters: 0 };
  for (let i = 1; i < CORE_RIVER.length; i++) {
    const a = CORE_RIVER[i - 1];
    const b = CORE_RIVER[i];
    const dx = b.position[0] - a.position[0];
    const dz = b.position[1] - a.position[1];
    const lengthSquared = dx * dx + dz * dz;
    if (lengthSquared === 0) continue; // The vertical fall is a separate mesh.
    const t = Math.max(0, Math.min(1, ((x - a.position[0]) * dx + (z - a.position[1]) * dz) / lengthSquared));
    const distanceMeters = Math.hypot(x - a.position[0] - t * dx, z - a.position[1] - t * dz);
    if (distanceMeters <= nearest.distanceMeters) nearest = {
      distanceMeters,
      surfaceYMeters: a.surfaceYMeters + (b.surfaceYMeters - a.surfaceYMeters) * t,
      widthMeters: a.widthMeters + (b.widthMeters - a.widthMeters) * t,
    };
  }
  return nearest;
}

function smoothstep(a: number, b: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Editable macro landform, with a schematic river cut; not a navmesh or flood model. */
export function sampleCoreTerrainYMeters(x: number, z: number) {
  const p = CORE_TERRAIN_PARAMETERS;
  if (isCoreOcean(x, z)) return -8;
  const base = p.baseElevationMeters + p.eastRidgeRiseMeters * smoothstep(p.ridgeStartXMeters, p.ridgeEndXMeters, x)
    + p.northRiseMeters * smoothstep(0, 1000, z);
  const river = sampleCoreRiver(x, z);
  const bankDistance = river.distanceMeters - river.widthMeters / 2;
  const blend = smoothstep(0, p.channelBlendWidthMeters, bankDistance);
  return (river.surfaceYMeters - p.riverBedDepthMeters) * (1 - blend) + base * blend;
}

export const CORE_PRECINCTS = [
  { id: 'EXCHANGE', name: 'Exchange & cultural axis', color: '#d1b36a', maxHeightAGLMeters: 220, uses: ['OFFICE', 'RETAIL', 'CULTURE', 'HOUSING'] },
  { id: 'NORTHBANK', name: 'Northbank homes', color: '#c7c6b9', maxHeightAGLMeters: 72, uses: ['HOUSING', 'SCHOOL', 'LOCAL_RETAIL'] },
  { id: 'CIVIC', name: 'Civic & health quarter', color: '#b7c8c7', maxHeightAGLMeters: 48, uses: ['HOSPITAL', 'POLICE', 'SCHOOL', 'HOUSING'] },
  { id: 'GARDENS', name: 'Garden neighbourhoods', color: '#b6c9ac', maxHeightAGLMeters: 36, uses: ['HOUSING', 'GROCERY', 'PARK'] },
  { id: 'RIDGE', name: 'Mid-slope & summit estates', color: '#cfbfa7', maxHeightAGLMeters: 14, uses: ['VILLA', 'PARK', 'LOCAL_RETAIL'] },
  { id: 'MARINA', name: 'Azure marina & hotels', color: '#b3cbd2', maxHeightAGLMeters: 36, uses: ['HOTEL', 'MARINA', 'DINING', 'HOUSING'] },
  { id: 'COAST', name: 'Public coast & water', color: '#72a5b4', maxHeightAGLMeters: 0, uses: ['WATER', 'PUBLIC_COAST'] },
] as const;

export type CorePrecinctId = (typeof CORE_PRECINCTS)[number]['id'];
function precinctAt(x: number, z: number): CorePrecinctId {
  if (isCoreOcean(x, z)) return 'COAST';
  if (x >= 625) return 'RIDGE';
  if (x <= -375 && z <= -375) return 'MARINA';
  if (z >= 625) return 'NORTHBANK';
  if (x <= -375 && z >= 125) return 'CIVIC';
  if (x >= -125 && x <= 375 && z >= -625 && z <= 125) return 'EXCHANGE';
  return 'GARDENS';
}

export const CORE_PARCEL_PROGRAM = GOLDEN_CITY_PARCELS.map((parcel) => ({
  parcelId: parcel.id as CoreParcelId,
  precinctId: precinctAt(parcel.center.xMeters, parcel.center.zMeters),
  status: 'PLANNED' as const,
  // Water and public-bank reservations always override these coarse land-use cells.
  developmentRule: 'EXCLUDE_WATER_CHANNEL_AND_PUBLIC_BANKS' as const,
}));

/** Three perpendicular crossing reservations; detailed ramps and navigation are future work. */
export const CORE_BRIDGE_RESERVATIONS = [4, 6, 8].map((stationIndex, index) => {
  const station = CORE_RIVER[stationIndex];
  const before = CORE_RIVER[stationIndex - 1].position;
  const after = CORE_RIVER[stationIndex + 1].position;
  const dx = after[0] - before[0];
  const dz = after[1] - before[1];
  const length = Math.hypot(dx, dz);
  const spanMeters = station.widthMeters + 100;
  const offsetX = (-dz / length) * spanMeters / 2;
  const offsetZ = (dx / length) * spanMeters / 2;
  return {
    id: `GC-BRIDGE-0${index + 1}`, riverStationId: station.id,
    from: [station.position[0] - offsetX, station.position[1] - offsetZ] as GeographicPoint,
    to: [station.position[0] + offsetX, station.position[1] + offsetZ] as GeographicPoint,
    spanMeters, deckWidthMeters: 28, soffitClearanceMeters: 9,
    deckThicknessMeters: 2, deckYMeters: station.surfaceYMeters + 11,
    status: 'RESERVATION_ONLY',
  };
});
