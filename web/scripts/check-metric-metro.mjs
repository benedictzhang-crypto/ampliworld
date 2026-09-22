import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { METRO_STATIONS, METRO_ALIGNMENT, METRO_HEADWAY_SECONDS, METRO_PORTAL, maximumAlignmentGrade } from '../app/world-client/metro-network.ts';
import { CITY } from '../app/world-client/city-layer.tsx';
import { CITY_INFRA, cityGroundHeight } from '../app/world-client/city-surface.ts';
import { CIVIC_COLLIDERS } from '../app/world-client/civic-registry.ts';
import { METROPOLITAN_COLLIDERS } from '../app/world-client/metropolitan-registry.ts';

assert.equal(new Set(METRO_STATIONS.map(s => s.id)).size, METRO_STATIONS.length);
assert.equal(METRO_HEADWAY_SECONDS, 180);
assert.ok(maximumAlignmentGrade() <= .035, 'Rail alignment exceeds 3.5% grade');
assert.ok(METRO_ALIGNMENT.some(p => p.y < -60) && METRO_ALIGNMENT.some(p => p.y > 0));
assert.ok(METRO_PORTAL.z > 3000 && METRO_PORTAL.z < 4000);
const solids = [...CIVIC_COLLIDERS, ...METROPOLITAN_COLLIDERS, ...CITY_INFRA.colliders,
  ...CITY.tiles.flatMap(tile => tile.colliders)];
for (const stop of METRO_STATIONS) {
  assert.ok(cityGroundHeight(stop.x, stop.z) > -1, `${stop.id} entrance is in water`);
  const blocked = solids.find(c => stop.x >= c.min[0] && stop.x <= c.max[0] &&
    stop.z >= c.min[2] && stop.z <= c.max[2] && c.max[1] > 0);
  assert.ok(!blocked, `${stop.id} entrance overlaps ${blocked?.id}`);
  assert.ok(METRO_ALIGNMENT.some(p => p.x === stop.x && p.z === stop.z && p.y === stop.platformY));
}
const manifest = JSON.parse(readFileSync(new URL('../public/assets/3d/ampliworld/GC-METRO-001/manifest.json', import.meta.url)));
for (const asset of manifest.assets) {
  const glb = readFileSync(new URL(`../public/assets/3d/ampliworld/GC-METRO-001/${asset.file}`, import.meta.url));
  assert.equal(glb.toString('ascii', 0, 4), 'glTF', asset.file);
  assert.equal(glb.readUInt32LE(4), 2, asset.file);
  assert.equal(glb.readUInt32LE(8), glb.length, asset.file);
}
console.log(`Metric metro survey passed: ${METRO_STATIONS.length} dry, unobstructed station anchors; ${manifest.assets.length} Blender GLBs; maximum grade ${(maximumAlignmentGrade() * 100).toFixed(2)}%.`);
