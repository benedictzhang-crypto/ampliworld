'use client';

import { Clone, useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CITY_INFRA, cityGroundHeight } from './city-surface';
import { METRO_DWELL_SECONDS, METRO_ELEVATED_PILOT } from './metro-network';

const ASSET = '/assets/3d/ampliworld/GC-METRO-001/train.glb';
const DECK_Y = 10.85;
const RAIL_Y = 11.30;
const TRACK_OFFSET = 7.5;
const STEEL = new THREE.MeshStandardMaterial({ color: '#8999a2', metalness: .78, roughness: .33 });
const CONCRETE = new THREE.MeshStandardMaterial({ color: '#b8bfc2', roughness: .85 });
const GRAPHITE = new THREE.MeshStandardMaterial({ color: '#323b40', metalness: .25, roughness: .8 });
const BOX = new THREE.BoxGeometry(1, 1, 1);
const UP = new THREE.Vector3(0, 1, 0);
const scratch = new THREE.Object3D();

function makeRoute() {
  return new THREE.CatmullRomCurve3(
    METRO_ELEVATED_PILOT.map(point => new THREE.Vector3(point.x, RAIL_Y, point.z)),
    false, 'centripetal',
  );
}

function place(instance: THREE.InstancedMesh | null, transforms: readonly {
  x: number; y: number; z: number; heading: number; sx: number; sy: number; sz: number;
}[]) {
  if (!instance) return;
  transforms.forEach((t, i) => {
    scratch.position.set(t.x, t.y, t.z);
    scratch.quaternion.setFromAxisAngle(UP, t.heading);
    scratch.scale.set(t.sx, t.sy, t.sz);
    scratch.updateMatrix();
    instance.setMatrixAt(i, scratch.matrix);
  });
  instance.instanceMatrix.needsUpdate = true;
  instance.computeBoundingSphere();
}

function ViaductStructure({ route }: { route: THREE.CatmullRomCurve3 }) {
  const deckRef = useRef<THREE.InstancedMesh>(null);
  const railRef = useRef<THREE.InstancedMesh>(null);
  const sleeperRef = useRef<THREE.InstancedMesh>(null);
  const pierRef = useRef<THREE.InstancedMesh>(null);
  const pieces = useMemo(() => {
    const length = route.getLength();
    const deck = [], rails = [], sleepers = [], piers = [];
    const segmentCount = Math.ceil(length / 24);
    for (let i = 0; i < segmentCount; i++) {
      const t = (i + .5) / segmentCount;
      const point = route.getPointAt(t);
      const tangent = route.getTangentAt(t);
      const heading = -Math.atan2(tangent.z, tangent.x);
      // Existing platforms already carry their own track geometry.
      if (t * length < 29 || (1 - t) * length < 29) continue;
      deck.push({ x: point.x, y: DECK_Y, z: point.z, heading, sx: length / segmentCount + .5, sy: .75, sz: 18.2 });
      for (const side of [-1, 1]) for (const gauge of [-.46, .46]) {
        const offset = side * TRACK_OFFSET + gauge;
        rails.push({ x: point.x + Math.sin(heading) * offset, y: RAIL_Y, z: point.z + Math.cos(heading) * offset,
          heading, sx: length / segmentCount + .5, sy: .17, sz: .12 });
      }
    }
    const sleeperCount = Math.floor(length / 9);
    for (let i = 4; i < sleeperCount - 4; i++) {
      const point = route.getPointAt((i + .5) / sleeperCount);
      const tangent = route.getTangentAt((i + .5) / sleeperCount);
      const heading = -Math.atan2(tangent.z, tangent.x);
      for (const side of [-1, 1]) {
        const offset = side * TRACK_OFFSET;
        sleepers.push({ x: point.x + Math.sin(heading) * offset, y: RAIL_Y - .2,
          z: point.z + Math.cos(heading) * offset, heading, sx: .42, sy: .24, sz: 2.8 });
      }
    }
    for (let d = 72; d < length - 60; d += 96) {
      const point = route.getPointAt(d / length);
      // Keep the carriageway and sidewalks clear beneath the elevated rail.
      if (CITY_INFRA.roadrects.some(road => point.x >= road.min[0] - 3 && point.x <= road.max[0] + 3 &&
        point.z >= road.min[1] - 3 && point.z <= road.max[1] + 3)) continue;
      const ground = cityGroundHeight(point.x, point.z);
      const height = Math.max(1, DECK_Y - .4 - ground);
      piers.push({ x: point.x, y: ground + height / 2, z: point.z, heading: 0,
        sx: 1.9, sy: height, sz: 2.1 });
    }
    return { deck, rails, sleepers, piers };
  }, [route]);

  useEffect(() => {
    place(deckRef.current, pieces.deck);
    place(railRef.current, pieces.rails);
    place(sleeperRef.current, pieces.sleepers);
    place(pierRef.current, pieces.piers);
  }, [pieces]);

  return <group name="M04-M05 continuous elevated metro">
    <instancedMesh ref={deckRef} args={[BOX, CONCRETE, pieces.deck.length]} castShadow receiveShadow />
    <instancedMesh ref={railRef} args={[BOX, STEEL, pieces.rails.length]} castShadow />
    <instancedMesh ref={sleeperRef} args={[BOX, GRAPHITE, pieces.sleepers.length]} castShadow />
    <instancedMesh ref={pierRef} args={[BOX, CONCRETE, pieces.piers.length]} castShadow receiveShadow />
  </group>;
}

function RunningTrain({ route, lane, phase }: {
  route: THREE.CatmullRomCurve3; lane: 1 | -1; phase: number;
}) {
  const { scene } = useGLTF(ASSET);
  const train = useRef<THREE.Group>(null);
  const { invalidate } = useThree();
  const totalLength = useMemo(() => route.getLength(), [route]);
  useFrame(({ clock }) => {
    if (!train.current) return;
    const travel = totalLength / 24;
    const cycle = travel * 2 + METRO_DWELL_SECONDS * 2;
    const elapsed = (clock.getElapsedTime() + phase) % cycle;
    const outward = elapsed < METRO_DWELL_SECONDS + travel;
    const fraction = outward
      ? Math.max(0, Math.min(1, (elapsed - METRO_DWELL_SECONDS) / travel))
      : 1 - Math.max(0, Math.min(1, (elapsed - METRO_DWELL_SECONDS * 2 - travel) / travel));
    const point = route.getPointAt(fraction);
    const tangent = route.getTangentAt(fraction);
    const heading = -Math.atan2(tangent.z, tangent.x) + (outward ? 0 : Math.PI);
    train.current.position.set(point.x + Math.sin(heading) * lane * TRACK_OFFSET, RAIL_Y, point.z + Math.cos(heading) * lane * TRACK_OFFSET);
    train.current.rotation.y = heading;
    invalidate();
  });
  return <group ref={train} name="animated metro train, visual only"><Clone object={scene} castShadow receiveShadow /></group>;
}

/** The pilot viaduct is physically modelled but train boarding is not yet implemented. */
export function MetroViaduct({ x, z }: { x: number; z: number }) {
  const route = useMemo(makeRoute, []);
  if (Math.hypot(x - 4300, z - 3700) > 3200) return null;
  return <group name="metro-pilot-M04-M05">
    <ViaductStructure route={route} />
    <RunningTrain route={route} lane={1} phase={0} />
    <RunningTrain route={route} lane={1} phase={route.getLength() / 24 + METRO_DWELL_SECONDS} />
  </group>;
}
