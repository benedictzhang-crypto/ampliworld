'use client';

import { Clone, useGLTF } from '@react-three/drei';
import { METRO_PORTAL, METRO_STATIONS } from './metro-network';
import { cityGroundHeight } from './city-surface';
import { MetroViaduct } from './metro-viaduct';

const METRO_ASSETS = '/assets/3d/ampliworld/GC-METRO-001';

function ElevatedStation({ x, z }: { x: number; z: number }) {
  const { scene } = useGLTF(`${METRO_ASSETS}/elevated-station.glb`);
  return (
    <group position={[x, cityGroundHeight(x, z), z]}>
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}

function PortalTransition() {
  const { scene } = useGLTF(`${METRO_ASSETS}/portal-transition.glb`);
  return (
    <group
      position={[METRO_PORTAL.x, cityGroundHeight(METRO_PORTAL.x, METRO_PORTAL.z), METRO_PORTAL.z]}
      rotation={[0, METRO_PORTAL.headingRadians, 0]}
    >
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}

/** Renders only the station structures that have a safe above-ground footprint.
 * Underground entrances are intentionally withheld until the terrain cut and
 * vertical access are physically navigable. */
export function MetroPlaces({ x, z }: { x: number; z: number }) {
  return (
    <group name="metro-pilot-visible-structures">
      <MetroViaduct x={x} z={z} />
      {METRO_STATIONS.filter((station) =>
        station.mode === 'ELEVATED' && Math.hypot(station.x - x, station.z - z) < 2200,
      ).map((station) => (
        <ElevatedStation key={station.id} x={station.x} z={station.z} />
      ))}
      {Math.hypot(METRO_PORTAL.x - x, METRO_PORTAL.z - z) < 2200 && <PortalTransition />}
    </group>
  );
}
