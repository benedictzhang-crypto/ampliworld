'use client';
import {useEffect,useRef} from 'react';
import {Text} from '@react-three/drei';
import {Color,InstancedMesh,Object3D} from 'three';
import {SERVICE_SITES} from '../life-sim/city-service-plan';

export const STREET_SERVICE_SITES=SERVICE_SITES.filter(s=>s.placement==='street');
export const CITY_SERVICE_COLLIDERS=STREET_SERVICE_SITES.map(s=>{
  const halfWidth=s.type==='police'?15:s.type==='bank'||s.type==='nightclub'?12:8;
  const height=['school','hotel','community','police','fire'].includes(s.type)?11:6;
  return {id:`${s.id}/building`,min:[s.x-halfWidth,0,s.z-6] as [number,number,number],max:[s.x+halfWidth,height,s.z+6] as [number,number,number]};
});

export function CityServiceBuildings(){
  const bodies=useRef<InstancedMesh>(null),glass=useRef<InstancedMesh>(null),roofs=useRef<InstancedMesh>(null),paving=useRef<InstancedMesh>(null);
  useEffect(()=>{const o=new Object3D(),c=new Color();STREET_SERVICE_SITES.forEach((s,i)=>{
    const tall=['school','hotel','community','police','fire'].includes(s.type),sides=s.type==='police'?1.8:s.type==='bank'||s.type==='nightclub'?1.45:['auto-repair','fuel'].includes(s.type)?1.5:1;
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
    {STREET_SERVICE_SITES.filter(s=>s.type==='gas-station').map(s=><group key={s.id} position={[s.x,0,s.z+17]}>
      <mesh position={[0,4,0]} castShadow><boxGeometry args={[22,.6,10]}/><meshStandardMaterial color="#e0ded4" metalness={.35}/></mesh>
      {[-7,0,7].map(x=><group key={x} position={[x,0,0]}><mesh position={[0,1,0]}><boxGeometry args={[1.1,2,1.3]}/><meshStandardMaterial color="#4d5960"/></mesh><mesh position={[0,2.2,0]}><boxGeometry args={[1.3,.45,1.5]}/><meshStandardMaterial color="#d9a84a" emissive="#76551d" emissiveIntensity={.25}/></mesh></group>)}
      {[-10,10].map(x=><mesh key={x} position={[x,2,0]}><boxGeometry args={[.45,4,.45]}/><meshStandardMaterial color="#777b79"/></mesh>)}
    </group>)}
    {STREET_SERVICE_SITES.filter(s=>s.type==='ev-charging').map(s=><group key={s.id} position={[s.x,0,s.z+16]}>
      <mesh position={[0,.06,0]} receiveShadow><boxGeometry args={[24,.12,9]}/><meshStandardMaterial color="#555c5c"/></mesh>
      {[-9,-3,3,9].map(x=><group key={x} position={[x,0,-1]}><mesh position={[0,1.25,0]}><boxGeometry args={[.65,2.5,.55]}/><meshStandardMaterial color="#d8e3df"/></mesh><mesh position={[0,1.45,.3]}><boxGeometry args={[.36,.7,.08]}/><meshStandardMaterial color="#48c996" emissive="#48c996" emissiveIntensity={.45}/></mesh></group>)}
    </group>)}
    {STREET_SERVICE_SITES.filter(s=>s.type==='bank').map((s,i)=><group key={s.id} position={[s.x,0,s.z]}>
      <mesh position={[0,3.1,6.18]}><boxGeometry args={[22,.9,.28]}/><meshStandardMaterial color={i<5?'#af9157':'#557a8f'} metalness={.62} roughness={.3}/></mesh>
      {[-9,9].map(x=><mesh key={x} position={[x,2.5,6.35]} castShadow><boxGeometry args={[1.15,5,1.15]}/><meshStandardMaterial color="#d9d4c8" roughness={.55}/></mesh>)}
      {[-3.2,3.2].map(x=><group key={x} position={[x,0,6.45]}><mesh position={[0,1.25,0]}><boxGeometry args={[1.6,2.5,.55]}/><meshStandardMaterial color="#343c41"/></mesh><mesh position={[0,1.55,.3]}><boxGeometry args={[1.05,.65,.06]}/><meshStandardMaterial color="#68afbd" emissive="#316773" emissiveIntensity={.45}/></mesh></group>)}
      <Text position={[0,4.45,6.5]} fontSize={.72} color="#f5edda" anchorX="center">{s.name}</Text>
    </group>)}
    {STREET_SERVICE_SITES.filter(s=>s.type==='dry-cleaning'||s.type==='laundromat').map(s=><group key={s.id} position={[s.x,0,s.z]}>
      <mesh position={[0,4.7,6.38]} castShadow><boxGeometry args={[15.5,.55,2.5]}/><meshStandardMaterial color={s.type==='dry-cleaning'?'#9d765c':'#4e8391'} roughness={.48}/></mesh>
      {s.type==='laundromat'&&[-5,-2.5,0,2.5,5].map(x=><group key={x} position={[x,2.25,6.17]}><mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.82,.82,.22,20]}/><meshStandardMaterial color="#e7e6df" metalness={.25}/></mesh><mesh position={[0,0,.13]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.52,.52,.08,20]}/><meshStandardMaterial color="#6a8992" roughness={.18}/></mesh></group>)}
      {s.type==='dry-cleaning'&&[-4.5,0,4.5].map(x=><group key={x} position={[x,2.1,6.17]}><mesh><boxGeometry args={[3.4,2.9,.16]}/><meshPhysicalMaterial color="#83a1a2" transparent opacity={.48}/></mesh><mesh position={[0,.75,.11]}><boxGeometry args={[2.5,.08,.08]}/><meshStandardMaterial color="#d3b17a"/></mesh></group>)}
      <Text position={[0,5.05,7.72]} fontSize={.58} color="#f7f0df" anchorX="center">{s.name}</Text>
    </group>)}
    {STREET_SERVICE_SITES.filter(s=>s.type==='bar'||s.type==='nightclub').map(s=><group key={s.id} position={[s.x,0,s.z]}>
      <mesh position={[0,4.85,6.45]} castShadow><boxGeometry args={[s.type==='nightclub'?22:14,.65,2.8]}/><meshStandardMaterial color={s.type==='nightclub'?'#302744':'#6f4938'} metalness={.38}/></mesh>
      <mesh position={[0,2.4,6.18]}><boxGeometry args={[s.type==='nightclub'?14:9,3.5,.12]}/><meshPhysicalMaterial color="#4a6670" transparent opacity={.42} roughness={.12}/></mesh>
      <mesh position={[0,3.8,6.38]}><boxGeometry args={[s.type==='nightclub'?10:7,.22,.18]}/><meshStandardMaterial color={s.type==='nightclub'?'#bb65ef':'#dcad69'} emissive={s.type==='nightclub'?'#702695':'#7a501d'} emissiveIntensity={1.25}/></mesh>
      <Text position={[0,5.2,7.88]} fontSize={.62} color={s.type==='nightclub'?'#e8c6ff':'#ffe5b5'} anchorX="center">{s.name}</Text>
    </group>)}
    {STREET_SERVICE_SITES.filter(s=>s.type==='police').map(s=><group key={s.id} position={[s.x,0,s.z]}>
      <mesh position={[0,8.4,6.38]}><boxGeometry args={[25,.8,.35]}/><meshStandardMaterial color="#466b83" metalness={.48}/></mesh>
      <Text position={[0,8.45,6.62]} fontSize={.82} color="#f2f4f0" anchorX="center">{s.name}</Text>
      {[-8,8].map((x,i)=><group key={x} position={[x,.65,12]}>
        <mesh position={[0,.55,0]} castShadow><boxGeometry args={[5.2,1.1,2.35]}/><meshStandardMaterial color="#e8e9e5"/></mesh>
        <mesh position={[0,1.12,0]}><boxGeometry args={[2.6,.55,2.1]}/><meshStandardMaterial color="#416681"/></mesh>
        <mesh position={[0,1.48,0]}><boxGeometry args={[.9,.12,.35]}/><meshStandardMaterial color={i?'#d65353':'#4c7ad4'} emissive={i?'#d65353':'#4c7ad4'} emissiveIntensity={.7}/></mesh>
        {[-1.65,1.65].map(wx=><mesh key={wx} position={[wx,0,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.45,.45,.32,14]}/><meshStandardMaterial color="#202327"/></mesh>)}
      </group>)}
      <mesh position={[0,.7,11.8]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[5,2.6]}/><meshStandardMaterial color="#d7dfdd"/></mesh>
    </group>)}
  </group>;
}
