import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';

const root = join(import.meta.dirname, '../../public/assets/3d/ampliworld');
const sourceRoot = join(import.meta.dirname, '../../asset-library/blender/civic');
const sites = [
  ['GC-CITYHALL-001', 1250, 520],
  ['GC-COURT-001', 1450, 520],
  ['GC-EMS-001', 3270, 4400],
];
const extents = [];

for (const [id, x, z] of sites) {
  const folder = join(root, id);
  assert.ok(statSync(join(sourceRoot, `${id}.blend`)).size > 1024, `${id}: editable Blender source missing`);
  const manifest = JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8'));
  const model = join(folder, manifest.file);
  const header = readFileSync(model).subarray(0, 12);
  assert.equal(header.toString('ascii', 0, 4), 'glTF', `${id}: invalid GLB`);
  assert.equal(header.readUInt32LE(8), statSync(model).size, `${id}: GLB length mismatch`);
  assert.equal(manifest.bytes, statSync(model).size, `${id}: stale manifest bytes`);
  assert.equal(manifest.upAxis, 'Y', `${id}: engine requires Y-up GLB`);
  assert.equal(manifest.units, 'METERS', `${id}: asset must be at 1:1 scale`);
  assert.ok(manifest.triangles > 1000 && manifest.triangles < 50000, `${id}: review mesh budget`);
  assert.equal(manifest.provenance.type, 'ORIGINAL_BLENDER_GEOMETRY');
  const bounds = manifest.bounds;
  for (let axis = 0; axis < 3; axis++)
    assert.ok(bounds.min[axis] < bounds.max[axis], `${id}: inverted bounds`);
  const [entryX, entryY, entryZ] = manifest.entrance;
  assert.ok(entryX >= bounds.min[0] && entryX <= bounds.max[0] && entryZ >= bounds.min[2] && entryZ <= bounds.max[2], `${id}: entry outside site`);
  for (const collider of manifest.colliders) {
    for (let axis = 0; axis < 3; axis++)
      assert.ok(collider.min[axis] < collider.max[axis], `${id}/${collider.id}: inverted collider`);
    const blocksEntrance = collider.min[0] <= entryX && collider.max[0] >= entryX && collider.min[1] <= entryY && collider.max[1] >= entryY && collider.min[2] <= entryZ && collider.max[2] >= entryZ;
    assert.ok(!blocksEntrance, `${id}/${collider.id}: collider blocks public entrance`);
  }
  assert.ok(manifest.surfaces.some(surface => entryX >= surface.min[0] && entryX <= surface.max[0] && entryZ >= surface.min[1] && entryZ <= surface.max[1]), `${id}: entry has no walkable support`);
  extents.push({id, minX:x+bounds.min[0], maxX:x+bounds.max[0], minZ:z+bounds.min[2], maxZ:z+bounds.max[2]});
}

for (let i = 0; i < extents.length; i++) for (let j = i + 1; j < extents.length; j++) {
  const a = extents[i], b = extents[j];
  assert.ok(a.maxX <= b.minX || b.maxX <= a.minX || a.maxZ <= b.minZ || b.maxZ <= a.minZ, `${a.id} and ${b.id}: site envelopes overlap`);
}

console.log(`Civic asset QA passed: ${sites.length} editable Blender assets, valid GLBs, supported entrances, no overlapping sites.`);
