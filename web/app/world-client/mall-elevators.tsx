'use client';
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group } from 'three';
import { MALL_LEVELS, LIFT_GROUPS, stepMallLift, type MallLift, type LiftCarrier } from './mall-circulation';

export function MallElevators({cars,carrier}:{cars:MallLift[];carrier:React.RefObject<LiftCarrier>}) {
  const moving = useRef<(Group|null)[]>([]), doors=useRef<(Group|null)[]>([]);
  const {invalidate}=useThree();
  useFrame((_,dt)=>{
    let busy=false;
    cars.forEach((c,i)=>{
      stepMallLift(c,dt);
      const body=moving.current[i];if(body)body.position.y=c.y;
      MALL_LEVELS.forEach((l,j)=>{
        const door=doors.current[i*MALL_LEVELS.length+j];
        if(door) {
          const open=Math.abs(c.y-l.y)<.01?c.door:0;
          door.children.forEach((leaf,k)=>{leaf.position.x=(k===0?-1:1)*(.68+1.36*open)});
        }
      });
      if(carrier.current.carId===c.id) {
        carrier.current.y=c.y;
        carrier.current.active=c.phase!=='idle';
        if(c.phase==='idle')carrier.current.carId=null;
      }
      busy ||= c.phase!=='idle';
    });
    if(busy)invalidate();
  });
  return <group>
    {LIFT_GROUPS.map(g=><group key={g.id} position={[g.x,0,g.z-188]}>
      {[-6,-3,0,3,6].map(x=><mesh key={x} position={[x,5,0]}><boxGeometry args={[.16,62,5]}/><meshStandardMaterial color="#899b9e" metalness={.7} roughness={.24}/></mesh>)}
      <mesh position={[0,5,-g.front*2.48]}><boxGeometry args={[12,62,.12]}/><meshStandardMaterial color="#add6dc" transparent opacity={.22} depthWrite={false}/></mesh>
      {MALL_LEVELS.map((l,i)=><group key={l.id} position={[0,l.y,g.front*2.45]}>
        <mesh position={[0,3.1+((MALL_LEVELS[i+1]?.y??36)-l.y-3.1)/2,0]}><boxGeometry args={[12,(MALL_LEVELS[i+1]?.y??36)-l.y-3.1,.2]}/><meshStandardMaterial color="#d9d7cf"/></mesh>
        <mesh position={[0,3.2,g.front*.16]}><boxGeometry args={[11.5,.13,.12]}/><meshStandardMaterial color={g.color} emissive={g.color} emissiveIntensity={.8}/></mesh>
      </group>)}
    </group>)}
    {cars.map((c,i)=><group key={c.id}>
      <group ref={o=>{moving.current[i]=o}} position={[c.x,c.y,c.z]}>
        <mesh position={[0,-.06,0]}><boxGeometry args={[2.7,.12,4.7]}/><meshStandardMaterial color="#dad3c4"/></mesh>
        <mesh position={[0,3.08,0]}><boxGeometry args={[2.7,.12,4.7]}/><meshStandardMaterial color="#fff2d6" emissive="#fff2d6" emissiveIntensity={.8}/></mesh>
        <mesh position={[0,1.5,-c.group.front*2.25]}><boxGeometry args={[2.6,3,.12]}/><meshStandardMaterial color="#8aadb4" metalness={.75} roughness={.18}/></mesh>
      </group>
      {MALL_LEVELS.map((l,j)=><group key={l.id} ref={o=>{doors.current[i*MALL_LEVELS.length+j]=o}} position={[c.x,l.y+1.55,c.z+c.group.front*2.45]}>
        {[-1,1].map(s=><mesh key={s} position={[s*.68,0,0]}><boxGeometry args={[1.35,3.1,.14]}/><meshStandardMaterial color="#99aeb3" metalness={.75} roughness={.25}/></mesh>)}
      </group>)}
    </group>)}
  </group>;
}
