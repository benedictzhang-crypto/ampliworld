'use client';
import { Clone, useGLTF } from '@react-three/drei';
import { CIVIC_PLACES } from './civic-registry';
function CivicAsset({
  id,
  file,
  x,
  z,
}: {
  id: string;
  file: string;
  x: number;
  z: number;
}) {
  const { scene } = useGLTF(`/assets/3d/ampliworld/${id}/${file}`);
  return (
    <group position={[x, 0, z]}>
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}
export function CivicPlaces() {
  return (
    <>
      <CivicAsset
        id="GC-SPORT-STREET-001"
        file="sports-streets.glb"
        x={0}
        z={0}
      />
      {CIVIC_PLACES.map((p) => (
        <CivicAsset key={p.id} {...p} />
      ))}
    </>
  );
}
