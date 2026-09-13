# Locomotion and full-detail checkpoint

Block started 2026-09-12 21:40:22 EDT. Scope: full-detail normal viewing, visible walking animation, camera-relative movement, Space jump; no map expansion.

- Removed forced medium-detail residence rendering from `/district`; both new views use LOD0 throughout the present range. Removed the viewer's manual near/mid/far switch to avoid suggesting mandatory abrupt transitions. Existing LOD exports are retained for later distant-world budgeting.
- Extracted the metre-space Walker into `web/app/world-client/walker.tsx` with movement constants/heading helpers in `locomotion.ts`. Old game, skyline, day/night and economy remain unchanged.
- Added visible face/front cues, independently pivoted limbs, actual-distance-driven gait, smooth shortest-angle rotation and Space jump with gravity/landing. Opposite input cancels; diagonal input is normalized. S turns the character to face the camera while approaching it.
- Jump input is fresh-press/grounded only. Releasing Space does not stop airborne updates, and holding it does not request repeated jumps. Collision height now follows the avatar's feet/head rather than a fixed ground-level interval.
- Fixed a possible React position reapplication during jumping by keeping the initial spawn tuple stable; landing transitions publish telemetry even when demand rendering becomes idle.
- Camera orbit remains independent while stationary. Exterior obstruction shortening and desired-distance recovery remain approximate camera collision, not a full swept camera volume.

Regression script now covers alternating limbs, forward/return motion and heading, tap-jump landing, held-key single jump, position retention after jumping, and stationary mouse orbit. Remaining work: authored skeletal animation, better foot planting, full joystick/controller support, detailed stair/terrain physics and performance-based distant transitions in the eventual large city.
