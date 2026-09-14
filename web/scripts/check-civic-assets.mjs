import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CIVIC_PLACES,
  CIVIC_COLLIDERS,
  SPORTS_STREETS,
} from '../app/world-client/civic-registry.ts';
import { districtGroundHeight } from '../app/district/registry.ts';
import { CITY_INFRA } from '../app/world-client/city-surface.ts';
const base = new URL('../public/assets/3d/ampliworld/', import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, base)));
const obstacles = [
  ...CIVIC_COLLIDERS,
  ...CITY_INFRA.colliders,
  ...read('GC-CBD-STREET-001/street-manifest.json').colliders,
  ...read('GC-STREET-001/street-manifest.json').colliders,
];
function blocked(x, z) {
  const y = districtGroundHeight(x, z);
  return obstacles.some(
    (c) =>
      c.min[1] < y + 2.08 &&
      c.max[1] > y + 0.29 &&
      x > c.min[0] - 0.38 &&
      x < c.max[0] + 0.38 &&
      z > c.min[2] - 0.38 &&
      z < c.max[2] + 0.38,
  );
}
function route(a, b) {
  let last = districtGroundHeight(...a);
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
  for (let i = 0; i <= steps; i++) {
    const x = a[0] + ((b[0] - a[0]) * i) / steps,
      z = a[1] + ((b[1] - a[1]) * i) / steps;
    assert.equal(blocked(x, z), false, `Blocked route at ${x},${z}`);
    const y = districtGroundHeight(x, z);
    assert.ok(Math.abs(y - last) < 0.2, `Floor jump at ${x},${z}`);
    last = y;
  }
}
for (const p of CIVIC_PLACES) {
  const b = readFileSync(new URL(`${p.id}/${p.file}`, base));
  assert.equal(b.toString('ascii', 0, 4), 'glTF');
  const json = JSON.parse(b.toString('utf8', 20, 20 + b.readUInt32LE(12)));
  assert.equal(json.images?.length || 0, 0, 'No facade image substitution');
  assert.ok(p.manifest.triangles < 180000);
}
const stadium = CIVIC_PLACES[0].manifest;
assert.equal(stadium.pitch.widthMeters, 68);
assert.equal(stadium.pitch.lengthMeters, 105);
assert.ok(stadium.roof.openOculusMeters[0] > 68);
assert.ok(stadium.roof.openOculusMeters[1] > 105);
route([0, 900], [0, 600]);
route([180, -20], [180, -36.5]);
assert.ok(blocked(187, -29.1), 'Enlarged sushi front glazing must block the player');
assert.ok(blocked(180, -38.1), 'Sushi stool must block the player');
assert.ok(blocked(180, -40.1), 'Sushi counter must block the player');
route([180,-20],[180,-36.5]);
route([180,-36.5],[186.4,-36.5]);
route([186.4,-36.5],[186.4,-42.7]);
route([186.4,-42.7],[188.2,-42.7]);
route([188.2,-42.7],[188.2,-46.3]);
const garden=CIVIC_PLACES.find(p=>p.id==='GC-SUSHI-GARDEN-001').manifest;
assert.equal(garden.parking.capacity,12);assert.equal(garden.parking.bays.length,12);
assert.equal(new Set(garden.parking.bays.map(b=>b.id)).size,12);
for(const [a,b] of [[[164.6,-25],[164.6,-52.7]],[[164.6,-52.7],[195.4,-52.7]],[[195.4,-52.7],[195.4,-25]],[[195.4,-25],[214,-25]],[[214,-1],[214,-50]]])route(a,b);
// Conservative car envelope along the entrance and aisle; parking wheel stops remain physical.
for(let z=-1;z>=-50;z-=.25){const y=districtGroundHeight(214,z);assert(!obstacles.some(c=>c.min[1]<y+1.7&&c.max[1]>y+.2&&c.min[0]<215.05&&c.max[0]>212.95&&c.min[2]<z+2.5&&c.max[2]>z-2.5),`Car entry blocked at ${z}`);}
const auto = CIVIC_PLACES.find((p) => p.id === 'GC-AUTO-001');
assert.ok(auto);
assert.ok(
  Math.abs(Math.hypot(auto.x, auto.z + 188) - 1000) < 25,
  'Dealership approximately 1km from mall',
);
route([-440, 745], [-565, 745]);
route([-565, 745], [-565, 655]);
assert.ok(blocked(-535, 679), 'Dealership glass blocks movement outside door');
assert.equal(
  districtGroundHeight(-565, 655),
  0.18,
  'Showroom uses interior floor, not campus floor',
);
assert.equal(
  districtGroundHeight(-565, 610),
  0.18,
  'Ground floor never snaps upstairs',
);
let stairFeet = 0.18;
for (let z = 649; z >= 629; z -= 0.05) {
  const x = -627;
  assert.equal(
    CIVIC_COLLIDERS.some(
      (c) =>
        c.min[1] < stairFeet + 2.08 &&
        c.max[1] > stairFeet + 0.29 &&
        x > c.min[0] - 0.38 &&
        x < c.max[0] + 0.38 &&
        z > c.min[2] - 0.38 &&
        z < c.max[2] + 0.38,
    ),
    false,
    `Stair blocked at ${z},${stairFeet}`,
  );
  const next = districtGroundHeight(x, z, stairFeet);
  assert.ok(next - stairFeet <= 0.29, 'Reachable stair riser');
  stairFeet = next;
}
assert.ok(Math.abs(stairFeet - 5.4) < 0.001, 'Stairs reach upper gallery');
assert.equal(
  districtGroundHeight(-600, 615, 0.18),
  0.18,
  'Under-gallery floor remains ground level',
);
assert.equal(
  districtGroundHeight(-600, 615, 5.4),
  5.4,
  'Upper gallery retains elevation',
);
for (const side of [-1, 1]) {
  route([side * 440, 0], [side * 440, 1050]);
  route([side * 440, 1050], [side * 500, 1050]);
  route([side * 500, 1050], [side * 500, 1170]);
  route([side * 440, -500], [side * 675, -500]);
}
assert.equal(SPORTS_STREETS.parkingBays, 44);
console.log(
  JSON.stringify({
    status: 'passed',
    stadiumTriangles: stadium.triangles,
    sushiTriangles: CIVIC_PLACES[1].manifest.triangles,
    parkingBays: 44,
    checked:
      'entrances, floor continuity, core/global route centres and GLB geometry',
  }),
);
