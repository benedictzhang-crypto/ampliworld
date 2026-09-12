import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  CONTINUOUS_WORLD_BOUNDS,
  getContinuousWorldSectorMassing,
  getOverviewContinuousWorldSectors,
} from '../app/continuous-world.tsx';
import { getMetropolitanExpansionVisibility } from '../app/metropolitan-expansion.tsx';
import { WORLD_SOLID_FOOTPRINTS } from '../app/world-spatial-registry.ts';
import {
  WORLD_OVERVIEW_CAMERA_FAR,
  WORLD_OVERVIEW_CAMERA_NEAR,
  WORLD_OVERVIEW_FOG_FAR,
  WORLD_OVERVIEW_FOG_NEAR,
  WORLD_OVERVIEW_MAX_ARCHITECTURE_HEIGHT,
  WORLD_OVERVIEW_MAX_ZOOM,
  WORLD_OVERVIEW_MIN_ZOOM,
  WORLD_OVERVIEW_VERTICAL_FOV_DEGREES,
  clampWorldOverviewZoom,
  getWorldOverviewPose,
} from '../app/world-overview-camera.ts';
import { WORLD_SECTORS } from '../app/world-topology.ts';

const ASPECT_RATIOS = [16 / 9, 4 / 3, 9 / 16, 0.4, 0.35];
const MODES = ['OBLIQUE', 'TOP'];
const WORLD_CORNERS = [
  CONTINUOUS_WORLD_BOUNDS.minX,
  CONTINUOUS_WORLD_BOUNDS.maxX,
].flatMap((x) =>
  [0, WORLD_OVERVIEW_MAX_ARCHITECTURE_HEIGHT].flatMap((y) =>
    [CONTINUOUS_WORLD_BOUNDS.minZ, CONTINUOUS_WORLD_BOUNDS.maxZ].map(
      (z) => new THREE.Vector3(x, y, z),
    ),
  ),
);

assert.equal(WORLD_CORNERS.length, 8);
assert.ok(
  WORLD_OVERVIEW_FOG_NEAR < WORLD_OVERVIEW_FOG_FAR &&
    WORLD_OVERVIEW_FOG_FAR < WORLD_OVERVIEW_CAMERA_FAR,
  'Overview fog must retain visible depth before the camera far plane',
);
assert.equal(clampWorldOverviewZoom(Number.NaN), 1);
assert.equal(clampWorldOverviewZoom(-1), WORLD_OVERVIEW_MIN_ZOOM);
assert.equal(clampWorldOverviewZoom(99), WORLD_OVERVIEW_MAX_ZOOM);

function createOverviewCamera(mode, aspect, zoom) {
  const pose = getWorldOverviewPose(
    mode,
    CONTINUOUS_WORLD_BOUNDS,
    aspect,
    WORLD_OVERVIEW_VERTICAL_FOV_DEGREES,
    zoom,
  );
  const camera = new THREE.PerspectiveCamera(
    WORLD_OVERVIEW_VERTICAL_FOV_DEGREES,
    aspect,
    WORLD_OVERVIEW_CAMERA_NEAR,
    WORLD_OVERVIEW_CAMERA_FAR,
  );
  camera.position.set(...pose.position);
  camera.up.set(...pose.up);
  camera.lookAt(new THREE.Vector3(...pose.target));
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

for (const mode of MODES) {
  for (const aspect of ASPECT_RATIOS) {
    const camera = createOverviewCamera(mode, aspect, 1);
    for (const corner of WORLD_CORNERS) {
      const projected = corner.clone().project(camera);
      assert.ok(
        Math.abs(projected.x) <= 0.94,
        `${mode} ${aspect.toFixed(3)} clipped world corner ${corner.toArray().join(',')} horizontally (${projected.x})`,
      );
      assert.ok(
        Math.abs(projected.y) <= 0.94,
        `${mode} ${aspect.toFixed(3)} clipped world corner ${corner.toArray().join(',')} vertically (${projected.y})`,
      );
      assert.ok(
        projected.z >= -1 && projected.z <= 1,
        `${mode} ${aspect.toFixed(3)} clipped world corner ${corner.toArray().join(',')} by the near/far planes (${projected.z})`,
      );
    }

    // The maximum zoom-out setting is the farthest legal camera pose. Its
    // complete world box must still remain in front of the fixed far plane.
    const farthestCamera = createOverviewCamera(
      mode,
      aspect,
      WORLD_OVERVIEW_MAX_ZOOM,
    );
    for (const corner of WORLD_CORNERS) {
      const viewPoint = corner
        .clone()
        .applyMatrix4(farthestCamera.matrixWorldInverse);
      const depth = -viewPoint.z;
      assert.ok(
        depth > WORLD_OVERVIEW_CAMERA_NEAR && depth < WORLD_OVERVIEW_CAMERA_FAR,
        `${mode} ${aspect.toFixed(3)} exceeded the overview depth budget at ${depth}`,
      );
      assert.ok(
        depth < WORLD_OVERVIEW_FOG_FAR,
        `${mode} ${aspect.toFixed(3)} was completely hidden by overview fog at ${depth}`,
      );
    }
  }
}

const overviewSectors = getOverviewContinuousWorldSectors();
assert.equal(
  overviewSectors.length,
  WORLD_SECTORS.length,
  'Overview mode must retain every continental sector',
);
assert.deepEqual(
  new Set(overviewSectors.map(({ sector }) => sector.id)),
  new Set(WORLD_SECTORS.map((sector) => sector.id)),
  'Overview sector IDs must exactly match the world topology',
);
assert.ok(
  overviewSectors.every(({ lod }) => lod === 'SHELL'),
  'Overview mode must use performance-safe shell LODs',
);

const overviewShellIds = overviewSectors.flatMap(({ sector }) =>
  getContinuousWorldSectorMassing(sector, 'SHELL').map(({ id }) => id),
);
const overviewShells = overviewSectors.flatMap(({ sector }) =>
  getContinuousWorldSectorMassing(sector, 'SHELL'),
);
assert.equal(
  new Set(overviewShellIds).size,
  overviewShellIds.length,
  'Overview shell identities must not render the same solid twice',
);
assert.equal(
  overviewShellIds.includes('CBD-14-SHELL'),
  false,
  'The CBD park pool must never become a phantom overview tower',
);
assert.equal(
  overviewShellIds.includes('CROWN_RESIDENTIAL_TOWERS-4-SHELL'),
  false,
  'The Crown sky pool must never become a phantom overview tower',
);
assert.equal(
  overviewShells.find(({ id }) => id === 'CBD-4-SHELL')?.shape,
  'CYLINDER',
  'The circular CBD exchange must retain its silhouette in overview',
);
assert.equal(
  overviewShells.find(({ id }) => id === 'SEA-CROWN-CASINO-PERSISTENT-SHELL')
    ?.shape,
  'CYLINDER',
  'The circular offshore casino must not become a square overview tower',
);
assert.equal(
  new Set(WORLD_SOLID_FOOTPRINTS.map(({ id }) => id)).size,
  WORLD_SOLID_FOOTPRINTS.length,
  'Every named physical solid must have one registry entry',
);

const allDetailedSectorIds = new Set(WORLD_SECTORS.map(({ id }) => id));
const overviewDetailVisibility = getMetropolitanExpansionVisibility({
  playerPosition: [31, 64],
  detailedSectorIds: allDetailedSectorIds,
  overview: true,
});
assert.ok(
  Object.values(overviewDetailVisibility).every((visible) => !visible),
  'Overview must render only lightweight world shells, never duplicate landmark detail',
);
const civicDetailVisibility = getMetropolitanExpansionVisibility({
  playerPosition: [31, 64],
  detailedSectorIds: new Set(['CIVIC_MEDICAL']),
  overview: false,
});
assert.equal(civicDetailVisibility.sanctuary, true);
assert.equal(civicDetailVisibility.summit, false);
assert.equal(civicDetailVisibility.ocean, false);
assert.equal(civicDetailVisibility.motorsport, false);

console.log(
  'World overview invariants passed: 8 corners, 2 views, 5 aspect ratios, all sectors.',
);
