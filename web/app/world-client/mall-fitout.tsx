'use client';
import { Clone, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { PointLight,SpotLight,Object3D } from 'three';
import manifest from '../../public/assets/3d/ampliworld/GC-MALL-FITOUT-001/fitout-manifest.json';
import spatial from './mall-spatial-plan.json';

export const MALL_FITOUT_COLLIDERS = manifest.colliders.map(c => ({
  id:c.id,
  min:[c.min[0],c.min[1],c.min[2]+manifest.origin[2]],
  max:[c.max[0],c.max[1],c.max[2]+manifest.origin[2]],
}));
export function mallFitoutLocation(x:number,z:number,y:number) {
  const wc=manifest.restrooms.find(r=>Math.abs(r.centerX-x)<7.7&&z+188< -51&&z+188> -73.7&&Math.abs(y-r.floorY)<1);
  if(wc)return `Restrooms · ${wc.level} · Washbasins / private cubicles / baby changing`;
  const room=manifest.boutiques.find(s=>Math.abs(s.centerX-x)<7.7&&z+188>51&&z+188<73.7&&Math.abs(y-s.floorY)<1);
  if(!room)return undefined;
  const level=spatial.floors.findIndex(f=>Math.abs(f.y-room.floorY)<.01)+1;
  return `${room.label} · L${level} · ${room.theme}`;
}
export function MallFitout() {
  const {scene}=useGLTF('/assets/3d/ampliworld/GC-MALL-FITOUT-001/fitout.glb','/assets/decoders/draco/');
  return <group position={[0,0,manifest.origin[2]]}>
    <Clone object={scene} castShadow receiveShadow/>
    <BoutiqueLighting/>
  </group>;
}

/** Two unshadowed local fill lights, reused by the nearest shop only. */
function BoutiqueLighting() {
  const first=useRef<PointLight>(null),second=useRef<PointLight>(null);
  const key=useRef<SpotLight>(null),target=useRef<Object3D>(null);
  useFrame(({camera})=>{
    let nearest=manifest.boutiques[0],distance=Infinity;
    for(const shop of manifest.boutiques){
      const d=Math.hypot(camera.position.x-shop.centerX,camera.position.z-(manifest.origin[2]+63),(camera.position.y-shop.floorY-1.6)*2);
      if(d<distance){distance=d;nearest=shop;}
    }
    const localZ=camera.position.z-manifest.origin[2];
    const wc=manifest.restrooms.find(r=>Math.abs(camera.position.x-r.centerX)<9&&localZ< -49&&localZ> -75&&camera.position.y>r.floorY&&camera.position.y<r.floorY+3.7);
    const roomHeight=spatial.floors.find(f=>f.y===nearest.floorY)?.clearHeight??6;
    const l2=spatial.floors[1];
    const inL2=camera.position.y>l2.y+.1&&camera.position.y<l2.y+l2.clearHeight&&Math.abs(camera.position.x)<109&&Math.abs(localZ)<49;
    const inShop=Math.abs(camera.position.x-nearest.centerX)<10&&localZ>47&&localZ<77&&camera.position.y>nearest.floorY-.3&&camera.position.y<nearest.floorY+roomHeight;
    // Fixed fixture anchors, never a flashlight following the viewer.
    const west=Math.abs(camera.position.x+53)<9&&Math.abs(localZ)<34;
    const anchorX=west?-53:Math.max(-84,Math.min(84,Math.round(camera.position.x/42)*42));
    const anchorZ=west?Math.round(localZ/25)*25:(localZ<0?-43:43);
    if(first.current){
      first.current.visible=inL2||inShop||!!wc;
      first.current.position.set(wc?wc.centerX:inL2?anchorX:nearest.centerX-3,wc?wc.floorY+3.2:inL2?l2.y+4.7:nearest.floorY+3.6,wc?-57:inL2?anchorZ:57);
      first.current.intensity=inL2?30:48;
      first.current.color.set(wc?'#fff6eb':inL2?'#fff1df':nearest.light);
    }
    if(second.current){
      second.current.visible=inShop||!!wc;
      second.current.position.set(wc?wc.centerX:nearest.centerX+3,wc?wc.floorY+3.2:nearest.floorY+3.6,wc?-67:66);
      second.current.color.set(wc?'#fff6eb':nearest.light);
      second.current.intensity=38;
    }
    if(key.current&&target.current){
      key.current.visible=inShop;
      key.current.position.set(nearest.centerX,nearest.floorY+roomHeight-.4,62);
      target.current.position.set(nearest.centerX,nearest.floorY,63);
      key.current.target=target.current;
      key.current.color.set(nearest.light);
    }
  });
  return <><pointLight ref={first} color="#fff1df" intensity={22} distance={15} decay={2}/>
    <pointLight ref={second} color="#fff6eb" intensity={20} distance={15} decay={2}/>
    <object3D ref={target}/>
    <spotLight ref={key} intensity={150} distance={18} angle={1.15} penumbra={.7} decay={2} castShadow shadow-mapSize-width={512} shadow-mapSize-height={512} shadow-bias={-.0001} shadow-normalBias={.018}/></>;
}
