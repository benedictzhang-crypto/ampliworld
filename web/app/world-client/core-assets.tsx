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
  return <group name="CBD streets, bus stops and wayfinding">
    <Clone object={scene} castShadow receiveShadow />
    {[[ -440,-915],[-440,-725],[440,-910],[440,-720]].map(([x,z])=>{
      const sx=x+(x<0?-19:19);
      return <Text key={`speed-${x}-${z}`} position={[sx,3.85,z+.265]}
        fontSize={.55} color="#26373d" anchorX="center" anchorY="middle">40</Text>;
    })}
    {[[-440,-790,'CENTRAL STATION  →  CBD'],[440,-790,'RIVERFRONT  ←  CBD']].map(([x,z,label])=><group key={String(label)}>
      <Text position={[Number(x),7.2,Number(z)+.2]} fontSize={1.05} color="#f5f7f1"
        anchorX="center" anchorY="middle">{String(label)}</Text>
      <Text position={[Number(x),7.2,Number(z)-.2]} rotation={[0,Math.PI,0]} fontSize={1.05}
        color="#f5f7f1" anchorX="center" anchorY="middle">{String(label)}</Text>
    </group>)}
    {[[-304.2,-402,'MALL  →'],[315.8,-402,'METRO  ←'],[5.8,-812,'RIVER  ↑']].map(([x,z,label])=><Text
      key={String(label)} position={[Number(x),2.82,Number(z)+.23]} fontSize={.29}
      color="#f5f7f1" anchorX="center" anchorY="middle">{String(label)}</Text>)}
    {[[-467,-869.9], [473,-869.9],[-467,-564.9],[473,-564.9]].map(([x,z],i)=><Text
      key={`bus-${i}`} position={[x,3.75,z+.08]} fontSize={.3}
      color="#f5f7f1" anchorX="center" anchorY="middle">BUS {i+1}</Text>)}
    <Text position={[-446,2.55,-869.04]} fontSize={.58} color="#ffe8ad"
      anchorX="center" anchorY="middle">B1</Text>
  </group>;
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
      <group name="mall exterior campaign displays">
        {[[-72,'AUREOLE','CITY LIFE','#193b46'],[72,'ATELIER','NEW SEASON','#55404a']].map(([x,name,caption,tone])=><group key={String(name)} position={[Number(x),19,91.2]}>
          <mesh castShadow><boxGeometry args={[24,8,.35]}/><meshStandardMaterial color="#b6a57e" metalness={.7} roughness={.32}/></mesh>
          <mesh position={[0,0,.22]}><boxGeometry args={[23.2,7.2,.12]}/><meshStandardMaterial color={String(tone)} roughness={.4} metalness={.2} emissive={String(tone)} emissiveIntensity={.2}/></mesh>
          <Text position={[0,.75,.31]} fontSize={1.65} letterSpacing={.08} color="#f3e7cf" anchorX="center">{String(name)}</Text>
          <Text position={[0,-1.5,.31]} fontSize={.65} letterSpacing={.16} color="#d9d1bd" anchorX="center">{String(caption)}</Text>
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
