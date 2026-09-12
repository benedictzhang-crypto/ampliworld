import * as THREE from 'three';
import {
  createJoinedOffsetPolyline,
  type LinearPoint,
} from './linear-infrastructure-geometry';
import { WORLD_ROAD_OUTER_MARGIN } from './world-road-geometry';
import { F1_CIRCUIT_POINTS } from './world-spatial-registry';
import {
  GRAND_RIVER_CORRIDOR,
  METERS_PER_WORLD_UNIT,
  RIVER_BRIDGES,
  type RiverBridge,
  type WorldPoint,
} from './world-topology';

export type WorldLinearBarrierKind = 'F1_BARRIER' | 'BRIDGE_RAIL';

export type WorldLinearBarrierMask = Readonly<{
  id: string;
  kind: WorldLinearBarrierKind;
  center: WorldPoint;
  halfExtents: WorldPoint;
  rotationRadians: number;
}>;

export type WorldBridgeRailSpan = WorldLinearBarrierMask &
  Readonly<{
    bridgeId: string;
    side: 'LEFT' | 'RIGHT';
    start: number;
    end: number;
  }>;

const ROAD_WIDTH_SCALE = 0.42;
const BRIDGE_DECK_EDGE_SHOULDER = 0.26;
const RIVER_SAMPLE_COUNT = 176;
const RIVER_MIN_RENDER_WIDTH = Math.max(
  3.2,
  GRAND_RIVER_CORRIDOR.widthMeters[0] / METERS_PER_WORLD_UNIT,
);
const RIVER_MAX_RENDER_WIDTH = Math.max(
  6.4,
  GRAND_RIVER_CORRIDOR.widthMeters[1] / METERS_PER_WORLD_UNIT,
);

type BridgeRailOpening = Readonly<{
  start: number;
  end: number;
}>;

/** Authored at-grade junctions where a bank road passes through a bridge-edge
 * line. Rendering and collision both consume the rail spans left after these
 * openings are cut; there is no invisible collision-only exception. */
export const WORLD_BRIDGE_RAIL_OPENINGS: Readonly<
  Record<string, readonly BridgeRailOpening[]>
> = {
  'BR-A01:LEFT': [
    { start: -10.5, end: -8.5 },
    { start: 8.8, end: 10.5 },
  ],
  'BR-A01:RIGHT': [
    { start: -8.6, end: -7 },
    { start: 7, end: 8.4 },
  ],
  'BR-A03-MERIDIAN:LEFT': [{ start: 5.4, end: 8 }],
  'BR-A03-MERIDIAN:RIGHT': [{ start: -6.5, end: -3.4 }],
  'BR-A04-RIDGE:LEFT': [{ start: 5.5, end: 7 }],
  'BR-A08-APPROACH:RIGHT': [{ start: -0.8, end: 4.8 }],
  'BR-A12-ESTUARY:LEFT': [{ start: -6.6, end: -5.1 }],
  'BR-A12-ESTUARY:RIGHT': [{ start: -6.6, end: -5.1 }],
  'BR-A11-HARBOR:LEFT': [{ start: 3.2, end: 6 }],
  'BR-E01:LEFT': [
    { start: -8.1, end: -6.5 },
    { start: -3.8, end: -1.7 },
    { start: 6.6, end: 8.2 },
  ],
  'BR-E01:RIGHT': [
    { start: -9.8, end: -7.8 },
    { start: -6.1, end: -2.2 },
    { start: 7, end: 8.6 },
  ],
  'BR-P01:LEFT': [{ start: 3.8, end: 6.6 }],
  'BR-R01:LEFT': [{ start: 5.5, end: 8.5 }],
  'BR-R01-WEST:LEFT': [
    { start: -18.2, end: -16.2 },
    { start: 7.1, end: 9.2 },
  ],
  'BR-R01-WEST:RIGHT': [
    { start: -10.2, end: -7.7 },
    { start: 4.4, end: 6.7 },
  ],
  'BR-R02:RIGHT': [
    { start: -1.7, end: 0.7 },
    { start: 1.8, end: 5 },
  ],
  'BR-W01:LEFT': [{ start: 6.9, end: 8.7 }],
  'BR-W01:RIGHT': [{ start: -4.1, end: -1.8 }],
};

function smoothstep(minimum: number, maximum: number, value: number) {
  const progress = THREE.MathUtils.clamp(
    (value - minimum) / (maximum - minimum),
    0,
    1,
  );
  return progress * progress * (3 - 2 * progress);
}

function riverWidthAt(progress: number) {
  const cityWidth = THREE.MathUtils.lerp(
    RIVER_MIN_RENDER_WIDTH,
    RIVER_MAX_RENDER_WIDTH,
    smoothstep(0.08, 0.78, progress),
  );
  return cityWidth + smoothstep(0.78, 1, progress) * 8.5;
}

const RIVER_CURVE = new THREE.CatmullRomCurve3(
  GRAND_RIVER_CORRIDOR.centerline.map(
    ([x, z]) => new THREE.Vector3(x, 0.075, z),
  ),
  false,
  'centripetal',
  0.32,
);

const RIVER_DECK_SAMPLES = Array.from(
  { length: RIVER_SAMPLE_COUNT + 1 },
  (_, index) => {
    const progress = index / RIVER_SAMPLE_COUNT;
    return {
      point: RIVER_CURVE.getPointAt(progress),
      halfWidth: riverWidthAt(progress) / 2,
    };
  },
);

/** Exact deck-length calculation shared with the current continuous river. */
export function getWorldRiverBridgeDeckLength(bridge: RiverBridge) {
  if (bridge.deckLength !== undefined) return bridge.deckLength;
  let nearestSample = RIVER_DECK_SAMPLES[0];
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;
  for (const sample of RIVER_DECK_SAMPLES) {
    const dx = bridge.position[0] - sample.point.x;
    const dz = bridge.position[1] - sample.point.z;
    const distanceSquared = dx * dx + dz * dz;
    if (distanceSquared < nearestDistanceSquared) {
      nearestDistanceSquared = distanceSquared;
      nearestSample = sample;
    }
  }
  return Math.max(12, nearestSample.halfWidth * 2 + 8);
}

/** Visible deck width shared by rendering, traversal and rail collision. Road
 * bridge `width` describes the carriageway; its sidewalk/cycle reservation
 * must remain solid above the river as well. */
export function getWorldRiverBridgeRenderedWidth(bridge: RiverBridge) {
  const isRoadBridge = bridge.class === 'ROAD' || bridge.class === 'BOULEVARD';
  const carriagewayWidth = Math.max(
    isRoadBridge ? 3.6 : 2.8,
    bridge.width * ROAD_WIDTH_SCALE,
  );
  if (!isRoadBridge) return carriagewayWidth;
  return (
    carriagewayWidth + 2 * (WORLD_ROAD_OUTER_MARGIN + BRIDGE_DECK_EDGE_SHOULDER)
  );
}

function segmentMask(
  id: string,
  kind: WorldLinearBarrierKind,
  from: LinearPoint,
  to: LinearPoint,
  halfWidth: number,
  endpointOverlap = 0,
): WorldLinearBarrierMask {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  return {
    id,
    kind,
    center: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2],
    halfExtents: [halfWidth, Math.hypot(dx, dz) / 2 + endpointOverlap],
    rotationRadians: Math.atan2(dx, dz),
  };
}

function buildF1BarrierMasks() {
  const masks: WorldLinearBarrierMask[] = [];
  for (const side of [-1, 1] as const) {
    const barrier = createJoinedOffsetPolyline(F1_CIRCUIT_POINTS, 3.72 * side, {
      closed: true,
    });
    barrier.slice(0, -1).forEach((from, index) => {
      masks.push(
        segmentMask(
          `F1-BARRIER-${side < 0 ? 'INNER' : 'OUTER'}-${index + 1}`,
          'F1_BARRIER',
          from,
          barrier[index + 1],
          0.06,
          0.09,
        ),
      );
      masks.push({
        id: `F1-BARRIER-${side < 0 ? 'INNER' : 'OUTER'}-JOIN-${index + 1}`,
        kind: 'F1_BARRIER',
        center: from,
        halfExtents: [0.12, 0.12],
        rotationRadians: 0,
      });
    });
  }
  return masks;
}

function retainedRailIntervals(
  minimum: number,
  maximum: number,
  openings: readonly BridgeRailOpening[],
) {
  const merged = openings
    .map(({ start, end }) => ({
      start: THREE.MathUtils.clamp(Math.min(start, end), minimum, maximum),
      end: THREE.MathUtils.clamp(Math.max(start, end), minimum, maximum),
    }))
    .filter(({ start, end }) => end - start > 0.01)
    .sort((left, right) => left.start - right.start)
    .reduce<BridgeRailOpening[]>((result, opening) => {
      const previous = result.at(-1);
      if (previous && opening.start <= previous.end) {
        result[result.length - 1] = {
          start: previous.start,
          end: Math.max(previous.end, opening.end),
        };
      } else result.push(opening);
      return result;
    }, []);
  const retained: BridgeRailOpening[] = [];
  let cursor = minimum;
  for (const opening of merged) {
    if (opening.start - cursor > 0.24)
      retained.push({ start: cursor, end: opening.start });
    cursor = Math.max(cursor, opening.end);
  }
  if (maximum - cursor > 0.24) retained.push({ start: cursor, end: maximum });
  return retained;
}

function buildBridgeRailSpans() {
  const spans: WorldBridgeRailSpan[] = [];
  for (const bridge of RIVER_BRIDGES) {
    if (bridge.class === 'METRO') continue;
    const rotationRadians = THREE.MathUtils.degToRad(bridge.rotationDegrees);
    const cosine = Math.cos(rotationRadians);
    const sine = Math.sin(rotationRadians);
    const renderedWidth = getWorldRiverBridgeRenderedWidth(bridge);
    const railLength = getWorldRiverBridgeDeckLength(bridge) + 0.2;
    for (const side of [-1, 1] as const) {
      const sideName = side < 0 ? ('LEFT' as const) : ('RIGHT' as const);
      const localX = side * (renderedWidth / 2 - 0.18);
      const intervals = retainedRailIntervals(
        -railLength / 2,
        railLength / 2,
        WORLD_BRIDGE_RAIL_OPENINGS[`${bridge.id}:${sideName}`] ?? [],
      );
      intervals.forEach(({ start, end }, index) => {
        const localZ = (start + end) / 2;
        spans.push({
          id: `${bridge.id}-RAIL-${sideName}-SPAN-${index + 1}`,
          kind: 'BRIDGE_RAIL',
          bridgeId: bridge.id,
          side: sideName,
          start,
          end,
          center: [
            bridge.position[0] + cosine * localX + sine * localZ,
            bridge.position[1] - sine * localX + cosine * localZ,
          ],
          halfExtents: [0.08, (end - start) / 2],
          rotationRadians,
        });
      });
    }
  }
  return spans;
}

export const F1_BARRIER_COLLISION_MASKS: readonly WorldLinearBarrierMask[] =
  buildF1BarrierMasks();

export const BRIDGE_RAIL_SPANS: readonly WorldBridgeRailSpan[] =
  buildBridgeRailSpans();

export const BRIDGE_RAIL_COLLISION_MASKS: readonly WorldLinearBarrierMask[] =
  BRIDGE_RAIL_SPANS;

export const WORLD_LINEAR_BARRIER_COLLISION_MASKS: readonly WorldLinearBarrierMask[] =
  [...F1_BARRIER_COLLISION_MASKS, ...BRIDGE_RAIL_COLLISION_MASKS];

export function pointInWorldLinearBarrierMask(
  x: number,
  z: number,
  mask: WorldLinearBarrierMask,
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

export function getWorldLinearBarrierAtXZ(x: number, z: number, margin = 0.38) {
  return WORLD_LINEAR_BARRIER_COLLISION_MASKS.find((mask) =>
    pointInWorldLinearBarrierMask(x, z, mask, margin),
  );
}

export function isWorldPointBlockedByLinearBarrier(
  point: WorldPoint,
  margin = 0.38,
) {
  return Boolean(getWorldLinearBarrierAtXZ(point[0], point[1], margin));
}
