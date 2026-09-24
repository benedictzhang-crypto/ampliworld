'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { cityGroundHeight } from './city-surface';
import plan from './amusement-park-plan.json';
import { PARK_RIDES, ridePose, type RideSession } from './amusement-rides';

export function AmusementRideCamera({ session, controls, onComplete }: {
  session: RideSession;
  controls: React.RefObject<OrbitControlsImpl | null>;
  onComplete: (id: string) => void;
}) {
  const { camera, gl, invalidate } = useThree();
  const finished = useRef(false);
  const look = useRef({ yaw: 0, pitch: 0 });
  const forward = useMemo(() => new Vector3(), []);
  const target = useMemo(() => new Vector3(), []);
  const ride = PARK_RIDES.find((entry) => entry.id === session.id);
  useEffect(() => {
    const timer = window.setInterval(invalidate, 33);
    invalidate();
    return () => { window.clearInterval(timer); delete gl.domElement.dataset.ride; };
  }, [gl, invalidate]);
  useEffect(() => {
    let drag: { id: number; x: number; y: number } | null = null;
    const turn = (dx: number, dy: number) => {
      look.current.yaw -= dx * .004;
      look.current.pitch = Math.max(-1.15, Math.min(1.15, look.current.pitch - dy * .004));
      invalidate();
    };
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.button !== 2) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      gl.domElement.setPointerCapture(event.pointerId);
    };
    const pointerMove = (event: PointerEvent) => {
      if (!drag || drag.id !== event.pointerId) return;
      turn(event.clientX - drag.x, event.clientY - drag.y);
      drag.x = event.clientX;
      drag.y = event.clientY;
    };
    const pointerUp = (event: PointerEvent) => {
      if (drag?.id !== event.pointerId) return;
      if (gl.domElement.hasPointerCapture(event.pointerId)) gl.domElement.releasePointerCapture(event.pointerId);
      drag = null;
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? gl.domElement.clientHeight : 1;
      turn(event.deltaX * scale, event.deltaY * scale);
    };
    gl.domElement.addEventListener('pointerdown', pointerDown);
    gl.domElement.addEventListener('pointermove', pointerMove);
    gl.domElement.addEventListener('pointerup', pointerUp);
    gl.domElement.addEventListener('pointercancel', pointerUp);
    gl.domElement.addEventListener('wheel', wheel, { passive: false });
    return () => {
      gl.domElement.removeEventListener('pointerdown', pointerDown);
      gl.domElement.removeEventListener('pointermove', pointerMove);
      gl.domElement.removeEventListener('pointerup', pointerUp);
      gl.domElement.removeEventListener('pointercancel', pointerUp);
      gl.domElement.removeEventListener('wheel', wheel);
    };
  }, [gl, invalidate]);
  useFrame(() => {
    if (!ride || !controls.current || finished.current) return;
    const elapsed = (performance.now() - session.startedAt) / 1000;
    const pose = ridePose(ride, elapsed);
    const base = cityGroundHeight(plan.center.x, plan.center.z);
    if (ride.kind === 'coaster') {
      forward.set(pose.aheadX - pose.x, pose.aheadY - pose.y, pose.aheadZ - pose.z).normalize();
      camera.position.set(plan.center.x + pose.x,
        base + pose.y + (ride.track.inverted ? -.2 : 2.3),
        plan.center.z + pose.z);
      target.copy(camera.position).addScaledVector(forward, 12);
    } else if (ride.kind === 'tower') {
      // A clear exterior chase view keeps the full gondola and height change
      // visible; the circular safety cage obscures a seat-level camera.
      camera.position.set(plan.center.x + ride.x + 28, base + pose.y + 13, plan.center.z + ride.z + 22);
      target.set(plan.center.x + ride.x, base + pose.y + 2, plan.center.z + ride.z);
    } else {
      const outwardX = (pose.x - ride.x) / ride.radius;
      const outwardZ = (pose.z - ride.z) / ride.radius;
      const setback = ride.kind === 'carousel' ? 16 : 8;
      camera.position.set(plan.center.x + pose.x + outwardX * setback,
        base + pose.y + (ride.kind === 'carousel' ? 7.5 : 5), plan.center.z + pose.z + outwardZ * setback);
      target.set(plan.center.x + pose.x, base + pose.y + 1, plan.center.z + pose.z);
    }
    const direction = target.sub(camera.position);
    const distance = Math.max(8, direction.length());
    const yaw = Math.atan2(direction.x, direction.z) + look.current.yaw;
    const pitch = Math.max(-1.35, Math.min(1.35,
      Math.atan2(direction.y, Math.hypot(direction.x, direction.z)) + look.current.pitch));
    target.set(camera.position.x + Math.sin(yaw) * Math.cos(pitch) * distance,
      camera.position.y + Math.sin(pitch) * distance,
      camera.position.z + Math.cos(yaw) * Math.cos(pitch) * distance);
    controls.current.target.copy(target);
    camera.lookAt(target);
    gl.domElement.dataset.ride = JSON.stringify({ id: ride.id, elapsed: +elapsed.toFixed(2), cameraY: camera.position.y });
    if (pose.done) {
      finished.current = true;
      onComplete(ride.id);
    }
  });
  return null;
}
