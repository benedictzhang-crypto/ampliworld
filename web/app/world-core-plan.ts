/**
 * Authoritative planning contract for AmpliWorld's first production-quality
 * 2 km × 2 km district. These coordinates are metres, not the compressed
 * render units used by the current R3F prototype.
 *
 * The 250 m parcels below are urban-planning parcels. They intentionally do
 * not replace the future 256 m streaming tiles described in the roadmap.
 */

export type WorldMetersPoint = Readonly<{
  coordinateSpace: 'WORLD_METERS';
  xMeters: number;
  zMeters: number;
}>;

export type WorldMetersBounds = Readonly<{
  coordinateSpace: 'WORLD_METERS';
  minXMeters: number;
  maxXMeters: number;
  minZMeters: number;
  maxZMeters: number;
}>;

export type CoreGridIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type CoreParcelId = `GC-X${CoreGridIndex}-Z${CoreGridIndex}`;

export type CoreParcel = Readonly<{
  id: CoreParcelId;
  column: CoreGridIndex;
  row: CoreGridIndex;
  bounds: WorldMetersBounds;
  center: WorldMetersPoint;
  neighbors: Readonly<{
    north: CoreParcelId | null;
    east: CoreParcelId | null;
    south: CoreParcelId | null;
    west: CoreParcelId | null;
  }>;
}>;

export const GOLDEN_CITY_SIZE_METERS = 2_000;
export const GOLDEN_CITY_PARCEL_SIZE_METERS = 250;
export const GOLDEN_CITY_GRID_DIMENSION = 8;
export const GOLDEN_CITY_PARCEL_COUNT = 64;

/**
 * Half-open bounds: the west/south edges are included and the east/north
 * edges are excluded. Internal seams therefore belong to the parcel on their
 * east or north side, and no point can belong to two parcels.
 */
export const GOLDEN_CITY_BOUNDS: WorldMetersBounds = Object.freeze({
  coordinateSpace: 'WORLD_METERS',
  minXMeters: -1_000,
  maxXMeters: 1_000,
  minZMeters: -1_000,
  maxZMeters: 1_000,
});

export const GOLDEN_CITY_SPATIAL_CONTRACT = Object.freeze({
  id: 'GOLDEN-CITY-CORE',
  name: 'AmpliWorld Golden City',
  coordinateSpace: 'WORLD_METERS',
  axisConvention: Object.freeze({
    positiveX: 'EAST',
    positiveZ: 'NORTH',
    origin: 'GOLDEN_CITY_CENTER',
  }),
  bounds: GOLDEN_CITY_BOUNDS,
  terrain: Object.freeze({
    profile: 'RIVER_TERRACES_TO_EASTERN_RIDGE',
    continuousSurfaceRequired: true,
  }),
  water: Object.freeze({
    primaryCorridor: 'GRAND_RIVER',
    continuityRule: 'CROSS_BOUNDARY_OR_END_IN_MODELLED_WATERFALL',
  }),
  skyline: Object.freeze({
    profile: 'POLYCENTRIC_CORE_WITH_GRADED_EDGES',
    completeRoofsRequired: true,
  }),
  renderMigration: Object.freeze({
    currentPrototype: 'LEGACY_COMPRESSED_RENDER_UNITS',
    rule: 'EXPLICIT_ADAPTER_REQUIRED',
  }),
} as const);

const CORE_GRID_INDICES = [0, 1, 2, 3, 4, 5, 6, 7] as const;

function parcelId(column: CoreGridIndex, row: CoreGridIndex): CoreParcelId {
  return `GC-X${column}-Z${row}`;
}

function adjacentIndex(
  value: CoreGridIndex,
  offset: -1 | 1,
): CoreGridIndex | null {
  const adjacent = value + offset;
  return adjacent >= 0 && adjacent < GOLDEN_CITY_GRID_DIMENSION
    ? (adjacent as CoreGridIndex)
    : null;
}

function createCoreParcel(
  column: CoreGridIndex,
  row: CoreGridIndex,
): CoreParcel {
  const minXMeters =
    GOLDEN_CITY_BOUNDS.minXMeters + column * GOLDEN_CITY_PARCEL_SIZE_METERS;
  const minZMeters =
    GOLDEN_CITY_BOUNDS.minZMeters + row * GOLDEN_CITY_PARCEL_SIZE_METERS;
  const west = adjacentIndex(column, -1);
  const east = adjacentIndex(column, 1);
  const south = adjacentIndex(row, -1);
  const north = adjacentIndex(row, 1);

  return Object.freeze({
    id: parcelId(column, row),
    column,
    row,
    bounds: Object.freeze({
      coordinateSpace: 'WORLD_METERS',
      minXMeters,
      maxXMeters: minXMeters + GOLDEN_CITY_PARCEL_SIZE_METERS,
      minZMeters,
      maxZMeters: minZMeters + GOLDEN_CITY_PARCEL_SIZE_METERS,
    }),
    center: Object.freeze({
      coordinateSpace: 'WORLD_METERS',
      xMeters: minXMeters + GOLDEN_CITY_PARCEL_SIZE_METERS / 2,
      zMeters: minZMeters + GOLDEN_CITY_PARCEL_SIZE_METERS / 2,
    }),
    neighbors: Object.freeze({
      north: north === null ? null : parcelId(column, north),
      east: east === null ? null : parcelId(east, row),
      south: south === null ? null : parcelId(column, south),
      west: west === null ? null : parcelId(west, row),
    }),
  });
}

/** Stable row-major registry; IDs derive from grid coordinates, not order. */
export const GOLDEN_CITY_PARCELS: readonly CoreParcel[] = Object.freeze(
  CORE_GRID_INDICES.flatMap((row) =>
    CORE_GRID_INDICES.map((column) => createCoreParcel(column, row)),
  ),
);

const GOLDEN_CITY_PARCEL_BY_ID = new Map(
  GOLDEN_CITY_PARCELS.map((parcel) => [parcel.id, parcel] as const),
);

export function getGoldenCityParcelById(id: CoreParcelId) {
  return GOLDEN_CITY_PARCEL_BY_ID.get(id) ?? null;
}

export function getGoldenCityParcelAtWorldMeters(
  point: WorldMetersPoint,
): CoreParcel | null {
  if (!Number.isFinite(point.xMeters) || !Number.isFinite(point.zMeters))
    return null;
  if (
    point.xMeters < GOLDEN_CITY_BOUNDS.minXMeters ||
    point.xMeters >= GOLDEN_CITY_BOUNDS.maxXMeters ||
    point.zMeters < GOLDEN_CITY_BOUNDS.minZMeters ||
    point.zMeters >= GOLDEN_CITY_BOUNDS.maxZMeters
  )
    return null;

  const column = Math.floor(
    (point.xMeters - GOLDEN_CITY_BOUNDS.minXMeters) /
      GOLDEN_CITY_PARCEL_SIZE_METERS,
  ) as CoreGridIndex;
  const row = Math.floor(
    (point.zMeters - GOLDEN_CITY_BOUNDS.minZMeters) /
      GOLDEN_CITY_PARCEL_SIZE_METERS,
  ) as CoreGridIndex;
  return getGoldenCityParcelById(parcelId(column, row));
}

export function worldMetersPoint(
  xMeters: number,
  zMeters: number,
): WorldMetersPoint {
  return { coordinateSpace: 'WORLD_METERS', xMeters, zMeters };
}
