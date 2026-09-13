'use client';
import {
  Component,
  Suspense,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useThree } from '@react-three/fiber';
import { housingProxy } from './housing-streaming';
import { useGLTF } from '@react-three/drei';
import { InstancedMesh, Mesh, Matrix4, Quaternion, Vector3 } from 'three';
import {
  HOUSING_INSTANCES,
  HOUSING_MODELS,
  HOUSING_BOXES,
  HOUSING_TREES,
  HOUSING_PLAN,
  housingGateBox,
} from './housing-registry';
type Placement = { x: number; z: number; y: number; yaw: number };
function Batch({ mesh, items }: { mesh: Mesh; items: Placement[] }) {
  const ref = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
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
    invalidate();
  }, [mesh, items, invalidate]);
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
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
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
    invalidate();
  }, [items, invalidate]);
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
class AssetBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
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
      HOUSING_INSTANCES.filter((i) => !near.has(i.parcel)).map(housingProxy),
    [near],
  );
  const surfaces = useMemo(
    () =>
      ['garden', 'road', 'wall', 'gate', 'walk'].map((kind) =>
        HOUSING_BOXES.filter((b) => b.kind === kind).map((b) =>
          kind === 'gate' ? housingGateBox(b, open.has(b.id.split('/')[0])) : b,
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
          color={['#7e9570', '#697578', '#b8b4a8', '#ac9053', '#d4d0c3'][i]}
        />
      ))}
      {batches.map(
        (items, i) =>
          items.length > 0 && (
            <AssetBoundary
              key={i}
              fallback={
                <Boxes items={items.map(housingProxy)} color="#b9b8aa" />
              }
            >
              <Suspense
                fallback={
                  <Boxes items={items.map(housingProxy)} color="#b9b8aa" />
                }
              >
                <Model
                  url={`/assets/3d/ampliworld/${HOUSING_MODELS[i].kit}/${HOUSING_MODELS[i].file}`}
                  items={items}
                />
              </Suspense>
            </AssetBoundary>
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
