'use client';
import {Clone,useGLTF} from '@react-three/drei';
import {useMallMaterials} from './mall-materials';
import plan from './mall-sports-plan.json';
import manifest from '../../public/assets/3d/ampliworld/GC-MALL-SPORTS-001/sports-manifest.json';
export const MALL_SPORTS_COLLIDERS=manifest.colliders.map(c=>({id:c.id,min:[c.min[0],c.min[1],c.min[2]-188],max:[c.max[0],c.max[1],c.max[2]-188]}));
export function mallSportsLocation(x:number,z:number,y:number){
  if(Math.abs(y-plan.floorY)>2)return undefined;
  return plan.shops.find(s=>x>s.min[0]&&x<s.max[0]&&z+188>s.min[1]&&z+188<s.max[1])?.name;
}
export function MallSports(){
  const {scene}=useGLTF('/assets/3d/ampliworld/GC-MALL-SPORTS-001/sports.glb','/assets/decoders/draco/');
  const display=useMallMaterials(scene);
  return <group position={[0,0,-188]}><Clone object={display} castShadow receiveShadow/></group>;
}
