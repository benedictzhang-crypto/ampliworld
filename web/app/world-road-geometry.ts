import type { RoadConnector, WorldPoint } from './world-topology';

export type RoadClipObstacle = Readonly<{
  id: string;
  center: WorldPoint;
  halfExtents: WorldPoint;
  rotationRadians?: number;
}>;

export type ClippedRoadSpan = Readonly<{
  id: string;
  roadId: string;
  sourceSegmentIndex: number;
  from: WorldPoint;
  to: WorldPoint;
  width: number;
  outerHalfWidth: number;
}>;

export type ResolvedRoadSegment = Readonly<{
  id: string;
  roadId: string;
  fragmentId: string;
  fragmentSegmentIndex: number;
  /** Original topology segments represented by this simplified segment. */
  sourceSegmentIndices: readonly number[];
  from: WorldPoint;
  to: WorldPoint;
  width: number;
  /** Collision/planning half width of the uninterrupted carriageway. */
  outerHalfWidth: number;
  /** Widest desired visual band; side amenities may yield around buildings. */
  renderedEnvelopeHalfWidth: number;
}>;

export type ResolvedRoadFragment = Readonly<{
  id: string;
  roadId: string;
  role: 'MAIN' | 'NORTH' | 'WEST' | 'EAST' | 'SOUTH';
  width: number;
  outerHalfWidth: number;
  renderedEnvelopeHalfWidth: number;
  /** One uninterrupted centreline. Closed fragments repeat point zero. */
  points: readonly WorldPoint[];
  segments: readonly ResolvedRoadSegment[];
}>;

export type ResolvedRoadRoute = Readonly<{
  id: string;
  road: RoadConnector;
  width: number;
  outerHalfWidth: number;
  renderedEnvelopeHalfWidth: number;
  /** Regular roads have one fragment; divided axes can form a branch graph. */
  fragments: readonly ResolvedRoadFragment[];
  /** Compatibility flattening of every physical branch. */
  segments: readonly ResolvedRoadSegment[];
}>;

type ParameterInterval = readonly [start: number, end: number];

const EPSILON = 1e-7;
const VISIBILITY_EPSILON = 1e-8;
const WAYPOINT_GAP = 0.035;

type ExpandedRoadObstacle = Readonly<{
  source: RoadClipObstacle;
  order: number;
  halfX: number;
  halfZ: number;
  cosine: number;
  sine: number;
  waypointGap: number;
  corners: readonly WorldPoint[];
}>;

type TaggedRoadSegment = Readonly<{
  from: WorldPoint;
  to: WorldPoint;
  sourceSegmentIndices: readonly number[];
}>;

type RoadPathPiece = Readonly<{
  blocked: boolean;
  points: readonly WorldPoint[];
  sourceSegmentIndices: readonly number[];
}>;

/**
 * Farthest visible edge measured from a road surface edge. The walk band is
 * centred 1.58 units beyond the carriageway and is 1.42 units wide, so its
 * outer edge lands at 2.29. We round up to keep every physical reservation,
 * clipping pass and procedural-building clearance on the same envelope.
 */
export const WORLD_ROAD_OUTER_MARGIN = 2.3;
/** Small physical shoulder around the carriageway itself. */
export const WORLD_ROAD_SURFACE_MARGIN = 0.28;

function compareNumbers(left: number, right: number) {
  return Math.abs(left - right) <= EPSILON ? 0 : left - right;
}

function compareWorldPoints(left: WorldPoint, right: WorldPoint) {
  return compareNumbers(left[0], right[0]) || compareNumbers(left[1], right[1]);
}

function pointsEqual(left: WorldPoint, right: WorldPoint) {
  return (
    Math.abs(left[0] - right[0]) <= EPSILON &&
    Math.abs(left[1] - right[1]) <= EPSILON
  );
}

function worldDistance(left: WorldPoint, right: WorldPoint) {
  return Math.hypot(right[0] - left[0], right[1] - left[1]);
}

function obstacleLocalPoint(
  point: WorldPoint,
  obstacle: Pick<ExpandedRoadObstacle, 'source' | 'cosine' | 'sine'>,
): WorldPoint {
  const dx = point[0] - obstacle.source.center[0];
  const dz = point[1] - obstacle.source.center[1];
  return [
    dx * obstacle.cosine - dz * obstacle.sine,
    dx * obstacle.sine + dz * obstacle.cosine,
  ];
}

function obstacleWorldPoint(
  point: WorldPoint,
  obstacle: Pick<ExpandedRoadObstacle, 'source' | 'cosine' | 'sine'>,
): WorldPoint {
  return [
    obstacle.source.center[0] +
      point[0] * obstacle.cosine +
      point[1] * obstacle.sine,
    obstacle.source.center[1] -
      point[0] * obstacle.sine +
      point[1] * obstacle.cosine,
  ];
}

function pointInsideExpandedObstacle(
  point: WorldPoint,
  obstacle: ExpandedRoadObstacle,
) {
  const local = obstacleLocalPoint(point, obstacle);
  return (
    Math.abs(local[0]) < obstacle.halfX - VISIBILITY_EPSILON &&
    Math.abs(local[1]) < obstacle.halfZ - VISIBILITY_EPSILON
  );
}

function segmentIntervalInExpandedObstacle(
  from: WorldPoint,
  to: WorldPoint,
  obstacle: ExpandedRoadObstacle,
): ParameterInterval | undefined {
  const localFrom = obstacleLocalPoint(from, obstacle);
  const localTo = obstacleLocalPoint(to, obstacle);
  const delta: WorldPoint = [
    localTo[0] - localFrom[0],
    localTo[1] - localFrom[1],
  ];
  // Visibility may touch an expanded boundary, but never enter its interior.
  const limits: WorldPoint = [
    obstacle.halfX - VISIBILITY_EPSILON,
    obstacle.halfZ - VISIBILITY_EPSILON,
  ];
  let entry = 0;
  let exit = 1;
  for (let axis = 0; axis < 2; axis += 1) {
    if (Math.abs(delta[axis]) < EPSILON) {
      if (Math.abs(localFrom[axis]) >= limits[axis]) return undefined;
      continue;
    }
    const first = (-limits[axis] - localFrom[axis]) / delta[axis];
    const second = (limits[axis] - localFrom[axis]) / delta[axis];
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
    if (entry > exit - VISIBILITY_EPSILON) return undefined;
  }
  return exit >= 0 && entry <= 1
    ? [Math.max(0, entry), Math.min(1, exit)]
    : undefined;
}

function segmentEntryIntoExpandedObstacle(
  from: WorldPoint,
  to: WorldPoint,
  obstacle: ExpandedRoadObstacle,
) {
  return segmentIntervalInExpandedObstacle(from, to, obstacle)?.[0];
}

function firstBlockingObstacle(
  from: WorldPoint,
  to: WorldPoint,
  obstacles: readonly ExpandedRoadObstacle[],
) {
  let nearest:
    | Readonly<{ obstacle: ExpandedRoadObstacle; progress: number }>
    | undefined;
  for (const obstacle of obstacles) {
    const progress = segmentEntryIntoExpandedObstacle(from, to, obstacle);
    if (progress === undefined) continue;
    if (
      !nearest ||
      progress < nearest.progress - EPSILON ||
      (Math.abs(progress - nearest.progress) <= EPSILON &&
        obstacle.order < nearest.obstacle.order)
    ) {
      nearest = { obstacle, progress };
    }
  }
  return nearest;
}

function isSafeWaypoint(
  point: WorldPoint,
  obstacles: readonly ExpandedRoadObstacle[],
) {
  return obstacles.every(
    (obstacle) => !pointInsideExpandedObstacle(point, obstacle),
  );
}

function makeExpandedObstacles(
  obstacles: readonly RoadClipObstacle[],
  expansion: number,
  cornerGap = WAYPOINT_GAP,
) {
  return [...obstacles]
    .map((source, sourceIndex) => ({ source, sourceIndex }))
    .sort(
      (left, right) =>
        left.source.id.localeCompare(right.source.id) ||
        compareWorldPoints(left.source.center, right.source.center) ||
        compareWorldPoints(left.source.halfExtents, right.source.halfExtents) ||
        compareNumbers(
          left.source.rotationRadians ?? 0,
          right.source.rotationRadians ?? 0,
        ) ||
        left.sourceIndex - right.sourceIndex,
    )
    .map(({ source }, order): ExpandedRoadObstacle => {
      if (
        !Number.isFinite(source.center[0]) ||
        !Number.isFinite(source.center[1]) ||
        !Number.isFinite(source.halfExtents[0]) ||
        !Number.isFinite(source.halfExtents[1]) ||
        source.halfExtents[0] <= 0 ||
        source.halfExtents[1] <= 0
      ) {
        throw new Error(`Road obstacle ${source.id} has invalid geometry.`);
      }
      const rotation = source.rotationRadians ?? 0;
      const obstacle = {
        source,
        order,
        halfX: source.halfExtents[0] + expansion,
        halfZ: source.halfExtents[1] + expansion,
        cosine: Math.cos(rotation),
        sine: Math.sin(rotation),
        waypointGap: cornerGap,
      };
      const cornerX = obstacle.halfX + cornerGap;
      const cornerZ = obstacle.halfZ + cornerGap;
      return {
        ...obstacle,
        corners: (
          [
            [-cornerX, -cornerZ],
            [-cornerX, cornerZ],
            [cornerX, cornerZ],
            [cornerX, -cornerZ],
          ] as const
        ).map((corner) => obstacleWorldPoint(corner, obstacle)),
      };
    });
}

function projectAnchorToSafety(
  anchor: WorldPoint,
  obstacles: readonly ExpandedRoadObstacle[],
  tangent: WorldPoint,
  lateralSide: -1 | 1,
) {
  if (isSafeWaypoint(anchor, obstacles)) return anchor;

  const candidates: WorldPoint[] = [];
  for (const obstacle of obstacles) {
    const local = obstacleLocalPoint(anchor, obstacle);
    const x = Math.max(-obstacle.halfX, Math.min(obstacle.halfX, local[0]));
    const z = Math.max(-obstacle.halfZ, Math.min(obstacle.halfZ, local[1]));
    const outerX = obstacle.halfX + obstacle.waypointGap;
    const outerZ = obstacle.halfZ + obstacle.waypointGap;
    candidates.push(
      obstacleWorldPoint([-outerX, z], obstacle),
      obstacleWorldPoint([outerX, z], obstacle),
      obstacleWorldPoint([x, -outerZ], obstacle),
      obstacleWorldPoint([x, outerZ], obstacle),
      ...obstacle.corners,
    );
  }
  const safe = candidates
    .filter((candidate) => isSafeWaypoint(candidate, obstacles))
    .sort((left, right) => {
      const score = (candidate: WorldPoint) => {
        const dx = candidate[0] - anchor[0];
        const dz = candidate[1] - anchor[1];
        const parallel = Math.abs(dx * tangent[0] + dz * tangent[1]);
        const lateral = (-dx * tangent[1] + dz * tangent[0]) * lateralSide;
        // Leaving sideways preserves the direction of travel. Projecting a
        // buried anchor along its own road can reverse an entire route.
        const wrongSidePenalty =
          lateral < -EPSILON ? 10_000 - lateral * 100 : 0;
        return (
          worldDistance(anchor, candidate) + parallel * 12 + wrongSidePenalty
        );
      };
      return (
        compareNumbers(score(left), score(right)) ||
        compareWorldPoints(left, right)
      );
    });
  const projected = safe[0];
  if (!projected) {
    throw new Error(
      `Road anchor (${anchor[0]}, ${anchor[1]}) cannot be projected outside protected geometry.`,
    );
  }
  return projected;
}

function uniqueSafeCorners(
  activeOrders: ReadonlySet<number>,
  obstacles: readonly ExpandedRoadObstacle[],
) {
  const result: WorldPoint[] = [];
  const containingOrders = new Set<number>();
  for (const obstacle of obstacles) {
    if (!activeOrders.has(obstacle.order)) continue;
    for (const corner of obstacle.corners) {
      const containing = obstacles.filter((candidate) =>
        pointInsideExpandedObstacle(corner, candidate),
      );
      if (containing.length > 0) {
        containing.forEach((candidate) =>
          containingOrders.add(candidate.order),
        );
        continue;
      }
      if (!result.some((candidate) => pointsEqual(candidate, corner))) {
        result.push(corner);
      }
    }
  }
  return { corners: result, containingOrders };
}

function shortestVisiblePath(
  from: WorldPoint,
  to: WorldPoint,
  obstacles: readonly ExpandedRoadObstacle[],
): readonly WorldPoint[] {
  const initialBlocker = firstBlockingObstacle(from, to, obstacles);
  if (!initialBlocker) return [from, to];

  const activeOrders = new Set<number>([initialBlocker.obstacle.order]);
  for (
    let expansionPass = 0;
    expansionPass <= obstacles.length;
    expansionPass += 1
  ) {
    const safeCorners = uniqueSafeCorners(activeOrders, obstacles);
    const nodes = [from, to, ...safeCorners.corners];
    const adjacency: Array<Array<readonly [node: number, cost: number]>> =
      Array.from({ length: nodes.length }, () => []);
    const newlyBlocked = new Set<number>();
    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        if (pointsEqual(nodes[left], nodes[right])) continue;
        const blocker = firstBlockingObstacle(
          nodes[left],
          nodes[right],
          obstacles,
        );
        if (blocker) {
          if (!activeOrders.has(blocker.obstacle.order)) {
            newlyBlocked.add(blocker.obstacle.order);
          }
          continue;
        }
        const cost = worldDistance(nodes[left], nodes[right]);
        adjacency[left].push([right, cost]);
        adjacency[right].push([left, cost]);
      }
    }

    const distances = Array.from({ length: nodes.length }, () => Infinity);
    const previous = Array.from({ length: nodes.length }, () => -1);
    const visited = Array.from({ length: nodes.length }, () => false);
    distances[0] = 0;
    for (let visit = 0; visit < nodes.length; visit += 1) {
      let current = -1;
      for (let node = 0; node < nodes.length; node += 1) {
        if (
          !visited[node] &&
          (current < 0 ||
            distances[node] < distances[current] - EPSILON ||
            (Math.abs(distances[node] - distances[current]) <= EPSILON &&
              node < current))
        ) {
          current = node;
        }
      }
      if (current < 0 || !Number.isFinite(distances[current])) break;
      if (current === 1) break;
      visited[current] = true;
      for (const [next, cost] of adjacency[current]) {
        const distance = distances[current] + cost;
        if (
          distance < distances[next] - EPSILON ||
          (Math.abs(distance - distances[next]) <= EPSILON &&
            current < previous[next])
        ) {
          distances[next] = distance;
          previous[next] = current;
        }
      }
    }
    if (Number.isFinite(distances[1])) {
      const reversed: WorldPoint[] = [];
      for (let cursor = 1; cursor >= 0; cursor = previous[cursor]) {
        reversed.push(nodes[cursor]);
        if (cursor === 0) break;
      }
      if (!pointsEqual(reversed.at(-1) ?? to, from)) break;
      return reversed.reverse();
    }

    let added = false;
    for (const order of [...newlyBlocked, ...safeCorners.containingOrders]) {
      if (activeOrders.has(order)) continue;
      activeOrders.add(order);
      added = true;
    }
    if (!added) break;
  }
  throw new Error(
    `No continuous road route can avoid protected geometry between (${from[0]}, ${from[1]}) and (${to[0]}, ${to[1]}).`,
  );
}

function appendSimplifiedSegment(
  target: TaggedRoadSegment[],
  from: WorldPoint,
  to: WorldPoint,
  sourceSegmentIndices: readonly number[],
) {
  if (pointsEqual(from, to)) return;
  const previous = target.at(-1);
  if (previous && pointsEqual(previous.to, from)) {
    const previousX = previous.to[0] - previous.from[0];
    const previousZ = previous.to[1] - previous.from[1];
    const nextX = to[0] - from[0];
    const nextZ = to[1] - from[1];
    const cross = previousX * nextZ - previousZ * nextX;
    const scale = Math.max(
      1,
      Math.hypot(previousX, previousZ) * Math.hypot(nextX, nextZ),
    );
    if (
      Math.abs(cross) <= EPSILON * scale &&
      previousX * nextX + previousZ * nextZ > 0
    ) {
      const mergedSourceSegmentIndices = [
        ...new Set([...previous.sourceSegmentIndices, ...sourceSegmentIndices]),
      ].sort((left, right) => left - right);
      target[target.length - 1] = {
        from: previous.from,
        to,
        sourceSegmentIndices: mergedSourceSegmentIndices,
      };
      return;
    }
  }
  target.push({
    from,
    to,
    sourceSegmentIndices: [...sourceSegmentIndices].sort(
      (left, right) => left - right,
    ),
  });
}

function pointAlongSegment(
  from: WorldPoint,
  to: WorldPoint,
  progress: number,
): WorldPoint {
  return [
    from[0] + (to[0] - from[0]) * progress,
    from[1] + (to[1] - from[1]) * progress,
  ];
}

function appendRoadPiece(target: RoadPathPiece[], piece: RoadPathPiece) {
  const length = worldDistance(
    piece.points[0],
    piece.points.at(-1) ?? piece.points[0],
  );
  if (length <= EPSILON) return;
  const previous = target.at(-1);
  if (
    piece.blocked &&
    previous?.blocked &&
    pointsEqual(previous.points.at(-1) ?? previous.points[0], piece.points[0])
  ) {
    target[target.length - 1] = {
      blocked: true,
      points: [...previous.points, ...piece.points.slice(1)],
      sourceSegmentIndices: [
        ...new Set([
          ...previous.sourceSegmentIndices,
          ...piece.sourceSegmentIndices,
        ]),
      ].sort((left, right) => left - right),
    };
    return;
  }
  target.push(piece);
}

function roadPathPieces(
  road: RoadConnector,
  obstacles: readonly ExpandedRoadObstacle[],
  endpointOverhang: number,
) {
  const pieces: RoadPathPiece[] = [];
  road.points.slice(0, -1).forEach((from, sourceSegmentIndex) => {
    const to = road.points[sourceSegmentIndex + 1];
    const length = worldDistance(from, to);
    const intervalPadding = endpointOverhang / Math.max(length, EPSILON);
    const intervals = mergeIntervals(
      obstacles.flatMap((obstacle) => {
        const interval = segmentIntervalInExpandedObstacle(from, to, obstacle);
        return interval
          ? [
              [
                Math.max(0, interval[0] - intervalPadding),
                Math.min(1, interval[1] + intervalPadding),
              ] as ParameterInterval,
            ]
          : [];
      }),
    );
    let cursor = 0;
    for (const interval of intervals) {
      if (interval[0] > cursor + EPSILON) {
        appendRoadPiece(pieces, {
          blocked: false,
          points: [
            pointAlongSegment(from, to, cursor),
            pointAlongSegment(from, to, interval[0]),
          ],
          sourceSegmentIndices: [sourceSegmentIndex],
        });
      }
      appendRoadPiece(pieces, {
        blocked: true,
        points: [
          pointAlongSegment(from, to, interval[0]),
          pointAlongSegment(from, to, interval[1]),
        ],
        sourceSegmentIndices: [sourceSegmentIndex],
      });
      cursor = Math.max(cursor, interval[1]);
    }
    if (cursor < 1 - EPSILON) {
      appendRoadPiece(pieces, {
        blocked: false,
        points: [pointAlongSegment(from, to, cursor), to],
        sourceSegmentIndices: [sourceSegmentIndex],
      });
    }
  });

  if (road.class === 'RING' && pieces[0]?.blocked && pieces.at(-1)?.blocked) {
    const first = pieces[0];
    const last = pieces.at(-1);
    if (last) {
      const seamRun: RoadPathPiece = {
        blocked: true,
        points: [...last.points, ...first.points.slice(1)],
        sourceSegmentIndices: [
          ...new Set([
            ...last.sourceSegmentIndices,
            ...first.sourceSegmentIndices,
          ]),
        ].sort((left, right) => left - right),
      };
      pieces.splice(0, 1);
      pieces.splice(pieces.length - 1, 1);
      pieces.push(seamRun);
    }
  }
  return pieces;
}

function anchorTangent(
  points: readonly WorldPoint[],
  index: number,
  closed: boolean,
) {
  const uniqueLength = closed ? points.length - 1 : points.length;
  const previousIndex =
    index === 0 ? (closed ? uniqueLength - 1 : 0) : index - 1;
  const nextIndex =
    index >= uniqueLength - 1 ? (closed ? 0 : uniqueLength - 1) : index + 1;
  const dx = points[nextIndex][0] - points[previousIndex][0];
  const dz = points[nextIndex][1] - points[previousIndex][1];
  const length = Math.hypot(dx, dz);
  return length > EPSILON
    ? ([dx / length, dz / length] as WorldPoint)
    : ([1, 0] as WorldPoint);
}

function routeLength(segments: readonly TaggedRoadSegment[]) {
  return segments.reduce(
    (total, segment) => total + worldDistance(segment.from, segment.to),
    0,
  );
}

type FragmentPlan = Readonly<{
  id: string;
  role: ResolvedRoadFragment['role'];
  points: readonly WorldPoint[];
  width: number;
  sourceIndexMap: readonly number[];
}>;

function fragmentPlansForRoad(
  road: RoadConnector,
  width: number,
): readonly FragmentPlan[] {
  if (road.id !== 'RD-A01') {
    return [
      {
        id: `${road.id}:MAIN`,
        role: 'MAIN' as const,
        points: road.points,
        width,
        sourceIndexMap: road.points.slice(0, -1).map((_, index) => index),
      },
    ];
  }

  // The capital axis becomes two 4.8-unit carriageways only through the
  // constrained CBD parcel. Both branches share exact merge junctions with
  // the original full-width northern and southern avenue.
  const northJunction: WorldPoint = [0, 25];
  const southJunction: WorldPoint = [0, -51];
  return [
    {
      id: `${road.id}:NORTH`,
      role: 'NORTH' as const,
      points: [...road.points.slice(0, 3), northJunction],
      width,
      sourceIndexMap: [0, 1, 2],
    },
    {
      id: `${road.id}:WEST`,
      role: 'WEST' as const,
      points: [
        northJunction,
        [-11.5, 21],
        [-11.5, 5],
        [-11.5, -18],
        [-12.5, -24],
        [-12.5, -46],
        [-8, -49.5],
        southJunction,
      ],
      width: 4.8,
      sourceIndexMap: [3, 3, 4, 4, 4, 5, 5],
    },
    {
      id: `${road.id}:EAST`,
      role: 'EAST' as const,
      points: [
        northJunction,
        [11.5, 21],
        [11.5, 5],
        [11.5, -18],
        [12.5, -24],
        [12.5, -46],
        [8, -49.5],
        southJunction,
      ],
      width: 4.8,
      sourceIndexMap: [3, 3, 4, 4, 4, 5, 5],
    },
    {
      id: `${road.id}:SOUTH`,
      role: 'SOUTH' as const,
      points: [southJunction, road.points.at(-1) ?? [0, -78]],
      width,
      sourceIndexMap: [5],
    },
  ];
}

function resolveRoadFragment({
  road,
  plan,
  obstacles,
  outerMargin,
  clearance,
  preserveAuthoredCenterline,
}: {
  road: RoadConnector;
  plan: FragmentPlan;
  obstacles: readonly RoadClipObstacle[];
  outerMargin: number;
  clearance: number;
  preserveAuthoredCenterline: boolean;
}): ResolvedRoadFragment {
  const fragmentRoad: RoadConnector = { ...road, points: plan.points };
  const width = plan.width;
  const outerHalfWidth = width / 2 + outerMargin;
  const renderedEnvelopeHalfWidth =
    width / 2 +
    (road.modes?.includes('WALK')
      ? WORLD_ROAD_OUTER_MARGIN
      : road.modes?.includes('CYCLE')
        ? 0.87
        : 0);
  const endpointOverhang = width * 0.09;
  const isRing =
    road.class === 'RING' &&
    pointsEqual(plan.points[0], plan.points.at(-1) ?? plan.points[0]);

  if (preserveAuthoredCenterline) {
    const points = [...plan.points];
    if (isRing) points[points.length - 1] = points[0];
    const segments = points.slice(0, -1).map(
      (from, fragmentSegmentIndex): ResolvedRoadSegment => ({
        id: `${plan.id}:${fragmentSegmentIndex + 1}`,
        roadId: road.id,
        fragmentId: plan.id,
        fragmentSegmentIndex,
        sourceSegmentIndices: [
          plan.sourceIndexMap[fragmentSegmentIndex] ?? fragmentSegmentIndex,
        ],
        from,
        to: points[fragmentSegmentIndex + 1],
        width,
        outerHalfWidth,
        renderedEnvelopeHalfWidth,
      }),
    );
    return {
      id: plan.id,
      roadId: road.id,
      role: plan.role,
      width,
      outerHalfWidth,
      renderedEnvelopeHalfWidth,
      points,
      segments,
    };
  }

  const expandedObstacles = makeExpandedObstacles(
    obstacles,
    outerHalfWidth + clearance,
    endpointOverhang + WAYPOINT_GAP,
  );
  const candidates = ([-1, 1] as const).flatMap((lateralSide) => {
    try {
      const pieces = roadPathPieces(
        fragmentRoad,
        expandedObstacles,
        endpointOverhang,
      ).map((piece, pieceIndex, allPieces): RoadPathPiece => {
        const remappedPiece = {
          ...piece,
          sourceSegmentIndices: [
            ...new Set(
              piece.sourceSegmentIndices.map(
                (index) => plan.sourceIndexMap[index] ?? index,
              ),
            ),
          ].sort((left, right) => left - right),
        };
        if (isRing || !piece.blocked) return remappedPiece;
        const points = [...piece.points];
        if (pieceIndex === 0) {
          points[0] = projectAnchorToSafety(
            plan.points[0],
            expandedObstacles,
            anchorTangent(plan.points, 0, false),
            lateralSide,
          );
        }
        if (pieceIndex === allPieces.length - 1) {
          points[points.length - 1] = projectAnchorToSafety(
            plan.points.at(-1) ?? plan.points[0],
            expandedObstacles,
            anchorTangent(plan.points, plan.points.length - 1, false),
            lateralSide,
          );
        }
        return { ...remappedPiece, points };
      });
      const taggedSegments: TaggedRoadSegment[] = [];
      for (const piece of pieces) {
        const path = piece.blocked
          ? shortestVisiblePath(
              piece.points[0],
              piece.points.at(-1) ?? piece.points[0],
              expandedObstacles,
            )
          : piece.points;
        for (let index = 0; index < path.length - 1; index += 1) {
          appendSimplifiedSegment(
            taggedSegments,
            path[index],
            path[index + 1],
            piece.sourceSegmentIndices,
          );
        }
      }
      return [taggedSegments];
    } catch {
      return [];
    }
  });
  const taggedSegments = candidates.sort(
    (left, right) => routeLength(left) - routeLength(right),
  )[0];
  if (!taggedSegments || taggedSegments.length === 0) {
    throw new Error(
      `Road fragment ${plan.id} has no obstacle-safe lateral route.`,
    );
  }

  const points: WorldPoint[] = [
    taggedSegments[0].from,
    ...taggedSegments.map((segment) => segment.to),
  ];
  const plannedStart = plan.points[0];
  if (pointsEqual(points[0], plannedStart)) {
    points[0] = plannedStart;
    taggedSegments[0] = { ...taggedSegments[0], from: plannedStart };
  }
  const plannedEnd = plan.points.at(-1) ?? plannedStart;
  if (pointsEqual(points.at(-1) ?? points[0], plannedEnd)) {
    points[points.length - 1] = plannedEnd;
    const finalSegment = taggedSegments.at(-1);
    if (finalSegment) {
      taggedSegments[taggedSegments.length - 1] = {
        ...finalSegment,
        to: plannedEnd,
      };
    }
  }
  if (isRing) {
    points[points.length - 1] = points[0];
    const finalSegment = taggedSegments.at(-1);
    if (finalSegment) {
      taggedSegments[taggedSegments.length - 1] = {
        ...finalSegment,
        to: points[0],
      };
    }
  }
  const segments = taggedSegments.map(
    (segment, fragmentSegmentIndex): ResolvedRoadSegment => ({
      id: `${plan.id}:${fragmentSegmentIndex + 1}`,
      roadId: road.id,
      fragmentId: plan.id,
      fragmentSegmentIndex,
      sourceSegmentIndices: segment.sourceSegmentIndices,
      from: segment.from,
      to: segment.to,
      width,
      outerHalfWidth,
      renderedEnvelopeHalfWidth,
    }),
  );
  return {
    id: plan.id,
    roadId: road.id,
    role: plan.role,
    width,
    outerHalfWidth,
    renderedEnvelopeHalfWidth,
    points,
    segments,
  };
}

/**
 * Resolve topology roads into an obstacle-safe physical surface graph.
 * Architecture is expanded only by the carriageway and its small shoulder;
 * sidewalks and cycleways yield independently in the rendering layer.
 */
export function resolveRoadRoutes({
  roads,
  obstacles,
  renderWidth,
  outerMargin = WORLD_ROAD_SURFACE_MARGIN,
  clearance = 0,
  preserveAuthoredCenterlines = false,
}: {
  roads: readonly RoadConnector[];
  obstacles: readonly RoadClipObstacle[];
  renderWidth: (road: Pick<RoadConnector, 'width'>) => number;
  outerMargin?: number;
  clearance?: number;
  /** Keep a master-planned centreline exact; CI must validate its swept OBBs. */
  preserveAuthoredCenterlines?: boolean;
}): readonly ResolvedRoadRoute[] {
  if (outerMargin < 0 || clearance < 0) {
    throw new Error('Road outer margin and clearance must be non-negative.');
  }
  return roads.map((road) => {
    if (road.points.length < 2) {
      throw new Error(`Road ${road.id} needs at least two topology anchors.`);
    }
    const width = renderWidth(road);
    if (!Number.isFinite(width) || width <= 0) {
      throw new Error(`Road ${road.id} resolved to an invalid render width.`);
    }
    const fragments = fragmentPlansForRoad(road, width).map((plan) =>
      resolveRoadFragment({
        road,
        plan,
        obstacles,
        outerMargin,
        clearance,
        preserveAuthoredCenterline: preserveAuthoredCenterlines,
      }),
    );
    const segments = fragments.flatMap((fragment) => fragment.segments);
    return {
      id: road.id,
      road,
      width,
      outerHalfWidth: width / 2 + outerMargin,
      renderedEnvelopeHalfWidth: Math.max(
        ...fragments.map((fragment) => fragment.renderedEnvelopeHalfWidth),
      ),
      fragments,
      segments,
    };
  });
}

function axesFor(obstacle: RoadClipObstacle) {
  const angle = obstacle.rotationRadians ?? 0;
  return [
    [Math.cos(angle), -Math.sin(angle)] as WorldPoint,
    [Math.sin(angle), Math.cos(angle)] as WorldPoint,
  ] as const;
}

function blockedParameterInterval(
  from: WorldPoint,
  to: WorldPoint,
  outerHalfWidth: number,
  endpointOverhang: number,
  obstacle: RoadClipObstacle,
  clearance: number,
): ParameterInterval | undefined {
  const deltaX = to[0] - from[0];
  const deltaZ = to[1] - from[1];
  const length = Math.hypot(deltaX, deltaZ);
  if (length < EPSILON) return undefined;

  const tangent: WorldPoint = [deltaX / length, deltaZ / length];
  const normal: WorldPoint = [-tangent[1], tangent[0]];
  const relativeFrom: WorldPoint = [
    from[0] - obstacle.center[0],
    from[1] - obstacle.center[1],
  ];
  const obstacleAxes = axesFor(obstacle);

  const normalDistance = Math.abs(
    relativeFrom[0] * normal[0] + relativeFrom[1] * normal[1],
  );
  const obstacleRadiusOnNormal =
    obstacle.halfExtents[0] *
      Math.abs(
        obstacleAxes[0][0] * normal[0] + obstacleAxes[0][1] * normal[1],
      ) +
    obstacle.halfExtents[1] *
      Math.abs(obstacleAxes[1][0] * normal[0] + obstacleAxes[1][1] * normal[1]);
  if (normalDistance >= obstacleRadiusOnNormal + outerHalfWidth + clearance)
    return undefined;

  let intervalStart = 0;
  let intervalEnd = 1;
  for (let axisIndex = 0; axisIndex < obstacleAxes.length; axisIndex += 1) {
    const axis = obstacleAxes[axisIndex];
    const startProjection =
      relativeFrom[0] * axis[0] + relativeFrom[1] * axis[1];
    const velocity = deltaX * axis[0] + deltaZ * axis[1];
    const crossSectionRadius =
      outerHalfWidth * Math.abs(normal[0] * axis[0] + normal[1] * axis[1]);
    const limit =
      obstacle.halfExtents[axisIndex] + crossSectionRadius + clearance;
    if (Math.abs(velocity) < EPSILON) {
      if (Math.abs(startProjection) >= limit) return undefined;
      continue;
    }
    const first = (-limit - startProjection) / velocity;
    const second = (limit - startProjection) / velocity;
    intervalStart = Math.max(intervalStart, Math.min(first, second));
    intervalEnd = Math.min(intervalEnd, Math.max(first, second));
    if (intervalStart >= intervalEnd) return undefined;
  }

  // Instanced road boxes overhang their endpoints slightly. Expand the removed
  // interval so that those caps cannot re-enter a building footprint.
  const endpointPadding = (clearance + endpointOverhang) / length;
  return [
    Math.max(0, intervalStart - endpointPadding),
    Math.min(1, intervalEnd + endpointPadding),
  ];
}

function mergeIntervals(intervals: readonly ParameterInterval[]) {
  const ordered = [...intervals].sort((left, right) => left[0] - right[0]);
  const merged: ParameterInterval[] = [];
  for (const interval of ordered) {
    const previous = merged.at(-1);
    if (!previous || interval[0] > previous[1] + EPSILON) {
      merged.push(interval);
      continue;
    }
    merged[merged.length - 1] = [
      previous[0],
      Math.max(previous[1], interval[1]),
    ];
  }
  return merged;
}

/**
 * Subtract solid architecture from visible road, sidewalk and cycleway bands.
 * The topology remains continuous; detailed districts provide their own local
 * streets wherever a global surface span is removed.
 */
export function createClippedRoadSpans({
  roads,
  obstacles,
  renderWidth,
  outerMargin = WORLD_ROAD_OUTER_MARGIN,
  clearance = 0.18,
  minimumLength = 0.45,
}: {
  roads: readonly RoadConnector[];
  obstacles: readonly RoadClipObstacle[];
  renderWidth: (road: Pick<RoadConnector, 'width'>) => number;
  outerMargin?: number;
  clearance?: number;
  minimumLength?: number;
}): readonly ClippedRoadSpan[] {
  const spans: ClippedRoadSpan[] = [];
  for (const road of roads) {
    const width = renderWidth(road);
    const outerHalfWidth = width / 2 + outerMargin;
    road.points.slice(0, -1).forEach((from, sourceSegmentIndex) => {
      const to = road.points[sourceSegmentIndex + 1];
      const deltaX = to[0] - from[0];
      const deltaZ = to[1] - from[1];
      const length = Math.hypot(deltaX, deltaZ);
      if (length < EPSILON) return;
      const blocked = mergeIntervals(
        obstacles.flatMap((obstacle) => {
          const interval = blockedParameterInterval(
            from,
            to,
            outerHalfWidth,
            width * 0.09,
            obstacle,
            clearance,
          );
          return interval ? [interval] : [];
        }),
      );
      let cursor = 0;
      const openIntervals: ParameterInterval[] = [];
      for (const interval of blocked) {
        if (interval[0] > cursor + EPSILON)
          openIntervals.push([cursor, interval[0]]);
        cursor = Math.max(cursor, interval[1]);
      }
      if (cursor < 1 - EPSILON) openIntervals.push([cursor, 1]);
      openIntervals.forEach(([start, end], fragmentIndex) => {
        if ((end - start) * length < minimumLength) return;
        spans.push({
          id: `${road.id}:${sourceSegmentIndex + 1}:${fragmentIndex + 1}`,
          roadId: road.id,
          sourceSegmentIndex,
          from: [from[0] + deltaX * start, from[1] + deltaZ * start],
          to: [from[0] + deltaX * end, from[1] + deltaZ * end],
          width,
          outerHalfWidth,
        });
      });
    });
  }
  return spans;
}
