import assert from 'node:assert/strict';

import {
  CONTINUOUS_WORLD_ROAD_COLLISION_SEGMENTS,
  CONTINUOUS_WORLD_ROAD_RENDER_BAND_BLOCKERS,
  CONTINUOUS_WORLD_ROAD_ROUTES,
  CONTINUOUS_WORLD_ROAD_SPANS,
  canTraverseContinuousWorld,
  isWorldCameraPointOccluded,
} from '../app/continuous-world.tsx';
import {
  createJoinedOffsetPolyline,
  createPolylineSegments,
  getCenteredSpanEnds,
  getPolylineJunctionIndices,
} from '../app/linear-infrastructure-geometry.ts';
import {
  PERSISTENT_INFRASTRUCTURE_ROUTES,
  PERSISTENT_INFRASTRUCTURE_SEGMENTS,
  PERSISTENT_INFRASTRUCTURE_DECKS,
  PERSISTENT_INFRASTRUCTURE_PIERS,
  getPersistentInfrastructurePierAtXZ,
  isPointInsidePersistentInfrastructure,
} from '../app/persistent-infrastructure-registry.ts';
import { F1_CIRCUIT_POINTS } from '../app/world-spatial-registry.ts';
import {
  BRIDGE_RAIL_SPANS,
  BRIDGE_RAIL_COLLISION_MASKS,
  F1_BARRIER_COLLISION_MASKS,
  getWorldLinearBarrierAtXZ,
  getWorldRiverBridgeDeckLength,
  pointInWorldLinearBarrierMask,
} from '../app/world-linear-collision.ts';
import { RIVER_BRIDGES, ROAD_CONNECTORS } from '../app/world-topology.ts';

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

assert.equal(
  PERSISTENT_INFRASTRUCTURE_DECKS.length,
  PERSISTENT_INFRASTRUCTURE_SEGMENTS.length,
  'Every persistent rendered segment must own one matching deck collider',
);
assert.deepEqual(
  PERSISTENT_INFRASTRUCTURE_DECKS.map((deck) => deck.segmentId),
  PERSISTENT_INFRASTRUCTURE_SEGMENTS.map((segment) => segment.id),
  'Persistent deck rendering and collision must share exact segment IDs',
);
for (const deck of PERSISTENT_INFRASTRUCTURE_DECKS.filter(
  (candidate) => candidate.kind !== 'F1_CIRCUIT',
)) {
  assert.equal(
    isPointInsidePersistentInfrastructure(
      deck.position[0],
      deck.position[1],
      deck.position[2],
      0,
    ),
    true,
    `${deck.id} visible centre must be a camera occluder`,
  );
  assert.equal(
    isWorldCameraPointOccluded({
      x: deck.position[0],
      y: deck.position[1],
      z: deck.position[2],
    }),
    true,
    `${deck.id} must participate in the live camera predicate`,
  );
  assert.equal(
    isPointInsidePersistentInfrastructure(
      deck.position[0],
      0.8,
      deck.position[2],
      0,
    ),
    false,
    `${deck.id} must preserve walkable clearance beneath its elevated deck`,
  );
}
for (const pier of PERSISTENT_INFRASTRUCTURE_PIERS) {
  assert.equal(
    getPersistentInfrastructurePierAtXZ(pier.position[0], pier.position[2], 0)
      ?.id,
    pier.id,
    `${pier.id} visible support must own its ground footprint`,
  );
  assert.equal(
    canTraverseContinuousWorld([pier.position[0], pier.position[2]]),
    false,
    `${pier.id} must block the live player predicate`,
  );
}

assert.equal(
  CONTINUOUS_WORLD_ROAD_ROUTES.length,
  ROAD_CONNECTORS.length,
  'Every topology road must have one physical route graph',
);
const routeSegmentIds = CONTINUOUS_WORLD_ROAD_SPANS.map(
  (segment) => segment.id,
).sort((left, right) => left.localeCompare(right));
const surfaceSegmentIds = CONTINUOUS_WORLD_ROAD_RENDER_BAND_BLOCKERS.filter(
  (blocker) => blocker.band === 'SURFACE' && blocker.routeSegmentId,
)
  .map((blocker) => blocker.routeSegmentId)
  .sort((left, right) => left.localeCompare(right));
const collisionSegmentIds = CONTINUOUS_WORLD_ROAD_COLLISION_SEGMENTS.map(
  (segment) => segment.routeSegmentId,
).sort((left, right) => left.localeCompare(right));
assert.deepEqual(
  surfaceSegmentIds,
  routeSegmentIds,
  'Every resolved segment must produce one visual surface segment',
);
assert.deepEqual(
  collisionSegmentIds,
  routeSegmentIds,
  'Rendering and collision must consume identical resolved segment IDs',
);

for (const route of CONTINUOUS_WORLD_ROAD_ROUTES) {
  for (const fragment of route.fragments) {
    assert.equal(fragment.points.length, fragment.segments.length + 1);
    fragment.segments.forEach((segment, index) => {
      assert.deepEqual(segment.from, fragment.points[index]);
      assert.deepEqual(segment.to, fragment.points[index + 1]);
      if (index > 0) {
        assert.deepEqual(
          fragment.segments[index - 1].to,
          segment.from,
          `${fragment.id} visual centreline must have no junction gap`,
        );
      }
    });
    if (route.road.class === 'RING') {
      assert.strictEqual(
        fragment.points.at(-1),
        fragment.points[0],
        `${fragment.id} must close exactly`,
      );
    }
  }
}

const capitalAxis = CONTINUOUS_WORLD_ROAD_ROUTES.find(
  (route) => route.id === 'RD-A01',
);
assert.ok(capitalAxis, 'RD-A01 physical route graph must exist');
const capitalFragments = Object.fromEntries(
  capitalAxis.fragments.map((fragment) => [fragment.role, fragment]),
);
assert.deepEqual(capitalFragments.NORTH.points.at(-1), [0, 25]);
assert.strictEqual(
  capitalFragments.WEST.points[0],
  capitalFragments.NORTH.points.at(-1),
);
assert.strictEqual(
  capitalFragments.EAST.points[0],
  capitalFragments.NORTH.points.at(-1),
);
assert.strictEqual(
  capitalFragments.WEST.points.at(-1),
  capitalFragments.SOUTH.points[0],
);
assert.strictEqual(
  capitalFragments.EAST.points.at(-1),
  capitalFragments.SOUTH.points[0],
);

function legacyOffsetGap(points, offset, index) {
  const previous = points[index - 1];
  const point = points[index];
  const next = points[index + 1];
  const previousLength = distance(previous, point);
  const nextLength = distance(point, next);
  const previousEnd = [
    point[0] - ((point[1] - previous[1]) / previousLength) * offset,
    point[1] + ((point[0] - previous[0]) / previousLength) * offset,
  ];
  const nextStart = [
    point[0] - ((next[1] - point[1]) / nextLength) * offset,
    point[1] + ((next[0] - point[0]) / nextLength) * offset,
  ];
  return distance(previousEnd, nextStart);
}

const legacyBarrierGaps = F1_CIRCUIT_POINTS.slice(1, -1).map((_, index) =>
  legacyOffsetGap(F1_CIRCUIT_POINTS, 3.72, index + 1),
);
assert.ok(
  Math.max(...legacyBarrierGaps) > 1.6,
  'Regression fixture must reproduce the former multi-unit F1 barrier gaps',
);

for (const side of [-1, 1]) {
  for (const offset of [3.05, 3.72]) {
    const joined = createJoinedOffsetPolyline(
      F1_CIRCUIT_POINTS,
      offset * side,
      { closed: true },
    );
    assert.equal(joined.length, F1_CIRCUIT_POINTS.length);
    assert.ok(
      distance(joined[0], joined.at(-1)) < 1e-9,
      `F1 ${offset}u band must close exactly`,
    );
    const segments = createPolylineSegments(joined);
    for (let index = 0; index < segments.length; index += 1) {
      assert.ok(Number.isFinite(joined[index][0]));
      assert.ok(Number.isFinite(joined[index][1]));
      const nextSegment = segments[(index + 1) % segments.length];
      assert.ok(
        distance(segments[index].to, nextSegment.from) < 1e-9,
        `F1 band ${side}:${offset}:${index} must share one junction`,
      );
    }
    if (offset === 3.72) {
      for (const [index, segment] of segments.entries()) {
        const midpoint = [
          (segment.from[0] + segment.to[0]) / 2,
          (segment.from[1] + segment.to[1]) / 2,
        ];
        assert.equal(
          getWorldLinearBarrierAtXZ(midpoint[0], midpoint[1], 0)?.kind,
          'F1_BARRIER',
          `F1 barrier ${side}:${index} midpoint must be physically blocked`,
        );
        assert.equal(
          canTraverseContinuousWorld(midpoint),
          false,
          `F1 barrier ${side}:${index} must block the live player predicate`,
        );
      }
    }
  }
}

assert.equal(
  F1_BARRIER_COLLISION_MASKS.length,
  (F1_CIRCUIT_POINTS.length - 1) * 4,
  'Every F1 side needs one segment mask and one turn-join mask per segment',
);
for (const [index, segment] of createPolylineSegments(
  F1_CIRCUIT_POINTS,
).entries()) {
  const trackMidpoint = [
    (segment.from[0] + segment.to[0]) / 2,
    (segment.from[1] + segment.to[1]) / 2,
  ];
  assert.equal(
    getWorldLinearBarrierAtXZ(trackMidpoint[0], trackMidpoint[1]),
    undefined,
    `F1 racing line ${index} must remain open with avatar clearance`,
  );
  assert.equal(
    canTraverseContinuousWorld(trackMidpoint),
    true,
    `F1 racing line ${index} must remain traversable in the live world`,
  );
}

for (const road of ROAD_CONNECTORS) {
  const isClosed = distance(road.points[0], road.points.at(-1)) < 1e-9;
  const offsets = road.modes?.includes('WALK') ? [-5, 0, 5] : [0];
  for (const offset of offsets) {
    const joined = createJoinedOffsetPolyline(road.points, offset, {
      closed: isClosed,
    });
    assert.equal(
      joined.length,
      road.points.length,
      `${road.id} joined band must retain route topology`,
    );
    for (const point of joined) {
      assert.ok(
        Number.isFinite(point[0]) && Number.isFinite(point[1]),
        `${road.id} must not create an invalid miter`,
      );
    }
    const expectedJoins = isClosed
      ? road.points.length - 1
      : Math.max(0, road.points.length - 2);
    assert.equal(
      getPolylineJunctionIndices(joined, isClosed).length,
      expectedJoins,
      `${road.id} must receive a join piece at every turn`,
    );
  }
}

const bridgeDeckLength = 20;
const [railStart, railEnd] = getCenteredSpanEnds(bridgeDeckLength, 0.1);
assert.ok(railStart < -bridgeDeckLength / 2);
assert.ok(railEnd > bridgeDeckLength / 2);
assert.equal(railEnd - railStart, bridgeDeckLength + 0.2);

const nonMetroBridges = RIVER_BRIDGES.filter(
  (bridge) => bridge.class !== 'METRO',
);
assert.strictEqual(
  BRIDGE_RAIL_COLLISION_MASKS,
  BRIDGE_RAIL_SPANS,
  'Bridge visuals and collision must consume the same retained rail spans',
);
for (const bridge of nonMetroBridges) {
  const rails = BRIDGE_RAIL_SPANS.filter((span) => span.bridgeId === bridge.id);
  assert.ok(
    rails.some(({ side }) => side === 'LEFT') &&
      rails.some(({ side }) => side === 'RIGHT'),
    `${bridge.id} must retain a physical rail span on both sides`,
  );
  assert.equal(
    getWorldLinearBarrierAtXZ(bridge.position[0], bridge.position[1]),
    undefined,
    `${bridge.id} central travel lane must remain open with avatar clearance`,
  );
  for (const rail of rails) {
    assert.ok(rail.end > rail.start, `${rail.id} must retain positive length`);
    assert.equal(
      pointInWorldLinearBarrierMask(rail.center[0], rail.center[1], rail, 0),
      true,
      `${rail.id} midpoint must be physically blocked`,
    );
    assert.equal(
      canTraverseContinuousWorld(rail.center),
      false,
      `${rail.id} must block the live player predicate`,
    );
    assert.equal(rail.halfExtents[1] * 2, rail.end - rail.start);
    assert.ok(
      rail.start >= -(getWorldRiverBridgeDeckLength(bridge) + 0.2) / 2 &&
        rail.end <= (getWorldRiverBridgeDeckLength(bridge) + 0.2) / 2,
      `${rail.id} must stay inside the rendered bridge span`,
    );
  }
}

assert.deepEqual(
  new Set(PERSISTENT_INFRASTRUCTURE_ROUTES.map((route) => route.kind)),
  new Set(['SKYRAIL', 'F1_CIRCUIT', 'EASTERN_INTERCHANGE']),
  'Every large distance-sensitive linear landmark must own a persistent shell',
);
for (const route of PERSISTENT_INFRASTRUCTURE_ROUTES) {
  const segments = PERSISTENT_INFRASTRUCTURE_SEGMENTS.filter(
    (segment) => segment.routeId === route.id,
  );
  assert.equal(
    segments.length,
    route.points.length - 1,
    `${route.id} must retain every source-plan segment`,
  );
  segments.forEach((segment, index) => {
    assert.deepEqual(segment.from, route.points[index]);
    assert.deepEqual(segment.to, route.points[index + 1]);
    assert.ok(segment.width > 0 && segment.thickness > 0);
    assert.ok(
      Number.isFinite(segment.startElevation) &&
        Number.isFinite(segment.endElevation),
    );
    if (index > 0) {
      assert.deepEqual(
        segments[index - 1].to,
        segment.from,
        `${route.id} segment ${index} must share an exact plan junction`,
      );
      assert.ok(
        Math.abs(segments[index - 1].endElevation - segment.startElevation) <
          1e-9,
        `${route.id} segment ${index} must share an exact vertical junction`,
      );
    }
  });
}

console.log(
  `Linear infrastructure checks passed: ${ROAD_CONNECTORS.length} roads, ${F1_CIRCUIT_POINTS.length - 1} F1 segments and ${BRIDGE_RAIL_SPANS.length} shared visual/collision rail spans.`,
);
