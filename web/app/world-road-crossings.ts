import type { ResolvedRoadSegment } from './world-road-geometry';
import type { RiverBridge, RoadConnector, WorldPoint } from './world-topology';

export type RoadWaterCrossingSurface =
  | 'BRIDGE'
  | 'CAUSEWAY'
  | 'COASTAL_VIADUCT'
  | 'SEA_BRIDGE';

export type RoadWaterCrossing = Readonly<{
  id: string;
  roadId: string;
  routeSegmentId: string;
  intervalIndex: number;
  surface: RoadWaterCrossingSurface;
  structureId: string;
  bridgeId?: string;
  from: WorldPoint;
  to: WorldPoint;
  waterProbe: WorldPoint;
  renderedEnvelopeHalfWidth: number;
  structureHalfWidth: number;
  longitudinalOverhang: number;
  edgeOffset: number;
  startElevation: number;
  endElevation: number;
}>;

export type RoadWaterCrossingEdgeMask = Readonly<{
  id: string;
  crossingId: string;
  side: 'LEFT' | 'RIGHT';
  center: WorldPoint;
  halfExtents: WorldPoint;
  rotationRadians: number;
}>;

export type RoadWaterCrossingEdgeTrim = Readonly<{
  start?: number;
  end?: number;
  left?: Readonly<{ start?: number; end?: number }>;
  right?: Readonly<{ start?: number; end?: number }>;
}>;

type WaterInterval = {
  start: number;
  end: number;
  waterProbe: WorldPoint;
};

const LONGITUDINAL_SAMPLE_STEP = 0.25;
const CROSS_SECTION_SAMPLE_COUNT = 9;
const BOUNDARY_REFINEMENT_STEPS = 12;
const INTERVAL_MERGE_GAP = 0.26;
const LAND_ABUTMENT_OVERHANG = 0.28;
const DECK_EDGE_SHOULDER = 0.26;
const PARAPET_OFFSET = 0.14;
const PARAPET_HALF_WIDTH = 0.09;
const PARAPET_END_OVERHANG = 0.2;
const MINIMUM_DECK_ELEVATION = 0.12;

export type WorldRoadWaterPolicy = Readonly<{
  id: string;
  structureId: string;
  surface: Exclude<RoadWaterCrossingSurface, 'BRIDGE'>;
  routeSegmentIds: readonly string[];
}>;

/** Explicit approval list for intentional non-river-bridge water structures.
 * Any new wet road segment must be reviewed here; detection alone never grants
 * a generic dry aperture through navigable water. */
export const WORLD_ROAD_WATER_POLICIES: readonly WorldRoadWaterPolicy[] = [
  {
    id: 'POLICY-AZURE-SHELTERED-CAUSEWAY',
    structureId: 'CAUSEWAY-AZURE-SHELTERED',
    surface: 'CAUSEWAY',
    routeSegmentIds: ['RD-A02:MAIN:9'],
  },
  {
    id: 'POLICY-WEST-COAST-ELEVATED-RING',
    structureId: 'VIADUCT-WEST-COAST-RING',
    surface: 'COASTAL_VIADUCT',
    routeSegmentIds: [
      'RD-R02:MAIN:1',
      'RD-R02:MAIN:22',
      'RD-R02:MAIN:23',
      'RD-R02:MAIN:24',
      'RD-R02:MAIN:25',
      'RD-R02:MAIN:26',
      'RD-R02:MAIN:27',
    ],
  },
  {
    id: 'POLICY-AZURE-RESORT-VIADUCT',
    structureId: 'VIADUCT-AZURE-RESORT',
    surface: 'COASTAL_VIADUCT',
    routeSegmentIds: Array.from(
      { length: 10 },
      (_, index) => `RD-A09:MAIN:${index + 1}`,
    ),
  },
  {
    id: 'POLICY-OCEAN-CROWN-SEA-BRIDGE',
    structureId: 'SEA-BRIDGE-OCEAN-CROWN',
    surface: 'SEA_BRIDGE',
    routeSegmentIds: Array.from(
      { length: 5 },
      (_, index) => `RD-A13:MAIN:${index + 1}`,
    ),
  },
];

const NON_BRIDGE_WATER_POLICY_BY_SEGMENT = new Map(
  WORLD_ROAD_WATER_POLICIES.flatMap((policy) =>
    policy.routeSegmentIds.map((segmentId) => [segmentId, policy] as const),
  ),
);

/** Road bridges whose current topology and bridge axis genuinely coincide. */
export const ROAD_ALIGNED_RIVER_BRIDGE_BINDINGS = Object.freeze([
  { roadId: 'RD-A01', bridgeId: 'BR-A01' },
  { roadId: 'RD-R01', bridgeId: 'BR-A01' },
  { roadId: 'RD-R01', bridgeId: 'BR-R01-WEST' },
  { roadId: 'RD-A03', bridgeId: 'BR-A03-MERIDIAN' },
  { roadId: 'RD-A04', bridgeId: 'BR-A04-RIDGE' },
  { roadId: 'RD-A08', bridgeId: 'BR-A08-APPROACH' },
  { roadId: 'RD-A08', bridgeId: 'BR-E01' },
  { roadId: 'RD-R02', bridgeId: 'BR-E01' },
  { roadId: 'RD-A10', bridgeId: 'BR-W01' },
  { roadId: 'RD-A11', bridgeId: 'BR-A11-HARBOR' },
  { roadId: 'RD-A12', bridgeId: 'BR-A12-ESTUARY' },
] as const);

export const ROAD_BOUND_RIVER_BRIDGE_IDS = Object.freeze([
  ...new Set(
    ROAD_ALIGNED_RIVER_BRIDGE_BINDINGS.map(({ bridgeId }) => bridgeId),
  ),
]);

function interpolatePoint(
  from: WorldPoint,
  to: WorldPoint,
  progress: number,
): WorldPoint {
  return [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
  ];
}

function segmentFrame(segment: Pick<ResolvedRoadSegment, 'from' | 'to'>) {
  const dx = segment.to[0] - segment.from[0];
  const dz = segment.to[1] - segment.from[1];
  const length = Math.hypot(dx, dz);
  const tangent: WorldPoint = [dx / length, dz / length];
  return {
    dx,
    dz,
    length,
    tangent,
    normal: [-tangent[1], tangent[0]] as WorldPoint,
    rotationRadians: Math.atan2(dx, dz),
  };
}

function envelopeWaterProbe(
  segment: ResolvedRoadSegment,
  progress: number,
  isRawWaterXZ: (x: number, z: number) => boolean,
) {
  const frame = segmentFrame(segment);
  const center = interpolatePoint(segment.from, segment.to, progress);
  // Probe the centre first, then fan out symmetrically. This makes the stored
  // probe deterministic while still supporting a sidewalk that overhangs a
  // river even when the carriageway itself remains on land.
  const offsets = [0];
  for (
    let index = 1;
    index <= (CROSS_SECTION_SAMPLE_COUNT - 1) / 2;
    index += 1
  ) {
    const offset =
      (segment.renderedEnvelopeHalfWidth * index * 2) /
      (CROSS_SECTION_SAMPLE_COUNT - 1);
    offsets.push(-offset, offset);
  }
  for (const offset of offsets) {
    const point: WorldPoint = [
      center[0] + frame.normal[0] * offset,
      center[1] + frame.normal[1] * offset,
    ];
    if (isRawWaterXZ(point[0], point[1])) return point;
  }
  return undefined;
}

function refineWaterBoundary(
  segment: ResolvedRoadSegment,
  dryProgress: number,
  wetProgress: number,
  isRawWaterXZ: (x: number, z: number) => boolean,
) {
  let dry = dryProgress;
  let wet = wetProgress;
  for (
    let iteration = 0;
    iteration < BOUNDARY_REFINEMENT_STEPS;
    iteration += 1
  ) {
    const midpoint = (dry + wet) / 2;
    if (envelopeWaterProbe(segment, midpoint, isRawWaterXZ)) wet = midpoint;
    else dry = midpoint;
  }
  return wet;
}

function sampledWaterIntervals(
  segment: ResolvedRoadSegment,
  isRawWaterXZ: (x: number, z: number) => boolean,
) {
  const { length } = segmentFrame(segment);
  const sampleCount = Math.max(1, Math.ceil(length / LONGITUDINAL_SAMPLE_STEP));
  const intervals: WaterInterval[] = [];
  let active: WaterInterval | undefined;
  let previousProgress = 0;
  let previousProbe = envelopeWaterProbe(segment, 0, isRawWaterXZ);
  if (previousProbe) {
    active = { start: 0, end: 0, waterProbe: previousProbe };
  }

  for (let sampleIndex = 1; sampleIndex <= sampleCount; sampleIndex += 1) {
    const progress = sampleIndex / sampleCount;
    const probe = envelopeWaterProbe(segment, progress, isRawWaterXZ);
    if (probe && !previousProbe) {
      const start = refineWaterBoundary(
        segment,
        previousProgress,
        progress,
        isRawWaterXZ,
      );
      active = { start, end: progress, waterProbe: probe };
    } else if (!probe && previousProbe && active) {
      const end = refineWaterBoundary(
        segment,
        progress,
        previousProgress,
        isRawWaterXZ,
      );
      active.end = end;
      intervals.push(active);
      active = undefined;
    } else if (probe && active) {
      active.end = progress;
    }
    previousProgress = progress;
    previousProbe = probe;
  }
  if (active) {
    active.end = 1;
    intervals.push(active);
  }

  const merged: WaterInterval[] = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (
      previous &&
      (interval.start - previous.end) * length <= INTERVAL_MERGE_GAP
    ) {
      previous.end = interval.end;
      continue;
    }
    merged.push({ ...interval });
  }
  const overhangProgress = LAND_ABUTMENT_OVERHANG / length;
  return merged.map((interval) => ({
    ...interval,
    start: Math.max(0, interval.start - overhangProgress),
    end: Math.min(1, interval.end + overhangProgress),
  }));
}

function normalizedAxisDelta(left: number, right: number) {
  let difference = Math.abs(left - right) % Math.PI;
  if (difference > Math.PI / 2) difference = Math.PI - difference;
  return difference;
}

function matchingRoadBridge({
  roadId,
  from,
  to,
  bridges,
  bridgeDeckLength,
}: {
  roadId: string;
  from: WorldPoint;
  to: WorldPoint;
  bridges: readonly RiverBridge[];
  bridgeDeckLength: (bridge: RiverBridge) => number;
}) {
  const bindings = ROAD_ALIGNED_RIVER_BRIDGE_BINDINGS.filter(
    (candidate) => candidate.roadId === roadId,
  );
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const lengthSquared = dx * dx + dz * dz;
  const heading = Math.atan2(dx, dz);
  for (const binding of bindings) {
    const bridge = bridges.find(({ id }) => id === binding.bridgeId);
    if (!bridge) continue;
    const progress = Math.max(
      0,
      Math.min(
        1,
        ((bridge.position[0] - from[0]) * dx +
          (bridge.position[1] - from[1]) * dz) /
          lengthSquared,
      ),
    );
    const nearest = interpolatePoint(from, to, progress);
    const lateralDistance = Math.hypot(
      nearest[0] - bridge.position[0],
      nearest[1] - bridge.position[1],
    );
    const bridgeHeading = (bridge.rotationDegrees * Math.PI) / 180;
    if (
      lateralDistance <= 0.75 &&
      normalizedAxisDelta(heading, bridgeHeading) <= (5 * Math.PI) / 180 &&
      Math.hypot(dx, dz) <=
        bridgeDeckLength(bridge) + 2 * LAND_ABUTMENT_OVERHANG
    )
      return bridge;
  }
  return undefined;
}

export function createRoadWaterCrossings({
  segments,
  roads,
  bridges,
  isRawWaterXZ,
  groundElevationXZ,
  bridgeDeckLength,
}: {
  segments: readonly ResolvedRoadSegment[];
  roads: readonly RoadConnector[];
  bridges: readonly RiverBridge[];
  isRawWaterXZ: (x: number, z: number) => boolean;
  groundElevationXZ: (x: number, z: number) => number;
  bridgeDeckLength: (bridge: RiverBridge) => number;
}): readonly RoadWaterCrossing[] {
  const roadIds = new Set(roads.map(({ id }) => id));
  return segments.flatMap((segment) => {
    if (!roadIds.has(segment.roadId)) {
      throw new Error(`Road segment ${segment.id} has no source road.`);
    }
    return sampledWaterIntervals(segment, isRawWaterXZ).map(
      (interval, intervalIndex): RoadWaterCrossing => {
        const from = interpolatePoint(segment.from, segment.to, interval.start);
        const to = interpolatePoint(segment.from, segment.to, interval.end);
        const bridge = matchingRoadBridge({
          roadId: segment.roadId,
          from,
          to,
          bridges,
          bridgeDeckLength,
        });
        const policy = NON_BRIDGE_WATER_POLICY_BY_SEGMENT.get(segment.id);
        if (!bridge && !policy) {
          throw new Error(
            `Wet road segment ${segment.id} has no reviewed bridge, causeway or viaduct policy.`,
          );
        }
        const surface: RoadWaterCrossingSurface = bridge
          ? 'BRIDGE'
          : policy!.surface;
        return {
          id: `${segment.id}:WATER:${String(intervalIndex + 1).padStart(2, '0')}`,
          roadId: segment.roadId,
          routeSegmentId: segment.id,
          intervalIndex,
          surface,
          structureId: bridge?.id ?? policy!.structureId,
          bridgeId: bridge?.id,
          from,
          to,
          waterProbe: interval.waterProbe,
          renderedEnvelopeHalfWidth: segment.renderedEnvelopeHalfWidth,
          structureHalfWidth:
            segment.renderedEnvelopeHalfWidth + DECK_EDGE_SHOULDER,
          longitudinalOverhang: bridge
            ? 0.08
            : surface === 'SEA_BRIDGE'
              ? segment.width * 0.09 + 0.02
              : segment.width * 0.09 + segment.renderedEnvelopeHalfWidth,
          edgeOffset: segment.renderedEnvelopeHalfWidth + PARAPET_OFFSET,
          startElevation: Math.max(
            MINIMUM_DECK_ELEVATION,
            groundElevationXZ(from[0], from[1]),
          ),
          endElevation: Math.max(
            MINIMUM_DECK_ELEVATION,
            groundElevationXZ(to[0], to[1]),
          ),
        };
      },
    );
  });
}

function crossingLocalCoordinates(
  x: number,
  z: number,
  crossing: Pick<RoadWaterCrossing, 'from' | 'to'>,
) {
  const frame = segmentFrame(crossing);
  const centerX = (crossing.from[0] + crossing.to[0]) / 2;
  const centerZ = (crossing.from[1] + crossing.to[1]) / 2;
  const dx = x - centerX;
  const dz = z - centerZ;
  return {
    lateral: dx * frame.normal[0] + dz * frame.normal[1],
    longitudinal: dx * frame.tangent[0] + dz * frame.tangent[1],
    halfLength: frame.length / 2,
  };
}

export function pointInRoadWaterCrossingXZ(
  x: number,
  z: number,
  crossing: RoadWaterCrossing,
  margin = 0,
) {
  const local = crossingLocalCoordinates(x, z, crossing);
  return (
    Math.abs(local.lateral) <= crossing.structureHalfWidth + margin &&
    Math.abs(local.longitudinal) <=
      local.halfLength + crossing.longitudinalOverhang + margin
  );
}

export function roadWaterCrossingElevationAtXZ(
  x: number,
  z: number,
  crossing: RoadWaterCrossing,
) {
  if (!pointInRoadWaterCrossingXZ(x, z, crossing))
    return Number.NEGATIVE_INFINITY;
  const dx = crossing.to[0] - crossing.from[0];
  const dz = crossing.to[1] - crossing.from[1];
  const lengthSquared = dx * dx + dz * dz;
  const progress = Math.max(
    0,
    Math.min(
      1,
      ((x - crossing.from[0]) * dx + (z - crossing.from[1]) * dz) /
        lengthSquared,
    ),
  );
  return (
    crossing.startElevation +
    (crossing.endElevation - crossing.startElevation) * progress
  );
}

export function createRoadWaterCrossingEdgeMasks(
  crossings: readonly RoadWaterCrossing[],
  endpointTrims: Readonly<Record<string, RoadWaterCrossingEdgeTrim>> = {},
): readonly RoadWaterCrossingEdgeMask[] {
  return crossings.flatMap((crossing) => {
    const frame = segmentFrame(crossing);
    const requestedTrim = endpointTrims[crossing.id];
    return ([-1, 1] as const).flatMap((side) => {
      const sideTrim = side < 0 ? requestedTrim?.left : requestedTrim?.right;
      const startTrim = Math.max(
        0,
        sideTrim?.start ?? requestedTrim?.start ?? 0,
      );
      const endTrim = Math.max(0, sideTrim?.end ?? requestedTrim?.end ?? 0);
      const retainedLength = frame.length - startTrim - endTrim;
      if (retainedLength <= 0.24) return [];
      const center: WorldPoint = [
        crossing.from[0] + frame.tangent[0] * (startTrim + retainedLength / 2),
        crossing.from[1] + frame.tangent[1] * (startTrim + retainedLength / 2),
      ];
      return [
        {
          id: `${crossing.id}:EDGE:${side < 0 ? 'LEFT' : 'RIGHT'}`,
          crossingId: crossing.id,
          side: side < 0 ? ('LEFT' as const) : ('RIGHT' as const),
          center: [
            center[0] + frame.normal[0] * crossing.edgeOffset * side,
            center[1] + frame.normal[1] * crossing.edgeOffset * side,
          ] as WorldPoint,
          halfExtents: [
            PARAPET_HALF_WIDTH,
            retainedLength / 2 + PARAPET_END_OVERHANG,
          ] as WorldPoint,
          rotationRadians: frame.rotationRadians,
        },
      ];
    });
  });
}

export function pointInRoadWaterCrossingEdgeMask(
  x: number,
  z: number,
  mask: RoadWaterCrossingEdgeMask,
  margin = 0,
) {
  const dx = x - mask.center[0];
  const dz = z - mask.center[1];
  const cosine = Math.cos(mask.rotationRadians);
  const sine = Math.sin(mask.rotationRadians);
  const localX = dx * cosine - dz * sine;
  const localZ = dx * sine + dz * cosine;
  return (
    Math.abs(localX) < mask.halfExtents[0] + margin &&
    Math.abs(localZ) < mask.halfExtents[1] + margin
  );
}
