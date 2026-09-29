'use client';
import { Clone, useGLTF } from '@react-three/drei';
import manifest from '../../public/assets/3d/ampliworld/GC-MALL-FITOUT-001/fitout-manifest.json';

export const MALL_FITOUT_COLLIDERS = manifest.colliders.map(c => ({
  id:c.id,
  min:[c.min[0],c.min[1],c.min[2]+manifest.origin[2]],
  max:[c.max[0],c.max[1],c.max[2]+manifest.origin[2]],
}));
export function MallFitout() {
  const {scene}=useGLTF('/assets/3d/ampliworld/GC-MALL-FITOUT-001/fitout.glb');
  return <group position={[0,0,manifest.origin[2]]}><Clone object={scene} castShadow receiveShadow/></group>;
}
