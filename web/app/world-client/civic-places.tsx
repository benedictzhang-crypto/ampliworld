'use client';
import { Clone, useGLTF } from '@react-three/drei';
import { CIVIC_PLACES } from './civic-registry';
import { useMemo } from 'react';
import { Mesh, Material } from 'three';
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
  const display = useMemo(() => {
    const c = scene.clone(true);
    if (id === 'GC-SPORT-STREET-001')
      c.traverse((o) => {
        const m = o as Mesh;
        if (
          m.isMesh &&
          ['wood', 'leaf'].includes((m.material as Material).name)
        )
          m.visible = false;
      });
    return c;
  }, [scene, id]);
  return (
    <group position={[x, 0, z]}>
      <Clone object={display} castShadow receiveShadow />
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
      <CivicAsset id="GC-MALL-GARAGE-001" file="garage.glb" x={0} z={-188} />
      {[-70, 0, 75].flatMap((x) =>
        [-240, -150].map((z) => (
          <pointLight
            key={`${x}/${z}`}
            position={[x, -1.1, z]}
            color="#e3eaff"
            intensity={140}
            distance={100}
            decay={1}
          />
        )),
      )}
    </>
  );
}
