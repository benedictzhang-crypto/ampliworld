import assert from 'node:assert/strict';

import {
  CONTINUOUS_WORLD_LEGACY_ROAD_OBSTACLES,
  getRoadRenderWidth,
} from '../app/continuous-world.tsx';
import {
  WORLD_ROAD_SURFACE_MARGIN,
  resolveRoadRoutes,
} from '../app/world-road-geometry.ts';
import { WORLD_SOLID_FOOTPRINTS } from '../app/world-spatial-registry.ts';
import { ROAD_CONNECTORS } from '../app/world-topology.ts';

const EPSILON = 1e-7;
const ROAD_CLEARANCE = 0;
const obstacles = [
  ...CONTINUOUS_WORLD_LEGACY_ROAD_OBSTACLES,
  ...WORLD_SOLID_FOOTPRINTS,
];

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
  return Math.abs(footprint.halfExtents[0] - footprint.halfExtents[1]) <=
    EPSILON
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
  return Math.hypot(localX - nearestX, localZ - nearestZ) < radius - EPSILON;
}

function overlaps(left, right) {
  const leftRadius = circularRadius(left);
  const rightRadius = circularRadius(right);
  if (leftRadius !== undefined && rightRadius !== undefined) {
    return (
      Math.hypot(
        right.center[0] - left.center[0],
        right.center[1] - left.center[1],
      ) <
      leftRadius + rightRadius - EPSILON
    );
  }
  if (leftRadius !== undefined)
    return circleOverlapsRectangle(left, right, leftRadius);
  if (rightRadius !== undefined)
    return circleOverlapsRectangle(right, left, rightRadius);
  const delta = [
    right.center[0] - left.center[0],
    right.center[1] - left.center[1],
  ];
  for (const axis of [...axesFor(left), ...axesFor(right)]) {
    const centerDistance = Math.abs(delta[0] * axis[0] + delta[1] * axis[1]);
    if (
      centerDistance >=
      projectedRadius(left, axis) + projectedRadius(right, axis) - EPSILON
    ) {
      return false;
    }
  }
  return true;
}

function roadSegmentFootprint(segment, width) {
  const dx = segment.to[0] - segment.from[0];
  const dz = segment.to[1] - segment.from[1];
  return {
    center: [
      (segment.from[0] + segment.to[0]) / 2,
      (segment.from[1] + segment.to[1]) / 2,
    ],
    halfExtents: [
      segment.outerHalfWidth,
      Math.hypot(dx, dz) / 2 + width * 0.09,
    ],
    rotationRadians: Math.atan2(dx, dz),
  };
}

function pointsEqual(left, right) {
  return (
    Math.abs(left[0] - right[0]) <= EPSILON &&
    Math.abs(left[1] - right[1]) <= EPSILON
  );
}

function pointToSegmentDistance(point, from, to) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const lengthSquared = dx * dx + dz * dz;
  const progress =
    lengthSquared > EPSILON
      ? Math.max(
          0,
          Math.min(
            1,
            ((point[0] - from[0]) * dx + (point[1] - from[1]) * dz) /
              lengthSquared,
          ),
        )
      : 0;
  return Math.hypot(
    point[0] - from[0] - dx * progress,
    point[1] - from[1] - dz * progress,
  );
}

function pointToRoadDistance(point, road) {
  return Math.min(
    ...road.points
      .slice(0, -1)
      .map((from, index) =>
        pointToSegmentDistance(point, from, road.points[index + 1]),
      ),
  );
}

function distortionLimits(road) {
  if (road.id === 'RD-A01') {
    // Network length counts both parallel CBD carriageways. They now remain
    // divided from the north civic pool through the southern rotunda.
    return { lengthRatio: 1.75, maximumDeviation: 13 };
  }
  if (road.id === 'RD-A12') {
    return { lengthRatio: 2, maximumDeviation: 35 };
  }
  if (road.class === 'RING') {
    return { lengthRatio: 1.8, maximumDeviation: 35 };
  }
  if (road.class === 'SCENIC') {
    return { lengthRatio: 1.75, maximumDeviation: 28 };
  }
  return { lengthRatio: 1.6, maximumDeviation: 20 };
}

function resolve() {
  return resolveRoadRoutes({
    roads: ROAD_CONNECTORS,
    obstacles,
    renderWidth: getRoadRenderWidth,
    outerMargin: WORLD_ROAD_SURFACE_MARGIN,
    clearance: ROAD_CLEARANCE,
    preserveAuthoredCenterlines: true,
  });
}

const routes = resolve();
assert.equal(
  new Set(ROAD_CONNECTORS.map((road) => road.id)).size,
  ROAD_CONNECTORS.length,
  'Road topology IDs must be unique',
);
assert.deepEqual(
  routes,
  resolve(),
  'Resolver must be byte-for-byte deterministic',
);
assert.equal(
  routes.length,
  ROAD_CONNECTORS.length,
  'Every topology road must resolve exactly once',
);

let routedSegmentCount = 0;
let detourRoadCount = 0;
let maximumTurnDegrees = 0;
let maximumTurnLabel = '';
for (const [roadIndex, route] of routes.entries()) {
  const road = ROAD_CONNECTORS[roadIndex];
  assert.equal(route.id, road.id);
  assert.equal(route.road, road);
  assert.equal(
    route.segments.length,
    route.fragments.reduce(
      (count, fragment) => count + fragment.segments.length,
      0,
    ),
  );
  assert.ok(route.segments.length > 0, `${road.id} must remain continuous`);
  routedSegmentCount += route.segments.length;
  if (route.segments.length > road.points.length - 1) detourRoadCount += 1;

  const coveredSourceSegments = new Set();
  for (const fragment of route.fragments) {
    assert.equal(fragment.roadId, road.id);
    assert.equal(fragment.points.length, fragment.segments.length + 1);
    assert.equal(
      fragment.renderedEnvelopeHalfWidth,
      fragment.width / 2 +
        (road.modes?.includes('WALK')
          ? 2.3
          : road.modes?.includes('CYCLE')
            ? 0.87
            : 0),
      `${fragment.id} must publish its amenity envelope separately`,
    );
    for (const [segmentIndex, segment] of fragment.segments.entries()) {
      assert.equal(segment.id, `${fragment.id}:${segmentIndex + 1}`);
      assert.equal(segment.roadId, road.id);
      assert.equal(segment.fragmentId, fragment.id);
      assert.equal(segment.fragmentSegmentIndex, segmentIndex);
      assert.deepEqual(segment.from, fragment.points[segmentIndex]);
      assert.deepEqual(segment.to, fragment.points[segmentIndex + 1]);
      assert.ok(
        Math.hypot(
          segment.to[0] - segment.from[0],
          segment.to[1] - segment.from[1],
        ) > EPSILON,
        `${segment.id} must not be degenerate`,
      );
      segment.sourceSegmentIndices.forEach((sourceIndex) => {
        assert.ok(
          Number.isInteger(sourceIndex) &&
            sourceIndex >= 0 &&
            sourceIndex < road.points.length - 1,
          `${segment.id} has invalid source segment ${sourceIndex}`,
        );
        coveredSourceSegments.add(sourceIndex);
      });

      const envelope = roadSegmentFootprint(segment, fragment.width);
      for (const obstacle of obstacles) {
        assert.equal(
          overlaps(envelope, obstacle),
          false,
          `${segment.id} swept road envelope overlaps ${obstacle.id}`,
        );
      }
    }

    for (let index = 1; index < fragment.points.length; index += 1) {
      assert.ok(
        !pointsEqual(fragment.points[index - 1], fragment.points[index]),
        `${fragment.id} point ${index} duplicates its predecessor`,
      );
    }

    for (
      let leftIndex = 0;
      leftIndex < fragment.segments.length;
      leftIndex += 1
    ) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < fragment.segments.length;
        rightIndex += 1
      ) {
        const adjacent = rightIndex === leftIndex + 1;
        const ringSeam =
          road.class === 'RING' &&
          leftIndex === 0 &&
          rightIndex === fragment.segments.length - 1;
        if (adjacent || ringSeam) continue;
        assert.equal(
          overlaps(
            roadSegmentFootprint(fragment.segments[leftIndex], fragment.width),
            roadSegmentFootprint(fragment.segments[rightIndex], fragment.width),
          ),
          false,
          `${fragment.id} non-adjacent segments ${leftIndex + 1} and ${rightIndex + 1} overlap`,
        );
      }
    }

    const closed = road.class === 'RING';
    const turnPoints = closed ? fragment.points.slice(0, -1) : fragment.points;
    const firstTurnIndex = closed ? 0 : 1;
    const lastTurnIndex = closed
      ? turnPoints.length - 1
      : turnPoints.length - 2;
    for (let index = firstTurnIndex; index <= lastTurnIndex; index += 1) {
      const previous =
        turnPoints[(index - 1 + turnPoints.length) % turnPoints.length];
      const current = turnPoints[index];
      const next = turnPoints[(index + 1) % turnPoints.length];
      const incoming = [current[0] - previous[0], current[1] - previous[1]];
      const outgoing = [next[0] - current[0], next[1] - current[1]];
      const denominator =
        Math.hypot(incoming[0], incoming[1]) *
        Math.hypot(outgoing[0], outgoing[1]);
      const cosine = Math.max(
        -1,
        Math.min(
          1,
          (incoming[0] * outgoing[0] + incoming[1] * outgoing[1]) / denominator,
        ),
      );
      const turnDegrees = (Math.acos(cosine) * 180) / Math.PI;
      if (turnDegrees > maximumTurnDegrees) {
        maximumTurnDegrees = turnDegrees;
        maximumTurnLabel = `${fragment.id} point ${index + 1}`;
      }
      assert.ok(
        turnDegrees <= 85 + EPSILON,
        `${fragment.id} point ${index + 1} turns ${turnDegrees.toFixed(3)} degrees`,
      );
    }

    if (road.class === 'RING') {
      assert.strictEqual(
        fragment.points.at(-1),
        fragment.points[0],
        `${fragment.id} must close with the exact first point object`,
      );
    }
  }
  assert.equal(
    coveredSourceSegments.size,
    road.points.length - 1,
    `${road.id} must preserve every original topology segment`,
  );

  const originalLength = road.points
    .slice(0, -1)
    .reduce(
      (total, from, index) =>
        total +
        Math.hypot(
          road.points[index + 1][0] - from[0],
          road.points[index + 1][1] - from[1],
        ),
      0,
    );
  const resolvedLength = route.segments.reduce(
    (total, segment) =>
      total +
      Math.hypot(
        segment.to[0] - segment.from[0],
        segment.to[1] - segment.from[1],
      ),
    0,
  );
  const samples = route.segments.flatMap((segment) =>
    Array.from({ length: 11 }, (_, index) => [
      segment.from[0] + ((segment.to[0] - segment.from[0]) * index) / 10,
      segment.from[1] + ((segment.to[1] - segment.from[1]) * index) / 10,
    ]),
  );
  const maximumDeviation = Math.max(
    ...samples.map((sample) => pointToRoadDistance(sample, road)),
  );
  const limits = distortionLimits(road);
  assert.ok(
    resolvedLength / originalLength <= limits.lengthRatio + EPSILON,
    `${road.id} length ratio ${(resolvedLength / originalLength).toFixed(3)} exceeds ${limits.lengthRatio}`,
  );
  assert.ok(
    maximumDeviation <= limits.maximumDeviation + EPSILON,
    `${road.id} deviation ${maximumDeviation.toFixed(3)} exceeds ${limits.maximumDeviation}`,
  );
}

const dividedAxis = routes.find((route) => route.id === 'RD-A01');
assert.ok(dividedAxis, 'Capital axis must resolve');
assert.deepEqual(
  dividedAxis.fragments.map((fragment) => fragment.role),
  ['NORTH', 'WEST', 'EAST', 'SOUTH'],
  'Capital axis must expose both physical CBD carriageways',
);
const [north, west, east, south] = dividedAxis.fragments;
assert.deepEqual(north.points.at(-1), [0, 25]);
assert.strictEqual(west.points[0], north.points.at(-1));
assert.strictEqual(east.points[0], north.points.at(-1));
assert.strictEqual(west.points.at(-1), south.points[0]);
assert.strictEqual(east.points.at(-1), south.points[0]);
assert.equal(west.width, 4.8);
assert.equal(east.width, 4.8);

assert.equal(
  detourRoadCount,
  1,
  'Only the authored dual-carriageway capital axis may expand beyond topology',
);

const requiredRoadJunctions = [
  { point: [11.5, -18], roads: ['RD-A01', 'RD-A02'] },
  { point: [0, 25], roads: ['RD-A01', 'RD-A03'] },
  { point: [42, -8], roads: ['RD-A12', 'RD-A04'] },
  { point: [54.67, -8], roads: ['RD-A12', 'RD-R01'] },
  { point: [75.61, -8], roads: ['RD-A12', 'RD-R02'] },
  { point: [55.5, 11.4], roads: ['RD-R01', 'RD-A04'] },
  { point: [50.32, 18.75], roads: ['RD-R01', 'RD-A11'] },
  { point: [-40.24, -67.4], roads: ['RD-R02', 'RD-A09'] },
  { point: [76, -40], roads: ['RD-R02', 'RD-A14'] },
  { point: [63.58, -53.75], roads: ['RD-R02', 'RD-A16'] },
  { point: [64, 57], roads: ['RD-A03', 'RD-A08'] },
  { point: [70, 38], roads: ['RD-A04', 'RD-A15'] },
  { point: [0, 45], roads: ['RD-A05', 'RD-A06'] },
  { point: [-45, -72], roads: ['RD-A09', 'RD-A13'] },
];
const routesById = new Map(routes.map((route) => [route.id, route]));
for (const junction of requiredRoadJunctions) {
  for (const roadId of junction.roads) {
    const route = routesById.get(roadId);
    assert.ok(route, `${roadId} junction route must exist`);
    assert.ok(
      route.segments.some(
        (segment) =>
          pointToSegmentDistance(junction.point, segment.from, segment.to) <=
          EPSILON,
      ),
      `${roadId} must pass junction ${junction.point.join(',')}`,
    );
  }
}

console.log(
  `Road resolver checks passed: ${routes.length} continuous routes, ${routedSegmentCount} safe segments, ${obstacles.length} protected OBBs, ${detourRoadCount} detoured roads; max turn ${maximumTurnDegrees.toFixed(2)}° at ${maximumTurnLabel}.`,
);
