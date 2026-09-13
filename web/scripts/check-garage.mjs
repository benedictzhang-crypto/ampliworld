import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Box3, Vector3 } from 'three';
import { carBlocked } from '../app/world-client/driveable-car.tsx';
import { districtGroundHeight } from '../app/district/registry.ts';
import {
  GARAGE_COLLIDERS,
  MALL_GARAGE,
  parkedGarageBay,
} from '../app/world-client/mall-garage.ts';
const read = (s) =>
  JSON.parse(
    readFileSync(
      new URL(`../public/assets/3d/ampliworld/${s}`, import.meta.url),
    ),
  );
const obstacles = [
  ...GARAGE_COLLIDERS,
  ...read('GC-MALL-002/mall-manifest.json').colliders.map((c) => ({
    ...c,
    min: [c.min[0], c.min[1], c.min[2] - 188],
    max: [c.max[0], c.max[1], c.max[2] - 188],
  })),
  ...read('GC-CBD-CONCOURSE-001/concourse-manifest.json').colliders,
  ...read('GC-CBD-STREET-001/street-manifest.json').colliders,
  ...read('GC-STREET-001/street-manifest.json').colliders,
].map((c) => new Box3(new Vector3(...c.min), new Vector3(...c.max)));
let y = 0.17;
function check(x, z, yaw) {
  assert.equal(
    carBlocked(x, z, obstacles, districtGroundHeight, y, yaw),
    false,
    `Blocked car at ${x},${z},floor${y},yaw${yaw}`,
  );
  const next = districtGroundHeight(x, z, y);
  assert.ok(Math.abs(next - y) < 0.3, 'No vertical snap');
  y = next;
}
for (let z = -68; z >= -118; z -= 0.1) check(120.5, z, 0);
for (let i = 0; i <= 90; i++) {
  const a = (i * Math.PI) / 180;
  check(120.5 - 5.2 * (1 - Math.cos(a)), -118 - 5.2 * Math.sin(a), a);
}
for (let x = 115.3; x >= 20; x -= 0.1) check(x, -123.2, Math.PI / 2);
for (let z = -123.2; z >= -168; z -= 0.1) check(20, z, 0);
assert.equal(y, -4.2);
assert.ok(
  parkedGarageBay({ x: 20, z: -168, y: -4.2, yaw: 0, speed: 0 }),
  'Stopped vehicle fits empty bay',
);
assert.equal(
  parkedGarageBay({ x: 20, z: -168, y: -4.2, yaw: Math.PI / 2, speed: 0 }),
  undefined,
  'Crosswise vehicle is not parked',
);
// Reverse the validated descent with the same physical floor tracking.
for (let z = -116; z <= -79; z += 0.1) check(120.5, z, 0);
assert.ok(y >= 0);
assert.equal(
  districtGroundHeight(20, -168, 0),
  0.17,
  'Mall floor stays above garage',
);
assert.equal(
  districtGroundHeight(20, -168, -4.2),
  -4.2,
  'Basement maintains own floor',
);
const parked = MALL_GARAGE.cars[0].position;
assert.ok(
  carBlocked(
    parked[0],
    parked[2] - 188,
    obstacles,
    districtGroundHeight,
    -4.2,
    0,
  ),
  'Parked vehicle blocks',
);
assert.ok(
  carBlocked(0, 0, [], () => -5, -5, 0),
  'Unregistered negative terrain remains forbidden',
);
assert.equal(MALL_GARAGE.stats.cars, 24);
console.log(
  JSON.stringify({
    status: 'passed',
    bays: MALL_GARAGE.stats.bays,
    parkedCars: 24,
    checks:
      'ramp descent/ascent, west turn, empty bay access, stacked floors, parked-car and water blocking',
  }),
);
