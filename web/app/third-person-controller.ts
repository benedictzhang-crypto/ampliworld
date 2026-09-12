export const THIRD_PERSON_DEFAULT_PITCH = -0.06;
export const THIRD_PERSON_MIN_PITCH = -0.44;
export const THIRD_PERSON_MAX_PITCH = 0.48;
export const THIRD_PERSON_FOCUS_HEIGHT = 1.22;
export const THIRD_PERSON_FOCUS_LEAD = 2;

export type ThirdPersonMovement = Readonly<{
  x: number;
  z: number;
  heading: number;
  magnitude: number;
}>;

export type ThirdPersonMovementOutput = {
  x: number;
  z: number;
  heading: number;
  magnitude: number;
};

export function lerpAngle(current: number, target: number, alpha: number) {
  const delta = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  );
  return current + delta * alpha;
}

export type ThirdPersonLook = Readonly<{
  heading: number;
  pitch: number;
}>;

/** Independent camera orbit used by mouse drag and trackpad two-finger input. */
export function resolveThirdPersonLook(
  heading: number,
  pitch: number,
  deltaX: number,
  deltaY: number,
  yawSensitivity: number,
  pitchSensitivity: number,
): ThirdPersonLook {
  return {
    heading: Math.atan2(
      Math.sin(heading - deltaX * yawSensitivity),
      Math.cos(heading - deltaX * yawSensitivity),
    ),
    pitch: Math.min(
      THIRD_PERSON_MAX_PITCH,
      Math.max(THIRD_PERSON_MIN_PITCH, pitch - deltaY * pitchSensitivity),
    ),
  };
}

/** Camera-relative movement used by W/A/S/D and touch controls. */
export function resolveThirdPersonMovement(
  forwardInput: number,
  lateralInput: number,
  cameraHeading: number,
  output: ThirdPersonMovementOutput = {
    x: 0,
    z: 0,
    heading: cameraHeading,
    magnitude: 0,
  },
): ThirdPersonMovement {
  const forwardX = Math.sin(cameraHeading);
  const forwardZ = Math.cos(cameraHeading);
  const rightX = forwardZ;
  const rightZ = -forwardX;
  const rawX = forwardX * forwardInput + rightX * lateralInput;
  const rawZ = forwardZ * forwardInput + rightZ * lateralInput;
  const rawMagnitude = Math.hypot(rawX, rawZ);
  if (rawMagnitude <= Number.EPSILON) {
    output.x = 0;
    output.z = 0;
    output.heading = cameraHeading;
    output.magnitude = 0;
    return output;
  }
  output.x = rawX / rawMagnitude;
  output.z = rawZ / rawMagnitude;
  output.heading = Math.atan2(rawX, rawZ);
  output.magnitude = Math.min(1, rawMagnitude);
  return output;
}

export type ThirdPersonRig = Readonly<{
  focusHeight: number;
  focusLead: number;
  horizontalDistance: number;
  verticalOffset: number;
}>;

/**
 * Orbit around a stable torso focus. Looking up or down moves the camera on
 * the orbit instead of throwing the avatar out of frame.
 */
export function getThirdPersonRig(
  cameraHeight: number,
  trailingDistance: number,
  pitch: number,
): ThirdPersonRig {
  const baselineHorizontal = trailingDistance + THIRD_PERSON_FOCUS_LEAD;
  const baselineVertical = cameraHeight - THIRD_PERSON_FOCUS_HEIGHT;
  const radius = Math.hypot(baselineHorizontal, baselineVertical);
  const baselineElevation = Math.atan2(baselineVertical, baselineHorizontal);
  const orbitElevation =
    baselineElevation - (pitch - THIRD_PERSON_DEFAULT_PITCH) * 0.72;
  return {
    focusHeight: THIRD_PERSON_FOCUS_HEIGHT,
    focusLead: THIRD_PERSON_FOCUS_LEAD,
    horizontalDistance: Math.cos(orbitElevation) * radius,
    verticalOffset: Math.sin(orbitElevation) * radius,
  };
}
