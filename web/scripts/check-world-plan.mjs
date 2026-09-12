import assert from 'node:assert/strict';
import {
  GOLDEN_CITY_BOUNDS,
  GOLDEN_CITY_GRID_DIMENSION,
  GOLDEN_CITY_PARCEL_COUNT,
  GOLDEN_CITY_PARCEL_SIZE_METERS,
  GOLDEN_CITY_PARCELS,
  GOLDEN_CITY_SIZE_METERS,
  getGoldenCityParcelAtWorldMeters,
  getGoldenCityParcelById,
  worldMetersPoint,
} from '../app/world-core-plan.ts';
import {
  CONTINUOUS_OCEAN_BAY,
  CONTINUOUS_OCEAN_RECTANGLE,
  CONTINUOUS_WORLD_BOUNDS,
  CONTINUOUS_WORLD_LEGACY_ARCHITECTURE_BLOCKERS,
  CONTINUOUS_WORLD_LEGACY_BLOCKERS,
  CONTINUOUS_WORLD_MEASURED_CBD_BLOCKERS,
  CONTINUOUS_WORLD_MEASURED_ASSET_BLOCKERS,
  CONTINUOUS_WORLD_ROADSIDE_TREE_FOOTPRINTS,
  CONTINUOUS_WORLD_ROAD_RENDER_BAND_BLOCKERS,
  LEGACY_DISTRICT_WORLD_ORIGINS,
  LEGACY_RIDGE_RESIDENTIAL_BUILDING_BLOCKERS,
  AZURE_HOTEL_BUILDING_BLOCKERS,
  MAX_CONTINUOUS_WORLD_STEP,
  METROPOLITAN_RESIDENTIAL_BUILDING_BLOCKERS,
  METROPOLITAN_RESIDENTIAL_MASSING_RESERVATIONS,
  METROPOLITAN_RESIDENTIAL_QUARTER_COLLISION_SPECS,
  canStepBetweenContinuousWorldPoints,
  canTraverseContinuousWorld,
  distanceToGrandRiver,
  getContinuousWorldMetroArrival,
  getContinuousWorldMetroEntrancePosition,
  getContinuousWorldLegacyBlockerAtXZ,
  getLegacyDistrictContentOrigin,
  getContinuousWorldProceduralSolids,
  getContinuousWorldSectorMassing,
  getContinuousWorldSectorLod,
  getRoadRenderWidth,
  getWorldSurfaceElevationXZ,
  getVisibleContinuousWorldSectors,
  isWorldCameraPointOccluded,
  isWorldPointBlockedBySolidGeometry,
  isWorldPointInWater,
  isWorldPointOnWalkableDeck,
  transformBuildingSitesToWorldBlockers,
} from '../app/continuous-world.tsx';
import { WORLD_ROAD_OUTER_MARGIN } from '../app/world-road-geometry.ts';
import {
  AZURE_BAY_HOTEL_PLAN_OPTIONS,
  LEGACY_RIDGE_VILLA_FOUNDATION_Y,
  LEGACY_RIDGE_RESIDENTIAL_QUARTER_SPECS,
  METROPOLITAN_RESIDENTIAL_QUARTER_SPECS,
  createMarinaHotelDistrictPlan,
  createResidentialQuarterPlan,
} from '../app/urban-expansion.tsx';
import {
  WORLD_WATERCRAFT,
  WORLD_WATERCRAFT_FOOTPRINTS,
  getWorldWatercraftAtXZ,
} from '../app/world-watercraft.ts';
import {
  F1_CIRCUIT_POINTS,
  F1_PIT_LANE_POINTS,
  NAMED_WORLD_SOLIDS,
  OCEAN_SKYRAIL_ROUTE,
  STARTER_TOWER_SPECS,
  SUMMIT_SCENIC_ROUTE,
  WORLD_SURFACE_PLATEAUS,
  WORLD_SURFACE_RAMPS,
  WORLD_SITE_RESERVATIONS,
  WORLD_SOLID_FOOTPRINTS,
  getWorldFootprintElevationRange,
  getWorldGroundElevation,
  isPointInNamedWorldSolidXZ,
  isPointInReservedWorldSite,
} from '../app/world-spatial-registry.ts';
import {
  METERS_PER_WORLD_UNIT,
  METRO_HUBS,
  METRO_STATION_REGISTRY,
  ROAD_CONNECTORS,
  WORLD_SECTORS,
} from '../app/world-topology.ts';

function assertUniqueIds(label, values) {
  const ids = values.map((value) => value.id);
  assert.equal(new Set(ids).size, ids.length, `${label} IDs must be unique`);
}

function assertPointInBounds(label, [x, z]) {
  assert.ok(
    Number.isFinite(x) && Number.isFinite(z),
    `${label} must be finite`,
  );
  assert.ok(
    x >= CONTINUOUS_WORLD_BOUNDS.minX &&
      x <= CONTINUOUS_WORLD_BOUNDS.maxX &&
      z >= CONTINUOUS_WORLD_BOUNDS.minZ &&
      z <= CONTINUOUS_WORLD_BOUNDS.maxZ,
    `${label} must remain inside continuous-world bounds`,
  );
}

function isPointInRenderedOceanMask([x, z]) {
  const inRectangle =
    x >= CONTINUOUS_OCEAN_RECTANGLE.minX &&
    x <= CONTINUOUS_OCEAN_RECTANGLE.maxX &&
    z >= CONTINUOUS_OCEAN_RECTANGLE.minZ &&
    z <= CONTINUOUS_OCEAN_RECTANGLE.maxZ;
  const bayX =
    (x - CONTINUOUS_OCEAN_BAY.center[0]) / CONTINUOUS_OCEAN_BAY.radii[0];
  const bayZ =
    (z - CONTINUOUS_OCEAN_BAY.center[1]) / CONTINUOUS_OCEAN_BAY.radii[1];
  return inRectangle || bayX * bayX + bayZ * bayZ <= 1;
}

function axesFor(footprint) {
  const angle = footprint.rotationRadians ?? 0;
  return [
    [Math.cos(angle), -Math.sin(angle)],
    [Math.sin(angle), Math.cos(angle)],
  ];
}

function projectedRadius(footprint, axis) {
  const [right, forward] = axesFor(footprint);
  return (
    footprint.halfExtents[0] *
      Math.abs(right[0] * axis[0] + right[1] * axis[1]) +
    footprint.halfExtents[1] *
      Math.abs(forward[0] * axis[0] + forward[1] * axis[1])
  );
}

function circularRadius(footprint) {
  if (footprint.shape !== 'ELLIPSE') return undefined;
  return Math.abs(footprint.halfExtents[0] - footprint.halfExtents[1]) < 1e-9
    ? footprint.halfExtents[0]
    : undefined;
}

function circleOverlapsRectangle(circle, rectangle, radius) {
  const [right, forward] = axesFor(rectangle);
  const deltaX = circle.center[0] - rectangle.center[0];
  const deltaZ = circle.center[1] - rectangle.center[1];
  const localX = deltaX * right[0] + deltaZ * right[1];
  const localZ = deltaX * forward[0] + deltaZ * forward[1];
  const nearestX = Math.max(
    -rectangle.halfExtents[0],
    Math.min(rectangle.halfExtents[0], localX),
  );
  const nearestZ = Math.max(
    -rectangle.halfExtents[1],
    Math.min(rectangle.halfExtents[1], localZ),
  );
  return Math.hypot(localX - nearestX, localZ - nearestZ) < radius;
}

function overlaps(a, b, clearance = 0.02) {
  const radiusA = circularRadius(a);
  const radiusB = circularRadius(b);
  if (radiusA !== undefined && radiusB !== undefined) {
    return (
      Math.hypot(b.center[0] - a.center[0], b.center[1] - a.center[1]) <
      radiusA + radiusB + clearance
    );
  }
  if (radiusA !== undefined)
    return circleOverlapsRectangle(a, b, radiusA + clearance);
  if (radiusB !== undefined)
    return circleOverlapsRectangle(b, a, radiusB + clearance);
  const delta = [b.center[0] - a.center[0], b.center[1] - a.center[1]];
  for (const axis of [...axesFor(a), ...axesFor(b)]) {
    const centerDistance = Math.abs(delta[0] * axis[0] + delta[1] * axis[1]);
    if (
      centerDistance >=
      projectedRadius(a, axis) + projectedRadius(b, axis) + clearance
    )
      return false;
  }
  return true;
}

function containsPoint(footprint, point, margin = 0) {
  const angle = footprint.rotationRadians ?? 0;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const dx = point[0] - footprint.center[0];
  const dz = point[1] - footprint.center[1];
  const localX = dx * cosine - dz * sine;
  const localZ = dx * sine + dz * cosine;
  if (footprint.shape === 'ELLIPSE') {
    const radiusX = footprint.halfExtents[0] + margin;
    const radiusZ = footprint.halfExtents[1] + margin;
    return (
      (localX * localX) / (radiusX * radiusX) +
        (localZ * localZ) / (radiusZ * radiusZ) <
      1
    );
  }
  return (
    Math.abs(localX) < footprint.halfExtents[0] + margin &&
    Math.abs(localZ) < footprint.halfExtents[1] + margin
  );
}

function sampleFootprint(footprint, divisions = 4) {
  const [right, forward] = axesFor(footprint);
  const points = [];
  for (let xIndex = 0; xIndex <= divisions; xIndex += 1) {
    for (let zIndex = 0; zIndex <= divisions; zIndex += 1) {
      const localX =
        -footprint.halfExtents[0] +
        (footprint.halfExtents[0] * 2 * xIndex) / divisions;
      const localZ =
        -footprint.halfExtents[1] +
        (footprint.halfExtents[1] * 2 * zIndex) / divisions;
      points.push([
        footprint.center[0] + right[0] * localX + forward[0] * localZ,
        footprint.center[1] + right[1] * localX + forward[1] * localZ,
      ]);
    }
  }
  return points;
}

function assertClose(actual, expected, message, epsilon = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${message}: expected ${expected}, received ${actual}`,
  );
}

function assertBlockerMatchesTransformedSite(
  blocker,
  site,
  { position, rotationY = 0, uniformScale = 1 },
) {
  const scale = Math.abs(uniformScale);
  const cosine = Math.cos(rotationY);
  const sine = Math.sin(rotationY);
  const scaledX = site.x * scale;
  const scaledZ = site.z * scale;
  assertClose(
    blocker.center[0],
    position[0] + scaledX * cosine + scaledZ * sine,
    `${blocker.id} transformed X`,
  );
  assertClose(
    blocker.center[1],
    position[2] - scaledX * sine + scaledZ * cosine,
    `${blocker.id} transformed Z`,
  );
  assertClose(
    blocker.halfExtents[0],
    (site.width * scale) / 2,
    `${blocker.id} transformed half-width`,
  );
  assertClose(
    blocker.halfExtents[1],
    (site.depth * scale) / 2,
    `${blocker.id} transformed half-depth`,
  );
  assertClose(
    blocker.rotationRadians,
    rotationY + site.rotationY,
    `${blocker.id} transformed rotation`,
  );
  assertClose(
    blocker.height,
    site.height * scale,
    `${blocker.id} transformed height`,
  );
  assertClose(
    blocker.baseElevation,
    position[1],
    `${blocker.id} transformed base elevation`,
  );
}

assertUniqueIds('Sector', WORLD_SECTORS);
assertUniqueIds('Metro hub', METRO_HUBS);
assertUniqueIds('Metro station', METRO_STATION_REGISTRY);
assertUniqueIds('Road', ROAD_CONNECTORS);
assertUniqueIds('Reserved site', WORLD_SITE_RESERVATIONS);
assertUniqueIds('Solid building', WORLD_SOLID_FOOTPRINTS);
assertUniqueIds('Watercraft', WORLD_WATERCRAFT);
assertUniqueIds('Legacy building collider', CONTINUOUS_WORLD_LEGACY_BLOCKERS);
assert.equal(
  WORLD_WATERCRAFT.length,
  WORLD_WATERCRAFT_FOOTPRINTS.length,
  'Every rendered watercraft placement must own exactly one physical footprint',
);

for (const playerCorner of [
  [CONTINUOUS_WORLD_BOUNDS.minX, CONTINUOUS_WORLD_BOUNDS.minZ],
  [CONTINUOUS_WORLD_BOUNDS.minX, CONTINUOUS_WORLD_BOUNDS.maxZ],
  [CONTINUOUS_WORLD_BOUNDS.maxX, CONTINUOUS_WORLD_BOUNDS.minZ],
  [CONTINUOUS_WORLD_BOUNDS.maxX, CONTINUOUS_WORLD_BOUNDS.maxZ],
]) {
  const visible = getVisibleContinuousWorldSectors(playerCorner);
  assert.equal(
    visible.length,
    WORLD_SECTORS.length,
    `Every sector shell must remain visible from world corner ${playerCorner.join(',')}`,
  );
}

for (const solid of WORLD_SOLID_FOOTPRINTS) {
  const sector = WORLD_SECTORS.find(
    (candidate) => candidate.id === solid.sectorId,
  );
  assert.ok(sector, `${solid.id} must reference a real world sector`);
  if (solid.kind === 'STARTER_TOWER') continue;
  assert.ok(
    getContinuousWorldSectorMassing(sector, 'SHELL').some(
      (instance) => instance.id === `${solid.id}-PERSISTENT-SHELL`,
    ),
    `${solid.id} must retain a persistent distance shell`,
  );
}

const azureHotelSites = createMarinaHotelDistrictPlan({
  ...AZURE_BAY_HOTEL_PLAN_OPTIONS,
}).hotels;
assert.equal(AZURE_HOTEL_BUILDING_BLOCKERS.length, azureHotelSites.length);
AZURE_HOTEL_BUILDING_BLOCKERS.forEach((blocker, index) => {
  assert.equal(
    blocker.id,
    `AZURE-BAY-HOTEL-${String(azureHotelSites[index].stableBuildingIndex).padStart(2, '0')}`,
  );
  assertBlockerMatchesTransformedSite(blocker, azureHotelSites[index], {
    position: LEGACY_DISTRICT_WORLD_ORIGINS.AZURE_YACHT_MARINA,
    rotationY: -Math.PI / 2,
    uniformScale: 0.62,
  });
  assert.ok(
    isWorldPointBlockedBySolidGeometry(blocker.center, 0),
    `${blocker.id} world-space render centre must be physically solid`,
  );
});
assert.deepEqual(
  azureHotelSites.map((site) => site.sourceSiteIndex),
  [3],
  'Only the collision-free Azure hotel 03 parcel may remain active',
);
assert.ok(
  !AZURE_HOTEL_BUILDING_BLOCKERS.some(
    (blocker) => blocker.id === 'AZURE-BAY-HOTEL-04',
  ),
  'Suppressed Azure hotel 04 must leave no collision blocker',
);
assertClose(
  AZURE_HOTEL_BUILDING_BLOCKERS[0].center[0],
  -52.34,
  'Azure hotel 03 fixed X',
);

assert.equal(CONTINUOUS_WORLD_MEASURED_ASSET_BLOCKERS.length, 9);
for (const measured of CONTINUOUS_WORLD_MEASURED_ASSET_BLOCKERS) {
  assert.ok(
    isWorldPointBlockedBySolidGeometry(measured.center, 0),
    `${measured.id} measured render centre must be physically solid`,
  );
}
for (const [index, expected] of [
  {
    id: 'AZURE_YACHT_MARINA-BUILDING-H',
    center: [-36.4999997, -73],
    halfExtents: [1.5020993, 1.7134149],
    rotationRadians: -Math.PI / 2,
  },
  {
    id: 'AZURE_YACHT_MARINA-BUILDING-J',
    center: [-38.5, -43.9999998],
    halfExtents: [3.2295614, 2.0770001],
    rotationRadians: -Math.PI / 2,
  },
].entries()) {
  const actual = CONTINUOUS_WORLD_MEASURED_ASSET_BLOCKERS[index];
  assert.equal(actual.id, expected.id);
  assertClose(actual.center[0], expected.center[0], `${actual.id} centre X`);
  assertClose(actual.center[1], expected.center[1], `${actual.id} centre Z`);
  assertClose(
    actual.halfExtents[0],
    expected.halfExtents[0],
    `${actual.id} half-width`,
  );
  assertClose(
    actual.halfExtents[1],
    expected.halfExtents[1],
    `${actual.id} half-depth`,
  );
  assertClose(
    actual.rotationRadians,
    expected.rotationRadians,
    `${actual.id} rotation`,
  );
}
assert.ok(
  CONTINUOUS_WORLD_LEGACY_BLOCKERS.every(
    (blocker) =>
      !(
        (blocker.district === 'CBD' &&
          /^CBD-(?:1[6-9]|[23]\d)$/.test(blocker.id)) ||
        (blocker.district === 'CROWN_RESIDENTIAL_TOWERS' &&
          /^CROWN_RESIDENTIAL_TOWERS-(?:[5-9]|1[0-2])$/.test(blocker.id))
      ),
  ),
  'Embedded-only ghost arrival furniture must not leave invisible colliders',
);
assertClose(
  AZURE_HOTEL_BUILDING_BLOCKERS[0].center[1],
  -56.14,
  'Azure hotel 03 fixed Z',
);
{
  const hotel = AZURE_HOTEL_BUILDING_BLOCKERS[0];
  const cosine = Math.cos(hotel.rotationRadians);
  const sine = Math.sin(hotel.rotationRadians);
  const localZ = hotel.halfExtents[1] - 0.05;
  const insideRotatedEdge = [
    hotel.center[0] + sine * localZ,
    hotel.center[1] + cosine * localZ,
  ];
  assert.equal(
    getContinuousWorldLegacyBlockerAtXZ(...insideRotatedEdge, 0)?.id,
    hotel.id,
    'Azure hotel collision must honor the rendered parent and site rotations',
  );
}
assert.ok(
  !getContinuousWorldLegacyBlockerAtXZ(-51.8, -42.5, 0)?.id.startsWith(
    'AZURE-BAY-HOTEL',
  ),
  'The former mirrored Azure hotel collider must not survive at -51.8,-42.5',
);

for (const blocker of CONTINUOUS_WORLD_LEGACY_BLOCKERS.filter(
  (candidate) => candidate.shape === 'ELLIPSE',
)) {
  const circularBlockerId = blocker.id;
  assertClose(
    blocker.halfExtents[0],
    blocker.halfExtents[1],
    `${circularBlockerId} circular collider radii`,
  );
  assert.equal(
    blocker.shape,
    'ELLIPSE',
    `${circularBlockerId} must use its visible circular silhouette`,
  );
  assert.equal(
    getContinuousWorldLegacyBlockerAtXZ(...blocker.center, 0)?.id,
    circularBlockerId,
    `${circularBlockerId} centre must remain solid`,
  );
  const openCorner = [
    blocker.center[0] + blocker.halfExtents[0] * 0.91,
    blocker.center[1] + blocker.halfExtents[1] * 0.91,
  ];
  assert.notEqual(
    getContinuousWorldLegacyBlockerAtXZ(...openCorner, 0)?.id,
    circularBlockerId,
    `${circularBlockerId} bounding-box corner must not become an invisible wall`,
  );
  assert.equal(
    getContinuousWorldLegacyBlockerAtXZ(
      blocker.center[0] + blocker.halfExtents[0] + 0.2,
      blocker.center[1],
      0.25,
    )?.id,
    circularBlockerId,
    `${circularBlockerId} player-radius margin must expand the visible circle`,
  );
}

assert.ok(
  !CONTINUOUS_WORLD_LEGACY_BLOCKERS.some((blocker) => blocker.id === 'CBD-15'),
  'The former whole-parcel Energy Campus collider must not survive',
);
assert.deepEqual(
  CONTINUOUS_WORLD_LEGACY_BLOCKERS.filter((blocker) =>
    blocker.id.startsWith('CBD-15-'),
  ).map((blocker) => blocker.id),
  [
    'CBD-15-RESEARCH',
    'CBD-15-SERVICE',
    'CBD-15-UTILITY-W',
    'CBD-15-UTILITY-C',
    'CBD-15-REACTOR',
    'CBD-15-MAST',
    'CBD-15-CANOPY-SUPPORT-1',
    'CBD-15-CANOPY-SUPPORT-2',
    'CBD-15-CANOPY-SUPPORT-3',
    'CBD-15-CANOPY-SUPPORT-4',
    'CBD-15-CANOPY-SUPPORT-5',
    'CBD-15-CANOPY-SUPPORT-6',
  ],
  'Energy Campus must register only visible buildings, equipment and supports',
);
assert.equal(
  canTraverseContinuousWorld([44.5, 5.3]),
  true,
  'Energy Campus central public realm must remain walkable',
);
assert.equal(
  canTraverseContinuousWorld([46.8, 5.85]),
  false,
  'Energy reactor visible perimeter must be physically solid',
);

assert.equal(
  isPointInNamedWorldSolidXZ(-120, -58, 0),
  true,
  'Ocean Crown Casino centre must remain solid',
);
assert.equal(
  isPointInNamedWorldSolidXZ(-108.5, -46.5, 0),
  false,
  'Ocean Crown Casino square corner must not become an invisible wall',
);

assert.equal(METROPOLITAN_RESIDENTIAL_QUARTER_COLLISION_SPECS.length, 5);
assert.equal(
  METROPOLITAN_RESIDENTIAL_QUARTER_COLLISION_SPECS,
  METROPOLITAN_RESIDENTIAL_QUARTER_SPECS,
  'Rendering and collision must consume the exact same residential placement registry',
);
{
  const ridgeSpec = LEGACY_RIDGE_RESIDENTIAL_QUARTER_SPECS.find(
    (quarter) => quarter.id === 'N-RDG-02',
  );
  assert.ok(ridgeSpec);
  const ridgePlan = createResidentialQuarterPlan(ridgeSpec.plan);
  assert.deepEqual(
    ridgePlan.sites.map((site) => site.sourceSiteIndex),
    [1, 1, 2, 2, 3, 3, 5, 5],
    'N-RDG-02 source site 04 suppression must remove both semi-detached homes',
  );
  assert.deepEqual(
    ridgePlan.sites.map((site) => site.stableBuildingIndex),
    [1, 2, 3, 4, 5, 6, 9, 10],
    'Residential building IDs must stay stable after source-site suppression',
  );
  assert.ok(
    !LEGACY_RIDGE_RESIDENTIAL_BUILDING_BLOCKERS.some(
      (blocker) =>
        blocker.id === 'N-RDG-02-BUILDING-07' ||
        blocker.id === 'N-RDG-02-BUILDING-08',
    ),
    'Suppressed N-RDG-02 source site 04 must leave no collision blockers',
  );
}
assert.equal(METROPOLITAN_RESIDENTIAL_MASSING_RESERVATIONS.length, 5);
assert.equal(
  METROPOLITAN_RESIDENTIAL_BUILDING_BLOCKERS.length,
  METROPOLITAN_RESIDENTIAL_QUARTER_COLLISION_SPECS.reduce(
    (total, quarter) =>
      total + createResidentialQuarterPlan(quarter.plan).sites.length,
    0,
  ),
  'Every retained metropolitan residential building must own one collider',
);
for (const quarter of METROPOLITAN_RESIDENTIAL_QUARTER_COLLISION_SPECS) {
  const plan = createResidentialQuarterPlan(quarter.plan);
  const blockers = METROPOLITAN_RESIDENTIAL_BUILDING_BLOCKERS.filter(
    (blocker) => blocker.id.startsWith(`${quarter.id}-BUILDING-`),
  );
  assert.equal(
    blockers.length,
    plan.sites.length,
    `${quarter.id} must have one collider for every rendered BuildingSite`,
  );
  blockers.forEach((blocker, index) => {
    assertBlockerMatchesTransformedSite(blocker, plan.sites[index], {
      position: quarter.position,
      rotationY: quarter.rotationY,
      uniformScale: quarter.uniformScale,
    });
    const [quarterRight, quarterForward] = axesFor({
      rotationRadians: quarter.rotationY,
    });
    const delta = [
      blocker.center[0] - quarter.position[0],
      blocker.center[1] - quarter.position[2],
    ];
    const pathHalfWidth = (plan.avenueWidth * quarter.uniformScale) / 2;
    const xClearance =
      Math.abs(delta[0] * quarterRight[0] + delta[1] * quarterRight[1]) -
      projectedRadius(blocker, quarterRight);
    const zClearance =
      Math.abs(delta[0] * quarterForward[0] + delta[1] * quarterForward[1]) -
      projectedRadius(blocker, quarterForward);
    assert.ok(
      xClearance >= pathHalfWidth + 0.38,
      `${blocker.id} must leave the north-south public avenue walkable`,
    );
    assert.ok(
      zClearance >= pathHalfWidth + 0.38,
      `${blocker.id} must leave the east-west public avenue walkable`,
    );
  });
  assert.ok(
    blockers.every(
      (blocker) =>
        !containsPoint(
          blocker,
          [quarter.position[0], quarter.position[2]],
          0.38,
        ),
    ),
    `${quarter.id} centre crossing must not use the former superblock collider`,
  );
  for (let left = 0; left < blockers.length; left += 1) {
    for (let right = left + 1; right < blockers.length; right += 1) {
      assert.ok(
        !overlaps(blockers[left], blockers[right]),
        `${blockers[left].id} overlaps ${blockers[right].id}`,
      );
    }
  }
}

assert.equal(LEGACY_RIDGE_RESIDENTIAL_QUARTER_SPECS.length, 2);
assert.equal(
  LEGACY_RIDGE_RESIDENTIAL_BUILDING_BLOCKERS.length,
  LEGACY_RIDGE_RESIDENTIAL_QUARTER_SPECS.reduce(
    (total, quarter) =>
      total + createResidentialQuarterPlan(quarter.plan).sites.length,
    0,
  ),
  'Every retained Ridge residential building must own one collider',
);
assert.deepEqual(
  LEGACY_DISTRICT_WORLD_ORIGINS.MILLIONAIRE_RIDGE,
  [48, 0, -29],
  'The Ridge district origin must remain on its canonical metro-aligned anchor',
);
assert.deepEqual(
  getLegacyDistrictContentOrigin('MILLIONAIRE_RIDGE'),
  [64, 0, -29],
  'Ridge visuals and collision must compose the same adjacent content offset',
);
for (const quarter of LEGACY_RIDGE_RESIDENTIAL_QUARTER_SPECS) {
  const plan = createResidentialQuarterPlan(quarter.plan);
  const blockers = LEGACY_RIDGE_RESIDENTIAL_BUILDING_BLOCKERS.filter(
    (blocker) => blocker.id.startsWith(`${quarter.id}-BUILDING-`),
  );
  const ridgeOrigin = getLegacyDistrictContentOrigin('MILLIONAIRE_RIDGE');
  const position = [
    ridgeOrigin[0] + quarter.localPosition[0],
    ridgeOrigin[1] + quarter.localPosition[1],
    ridgeOrigin[2] + quarter.localPosition[2],
  ];
  assert.equal(
    blockers.length,
    plan.sites.length,
    `${quarter.id} must replace its former broad parcel blocker with one collider per rendered building`,
  );
  blockers.forEach((blocker, index) => {
    assertBlockerMatchesTransformedSite(blocker, plan.sites[index], {
      position,
      uniformScale: quarter.uniformScale,
    });
  });
}
assert.deepEqual(
  LEGACY_RIDGE_RESIDENTIAL_QUARTER_SPECS.map((quarter) => {
    const origin = getLegacyDistrictContentOrigin('MILLIONAIRE_RIDGE');
    return [
      origin[0] + quarter.localPosition[0],
      origin[2] + quarter.localPosition[2],
    ];
  }),
  [
    [20, 56],
    [42, 56],
  ],
  'Both Ridge residential quarters must remain on their registered north-ridge parcels',
);
const ridgeMetroArrival = getContinuousWorldMetroArrival('MTR-H01');
assert.ok(ridgeMetroArrival, 'Ridge Gate metro must remain registered');
assert.ok(
  LEGACY_RIDGE_RESIDENTIAL_QUARTER_SPECS.every((quarter) => {
    const origin = getLegacyDistrictContentOrigin('MILLIONAIRE_RIDGE');
    const center = [
      origin[0] + quarter.localPosition[0],
      origin[2] + quarter.localPosition[2],
    ];
    return METRO_HUBS.some(
      (hub) =>
        Math.hypot(hub.position[0] - center[0], hub.position[1] - center[1]) <=
        20,
    );
  }),
  'Every detailed Ridge quarter must remain inside a metro catchment',
);
assert.ok(
  !CONTINUOUS_WORLD_LEGACY_BLOCKERS.some(
    (blocker) =>
      blocker.district === 'MILLIONAIRE_RIDGE' &&
      ((blocker.center[0] === 18 && blocker.center[1] === -11) ||
        (blocker.center[0] === 78 && blocker.center[1] === -11)) &&
      blocker.halfExtents[0] === 5 &&
      blocker.halfExtents[1] === 7.5,
  ),
  'The two former whole-quarter Ridge blockers must not survive',
);

assert.equal(
  CONTINUOUS_WORLD_MEASURED_CBD_BLOCKERS.length,
  8,
  'CBD lawns, parking and pool plots must be replaced by eight measured building envelopes',
);
for (const blocker of CONTINUOUS_WORLD_LEGACY_BLOCKERS.filter((candidate) =>
  Number.isFinite(candidate.height),
)) {
  const terrain = getWorldFootprintElevationRange(
    blocker.center,
    blocker.halfExtents,
    blocker.rotationRadians ?? 0,
    9,
  );
  const base = blocker.baseElevation ?? 0;
  const ridgeVillaId = blocker.id.startsWith('MILLIONAIRE_RIDGE-BUILDING-')
    ? `BLD-${blocker.id.slice('MILLIONAIRE_RIDGE-BUILDING-'.length)}`
    : undefined;
  const foundationLift = ridgeVillaId
    ? (LEGACY_RIDGE_VILLA_FOUNDATION_Y[ridgeVillaId] ?? 0)
    : 0;
  assert.ok(
    terrain.maximum <= base + foundationLift + 0.18,
    `${blocker.id} base ${base} must clear terrain maximum ${terrain.maximum}`,
  );
  assert.ok(
    base + blocker.height >= terrain.maximum + 0.35,
    `${blocker.id} roof must remain visibly above its complete terrain footprint`,
  );
}

for (const solid of WORLD_SOLID_FOOTPRINTS) {
  assertPointInBounds(solid.id, solid.center);
  assert.ok(solid.halfExtents[0] > 0 && solid.halfExtents[1] > 0);
  assert.ok(solid.height > 0, `${solid.id} must have a positive height`);
  assert.ok(
    isWorldPointBlockedBySolidGeometry(solid.center, 0),
    `${solid.id} render footprint must have a matching collider`,
  );
}

for (let left = 0; left < WORLD_SOLID_FOOTPRINTS.length; left += 1) {
  for (
    let right = left + 1;
    right < WORLD_SOLID_FOOTPRINTS.length;
    right += 1
  ) {
    assert.ok(
      !overlaps(WORLD_SOLID_FOOTPRINTS[left], WORLD_SOLID_FOOTPRINTS[right]),
      `${WORLD_SOLID_FOOTPRINTS[left].id} overlaps ${WORLD_SOLID_FOOTPRINTS[right].id}`,
    );
  }
}

const roadFootprints = ROAD_CONNECTORS.flatMap((road) =>
  road.points.slice(0, -1).map((from, index) => {
    const to = road.points[index + 1];
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    return {
      id: `${road.id}:${index + 1}`,
      center: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2],
      halfExtents: [
        getRoadRenderWidth(road) / 2 + WORLD_ROAD_OUTER_MARGIN,
        Math.hypot(dx, dz) / 2,
      ],
      rotationRadians: Math.atan2(dx, dz),
    };
  }),
);

const metroEntranceFootprints = METRO_HUBS.map((hub) => {
  const arrival = getContinuousWorldMetroArrival(hub.id);
  assert.ok(arrival, `${hub.id} must resolve to a physical metro arrival`);
  const entrance = getContinuousWorldMetroEntrancePosition(arrival);
  const entranceEnvelopeOffset = 1.375;
  return {
    id: `${hub.id}-ENTRANCE-A`,
    center: [
      entrance[0] + Math.sin(arrival.heading) * entranceEnvelopeOffset,
      entrance[2] + Math.cos(arrival.heading) * entranceEnvelopeOffset,
    ],
    halfExtents: [1.55, 1.475],
    rotationRadians: arrival.heading,
  };
});

const metropolitanResidentialPrefixes =
  METROPOLITAN_RESIDENTIAL_QUARTER_COLLISION_SPECS.map(
    (quarter) => `${quarter.id}-BUILDING-`,
  );
const nonResidentialLegacyBlockers = CONTINUOUS_WORLD_LEGACY_BLOCKERS.filter(
  (blocker) =>
    !metropolitanResidentialPrefixes.some((prefix) =>
      blocker.id.startsWith(prefix),
    ),
);
const originalResidentialPlacementObstacles = [
  ...nonResidentialLegacyBlockers,
  ...WORLD_SOLID_FOOTPRINTS,
  ...roadFootprints,
  ...metroEntranceFootprints,
];

const residentialPlacementObstacles = [
  ...nonResidentialLegacyBlockers,
  ...WORLD_SOLID_FOOTPRINTS,
  ...CONTINUOUS_WORLD_ROAD_RENDER_BAND_BLOCKERS,
  ...metroEntranceFootprints,
];

const originalResidentialConflicts = Object.fromEntries(
  METROPOLITAN_RESIDENTIAL_QUARTER_COLLISION_SPECS.map((quarter) => {
    const originalBlockers = transformBuildingSitesToWorldBlockers({
      idPrefix: `${quarter.id}-BUILDING`,
      district: 'CBD',
      sites: createResidentialQuarterPlan(quarter.plan).sites,
      transform: {
        position: quarter.renderParentPosition,
        uniformScale: quarter.uniformScale,
      },
    });
    const conflicts = [];
    for (const blocker of originalBlockers) {
      for (const obstacle of originalResidentialPlacementObstacles) {
        if (overlaps(blocker, obstacle))
          conflicts.push(`${blocker.id} × ${obstacle.id}`);
      }
    }
    return [quarter.id, conflicts];
  }),
);
assert.ok(
  Object.values(originalResidentialConflicts).some(
    (conflicts) => conflicts.length > 0,
  ),
  'The pre-relocation baseline must retain conflicts that justify the registered parcel moves',
);

const relocatedResidentialConflicts = [];
for (const blocker of METROPOLITAN_RESIDENTIAL_BUILDING_BLOCKERS) {
  assertPointInBounds(blocker.id, blocker.center);
  for (const obstacle of residentialPlacementObstacles) {
    if (overlaps(blocker, obstacle, 0.18))
      relocatedResidentialConflicts.push(`${blocker.id} × ${obstacle.id}`);
  }
  for (const craft of WORLD_WATERCRAFT_FOOTPRINTS) {
    if (overlaps(blocker, craft, 0.3))
      relocatedResidentialConflicts.push(`${blocker.id} × ${craft.id}`);
  }
  for (const point of sampleFootprint(blocker)) {
    assertPointInBounds(`${blocker.id} footprint`, point);
    const river = distanceToGrandRiver(point);
    assert.ok(
      river.distance > river.halfWidth + 0.18,
      `${blocker.id} must not occupy the raw Grand River channel`,
    );
    assert.equal(
      isPointInRenderedOceanMask(point),
      false,
      `${blocker.id} must not occupy the rendered ocean`,
    );
    assert.equal(
      isWorldPointInWater(point),
      false,
      `${blocker.id} must not occupy any rendered water`,
    );
  }
}
for (
  let left = 0;
  left < METROPOLITAN_RESIDENTIAL_BUILDING_BLOCKERS.length;
  left += 1
) {
  for (
    let right = left + 1;
    right < METROPOLITAN_RESIDENTIAL_BUILDING_BLOCKERS.length;
    right += 1
  ) {
    if (
      overlaps(
        METROPOLITAN_RESIDENTIAL_BUILDING_BLOCKERS[left],
        METROPOLITAN_RESIDENTIAL_BUILDING_BLOCKERS[right],
      )
    )
      relocatedResidentialConflicts.push(
        `${METROPOLITAN_RESIDENTIAL_BUILDING_BLOCKERS[left].id} × ${METROPOLITAN_RESIDENTIAL_BUILDING_BLOCKERS[right].id}`,
      );
  }
}
assert.deepEqual(
  relocatedResidentialConflicts,
  [],
  `Relocated residential architecture must be disjoint from all roads, water, metro entrances, named and legacy solids: ${relocatedResidentialConflicts.join(', ')}`,
);

const legacyRoadConflicts = [];
for (const building of CONTINUOUS_WORLD_LEGACY_ARCHITECTURE_BLOCKERS) {
  for (const road of CONTINUOUS_WORLD_ROAD_RENDER_BAND_BLOCKERS) {
    if (overlaps(building, road))
      legacyRoadConflicts.push(`${building.id} × ${road.id}`);
  }
}
assert.deepEqual(
  legacyRoadConflicts,
  [],
  `Visible global road bands must be clipped around legacy architecture: ${legacyRoadConflicts.join(', ')}`,
);

const legacyArchitectureConflicts = [];
for (
  let left = 0;
  left < CONTINUOUS_WORLD_LEGACY_ARCHITECTURE_BLOCKERS.length;
  left += 1
) {
  for (
    let right = left + 1;
    right < CONTINUOUS_WORLD_LEGACY_ARCHITECTURE_BLOCKERS.length;
    right += 1
  ) {
    const leftBuilding = CONTINUOUS_WORLD_LEGACY_ARCHITECTURE_BLOCKERS[left];
    const rightBuilding = CONTINUOUS_WORLD_LEGACY_ARCHITECTURE_BLOCKERS[right];
    if (overlaps(leftBuilding, rightBuilding))
      legacyArchitectureConflicts.push(
        `${leftBuilding.id} × ${rightBuilding.id}`,
      );
  }
}
assert.deepEqual(
  legacyArchitectureConflicts,
  [],
  `Authored legacy buildings must be pairwise disjoint: ${legacyArchitectureConflicts.join(', ')}`,
);

const legacyNamedArchitectureConflicts = [];
for (const legacy of CONTINUOUS_WORLD_LEGACY_ARCHITECTURE_BLOCKERS) {
  for (const named of WORLD_SOLID_FOOTPRINTS) {
    if (overlaps(legacy, named, 0.18))
      legacyNamedArchitectureConflicts.push(`${legacy.id} × ${named.id}`);
  }
}
assert.deepEqual(
  legacyNamedArchitectureConflicts,
  [],
  `Legacy buildings must remain clear of every named solid: ${legacyNamedArchitectureConflicts.join(', ')}`,
);

const solidRoadOverlaps = [];
for (const solid of WORLD_SOLID_FOOTPRINTS) {
  for (const road of CONTINUOUS_WORLD_ROAD_RENDER_BAND_BLOCKERS) {
    if (overlaps(solid, road, 0.18))
      solidRoadOverlaps.push(`${solid.id} × ${road.id}`);
  }
}
assert.deepEqual(
  solidRoadOverlaps,
  [],
  `Named architecture must not overlap road, sidewalk or cycleway corridors: ${solidRoadOverlaps.join(', ')}`,
);

const roadsideTreeArchitectureOverlaps = [];
for (const tree of CONTINUOUS_WORLD_ROADSIDE_TREE_FOOTPRINTS) {
  for (const architecture of [
    ...CONTINUOUS_WORLD_LEGACY_ARCHITECTURE_BLOCKERS,
    ...WORLD_SOLID_FOOTPRINTS,
  ]) {
    if (overlaps(tree, architecture))
      roadsideTreeArchitectureOverlaps.push(`${tree.id} × ${architecture.id}`);
  }
}
assert.deepEqual(
  roadsideTreeArchitectureOverlaps,
  [],
  `Roadside tree crowns must be skipped at every authored building envelope: ${roadsideTreeArchitectureOverlaps.join(', ')}`,
);

const watercraftRoadOverlaps = [];
for (const craft of WORLD_WATERCRAFT_FOOTPRINTS) {
  assertPointInBounds(craft.id, craft.center);
  assert.ok(
    getWorldWatercraftAtXZ(craft.center[0], craft.center[1]),
    `${craft.id} must resolve through the shared watercraft registry`,
  );
  assert.equal(
    canTraverseContinuousWorld(craft.center),
    false,
    `${craft.id} hull must stop the avatar`,
  );
  assert.equal(
    isWorldCameraPointOccluded({
      x: craft.center[0],
      y: (craft.minimumY + craft.maximumY) / 2,
      z: craft.center[1],
    }),
    true,
    `${craft.id} hull must stop the trailing camera`,
  );
  assert.equal(
    isWorldCameraPointOccluded({
      x: craft.center[0],
      y: craft.maximumY + 0.8,
      z: craft.center[1],
    }),
    false,
    `${craft.id} must stop occluding above its superstructure`,
  );
  const angle = craft.rotationRadians;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  for (const [localX, localZ] of [
    [0, 0],
    [craft.halfExtents[0], craft.halfExtents[1]],
    [craft.halfExtents[0], -craft.halfExtents[1]],
    [-craft.halfExtents[0], craft.halfExtents[1]],
    [-craft.halfExtents[0], -craft.halfExtents[1]],
  ]) {
    const point = [
      craft.center[0] + cosine * localX + sine * localZ,
      craft.center[1] - sine * localX + cosine * localZ,
    ];
    assertPointInBounds(`${craft.id} hull corner`, point);
    assert.ok(
      isWorldPointInWater(point),
      `${craft.id} complete hull must remain over visible navigable water`,
    );
  }
  for (const road of CONTINUOUS_WORLD_ROAD_RENDER_BAND_BLOCKERS) {
    if (overlaps(craft, road, 0.18))
      watercraftRoadOverlaps.push(`${craft.id} × ${road.id}`);
  }
}
assert.deepEqual(
  watercraftRoadOverlaps,
  [],
  `Watercraft must never occupy a road, sidewalk or cycleway envelope: ${watercraftRoadOverlaps.join(', ')}`,
);
const watercraftArchitectureOverlaps = [];
for (const craft of WORLD_WATERCRAFT_FOOTPRINTS) {
  for (const solid of WORLD_SOLID_FOOTPRINTS) {
    if (overlaps(craft, solid, 0.3))
      watercraftArchitectureOverlaps.push(`${craft.id} × ${solid.id}`);
  }
  for (const blocker of CONTINUOUS_WORLD_LEGACY_BLOCKERS) {
    if (overlaps(craft, blocker, 0.3))
      watercraftArchitectureOverlaps.push(`${craft.id} × ${blocker.id}`);
  }
}
assert.deepEqual(
  watercraftArchitectureOverlaps,
  [],
  `Watercraft must remain clear of every building footprint: ${watercraftArchitectureOverlaps.join(', ')}`,
);
for (let left = 0; left < WORLD_WATERCRAFT_FOOTPRINTS.length; left += 1) {
  for (
    let right = left + 1;
    right < WORLD_WATERCRAFT_FOOTPRINTS.length;
    right += 1
  ) {
    assert.ok(
      !overlaps(
        WORLD_WATERCRAFT_FOOTPRINTS[left],
        WORLD_WATERCRAFT_FOOTPRINTS[right],
        0.3,
      ),
      `${WORLD_WATERCRAFT_FOOTPRINTS[left].id} overlaps ${WORLD_WATERCRAFT_FOOTPRINTS[right].id}`,
    );
  }
}
assert.equal(
  getWorldWatercraftAtXZ(-58, 12.4),
  undefined,
  'The reported West Harbor camera path must remain clear of every vessel',
);

for (const point of [
  [-60, -6],
  [-47, 0],
]) {
  assert.equal(
    isPointInRenderedOceanMask(point),
    false,
    `${point.join(',')} must be rendered as continuous-world land`,
  );
  assert.equal(
    isWorldPointInWater(point),
    false,
    `${point.join(',')} must not retain an invisible legacy marina water mask`,
  );
  assert.equal(
    isWorldPointOnWalkableDeck(point),
    false,
    `${point.join(',')} must not retain an invisible legacy marina deck`,
  );
}

const proceduralSolids = getContinuousWorldProceduralSolids().map(
  (building) => ({
    id: building.id,
    center: [building.position[0], building.position[2]],
    halfExtents: [building.scale[0] / 2, building.scale[2] / 2],
    rotationRadians: building.rotationY,
  }),
);
assertUniqueIds('Procedural building', proceduralSolids);
const proceduralLegacyOverlaps = [];
for (const procedural of proceduralSolids) {
  for (const legacy of CONTINUOUS_WORLD_LEGACY_BLOCKERS) {
    if (overlaps(procedural, legacy, 0.6))
      proceduralLegacyOverlaps.push(`${procedural.id} × ${legacy.id}`);
  }
}
assert.deepEqual(
  proceduralLegacyOverlaps,
  [],
  `Procedural massing must not overlap legacy architecture: ${proceduralLegacyOverlaps.join(', ')}`,
);
const proceduralSelfOverlaps = [];
for (let left = 0; left < proceduralSolids.length; left += 1) {
  for (let right = left + 1; right < proceduralSolids.length; right += 1) {
    if (overlaps(proceduralSolids[left], proceduralSolids[right], 0.6))
      proceduralSelfOverlaps.push(
        `${proceduralSolids[left].id} × ${proceduralSolids[right].id}`,
      );
  }
}
assert.deepEqual(
  proceduralSelfOverlaps,
  [],
  `Procedural massing must remain clear across overlapping sectors: ${proceduralSelfOverlaps.join(', ')}`,
);

for (const { point, sectorId } of [
  { point: [21.9, -30], sectorId: 'CBD_CORE' },
  { point: [-44.1, -73], sectorId: 'WATERFRONT_MARINA' },
]) {
  assert.ok(
    getVisibleContinuousWorldSectors(point).some(
      ({ sector, lod }) => sector.id === sectorId && lod === 'DETAIL',
    ),
    `${sectorId} legacy solids near ${point.join(',')} must have matching detailed visuals streamed in`,
  );
}

const legacySectorByDistrict = {
  CBD: 'CBD_CORE',
  AZURE_YACHT_MARINA: 'WATERFRONT_MARINA',
  CROWN_RESIDENTIAL_TOWERS: 'CROWN_RESIDENTIAL',
  MILLIONAIRE_RIDGE: 'MIDSLOPE_VILLAS',
};
for (const blocker of CONTINUOUS_WORLD_LEGACY_BLOCKERS) {
  const sectorId = legacySectorByDistrict[blocker.district];
  if (!sectorId) continue;
  const sector = WORLD_SECTORS.find((candidate) => candidate.id === sectorId);
  assert.ok(sector);
  assert.equal(
    getContinuousWorldSectorLod(blocker.center, sector),
    'DETAIL',
    `${blocker.id} must stream its matching detailed legacy architecture before collision`,
  );
}

function segmentFootprint(id, from, to, halfWidth) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  return {
    id,
    center: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2],
    halfExtents: [halfWidth, Math.hypot(dx, dz) / 2],
    rotationRadians: Math.atan2(dx, dz),
  };
}

const circuitFootprints = F1_CIRCUIT_POINTS.slice(0, -1).map((from, index) =>
  segmentFootprint(`F1:${index + 1}`, from, F1_CIRCUIT_POINTS[index + 1], 3.9),
);
const pitLaneFootprints = [
  segmentFootprint(
    'PIT:ENTRY',
    F1_PIT_LANE_POINTS[0],
    F1_PIT_LANE_POINTS[1],
    0.9,
  ),
  segmentFootprint(
    'PIT:LANE',
    F1_PIT_LANE_POINTS[1],
    F1_PIT_LANE_POINTS[2],
    1.6,
  ),
  segmentFootprint(
    'PIT:EXIT',
    F1_PIT_LANE_POINTS[2],
    F1_PIT_LANE_POINTS[3],
    0.9,
  ),
];
const motorsportSolids = WORLD_SOLID_FOOTPRINTS.filter(
  (solid) => solid.kind === 'MOTORSPORT',
);
const motorsportOverlaps = [];
for (const solid of motorsportSolids) {
  for (const route of [...circuitFootprints, ...pitLaneFootprints]) {
    if (overlaps(solid, route, 0.12))
      motorsportOverlaps.push(`${solid.id} × ${route.id}`);
  }
}
assert.deepEqual(
  motorsportOverlaps,
  [],
  `Circuit buildings must remain clear of track, curb, barrier and pit-lane envelopes: ${motorsportOverlaps.join(', ')}`,
);
for (const point of F1_CIRCUIT_POINTS) {
  assert.ok(
    point[0] + 4 <= CONTINUOUS_WORLD_BOUNDS.maxX &&
      point[0] - 4 >= CONTINUOUS_WORLD_BOUNDS.minX &&
      point[1] + 4 <= CONTINUOUS_WORLD_BOUNDS.maxZ &&
      point[1] - 4 >= CONTINUOUS_WORLD_BOUNDS.minZ,
    'The complete Grand Prix safety envelope must remain inside world bounds',
  );
}

for (const tower of STARTER_TOWER_SPECS) {
  assert.ok(
    canTraverseContinuousWorld(tower.door),
    `${tower.id} must have a walkable exterior portal landing`,
  );
}

const homeTowers = STARTER_TOWER_SPECS.filter((tower) => tower.home);
assert.equal(
  homeTowers.length,
  1,
  'Exactly one starter tower is the player home',
);

const procedural = getContinuousWorldProceduralSolids();
assertUniqueIds('Procedural building', procedural);
for (const building of procedural) {
  const point = [building.position[0], building.position[2]];
  assertPointInBounds(building.id, point);
  assert.ok(
    !isPointInReservedWorldSite(point),
    `${building.id} intrudes into a named project reservation`,
  );
}

assert.deepEqual(
  F1_CIRCUIT_POINTS[0],
  F1_CIRCUIT_POINTS.at(-1),
  'Grand Prix circuit must be a closed loop',
);
assert.ok(
  isWorldPointOnWalkableDeck([-120, -84]),
  'Ocean Crown terminal must have a registered walkable pier',
);
assert.ok(
  !isWorldPointOnWalkableDeck([-140, -80]),
  'Ocean Crown collision deck must follow the circular island instead of a square water mask',
);
assert.ok(F1_CIRCUIT_POINTS.length >= 9, 'Circuit needs a varied racing line');

const oceanTerminal = METRO_STATION_REGISTRY.find(
  (station) => station.id === 'M14',
);
assert.ok(oceanTerminal, 'Ocean Crown must have a stable public metro code');
assert.deepEqual(
  OCEAN_SKYRAIL_ROUTE.at(-1),
  oceanTerminal.arrival,
  'Elevated rail must terminate at the registered Ocean Crown station',
);

const summitStart = SUMMIT_SCENIC_ROUTE[0];
const summitEnd = SUMMIT_SCENIC_ROUTE.at(-1);
assert.ok(
  getWorldGroundElevation(summitEnd[0], summitEnd[1]) >
    getWorldGroundElevation(summitStart[0], summitStart[1]) + 6,
  'Summit road must produce a material low-to-high elevation change',
);

assert.ok(
  canTraverseContinuousWorld([98, -16]),
  'Apex Motors customer parking court must remain walkable',
);
assert.equal(
  NAMED_WORLD_SOLIDS.filter((solid) => solid.kind === 'AUTOMOTIVE').length,
  2,
  'Apex Motors campus must separate showroom and service-hall solids',
);

const apexCampus = WORLD_SITE_RESERVATIONS.find(
  (site) => site.id === 'SITE-APEX-MOTORS',
);
const apexShowroom = NAMED_WORLD_SOLIDS.find(
  (solid) => solid.id === 'AUTO-APEX-SHOWROOM',
);
assert.ok(apexCampus && apexShowroom);
const apexTerrain = getWorldFootprintElevationRange(
  apexCampus.center,
  [14.2, 10.1],
  0,
  9,
);
assert.ok(
  getWorldSurfaceElevationXZ(apexCampus.center[0], apexCampus.center[1]) >=
    apexTerrain.maximum,
  'Apex Motors platform must clear every sampled terrain point',
);

for (const solid of NAMED_WORLD_SOLIDS.filter(
  (candidate) => candidate.baseElevation !== undefined,
)) {
  const base = solid.baseElevation;
  assert.equal(
    isWorldCameraPointOccluded({
      x: solid.center[0],
      y: base + 0.1,
      z: solid.center[1],
    }),
    true,
    `${solid.id} must occlude the camera immediately above its real base`,
  );
  assert.equal(
    isWorldCameraPointOccluded({
      x: solid.center[0],
      y: base + solid.height - 0.1,
      z: solid.center[1],
    }),
    true,
    `${solid.id} must occlude the camera below its roof`,
  );
  assert.equal(
    isWorldCameraPointOccluded({
      x: solid.center[0],
      y: base + solid.height + 0.7,
      z: solid.center[1],
    }),
    false,
    `${solid.id} must stop occluding above its roof`,
  );
}

const oceanRamp = WORLD_SURFACE_RAMPS.find(
  (ramp) => ramp.id === 'SURFACE-OCEAN-CROWN-TERMINAL-RAMP',
);
assert.ok(oceanRamp);
let previousRampElevation = Number.NEGATIVE_INFINITY;
for (let step = 0; step <= 12; step += 1) {
  const progress = step / 12;
  const x =
    oceanRamp.from[0] + (oceanRamp.to[0] - oceanRamp.from[0]) * progress;
  const z =
    oceanRamp.from[1] + (oceanRamp.to[1] - oceanRamp.from[1]) * progress;
  const elevation = getWorldSurfaceElevationXZ(x, z);
  assert.ok(
    elevation >= previousRampElevation - 0.0001,
    'Ocean Crown terminal ramp must rise monotonically',
  );
  assert.ok(
    canTraverseContinuousWorld([x, z]),
    'Every sampled point on the Ocean Crown terminal ramp must be walkable',
  );
  previousRampElevation = elevation;
}
assert.ok(
  previousRampElevation >= oceanRamp.endElevation,
  'Ocean Crown terminal surface must reach the elevated station floor',
);

for (const ramp of WORLD_SURFACE_RAMPS) {
  let previousPoint = ramp.from;
  for (let step = 1; step <= 32; step += 1) {
    const progress = step / 32;
    const point = [
      ramp.from[0] + (ramp.to[0] - ramp.from[0]) * progress,
      ramp.from[1] + (ramp.to[1] - ramp.from[1]) * progress,
    ];
    assert.ok(
      canTraverseContinuousWorld(point),
      `${ramp.id} must remain walkable along its full centreline`,
    );
    assert.ok(
      canStepBetweenContinuousWorldPoints(previousPoint, point),
      `${ramp.id} must not exceed the avatar step height`,
    );
    previousPoint = point;
  }
}

let guardedTerraceEdges = 0;
for (const surface of WORLD_SURFACE_PLATEAUS.filter((candidate) =>
  candidate.id.startsWith('SURFACE-VIL-'),
)) {
  const angle = surface.rotationRadians ?? 0;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  for (const [localX, localZ, outwardX, outwardZ] of [
    [surface.halfExtents[0], 0, 1, 0],
    [-surface.halfExtents[0], 0, -1, 0],
    [0, surface.halfExtents[1], 0, 1],
    [0, -surface.halfExtents[1], 0, -1],
  ]) {
    const edgeX = surface.center[0] + localX * cosine + localZ * sine;
    const edgeZ = surface.center[1] - localX * sine + localZ * cosine;
    const worldOutwardX = outwardX * cosine + outwardZ * sine;
    const worldOutwardZ = -outwardX * sine + outwardZ * cosine;
    const outside = [
      edgeX + worldOutwardX * 0.12,
      edgeZ + worldOutwardZ * 0.12,
    ];
    const inside = [edgeX - worldOutwardX * 0.12, edgeZ - worldOutwardZ * 0.12];
    const elevationDelta = Math.abs(
      getWorldSurfaceElevationXZ(inside[0], inside[1]) -
        getWorldSurfaceElevationXZ(outside[0], outside[1]),
    );
    if (elevationDelta > MAX_CONTINUOUS_WORLD_STEP) {
      guardedTerraceEdges += 1;
      assert.equal(
        canStepBetweenContinuousWorldPoints(outside, inside),
        false,
        `${surface.id} retaining edge must behave as a wall, not a vertical teleport`,
      );
    }
  }
}
assert.ok(
  guardedTerraceEdges > 0,
  'The test plan must exercise at least one elevated retaining edge',
);

assert.ok(
  F1_CIRCUIT_POINTS.some(
    (point) =>
      point[0] === F1_PIT_LANE_POINTS[0][0] &&
      point[1] === F1_PIT_LANE_POINTS[0][1],
  ),
  'Pit entry must begin on a registered main-circuit vertex',
);
assert.ok(
  F1_CIRCUIT_POINTS.some(
    (point) =>
      point[0] === F1_PIT_LANE_POINTS.at(-1)[0] &&
      point[1] === F1_PIT_LANE_POINTS.at(-1)[1],
  ),
  'Pit exit must rejoin a registered main-circuit vertex',
);

// Golden City is a planning-space contract in real metres. Keep these checks
// beside the legacy assertions so no future edit can silently reinterpret or
// stretch the existing compressed R3F world.
assert.equal(
  GOLDEN_CITY_BOUNDS.maxXMeters - GOLDEN_CITY_BOUNDS.minXMeters,
  GOLDEN_CITY_SIZE_METERS,
  'Golden City must be exactly 2 km wide',
);
assert.equal(
  GOLDEN_CITY_BOUNDS.maxZMeters - GOLDEN_CITY_BOUNDS.minZMeters,
  GOLDEN_CITY_SIZE_METERS,
  'Golden City must be exactly 2 km deep',
);
assert.equal(
  GOLDEN_CITY_SIZE_METERS * GOLDEN_CITY_SIZE_METERS,
  4_000_000,
  'Golden City must cover four square kilometres',
);
assert.equal(GOLDEN_CITY_GRID_DIMENSION, 8);
assert.equal(GOLDEN_CITY_PARCEL_COUNT, 64);
assert.equal(GOLDEN_CITY_PARCELS.length, GOLDEN_CITY_PARCEL_COUNT);
assertUniqueIds('Golden City parcel', GOLDEN_CITY_PARCELS);

const oppositeDirection = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east',
};
let directedGoldenCityNeighborCount = 0;
let goldenCityParcelArea = 0;
for (const parcel of GOLDEN_CITY_PARCELS) {
  assert.equal(parcel.id, `GC-X${parcel.column}-Z${parcel.row}`);
  assert.equal(
    parcel.bounds.maxXMeters - parcel.bounds.minXMeters,
    GOLDEN_CITY_PARCEL_SIZE_METERS,
    `${parcel.id} must be 250 m wide`,
  );
  assert.equal(
    parcel.bounds.maxZMeters - parcel.bounds.minZMeters,
    GOLDEN_CITY_PARCEL_SIZE_METERS,
    `${parcel.id} must be 250 m deep`,
  );
  goldenCityParcelArea +=
    (parcel.bounds.maxXMeters - parcel.bounds.minXMeters) *
    (parcel.bounds.maxZMeters - parcel.bounds.minZMeters);
  assert.equal(
    getGoldenCityParcelAtWorldMeters(parcel.center)?.id,
    parcel.id,
    `${parcel.id} center must resolve to itself`,
  );

  const neighbors = Object.entries(parcel.neighbors).filter(
    ([, neighborId]) => neighborId !== null,
  );
  const isCorner =
    (parcel.column === 0 || parcel.column === 7) &&
    (parcel.row === 0 || parcel.row === 7);
  const isEdge =
    parcel.column === 0 ||
    parcel.column === 7 ||
    parcel.row === 0 ||
    parcel.row === 7;
  assert.equal(
    neighbors.length,
    isCorner ? 2 : isEdge ? 3 : 4,
    `${parcel.id} must have the correct orthogonal neighbor count`,
  );

  for (const [direction, neighborId] of neighbors) {
    directedGoldenCityNeighborCount += 1;
    const neighbor = getGoldenCityParcelById(neighborId);
    assert.ok(neighbor, `${parcel.id} neighbor ${neighborId} must exist`);
    assert.equal(
      neighbor.neighbors[oppositeDirection[direction]],
      parcel.id,
      `${parcel.id} and ${neighborId} must reference each other`,
    );
    if (direction === 'north')
      assert.equal(parcel.bounds.maxZMeters, neighbor.bounds.minZMeters);
    if (direction === 'east')
      assert.equal(parcel.bounds.maxXMeters, neighbor.bounds.minXMeters);
    if (direction === 'south')
      assert.equal(parcel.bounds.minZMeters, neighbor.bounds.maxZMeters);
    if (direction === 'west')
      assert.equal(parcel.bounds.minXMeters, neighbor.bounds.maxXMeters);
  }
}
assert.equal(goldenCityParcelArea, 4_000_000);
assert.equal(directedGoldenCityNeighborCount, 224);
assert.equal(directedGoldenCityNeighborCount / 2, 112);

assert.equal(
  getGoldenCityParcelAtWorldMeters(worldMetersPoint(-1_000, -1_000))?.id,
  'GC-X0-Z0',
);
assert.equal(
  getGoldenCityParcelAtWorldMeters(worldMetersPoint(0, 0))?.id,
  'GC-X4-Z4',
);
assert.equal(
  getGoldenCityParcelAtWorldMeters(worldMetersPoint(999.999, 999.999))?.id,
  'GC-X7-Z7',
);

for (
  let seamIndex = 1;
  seamIndex < GOLDEN_CITY_GRID_DIMENSION;
  seamIndex += 1
) {
  const seam =
    GOLDEN_CITY_BOUNDS.minXMeters + seamIndex * GOLDEN_CITY_PARCEL_SIZE_METERS;
  const epsilon = 0.001;
  assert.equal(
    getGoldenCityParcelAtWorldMeters(worldMetersPoint(seam - epsilon, -875))
      ?.column,
    seamIndex - 1,
  );
  assert.equal(
    getGoldenCityParcelAtWorldMeters(worldMetersPoint(seam, -875))?.column,
    seamIndex,
  );
  assert.equal(
    getGoldenCityParcelAtWorldMeters(worldMetersPoint(seam + epsilon, -875))
      ?.column,
    seamIndex,
  );
  assert.equal(
    getGoldenCityParcelAtWorldMeters(worldMetersPoint(-875, seam - epsilon))
      ?.row,
    seamIndex - 1,
  );
  assert.equal(
    getGoldenCityParcelAtWorldMeters(worldMetersPoint(-875, seam))?.row,
    seamIndex,
  );
  assert.equal(
    getGoldenCityParcelAtWorldMeters(worldMetersPoint(-875, seam + epsilon))
      ?.row,
    seamIndex,
  );
}

for (const point of [
  worldMetersPoint(-1_000.001, 0),
  worldMetersPoint(1_000, 0),
  worldMetersPoint(0, -1_000.001),
  worldMetersPoint(0, 1_000),
  worldMetersPoint(Number.NaN, 0),
  worldMetersPoint(0, Number.POSITIVE_INFINITY),
  worldMetersPoint(Number.NEGATIVE_INFINITY, 0),
]) {
  assert.equal(getGoldenCityParcelAtWorldMeters(point), null);
}

assert.equal(
  CONTINUOUS_WORLD_BOUNDS.maxX - CONTINUOUS_WORLD_BOUNDS.minX,
  320,
  'Legacy render bounds must remain 320 engine units wide during planning',
);
assert.equal(
  CONTINUOUS_WORLD_BOUNDS.maxZ - CONTINUOUS_WORLD_BOUNDS.minZ,
  205,
  'Legacy render bounds must remain 205 engine units deep during planning',
);
assert.equal(
  METERS_PER_WORLD_UNIT,
  40,
  'The legacy 40 m/unit compression must remain explicit until migration',
);

console.log(
  `World-plan invariants passed: ${WORLD_SOLID_FOOTPRINTS.length} named solids, ${procedural.length} registered filler buildings, 15 metro stations, a closed circuit, a continuous summit climb and ${GOLDEN_CITY_PARCELS.length} Golden City planning parcels.`,
);
