'use client';
import {Clone,useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useRef} from 'react';
import type {PointLight} from 'three';
import {useMallMaterials} from './mall-materials';
import manifest from '../../public/assets/3d/ampliworld/GC-MALL-TENANTS-001/tenants-manifest.json';
import spatial from './mall-spatial-plan.json';
export const MALL_TENANT_COLLIDERS=manifest.colliders.map(c=>({id:c.id,min:[c.min[0],c.min[1],c.min[2]-188],max:[c.max[0],c.max[1],c.max[2]-188]}));
export function mallTenantLocation(x:number,z:number,y:number){
  return manifest.shops.find(s=>Math.abs(x-s.x)<s.w/2&&Math.abs(z+188-s.z)<s.d/2&&Math.abs(y-s.floorY)<2)?.name;
}
export function MallTenants(){
  const {scene}=useGLTF('/assets/3d/ampliworld/GC-MALL-TENANTS-001/tenants.glb','/assets/decoders/draco/');
  const display=useMallMaterials(scene);
  const a=useRef<PointLight>(null),b=useRef<PointLight>(null);
  useFrame(({camera})=>{
    if(!a.current||!b.current)return;
    const x=camera.position.x,z=camera.position.z+188,y=camera.position.y;
    const level=spatial.floors.find(f=>y>f.y&&y<f.y+f.clearHeight);
    const basement=y>-7.2&&y<-.4;
    const visible=Math.abs(x)<190&&Math.abs(z)<85&&(!!level||basement);
    a.current.visible=b.current.visible=visible;
    if(!visible)return;
    const fy=basement?-7.2:level!.y;
    // Reuse two fixed grid fixture anchors; never add a light per shelf or shop.
    const ax=Math.round(x/12)*12,az=Math.round(z/12)*12;
    a.current.position.set(ax,fy+4.4,az);b.current.position.set(ax+(x>0?-9:9),fy+4.4,az+8);
  });
  return <group position={[0,0,-188]}><Clone object={display} castShadow receiveShadow/>
    <pointLight ref={a} color="#ffecd2" intensity={90} distance={24} decay={2}/>
    <pointLight ref={b} color="#fff5e4" intensity={65} distance={24} decay={2}/>
  </group>;
}
