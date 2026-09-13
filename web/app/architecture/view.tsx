'use client';

import {
  Component,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Clone, Html, OrbitControls, useGLTF } from '@react-three/drei';
import { PMREMGenerator } from 'three';
import { Walker } from '../world-client/walker';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Button } from '@/components/ui/button';

const ASSET = '/assets/3d/ampliworld/GC-RES-001/';

export function StudioLight() {
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

export class CanvasBoundary extends Component<
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

export function Residence({ lod }: { lod: number }) {
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

export { Walker } from '../world-client/walker';
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
                  <Residence lod={0} />
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
              ? `WASD / 方向键走路 · 空格跳跃 · 拖动看四周 · X ${position[0].toFixed(1)} m / Z ${position[1].toFixed(1)} m`
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
          <p>当前使用完整细节；正常缩放不切换近、中、远模型。</p>
          <p className="architecture-note">
            本轮是可绕楼行走的施工样板，不是整座新城。室内副本尚未开放；步行采用保守外轮廓碰撞。旧版交易与生活系统继续保留。
          </p>
          <a href={`${ASSET}residence-lod0.glb`} download>
            下载独立 3D 模型 ↗
          </a>
          <a href="/district">进入可行走花园街区 ↗</a>
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
