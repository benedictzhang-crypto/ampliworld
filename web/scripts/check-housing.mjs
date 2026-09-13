import assert from 'node:assert/strict';
import {
  HOUSING_PLAN,
  HOUSING_INSTANCES,
  HOUSING_MODELS,
  HOUSING_BOXES,
  housingGroundHeight,
  housingPoint,
  housingColliders,
  canCloseHousingGate,
} from '../app/world-client/housing-registry.ts';
import { housingProxy } from '../app/world-client/housing-streaming.ts';
const count = {};
for (const p of HOUSING_PLAN.placements)
  count[p.type] = (count[p.type] || 0) + 1;
assert.deepEqual(count, {
  ultra: 2,
  high: 5,
  mixedVilla: 2,
  largeDetached: 2,
  lowerMiddle: 15,
  low: 25,
});
for (const p of HOUSING_PLAN.placements) {
  const items = HOUSING_INSTANCES.filter((i) => i.parcel === p.id),
    homes = items.filter((i) => i.role === 'home');
  assert.equal(homes.length, p.retainExistingFootprints ? 0 : p.buildingCount);
  if (p.type === 'low')
    assert.ok(p.buildingCount >= 20 && p.buildingCount <= 35);
  if (p.type === 'lowerMiddle') {
    assert.ok(p.buildingCount >= 15 && p.buildingCount <= 20);
    assert.equal(items.filter((i) => i.model === 8).length, 1);
  }
  if (p.type === 'high') {
    assert.ok(p.buildingCount >= 6 && p.buildingCount <= 10);
    assert.ok(
      items.some((i) => i.model === 9) && items.some((i) => i.model === 10),
    );
  }
  if (p.type === 'ultra') {
    assert.ok(p.buildingCount >= 4 && p.buildingCount <= 6);
    assert.ok(items.some((i) => i.model === 11));
  }
  for (let j = 0; j < items.length; j++) {
    const i = items[j],
      b = HOUSING_MODELS[i.model].bounds;
    assert.ok(
      Math.abs(i.localX) + Math.max(Math.abs(b.min[0]), b.max[0]) < p.width / 2,
    );
    assert.ok(
      Math.abs(i.localZ) + Math.max(Math.abs(b.min[2]), b.max[2]) < p.depth / 2,
    );
    for (let k = j + 1; k < items.length; k++) {
      const t = items[k],
        c = HOUSING_MODELS[t.model].bounds;
      assert.ok(
        !(
          i.localX + b.min[0] < t.localX + c.max[0] &&
          i.localX + b.max[0] > t.localX + c.min[0] &&
          i.localZ + b.min[2] < t.localZ + c.max[2] &&
          i.localZ + b.max[2] > t.localZ + c.min[2]
        ),
        'No model overlap: ' + p.id,
      );
    }
  }
  if (!p.retainExistingFootprints) {
    const q = housingPoint(p, -p.width / 2 + 10, 0);
    assert.equal(housingGroundHeight(q[0], q[1], 0.18), 0.18);
  }
}
const p = HOUSING_PLAN.placements.find((p) => p.type === 'high');
const closed = housingColliders(p.x, p.z, new Set()),
  open = housingColliders(p.x, p.z, new Set([p.id]));
const gateId = p.id + '/access-gate',
  closedGate = closed.find((c) => c.id === gateId),
  openGate = open.find((c) => c.id === gateId);
const covers = (b, x, z) =>
  x >= b.min[0] && x <= b.max[0] && z >= b.min[2] && z <= b.max[2];
assert.ok(covers(closedGate, ...p.gateWorld), 'Closed gate blocks opening');
assert.ok(
  !covers(openGate, ...p.gateWorld),
  'Open gate moves outside opening but retains collision',
);
assert.equal(
  canCloseHousingGate(p.id, ...p.gateWorld),
  false,
  'No closing through avatar',
);
const clear = housingPoint(p, 0, p.depth / 2 + 8);
assert.equal(canCloseHousingGate(p.id, ...clear, 3.5), true);
for (const b of HOUSING_BOXES.filter(
  (b) => b.kind === 'road' || b.kind === 'walk',
)) {
  const y = housingGroundHeight(b.x, b.z, 0.215);
  assert.ok(
    y >= b.y + b.h / 2 - 1e-6,
    'Floor supports visible paving: ' + b.id,
  );
}
for (const i of HOUSING_INSTANCES) {
  const proxy = housingProxy(i),
    b = HOUSING_MODELS[i.model].bounds;
  assert.ok(
    Math.abs(proxy.y - proxy.h / 2 - (i.y + b.min[1])) < 1e-6,
    'Proxy ground aligns',
  );
  assert.ok(
    Math.abs(proxy.y + proxy.h / 2 - (i.y + b.max[1])) < 1e-6,
    'Proxy roof aligns',
  );
}
assert.equal(HOUSING_BOXES.filter((b) => b.kind === 'gate').length, 11);
console.log(
  JSON.stringify({
    status: 'passed',
    counts: count,
    instances: HOUSING_INSTANCES.length,
    apartmentCommunities: 47,
    newVillaCommunities: 4,
    retainedRiverVillas: 60,
    allModelFootprintsClear: true,
    interactiveGates: 11,
  }),
);
