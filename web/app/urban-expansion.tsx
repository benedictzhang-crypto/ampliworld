'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export type EnterHandler = (destinationId: string) => void;
export type WorldPosition = readonly [x: number, y: number, z: number];
export type ResidentialTier =
  | 'AFFORDABLE'
  | 'MID_MARKET'
  | 'UPGRADE'
  | 'PREMIUM'
  | 'ULTRA';
export type ResidentialTypology =
  | 'TOWERS'
  | 'TOWNHOMES'
  | 'SEMI_DETACHED'
  | 'DETACHED'
  | 'MIXED';

type BoxInstance = {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotationY?: number;
  color?: THREE.ColorRepresentation;
};

type RoundInstance = {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  color?: THREE.ColorRepresentation;
};

type BuildingSite = {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotationY: number;
  body: string;
  glass: string;
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function InstancedBoxes({
  instances,
  roughness = 0.68,
  metalness = 0.08,
  transparent = false,
  opacity = 1,
  castShadow = true,
  receiveShadow = true,
}: {
  instances: readonly BoxInstance[];
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const usesColors = instances.some((instance) => instance.color !== undefined);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    const object = new THREE.Object3D();
    const color = new THREE.Color();
    instances.forEach((instance, index) => {
      object.position.set(...instance.position);
      object.rotation.set(0, instance.rotationY ?? 0, 0);
      object.scale.set(...instance.scale);
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
      if (instance.color !== undefined)
        mesh.setColorAt(index, color.set(instance.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instances]);

  if (instances.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, instances.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <boxGeometry />
      <meshStandardMaterial
        color="#ffffff"
        roughness={roughness}
        metalness={metalness}
        transparent={transparent}
        opacity={opacity}
        vertexColors={usesColors}
      />
    </instancedMesh>
  );
}

function InstancedRounds({
  instances,
  shape = 'SPHERE',
  roughness = 0.72,
  metalness = 0.04,
}: {
  instances: readonly RoundInstance[];
  shape?: 'SPHERE' | 'CYLINDER';
  roughness?: number;
  metalness?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const usesColors = instances.some((instance) => instance.color !== undefined);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;

    const object = new THREE.Object3D();
    const color = new THREE.Color();
    instances.forEach((instance, index) => {
      object.position.set(...instance.position);
      object.rotation.set(...(instance.rotation ?? [0, 0, 0]));
      object.scale.set(...instance.scale);
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
      if (instance.color !== undefined)
        mesh.setColorAt(index, color.set(instance.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instances]);

  if (instances.length === 0) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, instances.length]}
      castShadow
      receiveShadow
    >
      {shape === 'CYLINDER' ? (
        <cylinderGeometry args={[0.5, 0.5, 1, 7]} />
      ) : (
        <sphereGeometry args={[0.5, 8, 6]} />
      )}
      <meshStandardMaterial
        color="#ffffff"
        roughness={roughness}
        metalness={metalness}
        vertexColors={usesColors}
      />
    </instancedMesh>
  );
}

function addFacadeBuilding(
  site: BuildingSite,
  body: BoxInstance[],
  glass: BoxInstance[],
  ledges: BoxInstance[],
  roofs: BoxInstance[],
) {
  const { x, z, width, depth, height, rotationY } = site;
  const floorY = height / 2;
  const inset = 0.14;
  const rotatedOffset = (offsetX: number, offsetZ: number) => ({
    x: x + offsetX * Math.cos(rotationY) + offsetZ * Math.sin(rotationY),
    z: z - offsetX * Math.sin(rotationY) + offsetZ * Math.cos(rotationY),
  });
  const front = rotatedOffset(0, depth / 2 + 0.03);
  const back = rotatedOffset(0, -depth / 2 - 0.03);
  const right = rotatedOffset(width / 2 + 0.03, 0);
  const left = rotatedOffset(-width / 2 - 0.03, 0);

  body.push({
    position: [x, floorY, z],
    scale: [width, height, depth],
    rotationY,
    color: site.body,
  });

  // Four independent façade skins stop the buildings reading as untextured blocks.
  glass.push(
    {
      position: [front.x, floorY, front.z],
      scale: [width - inset * 2, height * 0.84, 0.08],
      rotationY,
      color: site.glass,
    },
    {
      position: [back.x, floorY, back.z],
      scale: [width - inset * 2, height * 0.84, 0.08],
      rotationY,
      color: site.glass,
    },
    {
      position: [right.x, floorY, right.z],
      scale: [0.08, height * 0.84, depth - inset * 2],
      rotationY,
      color: site.glass,
    },
    {
      position: [left.x, floorY, left.z],
      scale: [0.08, height * 0.84, depth - inset * 2],
      rotationY,
      color: site.glass,
    },
  );

  const ledgeCount = Math.max(2, Math.min(7, Math.round(height / 9)));
  for (let level = 1; level <= ledgeCount; level += 1) {
    ledges.push({
      position: [x, (height * level) / (ledgeCount + 1), z],
      scale: [width + 0.22, 0.1, depth + 0.22],
      rotationY,
      color: level % 2 === 0 ? '#d5d0c4' : '#9e988d',
    });
  }

  roofs.push({
    position: [x, height + 0.34, z],
    scale: [width * 0.72, 0.68, depth * 0.72],
    rotationY,
    color: '#3e464b',
  });
}

function FacadeBuildingCluster({ sites }: { sites: readonly BuildingSite[] }) {
  const kit = useMemo(() => {
    const body: BoxInstance[] = [];
    const glass: BoxInstance[] = [];
    const ledges: BoxInstance[] = [];
    const roofs: BoxInstance[] = [];
    sites.forEach((site) =>
      addFacadeBuilding(site, body, glass, ledges, roofs),
    );
    return { body, glass, ledges, roofs };
  }, [sites]);

  return (
    <>
      <InstancedBoxes instances={kit.body} roughness={0.76} />
      <InstancedBoxes instances={kit.glass} roughness={0.2} metalness={0.48} />
      <InstancedBoxes
        instances={kit.ledges}
        roughness={0.56}
        metalness={0.12}
      />
      <InstancedBoxes instances={kit.roofs} roughness={0.42} metalness={0.42} />
    </>
  );
}

export type MetroEntranceProps = {
  id: string;
  name?: string;
  position?: WorldPosition;
  rotationY?: number;
  lineColor?: string;
  onEnter?: EnterHandler;
};

/**
 * A compact, generic northern-Chinese-city metro entrance: a sunken stair,
 * glass rain canopy, guarded parapets and an original red/blue wayfinding pylon.
 */
export function MetroEntrance({
  id,
  name = 'Metro Entrance',
  position = [0, 0, 0],
  rotationY = 0,
  lineColor = '#2369a8',
  onEnter,
}: MetroEntranceProps) {
  const stairs = useMemo<BoxInstance[]>(
    () =>
      Array.from({ length: 11 }, (_, index) => ({
        position: [0, -index * 0.17, 1.35 + index * 0.36],
        scale: [3.2, 0.18, 0.38],
        color: index % 2 ? '#9a9da0' : '#babdc0',
      })),
    [],
  );
  const canopyFrames = useMemo<BoxInstance[]>(
    () => [
      {
        position: [-1.8, 1.35, 2.25],
        scale: [0.12, 2.7, 4.7],
        color: '#454c52',
      },
      {
        position: [1.8, 1.35, 2.25],
        scale: [0.12, 2.7, 4.7],
        color: '#454c52',
      },
      { position: [0, 2.72, 2.25], scale: [3.7, 0.12, 4.8], color: '#606b72' },
      { position: [0, 0.15, 4.48], scale: [3.8, 0.3, 0.22], color: '#868b8d' },
    ],
    [],
  );

  return (
    <group
      position={position}
      rotation-y={rotationY}
      name={name}
      userData={{ id, name, category: 'METRO_ENTRANCE' }}
    >
      <mesh position={[0, -0.55, 3]} receiveShadow>
        <boxGeometry args={[4.4, 1.1, 6.4]} />
        <meshStandardMaterial color="#31363a" roughness={0.84} />
      </mesh>
      <InstancedBoxes instances={stairs} />
      <InstancedBoxes
        instances={canopyFrames}
        metalness={0.55}
        roughness={0.3}
      />

      <mesh position={[0, 2.35, 2.22]} rotation-x={-0.06}>
        <boxGeometry args={[3.55, 0.08, 4.55]} />
        <meshPhysicalMaterial
          color="#bfe6ee"
          transmission={0.3}
          transparent
          opacity={0.5}
          roughness={0.18}
        />
      </mesh>
      <mesh position={[-1.72, 1.35, 2.23]}>
        <boxGeometry args={[0.05, 2.45, 4.3]} />
        <meshPhysicalMaterial
          color="#b5d5dc"
          transmission={0.25}
          transparent
          opacity={0.42}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[1.72, 1.35, 2.23]}>
        <boxGeometry args={[0.05, 2.45, 4.3]} />
        <meshPhysicalMaterial
          color="#b5d5dc"
          transmission={0.25}
          transparent
          opacity={0.42}
          roughness={0.25}
        />
      </mesh>

      <group position={[2.65, 1.45, 0.35]}>
        <mesh position={[0, -0.65, 0]}>
          <cylinderGeometry args={[0.13, 0.18, 2.4, 8]} />
          <meshStandardMaterial
            color="#31383e"
            metalness={0.55}
            roughness={0.32}
          />
        </mesh>
        <mesh
          rotation-y={Math.PI / 4}
          onClick={(event) => {
            event.stopPropagation();
            onEnter?.(id);
          }}
        >
          <cylinderGeometry args={[0.68, 0.68, 0.18, 4]} />
          <meshStandardMaterial
            color={lineColor}
            metalness={0.25}
            roughness={0.38}
          />
        </mesh>
        <mesh position={[0, 0, 0.12]} rotation-z={Math.PI / 4}>
          <boxGeometry args={[0.86, 0.18, 0.08]} />
          <meshStandardMaterial
            color="#e84b44"
            emissive="#53110e"
            emissiveIntensity={0.28}
          />
        </mesh>
        <mesh position={[0, 0, 0.17]} rotation-z={-Math.PI / 4}>
          <boxGeometry args={[0.86, 0.18, 0.08]} />
          <meshStandardMaterial color="#f1f4f2" />
        </mesh>
      </group>

      <mesh
        position={[0, 0.75, 2.2]}
        onClick={(event) => {
          event.stopPropagation();
          onEnter?.(id);
        }}
        visible={false}
      >
        <boxGeometry args={[5.5, 3.4, 7]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

function makeRiverGeometry(length: number, width: number, segments = 36) {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const z = progress * length - length / 2;
    const center =
      Math.sin(progress * Math.PI * 2.1) * width * 0.18 +
      Math.sin(progress * Math.PI * 5.4) * width * 0.045;
    const localWidth =
      width * (0.94 + Math.sin(progress * Math.PI * 3.2) * 0.08);
    positions.push(
      center - localWidth / 2,
      0,
      z,
      center + localWidth / 2,
      0,
      z,
    );
    uvs.push(0, progress, 1, progress);
    if (index < segments) {
      const start = index * 2;
      indices.push(
        start,
        start + 2,
        start + 1,
        start + 1,
        start + 2,
        start + 3,
      );
    }
  }

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function riverCenterAt(z: number, length: number, width: number) {
  const progress = z / length + 0.5;
  return (
    Math.sin(progress * Math.PI * 2.1) * width * 0.18 +
    Math.sin(progress * Math.PI * 5.4) * width * 0.045
  );
}

export type GrandRiverSystemProps = {
  position?: WorldPosition;
  rotationY?: number;
  length?: number;
  width?: number;
  bridgeCount?: number;
};

/** A low-draw-call metropolitan river corridor with a tributary mouth. */
export function GrandRiverSystem({
  position = [0, 0, 0],
  rotationY = 0,
  length = 280,
  width = 28,
  bridgeCount = 5,
}: GrandRiverSystemProps) {
  const riverGeometry = useMemo(
    () => makeRiverGeometry(length, width),
    [length, width],
  );
  const tributaryGeometry = useMemo(
    () => makeRiverGeometry(width * 3.6, width * 0.46, 16),
    [width],
  );
  const corridor = useMemo(() => {
    const paths: BoxInstance[] = [];
    const curbs: BoxInstance[] = [];
    const bridges: BoxInstance[] = [];
    const bridgeRails: BoxInstance[] = [];
    const trunks: RoundInstance[] = [];
    const crowns: RoundInstance[] = [];
    const segmentLength = 12;
    const segments = Math.max(8, Math.floor(length / segmentLength));

    for (let index = 0; index < segments; index += 1) {
      const z = -length / 2 + ((index + 0.5) * length) / segments;
      const previousZ = z - 0.5;
      const nextZ = z + 0.5;
      const center = riverCenterAt(z, length, width);
      const angle = Math.atan2(
        riverCenterAt(nextZ, length, width) -
          riverCenterAt(previousZ, length, width),
        nextZ - previousZ,
      );
      const localLength = length / segments + 0.45;

      for (const side of [-1, 1] as const) {
        const bankX = center + side * (width / 2 + 3.4);
        paths.push({
          position: [bankX, 0.16, z],
          scale: [5.1, 0.3, localLength],
          rotationY: angle,
          color: index % 2 ? '#c9c2ae' : '#d3cbb5',
        });
        curbs.push({
          position: [center + side * (width / 2 + 0.62), 0.35, z],
          scale: [0.48, 0.72, localLength],
          rotationY: angle,
          color: '#8f9693',
        });
        if (index % 2 === 0) {
          const treeX = center + side * (width / 2 + 7.5);
          trunks.push({
            position: [treeX, 1.25, z],
            scale: [0.46, 2.5, 0.46],
            color: '#594733',
          });
          crowns.push({
            position: [treeX, 3.45, z],
            scale: [2.6, 3.1, 2.6],
            color: index % 4 === 0 ? '#55744f' : '#3f6649',
          });
        }
      }
    }

    for (let index = 0; index < bridgeCount; index += 1) {
      const z =
        -length * 0.39 + (index * length * 0.78) / Math.max(1, bridgeCount - 1);
      const x = riverCenterAt(z, length, width);
      const deckWidth = width + 22;
      const crossingWidth = Math.abs(z) < 0.01 ? 31 : 7.4;
      bridges.push(
        {
          position: [x, 0.22, z],
          scale: [deckWidth, 0.18, crossingWidth],
          color: '#5d6265',
        },
        {
          position: [x, 0.34, z],
          scale: [deckWidth - 1.2, 0.08, crossingWidth - 1.1],
          color: '#30363b',
        },
      );
      bridgeRails.push(
        {
          position: [x, 0.78, z - crossingWidth / 2 + 0.45],
          scale: [deckWidth, 0.82, 0.14],
          color: '#a6b2b3',
        },
        {
          position: [x, 0.78, z + crossingWidth / 2 - 0.45],
          scale: [deckWidth, 0.82, 0.14],
          color: '#a6b2b3',
        },
      );
    }

    return { paths, curbs, bridges, bridgeRails, trunks, crowns };
  }, [bridgeCount, length, width]);

  return (
    <group
      position={position}
      rotation-y={rotationY}
      name="Grand Metropolitan River"
    >
      <mesh geometry={riverGeometry} position={[0, 0.02, 0]} receiveShadow>
        <meshStandardMaterial
          color="#28758f"
          roughness={0.2}
          metalness={0.28}
          transparent
          opacity={0.88}
        />
      </mesh>
      <group
        position={[width * 0.67, 0.025, length * 0.14]}
        rotation-y={Math.PI / 2.18}
      >
        <mesh geometry={tributaryGeometry} receiveShadow>
          <meshStandardMaterial
            color="#337f92"
            roughness={0.24}
            metalness={0.22}
            transparent
            opacity={0.86}
          />
        </mesh>
      </group>
      <InstancedBoxes instances={corridor.paths} roughness={0.86} />
      <InstancedBoxes instances={corridor.curbs} roughness={0.64} />
      <InstancedBoxes
        instances={corridor.bridges}
        roughness={0.73}
        metalness={0.12}
      />
      <InstancedBoxes
        instances={corridor.bridgeRails}
        roughness={0.32}
        metalness={0.66}
      />
      <InstancedRounds instances={corridor.trunks} shape="CYLINDER" />
      <InstancedRounds instances={corridor.crowns} />
    </group>
  );
}

const RESIDENTIAL_PALETTES: Record<
  ResidentialTier,
  { body: string[]; glass: string[]; height: readonly [number, number] }
> = {
  AFFORDABLE: {
    body: ['#b6afa1', '#9e9b94', '#c0b7a5'],
    glass: ['#60727a', '#53666d'],
    height: [12, 21],
  },
  MID_MARKET: {
    body: ['#c5bba9', '#b7a98e', '#d0c8b8'],
    glass: ['#4f7380', '#547b83'],
    height: [16, 29],
  },
  UPGRADE: {
    body: ['#d4c8b1', '#b9ae99', '#d9d0c0'],
    glass: ['#426d7b', '#587f88'],
    height: [22, 38],
  },
  PREMIUM: {
    body: ['#d8d2c4', '#bdb7ab', '#e0dbce'],
    glass: ['#315f72', '#426f80'],
    height: [34, 55],
  },
  ULTRA: {
    body: ['#d7d5ce', '#aaa9a5', '#ece8dd'],
    glass: ['#214e65', '#2e667d'],
    height: [50, 78],
  },
};

export type ResidentialQuarterProps = {
  id: string;
  position?: WorldPosition;
  rotationY?: number;
  tier?: ResidentialTier;
  typology?: ResidentialTypology;
  count?: number;
  footprint?: readonly [width: number, depth: number];
  seed?: number;
  onEnter?: EnterHandler;
};

/**
 * Procedural residential superblock. Tier changes density, height, garden ratio
 * and façade palette; typology supports towers, attached and detached housing.
 */
export function ResidentialQuarter({
  id,
  position = [0, 0, 0],
  rotationY = 0,
  tier = 'MID_MARKET',
  typology = 'MIXED',
  count = 12,
  footprint = [68, 58],
  seed = 42,
  onEnter,
}: ResidentialQuarterProps) {
  const generated = useMemo(() => {
    const random = seededRandom(seed);
    const palette = RESIDENTIAL_PALETTES[tier];
    const sites: BuildingSite[] = [];
    const paths: BoxInstance[] = [];
    const gardenTrunks: RoundInstance[] = [];
    const gardenCrowns: RoundInstance[] = [];
    const [areaWidth, areaDepth] = footprint;
    const columns = Math.max(
      2,
      Math.ceil(Math.sqrt((count * areaWidth) / areaDepth)),
    );
    const rows = Math.max(2, Math.ceil(count / columns));
    const cellWidth = areaWidth / columns;
    const cellDepth = areaDepth / rows;

    for (let index = 0; index < count; index += 1) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x =
        -areaWidth / 2 +
        cellWidth * (column + 0.5) +
        (random() - 0.5) * cellWidth * 0.18;
      const z =
        -areaDepth / 2 +
        cellDepth * (row + 0.5) +
        (random() - 0.5) * cellDepth * 0.18;
      const mixedChoice =
        index % 5 < (tier === 'AFFORDABLE' ? 4 : 3) ? 'TOWERS' : 'TOWNHOMES';
      const resolved = typology === 'MIXED' ? mixedChoice : typology;
      const isTower = resolved === 'TOWERS';
      const baseHeight =
        palette.height[0] + random() * (palette.height[1] - palette.height[0]);
      const houseHeight =
        resolved === 'TOWNHOMES'
          ? 5.8
          : resolved === 'SEMI_DETACHED'
            ? 6.8
            : 7.8;
      const width = isTower
        ? Math.min(cellWidth * 0.58, tier === 'ULTRA' ? 12 : 10)
        : Math.min(cellWidth * 0.7, 8.5);
      const depth = isTower
        ? Math.min(cellDepth * 0.57, tier === 'ULTRA' ? 14 : 10)
        : Math.min(cellDepth * 0.72, 10.5);

      sites.push({
        x,
        z,
        width,
        depth,
        height: isTower ? baseHeight : houseHeight,
        rotationY: (random() - 0.5) * 0.1,
        body: palette.body[index % palette.body.length],
        glass: palette.glass[index % palette.glass.length],
      });

      // Semi-detached units read as paired homes, not a single oversized mass.
      if (resolved === 'SEMI_DETACHED' && x + width < areaWidth / 2) {
        sites.push({
          x: x + width * 0.76,
          z,
          width: width * 0.68,
          depth,
          height: houseHeight - 0.35,
          rotationY: 0,
          body: palette.body[(index + 1) % palette.body.length],
          glass: palette.glass[index % palette.glass.length],
        });
      }
    }

    const avenueWidth = tier === 'ULTRA' ? 5.4 : 4.2;
    paths.push(
      {
        position: [0, 0.1, 0],
        scale: [avenueWidth, 0.2, areaDepth],
        color: '#8d8b84',
      },
      {
        position: [0, 0.12, 0],
        scale: [areaWidth, 0.2, avenueWidth],
        color: '#8d8b84',
      },
      {
        position: [0, 0.2, areaDepth / 2 - 3],
        scale: [areaWidth - 6, 0.16, 3.4],
        color: '#c9c2ad',
      },
    );

    const gardenCount = Math.max(
      8,
      Math.round(count * (tier === 'AFFORDABLE' ? 0.8 : 1.45)),
    );
    for (let index = 0; index < gardenCount; index += 1) {
      let x = (random() - 0.5) * (areaWidth - 7);
      let z = (random() - 0.5) * (areaDepth - 7);
      if (Math.abs(x) < avenueWidth) x += Math.sign(x || 1) * avenueWidth * 1.4;
      if (Math.abs(z) < avenueWidth) z += Math.sign(z || 1) * avenueWidth * 1.4;
      gardenTrunks.push({
        position: [x, 1, z],
        scale: [0.36, 2, 0.36],
        color: '#5a4531',
      });
      gardenCrowns.push({
        position: [x, 2.8, z],
        scale: [2.2, 2.6, 2.2],
        color: index % 3 === 0 ? '#496b45' : '#597952',
      });
    }

    return { sites, paths, gardenTrunks, gardenCrowns, areaWidth, areaDepth };
  }, [count, footprint, seed, tier, typology]);

  return (
    <group
      position={position}
      rotation-y={rotationY}
      name={id}
      userData={{ id, tier, typology, category: 'RESIDENTIAL_QUARTER' }}
    >
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry
          args={[generated.areaWidth + 4, 0.24, generated.areaDepth + 4]}
        />
        <meshStandardMaterial
          color={tier === 'ULTRA' ? '#55604f' : '#65705d'}
          roughness={0.96}
        />
      </mesh>
      <FacadeBuildingCluster sites={generated.sites} />
      <InstancedBoxes instances={generated.paths} roughness={0.9} />
      <InstancedRounds instances={generated.gardenTrunks} shape="CYLINDER" />
      <InstancedRounds instances={generated.gardenCrowns} />

      <group position={[0, 1.7, generated.areaDepth / 2 + 1]}>
        <mesh position={[-3.2, 0, 0]}>
          <boxGeometry args={[0.8, 3.4, 0.8]} />
          <meshStandardMaterial color="#c5bca9" roughness={0.62} />
        </mesh>
        <mesh position={[3.2, 0, 0]}>
          <boxGeometry args={[0.8, 3.4, 0.8]} />
          <meshStandardMaterial color="#c5bca9" roughness={0.62} />
        </mesh>
        <mesh position={[0, 1.3, 0]}>
          <boxGeometry args={[7.2, 0.5, 0.7]} />
          <meshStandardMaterial
            color="#343b3f"
            metalness={0.38}
            roughness={0.38}
          />
        </mesh>
        <mesh
          position={[0, -0.45, -0.25]}
          onClick={(event) => {
            event.stopPropagation();
            onEnter?.(id);
          }}
          visible={false}
        >
          <boxGeometry args={[9, 4, 4]} />
          <meshBasicMaterial />
        </mesh>
      </group>
    </group>
  );
}

export type MarinaHotelDistrictProps = {
  id: string;
  position?: WorldPosition;
  rotationY?: number;
  hotelCount?: number;
  berthCount?: number;
  seed?: number;
  onEnter?: EnterHandler;
};

/** Resort hotels, a public waterfront and a mixed-size recreational marina. */
export function MarinaHotelDistrict({
  id,
  position = [0, 0, 0],
  rotationY = 0,
  hotelCount = 6,
  berthCount = 18,
  seed = 91,
  onEnter,
}: MarinaHotelDistrictProps) {
  const district = useMemo(() => {
    const random = seededRandom(seed);
    const hotels: BuildingSite[] = [];
    const promenade: BoxInstance[] = [
      { position: [-18, 0.18, 0], scale: [34, 0.36, 8], color: '#d8cdb4' },
      { position: [8, 0.16, 0], scale: [18, 0.32, 7], color: '#cabf9f' },
    ];
    const piers: BoxInstance[] = [];
    const hulls: RoundInstance[] = [];
    const cabins: BoxInstance[] = [];
    const upperDecks: BoxInstance[] = [];
    const masts: RoundInstance[] = [];
    const trunks: RoundInstance[] = [];
    const crowns: RoundInstance[] = [];

    for (let index = 0; index < hotelCount; index += 1) {
      const row = Math.floor(index / 3);
      const column = index % 3;
      hotels.push({
        x: -25 + column * 14 + (row % 2) * 4,
        z: -18 - row * 15,
        width: 9 + random() * 3,
        depth: 8 + random() * 4,
        height: 18 + random() * 22,
        rotationY: (column - 1) * 0.08,
        body: index % 2 ? '#ddd4c4' : '#c9c4b8',
        glass: index % 2 ? '#386f81' : '#2e6074',
      });
    }

    const pierCount = Math.max(4, Math.ceil(berthCount / 4));
    for (let index = 0; index < pierCount; index += 1) {
      const x = -23 + index * 10;
      piers.push(
        { position: [x, 0.2, 16], scale: [2.2, 0.38, 26], color: '#9e8162' },
        { position: [x, 0.2, 29], scale: [8.5, 0.38, 2.1], color: '#9e8162' },
      );
    }

    for (let index = 0; index < berthCount; index += 1) {
      const pier = index % pierCount;
      const lane = Math.floor(index / pierCount);
      const side = lane % 2 === 0 ? -1 : 1;
      const sizeClass = index % 9 === 0 ? 2.05 : index % 4 === 0 ? 1.45 : 0.92;
      const x = -23 + pier * 10 + side * (2.6 + sizeClass * 1.2);
      const z = 8 + Math.floor(lane / 2) * 7.3 + random() * 1.2;
      hulls.push({
        position: [x, 0.8, z],
        scale: [1.5 * sizeClass, 0.72 * sizeClass, 4.6 * sizeClass],
        color: index % 3 === 0 ? '#1e4055' : '#e7e9e5',
      });
      cabins.push({
        position: [x, 1.45 * sizeClass, z - 0.4 * sizeClass],
        scale: [1.35 * sizeClass, 0.7 * sizeClass, 1.8 * sizeClass],
        color: '#e8e5da',
      });
      upperDecks.push({
        position: [x, 1.9 * sizeClass, z + 0.1 * sizeClass],
        scale: [1.05 * sizeClass, 0.17 * sizeClass, 2.2 * sizeClass],
        color: '#52798a',
      });
      if (sizeClass > 1) {
        masts.push({
          position: [x, 3.1 * sizeClass, z],
          scale: [0.14, 3.2 * sizeClass, 0.14],
          color: '#545c60',
        });
      }
    }

    for (let index = 0; index < 13; index += 1) {
      const x = -31 + index * 5.2;
      trunks.push({
        position: [x, 1.35, -1.2],
        scale: [0.46, 2.7, 0.46],
        color: '#6d5032',
      });
      crowns.push({
        position: [x, 3.6, -1.2],
        scale: [2.4, 2.7, 2.4],
        color: '#4f7853',
      });
    }

    return {
      hotels,
      promenade,
      piers,
      hulls,
      cabins,
      upperDecks,
      masts,
      trunks,
      crowns,
    };
  }, [berthCount, hotelCount, seed]);

  return (
    <group
      position={position}
      rotation-y={rotationY}
      name={id}
      userData={{ id, category: 'MARINA_HOTEL_DISTRICT' }}
    >
      <mesh position={[0, -0.12, 24]} receiveShadow>
        <boxGeometry args={[84, 0.24, 58]} />
        <meshStandardMaterial
          color="#2c7690"
          roughness={0.2}
          metalness={0.25}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh position={[-10, -0.18, -28]} receiveShadow>
        <boxGeometry args={[70, 0.36, 56]} />
        <meshStandardMaterial color="#68745c" roughness={0.98} />
      </mesh>

      <FacadeBuildingCluster sites={district.hotels} />
      <InstancedBoxes instances={district.promenade} roughness={0.88} />
      <InstancedBoxes instances={district.piers} roughness={0.74} />
      <InstancedRounds
        instances={district.hulls}
        roughness={0.24}
        metalness={0.22}
      />
      <InstancedBoxes instances={district.cabins} roughness={0.42} />
      <InstancedBoxes
        instances={district.upperDecks}
        roughness={0.18}
        metalness={0.38}
      />
      <InstancedRounds
        instances={district.masts}
        shape="CYLINDER"
        metalness={0.64}
        roughness={0.28}
      />
      <InstancedRounds instances={district.trunks} shape="CYLINDER" />
      <InstancedRounds instances={district.crowns} />

      <mesh
        position={[-17, 1.5, -2]}
        onClick={(event) => {
          event.stopPropagation();
          onEnter?.(id);
        }}
        visible={false}
      >
        <boxGeometry args={[40, 4, 11]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}
