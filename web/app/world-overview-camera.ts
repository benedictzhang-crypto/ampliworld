export type WorldOverviewMode = 'OBLIQUE' | 'TOP';

export const WORLD_OVERVIEW_VERTICAL_FOV_DEGREES = 48;
export const WORLD_OVERVIEW_CAMERA_NEAR = 0.08;
export const WORLD_OVERVIEW_CAMERA_FAR = 2400;
export const WORLD_OVERVIEW_FOG_NEAR = 1900;
export const WORLD_OVERVIEW_FOG_FAR = 2350;
// ULTRA residential towers are currently generated up to 78 world units.
// Keep a small explicit roof allowance so the fit volume cannot silently
// under-report the tallest rendered massing.
export const WORLD_OVERVIEW_MAX_ARCHITECTURE_HEIGHT = 80;
export const WORLD_OVERVIEW_MIN_ZOOM = 0.35;
export const WORLD_OVERVIEW_MAX_ZOOM = 1.35;

const WORLD_OVERVIEW_FRAME_MARGIN = 1.1;

export type OverviewBounds = Readonly<{
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}>;

export type WorldOverviewPose = Readonly<{
  position: readonly [number, number, number];
  target: readonly [number, number, number];
  up: readonly [number, number, number];
}>;

export function clampWorldOverviewZoom(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(
    WORLD_OVERVIEW_MAX_ZOOM,
    Math.max(WORLD_OVERVIEW_MIN_ZOOM, value),
  );
}

/** Fit the complete physical continent to the active viewport. */
export function getWorldOverviewPose(
  mode: WorldOverviewMode,
  bounds: OverviewBounds,
  aspect: number,
  verticalFovDegrees: number,
  zoom: number,
  maximumArchitectureHeight = WORLD_OVERVIEW_MAX_ARCHITECTURE_HEIGHT,
): WorldOverviewPose {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const halfWidth = (bounds.maxX - bounds.minX) / 2;
  const halfDepth = (bounds.maxZ - bounds.minZ) / 2;
  const safeVerticalFov = Math.min(100, Math.max(20, verticalFovDegrees));
  const verticalHalfFov = (safeVerticalFov * Math.PI) / 360;
  const safeAspect = Math.max(0.35, aspect);
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * safeAspect);
  const scale = clampWorldOverviewZoom(zoom);
  const target = [centerX, maximumArchitectureHeight / 2, centerZ] as const;

  if (mode === 'TOP') {
    const requiredVerticalHalfSpan = Math.max(
      halfDepth,
      halfWidth / safeAspect,
    );
    // The extra half-height keeps roofs inside the frame because they are
    // closer to a perspective camera than the ground plane is.
    const distanceAboveTarget =
      (requiredVerticalHalfSpan / Math.tan(verticalHalfFov) +
        maximumArchitectureHeight / 2) *
      WORLD_OVERVIEW_FRAME_MARGIN *
      scale;
    return {
      position: [centerX, target[1] + distanceAboveTarget, centerZ + 0.01],
      target,
      up: [0, 0, -1],
    };
  }

  const limitingHalfFov = Math.min(verticalHalfFov, horizontalHalfFov);
  const radius = Math.hypot(
    halfWidth,
    halfDepth,
    maximumArchitectureHeight / 2,
  );
  const distance =
    (radius / Math.sin(limitingHalfFov)) * WORLD_OVERVIEW_FRAME_MARGIN * scale;
  const directionLength = Math.hypot(0.58, 0.54, 0.61);
  const direction = [
    0.58 / directionLength,
    0.54 / directionLength,
    0.61 / directionLength,
  ] as const;
  return {
    position: [
      target[0] + direction[0] * distance,
      target[1] + direction[1] * distance,
      target[2] + direction[2] * distance,
    ],
    target,
    up: [0, 1, 0],
  };
}
