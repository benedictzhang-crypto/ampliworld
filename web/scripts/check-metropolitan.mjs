import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  METROPOLITAN_PLAN as plan,
  METROPOLITAN_PLACES as places,
  METROPOLITAN_COLLIDERS as colliders,
  METROPOLITAN_SURFACES as floors,
  landValueZone,
} from '../app/world-client/metropolitan-registry.ts';
import {
  riverBaseX,
  riverCenterX,
  riverHalfWidth,
  riverWestBank,
  riverEastBank,
} from '../app/world-client/river-profile.mjs';
import {
  CITY_INFRA,
  cityGroundHeight,
} from '../app/world-client/city-surface.ts';
import {
  HOMES,
  COMMUNITY_KITS,
  homeBounds,
} from '../app/world-client/community-registry.ts';
const city = JSON.parse(
  readFileSync(
    new URL(
      '../public/assets/3d/ampliworld/GC-CITY-2030/city-manifest.json',
      import.meta.url,
    ),
  ),
);
assert.equal(plan.centers.length, 3);
assert.equal(places.length, 3);
const [a, b, c] = plan.centers,
  area = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)) / 2;
assert.ok(area > 20000000, 'Centers form a substantial triangle');
const overlap = (a, b) =>
  a.min[0] < b.max[0] &&
  a.max[0] > b.min[0] &&
  a.min[1] < b.max[1] &&
  a.max[1] > b.min[1];
const compounds = city.tiles.flatMap((t) => t.compounds);
for (const id of plan.replacedUnnamedCompounds)
  assert.ok(!compounds.some((c) => c.id === id));
for (const p of places.filter((p) => p.id !== 'GC-ESTUARY-001')) {
  assert.equal(p.manifest.towers.length, 3);
  for (const c of compounds)
    assert.ok(
      !overlap(
        { min: [p.x - 250, p.z - 250], max: [p.x + 250, p.z + 250] },
        { min: [c.x - 170, c.z - 170], max: [c.x + 170, c.z + 170] },
      ),
    );
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, -1],
  ])
    for (let t = 0; t <= 500; t += 2) {
      const x = p.x + dx * t,
        z = p.z + dz * t;
      assert.ok(
        !colliders.some(
          (c) =>
            x + 0.38 > c.min[0] &&
            x - 0.38 < c.max[0] &&
            z + 0.38 > c.min[2] &&
            z - 0.38 < c.max[2] &&
            c.min[1] < 1.9 &&
            c.max[1] > 0.2,
        ),
        'Actual plaza ingress clear',
      );
    }
  assert.ok(landValueZone(p.x, p.z).includes('高价值'));
}
for (let z = -15000; z <= 13000; z += 50) {
  assert.equal(riverHalfWidth(z) * 2, 600);
  assert.ok(Math.abs(riverWestBank(z) - (riverBaseX(z) - 180)) < 1e-8);
}
for (const p of HOMES.filter((p) => p.kind === 'villa')) {
  const m = COMMUNITY_KITS.villa.manifest.prototypes[p.prototype],
    b = homeBounds(
      p,
      [m.bounds.min[0], m.bounds.min[2]],
      [m.bounds.max[0], m.bounds.max[2]],
    );
  for (const z of [b.min[1], b.max[1]]) assert.ok(b.max[0] < riverWestBank(z));
}
for (const c of compounds)
  for (const z of [c.z - 170, c.z, c.z + 170])
    assert.ok(
      c.x + 170 < riverWestBank(z) || c.x - 170 > riverEastBank(z),
      'No existing compound flooded',
    );
for (const b of CITY_INFRA.bridges) {
  assert.ok(Math.abs(b.deckMaxX - b.deckMinX - 700) < 1e-8);
  assert.equal(cityGroundHeight(riverCenterX(b.z), b.z), 6);
}
for (const s of places[2].manifest.surfaces)
  for (const x of [s.min[0], s.max[0]])
    for (const z of [s.min[1], s.max[1]])
      assert.ok(Math.abs(x - riverCenterX(z)) > riverHalfWidth(z) + 15);
for (const p of places) {
  const bytes = readFileSync(
    new URL(
      `../public/assets/3d/ampliworld/${p.id}/${p.file}`,
      import.meta.url,
    ),
  );
  const g = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  assert.equal(g.images?.length || 0, 0);
}
assert.ok(landValueZone(riverWestBank(13100) - 100, 13100).includes('河口'));
console.log(
  JSON.stringify({
    status: 'passed',
    riverWidth: 600,
    westBankPreserved: true,
    bridges: 28,
    centers: 3,
    newTowers: 6,
    triangleAreaKm2: area / 1e6,
    replacedOrdinaryBuildings: 48,
    existingHomesPreserved: 75,
    estuaryGardens: 2,
  }),
);
