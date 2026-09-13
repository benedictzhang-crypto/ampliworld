'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Clone, useGLTF } from '@react-three/drei';
import { Box3, Group, Vector3 } from 'three';
import type { OrbitControls } from 'three-stdlib';
export type CarState = { x: number; z: number; yaw: number; speed: number };
export function carBlocked(
  x: number,
  z: number,
  obstacles: readonly Box3[],
  floor: (x: number, z: number, y?: number) => number,
) {
  if (
    Math.abs(x) > 9995 ||
    Math.abs(z) > 14995 ||
    !Number.isFinite(floor(x, z)) ||
    floor(x, z) < -0.1
  )
    return true;
  for (const [dx, dz] of [
    [-2.6, 0],
    [2.6, 0],
    [0, -2.6],
    [0, 2.6],
  ])
    if (floor(x + dx, z + dz) < -0.1) return true;
  return obstacles.some(
    (b) =>
      b.max.y > floor(x, z) + 0.4 &&
      b.min.y < floor(x, z) + 1.9 &&
      x > b.min.x - 2.6 &&
      x < b.max.x + 2.6 &&
      z > b.min.z - 2.6 &&
      z < b.max.z + 2.6,
  );
}
export function DriveableCar({
  state,
  active,
  controls,
  obstacles,
  groundHeight,
  onReport,
}: {
  state: React.RefObject<CarState>;
  active: boolean;
  controls: React.RefObject<OrbitControls | null>;
  obstacles: readonly Box3[];
  groundHeight: (x: number, z: number, y?: number) => number;
  onReport: (s: CarState) => void;
}) {
  const { scene } = useGLTF(
    '/assets/3d/vendor/kenney/car-kit/models/sedan.glb',
  );
  const body = useRef<Group>(null),
    keys = useRef(new Set<string>());
  const { camera, gl, invalidate } = useThree();
  const scratch = useMemo(
    () => ({ target: new Vector3(), eye: new Vector3(), report: 0 }),
    [],
  );
  const model = useMemo(() => {
    const b = new Box3().setFromObject(scene),
      s = 4.6 / (b.max.z - b.min.z);
    return {
      s,
      x: (-(b.max.x + b.min.x) * s) / 2,
      y: -b.min.y * s,
      z: (-(b.max.z + b.min.z) * s) / 2,
    };
  }, [scene]);
  useEffect(() => {
    if (!active) {
      keys.current.clear();
      state.current.speed = 0;
      invalidate();
      return;
    }
    const down = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest(
          'input,textarea,button,a,[contenteditable=true]',
        )
      )
        return;
      if (/^(Key[WASD]|Arrow(Up|Down|Left|Right)|Space)$/.test(e.code)) {
        e.preventDefault();
        keys.current.add(e.code);
        invalidate();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.current.delete(e.code);
      invalidate();
    };
    const clear = () => {
      keys.current.clear();
      state.current.speed = 0;
      invalidate();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    invalidate();
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      clear();
    };
  }, [active, invalidate, state]);
  useFrame(({ clock }, elapsed) => {
    if (!body.current) return;
    const s = state.current,
      dt = Math.min(elapsed, 0.06),
      k = keys.current;
    if (active && controls.current) {
      const throttle =
        Number(k.has('KeyW') || k.has('ArrowUp')) -
        Number(k.has('KeyS') || k.has('ArrowDown'));
      const steer =
        Number(k.has('KeyA') || k.has('ArrowLeft')) -
        Number(k.has('KeyD') || k.has('ArrowRight'));
      s.speed = Math.max(-8, Math.min(22, s.speed + throttle * 10 * dt));
      if (!throttle) s.speed *= Math.exp(-1.4 * dt);
      if (k.has('Space')) s.speed *= Math.exp(-12 * dt);
      const steps = Math.max(1, Math.ceil(Math.abs(s.speed * dt) / 0.4));
      for (let i = 0; i < steps; i++) {
        const yaw = s.yaw + (((steer * s.speed) / 5.2) * dt) / steps,
          x = s.x - (Math.sin(yaw) * s.speed * dt) / steps,
          z = s.z - (Math.cos(yaw) * s.speed * dt) / steps;
        if (
          carBlocked(x, z, obstacles, groundHeight) ||
          Math.abs(groundHeight(x, z) - groundHeight(s.x, s.z)) > 0.3
        ) {
          s.speed = 0;
          break;
        }
        s.x = x;
        s.z = z;
        s.yaw = yaw;
      }
      const y = groundHeight(s.x, s.z);
      scratch.target.set(s.x, y + 1.3, s.z);
      scratch.eye.set(
        s.x + Math.sin(s.yaw) * 10,
        y + 4.8,
        s.z + Math.cos(s.yaw) * 10,
      );
      camera.position.lerp(scratch.eye, 1 - Math.exp(-6 * dt));
      controls.current.target.copy(scratch.target);
      controls.current.update();
      if (k.size || Math.abs(s.speed) > 0.01) invalidate();
    }
    body.current.position.set(s.x, groundHeight(s.x, s.z), s.z);
    body.current.rotation.y = s.yaw;
    gl.domElement.dataset.car = JSON.stringify({ ...s, driving: active });
    if (clock.elapsedTime - scratch.report > 0.12) {
      scratch.report = clock.elapsedTime;
      onReport({ ...s });
    }
  });
  return (
    <group ref={body} position={[state.current.x, 0, state.current.z]}>
      <group rotation={[0, Math.PI, 0]}>
        <group position={[model.x, model.y, model.z]} scale={model.s}>
          <Clone object={scene} castShadow receiveShadow />
        </group>
      </group>
    </group>
  );
}
