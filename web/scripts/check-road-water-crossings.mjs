import assert from 'node:assert/strict';

import {
  CONTINUOUS_WORLD_ROADSIDE_TREE_FOOTPRINTS,
  CONTINUOUS_WORLD_ROAD_RENDER_BAND_BLOCKERS,
  CONTINUOUS_WORLD_ROAD_SPANS,
  CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS,
  CONTINUOUS_WORLD_ROAD_WATER_EDGE_MASKS,
  getRoadWaterCrossingAtXZ,
  getWorldSurfaceElevationXZ,
  isWorldPointInRawWaterXZ,
  isWorldPointInWater,
  isWorldPointOnRiverBridge,
} from '../app/continuous-world.tsx';
import {
  createRoadWaterCrossings,
  pointInRoadWaterCrossingEdgeMask,
  pointInRoadWaterCrossingXZ,
  ROAD_ALIGNED_RIVER_BRIDGE_BINDINGS,
  ROAD_BOUND_RIVER_BRIDGE_IDS,
  WORLD_ROAD_WATER_POLICIES,
} from '../app/world-road-crossings.ts';
import { WORLD_WATERCRAFT_FOOTPRINTS } from '../app/world-watercraft.ts';
import {
  BRIDGE_RAIL_COLLISION_MASKS,
  getWorldRiverBridgeRenderedWidth,
  pointInWorldLinearBarrierMask,
} from '../app/world-linear-collision.ts';
import { WORLD_SURFACE_RAMPS } from '../app/world-spatial-registry.ts';
import { RIVER_BRIDGES, ROAD_CONNECTORS } from '../app/world-topology.ts';

const pointDistance = (left, right) =>
  Math.hypot(right[0] - left[0], right[1] - left[1]);

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

function overlaps(left, right, clearance = 0) {
  const delta = [
    right.center[0] - left.center[0],
    right.center[1] - left.center[1],
  ];
  for (const axis of [...axesFor(left), ...axesFor(right)]) {
    const centerDistance = Math.abs(delta[0] * axis[0] + delta[1] * axis[1]);
    if (
      centerDistance >=
      projectedRadius(left, axis) + projectedRadius(right, axis) + clearance
    )
      return false;
  }
  return true;
}

const crossingIds = CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.map(({ id }) => id);
assert.equal(
  new Set(crossingIds).size,
  crossingIds.length,
  'Every physical road-water interval must have a unique identity',
);
assert.equal(
  CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.length,
  35,
  'The reviewed masterplan currently contains exactly 35 wet road intervals',
);

const crossingCounts = Object.fromEntries(
  ['BRIDGE', 'COASTAL_VIADUCT', 'CAUSEWAY', 'SEA_BRIDGE'].map((surface) => [
    surface,
    CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.filter(
      (crossing) => crossing.surface === surface,
    ).length,
  ]),
);
assert.deepEqual(crossingCounts, {
  BRIDGE: 12,
  COASTAL_VIADUCT: 17,
  CAUSEWAY: 1,
  SEA_BRIDGE: 5,
});

const roadSpanById = new Map(
  CONTINUOUS_WORLD_ROAD_SPANS.map((segment) => [segment.id, segment]),
);
for (const crossing of CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS) {
  assert.ok(
    roadSpanById.has(crossing.routeSegmentId),
    `${crossing.id} must resolve to a rendered and collidable road segment`,
  );
  assert.equal(
    isWorldPointInRawWaterXZ(crossing.waterProbe[0], crossing.waterProbe[1]),
    true,
    `${crossing.id} must retain raw water below its structure`,
  );
  assert.ok(
    pointInRoadWaterCrossingXZ(
      crossing.waterProbe[0],
      crossing.waterProbe[1],
      crossing,
    ),
    `${crossing.id} must own its own raw-water probe`,
  );
  assert.ok(
    getRoadWaterCrossingAtXZ(crossing.waterProbe[0], crossing.waterProbe[1]),
    `${crossing.id} water probe must resolve through the shared crossing registry`,
  );
  assert.equal(
    isWorldPointInWater(crossing.waterProbe),
    false,
    `${crossing.id} must open traversal only on its physical deck`,
  );
  assert.ok(
    getWorldSurfaceElevationXZ(
      crossing.waterProbe[0],
      crossing.waterProbe[1],
    ) >= 0.12,
    `${crossing.id} must place its road surface above the water plane`,
  );
  if (crossing.bridgeId) {
    const bridge = RIVER_BRIDGES.find(({ id }) => id === crossing.bridgeId);
    assert.ok(bridge, `${crossing.bridgeId} must exist`);
    assert.ok(
      getWorldRiverBridgeRenderedWidth(bridge) / 2 >=
        crossing.structureHalfWidth - 1e-9,
      `${crossing.bridgeId} visible deck must cover ${crossing.id}'s full traversal aperture`,
    );
  }
}

// Sample every road's entire rendered envelope. Any part that touches the raw
// river or ocean must be covered by the interval assigned to that same road
// segment; a generic water cut-out can never make this check pass.
let wetEnvelopeSamples = 0;
for (const segment of CONTINUOUS_WORLD_ROAD_SPANS) {
  const dx = segment.to[0] - segment.from[0];
  const dz = segment.to[1] - segment.from[1];
  const length = Math.hypot(dx, dz);
  const tangent = [dx / length, dz / length];
  const normal = [-tangent[1], tangent[0]];
  const longitudinalSamples = Math.max(1, Math.ceil(length / 0.2));
  const offsets = Array.from(
    { length: 9 },
    (_, index) =>
      -segment.renderedEnvelopeHalfWidth +
      (segment.renderedEnvelopeHalfWidth * 2 * index) / 8,
  );
  for (let index = 0; index <= longitudinalSamples; index += 1) {
    const progress = index / longitudinalSamples;
    const center = [
      segment.from[0] + dx * progress,
      segment.from[1] + dz * progress,
    ];
    for (const offset of offsets) {
      const point = [
        center[0] + normal[0] * offset,
        center[1] + normal[1] * offset,
      ];
      if (!isWorldPointInRawWaterXZ(point[0], point[1])) continue;
      wetEnvelopeSamples += 1;
      const ownsSample = CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.some(
        (crossing) =>
          crossing.routeSegmentId === segment.id &&
          pointInRoadWaterCrossingXZ(point[0], point[1], crossing),
      );
      assert.equal(
        ownsSample,
        true,
        `${segment.id} has raw water at ${point.join(',')} without its own physical structure`,
      );
    }
  }
}
assert.ok(
  wetEnvelopeSamples > 1_000,
  'Hydrology regression sweep must be broad',
);

let supportedWetBandSamples = 0;
for (const band of CONTINUOUS_WORLD_ROAD_RENDER_BAND_BLOCKERS) {
  const halfX = Math.max(0, band.halfExtents[0] - 0.01);
  const halfZ = Math.max(0, band.halfExtents[1] - 0.01);
  const xSamples = Math.max(1, Math.ceil((halfX * 2) / 0.24));
  const zSamples = Math.max(1, Math.ceil((halfZ * 2) / 0.24));
  const cosine = Math.cos(band.rotationRadians);
  const sine = Math.sin(band.rotationRadians);
  for (let xIndex = 0; xIndex <= xSamples; xIndex += 1) {
    const localX = -halfX + (halfX * 2 * xIndex) / xSamples;
    for (let zIndex = 0; zIndex <= zSamples; zIndex += 1) {
      const localZ = -halfZ + (halfZ * 2 * zIndex) / zSamples;
      const point = [
        band.center[0] + localX * cosine + localZ * sine,
        band.center[1] - localX * sine + localZ * cosine,
      ];
      if (!isWorldPointInRawWaterXZ(point[0], point[1])) continue;
      supportedWetBandSamples += 1;
      assert.ok(
        getRoadWaterCrossingAtXZ(point[0], point[1]) ||
          isWorldPointOnRiverBridge(point),
        `${band.id} renders above raw water without a physical deck at ${point.join(',')}`,
      );
    }
  }
}
assert.ok(
  supportedWetBandSamples > 10_000,
  'The rendered-band support sweep must exercise the full wet geometry',
);

const policyRouteIds = WORLD_ROAD_WATER_POLICIES.flatMap(
  ({ routeSegmentIds }) => routeSegmentIds,
);
assert.equal(
  new Set(policyRouteIds).size,
  policyRouteIds.length,
  'A wet road segment may belong to only one explicit non-bridge policy',
);
for (const policy of WORLD_ROAD_WATER_POLICIES) {
  for (const routeSegmentId of policy.routeSegmentIds) {
    const policyCrossings = CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.filter(
      (crossing) => crossing.routeSegmentId === routeSegmentId,
    );
    assert.ok(
      policyCrossings.length > 0,
      `${policy.id} includes dry or missing segment ${routeSegmentId}`,
    );
    for (const crossing of policyCrossings) {
      assert.equal(crossing.surface, policy.surface);
      assert.equal(crossing.structureId, policy.structureId);
      assert.equal(crossing.bridgeId, undefined);
    }
  }
}

const roadIds = new Set(ROAD_CONNECTORS.map(({ id }) => id));
const bridgeIds = new Set(RIVER_BRIDGES.map(({ id }) => id));
for (const binding of ROAD_ALIGNED_RIVER_BRIDGE_BINDINGS) {
  assert.ok(roadIds.has(binding.roadId), `${binding.roadId} must exist`);
  assert.ok(bridgeIds.has(binding.bridgeId), `${binding.bridgeId} must exist`);
  assert.ok(
    CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.some(
      (crossing) =>
        crossing.roadId === binding.roadId &&
        crossing.bridgeId === binding.bridgeId,
    ),
    `${binding.roadId} must physically cross ${binding.bridgeId}`,
  );
}
assert.deepEqual(
  [...ROAD_BOUND_RIVER_BRIDGE_IDS].sort(),
  [
    ...new Set(
      ROAD_ALIGNED_RIVER_BRIDGE_BINDINGS.map(({ bridgeId }) => bridgeId),
    ),
  ].sort(),
);

for (const roadId of [
  'RD-A05',
  'RD-A06',
  'RD-A07',
  'RD-A14',
  'RD-A15',
  'RD-A16',
]) {
  assert.equal(
    CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.some(
      (crossing) => crossing.roadId === roadId,
    ),
    false,
    `${roadId} must retain its deliberately dry bank alignment`,
  );
}

const seaBridgeCrossings = CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.filter(
  (crossing) => crossing.surface === 'SEA_BRIDGE',
);
assert.ok(
  seaBridgeCrossings.every(
    (crossing) =>
      crossing.roadId === 'RD-A13' &&
      crossing.structureId === 'SEA-BRIDGE-OCEAN-CROWN',
  ),
);
assert.equal(
  CONTINUOUS_WORLD_ROAD_WATER_EDGE_MASKS.length,
  5,
  'The sea bridge owns five collision/visual parapet spans after its road merge',
);
const firstSeaBridgeCrossing = seaBridgeCrossings[0];
assert.equal(
  CONTINUOUS_WORLD_ROAD_WATER_EDGE_MASKS.some(
    (mask) =>
      mask.crossingId === firstSeaBridgeCrossing.id && mask.side === 'LEFT',
  ),
  false,
  'The landward parapet must open where the sea bridge merges with the coastal ring',
);
assert.ok(
  CONTINUOUS_WORLD_ROAD_WATER_EDGE_MASKS.every((mask) =>
    seaBridgeCrossings.some(({ id }) => id === mask.crossingId),
  ),
  'Only the sea bridge may generate road-water edge masks',
);

// No bridge parapet may cut across any road centreline, including the parallel
// west-coast merge that originally trapped the player.
for (const segment of CONTINUOUS_WORLD_ROAD_SPANS) {
  const dx = segment.to[0] - segment.from[0];
  const dz = segment.to[1] - segment.from[1];
  const sampleCount = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.2));
  for (let index = 0; index <= sampleCount; index += 1) {
    const progress = index / sampleCount;
    const point = [
      segment.from[0] + dx * progress,
      segment.from[1] + dz * progress,
    ];
    for (const edge of CONTINUOUS_WORLD_ROAD_WATER_EDGE_MASKS) {
      assert.equal(
        pointInRoadWaterCrossingEdgeMask(point[0], point[1], edge, 0.38),
        false,
        `${edge.id} blocks ${segment.id} at ${point.join(',')}`,
      );
    }
    for (const rail of BRIDGE_RAIL_COLLISION_MASKS) {
      assert.equal(
        pointInWorldLinearBarrierMask(point[0], point[1], rail, 0.38),
        false,
        `${rail.id} blocks ${segment.id} at ${point.join(',')}`,
      );
    }
  }
}

const crossingFootprints = CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.map(
  (crossing) => ({
    id: crossing.id,
    center: [
      (crossing.from[0] + crossing.to[0]) / 2,
      (crossing.from[1] + crossing.to[1]) / 2,
    ],
    halfExtents: [
      crossing.structureHalfWidth,
      pointDistance(crossing.from, crossing.to) / 2 +
        crossing.longitudinalOverhang,
    ],
    rotationRadians: Math.atan2(
      crossing.to[0] - crossing.from[0],
      crossing.to[1] - crossing.from[1],
    ),
  }),
);
for (const craft of WORLD_WATERCRAFT_FOOTPRINTS) {
  assert.equal(
    isWorldPointInRawWaterXZ(craft.center[0], craft.center[1]),
    true,
    `${craft.id} must remain in the river, marina or open sea`,
  );
  assert.equal(
    getRoadWaterCrossingAtXZ(craft.center[0], craft.center[1]),
    undefined,
    `${craft.id} centre must not sit below a road structure`,
  );
  for (const crossing of crossingFootprints) {
    assert.equal(
      overlaps(craft, crossing, 0.25),
      false,
      `${craft.id} overlaps ${crossing.id}`,
    );
  }
}

const canopyWaterSamples = [
  [0, 0],
  ...Array.from({ length: 64 }, (_, index) => {
    const angle = (index / 64) * Math.PI * 2;
    return [Math.cos(angle) * 1.08, Math.sin(angle) * 1.08];
  }),
];
for (const tree of CONTINUOUS_WORLD_ROADSIDE_TREE_FOOTPRINTS) {
  for (const offset of canopyWaterSamples) {
    assert.equal(
      isWorldPointInRawWaterXZ(
        tree.center[0] + offset[0],
        tree.center[1] + offset[1],
      ),
      false,
      `${tree.id} canopy must not grow through raw water`,
    );
  }
}

const oceanCrownRoad = ROAD_CONNECTORS.find(({ id }) => id === 'RD-A13');
const oceanCrownRamp = WORLD_SURFACE_RAMPS.find(
  ({ id }) => id === 'SURFACE-OCEAN-CROWN-TERMINAL-RAMP',
);
assert.ok(oceanCrownRoad && oceanCrownRamp);
assert.deepEqual(oceanCrownRoad.points.at(-1), [-120, -84]);
assert.deepEqual(oceanCrownRamp.from, [-116, -76]);
assert.deepEqual(oceanCrownRamp.to, [-120, -81.3]);
assert.equal(getWorldSurfaceElevationXZ(-120, -84), 4.75);
assert.equal(seaBridgeCrossings.at(-1).endElevation, 4.75);

seaBridgeCrossings.forEach((crossing, index) => {
  assert.deepEqual(crossing.from, oceanCrownRoad.points[index]);
  assert.deepEqual(crossing.to, oceanCrownRoad.points[index + 1]);
  if (index > 0) {
    assert.deepEqual(seaBridgeCrossings[index - 1].to, crossing.from);
    assert.equal(
      seaBridgeCrossings[index - 1].endElevation,
      crossing.startElevation,
    );
  }
});

for (const ramp of WORLD_SURFACE_RAMPS) {
  const dx = ramp.to[0] - ramp.from[0];
  const dz = ramp.to[1] - ramp.from[1];
  const length = Math.hypot(dx, dz);
  const normal = [-dz / length, dx / length];
  const sampleCount = Math.max(1, Math.ceil(length / 0.2));
  for (let index = 0; index <= sampleCount; index += 1) {
    const progress = index / sampleCount;
    for (const offset of [-ramp.width / 2, 0, ramp.width / 2]) {
      const point = [
        ramp.from[0] + dx * progress + normal[0] * offset,
        ramp.from[1] + dz * progress + normal[1] * offset,
      ];
      if (!isWorldPointInRawWaterXZ(point[0], point[1])) continue;
      assert.ok(
        getRoadWaterCrossingAtXZ(point[0], point[1]) ||
          isWorldPointOnRiverBridge(point),
        `${ramp.id} may cross raw water only on a reviewed physical structure`,
      );
    }
  }
}

assert.throws(
  () =>
    createRoadWaterCrossings({
      segments: [
        {
          id: 'RD-UNREVIEWED:MAIN:1',
          roadId: 'RD-UNREVIEWED',
          fragmentId: 'RD-UNREVIEWED:MAIN',
          fragmentSegmentIndex: 0,
          sourceSegmentIndices: [0],
          from: [0, 0],
          to: [2, 0],
          width: 4,
          outerHalfWidth: 2.28,
          renderedEnvelopeHalfWidth: 4.3,
        },
      ],
      roads: [
        {
          id: 'RD-UNREVIEWED',
          name: 'Unreviewed fixture',
          class: 'LOCAL',
          points: [
            [0, 0],
            [2, 0],
          ],
          width: 4,
          modes: ['WALK'],
          status: 'PLANNED',
        },
      ],
      bridges: [],
      isRawWaterXZ: () => true,
      groundElevationXZ: () => 0,
      bridgeDeckLength: () => 0,
    }),
  /has no reviewed bridge, causeway or viaduct policy/,
  'An unreviewed wet road must fail closed',
);

console.log(
  `Road-water crossing checks passed: ${CONTINUOUS_WORLD_ROAD_WATER_CROSSINGS.length} intervals, ${wetEnvelopeSamples} wet envelope samples, ${supportedWetBandSamples} supported wet visual samples, ${CONTINUOUS_WORLD_ROAD_WATER_EDGE_MASKS.length} safe parapet spans and ${WORLD_WATERCRAFT_FOOTPRINTS.length} watercraft.`,
);
