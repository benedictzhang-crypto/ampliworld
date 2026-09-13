import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { cityGroundHeight, riverX } from '../app/world-client/city-surface.ts';
const base = new URL('../public/assets/3d/ampliworld/', import.meta.url);
const city = JSON.parse(
  readFileSync(new URL('GC-CITY-2030/city-manifest.json', base)),
);
const infra = JSON.parse(
  readFileSync(new URL('GC-CITY-INFRA-001/infra-manifest.json', base)),
);
const buildings = JSON.parse(
  readFileSync(new URL('GC-CITY-2030/city-buildings.json', base)),
).buildings;
assert.deepEqual(city.bounds, { min: [-10000, -15000], max: [10000, 15000] });
assert.equal(new Set(buildings.map((b) => b.id)).size, buildings.length);
assert.equal(
  new Set(buildings.map((b) => b.parameterSignature)).size,
  buildings.length,
);
for (const tile of city.tiles) {
  assert.ok(existsSync(new URL('GC-CITY-2030/' + tile.file, base)));
  for (const c of tile.compounds) {
    assert.ok(
      !(
        c.x + 174 > -650 &&
        c.x - 174 < 650 &&
        c.z + 174 > -1150 &&
        c.z - 174 < 1150
      ),
      'No overwrite of core',
    );
  }
}
for (const b of infra.bridges) {
  let prior = cityGroundHeight(b.xMin, b.z);
  for (let x = b.xMin + 1; x <= b.xMax; x++) {
    const h = cityGroundHeight(x, b.z);
    assert.ok(Math.abs(h - prior) < 0.05, 'Continuous bridge ramp');
    prior = h;
  }
  assert.equal(cityGroundHeight(riverX(b.z), b.z), 6);
}
assert.equal(cityGroundHeight(riverX(0), 0), -4);
assert.equal(cityGroundHeight(0, 14000), -8);
const types = {};
for (const t of city.tiles)
  for (const c of t.compounds) types[c.type] = (types[c.type] || 0) + 1;
for (const k of [
  'hospital',
  'school',
  'cyber-church',
  'office-campus',
])
  assert.ok(types[k] > 0);
console.log(
  JSON.stringify({
    status: 'passed',
    ...city.stats,
    bridges: infra.bridges.length,
    types,
  }),
);
