import * as THREE from 'three';

export type CameraOcclusionPredicate = (position: {
  x: number;
  y: number;
  z: number;
}) => boolean;

// Preferred escape direction first, followed by increasingly lateral options.
// This array is allocated once; the per-frame resolver remains allocation-free.
const CAMERA_ESCAPE_ANGLE_OFFSETS = [
  0,
  Math.PI / 8,
  -Math.PI / 8,
  Math.PI / 4,
  -Math.PI / 4,
  (Math.PI * 3) / 8,
  (-Math.PI * 3) / 8,
  Math.PI / 2,
  -Math.PI / 2,
  (Math.PI * 5) / 8,
  (-Math.PI * 5) / 8,
  (Math.PI * 3) / 4,
  (-Math.PI * 3) / 4,
  (Math.PI * 7) / 8,
  (-Math.PI * 7) / 8,
  Math.PI,
] as const;

/**
 * Resolve a trailing camera against an opaque world predicate without ever
 * deliberately advancing it into the first obstruction. If the player's
 * shoulder-height anchor sits inside a wider camera-clearance envelope, the
 * resolver first finds the nearest clear point on the player's side of the
 * wall instead of snapping the camera through the wall.
 */
export function resolveCameraOcclusion(
  anchor: THREE.Vector3,
  desired: THREE.Vector3,
  output: THREE.Vector3,
  probe: THREE.Vector3,
  predicate?: CameraOcclusionPredicate,
) {
  output.copy(desired);
  if (!predicate) return false;

  if (predicate(anchor)) {
    const awayX = anchor.x - desired.x;
    const awayZ = anchor.z - desired.z;
    const preferredAngle = Math.atan2(awayX, awayZ);
    for (let ring = 1; ring <= 70; ring += 1) {
      const radius = ring * 0.12;
      for (const angleOffset of CAMERA_ESCAPE_ANGLE_OFFSETS) {
        const angle = preferredAngle + angleOffset;
        probe.set(
          anchor.x + Math.sin(angle) * radius,
          anchor.y,
          anchor.z + Math.cos(angle) * radius,
        );
        if (!predicate(probe)) {
          output.copy(probe);
          return true;
        }
      }
    }

    // A valid player anchor should always have a clear side within the 8.4 m
    // search radius. Preserve the anchor as the least disruptive fallback only
    // if a custom predicate violates that contract by enclosing it completely.
    output.copy(anchor);
    return true;
  }

  const distance = anchor.distanceTo(desired);
  const steps = Math.max(4, Math.ceil(distance / 0.24));
  for (let index = 1; index <= steps; index += 1) {
    const progress = index / steps;
    probe.lerpVectors(anchor, desired, progress);
    if (predicate(probe)) {
      output.lerpVectors(anchor, desired, Math.max(0, (index - 2) / steps));
      if (predicate(output)) output.copy(anchor);
      return true;
    }
  }
  return false;
}

/** Camera-safe interior volume, inset from the rendered studio wall faces. */
export function isStudioCameraPointOccluded(position: {
  x: number;
  y: number;
  z: number;
}) {
  return (
    position.x <= -4 ||
    position.x >= 4 ||
    position.y <= 0.12 ||
    position.y >= 4.15 ||
    position.z <= -4.2 ||
    position.z >= 3.95
  );
}
