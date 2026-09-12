'use client';

import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  PERSISTENT_INFRASTRUCTURE_DECKS,
  PERSISTENT_INFRASTRUCTURE_PIERS,
  type PersistentInfrastructureDeck,
  type PersistentInfrastructurePier,
} from './persistent-infrastructure-registry';

function InstancedShellBoxes({
  instances,
}: {
  instances: readonly PersistentInfrastructureDeck[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    const color = new THREE.Color();
    instances.forEach((instance, index) => {
      transform.position.set(...instance.position);
      transform.scale.set(...instance.scale);
      transform.rotation.set(instance.rotationX, instance.rotationY, 0);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, color.set(instance.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instances]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, instances.length]}
      receiveShadow
      userData={{ lod: 'PERSISTENT_INFRASTRUCTURE_SHELL' }}
    >
      <boxGeometry />
      <meshStandardMaterial
        color="#ffffff"
        vertexColors
        roughness={0.82}
        metalness={0.12}
      />
    </instancedMesh>
  );
}

function InstancedShellPiers({
  instances,
}: {
  instances: readonly PersistentInfrastructurePier[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    const color = new THREE.Color();
    instances.forEach((instance, index) => {
      transform.position.set(...instance.position);
      transform.scale.set(...instance.scale);
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, color.set(instance.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [instances]);
  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, instances.length]}
      userData={{ lod: 'PERSISTENT_INFRASTRUCTURE_SUPPORT_SHELL' }}
    >
      <cylinderGeometry args={[1, 1, 1, 7]} />
      <meshStandardMaterial
        color="#ffffff"
        vertexColors
        roughness={0.9}
        metalness={0.06}
      />
    </instancedMesh>
  );
}

/** Two draw calls keep all metropolitan linear landmarks legible at distance. */
export function PersistentInfrastructureShells() {
  const boxes = useMemo(() => PERSISTENT_INFRASTRUCTURE_DECKS, []);
  const piers = useMemo(() => PERSISTENT_INFRASTRUCTURE_PIERS, []);
  return (
    <group
      name="Persistent metropolitan infrastructure shells"
      userData={{ persistent: true, drawCalls: 2 }}
    >
      <InstancedShellBoxes instances={boxes} />
      <InstancedShellPiers instances={piers} />
    </group>
  );
}
