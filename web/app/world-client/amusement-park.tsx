'use client';

import { Clone, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { CubicBezierCurve3, Vector3, type Group, type Mesh } from 'three';
import { cityGroundHeight } from './city-surface';
import type { HauntStep } from './amusement-experience';
import { PARK_RIDES, coasterPoint, coasterSpurControls, coasterSpurPoint, ridePose, type RideSession } from './amusement-rides';
import plan from './amusement-park-plan.json';
import manifest from '../../public/assets/3d/ampliworld/GC-AMUSEMENT-001/manifest.json';

export const AMUSEMENT_PARK = plan;

export type BasketballShot = { id: number; speed: number; angle: number };

export function AmusementPark({ x, z, scare, shot, ride }: { x: number; z: number; scare: HauntStep | null; shot: BasketballShot | null; ride: RideSession | null }) {
  const cx = plan.center.x;
  const cz = plan.center.z;
  const distance = Math.hypot(x - cx, z - cz);
  if (distance > 2400) return null;
  return <AmusementParkModel scare={scare} shot={shot} ride={ride} animateTrains={distance <= 1400} />;
}

function BasketballFlight({ shot }: { shot: BasketballShot }) {
  const mesh = useRef<Mesh>(null);
  const { invalidate } = useThree();
  const born = useRef<number | null>(null);
  useFrame(() => {
    if (!mesh.current) return;
    if (born.current === null) born.current = performance.now();
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
  const born = useRef<number | null>(null);
  useFrame(() => {
    if (!actor.current) return;
    if (born.current === null) born.current = performance.now();
    const t = (performance.now() - born.current) / 1000;
    actor.current.scale.setScalar(Math.min(1, .12 + t * 5));
    actor.current.position.y = 2.7 + Math.sin(t * 14) * .18;
    if (t < 1.5) invalidate();
  });
  const house = plan.attractions.find((a) => a.id === scare.house)!;
  // Odd rooms are entered through the right gap, even rooms through the left.
  // Keep the actor in the same room as the player, rather than behind a wall.
  const side = scare.stage % 2 === 1 ? 50 : -50;
  const isLab = scare.house === 'haunt-lab';
  const isFinale = scare.stage >= 4;
  return <group ref={actor} position={[house.x + side, 2.7, house.z + 62 - scare.stage * 25]}>
    <pointLight color={isFinale ? '#ec1f35' : isLab ? '#77e5e4' : '#a9c6ff'} intensity={isFinale ? 8 : 4} distance={11} decay={2} />
    <mesh castShadow><coneGeometry args={[1.65, 4.8, 8]} /><meshStandardMaterial color={isLab ? '#b5dad5' : '#dfe4df'} transparent opacity={.87} emissive={isFinale ? '#8b1625' : '#25384c'} emissiveIntensity={isFinale ? 1.5 : .8} /></mesh>
    <mesh position={[0, 2.3, 0]} castShadow><sphereGeometry args={[.92, 12, 8]} /><meshStandardMaterial color={isLab ? '#a2ccc5' : '#e3e7de'} emissive={isFinale ? '#923444' : '#506780'} emissiveIntensity={.6} /></mesh>
    {[-.34, .34].map((dx) => <mesh key={dx} position={[dx, 2.46, .82]}><sphereGeometry args={[.16, 8, 6]} /><meshBasicMaterial color="#ff2938" /></mesh>)}
  </group>;
}

// One frame callback updates all trains; the rest of the city stays on-demand.
const COASTERS = PARK_RIDES.filter((entry) => entry.kind === 'coaster');
const TOWERS = PARK_RIDES.filter((entry) => entry.kind === 'tower');

function CoasterMotion({ ride: boarded }: { ride: RideSession | null }) {
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
        let p;
        let ahead;
        if (boarded?.id === ride.id) {
          const sinceBoarding = Math.max(0, (performance.now() - boarded.startedAt) / 1000);
          const offset = carIndex * .25;
          const pose = ridePose(ride, Math.max(0, sinceBoarding - offset));
          p = { x: pose.x, y: pose.y, z: pose.z + (sinceBoarding < offset ? carIndex * 3.2 : 0) };
          ahead = { x: pose.aheadX, y: pose.aheadY, z: pose.aheadZ };
        } else {
          const t = elapsed * ride.speed + 13 * Math.PI / 66 - carIndex * .065;
          p = coasterPoint(ride, t);
          ahead = coasterPoint(ride, t + .01);
        }
        car.position.set(p.x, p.y + (ride.track.inverted ? -1.2 : .85), p.z);
        car.rotation.y = -Math.atan2(ahead.z - p.z, ahead.x - p.x);
        car.rotation.z = Math.atan2(ahead.y - p.y, Math.hypot(ahead.x - p.x, ahead.z - p.z));
      }
    });
  });
  return <group name="moving-coaster-trains">
    {COASTERS.flatMap((ride, rideIndex) => Array.from({ length: 4 }, (_, carIndex) =>
      <group key={`${ride.id}-${carIndex}`} ref={(node) => { cars.current[rideIndex * 4 + carIndex] = node; }}>
        <mesh castShadow><boxGeometry args={[3.6, .65, 2.35]} /><meshStandardMaterial color={ride.color} metalness={.48} roughness={.27} /></mesh>
        <mesh position={[1.38, .12, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <coneGeometry args={[1.12, 1.25, 8]} /><meshStandardMaterial color={ride.color} metalness={.48} roughness={.27} />
        </mesh>
        {[-.59, .59].map((side) => <group key={side} position={[-.38, .46, side]}>
          <mesh castShadow><boxGeometry args={[1.35, .28, .85]} /><meshStandardMaterial color="#17242d" metalness={.22} roughness={.57} /></mesh>
          <mesh position={[-.47, .58, 0]} castShadow><boxGeometry args={[.26, 1.02, .86]} /><meshStandardMaterial color="#243947" metalness={.28} roughness={.48} /></mesh>
          <mesh position={[.27, .61, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[.09, .09, .75, 8]} /><meshStandardMaterial color="#d3dce1" metalness={.72} roughness={.23} />
          </mesh>
        </group>)}
        {[-.74, .74].map((side) => <mesh key={`skirt-${side}`} position={[0, .03, side]} castShadow>
          <boxGeometry args={[2.55, .66, .13]} /><meshStandardMaterial color={ride.color} metalness={.5} roughness={.28} />
        </mesh>)}
      </group>))}
  </group>;
}

function CoasterStationSpurs() {
  return <group name="station-to-running-track-spurs">
    {COASTERS.flatMap((ride) => {
      const points = coasterSpurControls(ride);
      return [-.65, .65].map((side) => {
        const curve = new CubicBezierCurve3(...points.map((p) => new Vector3(p.x + side, p.y, p.z)) as [Vector3, Vector3, Vector3, Vector3]);
        return <mesh key={`${ride.id}-${side}`} castShadow><tubeGeometry args={[curve, 40, .16, 8, false]} />
          <meshStandardMaterial color={ride.color} metalness={.6} roughness={.34} /></mesh>;
      });
    })}
    {COASTERS.flatMap((ride) => [.2, .4, .6, .8].map((u) => {
      const p = coasterSpurPoint(ride, u);
      return <mesh key={`${ride.id}-spur-support-${u}`} position={[p.x, p.y / 2, p.z]} castShadow>
        <cylinderGeometry args={[.35, .48, p.y, 8]} /><meshStandardMaterial color="#687a84" metalness={.43} roughness={.5} />
      </mesh>;
    }))}
  </group>;
}

function TowerMotion({ boarded }: { boarded: RideSession | null }) {
  const gondolas = useRef<Array<Group | null>>([]);
  useFrame(() => {
    for (let i = 0; i < TOWERS.length; i++) {
      const group = gondolas.current[i];
      if (!group) continue;
      const tower = TOWERS[i];
      const elapsed = boarded?.id === tower.id ? (performance.now() - boarded.startedAt) / 1000 : 0;
      group.position.y = boarded?.id === tower.id ? ridePose(tower, elapsed).y : 4;
    }
  });
  return <group name="rideable-drop-tower-gondolas">
    {TOWERS.map((tower, i) => <group key={tower.id} ref={(node) => { gondolas.current[i] = node; }} position={[tower.x, 4, tower.z]}>
      <mesh castShadow><cylinderGeometry args={[10, 10, 3.2, 28]} /><meshStandardMaterial color={tower.color} metalness={.55} roughness={.3} /></mesh>
      <mesh position={[0, 1.9, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[10.2, .38, 8, 28]} /><meshStandardMaterial color="#899aa4" metalness={.72} roughness={.24} /></mesh>
      {Array.from({ length: 12 }, (_, seat) => {
        const angle = seat * Math.PI / 6;
        return <group key={seat} position={[8.6 * Math.cos(angle), .3, 8.6 * Math.sin(angle)]} rotation={[0, -angle, 0]}>
          <mesh castShadow><boxGeometry args={[1.25, 1.8, 1.15]} /><meshStandardMaterial color="#192734" roughness={.53} /></mesh>
          <mesh position={[.58, .27, 0]} castShadow><boxGeometry args={[.13, .35, 1.04]} /><meshStandardMaterial color="#e7e8de" metalness={.66} roughness={.25} /></mesh>
        </group>;
      })}
    </group>)}
  </group>;
}

function AmusementParkModel({ scare, shot, ride, animateTrains }: { scare: HauntStep | null; shot: BasketballShot | null; ride: RideSession | null; animateTrains: boolean }) {
  const { scene } = useGLTF(`/assets/3d/ampliworld/${manifest.id}/${manifest.file}`);
  const { x, z } = plan.center;
  return (
    <group name="aureole-adventure-park" position={[x, cityGroundHeight(x, z), z]}>
      <Clone object={scene} castShadow receiveShadow />
      <CoasterStationSpurs />
      {animateTrains && <><CoasterMotion ride={ride} /><TowerMotion boarded={ride} /></>}
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
