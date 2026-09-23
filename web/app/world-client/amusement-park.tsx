'use client';

import { Clone, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Group, Mesh } from 'three';
import { cityGroundHeight } from './city-surface';
import type { HauntStep } from './amusement-experience';
import plan from './amusement-park-plan.json';
import manifest from '../../public/assets/3d/ampliworld/GC-AMUSEMENT-001/manifest.json';

export const AMUSEMENT_PARK = plan;

export type BasketballShot = { id: number; speed: number; angle: number };

export function AmusementPark({ x, z, scare, shot }: { x: number; z: number; scare: HauntStep | null; shot: BasketballShot | null }) {
  const cx = plan.center.x;
  const cz = plan.center.z;
  const distance = Math.hypot(x - cx, z - cz);
  if (distance > 2400) return null;
  return <AmusementParkModel scare={scare} shot={shot} animateTrains={distance <= 1400} />;
}

function BasketballFlight({ shot }: { shot: BasketballShot }) {
  const mesh = useRef<Mesh>(null);
  const { invalidate } = useThree();
  const born = useRef(performance.now());
  useFrame(() => {
    if (!mesh.current) return;
    const t = Math.min(3.4, (performance.now() - born.current) / 1000);
    const angle = shot.angle * Math.PI / 180;
    mesh.current.position.set(-140, 1.8 + shot.speed * Math.sin(angle) * t - 4.905 * t * t,
      366 - shot.speed * Math.cos(angle) * t);
    mesh.current.visible = t < 3.4 && mesh.current.position.y > -.3;
    if (mesh.current.visible) invalidate();
  });
  return <mesh ref={mesh} position={[-140, 1.8, 366]} castShadow>
    <sphereGeometry args={[.35, 16, 12]} />
    <meshStandardMaterial color="#d57024" roughness={.76} />
  </mesh>;
}

function Apparition({ scare }: { scare: HauntStep }) {
  const actor = useRef<Group>(null);
  const { invalidate } = useThree();
  const born = useRef(performance.now());
  useFrame(() => {
    if (!actor.current) return;
    const t = (performance.now() - born.current) / 1000;
    actor.current.scale.setScalar(Math.min(1, .12 + t * 5));
    actor.current.position.y = 2.7 + Math.sin(t * 14) * .18;
    if (t < 1.5) invalidate();
  });
  const house = plan.attractions.find((a) => a.id === scare.house)!;
  const side = scare.stage % 2 === 0 ? 44 : -44;
  return <group ref={actor} position={[house.x + side, 2.7, house.z + 62 - scare.stage * 25]}>
    <mesh castShadow><coneGeometry args={[1.65, 4.8, 8]} /><meshStandardMaterial color="#dfe4df" transparent opacity={.87} emissive="#25384c" emissiveIntensity={.8} /></mesh>
    <mesh position={[0, 2.3, 0]} castShadow><sphereGeometry args={[.92, 12, 8]} /><meshStandardMaterial color="#e3e7de" emissive="#506780" emissiveIntensity={.6} /></mesh>
    {[-.34, .34].map((dx) => <mesh key={dx} position={[dx, 2.46, .82]}><sphereGeometry args={[.16, 8, 6]} /><meshBasicMaterial color="#ff2938" /></mesh>)}
  </group>;
}

// The five cars follow the actual centreline used by build-amusement-park.py.
// One frame callback updates every train; the rest of the city stays on-demand.
const COASTERS = [
  { id: 'Leviathan', x: -362, z: -219, rx: 220, rz: 145, peak: 90, phase: 0, speed: .16, color: '#209bc6' },
  { id: 'Wraith', x: -370, z: 149, rx: 186, rz: 127, peak: 65, phase: 1.3, speed: .2, color: '#8451bc', inverted: true },
  { id: 'Timberfall', x: -20, z: 148, rx: 146, rz: 102, peak: 42, phase: .7, speed: .14, color: '#a0784a', wooden: true },
  { id: 'Eclipse', x: 0, z: -255, rx: 94, rz: 66, peak: 27, phase: 1.8, speed: .22, color: '#ca4a4a' },
  { id: 'Little Comet', x: 261, z: 185, rx: 103, rz: 79, peak: 21, phase: .4, speed: .12, color: '#e49b3c' },
] as const;

function coasterPoint(ride: typeof COASTERS[number], t: number) {
  const wave = Math.max(0, Math.cos(t + ride.phase)) ** 9;
  const hill = Math.max(0, Math.sin(3 * t - ride.phase)) ** 6;
  let y = 10 + (ride.peak - 10) * wave + ride.peak * .26 * hill;
  if ('inverted' in ride) y += 8 * Math.sin(2 * t) ** 2;
  if ('wooden' in ride) y = 9 + (ride.peak - 9) * Math.max(0, Math.sin(2 * t + ride.phase)) ** 4 + 5 * Math.sin(7 * t) ** 2;
  return { x: ride.x + ride.rx * Math.cos(t), y, z: ride.z + ride.rz * Math.sin(t) };
}

function CoasterMotion() {
  const cars = useRef<Array<Group | null>>([]);
  const { invalidate } = useThree();
  useEffect(() => {
    const timer = window.setInterval(invalidate, 40);
    return () => window.clearInterval(timer);
  }, [invalidate]);
  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    COASTERS.forEach((ride, rideIndex) => {
      for (let carIndex = 0; carIndex < 4; carIndex++) {
        const car = cars.current[rideIndex * 4 + carIndex];
        if (!car) continue;
        const t = elapsed * ride.speed + 13 * Math.PI / 66 - carIndex * .065;
        const p = coasterPoint(ride, t);
        const ahead = coasterPoint(ride, t + .01);
        car.position.set(p.x, p.y + ('inverted' in ride ? -1.2 : .85), p.z);
        car.rotation.y = -Math.atan2(ahead.z - p.z, ahead.x - p.x);
      }
    });
  });
  return <group name="moving-coaster-trains">
    {COASTERS.flatMap((ride, rideIndex) => Array.from({ length: 4 }, (_, carIndex) =>
      <group key={`${ride.id}-${carIndex}`} ref={(node) => { cars.current[rideIndex * 4 + carIndex] = node; }}>
        <mesh castShadow><boxGeometry args={[3.7, 1.5, 2.3]} /><meshStandardMaterial color={ride.color} metalness={.38} roughness={.32} /></mesh>
        <mesh position={[0, .85, 0]} castShadow><boxGeometry args={[2.8, .42, 1.8]} /><meshStandardMaterial color="#17242d" metalness={.35} roughness={.45} /></mesh>
      </group>))}
  </group>;
}

function AmusementParkModel({ scare, shot, animateTrains }: { scare: HauntStep | null; shot: BasketballShot | null; animateTrains: boolean }) {
  const { scene } = useGLTF(`/assets/3d/ampliworld/${manifest.id}/${manifest.file}`);
  const { x, z } = plan.center;
  return (
    <group name="aureole-adventure-park" position={[x, cityGroundHeight(x, z), z]}>
      <Clone object={scene} castShadow receiveShadow />
      {animateTrains && <CoasterMotion />}
      {scare && <Apparition key={`${scare.house}-${scare.stage}`} scare={scare} />}
      {shot && <BasketballFlight key={shot.id} shot={shot} />}
    </group>
  );
}

export function amusementGroundHeight(x: number, z: number, currentY: number) {
  const dx = x - plan.center.x;
  const dz = z - plan.center.z;
  if (Math.abs(dx) > plan.footprint.width / 2 || Math.abs(dz) > plan.footprint.depth / 2)
    return undefined;
  const base = cityGroundHeight(plan.center.x, plan.center.z);
  for (const haunt of plan.attractions.filter((a) => a.kind === 'walkthrough-haunt'))
    if (Math.abs(dx - haunt.x) <= 70 && Math.abs(dz - haunt.z) <= 74 && currentY >= base - .2)
      return base + .255;
  if (Math.abs(dx + 140) <= 32 && Math.abs(dz - 345) <= 18 && currentY >= base - .2)
    return base + .21;
  if (dx >= -321 && dx <= -309 && Math.abs(dz - 345) <= 1.1 && currentY >= base - .2)
    return base + .22 + ((dx + 321) / 12) * 1.98;
  if (dx >= -314 && dx <= -225 && dz >= 321 && dz <= 369) {
    for (let i = 0; i < 12; i++) {
      const beamX = -306 + i * 6.3;
      const beamZ = 345 + 3.1 * Math.sin(i * .7);
      if (Math.abs(dx - beamX) <= 3.4 && Math.abs(dz - beamZ) <= .625 && currentY >= base + 1.8)
        return base + 2.2;
    }
    return base + .22;
  }
  // The park foundation is a 0.02 m step over the surrounding dry city grade.
  if (currentY >= base - .35) return base + .02;
  return undefined;
}

export const AMUSEMENT_COLLIDERS = [...manifest.hauntWallColliders, ...manifest.structuralColliders].map((wall) => ({
  id: wall.id,
  min: [wall.min[0] + plan.center.x, wall.min[1], wall.min[2] + plan.center.z] as [number, number, number],
  max: [wall.max[0] + plan.center.x, wall.max[1], wall.max[2] + plan.center.z] as [number, number, number],
}));
