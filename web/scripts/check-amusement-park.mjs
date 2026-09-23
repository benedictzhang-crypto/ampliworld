import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import plan from '../app/world-client/amusement-park-plan.json' with { type: 'json' };
import manifest from '../public/assets/3d/ampliworld/GC-AMUSEMENT-001/manifest.json' with { type: 'json' };
import { CITY } from '../app/world-client/city-layer.tsx';
import { CIVIC_COLLIDERS } from '../app/world-client/civic-registry.ts';
import { METROPOLITAN_COLLIDERS } from '../app/world-client/metropolitan-registry.ts';
import { COMMUNITY_COLLIDERS } from '../app/world-client/community-registry.ts';
import { CITY_INFRA, cityGroundHeight } from '../app/world-client/city-surface.ts';
import { CITY_SERVICE_COLLIDERS } from '../app/world-client/city-service-buildings.tsx';
import { CITY_OPERATION_COLLIDERS } from '../app/world-client/city-operations.tsx';
import { HOUSING_PLAN } from '../app/world-client/housing-registry.ts';
import { hauntStepAt, hauntNextDoor, nearBasketballCourt, evaluateBasketballShot } from '../app/world-client/amusement-experience.ts';

assert.equal(plan.attractions.filter(a => a.kind.includes('coaster')).length, 5);
assert.equal(plan.attractions.filter(a => a.kind === 'walkthrough-haunt').length, 2);
assert.equal(plan.attractions.filter(a => a.kind.includes('tower')).length, 2);
assert.equal(manifest.attractions.length, plan.attractions.length);
assert.ok(manifest.hauntWallColliders.length >= 22);
assert.ok(manifest.structuralColliders.length >= 100);

const x0 = plan.center.x - plan.footprint.width / 2;
const x1 = plan.center.x + plan.footprint.width / 2;
const z0 = plan.center.z - plan.footprint.depth / 2;
const z1 = plan.center.z + plan.footprint.depth / 2;
assert.ok(cityGroundHeight(plan.center.x, plan.center.z) >= 0, 'Park plot is wet');
for (const [label, x, z] of [
  ['main park gate', plan.entrance.x, plan.entrance.z],
  ['manor gate', 245, -280 + 84],
  ['laboratory gate', 445, -280 + 84],
]) {
  const hit = [...manifest.structuralColliders, ...manifest.hauntWallColliders].find(c =>
    x >= c.min[0] && x <= c.max[0] && z >= c.min[2] && z <= c.max[2] && c.max[1] > 0);
  assert.ok(!hit, `${label} teleport lands inside ${hit?.id}`);
}
for (const p of HOUSING_PLAN.placements)
  assert.ok(!(p.x + p.width / 2 > x0 && p.x - p.width / 2 < x1 &&
    p.z + p.depth / 2 > z0 && p.z - p.depth / 2 < z1),
  `Park overlaps named housing ${p.id}`);
const existing = [...CIVIC_COLLIDERS, ...METROPOLITAN_COLLIDERS,
  ...COMMUNITY_COLLIDERS, ...CITY_SERVICE_COLLIDERS, ...CITY_OPERATION_COLLIDERS,
  ...CITY_INFRA.colliders, ...CITY.tiles.flatMap(tile => tile.colliders)];
for (const c of existing)
  assert.ok(!(c.max[1] > 0 && c.max[0] > x0 && c.min[0] < x1 &&
    c.max[2] > z0 && c.min[2] < z1), `Park overlaps existing ${c.id}`);

for (const route of plan.hauntRoutes) {
  assert.equal(route.stages.length, 6);
  const attraction = plan.attractions.find(a => a.id === route.id);
  assert.ok(attraction);
  for (let stage = 0; stage < 6; stage++) {
    const step = hauntStepAt(plan.center.x + attraction.x,
      plan.center.z + attraction.z + 62 - stage * 25);
    assert.equal(step?.house, route.id);
    assert.equal(step?.stage, stage);
  }
  const wallAt = (x, z) => manifest.hauntWallColliders.some(w =>
    x >= w.min[0] && x <= w.max[0] && z >= w.min[2] && z <= w.max[2]);
  assert.ok(!wallAt(attraction.x, attraction.z + 76), `${route.id} entrance is sealed`);
  assert.ok(!wallAt(attraction.x, attraction.z - 76), `${route.id} exit is sealed`);
  [51, 26, 1, -24, -49].forEach((dz, index) => {
    const openX = attraction.x + (index % 2 === 0 ? 63 : -63);
    assert.ok(!wallAt(openX, attraction.z + dz), `${route.id} stage ${index + 1} turn is sealed`);
  });
  for (let stage = 0; stage < 6; stage++) {
    const step = hauntStepAt(plan.center.x + attraction.x,
      plan.center.z + attraction.z + 62 - stage * 25);
    const door = hauntNextDoor(step);
    assert.ok(!wallAt(door.x - plan.center.x, door.z - plan.center.z),
      `${route.id} stage ${stage + 1} HUD leads into a wall`);
    if (stage > 0) {
      const ghostX = attraction.x + (stage % 2 === 1 ? 50 : -50);
      const ghostZ = attraction.z + 62 - stage * 25;
      assert.ok(!wallAt(ghostX, ghostZ), `${route.id} stage ${stage + 1} scare is behind a wall`);
    }
  }
  const walk = [[attraction.x, attraction.z + 76]];
  [51, 26, 1, -24, -49].forEach((dz, stage) => {
    const sideX = attraction.x + (stage % 2 === 0 ? 63 : -63);
    walk.push([sideX, attraction.z + 62 - stage * 25]);
    walk.push([sideX, attraction.z + dz]);
    walk.push([sideX, attraction.z + 37 - stage * 25]);
  });
  walk.push([attraction.x, attraction.z - 63], [attraction.x, attraction.z - 76]);
  for (let i = 1; i < walk.length; i++) {
    const [ax, az] = walk[i - 1];
    const [bx, bz] = walk[i];
    for (let k = 0; k <= 32; k++) {
      const t = k / 32;
      assert.ok(!wallAt(ax + (bx - ax) * t, az + (bz - az) * t),
        `${route.id} playable walking route intersects a wall near segment ${i}`);
    }
  }
}
assert.ok(nearBasketballCourt(plan.center.x - 140, plan.center.z + 345));
assert.ok(evaluateBasketballShot(18.7, 50).hit);
assert.ok(!evaluateBasketballShot(25, 50).hit);

const glb = readFileSync(new URL('../public/assets/3d/ampliworld/GC-AMUSEMENT-001/amusement-park.glb', import.meta.url));
assert.equal(glb.toString('ascii', 0, 4), 'glTF');
assert.equal(glb.readUInt32LE(8), glb.length);
const jsonLength = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.toString('utf8', 20, 20 + jsonLength));
assert.ok(gltf.meshes.length <= 180, `${gltf.meshes.length} meshes: park export has excessive draw calls`);
assert.ok(gltf.meshes.length >= 12);
assert.ok(!gltf.images?.length, 'Park facades should not be image planes');
console.log(`Amusement park passed: ${plan.attractions.length} attractions, two six-stage haunts, ${manifest.structuralColliders.length + manifest.hauntWallColliders.length} structural colliders, ${gltf.meshes.length} batched meshes; site clear.`);
