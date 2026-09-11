import assert from 'node:assert/strict';
import {
  CONTINUOUS_WORLD_BOUNDS,
  CONTINUOUS_WORLD_LEGACY_BLOCKERS,
  MAX_CONTINUOUS_WORLD_STEP,
  canStepBetweenContinuousWorldPoints,
  canTraverseContinuousWorld,
  getContinuousWorldProceduralSolids,
  getContinuousWorldSectorLod,
  getRoadRenderWidth,
  getWorldSurfaceElevationXZ,
  getVisibleContinuousWorldSectors,
  isWorldCameraPointOccluded,
  isWorldPointBlockedBySolidGeometry,
  isWorldPointOnWalkableDeck,
} from '../app/continuous-world.tsx';
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
  isPointInReservedWorldSite,
} from '../app/world-spatial-registry.ts';
import {
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

function overlaps(a, b, clearance = 0.02) {
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

assertUniqueIds('Sector', WORLD_SECTORS);
assertUniqueIds('Metro hub', METRO_HUBS);
assertUniqueIds('Metro station', METRO_STATION_REGISTRY);
assertUniqueIds('Road', ROAD_CONNECTORS);
assertUniqueIds('Reserved site', WORLD_SITE_RESERVATIONS);
assertUniqueIds('Solid building', WORLD_SOLID_FOOTPRINTS);

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
      halfExtents: [getRoadRenderWidth(road) / 2 + 1.8, Math.hypot(dx, dz) / 2],
      rotationRadians: Math.atan2(dx, dz),
    };
  }),
);
const solidRoadOverlaps = [];
for (const solid of WORLD_SOLID_FOOTPRINTS) {
  for (const road of roadFootprints) {
    if (overlaps(solid, road, 0.18))
      solidRoadOverlaps.push(`${solid.id} × ${road.id}`);
  }
}
assert.deepEqual(
  solidRoadOverlaps,
  [],
  `Named architecture must not overlap road, sidewalk or cycleway corridors: ${solidRoadOverlaps.join(', ')}`,
);

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

console.log(
  `World-plan invariants passed: ${WORLD_SOLID_FOOTPRINTS.length} named solids, ${procedural.length} registered filler buildings, 15 metro stations, a closed circuit and a continuous summit climb.`,
);
