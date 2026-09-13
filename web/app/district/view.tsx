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
import { DISTRICT, districtGroundHeight, districtLocation } from './registry';
import streetData from '../../public/assets/3d/ampliworld/GC-STREET-001/street-manifest.json';
import mallData from '../../public/assets/3d/ampliworld/GC-MALL-002/mall-manifest.json';

function Mall() {
  const { scene } = useGLTF('/assets/3d/ampliworld/GC-MALL-002/mall-lod0.glb');
  return (
    <group position={[DISTRICT.mall.x, 0, DISTRICT.mall.z]}>
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}
function MallApproach() {
  return (
    <group>
      {/* Real opening in the ground for the below-grade ramp; no hidden plane. */}
      {[
        [-50.5, 0, 329, 620],
        [171, 0, 88, 620],
        [120.5, -219, 13, 182],
        [120.5, 115.5, 13, 389],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, -0.045, z]} receiveShadow>
          <boxGeometry args={[w, 0.06, d]} />
          <meshStandardMaterial color="#c9ceca" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 0, -81]} receiveShadow>
        <boxGeometry args={[14, 0.06, 14]} />
        <meshStandardMaterial color="#8b9294" roughness={0.85} />
      </mesh>
    </group>
  );
}

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
  const savedWalkCamera = useRef<{ position: Vector3; target: Vector3 } | null>(
    null,
  );
  useEffect(() => {
    if (!walking && controls.current) {
      savedWalkCamera.current = {
        position: camera.position.clone(),
        target: controls.current.target.clone(),
      };
    }
    if (walking && savedWalkCamera.current) {
      camera.position.copy(savedWalkCamera.current.position);
      controls.current?.target.copy(savedWalkCamera.current.target);
      controls.current?.update();
      invalidate();
      return;
    }
    camera.position.set(
      ...((walking ? [0, 4, -59] : [285, 240, 85]) as [number, number, number]),
    );
    controls.current?.target.set(
      walking ? 0 : 30,
      walking ? 1.5 : 0,
      walking ? -68 : -110,
    );
    controls.current?.update();
    invalidate();
  }, [walking, controls, camera, invalidate]);
  return null;
}

export function DistrictClient() {
  const [mounted, setMounted] = useState(false);
  const [walking, setWalking] = useState(true);
  const [minutes, setMinutes] = useState(480);
  const [position, setPosition] = useState<number[]>([0, -68]);
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
      ...mallData.colliders.map(
        (c) =>
          new Box3(
            new Vector3(c.min[0], c.min[1], c.min[2] + DISTRICT.mall.z),
            new Vector3(c.max[0], c.max[1], c.max[2] + DISTRICT.mall.z),
          ),
      ),
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
              camera={{ position: [0, 4, 34], fov: 55, near: 0.1, far: 2600 }}
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
                  metricWorld
                  fogNear={600}
                  fogFar={2200}
                />
                <StudioLight />
                <MallApproach />
                <Street />
                <Mall />
                {DISTRICT.buildings.map((b) => (
                  <group
                    key={b.id}
                    position={[b.x, 0, b.z]}
                    rotation={[0, b.rotationY, 0]}
                  >
                    <Residence lod={0} />
                  </group>
                ))}
              </Suspense>
              <OrbitControls
                ref={controls}
                makeDefault
                enableDamping={false}
                minDistance={walking ? 0.1 : 35}
                maxDistance={walking ? 18 : 650}
                maxPolarAngle={Math.PI / 2 - 0.04}
                enablePan={!walking}
              />
              <SetupCamera walking={walking} controls={controls} />
              <Walker
                active={walking}
                controls={controls}
                onPosition={(x, z) => setPosition([x, z])}
                spawn={DISTRICT.spawnLocalMeters}
                obstacles={solids}
                limits={[212, 307]}
                groundHeight={districtGroundHeight}
              />
            </Canvas>
          )}
        </CanvasBoundary>
      </div>
      <header className="district-hud">
        <div>
          <span>AMPLIWORLD · GOLDEN CITY</span>
          <h1>花园街区 · 金庭汇</h1>
          <p>大型六层商业街区 · 室内长廊 · 花园 · 停车场</p>
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
      </nav>
      <div className="district-status" aria-live="polite">
        {walking
          ? `WASD 行走 · 空格跳跃 · 鼠标拖动看四周 · X ${position[0].toFixed(1)} m / Z ${position[1].toFixed(1)} m`
          : '拖动俯瞰 · 滚轮缩放 · 点击「控制小人」回到街道'}
        <small>
          {walking
            ? districtLocation(position[0], position[1])
            : '俯瞰不会改变角色位置 · 返回继续原地行走'}
        </small>
      </div>
    </main>
  );
}
