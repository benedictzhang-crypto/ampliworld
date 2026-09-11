import assert from 'node:assert/strict';
import {
  CONTINUOUS_WORLD_BOUNDS,
  CONTINUOUS_WORLD_LEGACY_BLOCKERS,
  canStepBetweenContinuousWorldPoints,
  canTraverseContinuousWorld,
  getContinuousWorldMetroArrival,
  getContinuousWorldMetroEntrancePosition,
  getContinuousWorldProceduralSolids,
  getContinuousWorldSectorAt,
  getWorldSurfaceElevationXZ,
  isWorldCameraPointOccluded,
} from '../app/continuous-world.tsx';
import { WORLD_SOLID_FOOTPRINTS } from '../app/world-spatial-registry.ts';
import {
  METRO_HUBS,
  METRO_STATION_REGISTRY,
  WORLD_SECTORS,
  metroHubById,
} from '../app/world-topology.ts';

const expectedCodes = Array.from({ length: 15 }, (_, index) => `M${index}`);

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

function overlaps(a, b, clearance = 0.2) {
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

const permanentArchitecture = [
  ...CONTINUOUS_WORLD_LEGACY_BLOCKERS,
  ...WORLD_SOLID_FOOTPRINTS,
  ...getContinuousWorldProceduralSolids().map((building) => ({
    id: building.id,
    center: [building.position[0], building.position[2]],
    halfExtents: [building.scale[0] / 2, building.scale[2] / 2],
    rotationRadians: building.rotationY,
  })),
];
const allEntranceOverlaps = [];
assert.deepEqual(
  METRO_STATION_REGISTRY.map((station) => station.id),
  expectedCodes,
  'Public station codes must remain the explicit M0–M14 sequence',
);
assert.equal(
  new Set(METRO_STATION_REGISTRY.map((station) => station.topologyId)).size,
  METRO_HUBS.length,
  'Every topology hub must have exactly one public station code',
);
assert.equal(METRO_STATION_REGISTRY[0].topologyId, 'MTR-S01');
assert.equal(METRO_STATION_REGISTRY[2].topologyId, 'MTR-W01');
assert.equal(METRO_STATION_REGISTRY[4].topologyId, 'MTR-C01');

for (const station of METRO_STATION_REGISTRY) {
  const hub = metroHubById(station.topologyId);
  assert.ok(hub, `${station.id} references missing hub ${station.topologyId}`);
  const sector = WORLD_SECTORS.find((candidate) => candidate.id === hub.sector);
  assert.ok(sector, `${hub.id} references missing sector ${hub.sector}`);
  assert.equal(
    getContinuousWorldSectorAt(station.arrival).id,
    hub.sector,
    `${station.id}/${hub.id} arrival precinct must retain the station's sector identity`,
  );
  const [x, z] = station.arrival;
  const [minX, maxX, minZ, maxZ] = sector.bounds;
  assert.ok(
    x >= CONTINUOUS_WORLD_BOUNDS.minX &&
      x <= CONTINUOUS_WORLD_BOUNDS.maxX &&
      z >= CONTINUOUS_WORLD_BOUNDS.minZ &&
      z <= CONTINUOUS_WORLD_BOUNDS.maxZ,
    `${station.id}/${hub.id} is outside continuous-world bounds`,
  );
  assert.ok(
    x >= minX && x <= maxX && z >= minZ && z <= maxZ,
    `${station.id}/${hub.id} is outside its ${sector.id} sector`,
  );
  assert.ok(
    canTraverseContinuousWorld(station.arrival),
    `${station.id}/${hub.id} arrival is not walkable`,
  );
  const arrival = getContinuousWorldMetroArrival(hub.id);
  assert.equal(arrival?.stationCode, station.id);
  assert.deepEqual(arrival?.position, [
    station.arrival[0],
    getWorldSurfaceElevationXZ(station.arrival[0], station.arrival[1]),
    station.arrival[1],
  ]);

  const [arrivalX, arrivalY, arrivalZ] = arrival.position;
  const entrance = getContinuousWorldMetroEntrancePosition(arrival);
  // MetroEntrance is rendered at scale 0.46. This conservative envelope also
  // includes its pylon and canopy, not just the safe centre point.
  const entranceEnvelopeOffset = 1.375;
  const entranceFootprint = {
    id: `${station.id}-ENTRANCE-A`,
    center: [
      entrance[0] + Math.sin(arrival.heading) * entranceEnvelopeOffset,
      entrance[2] + Math.cos(arrival.heading) * entranceEnvelopeOffset,
    ],
    halfExtents: [1.55, 1.475],
    rotationRadians: arrival.heading,
  };
  const entranceOverlaps = permanentArchitecture.filter((building) =>
    overlaps(entranceFootprint, building),
  );
  allEntranceOverlaps.push(
    ...entranceOverlaps.map(
      (building) => `${station.id}/${hub.id} × ${building.id}`,
    ),
  );
  assert.ok(
    canTraverseContinuousWorld([entrance[0], entrance[2]]) &&
      canStepBetweenContinuousWorldPoints(station.arrival, [
        entrance[0],
        entrance[2],
      ]),
    `${station.id}/${hub.id} entrance must connect to its arrival on a walkable surface`,
  );
  assert.equal(
    entrance[1],
    getWorldSurfaceElevationXZ(entrance[0], entrance[2]),
    `${station.id}/${hub.id} entrance must sit on its rendered surface`,
  );
  assert.ok(
    Math.hypot(entrance[0] - arrivalX, entrance[2] - arrivalZ) >= 3.3,
    `${station.id}/${hub.id} entrance must not engulf the player spawn`,
  );
  for (let index = 0; index < 20; index += 1) {
    const angle = (index / 20) * Math.PI * 2;
    const point = [
      arrivalX + Math.cos(angle) * 0.8,
      arrivalZ + Math.sin(angle) * 0.8,
    ];
    assert.ok(
      canTraverseContinuousWorld(point) &&
        canStepBetweenContinuousWorldPoints(station.arrival, point),
      `${station.id}/${hub.id} must provide full standing clearance around the arrival`,
    );
  }

  const forwardX = Math.sin(arrival.heading);
  const forwardZ = Math.cos(arrival.heading);
  let previousPoint = station.arrival;
  for (let distance = 0.2; distance <= 4; distance += 0.2) {
    const point = [
      arrivalX + forwardX * distance,
      arrivalZ + forwardZ * distance,
    ];
    assert.ok(
      canTraverseContinuousWorld(point) &&
        canStepBetweenContinuousWorldPoints(previousPoint, point),
      `${station.id}/${hub.id} must open onto at least four metres of walkable approach`,
    );
    previousPoint = point;
  }

  const cameraX = arrivalX - forwardX * 5.6;
  const cameraZ = arrivalZ - forwardZ * 5.6;
  const cameraY = getWorldSurfaceElevationXZ(cameraX, cameraZ) + 3.2;
  for (let step = 1; step <= 28; step += 1) {
    const progress = step / 28;
    assert.equal(
      isWorldCameraPointOccluded({
        x: arrivalX + (cameraX - arrivalX) * progress,
        y: arrivalY + 1.7 + (cameraY - arrivalY - 1.7) * progress,
        z: arrivalZ + (cameraZ - arrivalZ) * progress,
      }),
      false,
      `${station.id}/${hub.id} arrival must keep the third-person camera sightline clear`,
    );
  }
}

assert.deepEqual(
  allEntranceOverlaps,
  [],
  `Visible metro entrance envelopes must remain clear of architecture: ${allEntranceOverlaps.join(', ')}`,
);

console.log('Metro network invariants passed: 15 stable, walkable stations.');
