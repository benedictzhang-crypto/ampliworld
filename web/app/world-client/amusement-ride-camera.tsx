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
  const forward = useMemo(() => new Vector3(), []);
  const target = useMemo(() => new Vector3(), []);
  const ride = PARK_RIDES.find((entry) => entry.id === session.id);
  useEffect(() => {
    const timer = window.setInterval(invalidate, 33);
    invalidate();
    return () => { window.clearInterval(timer); delete gl.domElement.dataset.ride; };
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
    } else {
      // A clear exterior chase view keeps the full gondola and height change
      // visible; the circular safety cage obscures a seat-level camera.
      camera.position.set(plan.center.x + ride.x + 28, base + pose.y + 13, plan.center.z + ride.z + 22);
      target.set(plan.center.x + ride.x, base + pose.y + 2, plan.center.z + ride.z);
    }
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
