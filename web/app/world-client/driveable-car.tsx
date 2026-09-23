'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Clone, useGLTF } from '@react-three/drei';
import { Box3, Group, Ray, Vector3 } from 'three';
import { clipVehicleCamera } from './vehicle-safety';
import {coreCarMustStop} from '../life-sim/traffic';
import type { OrbitControls } from 'three-stdlib';
export { carBlocked, stepVehicleMotion } from './vehicle-physics';
export type { CarState } from './vehicle-physics';
import {
  carBlocked,
  stepVehicleMotion,
  type CarState,
} from './vehicle-physics';
export function DriveableCar({
  state,
  active,
  debugId,
  controls,
  obstacles,
  groundHeight,
  onReport,
  look,
}: {
  state: React.RefObject<CarState>;
  active: boolean;
  debugId: string;
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
      const approachSpeed=s.speed+throttle*10*dt;
      const redStop=(s.y??0)>-1&&coreCarMustStop(s.x,s.z,s.x-Math.sin(s.yaw)*approachSpeed*dt,s.z-Math.cos(s.yaw)*approachSpeed*dt,Date.now()/1000);
      if(redStop)s.speed=0;
      stepVehicleMotion(
        s,
        { throttle:redStop?0:throttle, steer, brake: redStop||k.has('Space') },
        dt,
        obstacles,
        groundHeight,
      );
      const y = groundHeight(s.x, s.z, s.y);
      s.y = y;
      scratch.target.set(s.x, y + 1.3, s.z);
      scratch.eye.set(
        s.x + Math.sin(s.yaw + scratch.yawOffset) * (y < -0.8 ? 6.5 : 8),
        y + (y < -0.8 ? 2.8 : 4.8),
        s.z + Math.cos(s.yaw + scratch.yawOffset) * (y < -0.8 ? 6.5 : 8),
      );
      scratch.direction.subVectors(scratch.eye, scratch.target);
      let boom = scratch.direction.length();
      scratch.direction.normalize();
      scratch.ray.set(scratch.target, scratch.direction);
      for (const box of obstacles)
        if (scratch.ray.intersectBox(box, scratch.hit))
          boom = Math.min(
            boom,
            Math.max(0.05, scratch.target.distanceTo(scratch.hit) - 0.25),
          );
      scratch.eye.copy(scratch.target).addScaledVector(scratch.direction, boom);
      camera.position.lerp(scratch.eye, 1 - Math.exp(-6 * dt));
      controls.current.target.copy(scratch.target);
      controls.current.update();
      clipVehicleCamera(
        camera.position,
        scratch.target,
        obstacles,
        scratch.ray,
        scratch.direction,
        scratch.hit,
      );
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
    const floorY = groundHeight(s.x, s.z, s.y),
      sn = Math.sin(s.yaw),
      cs = Math.cos(s.yaw);
    const front = groundHeight(s.x - sn * 1.5, s.z - cs * 1.5, floorY),
      back = groundHeight(s.x + sn * 1.5, s.z + cs * 1.5, floorY);
    body.current.rotation.set(
      Math.abs(front - back) < 1.3 ? Math.atan2(front - back, 3) : 0,
      s.yaw,
      0,
      'YXZ',
    );
    if (active || gl.domElement.dataset.carOwner === debugId) {
      gl.domElement.dataset.carOwner = debugId;
      gl.domElement.dataset.car = JSON.stringify({
        ...s,
        driving: active,
        lookPitch: look?.current.pitch ?? 0,
        viewYaw: scratch.yawOffset,
        gazeY: camera.getWorldDirection(scratch.direction).y,
        cameraY: camera.position.y,
      });
    }
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
