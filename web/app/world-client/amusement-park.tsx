'use client';

import { Clone, Text, useGLTF } from '@react-three/drei';
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
  if (distance > 2400 && !ride) return null;
  return <AmusementParkModel scare={scare} shot={shot} ride={ride} animateTrains={ride !== null || distance <= 1400} />;
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

// The walking avatar is hidden while riding. Keep the same recognizable
// passenger silhouette attached to the moving seat, not at the old station.
function RidePassenger({ scale = 1 }: { scale?: number }) {
  return <group name="boarded-player-avatar" scale={scale}>
    <mesh position={[0,.64,0]} castShadow><capsuleGeometry args={[.25,.42,4,10]}/><meshStandardMaterial color="#c3a36a"/></mesh>
    <mesh position={[0,1.17,0]} castShadow><sphereGeometry args={[.22,14,10]}/><meshStandardMaterial color="#e8bd9d"/></mesh>
    <mesh position={[0,1.3,-.03]} castShadow><sphereGeometry args={[.2,12,8,0,Math.PI*2,0,Math.PI/2]}/><meshStandardMaterial color="#302f31"/></mesh>
    {[-.31,.31].map(x=><group key={x}>
      <mesh position={[x,.62,.03]} rotation={[.22,0,x<0?-.22:.22]} castShadow><capsuleGeometry args={[.085,.38,4,8]}/><meshStandardMaterial color="#c3a36a"/></mesh>
      <mesh position={[x*.45,-.08,.32]} rotation={[Math.PI/2,0,0]} castShadow><capsuleGeometry args={[.12,.43,4,8]}/><meshStandardMaterial color="#293b44"/></mesh>
    </group>)}
  </group>;
}

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
        {boarded?.id === ride.id && carIndex === 0 && <group position={[-.38,.52,0]}><RidePassenger /></group>}
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
          {boarded?.id === tower.id && seat === 0 && <group position={[0,.48,0]}><RidePassenger /></group>}
          <mesh castShadow><boxGeometry args={[1.25, 1.8, 1.15]} /><meshStandardMaterial color="#192734" roughness={.53} /></mesh>
          <mesh position={[.58, .27, 0]} castShadow><boxGeometry args={[.13, .35, 1.04]} /><meshStandardMaterial color="#e7e8de" metalness={.66} roughness={.25} /></mesh>
        </group>;
      })}
    </group>)}
  </group>;
}

function FamilyRideMotion({ boarded }: { boarded: RideSession | null }) {
  const carousel = useRef<Group>(null);
  const cups = useRef<Group>(null);
  const horses = useRef<Array<Group | null>>([]);
  const cupBodies = useRef<Array<Group | null>>([]);
  useFrame(({ clock }) => {
    const idle = clock.getElapsedTime();
    const elapsed = boarded ? Math.max(0, (performance.now() - boarded.startedAt) / 1000) : 0;
    const carouselAngle = boarded?.id === 'carousel' ? 4 * Math.PI * Math.min(1, elapsed / 18) : idle * .45;
    const cupAngle = boarded?.id === 'teacups' ? 6 * Math.PI * Math.min(1, elapsed / 18) : idle * .62;
    if (carousel.current) carousel.current.rotation.y = -carouselAngle;
    if (cups.current) cups.current.rotation.y = -cupAngle;
    horses.current.forEach((horse, i) => {
      if (horse) horse.position.y = 2.3 + .4 * Math.sin(carouselAngle * 4 + i * Math.PI / 2);
    });
    cupBodies.current.forEach((cup, i) => {
      if (cup) cup.rotation.y = cupAngle * (i % 2 ? 1.35 : -.85);
    });
  });
  return <group name="moving-family-rides">
    <mesh position={[45, 9.55, 337]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[28.55, .28, 8, 64]} />
      <meshStandardMaterial color="#e4c477" metalness={.78} roughness={.24} />
    </mesh>
    {Array.from({ length: 16 }, (_, i) => {
      const a = i * 2 * Math.PI / 16;
      return <mesh key={`marquee-${i}`} position={[45 + 28.5 * Math.cos(a), 9.55, 337 + 28.5 * Math.sin(a)]}>
        <sphereGeometry args={[.38, 8, 6]} />
        <meshBasicMaterial color="#ffe6a0" />
      </mesh>;
    })}
    <group ref={carousel} position={[45, 0, 337]}>
      {Array.from({ length: 16 }, (_, i) => {
        const a = -Math.PI / 2 + i * 2 * Math.PI / 16;
        const saddle = i % 2 ? '#314c70' : '#a64451';
        return <group key={i} ref={(node) => { horses.current[i] = node; }} position={[20 * Math.cos(a), 2.3, 20 * Math.sin(a)]} rotation={[0, -a, 0]}>
          {boarded?.id === 'carousel' && i === 0 && <group position={[-.2,.9,0]}><RidePassenger /></group>}
          <mesh position={[0, 3.85, 0]} castShadow><cylinderGeometry args={[.12, .12, 8.3, 8]} /><meshStandardMaterial color="#cfae5e" metalness={.8} roughness={.22} /></mesh>
          <mesh scale={[1.65, .9, .65]} castShadow><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#f1eee4" roughness={.58} /></mesh>
          <mesh position={[1.02, .68, 0]} rotation={[0, 0, -.4]} castShadow><cylinderGeometry args={[.4, .53, 1.35, 10]} /><meshStandardMaterial color="#f1eee4" roughness={.58} /></mesh>
          <mesh position={[1.5, 1.28, 0]} scale={[.64, .5, .5]} castShadow><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#fffaf0" roughness={.55} /></mesh>
          {[-.85, .85].map((dx) => <mesh key={`leg-${dx}`} position={[dx, -.94, .37]} rotation={[0, 0, dx < 0 ? -.12 : .12]} castShadow>
            <cylinderGeometry args={[.21, .12, 1.45, 8]} /><meshStandardMaterial color="#e6e2d9" roughness={.62} />
          </mesh>)}
          <mesh position={[-.2, .84, 0]} castShadow><boxGeometry args={[1.5, .21, 1.08]} /><meshStandardMaterial color={saddle} roughness={.48} /></mesh>
          <mesh position={[.83, 1.2, 0]} rotation={[0, 0, .4]} castShadow><coneGeometry args={[.3, .94, 8]} /><meshStandardMaterial color="#85705c" roughness={.7} /></mesh>
          <mesh position={[-1.57, .25, 0]} rotation={[0, 0, .72]} castShadow><coneGeometry args={[.27, 1.22, 8]} /><meshStandardMaterial color="#a69a87" roughness={.74} /></mesh>
          <mesh position={[1.95, 1.1, 0]} scale={[.28, .24, .48]} castShadow><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#d9d4c9" roughness={.7} /></mesh>
        </group>;
      })}
    </group>
    <group ref={cups} position={[160, 0, 337]}>
      {Array.from({ length: 9 }, (_, i) => {
        const a = -Math.PI / 2 + i * 2 * Math.PI / 9;
        return <group key={i} position={[18 * Math.cos(a), 0, 18 * Math.sin(a)]} ref={(node) => { cupBodies.current[i] = node; }}>
          {boarded?.id === 'teacups' && i === 0 && <group position={[-1,.67,0]}><RidePassenger /></group>}
          <mesh position={[0, .33, 0]} castShadow><cylinderGeometry args={[2.26, 2.26, .18, 20]} /><meshStandardMaterial color="#eee7d7" roughness={.62} /></mesh>
          <mesh position={[0, 1.05, 0]} castShadow><cylinderGeometry args={[2.7, 2.25, 1.65, 20, 1, true]} /><meshStandardMaterial color={i % 3 === 0 ? '#c94d64' : i % 3 === 1 ? '#5a88b2' : '#f1e6d1'} metalness={.32} roughness={.38} side={2} /></mesh>
          <mesh position={[0, 1.02, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.48, .08, 6, 20]} /><meshStandardMaterial color="#eacb82" metalness={.65} roughness={.3} /></mesh>
          <mesh position={[0, 1.9, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.68, .17, 8, 20]} /><meshStandardMaterial color="#d8ba70" metalness={.75} roughness={.28} /></mesh>
          <mesh position={[2.73, 1.08, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[.72, .2, 8, 16]} /><meshStandardMaterial color="#f0e9db" metalness={.24} roughness={.43} /></mesh>
          <mesh position={[0, 1.55, 0]} castShadow><cylinderGeometry args={[.45, .45, .65, 12]} /><meshStandardMaterial color="#d8ba70" metalness={.7} roughness={.3} /></mesh>
        </group>;
      })}
    </group>
  </group>;
}

function AmusementParkModel({ scare, shot, ride, animateTrains }: { scare: HauntStep | null; shot: BasketballShot | null; ride: RideSession | null; animateTrains: boolean }) {
  const { scene } = useGLTF(`/assets/3d/ampliworld/${manifest.id}/${manifest.file}`);
  const { x, z } = plan.center;
  return (
    <group name="aureole-adventure-park" position={[x, cityGroundHeight(x, z), z]}>
      <Clone object={scene} castShadow receiveShadow />
      <ParkVisitorAccents />
      <CoasterStationSpurs />
      {animateTrains && <><CoasterMotion ride={ride} /><TowerMotion boarded={ride} /><FamilyRideMotion boarded={ride} /></>}
      {scare && <Apparition key={`${scare.house}-${scare.stage}`} scare={scare} />}
      {shot && <BasketballFlight key={shot.id} shot={shot} />}
    </group>
  );
}

function ParkVisitorAccents() {
  return <group name="park boarding walks and wayfinding">
    {[45,160].map((x,i)=><group key={x}>
      {Array.from({length:6},(_,j)=><mesh key={j} position={[x,.048,283+j*7.1]} receiveShadow>
        <boxGeometry args={[13,.055,6.7]}/>
        <meshStandardMaterial color={(j+i)%3===0?'#8e8d86':(j+i)%3===1?'#a89a87':'#777f7e'} roughness={.95}/>
      </mesh>)}
      <mesh position={[x,3.1,281]} castShadow><boxGeometry args={[14,5.6,.45]}/><meshStandardMaterial color={i?'#744b67':'#3b6680'} metalness={.3} roughness={.55}/></mesh>
      <Text position={[x,3.4,281.28]} fontSize={1.5} color="#fff2ce" anchorX="center" anchorY="middle">{i?'TEACUPS • BOARD E':'CAROUSEL • BOARD E'}</Text>
    </group>)}
    {[[-260,395,'FIVE WORLDS'],[0,395,'AUREOLE FESTIVAL'],[260,395,'HALLOWEEN QUARTER']].map(([x,z,label])=><group key={String(label)} position={[Number(x),0,Number(z)]}>
      <mesh position={[0,6,0]} castShadow><boxGeometry args={[48,10,.5]}/><meshStandardMaterial color="#243b46" metalness={.48} roughness={.5}/></mesh>
      <mesh position={[0,6,.31]}><boxGeometry args={[45,7,.12]}/><meshStandardMaterial color="#b2574b" roughness={.72}/></mesh>
      <Text position={[0,6,.43]} fontSize={2.4} color="#fff3d4" anchorX="center" anchorY="middle">{String(label)}</Text>
    </group>)}
  </group>;
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
