'use client';
import {Clone,useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type {PointLight} from 'three';
import manifest from '../../public/assets/3d/ampliworld/GC-MALL-LEISURE-001/leisure-manifest.json';
export const MALL_LEISURE_COLLIDERS=manifest.colliders.map(c=>({id:c.id,min:[c.min[0],c.min[1],c.min[2]-188],max:[c.max[0],c.max[1],c.max[2]-188]}));
export function mallLeisureLocation(x:number,z:number,y:number){
  const hall=manifest.cinema.halls.find(h=>x>=h.min[0]&&x<=h.max[0]&&z+188>=h.min[2]&&z+188<=h.max[2]&&y>=h.min[1]-.2&&y<h.max[1]);
  if(hall)return `${hall.name} · L6 · ${hall.seats} seats · Concept auditorium`;
  if(x>38&&x<96&&z+188>51&&z+188<74&&Math.abs(y-manifest.arcade.entry[1])<1)return 'Aurea Playlab · L6 · 24 modeled arcade cabinets';
}
export function MallLeisure(){
  const {scene}=useGLTF('/assets/3d/ampliworld/GC-MALL-LEISURE-001/leisure.glb','/assets/decoders/draco/');
  const light=useRef<PointLight>(null);
  useFrame(({camera})=>{
    if(!light.current)return;
    const x=camera.position.x,z=camera.position.z+188,y=camera.position.y;
    const h=manifest.cinema.halls.find(h=>x>h.min[0]&&x<h.max[0]&&z>h.min[2]&&z<h.max[2]&&y>h.min[1]&&y<h.max[1]);
    const arcade=x>38&&x<96&&z>50&&z<75&&Math.abs(y-manifest.arcade.entry[1]-2)<7;
    light.current.visible=!!h||arcade;
    light.current.position.set(h?-150:Math.round(x/10)*10,h?h.min[1]+8:manifest.arcade.entry[1]+5.5,h?(h.min[2]+h.max[2])/2:62);
    light.current.intensity=h?100:70;
  });
  return <group position={[0,0,-188]}><Clone object={scene} castShadow receiveShadow/><pointLight ref={light} color="#d7eaff" intensity={70} distance={45} decay={2}/></group>;
}
