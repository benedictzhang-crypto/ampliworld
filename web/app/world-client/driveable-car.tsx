'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Clone, useGLTF } from '@react-three/drei';
import { Box3, Group, Ray, Vector3 } from 'three';
import { isGarageDriveArea } from './mall-garage';
import type { OrbitControls } from 'three-stdlib';
export type CarState = {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  y?: number;
};
export function carBlocked(
  x: number,
  z: number,
  obstacles: readonly Box3[],
  floor: (x: number, z: number, y?: number) => number,
  currentY = 0,
  yaw = 0,
) {
  const y = floor(x, z, currentY),
    c = Math.cos(yaw),
    s = Math.sin(yaw);
  if (
    Math.abs(x) > 9995 ||
    Math.abs(z) > 14995 ||
    !Number.isFinite(y) ||
    (y < -0.1 && !isGarageDriveArea(x, z))
  )
    return true;
  for (const [dx, dz] of [
    [-2.6, 0],
    [2.6, 0],
    [0, -2.6],
    [0, 2.6],
  ])
    if (Math.abs(floor(x + dx, z + dz, y) - y) > 0.65) return true;
  return obstacles.some((b) => {
    if (b.max.y <= y + 0.4 || b.min.y >= y + 1.9) return false;
    const dx = (b.min.x + b.max.x) / 2 - x,
      dz = (b.min.z + b.max.z) / 2 - z;
    const hx = (b.max.x - b.min.x) / 2,
      hz = (b.max.z - b.min.z) / 2;
    // Four separating axes: actual 2.1m-wide, 5m-long car, not a 5.2m square.
    return (
      Math.abs(dx) < hx + 1.05 * Math.abs(c) + 2.5 * Math.abs(s) &&
      Math.abs(dz) < hz + 1.05 * Math.abs(s) + 2.5 * Math.abs(c) &&
      Math.abs(dx * c - dz * s) < 1.05 + hx * Math.abs(c) + hz * Math.abs(s) &&
      Math.abs(dx * s + dz * c) < 2.5 + hx * Math.abs(s) + hz * Math.abs(c)
    );
  });
}
export function DriveableCar({
  state,
  active,
  controls,
  obstacles,
  groundHeight,
  onReport,
  look,
}: {
  state: React.RefObject<CarState>;
  active: boolean;
  controls: React.RefObject<OrbitControls | null>;
  obstacles: readonly Box3[];
  groundHeight: (x: number, z: number, y?: number) => number;
  onReport: (s: CarState) => void;
  look?: React.RefObject<{ pitch: number }>;
}) {
  const { scene } = useGLTF('/assets/3d/ampliworld/GC-CAR-001/car.glb');
  const body = useRef<Group>(null),
    keys = useRef(new Set<string>());
  const { camera, gl, invalidate } = useThree();
  const display = useMemo(() => scene.clone(true), [scene]);
  const wheels = useMemo(
    () =>
      ['wheel-fl', 'wheel-fr', 'wheel-rl', 'wheel-rr'].map((n) =>
        display.getObjectByName(n),
      ),
    [display],
  );
  const scratch = useMemo(
    () => ({
      target: new Vector3(),
      eye: new Vector3(),
      direction: new Vector3(),
      hit: new Vector3(),
      ray: new Ray(),
      yawOffset: 0,
      report: 0,
    }),
    [],
  );
  const model = useMemo(() => {
    const b = new Box3().setFromObject(scene),
      s = 5 / (b.max.z - b.min.z);
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
      if (look && (e.code === 'KeyR' || e.code === 'KeyF')) {
        e.preventDefault();
        look.current.pitch = Math.max(
          -0.45,
          Math.min(
            1.48,
            look.current.pitch + (e.code === 'KeyR' ? 0.16 : -0.16),
          ),
        );
        invalidate();
        return;
      }
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
    let drag: { id: number; x: number; y: number } | null = null;
    const turn = (dx: number, dy: number) => {
      scratch.yawOffset -= dx * 0.004;
      if (look)
        look.current.pitch = Math.max(
          -0.45,
          Math.min(1.48, look.current.pitch - dy * 0.004),
        );
      invalidate();
    };
    const pointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 2) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      gl.domElement.setPointerCapture(e.pointerId);
    };
    const pointerMove = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      turn(e.clientX - drag.x, e.clientY - drag.y);
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const pointerUp = () => {
      drag = null;
    };
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      turn(e.deltaX, e.deltaY);
    };
    gl.domElement.addEventListener('pointerdown', pointerDown);
    gl.domElement.addEventListener('pointermove', pointerMove);
    gl.domElement.addEventListener('pointerup', pointerUp);
    gl.domElement.addEventListener('pointercancel', pointerUp);
    gl.domElement.addEventListener('wheel', wheel, { passive: false });
    invalidate();
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      gl.domElement.removeEventListener('pointerdown', pointerDown);
      gl.domElement.removeEventListener('pointermove', pointerMove);
      gl.domElement.removeEventListener('pointerup', pointerUp);
      gl.domElement.removeEventListener('pointercancel', pointerUp);
      gl.domElement.removeEventListener('wheel', wheel);
      clear();
    };
  }, [active, invalidate, state, gl, look, scratch]);
  useFrame(({ clock }, elapsed) => {
    if (!body.current) return;
    const s = state.current,
      dt = Math.min(elapsed, 0.06),
      k = keys.current;
    for (const [i, wheel] of wheels.entries())
      if (wheel) {
        wheel.rotation.order = 'YXZ';
        wheel.rotation.x -= (s.speed * dt) / 0.35;
        if (i < 2)
          wheel.rotation.y =
            (Number(k.has('KeyA') || k.has('ArrowLeft')) -
              Number(k.has('KeyD') || k.has('ArrowRight'))) *
            0.32;
      }
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
          carBlocked(x, z, obstacles, groundHeight, s.y ?? 0, yaw) ||
          Math.abs(groundHeight(x, z, s.y) - groundHeight(s.x, s.z, s.y)) > 0.3
        ) {
          s.speed = 0;
          break;
        }
        s.x = x;
        s.z = z;
        s.yaw = yaw;
        s.y = groundHeight(x, z, s.y);
      }
      const y = groundHeight(s.x, s.z, s.y);
      s.y = y;
      scratch.target.set(s.x, y + 1.3, s.z);
      scratch.eye.set(
        s.x + Math.sin(s.yaw + scratch.yawOffset) * 8,
        y + (y < -0.2 ? 2.4 : 4.8),
        s.z + Math.cos(s.yaw + scratch.yawOffset) * 8,
      );
      scratch.direction.subVectors(scratch.eye, scratch.target);
      let boom = scratch.direction.length();
      scratch.direction.normalize();
      scratch.ray.set(scratch.target, scratch.direction);
      for (const box of obstacles)
        if (scratch.ray.intersectBox(box, scratch.hit))
          boom = Math.min(
            boom,
            Math.max(0.65, scratch.target.distanceTo(scratch.hit) - 0.25),
          );
      scratch.eye.copy(scratch.target).addScaledVector(scratch.direction, boom);
      camera.position.lerp(scratch.eye, 1 - Math.exp(-6 * dt));
      controls.current.target.copy(scratch.target);
      controls.current.update();
      camera.lookAt(scratch.target);
      if (look) camera.rotateX(look.current.pitch);
      if (
        k.size ||
        Math.abs(s.speed) > 0.01 ||
        camera.position.distanceToSquared(scratch.eye) > 0.0001
      )
        invalidate();
    }
    body.current.position.set(s.x, groundHeight(s.x, s.z, s.y), s.z);
    body.current.rotation.y = s.yaw;
    gl.domElement.dataset.car = JSON.stringify({
      ...s,
      driving: active,
      lookPitch: look?.current.pitch ?? 0,
      viewYaw: scratch.yawOffset,
      gazeY: camera.getWorldDirection(scratch.direction).y,
    });
    if (clock.elapsedTime - scratch.report > 0.12) {
      scratch.report = clock.elapsedTime;
      onReport({ ...s });
    }
  });
  return (
    <group ref={body} position={[state.current.x, 0, state.current.z]}>
      <group>
        <group position={[model.x, model.y, model.z]} scale={model.s}>
          <primitive object={display} dispose={null} />
        </group>
      </group>
    </group>
  );
}
