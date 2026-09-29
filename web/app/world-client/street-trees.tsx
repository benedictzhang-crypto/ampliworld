'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { InstancedMesh, Mesh, Matrix4, Quaternion, Vector3 } from 'three';
import tree from '../../public/assets/3d/ampliworld/GC-TREE-001/tree-manifest.json';
const positions = [
  ...tree.replacementPlacements.core,
  ...tree.replacementPlacements.south,
];
// Spatial batches retain full-detail trees while allowing the GPU to skip
// blocks behind the camera. A city-wide instance bound defeated frustum culling.
const cells = new Map<string, typeof positions>();
for (const position of positions) {
  const key = `${Math.floor(position.position[0]/200)}:${Math.floor(position.position[2]/200)}`;
  const cell = cells.get(key) ?? [];
  cell.push(position); cells.set(key, cell);
}
function TreeBatch({ mesh, trees }: { mesh: Mesh; trees: typeof positions }) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const m = new Matrix4(),
      q = new Quaternion(),
      p = new Vector3(),
      s = new Vector3();
    trees.forEach((t, i) => {
      q.setFromAxisAngle(new Vector3(0, 1, 0), i * 2.39996);
      s.setScalar(0.88 + (i % 5) * 0.045);
      p.fromArray(t.position);
      m.compose(p, q, s);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingBox();
    ref.current.computeBoundingSphere();
  }, [trees]);
  return (
    <instancedMesh
      ref={ref}
      args={[mesh.geometry, mesh.material, trees.length]}
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
      {[...cells].flatMap(([cell, trees]) => meshes.map(m =>
        <TreeBatch key={`${cell}/${m.uuid}`} mesh={m} trees={trees} />,
      ))}
    </group>
  );
}
