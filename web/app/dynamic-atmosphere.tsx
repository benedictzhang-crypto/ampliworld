'use client';

import { Cloud, Clouds, Sky, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export type DayPhase = 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';

type AtmosphereKeyframe = {
  hour: number;
  background: string;
  fog: string;
  sky: string;
  ground: string;
  sun: string;
  cloud: string;
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  sunIntensity: number;
  moonIntensity: number;
  ambientIntensity: number;
  cloudOpacity: number;
};

type AtmosphereSample = Omit<AtmosphereKeyframe, 'hour'>;

const WORLD_DAY_PHASES = [
  {
    phase: 'DAWN',
    startMinute: 5 * 60,
    endMinute: 8 * 60,
    durationMs: 10 * 60 * 1000,
  },
  {
    phase: 'DAY',
    startMinute: 8 * 60,
    endMinute: 17.25 * 60,
    durationMs: 20 * 60 * 1000,
  },
  {
    phase: 'DUSK',
    startMinute: 17.25 * 60,
    endMinute: 20.25 * 60,
    durationMs: 10 * 60 * 1000,
  },
  {
    phase: 'NIGHT',
    startMinute: 20.25 * 60,
    endMinute: 29 * 60,
    durationMs: 15 * 60 * 1000,
  },
] as const satisfies ReadonlyArray<{
  phase: DayPhase;
  startMinute: number;
  endMinute: number;
  durationMs: number;
}>;

export const WORLD_DAY_CYCLE_DURATION_MS = WORLD_DAY_PHASES.reduce(
  (total, phase) => total + phase.durationMs,
  0,
);

export function getWorldMinutesAtCycleTime(elapsedMs: number) {
  const cycleTime =
    ((elapsedMs % WORLD_DAY_CYCLE_DURATION_MS) + WORLD_DAY_CYCLE_DURATION_MS) %
    WORLD_DAY_CYCLE_DURATION_MS;
  let phaseStartTime = 0;

  for (const phase of WORLD_DAY_PHASES) {
    const phaseEndTime = phaseStartTime + phase.durationMs;
    if (cycleTime < phaseEndTime) {
      const progress = (cycleTime - phaseStartTime) / phase.durationMs;
      const worldMinutes = THREE.MathUtils.lerp(
        phase.startMinute,
        phase.endMinute,
        progress,
      );
      return worldMinutes % 1440;
    }
    phaseStartTime = phaseEndTime;
  }

  return WORLD_DAY_PHASES[0].startMinute;
}

const KEYFRAMES: AtmosphereKeyframe[] = [
  {
    hour: 0,
    background: '#070b16',
    fog: '#101726',
    sky: '#263456',
    ground: '#080b12',
    sun: '#fff1cf',
    cloud: '#343d52',
    turbidity: 9,
    rayleigh: 0.22,
    mieCoefficient: 0.003,
    mieDirectionalG: 0.74,
    sunIntensity: 0,
    moonIntensity: 0.36,
    ambientIntensity: 0.2,
    cloudOpacity: 0.46,
  },
  {
    hour: 5,
    background: '#111827',
    fog: '#252938',
    sky: '#51607d',
    ground: '#14141a',
    sun: '#ffd4a6',
    cloud: '#525462',
    turbidity: 9,
    rayleigh: 0.7,
    mieCoefficient: 0.007,
    mieDirectionalG: 0.82,
    sunIntensity: 0.06,
    moonIntensity: 0.22,
    ambientIntensity: 0.25,
    cloudOpacity: 0.45,
  },
  {
    hour: 6.45,
    background: '#9d7775',
    fog: '#b08d83',
    sky: '#ddc4b5',
    ground: '#473c36',
    sun: '#ffb36b',
    cloud: '#aa8e8d',
    turbidity: 8.4,
    rayleigh: 2.05,
    mieCoefficient: 0.01,
    mieDirectionalG: 0.84,
    sunIntensity: 1.35,
    moonIntensity: 0.05,
    ambientIntensity: 0.62,
    cloudOpacity: 0.5,
  },
  {
    hour: 8.2,
    background: '#a9cfdd',
    fog: '#b9d4da',
    sky: '#dff4ff',
    ground: '#565247',
    sun: '#fff0cc',
    cloud: '#eef3f4',
    turbidity: 4.2,
    rayleigh: 1.25,
    mieCoefficient: 0.006,
    mieDirectionalG: 0.79,
    sunIntensity: 2.3,
    moonIntensity: 0,
    ambientIntensity: 0.82,
    cloudOpacity: 0.51,
  },
  {
    hour: 16.7,
    background: '#9bc3d1',
    fog: '#b3ced2',
    sky: '#d6f0fa',
    ground: '#554f43',
    sun: '#ffe4b5',
    cloud: '#e6ecec',
    turbidity: 4.8,
    rayleigh: 1.35,
    mieCoefficient: 0.006,
    mieDirectionalG: 0.8,
    sunIntensity: 2.15,
    moonIntensity: 0,
    ambientIntensity: 0.78,
    cloudOpacity: 0.5,
  },
  {
    hour: 18.65,
    background: '#8e6370',
    fog: '#9b7476',
    sky: '#d7a494',
    ground: '#403438',
    sun: '#ff8f55',
    cloud: '#8a7480',
    turbidity: 8.8,
    rayleigh: 2.2,
    mieCoefficient: 0.011,
    mieDirectionalG: 0.85,
    sunIntensity: 1.15,
    moonIntensity: 0.08,
    ambientIntensity: 0.58,
    cloudOpacity: 0.5,
  },
  {
    hour: 20.25,
    background: '#101528',
    fog: '#171d2d',
    sky: '#394566',
    ground: '#0c0d13',
    sun: '#ffc18c',
    cloud: '#475066',
    turbidity: 9,
    rayleigh: 0.48,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.78,
    sunIntensity: 0.03,
    moonIntensity: 0.3,
    ambientIntensity: 0.22,
    cloudOpacity: 0.5,
  },
  {
    hour: 24,
    background: '#070b16',
    fog: '#101726',
    sky: '#263456',
    ground: '#080b12',
    sun: '#fff1cf',
    cloud: '#343d52',
    turbidity: 9,
    rayleigh: 0.22,
    mieCoefficient: 0.003,
    mieDirectionalG: 0.74,
    sunIntensity: 0,
    moonIntensity: 0.36,
    ambientIntensity: 0.2,
    cloudOpacity: 0.46,
  },
];

const COLOR_KEYS = [
  'background',
  'fog',
  'sky',
  'ground',
  'sun',
  'cloud',
] as const;
const NUMBER_KEYS = [
  'turbidity',
  'rayleigh',
  'mieCoefficient',
  'mieDirectionalG',
  'sunIntensity',
  'moonIntensity',
  'ambientIntensity',
  'cloudOpacity',
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(min: number, max: number, value: number) {
  const x = clamp((value - min) / (max - min), 0, 1);
  return x * x * (3 - 2 * x);
}

function sampleAtmosphere(hour: number): AtmosphereSample {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const upperIndex = KEYFRAMES.findIndex(
    (frame) => frame.hour >= normalizedHour,
  );
  const upper = KEYFRAMES[Math.max(1, upperIndex)];
  const lower = KEYFRAMES[Math.max(0, upperIndex - 1)];
  const mix = smoothstep(lower.hour, upper.hour, normalizedHour);
  const sample = {} as AtmosphereSample;

  for (const key of COLOR_KEYS) {
    sample[key] =
      `#${new THREE.Color(lower[key]).lerp(new THREE.Color(upper[key]), mix).getHexString()}`;
  }

  for (const key of NUMBER_KEYS) {
    sample[key] = THREE.MathUtils.lerp(lower[key], upper[key], mix);
  }

  return sample;
}

export function getDayPhase(hour: number): DayPhase {
  const normalizedHour = ((hour % 24) + 24) % 24;
  if (normalizedHour >= 5 && normalizedHour < 8) return 'DAWN';
  if (normalizedHour >= 8 && normalizedHour < 17.25) return 'DAY';
  if (normalizedHour >= 17.25 && normalizedHour < 20.25) return 'DUSK';
  return 'NIGHT';
}

export function formatWorldTime(totalMinutes: number) {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function getHorizonVisibility(hour: number) {
  const angle = ((hour - 6) / 24) * Math.PI * 2;
  return 0.08 + smoothstep(-0.13, 0.18, Math.sin(angle)) * 0.92;
}

export function DynamicAtmosphere({
  hour,
  fogNear = 68,
  fogFar = 245,
  metricWorld = false,
  cityOverview = false,
}: {
  hour: number;
  fogNear?: number;
  fogFar?: number;
  metricWorld?: boolean;
  cityOverview?: boolean;
}) {
  const { invalidate } = useThree();
  const celestialDistance = metricWorld ? 1400 : 180;
  const celestialScale = celestialDistance / 180;
  // Gentle idle sky animation; do not run a permanent 60fps loop or render hidden tabs.
  useEffect(() => {
    if (!metricWorld) return;
    const timer = setInterval(() => {
      if (!document.hidden) invalidate();
    }, 1000 / 15);
    return () => clearInterval(timer);
  }, [metricWorld, invalidate]);
  const cloudGroup = useRef<THREE.Group>(null);
  const skyGroup = useRef<THREE.Group>(null);
  const sun = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Group>(null);
  const sunLight = useRef<THREE.DirectionalLight>(null);
  const moonLight = useRef<THREE.DirectionalLight>(null);
  const frameScratch = useRef({
    sunPosition: new THREE.Vector3(),
    moonPosition: new THREE.Vector3(),
  });
  const palette = useMemo(() => sampleAtmosphere(hour), [hour]);
  const phase = getDayPhase(hour);
  const isNight = phase === 'NIGHT';
  const celestial = useMemo(() => {
    const angle = ((hour - 6) / 24) * Math.PI * 2;
    const direction = new THREE.Vector3(
      Math.cos(angle),
      Math.sin(angle),
      -0.48,
    ).normalize();
    const sunHeight = Math.sin(angle);
    return {
      sunDirection: direction,
      moonDirection: direction.clone().multiplyScalar(-1),
      sunOpacity: smoothstep(-0.06, 0.08, sunHeight),
      moonOpacity: smoothstep(-0.02, -0.19, sunHeight),
    };
  }, [hour]);

  useFrame(({ camera, clock }) => {
    // A 30 km journey must not move the viewer outside an origin-centred sky.
    if (metricWorld) skyGroup.current?.position.copy(camera.position);
    const sunPosition = frameScratch.current.sunPosition
      .copy(camera.position)
      .addScaledVector(celestial.sunDirection, celestialDistance);
    const moonPosition = frameScratch.current.moonPosition
      .copy(camera.position)
      .addScaledVector(celestial.moonDirection, celestialDistance);

    sun.current?.position.copy(sunPosition);
    moon.current?.position.copy(moonPosition);
    sunLight.current?.position
      .copy(celestial.sunDirection)
      .multiplyScalar(metricWorld ? 600 : 90);
    moonLight.current?.position
      .copy(celestial.moonDirection)
      .multiplyScalar(75);

    if (cloudGroup.current) {
      cloudGroup.current.position.x =
        (metricWorld ? camera.position.x : 0) +
        Math.sin(clock.elapsedTime * 0.01) * (metricWorld ? 100 : 16);
      cloudGroup.current.position.y = metricWorld ? 700 : 0;
      cloudGroup.current.position.z =
        (metricWorld ? camera.position.z : 0) +
        Math.cos(clock.elapsedTime * 0.008) * (metricWorld ? 65 : 9);
    }
  });

  return (
    <>
      <color attach="background" args={[palette.background]} />
      <fog attach="fog" args={[palette.fog, fogNear, fogFar]} />
      <group ref={skyGroup}>
        {!isNight && !cityOverview && (
          <Sky
            distance={metricWorld ? 8000 : 450}
            sunPosition={celestial.sunDirection.clone().multiplyScalar(160)}
            turbidity={palette.turbidity}
            rayleigh={palette.rayleigh}
            mieCoefficient={palette.mieCoefficient}
            mieDirectionalG={palette.mieDirectionalG}
          />
        )}
        {isNight && !cityOverview && (
          <Stars
            radius={metricWorld ? 1700 : 180}
            depth={metricWorld ? 300 : 70}
            count={700}
            factor={2.1}
            saturation={0.08}
            fade
            speed={0.18}
          />
        )}
      </group>

      <ambientLight
        intensity={palette.ambientIntensity * (metricWorld ? 0.55 : 1.45)}
        color={palette.sky}
      />
      <hemisphereLight
        intensity={palette.ambientIntensity * (metricWorld ? 0.85 : 1.28)}
        color={palette.sky}
        groundColor={palette.ground}
      />
      <directionalLight
        ref={sunLight}
        castShadow={celestial.sunOpacity > 0.1}
        intensity={palette.sunIntensity}
        color={palette.sun}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={metricWorld ? 1200 : 190}
        shadow-camera-left={metricWorld ? -360 : -70}
        shadow-camera-right={metricWorld ? 360 : 70}
        shadow-camera-top={metricWorld ? 360 : 70}
        shadow-camera-bottom={metricWorld ? -360 : -70}
        shadow-normalBias={0.035}
        shadow-bias={-0.00012}
      />
      <directionalLight
        ref={moonLight}
        intensity={palette.moonIntensity}
        color="#9fb8ff"
      />
      <directionalLight
        position={[42, 48, 58]}
        intensity={palette.ambientIntensity * (metricWorld ? 0.7 : 1.85)}
        color={palette.sky}
      />

      <mesh
        ref={sun}
        visible={!cityOverview}
        renderOrder={-3}
        scale={celestialScale}
      >
        <sphereGeometry args={[2.1, 20, 14]} />
        <meshBasicMaterial
          color={palette.sun}
          fog={false}
          transparent
          opacity={celestial.sunOpacity}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <group
        ref={moon}
        visible={!cityOverview}
        renderOrder={-3}
        scale={celestialScale}
      >
        <mesh>
          <sphereGeometry args={[2.35, 24, 16]} />
          <meshBasicMaterial
            color="#e7edff"
            fog={false}
            transparent
            opacity={celestial.moonOpacity}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[4.7, 20, 14]} />
          <meshBasicMaterial
            color="#8eaeff"
            fog={false}
            transparent
            opacity={celestial.moonOpacity * 0.085}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      </group>

      <Clouds
        visible={!cityOverview}
        ref={cloudGroup}
        position={[0, metricWorld ? 700 : 0, 0]}
        scale={metricWorld ? [8, 3, 8] : [1, 1, 1]}
        texture="/assets/sky/cloud-soft.png"
        limit={24}
        range={24}
        frustumCulled={false}
      >
        <Cloud
          seed={11}
          segments={8}
          position={[-55, 48, -75]}
          bounds={[44, 5, 15]}
          volume={7}
          growth={3}
          speed={0.045}
          fade={30}
          color={palette.cloud}
          opacity={palette.cloudOpacity}
        />
        <Cloud
          seed={29}
          segments={8}
          position={[5, 55, -95]}
          bounds={[52, 6, 18]}
          volume={8}
          growth={3}
          speed={0.035}
          fade={30}
          color={palette.cloud}
          opacity={palette.cloudOpacity}
        />
        <Cloud
          seed={47}
          segments={8}
          position={[65, 44, -65]}
          bounds={[40, 5, 14]}
          volume={6}
          growth={2.5}
          speed={0.05}
          fade={30}
          color={palette.cloud}
          opacity={palette.cloudOpacity}
        />
      </Clouds>
    </>
  );
}
