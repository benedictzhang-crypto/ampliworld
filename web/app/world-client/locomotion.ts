export const WALK_SPEED = 4.5;
export const JUMP_SPEED = 6.6;
export const GRAVITY = 18;
export const BODY_HEIGHT = 2.08;
export const BODY_RADIUS = 0.35;
export function turnToward(current: number, target: number, dt: number) {
  const difference = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  );
  return current + difference * Math.min(1, dt * 16);
}
// The avatar's visible face is local +Z. Camera direction is projected onto the ground.
export function movementHeading(x: number, z: number) {
  return Math.atan2(x, z);
}
