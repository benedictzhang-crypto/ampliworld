'use client';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { InstancedMesh, Mesh, Matrix4, Quaternion, Vector3 } from 'three';
import {
  HOUSING_INSTANCES,
  HOUSING_MODELS,
  HOUSING_BOXES,
  HOUSING_TREES,
  HOUSING_PLAN,
} from './housing-registry';
type Placement = { x: number; z: number; y: number; yaw: number };
function Batch({ mesh, items }: { mesh: Mesh; items: Placement[] }) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const m = new Matrix4(),
      q = new Quaternion(),
      v = new Vector3(),
      s = new Vector3(1, 1, 1),
      up = new Vector3(0, 1, 0);
    items.forEach((p, i) => {
      m.compose(
        v.set(p.x, p.y, p.z),
        q.setFromAxisAngle(up, p.yaw),
        s,
      ).multiply(mesh.matrixWorld);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [mesh, items]);
  return (
    <instancedMesh
      ref={ref}
      args={[mesh.geometry, mesh.material, items.length]}
      receiveShadow
    />
  );
}
function Model({ url, items }: { url: string; items: Placement[] }) {
  const { scene } = useGLTF(url);
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
      {meshes.map((m) => (
        <Batch key={m.uuid} mesh={m} items={items} />
      ))}
    </group>
  );
}
function Boxes({
  items,
  color,
}: {
  items: {
    x: number;
    z: number;
    y: number;
    w: number;
    h: number;
    d: number;
    yaw: number;
  }[];
  color: string;
}) {
  const ref = useRef<InstancedMesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const m = new Matrix4(),
      q = new Quaternion(),
      v = new Vector3(),
      s = new Vector3(),
      up = new Vector3(0, 1, 0);
    items.forEach((p, i) => {
      m.compose(
        v.set(p.x, p.y, p.z),
        q.setFromAxisAngle(up, p.yaw),
        s.set(p.w, p.h, p.d),
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
      <meshStandardMaterial color={color} roughness={0.82} />
    </instancedMesh>
  );
}
export function HousingWorld({
  x,
  z,
  open,
}: {
  x: number;
  z: number;
  open: ReadonlySet<string>;
}) {
  const near = useMemo(
    () =>
      new Set(
        HOUSING_PLAN.placements
          .filter((p) => Math.abs(p.x - x) < 2500 && Math.abs(p.z - z) < 2500)
          .map((p) => p.id),
      ),
    [x, z],
  );
  const batches = useMemo(
    () =>
      HOUSING_MODELS.map((_, m) =>
        HOUSING_INSTANCES.filter((i) => i.model === m && near.has(i.parcel)),
      ),
    [near],
  );
  const proxies = useMemo(
    () =>
      HOUSING_INSTANCES.filter((i) => !near.has(i.parcel)).map((i) => {
        const b = HOUSING_MODELS[i.model].bounds;
        return {
          ...i,
          y: i.y + b.max[1] / 2,
          w: b.max[0] - b.min[0],
          d: b.max[2] - b.min[2],
          h: b.max[1],
        };
      }),
    [near],
  );
  const surfaces = useMemo(
    () =>
      ['garden', 'road', 'wall', 'gate'].map((kind) =>
        HOUSING_BOXES.filter((b) => b.kind === kind).map((b) =>
          kind === 'gate' && open.has(b.id.split('/')[0])
            ? { ...b, y: 3.6 }
            : b,
        ),
      ),
    [open],
  );
  const trees = useMemo(
    () =>
      HOUSING_TREES.filter(
        (t) => Math.abs(t.x - x) < 2500 && Math.abs(t.z - z) < 2500,
      ),
    [x, z],
  );
  return (
    <group name="tiered-chinese-neighborhoods">
      <Boxes items={proxies} color="#b9b8aa" />
      {surfaces.map((items, i) => (
        <Boxes
          key={i}
          items={items}
          color={['#7e9570', '#697578', '#b8b4a8', '#ac9053'][i]}
        />
      ))}
      {batches.map(
        (items, i) =>
          items.length > 0 && (
            <Suspense key={i} fallback={null}>
              <Model
                url={`/assets/3d/ampliworld/${HOUSING_MODELS[i].kit}/${HOUSING_MODELS[i].file}`}
                items={items}
              />
            </Suspense>
          ),
      )}
      {trees.length > 0 && (
        <Suspense fallback={null}>
          <Model
            url="/assets/3d/ampliworld/GC-TREE-001/tree.glb"
            items={trees}
          />
        </Suspense>
      )}
    </group>
  );
}
