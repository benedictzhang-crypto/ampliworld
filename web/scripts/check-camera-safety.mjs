import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  CAMERA_AVATAR_HIDE_DISTANCE,
  CAMERA_MIN_ANCHOR_DISTANCE,
  isStudioCameraPointOccluded,
  resolveCameraOcclusion,
  resolveCameraTransition,
} from '../app/camera-safety.ts';
import {
  CONTINUOUS_WORLD_ROAD_WATER_EDGE_MASKS,
  CONTINUOUS_WORLD_ROADSIDE_TREE_FOOTPRINTS,
  WORLD_CAMERA_GROUND_CLEARANCE,
  getWorldSurfaceElevationXZ,
  isWorldCameraPointOccluded,
} from '../app/continuous-world.tsx';
import {
  THIRD_PERSON_DEFAULT_PITCH,
  THIRD_PERSON_MAX_PITCH,
  THIRD_PERSON_MIN_PITCH,
  getThirdPersonRig,
  lerpAngle,
  resolveThirdPersonLook,
  resolveThirdPersonMovement,
} from '../app/third-person-controller.ts';
import {
  BRIDGE_RAIL_COLLISION_MASKS,
  F1_BARRIER_COLLISION_MASKS,
} from '../app/world-linear-collision.ts';

assert.ok(
  CAMERA_MIN_ANCHOR_DISTANCE > CAMERA_AVATAR_HIDE_DISTANCE,
  'Every valid outdoor camera escape must preserve the visible third-person avatar',
);

const anchor = new THREE.Vector3();
const desired = new THREE.Vector3();
const output = new THREE.Vector3();
const probe = new THREE.Vector3();

for (const [label, forward, lateral, expected] of [
  ['W', 1, 0, [0, 1]],
  ['A', 0, -1, [-1, 0]],
  ['S', -1, 0, [0, -1]],
  ['D', 0, 1, [1, 0]],
]) {
  const movement = resolveThirdPersonMovement(forward, lateral, 0);
  assert.ok(movement.magnitude > 0, `${String(label)} must move the avatar`);
  assert.ok(Math.abs(movement.x - expected[0]) < 0.0001);
  assert.ok(Math.abs(movement.z - expected[1]) < 0.0001);
}
assert.ok(
  Math.abs(resolveThirdPersonMovement(1, 1, 0).magnitude - 1) < 0.0001,
  'Diagonal camera-relative movement must not be faster than axial movement',
);
const reusedMovement = { x: 0, z: 0, heading: 0, magnitude: 0 };
assert.equal(
  resolveThirdPersonMovement(1, 0, 0, reusedMovement),
  reusedMovement,
  'The frame loop must be able to reuse its movement output without allocation',
);
assert.ok(
  Math.abs(lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5) - Math.PI) < 0.0001,
  'Camera yaw interpolation must take the short path through 360 degrees',
);
const idleLook = resolveThirdPersonLook(0, 0, 24, -18, 0.0032, 0.0027);
assert.notEqual(
  idleLook.heading,
  0,
  'Trackpad or mouse look must orbit while the avatar is idle',
);
assert.notEqual(
  idleLook.pitch,
  0,
  'Independent look must tilt without requiring player movement',
);
const clampedLook = resolveThirdPersonLook(0, 0, 0, -10000, 1, 1);
assert.equal(
  clampedLook.pitch,
  THIRD_PERSON_MAX_PITCH,
  'Independent look must preserve the safe vertical camera range',
);

// The shipped hero is 1.87 units tall. Across every supported pitch, heading
// and viewport shape, the complete character must remain in the third-person
// frame rather than being hidden beneath the HUD.
for (const pitch of [
  THIRD_PERSON_MIN_PITCH,
  THIRD_PERSON_DEFAULT_PITCH,
  THIRD_PERSON_MAX_PITCH,
]) {
  for (const aspect of [16 / 9, 4 / 3, 9 / 16]) {
    for (let direction = 0; direction < 4; direction += 1) {
      const heading = (direction / 4) * Math.PI * 2;
      const forward = new THREE.Vector3(
        Math.sin(heading),
        0,
        Math.cos(heading),
      );
      const rig = getThirdPersonRig(3.2, 5.6, pitch);
      const focus = new THREE.Vector3(0, rig.focusHeight, 0).addScaledVector(
        forward,
        rig.focusLead,
      );
      const framingCamera = new THREE.PerspectiveCamera(48, aspect, 0.08, 620);
      framingCamera.position
        .copy(focus)
        .addScaledVector(forward, -rig.horizontalDistance);
      framingCamera.position.y = Math.max(
        0.35,
        framingCamera.position.y + rig.verticalOffset,
      );
      framingCamera.lookAt(focus);
      framingCamera.updateMatrixWorld();
      framingCamera.updateProjectionMatrix();
      const head = new THREE.Vector3(0, 1.866, 0).project(framingCamera);
      const feet = new THREE.Vector3(0, 0, 0).project(framingCamera);
      assert.ok(
        head.y < 0.88 && feet.y > -0.88,
        `Hero left the frame at pitch ${pitch}, aspect ${aspect}, heading ${heading}`,
      );
    }
  }
}

// ARC-A071 north wall: the avatar is legally outside its player collider, but
// the wider camera envelope contains the shoulder anchor. The old 0.08 minimum
// progress moved the result back through the wall.
anchor.set(-21, 1.7, 89.69);
desired.set(-21, 3.2, 84.09);
assert.equal(isWorldCameraPointOccluded(anchor), true);
assert.equal(
  resolveCameraOcclusion(
    anchor,
    desired,
    output,
    probe,
    isWorldCameraPointOccluded,
  ),
  true,
);
assert.equal(
  isWorldCameraPointOccluded(output),
  false,
  'First-probe collision resolution must never return a point inside the tower',
);

const roadsideTree = CONTINUOUS_WORLD_ROADSIDE_TREE_FOOTPRINTS[0];
assert.ok(roadsideTree, 'The rendered road network must retain roadside trees');
const roadsideTreeGround = getWorldSurfaceElevationXZ(...roadsideTree.center);
assert.equal(
  isWorldCameraPointOccluded({
    x: roadsideTree.center[0],
    y: roadsideTreeGround + 1.85,
    z: roadsideTree.center[1],
  }),
  true,
  'Rendered roadside tree crowns must participate in camera occlusion',
);
assert.equal(
  isWorldCameraPointOccluded({
    x: roadsideTree.center[0],
    y: roadsideTreeGround + 0.4,
    z: roadsideTree.center[1],
  }),
  true,
  'Rendered roadside tree trunks must participate below the canopy',
);

// A wall immediately behind the player used to collapse the camera exactly
// onto the shoulder anchor, inside the visible hero mesh.
anchor.set(-125, 2.06, -44);
desired.set(-125, 3.56, -38.4);
resolveCameraOcclusion(
  anchor,
  desired,
  output,
  probe,
  isWorldCameraPointOccluded,
);
assert.ok(
  output.distanceTo(anchor) >= CAMERA_MIN_ANCHOR_DISTANCE,
  'A nearby wall must not collapse the camera into the avatar',
);
assert.ok(output.distanceTo(anchor) > CAMERA_AVATAR_HIDE_DISTANCE);
assert.equal(isWorldCameraPointOccluded(output), false);

for (const barrier of [
  BRIDGE_RAIL_COLLISION_MASKS[0],
  F1_BARRIER_COLLISION_MASKS[0],
]) {
  assert.ok(barrier);
  const ground = getWorldSurfaceElevationXZ(...barrier.center);
  assert.equal(
    isWorldCameraPointOccluded({
      x: barrier.center[0],
      y: ground + 0.6,
      z: barrier.center[1],
    }),
    true,
    `${barrier.id} must participate in low camera collision`,
  );
  assert.equal(
    isWorldCameraPointOccluded({
      x: barrier.center[0],
      y: ground + 1.6,
      z: barrier.center[1],
    }),
    false,
    `${barrier.id} must stop occluding above its rendered height`,
  );
}

const seaBridgeEdge = CONTINUOUS_WORLD_ROAD_WATER_EDGE_MASKS[0];
assert.ok(seaBridgeEdge);
const seaBridgeEdgeGround = getWorldSurfaceElevationXZ(...seaBridgeEdge.center);
assert.equal(
  isWorldCameraPointOccluded({
    x: seaBridgeEdge.center[0],
    y: seaBridgeEdgeGround + 0.55,
    z: seaBridgeEdge.center[1],
  }),
  true,
  'Sea-bridge parapets must participate in camera collision',
);
assert.equal(
  isWorldCameraPointOccluded({
    x: seaBridgeEdge.center[0],
    y: seaBridgeEdgeGround + 3,
    z: seaBridgeEdge.center[1],
  }),
  false,
  'Sea-bridge parapets must stop occluding above their rendered height',
);

// A supported maximum look-up pitch used to be raised into foliage only after
// collision resolution. Ground clearance is now part of the desired point and
// the shared world predicate before the ray is resolved.
const lowCameraSurface = getWorldSurfaceElevationXZ(-69.91, -58);
desired.set(
  -69.91,
  lowCameraSurface + WORLD_CAMERA_GROUND_CLEARANCE + 0.01,
  -58,
);
anchor.set(-75, getWorldSurfaceElevationXZ(-75, -58) + 1.7, -58);
resolveCameraOcclusion(
  anchor,
  desired,
  output,
  probe,
  isWorldCameraPointOccluded,
);
assert.equal(
  isWorldCameraPointOccluded(output),
  false,
  'Ground-constrained camera resolution must not finish inside foliage',
);

// Even two clear endpoints can have an interpolation chord through a thin
// obstacle. Keep this unit-level regression independent of mutable city trees.
const transitionStart = new THREE.Vector3(-1, 2, 0);
const transitionTarget = new THREE.Vector3(1, 2, 0);
const transitionPredicate = (position) =>
  Math.abs(position.x) <= 0.14 && Math.abs(position.z) <= 0.5;
const naiveTransition = transitionStart.clone().lerp(transitionTarget, 0.5);
assert.equal(transitionPredicate(naiveTransition), true);
resolveCameraTransition(
  transitionStart,
  transitionTarget,
  0.5,
  output,
  probe,
  transitionPredicate,
);
assert.equal(
  transitionPredicate(output),
  false,
  'Camera smoothing must not render a frame inside an intervening occluder',
);
assert.ok(
  output.x < -0.14,
  'An occluded transition must stop on the current side instead of jumping through the wall',
);

// A narrow, but legal, waterfront passage sits between three legacy envelopes.
// Every orientation must still produce a clear camera rather than falling back
// to a point that the predicate itself classifies as obstructed.
for (let sample = 0; sample < 16; sample += 1) {
  const heading = (sample / 16) * Math.PI * 2;
  anchor.set(-41, 1.82, -58);
  desired.set(
    anchor.x - Math.sin(heading) * 5.6,
    3.32,
    anchor.z - Math.cos(heading) * 5.6,
  );
  resolveCameraOcclusion(
    anchor,
    desired,
    output,
    probe,
    isWorldCameraPointOccluded,
  );
  assert.equal(
    isWorldCameraPointOccluded(output),
    false,
    `Waterfront camera fallback remained obstructed at heading sample ${sample}`,
  );
}

// The studio camera must remain inside its rendered room at the default spawn
// for every possible player heading, including the EXIT-door direction.
for (let sample = 0; sample < 32; sample += 1) {
  const heading = (sample / 32) * Math.PI * 2;
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  anchor.set(0, 1.7, 2.8);
  desired.set(-forwardX * 4.4, 2.65, 2.8 - forwardZ * 4.4);
  resolveCameraOcclusion(
    anchor,
    desired,
    output,
    probe,
    isStudioCameraPointOccluded,
  );
  assert.equal(
    isStudioCameraPointOccluded(output),
    false,
    `Studio camera escaped the room at heading sample ${sample}`,
  );
}

console.log('Camera safety invariants passed: exterior wall and 360° studio.');
