import assert from 'node:assert/strict';
import {
  CONTINUOUS_WORLD_BOUNDS,
  canTraverseContinuousWorld,
  getContinuousWorldMetroArrival,
} from '../app/continuous-world.tsx';
import {
  METRO_HUBS,
  METRO_STATION_REGISTRY,
  WORLD_SECTORS,
  metroHubById,
} from '../app/world-topology.ts';

const expectedCodes = Array.from({ length: 14 }, (_, index) => `M${index}`);
assert.deepEqual(
  METRO_STATION_REGISTRY.map((station) => station.id),
  expectedCodes,
  'Public station codes must remain the explicit M0–M13 sequence',
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
  assert.deepEqual(
    arrival?.position,
    [station.arrival[0], 0.12, station.arrival[1]],
  );
}

console.log('Metro network invariants passed: 14 stable, walkable stations.');
