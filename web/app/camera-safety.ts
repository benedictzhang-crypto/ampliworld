import * as THREE from 'three';

export type CameraOcclusionPredicate = (position: {
  x: number;
  y: number;
  z: number;
}) => boolean;

/** Keep a resolved third-person camera outside the shipped hero's upper body. */
export const CAMERA_MIN_ANCHOR_DISTANCE = 1.02;
export const CAMERA_AVATAR_HIDE_DISTANCE = 0.9;

const CAMERA_PROBE_SPACING = 0.12;
const CAMERA_MAX_ESCAPE_RING = 70;
const CAMERA_MIN_ESCAPE_RING = Math.ceil(
  CAMERA_MIN_ANCHOR_DISTANCE / CAMERA_PROBE_SPACING,
);

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

function findClearCameraEscape(
  anchor: THREE.Vector3,
  desired: THREE.Vector3,
  output: THREE.Vector3,
  probe: THREE.Vector3,
  predicate: CameraOcclusionPredicate,
) {
  const awayX = anchor.x - desired.x;
  const awayZ = anchor.z - desired.z;
  const preferredAngle = Math.atan2(awayX, awayZ);
  for (
    let ring = CAMERA_MIN_ESCAPE_RING;
    ring <= CAMERA_MAX_ESCAPE_RING;
    ring += 1
  ) {
    const radius = ring * CAMERA_PROBE_SPACING;
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

  // Dense foliage can surround the horizontal ring while leaving open sky.
  for (let step = CAMERA_MIN_ESCAPE_RING; step <= 28; step += 1) {
    probe.set(anchor.x, anchor.y + step * CAMERA_PROBE_SPACING, anchor.z);
    if (!predicate(probe)) {
      output.copy(probe);
      return true;
    }
  }
  return false;
}

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
    if (findClearCameraEscape(anchor, desired, output, probe, predicate))
      return true;

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
      if (
        output.distanceToSquared(anchor) <
          CAMERA_MIN_ANCHOR_DISTANCE * CAMERA_MIN_ANCHOR_DISTANCE ||
        predicate(output)
      ) {
        if (findClearCameraEscape(anchor, desired, output, probe, predicate))
          return true;
        output.copy(anchor);
      }
      return true;
    }
  }
  return false;
}

/**
 * Advance between two already-resolved camera points without letting the
 * smoothing chord spend a rendered frame inside an opaque object.
 */
export function resolveCameraTransition(
  current: THREE.Vector3,
  target: THREE.Vector3,
  alpha: number,
  output: THREE.Vector3,
  probe: THREE.Vector3,
  predicate?: CameraOcclusionPredicate,
) {
  const transitionAlpha = Math.min(1, Math.max(0, alpha));
  output.lerpVectors(current, target, transitionAlpha);
  if (!predicate) return false;
  if (predicate(target) || predicate(current)) {
    output.copy(predicate(target) ? current : target);
    return true;
  }

  const distance = current.distanceTo(output);
  const steps = Math.max(1, Math.ceil(distance / CAMERA_PROBE_SPACING));
  for (let index = 1; index <= steps; index += 1) {
    probe.lerpVectors(current, output, index / steps);
    if (!predicate(probe)) continue;
    // Stop on the current side of the obstruction. Jumping straight to the
    // clear target would make the camera visibly teleport through a wall.
    output.lerpVectors(
      current,
      target,
      transitionAlpha * Math.max(0, (index - 1) / steps),
    );
    return true;
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
