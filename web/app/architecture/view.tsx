'use client';

import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Clone, Html, OrbitControls, useGLTF } from '@react-three/drei';
import { Box3, Group, PMREMGenerator, Ray, Vector3 } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Button } from '@/components/ui/button';

const ASSET = '/assets/3d/ampliworld/GC-RES-001/';

function StudioLight() {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const generator = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const environment = generator.fromScene(room, 0.04);
    const previous = scene.environment;
    scene.environment = environment.texture;
    room.dispose();
    generator.dispose();
    invalidate();
    return () => {
      scene.environment = previous;
      environment.dispose();
    };
  }, [gl, scene, invalidate]);
  return null;
}
const VIEWS = [
  { name: '街角 · Corner', position: [49, 30, 56] },
  { name: '正面 · Front', position: [0, 15, 65] },
  { name: '背面 · Back', position: [0, 19, -65] },
  { name: '侧面 · Side', position: [-65, 19, 0] },
  { name: '屋顶 · Roof', position: [38, 63, 35] },
] as const;

class CanvasBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="architecture-error">
        3D 加载未完成。请刷新重试，或下载模型离线查看。
        <a href={`${ASSET}residence-lod0.glb`}>下载 GLB 模型</a>
      </div>
    ) : (
      this.props.children
    );
  }
}

function Residence({ lod }: { lod: number }) {
  const { scene } = useGLTF(`${ASSET}residence-lod${lod}.glb`);
  return <Clone object={scene} castShadow receiveShadow />;
}

function CameraPreset({
  view,
  walking,
  controls,
}: {
  view: number;
  walking: boolean;
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    const point = walking ? [0, 4, 36] : VIEWS[view].position;
    camera.position.set(point[0], point[1], point[2]);
    controls.current?.target.set(0, walking ? 1.5 : 13, walking ? 28 : 0);
    controls.current?.update();
    invalidate();
  }, [view, walking, camera, controls, invalidate]);
  return null;
}

// Isolated metre-space movement. No imports from the compressed legacy world.
function Walker({
  controls,
  onPosition,
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
  onPosition: (x: number, z: number) => void;
}) {
  const body = useRef<Group>(null);
  const keys = useRef(new Set<string>());
  const scratch = useMemo(
    () => ({
      forward: new Vector3(),
      right: new Vector3(),
      delta: new Vector3(),
      offset: new Vector3(),
      hit: new Vector3(),
      ray: new Ray(),
      lastReport: 0,
    }),
    [],
  );
  const { camera, invalidate } = useThree();
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('button,a,input,select,textarea'))
        return;
      if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(e.code)) {
        e.preventDefault();
        keys.current.add(e.code);
        invalidate();
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, [invalidate]);
  // Conservative closed building envelope; detailed balcony/entrance colliders replace it next.
  const solid = useMemo(
    () => new Box3(new Vector3(-16, -1, -12), new Vector3(16, 29.1, 12)),
    [],
  );
  useFrame((state, dt) => {
    if (!body.current || !controls.current) return;
    const k = keys.current;
    const p = body.current.position;
    scratch.forward
      .subVectors(controls.current.target, camera.position)
      .setY(0)
      .normalize();
    scratch.right.set(-scratch.forward.z, 0, scratch.forward.x);
    const forward =
      Number(k.has('KeyW') || k.has('ArrowUp')) -
      Number(k.has('KeyS') || k.has('ArrowDown'));
    const side =
      Number(k.has('KeyD') || k.has('ArrowRight')) -
      Number(k.has('KeyA') || k.has('ArrowLeft'));
    scratch.delta
      .copy(scratch.forward)
      .multiplyScalar(forward)
      .addScaledVector(scratch.right, side)
      .normalize()
      .multiplyScalar(Math.min(dt, 0.05) * 4.5);
    const x = Math.max(-55, Math.min(55, p.x + scratch.delta.x));
    const z = Math.max(-55, Math.min(55, p.z + scratch.delta.z));
    const inside = (a: number, b: number) =>
      a > -16.45 && a < 16.45 && b > -12.45 && b < 12.45;
    const nx = inside(x, p.z) ? p.x : x;
    const nz = inside(nx, z) ? p.z : z;
    scratch.delta.set(nx - p.x, 0, nz - p.z);
    p.set(nx, 0.13, nz);
    if (scratch.delta.lengthSq() > 0)
      body.current.rotation.y = Math.atan2(scratch.delta.x, scratch.delta.z);
    camera.position.add(scratch.delta);
    controls.current.target.set(p.x, 1.5, p.z);
    scratch.offset.subVectors(camera.position, controls.current.target);
    const distance = scratch.offset.length();
    scratch.ray.origin.copy(controls.current.target);
    scratch.ray.direction.copy(scratch.offset).normalize();
    if (scratch.ray.intersectBox(solid, scratch.hit)) {
      const hitDistance = scratch.hit.distanceTo(controls.current.target);
      if (hitDistance < distance)
        camera.position
          .copy(controls.current.target)
          .addScaledVector(
            scratch.ray.direction,
            Math.max(0.1, hitDistance - 0.15),
          );
    }
    camera.position.y = Math.max(0.6, camera.position.y);
    controls.current.update();
    if (state.clock.elapsedTime - scratch.lastReport > 0.2) {
      onPosition(p.x, p.z);
      scratch.lastReport = state.clock.elapsedTime;
    }
    if (k.size) invalidate();
  });
  return (
    <group ref={body} position={[0, 0.13, 28]}>
      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.26, 0.65, 4, 8]} />
        <meshStandardMaterial color="#c3a36a" />
      </mesh>
      <mesh position={[0, 1.77, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 8]} />
        <meshStandardMaterial color="#ecc4a4" />
      </mesh>
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} position={[x, 0.37, 0]} castShadow>
          <boxGeometry args={[0.2, 0.65, 0.24]} />
          <meshStandardMaterial color="#273940" />
        </mesh>
      ))}
    </group>
  );
}

function Plot() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[150, 150]} />
        <meshStandardMaterial color="#dedbd0" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.02, 43]} receiveShadow>
        <boxGeometry args={[130, 0.03, 12]} />
        <meshStandardMaterial color="#566069" roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0.08, 43 + side * 7.8]} receiveShadow>
          <boxGeometry args={[130, 0.16, 3.5]} />
          <meshStandardMaterial color="#eee8db" />
        </mesh>
      ))}
      {Array.from({ length: 15 }, (_, i) => (
        <mesh key={i} position={[-56 + i * 8, 0.05, 43]}>
          <boxGeometry args={[3, 0.02, 0.14]} />
          <meshStandardMaterial color="#f1e7c7" />
        </mesh>
      ))}
    </group>
  );
}

export function ArchitectureLab() {
  const [view, setView] = useState(0);
  const [lod, setLod] = useState(0);
  const [walking, setWalking] = useState(false);
  const [position, setPosition] = useState([0, 28]);
  const [mounted, setMounted] = useState(false);
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(() => setMounted(true), []);
  return (
    <main className="architecture">
      <header>
        <div>
          <span className="architecture-eyebrow">AMPLIWORLD / GOLDEN CITY</span>
          <h1>先造一栋真正的楼。</h1>
          <p>住宅样板 · GC-RES-001 · 新架构施工区</p>
        </div>
        <a href="/">返回原有可玩城市 ↗</a>
      </header>
      <section className="architecture-workspace">
        <div
          className="architecture-viewport"
          aria-label="可旋转的三维住宅模型"
        >
          <CanvasBoundary>
            {mounted && (
              <Canvas
                shadows
                frameloop="demand"
                dpr={[1, 1.5]}
                camera={{
                  position: [49, 30, 56],
                  fov: 45,
                  near: 0.1,
                  far: 400,
                }}
              >
                <color attach="background" args={['#dddeda']} />
                <hemisphereLight args={['#dbeeff', '#a0927a', 2.5]} />
                <directionalLight
                  position={[35, 60, 35]}
                  intensity={3.4}
                  castShadow
                  shadow-mapSize={[1024, 1024]}
                  shadow-camera-left={-45}
                  shadow-camera-right={45}
                  shadow-camera-top={50}
                  shadow-camera-bottom={-35}
                  shadow-camera-far={150}
                  shadow-bias={-0.0004}
                />
                <Suspense
                  fallback={
                    <Html center>
                      <span className="architecture-loading">
                        载入立体模型…
                      </span>
                    </Html>
                  }
                >
                  <Residence lod={lod} />
                </Suspense>
                <StudioLight />
                <Plot />
                <OrbitControls
                  ref={controls}
                  makeDefault
                  enableDamping={false}
                  minDistance={walking ? 0.1 : 12}
                  maxDistance={walking ? 18 : 140}
                  maxPolarAngle={Math.PI / 2 - 0.04}
                  enablePan={!walking}
                />
                <CameraPreset
                  view={view}
                  walking={walking}
                  controls={controls}
                />
                {walking && (
                  <Walker
                    controls={controls}
                    onPosition={(x, z) => setPosition([x, z])}
                  />
                )}
              </Canvas>
            )}
          </CanvasBoundary>
          <div className="architecture-caption">
            {walking
              ? `WASD / 方向键走路 · 拖动看四周 · X ${position[0].toFixed(1)} m / Z ${position[1].toFixed(1)} m`
              : '拖动旋转 · 双指缩放 · 四面与屋顶均为模型几何'}
          </div>
        </div>
        <aside>
          <span className="architecture-eyebrow">01 / RESIDENCE PROTOTYPE</span>
          <h2>
            白石 · 香槟金
            <br />
            立体空中花园
          </h2>
          <p>
            阳台有厚度、栏杆与侧面。窗户退进墙体，楼顶形成真实轮廓。不是一张贴在墙上的建筑图片。
          </p>
          <div className="architecture-actions">
            <Button
              onClick={() => {
                setWalking((v) => !v);
                (document.activeElement as HTMLElement)?.blur();
              }}
            >
              {walking ? '退出步行 / Inspect' : '控制小人 / Walk'}
            </Button>
          </div>
          <div className="architecture-views">
            {VIEWS.map((v, i) => (
              <Button
                key={v.name}
                variant="outline"
                aria-pressed={view === i && !walking}
                onClick={() => {
                  setWalking(false);
                  setView(i);
                }}
              >
                {v.name}
              </Button>
            ))}
          </div>
          <label className="architecture-select">
            模型细节 / LOD
            <select
              value={lod}
              onChange={(e) => setLod(Number(e.target.value))}
            >
              <option value={0}>近景 · 完整几何</option>
              <option value={1}>中景 · 简化几何</option>
              <option value={2}>远景 · 建筑轮廓</option>
            </select>
          </label>
          <p className="architecture-note">
            本轮是可绕楼行走的施工样板，不是整座新城。室内副本尚未开放；步行采用保守外轮廓碰撞。旧版交易与生活系统继续保留。
          </p>
          <a href={`${ASSET}residence-lod0.glb`} download>
            下载独立 3D 模型 ↗
          </a>
          <a
            href="/planning/golden-city-masterplan.svg"
            target="_blank"
            rel="noreferrer"
          >
            查看 2×2 km 新城总图 ↗
          </a>
        </aside>
      </section>
      <footer>
        世界设计继续保留：CBD · 医院/学校/赛博教堂 · 分档住宅 · 半山/山顶别墅 ·
        游艇港/海滨酒店 · 海上城 · 赛车场。新资产逐区接入，未建项目不标作完成。
      </footer>
    </main>
  );
}
