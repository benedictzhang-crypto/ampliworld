import {useMemo} from 'react';
import {Clone,Text,useGLTF} from '@react-three/drei';
import {DISTRICT} from '../district/registry';

export function Office({ assetId, x, z }: { assetId: string; x: number; z: number }) {
  const { scene } = useGLTF(`/assets/3d/ampliworld/${assetId}/tower-lod0.glb`);
  return (
    <group position={[x, 0, z]}>
      <Clone object={scene} castShadow receiveShadow />
    </group>
  );
}
export function RooftopHelipads(){
  const {scene}=useGLTF('/assets/3d/ampliworld/GC-REALTY-MOBILITY-001/helipad.glb');
  return <group name="Rooftop helipads, static visual infrastructure">
    <group position={[2937,84,4376]}><Clone object={scene} castShadow receiveShadow/></group>
    <group position={[280,350,-490]}><Clone object={scene} castShadow receiveShadow/></group>
  </group>;
}
export function CityInfrastructure() {
  const { scene } = useGLTF(
    '/assets/3d/ampliworld/GC-CITY-INFRA-001/globalinfra.glb',
  );
  return <Clone object={scene} receiveShadow />;
}
export function CBDBoulevards() {
  const { scene } = useGLTF(
    '/assets/3d/ampliworld/GC-CBD-STREET-001/cbd-streets.glb',
  );
  return <Clone object={scene} castShadow receiveShadow />;
}

export function Mall() {
  const { scene } = useGLTF('/assets/3d/ampliworld/GC-MALL-002/mall-lod0.glb');
  return (
    <group position={[DISTRICT.mall.x, 0, DISTRICT.mall.z]}>
      <Clone object={scene} castShadow receiveShadow />
      <group name="atrium suspended campaign banners">
        {[[-15,16,0,'AUREOLE • NEW SEASON'],[16,22,0,'DESIGN THE FUTURE']].map(([x,y,z,label],i)=><group key={String(label)} position={[Number(x),Number(y),Number(z)]}>
          <mesh castShadow><boxGeometry args={[20,5,.15]}/><meshStandardMaterial color={i?'#703a47':'#1d424c'} roughness={.68} side={2}/></mesh>
          <Text position={[0,0,.1]} fontSize={.95} color="#f5e5c0" anchorX="center" anchorY="middle">{String(label)}</Text>
          <Text position={[0,0,-.1]} rotation={[0,Math.PI,0]} fontSize={.95} color="#f5e5c0" anchorX="center" anchorY="middle">{String(label)}</Text>
          {[-8,8].map(s=><mesh key={s} position={[s,7,0]}><cylinderGeometry args={[.045,.045,14,6]}/><meshStandardMaterial color="#a78b61" metalness={.7}/></mesh>)}
        </group>)}
      </group>
    </group>
  );
}
export function Concourse() {
  const { scene } = useGLTF(
    '/assets/3d/ampliworld/GC-CBD-CONCOURSE-001/concourse.glb',
  );
  return <Clone object={scene} castShadow receiveShadow />;
}

export function Street() {
  const { scene } = useGLTF(
    '/assets/3d/ampliworld/GC-STREET-001/street-block.glb',
  );
  const display = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      if (o.name === 'Street_bark' || o.name === 'Street_leaf')
        o.visible = false;
    });
    return c;
  }, [scene]);
  return <Clone object={display} castShadow receiveShadow />;
}
