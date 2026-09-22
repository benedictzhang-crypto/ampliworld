'use client';
import {useEffect,useRef} from 'react';
import {Color,InstancedMesh,Object3D} from 'three';
import {SERVICE_SITES} from '../life-sim/city-service-plan';

export const STREET_SERVICE_SITES=SERVICE_SITES.filter(s=>s.placement==='street');
export const CITY_SERVICE_COLLIDERS=STREET_SERVICE_SITES.map(s=>({id:`${s.id}/building`,min:[s.x-8,0,s.z-6] as [number,number,number],max:[s.x+8,6,s.z+6] as [number,number,number]}));

export function CityServiceBuildings(){
  const bodies=useRef<InstancedMesh>(null),glass=useRef<InstancedMesh>(null),roofs=useRef<InstancedMesh>(null),paving=useRef<InstancedMesh>(null);
  useEffect(()=>{const o=new Object3D(),c=new Color();STREET_SERVICE_SITES.forEach((s,i)=>{
    const tall=['school','hotel','community','police','fire'].includes(s.type),sides=['auto-repair','fuel'].includes(s.type)?1.5:1;
    o.position.set(s.x,tall?5:2.8,s.z);o.scale.set(sides,tall?1.8:1,1);o.updateMatrix();bodies.current!.setMatrixAt(i,o.matrix);bodies.current!.setColorAt(i,c.setHSL((i*.097)%1,.16,.58));
    o.position.set(s.x,tall?4.2:2.4,s.z+6.04);o.scale.set(sides,.75,1);o.updateMatrix();glass.current!.setMatrixAt(i,o.matrix);
    o.position.set(s.x,tall?10.2:5.8,s.z);o.scale.set(sides,1,1);o.updateMatrix();roofs.current!.setMatrixAt(i,o.matrix);
    o.position.set(s.x,.04,s.z+10);o.scale.set(sides,1,1);o.updateMatrix();paving.current!.setMatrixAt(i,o.matrix);
  });for(const r of [bodies,glass,roofs,paving]){r.current!.instanceMatrix.needsUpdate=true;if(r.current!.instanceColor)r.current!.instanceColor.needsUpdate=true;}},[]);
  const count=STREET_SERVICE_SITES.length;
  return <group name="Physical street services">
    <instancedMesh ref={paving} args={[undefined,undefined,count]} receiveShadow><boxGeometry args={[22,.08,9]}/><meshStandardMaterial color="#858983" roughness={.96}/></instancedMesh>
    <instancedMesh ref={bodies} args={[undefined,undefined,count]} castShadow receiveShadow><boxGeometry args={[16,5.6,12]}/><meshStandardMaterial roughness={.78}/></instancedMesh>
    <instancedMesh ref={glass} args={[undefined,undefined,count]}><boxGeometry args={[11,3.1,.12]}/><meshPhysicalMaterial color="#759093" transparent opacity={.58} roughness={.18}/></instancedMesh>
    <instancedMesh ref={roofs} args={[undefined,undefined,count]} castShadow><boxGeometry args={[17,.35,13]}/><meshStandardMaterial color="#605d57" metalness={.25}/></instancedMesh>
  </group>;
}
