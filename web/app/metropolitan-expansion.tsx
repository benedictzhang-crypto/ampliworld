'use client';

import { Html } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import {
  F1_CIRCUIT_POINTS,
  F1_PIT_LANE_POINTS,
  NAMED_WORLD_SOLIDS,
  OCEAN_SKYRAIL_ROUTE,
  WORLD_SURFACE_RAMPS,
  getWorldFootprintElevationRange,
  getWorldGroundElevation,
} from './world-spatial-registry';
import type { WorldPoint } from './world-topology';

type LandmarkSelect = (id: string) => void;

function SegmentBox({
  from,
  to,
  y = 0,
  endY = y,
  width,
  thickness,
  color,
  emissive,
}: {
  from: WorldPoint;
  to: WorldPoint;
  y?: number;
  endY?: number;
  width: number;
  thickness: number;
  color: THREE.ColorRepresentation;
  emissive?: THREE.ColorRepresentation;
}) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const horizontalLength = Math.hypot(dx, dz);
  const slope = Math.atan2(endY - y, horizontalLength);
  const length = Math.hypot(horizontalLength, endY - y);
  return (
    <mesh
      castShadow
      receiveShadow
      position={[(from[0] + to[0]) / 2, (y + endY) / 2, (from[1] + to[1]) / 2]}
      rotation={[-slope, Math.atan2(dx, dz), 0]}
    >
      <boxGeometry args={[width, thickness, length + 0.18]} />
      <meshStandardMaterial
        color={color}
        roughness={0.68}
        metalness={0.2}
        emissive={emissive}
        emissiveIntensity={emissive ? 0.16 : 0}
      />
    </mesh>
  );
}

function LandmarkPortal({
  position,
  label,
  id,
  onSelect,
  viewer,
}: {
  position: [number, number, number];
  label: string;
  id: string;
  onSelect?: LandmarkSelect;
  viewer: WorldPoint;
}) {
  if (Math.hypot(position[0] - viewer[0], position[2] - viewer[1]) > 32)
    return null;
  return (
    <Html position={position} center distanceFactor={15} zIndexRange={[3, 0]}>
      <button
        className="world-label enterable"
        onClick={(event) => {
          event.stopPropagation();
          onSelect?.(id);
        }}
      >
        {label}
      </button>
    </Html>
  );
}

function CyberSanctuary({
  onSelect,
  viewer,
}: {
  onSelect?: LandmarkSelect;
  viewer: WorldPoint;
}) {
  const nave = NAMED_WORLD_SOLIDS.find(
    (building) => building.id === 'CIV-SANCTUARY-NAVE',
  )!;
  const tower = NAMED_WORLD_SOLIDS.find(
    (building) => building.id === 'CIV-SANCTUARY-TOWER',
  )!;
  const baseY = getWorldGroundElevation(nave.center[0], nave.center[1]);
  const towerLocalX = tower.center[0] - nave.center[0];
  const towerLocalZ = tower.center[1] - nave.center[1];
  return (
    <group
      name="CIV-SANCTUARY · Aurelian Cyber Sanctuary"
      position={[nave.center[0], baseY, nave.center[1]]}
    >
      <mesh receiveShadow position={[1, 0.08, 0]}>
        <boxGeometry args={[22, 0.16, 26]} />
        <meshStandardMaterial color="#dad7cf" roughness={0.92} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, nave.height / 2, 0]}>
        <boxGeometry
          args={[nave.halfExtents[0] * 2, nave.height, nave.halfExtents[1] * 2]}
        />
        <meshStandardMaterial color="#b8b5ae" roughness={0.78} />
      </mesh>
      <mesh
        castShadow
        position={[0, nave.height + 2.2, 1]}
        rotation={[0, 0, Math.PI / 4]}
      >
        <boxGeometry args={[6.5, 6.5, 15.8]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.52} />
      </mesh>
      {[-1, 1].flatMap((side) =>
        [-5.7, 0, 5.7].map((z) => (
          <mesh
            key={`${side}-${z}`}
            castShadow
            position={[side * (nave.halfExtents[0] + 0.48), 5.4, z]}
          >
            <boxGeometry args={[0.95, 10.8, 1.05]} />
            <meshStandardMaterial color="#8f8d88" roughness={0.88} />
          </mesh>
        )),
      )}
      <mesh castShadow position={[towerLocalX, tower.height / 2, towerLocalZ]}>
        <boxGeometry
          args={[
            tower.halfExtents[0] * 2,
            tower.height,
            tower.halfExtents[1] * 2,
          ]}
        />
        <meshStandardMaterial
          color="#a8a6a0"
          roughness={0.66}
          metalness={0.16}
        />
      </mesh>
      <mesh position={[towerLocalX, tower.height + 3.8, towerLocalZ]}>
        <octahedronGeometry args={[3.8, 0]} />
        <meshStandardMaterial
          color="#d8b25d"
          metalness={0.82}
          roughness={0.2}
          emissive="#6e4d14"
          emissiveIntensity={0.2}
        />
      </mesh>
      {[
        [0, 3.2, -9.3],
        [3.2, 3.2, 0],
        [-3.2, 3.2, 0],
      ].map(([x, y, z], index) => (
        <mesh key={index} position={[x, y, z]}>
          <boxGeometry args={[index === 0 ? 2.6 : 0.38, 5.7, 0.28]} />
          <meshStandardMaterial
            color="#d9b65e"
            metalness={0.72}
            roughness={0.18}
            emissive="#7c5818"
            emissiveIntensity={0.22}
          />
        </mesh>
      ))}
      <mesh position={[0, 2.25, -9.28]}>
        <boxGeometry args={[3.1, 4.5, 0.22]} />
        <meshPhysicalMaterial
          color="#f6f3ea"
          metalness={0.52}
          roughness={0.22}
          clearcoat={0.72}
        />
      </mesh>
      <LandmarkPortal
        id="cyber-sanctuary"
        label="AURELIAN CYBER SANCTUARY · PORTAL"
        position={[0, 5.6, -10.1]}
        onSelect={onSelect}
        viewer={[viewer[0] - nave.center[0], viewer[1] - nave.center[1]]}
      />
    </group>
  );
}

const SUMMIT_VILLA_FORMS = [
  {
    lower: [0.92, 0.48, 0.78, 0, -0.06],
    upper: [0.7, 0.32, 0.64, -0.12, 0.08, 0.5],
    glassWidth: 0.72,
    fins: 5,
    poolX: 0.2,
  },
  {
    lower: [0.68, 0.44, 0.65, -0.12, -0.08],
    upper: [0.9, 0.37, 0.55, 0.06, 0.1, 0.48],
    glassWidth: 0.82,
    fins: 4,
    poolX: -0.22,
  },
  {
    lower: [0.9, 0.5, 0.7, 0, -0.08],
    upper: [0.42, 0.38, 0.78, -0.24, 0.05, 0.48],
    glassWidth: 0.64,
    fins: 6,
    poolX: 0,
  },
  {
    lower: [0.98, 0.38, 0.56, 0, -0.1],
    upper: [0.86, 0.28, 0.48, 0.08, 0.1, 0.4],
    glassWidth: 0.86,
    fins: 3,
    poolX: -0.25,
  },
  {
    lower: [0.78, 0.45, 0.76, -0.07, -0.03],
    upper: [0.68, 0.43, 0.58, 0.12, 0.12, 0.46],
    glassWidth: 0.68,
    fins: 7,
    poolX: 0.24,
  },
] as const;

function SummitVilla({
  id,
  index,
  onSelect,
  viewer,
}: {
  id: string;
  index: number;
  onSelect?: LandmarkSelect;
  viewer: WorldPoint;
}) {
  const villa = NAMED_WORLD_SOLIDS.find((building) => building.id === id)!;
  const terrain = getWorldFootprintElevationRange(
    villa.center,
    [villa.halfExtents[0] + 1.6, villa.halfExtents[1] + 1.5],
    villa.rotationRadians,
  );
  const baseY = villa.baseElevation!;
  const foundationDepth = Math.max(0.7, baseY - terrain.minimum + 0.35);
  const width = villa.halfExtents[0] * 2;
  const depth = villa.halfExtents[1] * 2;
  const form = SUMMIT_VILLA_FORMS[index];
  const concrete = ['#dad8d1', '#aaa9a5', '#f3f0e6', '#b9b6ac', '#e6e0d3'][
    index
  ];
  const timber = ['#7d5a3f', '#6b5542', '#9a714a', '#5e4c3e', '#98734b'][index];
  return (
    <group
      name={`${villa.id} · ${villa.name}`}
      position={[villa.center[0], baseY, villa.center[1]]}
      rotation={[0, villa.rotationRadians ?? 0, 0]}
    >
      <mesh castShadow receiveShadow position={[0, -foundationDepth / 2, 0]}>
        <boxGeometry args={[width + 1.4, foundationDepth, depth + 1.5]} />
        <meshStandardMaterial color="#77766f" roughness={0.94} />
      </mesh>
      <mesh receiveShadow position={[0, 0.1, 0]}>
        <boxGeometry args={[width + 3.2, 0.2, depth + 3]} />
        <meshStandardMaterial color="#686d63" roughness={0.98} />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        position={[
          width * form.lower[3],
          0.2 + (villa.height * form.lower[1]) / 2,
          depth * form.lower[4],
        ]}
      >
        <boxGeometry
          args={[
            width * form.lower[0],
            villa.height * form.lower[1],
            depth * form.lower[2],
          ]}
        />
        <meshStandardMaterial color={concrete} roughness={0.72} />
      </mesh>
      <mesh
        castShadow
        position={[
          width * form.upper[3],
          villa.height * (form.upper[5] + form.upper[1] / 2),
          depth * form.upper[4],
        ]}
      >
        <boxGeometry
          args={[
            width * form.upper[0],
            villa.height * form.upper[1],
            depth * form.upper[2],
          ]}
        />
        <meshStandardMaterial color={concrete} roughness={0.62} />
      </mesh>
      <mesh position={[0, villa.height * 0.48, depth * 0.365]}>
        <boxGeometry
          args={[width * form.glassWidth, villa.height * 0.42, 0.14]}
        />
        <meshPhysicalMaterial
          color="#6fa3af"
          transmission={0.32}
          transparent
          opacity={0.72}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>
      {Array.from(
        { length: form.fins },
        (_, fin) => -0.36 + (fin / (form.fins - 1)) * 0.72,
      ).map((ratio) => (
        <mesh
          key={ratio}
          position={[ratio * width, villa.height * 0.48, depth * 0.39]}
        >
          <boxGeometry args={[0.16, villa.height * 0.5, 0.2]} />
          <meshStandardMaterial color={timber} roughness={0.55} />
        </mesh>
      ))}
      <mesh
        position={[width * form.poolX, 0.22, -depth * 0.42]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width * 0.46, depth * 0.3]} />
        <meshPhysicalMaterial
          color="#48afce"
          roughness={0.08}
          metalness={0.14}
          transparent
          opacity={0.84}
        />
      </mesh>
      {index === 0 && (
        <group name="Harbour Fold stepped terraces">
          {[0.5, 0.82].map((height, terrace) => (
            <mesh
              key={height}
              castShadow
              position={[-width * 0.08, villa.height * height, depth * 0.34]}
            >
              <boxGeometry
                args={[width * (0.88 - terrace * 0.13), 0.18, depth * 0.25]}
              />
              <meshStandardMaterial color="#eee9dc" roughness={0.48} />
            </mesh>
          ))}
        </group>
      )}
      {index === 1 && (
        <group name="Bel Air cantilever wing">
          <mesh castShadow position={[width * 0.11, villa.height * 0.9, 0]}>
            <boxGeometry args={[width * 0.96, 0.22, depth * 0.7]} />
            <meshStandardMaterial color="#d7d4cd" roughness={0.46} />
          </mesh>
          <mesh
            castShadow
            position={[-width * 0.33, villa.height * 0.43, -depth * 0.2]}
          >
            <boxGeometry args={[0.28, villa.height * 0.82, 0.38]} />
            <meshStandardMaterial color="#675d52" metalness={0.22} />
          </mesh>
        </group>
      )}
      {index === 2 && (
        <group name="Victoria glass courtyard">
          <mesh
            castShadow
            position={[
              width * 0.24,
              villa.height * (form.upper[5] + form.upper[1] / 2),
              depth * form.upper[4],
            ]}
          >
            <boxGeometry
              args={[width * 0.42, villa.height * 0.38, depth * 0.78]}
            />
            <meshStandardMaterial color={concrete} roughness={0.58} />
          </mesh>
          <mesh position={[0, villa.height * 0.72, depth * 0.08]}>
            <boxGeometry
              args={[width * 0.32, villa.height * 0.18, depth * 0.28]}
            />
            <meshPhysicalMaterial
              color="#6ba1ad"
              transmission={0.38}
              transparent
              opacity={0.74}
              metalness={0.24}
              roughness={0.12}
            />
          </mesh>
        </group>
      )}
      {index === 3 && (
        <group name="Mulholland butterfly roof">
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              castShadow
              position={[side * width * 0.23, villa.height * 0.73, 0]}
              rotation={[0, 0, side * -0.08]}
            >
              <boxGeometry args={[width * 0.5, 0.18, depth * 0.66]} />
              <meshStandardMaterial
                color="#777b78"
                metalness={0.34}
                roughness={0.32}
              />
            </mesh>
          ))}
        </group>
      )}
      {index === 4 && (
        <group name="Ampli Summit observatory">
          <mesh castShadow position={[width * 0.1, villa.height * 0.8, 0]}>
            <cylinderGeometry
              args={[width * 0.19, width * 0.23, villa.height * 0.18, 20]}
            />
            <meshPhysicalMaterial
              color="#668e99"
              transmission={0.24}
              transparent
              opacity={0.82}
              metalness={0.46}
              roughness={0.16}
            />
          </mesh>
          <mesh
            position={[width * 0.1, villa.height * 0.91, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[width * 0.24, 0.12, 8, 36]} />
            <meshStandardMaterial
              color="#d0aa55"
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        </group>
      )}
      <LandmarkPortal
        id={villa.id}
        label={`${villa.id} · ${villa.name.toUpperCase()}`}
        position={[0, villa.height + 2.2, 0]}
        onSelect={onSelect}
        viewer={[viewer[0] - villa.center[0], viewer[1] - villa.center[1]]}
      />
    </group>
  );
}

function SummitEstates({
  onSelect,
  viewer,
}: {
  onSelect?: LandmarkSelect;
  viewer: WorldPoint;
}) {
  const villaIds = [
    'VIL-HK-01',
    'VIL-LA-02',
    'VIL-HK-03',
    'VIL-LA-04',
    'VIL-SUMMIT-05',
  ];
  const accessRamps = WORLD_SURFACE_RAMPS.filter((ramp) =>
    ramp.id.startsWith('SURFACE-VIL-'),
  );
  return (
    <group name="Victoria–Bel Air Summit Estates">
      {accessRamps.map((ramp) => (
        <SegmentBox
          key={ramp.id}
          from={ramp.from}
          to={ramp.to}
          y={ramp.startElevation - 0.09}
          endY={ramp.endElevation - 0.09}
          width={ramp.width}
          thickness={0.18}
          color="#73756f"
        />
      ))}
      {villaIds.map((id, index) => (
        <SummitVilla
          key={id}
          id={id}
          index={index}
          onSelect={onSelect}
          viewer={viewer}
        />
      ))}
    </group>
  );
}

function OceanSkyrail() {
  const terminalRamp = WORLD_SURFACE_RAMPS[0];
  const segments = OCEAN_SKYRAIL_ROUTE.slice(0, -1).map((from, index) => ({
    from,
    to: OCEAN_SKYRAIL_ROUTE[index + 1],
    y: 4.6 + index * 0.18,
  }));
  return (
    <group name="M7 Ocean Crown elevated surface metro">
      {segments.map((segment, index) => (
        <group key={index}>
          <SegmentBox
            from={segment.from}
            to={segment.to}
            y={segment.y}
            endY={segment.y + 0.18}
            width={3.3}
            thickness={0.28}
            color="#d8d7d0"
          />
          {[-0.78, 0.78].map((offset) => {
            const dx = segment.to[0] - segment.from[0];
            const dz = segment.to[1] - segment.from[1];
            const length = Math.max(0.001, Math.hypot(dx, dz));
            const nx = -dz / length;
            const nz = dx / length;
            return (
              <SegmentBox
                key={offset}
                from={[
                  segment.from[0] + nx * offset,
                  segment.from[1] + nz * offset,
                ]}
                to={[segment.to[0] + nx * offset, segment.to[1] + nz * offset]}
                y={segment.y + 0.22}
                endY={segment.y + 0.4}
                width={0.1}
                thickness={0.1}
                color="#d7b45e"
                emissive="#6b4e1b"
              />
            );
          })}
          <mesh
            castShadow
            position={[segment.from[0], segment.y / 2, segment.from[1]]}
          >
            <cylinderGeometry args={[0.34, 0.46, segment.y, 10]} />
            <meshStandardMaterial color="#a9aaa5" roughness={0.78} />
          </mesh>
        </group>
      ))}
      <group name="M14 open-air Ocean Crown Terminal" position={[-120, 0, -84]}>
        <mesh position={[0, 4.6, 0]} castShadow receiveShadow>
          <boxGeometry args={[13, 0.3, 5.4]} />
          <meshStandardMaterial color="#d7d6d0" roughness={0.58} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 5.1, 9.25, 0.6]} castShadow>
            <boxGeometry args={[2.8, 0.2, 3.4]} />
            <meshPhysicalMaterial
              color="#b9d2d3"
              transmission={0.28}
              transparent
              opacity={0.72}
              metalness={0.34}
              roughness={0.18}
            />
          </mesh>
        ))}
        {[-5.1, 5.1].flatMap((x) =>
          [-0.9, 2.1].map((z) => (
            <mesh key={`${x}-${z}`} position={[x, 7, z]} castShadow>
              <cylinderGeometry args={[0.13, 0.17, 4.5, 10]} />
              <meshStandardMaterial color="#9d9e99" metalness={0.58} />
            </mesh>
          )),
        )}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 6.38, 6.2, 0]}>
            <boxGeometry args={[0.06, 1.2, 4.4]} />
            <meshPhysicalMaterial
              color="#6fa6b2"
              transmission={0.38}
              transparent
              opacity={0.58}
              roughness={0.12}
            />
          </mesh>
        ))}
        <mesh position={[0, 9.38, 2.15]}>
          <boxGeometry args={[12.2, 0.05, 0.15]} />
          <meshBasicMaterial color="#d7b45e" toneMapped={false} />
        </mesh>
      </group>
      <mesh receiveShadow position={[-120, 0.2, -81.5]}>
        <boxGeometry args={[14, 0.4, 7]} />
        <meshStandardMaterial color="#c9c7c0" roughness={0.82} />
      </mesh>
      <SegmentBox
        from={terminalRamp.from}
        to={terminalRamp.to}
        y={terminalRamp.startElevation - 0.12}
        endY={terminalRamp.endElevation - 0.12}
        width={terminalRamp.width}
        thickness={0.24}
        color="#d8d7d0"
      />
      {[-124.8, -120, -115.2].map((x) => (
        <mesh key={x} castShadow position={[x, 2.55, -84]}>
          <cylinderGeometry args={[0.34, 0.48, 5.1, 10]} />
          <meshStandardMaterial color="#9b9c97" roughness={0.78} />
        </mesh>
      ))}
      <group
        name="Ocean Crown three-car metro"
        position={[-76, 5.46, -70.05]}
        rotation={[0, -1.382, 0]}
      >
        {[-4.7, 0, 4.7].map((offset, index) => (
          <group key={offset} position={[0, 0, offset]}>
            <mesh castShadow>
              <boxGeometry args={[2.45, 1.42, 4.35]} />
              <meshStandardMaterial
                color={index === 1 ? '#e4e2db' : '#f1efe8'}
                metalness={0.48}
                roughness={0.27}
              />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 1.231, 0.18, 0]}>
                <boxGeometry args={[0.025, 0.62, 3.15]} />
                <meshPhysicalMaterial
                  color="#18323d"
                  emissive="#10252e"
                  emissiveIntensity={0.28}
                  metalness={0.42}
                  roughness={0.16}
                />
              </mesh>
            ))}
            <mesh position={[0, -0.52, 2.185]}>
              <boxGeometry args={[2.1, 0.13, 0.035]} />
              <meshBasicMaterial color="#c99d39" toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

function OceanCrown({
  onSelect,
  viewer,
}: {
  onSelect?: LandmarkSelect;
  viewer: WorldPoint;
}) {
  return (
    <group name="Ocean Crown Offshore City">
      <mesh receiveShadow position={[-120, 0.12, -60]}>
        <cylinderGeometry args={[24, 27, 0.48, 64]} />
        <meshStandardMaterial color="#d9d3c5" roughness={0.82} />
      </mesh>
      <mesh castShadow position={[-120, 6.2, -58]}>
        <cylinderGeometry args={[10.5, 12.5, 12.4, 48]} />
        <meshStandardMaterial color="#ece8de" roughness={0.5} />
      </mesh>
      {[3.1, 6.25, 9.4, 12.3].map((y) => (
        <mesh key={y} position={[-120, y, -58]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[12.62, 0.11, 8, 72]} />
          <meshStandardMaterial
            color="#d5af59"
            metalness={0.82}
            roughness={0.19}
            emissive="#68490f"
            emissiveIntensity={0.14}
          />
        </mesh>
      ))}
      {Array.from({ length: 24 }, (_, index) => {
        const angle = (index / 24) * Math.PI * 2;
        const radius = 12.62;
        return (
          <group
            key={`casino-bay-${index}`}
            position={[
              -120 + Math.sin(angle) * radius,
              7.6,
              -58 + Math.cos(angle) * radius,
            ]}
            rotation={[0, angle, 0]}
          >
            <mesh>
              <boxGeometry args={[1.65, 6.7, 0.12]} />
              <meshPhysicalMaterial
                color="#426f79"
                emissive="#183b43"
                emissiveIntensity={0.22}
                transmission={0.16}
                transparent
                opacity={0.86}
                metalness={0.38}
                roughness={0.16}
              />
            </mesh>
            <mesh position={[0.88, 0, 0.08]}>
              <boxGeometry args={[0.09, 7.1, 0.13]} />
              <meshStandardMaterial color="#c7a14e" metalness={0.76} />
            </mesh>
          </group>
        );
      })}
      <group
        name="Ocean Crown ceremonial entrance"
        position={[-120, 0, -70.58]}
      >
        <mesh castShadow position={[0, 3.2, 0]}>
          <boxGeometry args={[6.8, 6.4, 1.4]} />
          <meshStandardMaterial color="#e8e3d8" roughness={0.42} />
        </mesh>
        <mesh position={[0, 3.05, -0.72]}>
          <boxGeometry args={[4.7, 4.9, 0.12]} />
          <meshPhysicalMaterial
            color="#173a45"
            emissive="#12303a"
            emissiveIntensity={0.28}
            transmission={0.2}
            transparent
            opacity={0.9}
            metalness={0.46}
            roughness={0.12}
          />
        </mesh>
        <mesh position={[0, 6.55, -0.72]}>
          <boxGeometry args={[8.3, 0.34, 1.7]} />
          <meshStandardMaterial
            color="#d4aa4d"
            metalness={0.8}
            roughness={0.18}
          />
        </mesh>
      </group>
      <mesh position={[-120, 13.5, -58]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[8.4, 0.72, 16, 64]} />
        <meshStandardMaterial
          color="#d7ae55"
          metalness={0.82}
          roughness={0.18}
          emissive="#62450f"
          emissiveIntensity={0.18}
        />
      </mesh>
      <mesh castShadow position={[-120, 21, -40]}>
        <boxGeometry args={[10.4, 42, 6.8]} />
        <meshPhysicalMaterial
          color="#d7e5e4"
          metalness={0.42}
          roughness={0.18}
          transmission={0.18}
          transparent
          opacity={0.9}
        />
      </mesh>
      {Array.from({ length: 12 }, (_, index) => (
        <mesh key={index} position={[-120, 2.2 + index * 3.25, -36.55]}>
          <boxGeometry args={[8.8, 0.1, 0.08]} />
          <meshBasicMaterial color="#dcb968" toneMapped={false} />
        </mesh>
      ))}
      <LandmarkPortal
        id="ocean-crown"
        label="OCEAN CROWN · CASINO / HOTEL / MARINE THEATRE"
        position={[-120, 7.8, -71.6]}
        onSelect={onSelect}
        viewer={viewer}
      />
    </group>
  );
}

function GrandPrixCircuit({
  onSelect,
  viewer,
}: {
  onSelect?: LandmarkSelect;
  viewer: WorldPoint;
}) {
  const track = useMemo(
    () =>
      F1_CIRCUIT_POINTS.slice(0, -1).map((from, index) => ({
        from,
        to: F1_CIRCUIT_POINTS[index + 1],
      })),
    [],
  );
  const pit = NAMED_WORLD_SOLIDS.find(
    (solid) => solid.id === 'F1-PIT-COMPLEX',
  )!;
  const grandstand = NAMED_WORLD_SOLIDS.find(
    (solid) => solid.id === 'F1-GRANDSTAND',
  )!;
  const grandstandTerrain = getWorldFootprintElevationRange(
    grandstand.center,
    grandstand.halfExtents,
    grandstand.rotationRadians,
  );
  const grandstandBase = grandstand.baseElevation!;
  const grandstandFoundationDepth = Math.max(
    0.8,
    grandstandBase - grandstandTerrain.minimum + 0.35,
  );
  return (
    <group name="Ampli Grand Prix Circuit">
      {track.map(({ from, to }, index) => {
        const dx = to[0] - from[0];
        const dz = to[1] - from[1];
        const length = Math.max(0.001, Math.hypot(dx, dz));
        const normal: WorldPoint = [-dz / length, dx / length];
        const fromGround = getWorldGroundElevation(from[0], from[1]);
        const toGround = getWorldGroundElevation(to[0], to[1]);
        return (
          <group key={index}>
            <SegmentBox
              from={from}
              to={to}
              y={fromGround + 0.18}
              endY={toGround + 0.18}
              width={6.3}
              thickness={0.16}
              color="#25292b"
            />
            {[-1, 1].map((side) => (
              <group key={side}>
                <SegmentBox
                  from={[
                    from[0] + normal[0] * 3.05 * side,
                    from[1] + normal[1] * 3.05 * side,
                  ]}
                  to={[
                    to[0] + normal[0] * 3.05 * side,
                    to[1] + normal[1] * 3.05 * side,
                  ]}
                  y={fromGround + 0.29}
                  endY={toGround + 0.29}
                  width={0.42}
                  thickness={0.08}
                  color={index % 2 ? '#f0ede4' : '#b93b35'}
                />
                <SegmentBox
                  from={[
                    from[0] + normal[0] * 3.72 * side,
                    from[1] + normal[1] * 3.72 * side,
                  ]}
                  to={[
                    to[0] + normal[0] * 3.72 * side,
                    to[1] + normal[1] * 3.72 * side,
                  ]}
                  y={fromGround + 0.74}
                  endY={toGround + 0.74}
                  width={0.12}
                  thickness={1.15}
                  color="#bfc3c0"
                />
              </group>
            ))}
          </group>
        );
      })}
      <SegmentBox
        from={F1_PIT_LANE_POINTS[1]}
        to={F1_PIT_LANE_POINTS[2]}
        y={0.18}
        width={3.2}
        thickness={0.14}
        color="#303537"
      />
      <SegmentBox
        from={F1_PIT_LANE_POINTS[0]}
        to={F1_PIT_LANE_POINTS[1]}
        y={0.2}
        width={1.8}
        thickness={0.12}
        color="#303537"
      />
      <SegmentBox
        from={F1_PIT_LANE_POINTS[2]}
        to={F1_PIT_LANE_POINTS[3]}
        y={0.2}
        width={1.8}
        thickness={0.12}
        color="#303537"
      />
      {[118, 124, 130, 136, 142].map((x) => (
        <mesh key={x} position={[x, 0.29, -73.92]}>
          <boxGeometry args={[0.12, 0.03, 4.2]} />
          <meshBasicMaterial color="#f1eee5" />
        </mesh>
      ))}
      <mesh
        castShadow
        position={[
          pit.center[0],
          (pit.baseElevation ?? 0) + pit.height / 2,
          pit.center[1],
        ]}
      >
        <boxGeometry
          args={[pit.halfExtents[0] * 2, pit.height, pit.halfExtents[1] * 2]}
        />
        <meshStandardMaterial color="#d7d5cf" roughness={0.56} />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => (
        <mesh key={index} position={[118 + index * 3.4, 1.8, -64.12]}>
          <boxGeometry args={[2.25, 3.2, 0.18]} />
          <meshStandardMaterial
            color={index % 2 ? '#ba3e36' : '#f0ede5'}
            roughness={0.48}
          />
        </mesh>
      ))}
      <mesh
        castShadow
        receiveShadow
        position={[
          grandstand.center[0],
          grandstandBase - grandstandFoundationDepth / 2,
          grandstand.center[1],
        ]}
        rotation={[0, grandstand.rotationRadians ?? 0, 0]}
      >
        <boxGeometry
          args={[
            grandstand.halfExtents[0] * 2,
            grandstandFoundationDepth,
            grandstand.halfExtents[1] * 2,
          ]}
        />
        <meshStandardMaterial color="#777a76" roughness={0.94} />
      </mesh>
      <mesh
        castShadow
        position={[
          grandstand.center[0],
          grandstandBase + grandstand.height / 2,
          grandstand.center[1],
        ]}
        rotation={[0, grandstand.rotationRadians ?? 0, 0]}
      >
        <boxGeometry
          args={[
            grandstand.halfExtents[0] * 2,
            grandstand.height,
            grandstand.halfExtents[1] * 2,
          ]}
        />
        <meshStandardMaterial color="#b8bbb7" roughness={0.62} />
      </mesh>
      <LandmarkPortal
        id="ampli-grand-prix"
        label="AMPLI GRAND PRIX · CIRCUIT / PIT / MOBILITY LAB"
        position={[131, 11, -54]}
        onSelect={onSelect}
        viewer={viewer}
      />
    </group>
  );
}

function EasternInterchange() {
  const route: readonly WorldPoint[] = [
    [76, -40],
    [92, -44],
    [108, -50],
    [124, -55],
  ];
  return (
    <group name="East mobility grade-separated interchange">
      {route.slice(0, -1).map((from, index) => (
        <group key={index}>
          <SegmentBox
            from={from}
            to={route[index + 1]}
            y={2.8 + index * 0.35}
            endY={3.15 + index * 0.35}
            width={6.4}
            thickness={0.32}
            color="#454a4b"
          />
          <mesh position={[from[0], 1.45, from[1]]} castShadow>
            <cylinderGeometry args={[0.42, 0.58, 2.9, 10]} />
            <meshStandardMaterial color="#92938f" roughness={0.82} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function MetropolitanExpansion({
  onLandmarkSelect,
  playerPosition,
}: {
  onLandmarkSelect?: LandmarkSelect;
  playerPosition: WorldPoint;
}) {
  const distanceTo = (point: WorldPoint) =>
    Math.hypot(playerPosition[0] - point[0], playerPosition[1] - point[1]);
  const showSanctuary = distanceTo([31, 64]) < 105;
  const showSummit = distanceTo([103, 18]) < 95;
  const showOcean = distanceTo([-120, -60]) < 112;
  let nearestSkyrailDistance = Number.POSITIVE_INFINITY;
  for (const point of OCEAN_SKYRAIL_ROUTE)
    nearestSkyrailDistance = Math.min(
      nearestSkyrailDistance,
      distanceTo(point),
    );
  const showSkyrail = nearestSkyrailDistance < 88;
  const showMotorsport = distanceTo([131, -56]) < 108;
  const showEasternInterchange = distanceTo([102, -48]) < 100;
  return (
    <group name="Named metropolitan expansion">
      {showSanctuary && (
        <CyberSanctuary onSelect={onLandmarkSelect} viewer={playerPosition} />
      )}
      {showSummit && (
        <SummitEstates onSelect={onLandmarkSelect} viewer={playerPosition} />
      )}
      {showSkyrail && <OceanSkyrail />}
      {showOcean && (
        <OceanCrown onSelect={onLandmarkSelect} viewer={playerPosition} />
      )}
      {showMotorsport && (
        <GrandPrixCircuit onSelect={onLandmarkSelect} viewer={playerPosition} />
      )}
      {showEasternInterchange && <EasternInterchange />}
    </group>
  );
}
