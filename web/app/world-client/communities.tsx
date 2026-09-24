'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { InstancedMesh, Mesh, Matrix4, Quaternion, Vector3 } from 'three';
import {
  COMMUNITY_KITS,
  COMMUNITY_SURFACES,
  COMMUNITY_WALLS,
  HOMES,
  type HomePlacement,
} from './community-registry';

function Batch({
  mesh,
  placements,
}: {
  mesh: Mesh;
  placements: HomePlacement[];
}) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const matrix = new Matrix4(),
      rotation = new Quaternion(),
      position = new Vector3(),
      scale = new Vector3(1, 1, 1),
      up = new Vector3(0, 1, 0);
    placements.forEach((p, i) => {
      rotation.setFromAxisAngle(up, p.yaw);
      position.set(p.x, p.y, p.z);
      matrix.compose(position, rotation, scale).multiply(mesh.matrixWorld);
      ref.current!.setMatrixAt(i, matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingBox();
    ref.current.computeBoundingSphere();
  }, [mesh, placements]);
  return (
    <instancedMesh
      ref={ref}
      args={[mesh.geometry, mesh.material, placements.length]}
      castShadow
      receiveShadow
    />
  );
}
function HomeKit({ kind, index }: { kind: 'middle' | 'villa'; index: number }) {
  const kit = COMMUNITY_KITS[kind],
    model = kit.manifest.prototypes[index];
  const { scene } = useGLTF(`/assets/3d/ampliworld/${kit.id}/${model.file}`);
  const placements = useMemo(
    () => HOMES.filter((p) => p.kind === kind && p.prototype === index),
    [kind, index],
  );
  const meshes = useMemo(() => {
    scene.updateMatrixWorld(true);
    const list: Mesh[] = [];
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) list.push(o as Mesh);
    });
    return list;
  }, [scene]);
  return (
    <group>
      {meshes.map((mesh) => (
        <Batch key={mesh.uuid} mesh={mesh} placements={placements} />
      ))}
    </group>
  );
}
function Paving({ kind }: { kind: 'road' | 'walk' | 'garden' }) {
  const ref = useRef<InstancedMesh>(null);
  const items = useMemo(
    () => COMMUNITY_SURFACES.filter((s) => s.kind === kind),
    [kind],
  );
  useEffect(() => {
    if (!ref.current) return;
    const m = new Matrix4();
    items.forEach((s, i) => {
      m.makeScale(s.max[0] - s.min[0], 0.025, s.max[1] - s.min[1]);
      m.setPosition(
        (s.min[0] + s.max[0]) / 2,
        s.y - 0.0125,
        (s.min[1] + s.max[1]) / 2,
      );
      ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, items.length]}
      receiveShadow
    >
      <boxGeometry />
      <meshStandardMaterial
        color={
          kind === 'road' ? '#59686b' : kind === 'walk' ? '#a8ada4' : '#718766'
        }
        roughness={0.9}
      />
    </instancedMesh>
  );
}
export function Communities() {
  return (
    <group name="registered-residential-communities">
      {(['middle', 'villa'] as const).flatMap((kind) =>
        COMMUNITY_KITS[kind].manifest.prototypes.map((_, i) => (
          <HomeKit key={`${kind}-${i}`} kind={kind} index={i} />
        )),
      )}
      <Paving kind="garden" />
      <Paving kind="road" />
      <Paving kind="walk" />
      <BoundaryWalls />
      <CommunityTrees />
    </group>
  );
}
function BoundaryWalls() {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const m = new Matrix4();
    COMMUNITY_WALLS.forEach((w, i) => {
      m.makeScale(
        w.max[0] - w.min[0],
        w.max[1] - w.min[1],
        w.max[2] - w.min[2],
      );
      m.setPosition(
        (w.min[0] + w.max[0]) / 2,
        (w.min[1] + w.max[1]) / 2,
        (w.min[2] + w.max[2]) / 2,
      );
      ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, COMMUNITY_WALLS.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry />
      <meshStandardMaterial color="#bfc4b4" roughness={0.82} />
    </instancedMesh>
  );
}
function CommunityTrees() {
  const { scene } = useGLTF('/assets/3d/ampliworld/GC-TREE-001/tree.glb');
  const placements = useMemo(
    () =>
      HOMES.filter((p, i) => p.kind === 'middle' || i % 2 === 0).map((p) => ({
        ...p,
        x: p.x + (p.kind === 'middle' ? 32 : 16),
        z: p.z + 13,
        y: 0.06,
      })),
    [],
  );
  const meshes = useMemo(() => {
    scene.updateMatrixWorld(true);
    const a: Mesh[] = [];
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) a.push(o as Mesh);
    });
    return a;
  }, [scene]);
  return (
    <group>
      {meshes.map((mesh) => (
        <Batch key={mesh.uuid} mesh={mesh} placements={placements} />
      ))}
    </group>
  );
}
