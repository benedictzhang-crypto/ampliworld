'use client';
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group } from 'three';
import spatial from './mall-spatial-plan.json';
import { MALL_LEVELS, LIFT_GROUPS, stepMallLift, type MallLift, type LiftCarrier } from './mall-circulation';

export function MallElevators({cars,carrier}:{cars:MallLift[];carrier:React.RefObject<LiftCarrier>}) {
  const moving = useRef<(Group|null)[]>([]), doors=useRef<(Group|null)[]>([]);
  const {invalidate}=useThree();
  useFrame((_,dt)=>{
    let busy=false;
    cars.forEach((c,i)=>{
      stepMallLift(c,dt);
      const body=moving.current[i];if(body)body.position.y=c.y;
      c.levels.forEach((l,j)=>{
        const door=doors.current[i*MALL_LEVELS.length+j];
        if(door) {
          const open=Math.abs(c.y-l.y)<.01?c.door:0;
          door.children.forEach((leaf,k)=>{leaf.position.x=(k===0?-1:1)*(c.width/4+c.width/2*open)});
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
      {[-6,-3,0,3,6].map(x=><mesh key={x} position={[x,(spatial.shaftTop+spatial.shaftBottom)/2,0]}><boxGeometry args={[.16,spatial.shaftTop-spatial.shaftBottom,5]}/><meshStandardMaterial color="#899b9e" metalness={.7} roughness={.24}/></mesh>)}
      <mesh position={[0,(spatial.shaftTop+spatial.shaftBottom)/2,-g.front*2.48]}><boxGeometry args={[12,spatial.shaftTop-spatial.shaftBottom,.12]}/><meshStandardMaterial color="#add6dc" transparent opacity={.22} depthWrite={false}/></mesh>
      {MALL_LEVELS.map((l,i)=><group key={l.id} position={[0,l.y,g.front*2.45]}>
        <mesh position={[0,3.1+((MALL_LEVELS[i+1]?.y??spatial.shaftTop)-l.y-3.1)/2,0]}><boxGeometry args={[12,(MALL_LEVELS[i+1]?.y??spatial.shaftTop)-l.y-3.1,.2]}/><meshStandardMaterial color="#d9d7cf"/></mesh>
        <mesh position={[0,3.2,g.front*.16]}><boxGeometry args={[11.5,.13,.12]}/><meshStandardMaterial color={g.color} emissive={g.color} emissiveIntensity={.8}/></mesh>
      </group>)}
    </group>)}
    {cars.map((c,i)=><group key={c.id}>
      <group ref={o=>{moving.current[i]=o}} position={[c.x,c.y,c.z]}>
        <mesh position={[0,-.06,0]}><boxGeometry args={[c.width,.12,c.depth]}/><meshStandardMaterial color="#dad3c4"/></mesh>
        <mesh position={[0,c.cabHeight,0]}><boxGeometry args={[c.width,.12,c.depth]}/><meshStandardMaterial color="#fff2d6" emissive="#fff2d6" emissiveIntensity={.35}/></mesh>
        <mesh position={[0,c.cabHeight/2,-c.group.front*(c.depth/2-.1)]}><boxGeometry args={[c.width,c.cabHeight,.08]}/><meshPhysicalMaterial color="#b3dde3" transparent opacity={c.id==='SERVICE'?.5:.18} depthWrite={false} roughness={.08} metalness={.12}/></mesh>
        {[-1,1].map(s=><group key={s}>
          <mesh position={[s*(c.width/2-.05),c.cabHeight/2,0]}><boxGeometry args={[.06,c.cabHeight,c.depth]}/><meshPhysicalMaterial color="#c9e3e5" transparent opacity={.18} depthWrite={false} roughness={.08}/></mesh>
          <mesh position={[s*(c.width/2-.05),1.1,0]}><boxGeometry args={[.055,.065,c.depth-.2]}/><meshStandardMaterial color="#bca66b" metalness={.85} roughness={.18}/></mesh>
        </group>)}
      </group>
      {c.levels.map((l,j)=><group key={l.id} ref={o=>{doors.current[i*MALL_LEVELS.length+j]=o}} position={[c.x,l.y+c.cabHeight/2,c.z+c.group.front*(c.depth/2+.1)]}>
        {[-1,1].map(s=><mesh key={s} position={[s*c.width/4,0,0]}><boxGeometry args={[c.width/2,c.cabHeight,.14]}/><meshPhysicalMaterial color="#99bcc3" transparent opacity={c.id==='SERVICE'?.85:.25} depthWrite={false} metalness={.25} roughness={.15}/></mesh>)}
      </group>)}
    </group>)}
  </group>;
}
