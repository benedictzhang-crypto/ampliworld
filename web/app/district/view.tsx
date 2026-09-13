'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Clone, Html, OrbitControls } from '@react-three/drei';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Button } from '@/components/ui/button';
import {
  CanvasBoundary,
  Residence,
  StudioLight,
  Walker,
} from '../architecture/view';
import {
  DynamicAtmosphere,
  formatWorldTime,
  getWorldMinutesAtCycleTime,
} from '../dynamic-atmosphere';
import { DISTRICT, districtGroundHeight } from './registry';
import streetData from '../../public/assets/3d/ampliworld/GC-STREET-001/street-manifest.json';

function Street() {
  const { scene } = useGLTF(
    '/assets/3d/ampliworld/GC-STREET-001/street-block.glb',
  );
  return <Clone object={scene} castShadow receiveShadow />;
}
function SetupCamera({
  walking,
  controls,
}: {
  walking: boolean;
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  const { camera, invalidate } = useThree();
  useEffect(() => {
    camera.position.set(
      ...((walking ? [0, 4, 34] : [135, 115, 135]) as [number, number, number]),
    );
    controls.current?.target.set(0, walking ? 1.5 : 0, walking ? 25 : 0);
    controls.current?.update();
    invalidate();
  }, [walking, controls, camera, invalidate]);
  return null;
}

export function DistrictClient() {
  const [mounted, setMounted] = useState(false);
  const [walking, setWalking] = useState(true);
  const [minutes, setMinutes] = useState(480);
  const [position, setPosition] = useState<number[]>([0, 25]);
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    setMounted(true);
    const start = performance.now();
    const timer = setInterval(() => {
      if (!document.hidden)
        setMinutes(
          getWorldMinutesAtCycleTime(performance.now() - start + 600000),
        );
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const solids = useMemo(
    () => [
      ...DISTRICT.buildings.map(
        (b) =>
          new Box3(
            new Vector3(b.x - 16, -1, b.z - 12),
            new Vector3(b.x + 16, 29.1, b.z + 12),
          ),
      ),
      ...streetData.colliders.map(
        (c) =>
          new Box3(
            new Vector3(...(c.min as [number, number, number])),
            new Vector3(...(c.max as [number, number, number])),
          ),
      ),
    ],
    [],
  );
  return (
    <main className="district">
      <div className="district-canvas">
        <CanvasBoundary>
          {mounted && (
            <Canvas
              shadows
              frameloop="demand"
              dpr={[1, 1.3]}
              camera={{ position: [0, 4, 34], fov: 55, near: 0.1, far: 1500 }}
            >
              <Suspense
                fallback={
                  <Html center>
                    <div className="district-loading">载入花园街区…</div>
                  </Html>
                }
              >
                <DynamicAtmosphere
                  hour={minutes / 60}
                  fogNear={180}
                  fogFar={650}
                />
                <StudioLight />
                <Street />
                {DISTRICT.buildings.map((b) => (
                  <group
                    key={b.id}
                    position={[b.x, 0, b.z]}
                    rotation={[0, b.rotationY, 0]}
                  >
                    <Residence lod={1} />
                  </group>
                ))}
              </Suspense>
              <OrbitControls
                ref={controls}
                makeDefault
                enableDamping={false}
                minDistance={walking ? 0.1 : 35}
                maxDistance={walking ? 18 : 340}
                maxPolarAngle={Math.PI / 2 - 0.04}
                enablePan={!walking}
              />
              <SetupCamera walking={walking} controls={controls} />
              {walking && (
                <Walker
                  controls={controls}
                  onPosition={(x, z) => setPosition([x, z])}
                  spawn={DISTRICT.spawnLocalMeters}
                  obstacles={solids}
                  limits={[107, 77]}
                  groundHeight={districtGroundHeight}
                />
              )}
            </Canvas>
          )}
        </CanvasBoundary>
      </div>
      <header className="district-hud">
        <div>
          <span>AMPLIWORLD · GOLDEN CITY</span>
          <h1>花园街区</h1>
          <p>220 × 160 m · 新架构街区原型</p>
        </div>
        <div className="district-time">
          {formatWorldTime(minutes)}
          <small>保留原昼夜节奏 · 完整循环 55 分钟</small>
        </div>
      </header>
      <nav className="district-tools">
        <Button
          onClick={() => {
            setWalking((v) => !v);
            (document.activeElement as HTMLElement)?.blur();
          }}
        >
          {walking ? '俯瞰街区' : '控制小人'}
        </Button>
        <a href="/architecture">住宅细节</a>
        <a href="/">原有城市 / 交易生活</a>
      </nav>
      <div className="district-status" aria-live="polite">
        {walking
          ? `WASD 行走 · 鼠标拖动看四周 · X ${position[0].toFixed(1)} m / Z ${position[1].toFixed(1)} m`
          : '拖动俯瞰 · 滚轮缩放 · 点击「控制小人」回到街道'}
        <small>
          四栋同型住宅 · 连续道路与步道 · 地铁入口外壳（乘车待接入） ·
          室内及新街区交易界面待接入
        </small>
      </div>
    </main>
  );
}
