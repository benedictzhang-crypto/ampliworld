'use client';
import { Clone, useGLTF } from '@react-three/drei';
import { METROPOLITAN_PLACES, CENTER_ROADS } from './metropolitan-registry';
function Landmark({
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
export function MetropolitanPlaces() {
  return (
    <group name="metropolitan-subcenters-and-estuary">
      {METROPOLITAN_PLACES.map((p) => (
        <Landmark key={p.id} {...p} />
      ))}
      {CENTER_ROADS.map((r) => (
        <group key={r.id}>
          <mesh
            position={[
              (r.min[0] + r.max[0]) / 2,
              r.y - 0.025,
              (r.min[1] + r.max[1]) / 2,
            ]}
            receiveShadow
          >
            <boxGeometry
              args={[r.max[0] - r.min[0], 0.05, r.max[1] - r.min[1]]}
            />
            <meshStandardMaterial color="#626f75" roughness={0.88} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
