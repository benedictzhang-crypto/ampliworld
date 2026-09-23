import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { METRO_STATIONS, METRO_ALIGNMENT, METRO_HEADWAY_SECONDS, METRO_PORTAL, maximumAlignmentGrade } from '../app/world-client/metro-network.ts';
import { CITY } from '../app/world-client/city-layer.tsx';
import { CITY_INFRA, cityGroundHeight } from '../app/world-client/city-surface.ts';
import { CIVIC_COLLIDERS } from '../app/world-client/civic-registry.ts';
import { METROPOLITAN_COLLIDERS } from '../app/world-client/metropolitan-registry.ts';
import { metroGroundHeight, METRO_PIER_COLLIDERS } from '../app/world-client/metro-surface.ts';
import { METRO_ELEVATED_PILOT } from '../app/world-client/metro-network.ts';
import { CatmullRomCurve3, Vector3 } from 'three';

assert.equal(new Set(METRO_STATIONS.map(s => s.id)).size, METRO_STATIONS.length);
assert.equal(METRO_HEADWAY_SECONDS, 180);
assert.ok(maximumAlignmentGrade() <= .035, 'Rail alignment exceeds 3.5% grade');
assert.ok(METRO_ALIGNMENT.some(p => p.y < -60) && METRO_ALIGNMENT.some(p => p.y > 0));
assert.ok(METRO_PORTAL.z > 3000 && METRO_PORTAL.z < 4000);
const pilot = new CatmullRomCurve3(METRO_ELEVATED_PILOT.map(p => new Vector3(p.x, 11.3, p.z)), false, 'centripetal');
assert.ok(pilot.getLength() > 2400 && pilot.getLength() < 2800, 'M04–M05 pilot route length');
const solids = [...CIVIC_COLLIDERS, ...METROPOLITAN_COLLIDERS, ...CITY_INFRA.colliders,
  ...CITY.tiles.flatMap(tile => tile.colliders)];
for (let i = 0; i <= 800; i++) {
  const point = pilot.getPointAt(i / 800);
  const hit = solids.find(c => c.max[1] > 8 && point.x >= c.min[0] - 8 && point.x <= c.max[0] + 8 &&
    point.z >= c.min[2] - 8 && point.z <= c.max[2] + 8);
  assert.ok(!hit, `M04–M05 rail corridor intersects ${hit?.id} near ${point.x.toFixed(0)},${point.z.toFixed(0)}`);
}
for (const stop of METRO_STATIONS) {
  assert.ok(cityGroundHeight(stop.x, stop.z) > -1, `${stop.id} entrance is in water`);
  const blocked = solids.find(c => stop.x >= c.min[0] && stop.x <= c.max[0] &&
    stop.z >= c.min[2] && stop.z <= c.max[2] && c.max[1] > 0);
  assert.ok(!blocked, `${stop.id} entrance overlaps ${blocked?.id}`);
  const arrivalBlocked = solids.find(c => stop.arrivalX >= c.min[0] && stop.arrivalX <= c.max[0] &&
    stop.arrivalZ >= c.min[2] && stop.arrivalZ <= c.max[2] && c.max[1] > 0);
  assert.ok(!arrivalBlocked, `${stop.id} player arrival overlaps ${arrivalBlocked?.id}`);
  assert.ok(Math.hypot(stop.arrivalX - stop.x, stop.arrivalZ - stop.z) <= 21,
    `${stop.id} player arrival is too far from entrance`);
  assert.ok(METRO_ALIGNMENT.some(p => p.x === stop.x && p.z === stop.z && p.y === stop.platformY));
  if (stop.mode === 'ELEVATED') {
    const footprintConflict = solids.find(c => c.max[1] > 0 && stop.x + 27 > c.min[0] &&
      stop.x - 27 < c.max[0] && stop.z + 21 > c.min[2] && stop.z - 21 < c.max[2]);
    assert.ok(!footprintConflict, `${stop.id} 54 × 42 m station overlaps ${footprintConflict?.id}`);
    const base = cityGroundHeight(stop.x, stop.z);
    assert.ok(Math.abs(metroGroundHeight(stop.arrivalX, stop.arrivalZ, base) - (base + .24)) < .001,
      `${stop.id} forecourt support differs from exported geometry`);
    assert.ok(Math.abs(metroGroundHeight(stop.x, stop.z, base + 11.8) - (base + 11.8)) < .001,
      `${stop.id} platform is not walkable`);
    assert.ok(METRO_PIER_COLLIDERS.every(p => !(stop.arrivalX >= p.min[0] && stop.arrivalX <= p.max[0] &&
      stop.arrivalZ >= p.min[2] && stop.arrivalZ <= p.max[2])),
      `${stop.id} player arrival overlaps a metro pier`);
  }
}
const manifest = JSON.parse(readFileSync(new URL('../public/assets/3d/ampliworld/GC-METRO-001/manifest.json', import.meta.url)));
for (const asset of manifest.assets) {
  const glb = readFileSync(new URL(`../public/assets/3d/ampliworld/GC-METRO-001/${asset.file}`, import.meta.url));
  assert.equal(glb.toString('ascii', 0, 4), 'glTF', asset.file);
  assert.equal(glb.readUInt32LE(4), 2, asset.file);
  assert.equal(glb.readUInt32LE(8), glb.length, asset.file);
}
console.log(`Metric metro survey passed: ${METRO_STATIONS.length} dry, unobstructed station anchors; ${manifest.assets.length} Blender GLBs; maximum grade ${(maximumAlignmentGrade() * 100).toFixed(2)}%.`);
