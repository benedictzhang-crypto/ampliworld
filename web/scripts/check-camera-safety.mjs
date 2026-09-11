import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  isStudioCameraPointOccluded,
  resolveCameraOcclusion,
} from '../app/camera-safety.ts';
import { isWorldCameraPointOccluded } from '../app/continuous-world.tsx';

const anchor = new THREE.Vector3();
const desired = new THREE.Vector3();
const output = new THREE.Vector3();
const probe = new THREE.Vector3();

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

assert.equal(
  isWorldCameraPointOccluded({ x: 8.69, y: 1.85, z: -14.4 }),
  true,
  'Rendered roadside tree crowns must participate in camera occlusion',
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
