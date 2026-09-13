'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { InstancedMesh, Mesh, Matrix4, Quaternion, Vector3 } from 'three';
import tree from '../../public/assets/3d/ampliworld/GC-TREE-001/tree-manifest.json';
const positions = [
  ...tree.replacementPlacements.core,
  ...tree.replacementPlacements.south,
];
function TreeBatch({ mesh }: { mesh: Mesh }) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const m = new Matrix4(),
      q = new Quaternion(),
      p = new Vector3(),
      s = new Vector3();
    positions.forEach((t, i) => {
      q.setFromAxisAngle(new Vector3(0, 1, 0), i * 2.39996);
      s.setScalar(0.88 + (i % 5) * 0.045);
      p.fromArray(t.position);
      m.compose(p, q, s);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingBox();
    ref.current.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh
      ref={ref}
      args={[mesh.geometry, mesh.material, positions.length]}
      castShadow
      receiveShadow
    />
  );
}
export function StreetTrees() {
  const { scene } = useGLTF('/assets/3d/ampliworld/GC-TREE-001/tree.glb');
  const meshes = useMemo(() => {
    const a: Mesh[] = [];
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) a.push(o as Mesh);
    });
    return a;
  }, [scene]);
  return (
    <group>
      {meshes.map((m) => (
        <TreeBatch key={m.uuid} mesh={m} />
      ))}
    </group>
  );
}
