export type LinearPoint = readonly [x: number, z: number];

export type JoinedPolylineOptions = Readonly<{
  closed?: boolean;
  miterLimit?: number;
}>;

const EPSILON = 1e-9;

function samePoint(a: LinearPoint, b: LinearPoint) {
  return Math.abs(a[0] - b[0]) < EPSILON && Math.abs(a[1] - b[1]) < EPSILON;
}

function normalizedDirection(from: LinearPoint, to: LinearPoint): LinearPoint {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  if (length < EPSILON) return [0, 0];
  return [dx / length, dz / length];
}

function offsetPoint(
  point: LinearPoint,
  direction: LinearPoint,
  offset: number,
): LinearPoint {
  return [point[0] - direction[1] * offset, point[1] + direction[0] * offset];
}

function intersectLines(
  firstPoint: LinearPoint,
  firstDirection: LinearPoint,
  secondPoint: LinearPoint,
  secondDirection: LinearPoint,
): LinearPoint | null {
  const determinant =
    firstDirection[0] * secondDirection[1] -
    firstDirection[1] * secondDirection[0];
  if (Math.abs(determinant) < EPSILON) return null;
  const deltaX = secondPoint[0] - firstPoint[0];
  const deltaZ = secondPoint[1] - firstPoint[1];
  const progress =
    (deltaX * secondDirection[1] - deltaZ * secondDirection[0]) / determinant;
  return [
    firstPoint[0] + firstDirection[0] * progress,
    firstPoint[1] + firstDirection[1] * progress,
  ];
}

/**
 * Build a single offset polyline whose neighbouring segments share one exact
 * junction. This avoids the gaps produced when every segment is offset using
 * only its own normal. Acute corners are capped by a deterministic miter limit.
 */
export function createJoinedOffsetPolyline(
  sourcePoints: readonly LinearPoint[],
  offset: number,
  options: JoinedPolylineOptions = {},
): readonly LinearPoint[] {
  if (sourcePoints.length < 2) return sourcePoints.map((point) => [...point]);

  const sourceIsClosed = samePoint(sourcePoints[0], sourcePoints.at(-1)!);
  const closed = options.closed ?? sourceIsClosed;
  const points =
    closed && sourceIsClosed ? sourcePoints.slice(0, -1) : sourcePoints;
  if (points.length < 2) return points.map((point) => [...point]);

  const directions = points.map((point, index) => {
    if (!closed && index === points.length - 1) return [0, 0] as LinearPoint;
    return normalizedDirection(point, points[(index + 1) % points.length]);
  });
  const miterLimit = Math.max(1, options.miterLimit ?? 3.5);

  const joined = points.map((point, index): LinearPoint => {
    if (!closed && index === 0)
      return offsetPoint(point, directions[0], offset);
    if (!closed && index === points.length - 1)
      return offsetPoint(point, directions[index - 1], offset);

    const previousDirection =
      directions[(index - 1 + directions.length) % directions.length];
    const nextDirection = directions[index];
    const previousOffset = offsetPoint(point, previousDirection, offset);
    const nextOffset = offsetPoint(point, nextDirection, offset);
    const intersection = intersectLines(
      previousOffset,
      previousDirection,
      nextOffset,
      nextDirection,
    );
    if (!intersection) {
      return [
        (previousOffset[0] + nextOffset[0]) / 2,
        (previousOffset[1] + nextOffset[1]) / 2,
      ];
    }

    const deltaX = intersection[0] - point[0];
    const deltaZ = intersection[1] - point[1];
    const miterLength = Math.hypot(deltaX, deltaZ);
    const maximumMiter = Math.max(Math.abs(offset), EPSILON) * miterLimit;
    if (miterLength <= maximumMiter || Math.abs(offset) < EPSILON)
      return intersection;

    const scale = maximumMiter / miterLength;
    return [point[0] + deltaX * scale, point[1] + deltaZ * scale];
  });

  return closed ? [...joined, joined[0]] : joined;
}

export function getPolylineJunctionIndices(
  points: readonly LinearPoint[],
  closed = samePoint(points[0], points.at(-1) ?? points[0]),
) {
  if (points.length < 3) return [];
  if (closed)
    return Array.from({ length: points.length - 1 }, (_, index) => index);
  return Array.from({ length: points.length - 2 }, (_, index) => index + 1);
}

export function createPolylineSegments(points: readonly LinearPoint[]) {
  return points.slice(0, -1).map((from, index) => ({
    from,
    to: points[index + 1],
  }));
}

/** End positions for a centered rail/span, including a symmetric overhang. */
export function getCenteredSpanEnds(length: number, overhang = 0) {
  const halfSpan = Math.max(0, length) / 2 + Math.max(0, overhang);
  return [-halfSpan, halfSpan] as const;
}
