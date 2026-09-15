'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Box3, Group, Ray, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { walkerCameraOffset } from './walk-camera-profile';
import type { LiftCarrier } from './mall-circulation';
import {
  BODY_HEIGHT,
  BODY_RADIUS,
  GRAVITY,
  JUMP_SPEED,
  WALK_SPEED,
  movementHeading,
  turnToward,
} from './locomotion';

const DEFAULT_SPAWN = [0, 28] as const;
const DEFAULT_LIMITS = [55, 55] as const;
const DEFAULT_SOLIDS = [
  new Box3(new Vector3(-16, -1, -12), new Vector3(16, 29.1, 12)),
];
const defaultGround = () => 0.03;
function overlaps(box: Box3, x: number, z: number, padding = BODY_RADIUS) {
  return (
    x > box.min.x - padding &&
    x < box.max.x + padding &&
    z > box.min.z - padding &&
    z < box.max.z + padding
  );
}
function blocked(boxes: readonly Box3[], x: number, z: number, feet: number) {
  return boxes.some(
    (box) =>
      overlaps(box, x, z) &&
      box.max.y > feet + 0.29 &&
      box.min.y < feet + BODY_HEIGHT,
  );
}

export function Walker({
  controls,
  onPosition,
  spawn = DEFAULT_SPAWN,
  obstacles = DEFAULT_SOLIDS,
  limits = DEFAULT_LIMITS,
  groundHeight = defaultGround,
  active = true,
  relocation,
  look,
  carrier,
  surfaceVelocity,
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
  onPosition: (x: number, z: number, y?: number) => void;
  spawn?: readonly [number, number];
  obstacles?: readonly Box3[];
  limits?: readonly [number, number];
  groundHeight?: (x: number, z: number, currentY?: number) => number;
  active?: boolean;
  relocation?: { x: number; z: number; y: number; nonce: number };
  look?: React.RefObject<{ pitch: number }>;
  carrier?: React.RefObject<LiftCarrier>;
  surfaceVelocity?: (x:number,z:number,y:number)=>number;
}) {
  const body = useRef<Group>(null),
    leftLeg = useRef<Group>(null),
    rightLeg = useRef<Group>(null),
    leftArm = useRef<Group>(null),
    rightArm = useRef<Group>(null);
  const keys = useRef(new Set<string>());
  const state = useMemo(
    () => ({
      forward: new Vector3(),
      right: new Vector3(),
      delta: new Vector3(),
      offset: new Vector3(),
      hit: new Vector3(),
      ray: new Ray(),
      velocity: 0,
      feet: groundHeight(spawn[0], spawn[1]),
      grounded: true,
      jumpQueued: false,
      phase: 0,
      gait: 0,
      heading: 0,
      lastReport: 0,
      desiredRadius: 9,
      gaze: new Vector3(),
    }),
    [],
  );
  const { camera, gl, invalidate } = useThree();
  const initialPosition = useMemo(
    () => [spawn[0], state.feet, spawn[1]] as [number, number, number],
    [],
  );
  const lastRelocation = useRef(-1);
  useEffect(() => {
    if (
      !relocation ||
      lastRelocation.current === relocation.nonce ||
      !body.current ||
      !controls.current
    )
      return;
    lastRelocation.current = relocation.nonce;
    walkerCameraOffset(
      state.offset,
      camera.position,
      controls.current.target,
      relocation.y,
      state.desiredRadius,
    );
    body.current.position.set(relocation.x, relocation.y, relocation.z);
    state.feet = relocation.y;
    state.velocity = 0;
    state.grounded = true;
    state.jumpQueued = false;
    state.gait = 0;
    state.phase = 0;
    keys.current.clear();
    controls.current.target.set(relocation.x, relocation.y + 1.4, relocation.z);
    camera.position.copy(controls.current.target).add(state.offset);
    controls.current.update();
    onPosition(relocation.x, relocation.z, relocation.y);
    invalidate();
  }, [relocation, camera, controls, invalidate, onPosition, state]);
  useEffect(() => {
    if (!active) {
      keys.current.clear();
      state.jumpQueued = false;
      return;
    }
    const down = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.closest(
          'button,a,input,select,textarea,[contenteditable=true]',
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
        if (
          e.code === 'Space' &&
          !e.repeat &&
          !keys.current.has('Space') &&
          state.grounded
        )
          state.jumpQueued = true;
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
      state.jumpQueued = false;
      invalidate();
    };
    const turn = (dx: number, dy: number) => {
      if (!look || !controls.current) return;
      look.current.pitch = Math.max(
        -0.45,
        Math.min(1.48, look.current.pitch - dy * 0.004),
      );
      state.offset
        .subVectors(camera.position, controls.current.target)
        .applyAxisAngle(camera.up, -dx * 0.004);
      camera.position.copy(controls.current.target).add(state.offset);
      invalidate();
    };
    let drag: { id: number; x: number; y: number } | null = null;
    const pointerDown = (e: PointerEvent) => {
      if (!look || (e.button !== 0 && e.button !== 2)) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      gl.domElement.setPointerCapture(e.pointerId);
    };
    const pointerMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      turn(e.clientX - drag.x, e.clientY - drag.y);
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const pointerUp = () => {
      drag = null;
    };
    const wheel = (e: WheelEvent) => {
      if (look) {
        if (e.ctrlKey) return;
        e.preventDefault();
        turn(e.deltaX, e.deltaY);
        return;
      }
      if (controls.current)
        state.desiredRadius = Math.max(
          1.5,
          Math.min(18, camera.position.distanceTo(controls.current.target)),
        );
      invalidate();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    gl.domElement.addEventListener('wheel', wheel, { passive: false });
    gl.domElement.addEventListener('pointerdown', pointerDown);
    gl.domElement.addEventListener('pointermove', pointerMove);
    gl.domElement.addEventListener('pointerup', pointerUp);
    gl.domElement.addEventListener('pointercancel', pointerUp);
    return () => {
      keys.current.clear();
      state.jumpQueued = false;
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      gl.domElement.removeEventListener('wheel', wheel);
      gl.domElement.removeEventListener('pointerdown', pointerDown);
      gl.domElement.removeEventListener('pointermove', pointerMove);
      gl.domElement.removeEventListener('pointerup', pointerUp);
      gl.domElement.removeEventListener('pointercancel', pointerUp);
      delete gl.domElement.dataset.player;
    };
  }, [active, camera, controls, gl, invalidate, state, look]);
  useFrame((frame, elapsed) => {
    if (!active || !body.current || !controls.current) return;
    const dt = Math.min(elapsed, 0.1),
      p = body.current.position,
      k = keys.current;
    if (carrier?.current.active) {
      const dy = carrier.current.y - state.feet;
      state.feet = carrier.current.y;
      p.y = state.feet;
      camera.position.y += dy;
      controls.current.target.y += dy;
      state.velocity = 0;
      state.grounded = true;
      state.jumpQueued = false;
      k.clear();
    }
    const previousFeet = state.feet;
    const wasGrounded = state.grounded;
    state.forward.subVectors(controls.current.target, camera.position).setY(0);
    if (state.forward.lengthSq() < 0.00001) state.forward.set(0, 0, -1);
    else state.forward.normalize();
    state.right.set(-state.forward.z, 0, state.forward.x);
    const f =
      Number(k.has('KeyW') || k.has('ArrowUp')) -
      Number(k.has('KeyS') || k.has('ArrowDown'));
    const r =
      Number(k.has('KeyD') || k.has('ArrowRight')) -
      Number(k.has('KeyA') || k.has('ArrowLeft'));
    state.delta
      .copy(state.forward)
      .multiplyScalar(f)
      .addScaledVector(state.right, r)
      .normalize()
      .multiplyScalar(dt * WALK_SPEED);
    if(state.grounded && !carrier?.current.active)state.delta.z+=(surfaceVelocity?.(p.x,p.z,state.feet)??0)*dt;
    const x = Math.max(-limits[0], Math.min(limits[0], p.x + state.delta.x));
    const z = Math.max(-limits[1], Math.min(limits[1], p.z + state.delta.z));
    const nx =
      blocked(obstacles, x, p.z, state.feet) ||
      groundHeight(x, p.z, state.feet) > state.feet + 0.29
        ? p.x
        : x;
    const nz =
      blocked(obstacles, nx, z, state.feet) ||
      groundHeight(nx, z, state.feet) > state.feet + 0.29
        ? p.z
        : z;
    state.delta.set(nx - p.x, 0, nz - p.z);
    const travelled = state.delta.length();
    if (travelled > 0.00001)
      state.heading = movementHeading(state.delta.x, state.delta.z);
    body.current.rotation.y = turnToward(
      body.current.rotation.y,
      state.heading,
      dt,
    );
    let floor = groundHeight(nx, nz, state.feet);
    for (const box of obstacles)
      if (overlaps(box, nx, nz, 0.24) && box.max.y <= state.feet + 0.29)
        floor = Math.max(floor, box.max.y);
    if (state.jumpQueued && state.grounded) {
      state.velocity = JUMP_SPEED;
      state.grounded = false;
    }
    state.jumpQueued = false;
    if (!state.grounded || state.feet > floor + 0.03) {
      state.grounded = false;
      state.velocity -= GRAVITY * dt;
      state.feet += state.velocity * dt;
    } else state.feet = floor;
    for (const box of obstacles) {
      if (!overlaps(box, nx, nz, 0.24)) continue;
      if (
        state.velocity > 0 &&
        previousFeet + BODY_HEIGHT <= box.min.y &&
        state.feet + BODY_HEIGHT >= box.min.y
      ) {
        state.feet = box.min.y - BODY_HEIGHT - 0.01;
        state.velocity = 0;
      }
      if (
        state.velocity <= 0 &&
        previousFeet >= box.max.y - 0.01 &&
        state.feet <= box.max.y
      )
        floor = Math.max(floor, box.max.y);
    }
    if (state.feet <= floor) {
      state.feet = floor;
      state.velocity = 0;
      state.grounded = true;
    }
    state.phase += travelled * 2.8;
    const targetGait = state.grounded && travelled > 0.00001 ? 1 : 0;
    state.gait += (targetGait - state.gait) * Math.min(1, dt * 14);
    const swing = Math.sin(state.phase) * 0.62 * state.gait;
    if (leftLeg.current)
      leftLeg.current.rotation.x = state.grounded ? swing : -0.4;
    if (rightLeg.current)
      rightLeg.current.rotation.x = state.grounded ? -swing : 0.24;
    if (leftArm.current)
      leftArm.current.rotation.x = state.grounded ? -swing * 0.8 : -0.7;
    if (rightArm.current)
      rightArm.current.rotation.x = state.grounded ? swing * 0.8 : -0.7;
    p.set(nx, state.feet, nz);
    state.delta.y = state.feet - previousFeet;
    camera.position.add(state.delta);
    controls.current.target.set(nx, state.feet + 1.4, nz);
    walkerCameraOffset(
      state.offset,
      camera.position,
      controls.current.target,
      state.feet,
      state.desiredRadius,
    );
    camera.position.copy(controls.current.target).add(state.offset);
    controls.current.update();
    const cameraFloor = groundHeight(
      camera.position.x,
      camera.position.z,
      state.feet,
    );
    if (state.feet >= -0.8 || cameraFloor <= state.feet + 0.65)
      camera.position.y = Math.max(cameraFloor + 0.45, camera.position.y);
    state.offset.subVectors(camera.position, controls.current.target);
    state.ray.origin.copy(controls.current.target);
    state.ray.direction.copy(state.offset).normalize();
    let safeDistance = state.offset.length();
    for (const box of obstacles)
      if (state.ray.intersectBox(box, state.hit)) {
        const d = state.hit.distanceTo(controls.current.target) - 0.18;
        if (d < safeDistance) safeDistance = Math.max(0.1, d);
      }
    camera.position
      .copy(controls.current.target)
      .addScaledVector(state.ray.direction, safeDistance);
    camera.lookAt(controls.current.target);
    if (look) camera.rotateX(look.current.pitch);
    if (
      frame.clock.elapsedTime - state.lastReport > 0.06 ||
      wasGrounded !== state.grounded
    ) {
      onPosition(nx, nz, body.current.position.y);
      state.lastReport = frame.clock.elapsedTime;
      gl.domElement.dataset.player = JSON.stringify({
        x: nx,
        z: nz,
        y: state.feet,
        yaw: body.current.rotation.y,
        grounded: state.grounded,
        leftLeg: leftLeg.current?.rotation.x,
        rightLeg: rightLeg.current?.rotation.x,
        lookPitch: look?.current.pitch || 0,
        gazeY: camera.getWorldDirection(state.gaze).y,
        cameraY: camera.position.y,
      });
    }
    const turning =
      Math.abs(
        Math.atan2(
          Math.sin(state.heading - body.current.rotation.y),
          Math.cos(state.heading - body.current.rotation.y),
        ),
      ) > 0.002;
    if (k.size || !state.grounded || state.gait > 0.002 || turning)
      invalidate();
  });
  return (
    <group ref={body} position={initialPosition} visible={active}>
      <mesh position={[0, 1.22, 0]} castShadow>
        <capsuleGeometry args={[0.25, 0.38, 4, 10]} />
        <meshStandardMaterial color="#c3a36a" />
      </mesh>
      <mesh position={[0, 1.75, 0]} castShadow>
        <sphereGeometry args={[0.22, 14, 10]} />
        <meshStandardMaterial color="#e8bd9d" />
      </mesh>
      <mesh position={[0, 1.88, -0.025]}>
        <sphereGeometry args={[0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#302f31" />
      </mesh>
      {[-0.077, 0.077].map((x) => (
        <mesh key={x} position={[x, 1.78, 0.198]}>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshStandardMaterial color="#26343b" />
        </mesh>
      ))}
      <mesh position={[0, 1.7, 0.224]}>
        <sphereGeometry args={[0.037, 8, 6]} />
        <meshStandardMaterial color="#d6a78a" />
      </mesh>
      {[
        { x: -0.14, ref: leftLeg },
        { x: 0.14, ref: rightLeg },
      ].map(({ x, ref }) => (
        <group key={x} ref={ref} position={[x, 0.89, 0]}>
          <mesh position={[0, -0.39, 0]} castShadow>
            <capsuleGeometry args={[0.1, 0.57, 4, 8]} />
            <meshStandardMaterial color="#293b44" />
          </mesh>
          <mesh position={[0, -0.825, 0.045]} castShadow>
            <boxGeometry args={[0.23, 0.13, 0.37]} />
            <meshStandardMaterial color="#172831" />
          </mesh>
        </group>
      ))}
      {[
        { x: -0.32, ref: leftArm },
        { x: 0.32, ref: rightArm },
      ].map(({ x, ref }) => (
        <group key={x} ref={ref} position={[x, 1.44, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.085, 0.36, 4, 8]} />
            <meshStandardMaterial color="#c3a36a" />
          </mesh>
          <mesh position={[0, -0.53, 0]}>
            <sphereGeometry args={[0.087, 10, 6]} />
            <meshStandardMaterial color="#e8bd9d" />
          </mesh>
        </group>
      ))}
    </group>
  );
}
