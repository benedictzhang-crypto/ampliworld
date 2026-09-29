'use client';
import { Clone, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { PointLight } from 'three';
import manifest from '../../public/assets/3d/ampliworld/GC-MALL-FITOUT-001/fitout-manifest.json';

export const MALL_FITOUT_COLLIDERS = manifest.colliders.map(c => ({
  id:c.id,
  min:[c.min[0],c.min[1],c.min[2]+manifest.origin[2]],
  max:[c.max[0],c.max[1],c.max[2]+manifest.origin[2]],
}));
export function MallFitout() {
  const {scene}=useGLTF('/assets/3d/ampliworld/GC-MALL-FITOUT-001/fitout.glb');
  return <group position={[0,0,manifest.origin[2]]}>
    <Clone object={scene} castShadow receiveShadow/>
    <BoutiqueLighting/>
  </group>;
}

/** Two unshadowed local fill lights, reused by the nearest shop only. */
function BoutiqueLighting() {
  const first=useRef<PointLight>(null),second=useRef<PointLight>(null);
  useFrame(({camera})=>{
    let nearest=0,distance=Infinity;
    for(const shop of manifest.boutiques){
      const d=Math.hypot(camera.position.x-shop.centerX,camera.position.z-(manifest.origin[2]+63));
      if(d<distance){distance=d;nearest=shop.centerX;}
    }
    const localZ=camera.position.z-manifest.origin[2];
    const inL2=camera.position.y>6.6&&camera.position.y<10.9&&Math.abs(camera.position.x)<109&&Math.abs(localZ)<49;
    const inShop=distance<19&&camera.position.y>-.5&&camera.position.y<5.8;
    // Fixed fixture anchors, never a flashlight following the viewer.
    const west=Math.abs(camera.position.x+53)<9&&Math.abs(localZ)<34;
    const anchorX=west?-53:Math.max(-84,Math.min(84,Math.round(camera.position.x/42)*42));
    const anchorZ=west?Math.round(localZ/25)*25:(localZ<0?-43:43);
    if(first.current){
      first.current.visible=inL2||inShop;
      first.current.position.set(inL2?anchorX:nearest-3,inL2?9.5:3.5,inL2?anchorZ:57);
      first.current.intensity=inL2?30:22;
    }
    if(second.current){
      second.current.visible=inShop;
      second.current.position.set(nearest+3,3.5,69);
    }
  });
  return <><pointLight ref={first} color="#fff1df" intensity={22} distance={15} decay={2}/>
    <pointLight ref={second} color="#fff6eb" intensity={20} distance={15} decay={2}/></>;
}
