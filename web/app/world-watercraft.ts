import type { WorldPoint } from './world-topology';

export type WorldWatercraftModel =
  | 'boat-fishing-small'
  | 'boat-sail-a'
  | 'boat-speed-a'
  | 'boat-speed-f'
  | 'boat-tug-a'
  | 'ship-cargo-a'
  | 'ship-large'
  | 'ship-ocean-liner-small'
  | 'ship-ocean-liner';

export type WorldWatercraftPlacement = Readonly<{
  id: string;
  name: string;
  basin: 'PUBLIC_MARINA' | 'AZURE_MARINA';
  model: WorldWatercraftModel;
  position: readonly [x: number, y: number, z: number];
  rotationRadians: number;
  scale: number;
  phase: number;
  shadows?: boolean;
}>;

export type WorldWatercraftFootprint = Readonly<{
  id: string;
  name: string;
  center: WorldPoint;
  halfExtents: WorldPoint;
  rotationRadians: number;
  minimumY: number;
  maximumY: number;
}>;

/**
 * Bounds are measured from the shipped GLB position accessors. Keeping them
 * beside the placements makes the visual mesh and its physical envelope one
 * authored object instead of two unrelated lists.
 */
export const WATERCRAFT_MODEL_BOUNDS: Readonly<
  Record<
    WorldWatercraftModel,
    Readonly<{ width: number; height: number; length: number }>
  >
> = {
  'boat-fishing-small': { width: 1.785, height: 2.6, length: 3.87 },
  'boat-sail-a': { width: 1.785, height: 4.739, length: 3.77 },
  'boat-speed-a': { width: 1.785, height: 1.5, length: 3.37 },
  'boat-speed-f': { width: 2.199, height: 1.2, length: 2.87 },
  'boat-tug-a': { width: 1.785, height: 2.237, length: 3.47 },
  'ship-cargo-a': { width: 3.917, height: 3.381, length: 10.549 },
  'ship-large': { width: 4.8, height: 9.964, length: 13.1 },
  'ship-ocean-liner-small': {
    width: 4.76,
    height: 8.934,
    length: 15.2,
  },
  'ship-ocean-liner': { width: 4.76, height: 8.934, length: 21.28 },
};

/**
 * The public harbor is crossed by metropolitan roads. Small craft remain in
 * the protected basins; full-size ships sit in open water so no hull occupies
 * a road, promenade or metro approach.
 */
export const PUBLIC_MARINA_WATERCRAFT: readonly WorldWatercraftPlacement[] = [
  {
    id: 'FSH-B38-PUBLIC-01',
    name: 'Ampli Fisher 38',
    basin: 'PUBLIC_MARINA',
    model: 'boat-fishing-small',
    position: [-118, 0.2, -97],
    rotationRadians: Math.PI / 2,
    scale: 2.45,
    phase: 1,
  },
  {
    id: 'YHT-A45-PUBLIC-01',
    name: 'Ampli 45 Sport',
    basin: 'PUBLIC_MARINA',
    model: 'boat-speed-a',
    position: [-128, 0.2, -32],
    rotationRadians: Math.PI / 2,
    scale: 2.7,
    phase: 2,
  },
  {
    id: 'YHT-A55-PUBLIC-01',
    name: 'Ampli 55 Fly',
    basin: 'PUBLIC_MARINA',
    model: 'boat-speed-f',
    position: [-86, 0.2, -60],
    rotationRadians: Math.PI / 2,
    scale: 2.8,
    phase: 3,
  },
  {
    id: 'SAI-C42-PUBLIC-01',
    name: 'Ampli Sail 42',
    basin: 'PUBLIC_MARINA',
    model: 'boat-sail-a',
    position: [-116, 0.2, -32],
    rotationRadians: Math.PI / 2,
    scale: 2.7,
    phase: 4,
  },
  {
    id: 'YHT-A80-PUBLIC-01',
    name: 'Ampli 80 Sky',
    basin: 'PUBLIC_MARINA',
    model: 'ship-large',
    position: [-148, 0.3, -30],
    rotationRadians: 0,
    scale: 0.95,
    phase: 5,
  },
  {
    id: 'TUG-PUBLIC-01',
    name: 'West Harbor Tug',
    basin: 'PUBLIC_MARINA',
    model: 'boat-tug-a',
    position: [-138, 0.2, -32],
    rotationRadians: Math.PI / 2,
    scale: 2.2,
    phase: 6,
    shadows: false,
  },
  {
    id: 'CARGO-PUBLIC-01',
    name: 'West Harbor Feeder',
    basin: 'PUBLIC_MARINA',
    model: 'ship-cargo-a',
    position: [-148, 0.35, -44],
    rotationRadians: 0,
    scale: 1.05,
    phase: 7,
    shadows: false,
  },
  {
    id: 'LINER-PUBLIC-01',
    name: 'Ampli Ocean Liner',
    basin: 'PUBLIC_MARINA',
    model: 'ship-ocean-liner',
    position: [-116, 0.4, -18],
    rotationRadians: Math.PI / 2,
    scale: 2.5,
    phase: 8,
    shadows: false,
  },
];

export const AZURE_MARINA_WATERCRAFT: readonly WorldWatercraftPlacement[] = [
  {
    id: 'SAI-C42-AZURE-01',
    name: 'Azure Sail 42',
    basin: 'AZURE_MARINA',
    model: 'boat-sail-a',
    position: [-148, 0.08, -76],
    rotationRadians: Math.PI / 2,
    scale: 3.4,
    phase: 1,
  },
  {
    id: 'YHT-A45-AZURE-01',
    name: 'Azure 45 Sport',
    basin: 'AZURE_MARINA',
    model: 'boat-speed-a',
    position: [-88, 0.08, -52],
    rotationRadians: Math.PI / 2,
    scale: 4.05,
    phase: 2,
  },
  {
    id: 'YHT-A55-AZURE-01',
    name: 'Azure 55 Fly',
    basin: 'AZURE_MARINA',
    model: 'boat-speed-f',
    position: [-134, 0.08, -92],
    rotationRadians: Math.PI / 2,
    scale: 5.85,
    phase: 3,
  },
  {
    id: 'YHT-A60-AZURE-01',
    name: 'Azure 60 Open',
    basin: 'AZURE_MARINA',
    model: 'boat-speed-f',
    position: [-92, 0.08, -92],
    rotationRadians: Math.PI / 2,
    scale: 6.35,
    phase: 3.6,
  },
  {
    id: 'FSH-B38-AZURE-01',
    name: 'Azure Fisher 38',
    basin: 'AZURE_MARINA',
    model: 'boat-fishing-small',
    position: [-102, 0.08, -32],
    rotationRadians: Math.PI / 2,
    scale: 3,
    phase: 4,
  },
  {
    id: 'YHT-A80-AZURE-01',
    name: 'Azure 80 Sky',
    basin: 'AZURE_MARINA',
    model: 'ship-large',
    position: [-108, 0.08, -92],
    rotationRadians: 0,
    scale: 1.1,
    phase: 5,
    shadows: false,
  },
  {
    id: 'YHT-A100-AZURE-01',
    name: 'Azure 100',
    basin: 'AZURE_MARINA',
    model: 'ship-ocean-liner-small',
    position: [-92, 0.06, -36],
    rotationRadians: 0,
    scale: 1.2,
    phase: 6,
    shadows: false,
  },
];

export const WORLD_WATERCRAFT: readonly WorldWatercraftPlacement[] = [
  ...PUBLIC_MARINA_WATERCRAFT,
  ...AZURE_MARINA_WATERCRAFT,
];

export const WORLD_WATERCRAFT_FOOTPRINTS: readonly WorldWatercraftFootprint[] =
  WORLD_WATERCRAFT.map((placement) => {
    const bounds = WATERCRAFT_MODEL_BOUNDS[placement.model];
    return {
      id: placement.id,
      name: placement.name,
      center: [placement.position[0], placement.position[2]],
      halfExtents: [
        (bounds.width * placement.scale) / 2,
        (bounds.length * placement.scale) / 2,
      ],
      rotationRadians: placement.rotationRadians,
      minimumY: placement.position[1] - 0.1,
      maximumY: placement.position[1] + bounds.height * placement.scale + 0.1,
    };
  });

function pointInWatercraftFootprint(
  x: number,
  z: number,
  footprint: WorldWatercraftFootprint,
  margin: number,
) {
  const dx = x - footprint.center[0];
  const dz = z - footprint.center[1];
  const cosine = Math.cos(footprint.rotationRadians);
  const sine = Math.sin(footprint.rotationRadians);
  const localX = dx * cosine - dz * sine;
  const localZ = dx * sine + dz * cosine;
  return (
    Math.abs(localX) < footprint.halfExtents[0] + margin &&
    Math.abs(localZ) < footprint.halfExtents[1] + margin
  );
}

export function getWorldWatercraftAtXZ(x: number, z: number, margin = 0) {
  return WORLD_WATERCRAFT_FOOTPRINTS.find((footprint) =>
    pointInWatercraftFootprint(x, z, footprint, margin),
  );
}
