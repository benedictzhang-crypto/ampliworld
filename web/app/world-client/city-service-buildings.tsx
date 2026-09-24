'use client';
import {Suspense,useEffect,useMemo,useRef} from 'react';
import {Clone,Text,useGLTF} from '@react-three/drei';
import {Color,InstancedMesh,Matrix4,Mesh,Object3D} from 'three';
import {SERVICE_SITES} from '../life-sim/city-service-plan';

export const STREET_SERVICE_SITES=SERVICE_SITES.filter(s=>s.placement==='street');
const MODELED_STOREFRONT_TYPES=new Set(['convenience','pharmacy','florist','signature-restaurant','premium-restaurant','upper-restaurant','mid-restaurant','value-restaurant','milk-tea','cafe','bakery','electronics-repair','dry-cleaning','laundromat','salon','clinic','dentist','pet','repair','post']);
export const MODELED_STOREFRONT_SITES=STREET_SERVICE_SITES.filter(s=>MODELED_STOREFRONT_TYPES.has(s.type));
export const SPECIAL_SERVICE_SITES=STREET_SERVICE_SITES.filter(s=>s.type==='gym'||s.type==='arcade');
export const REALTY_MOBILITY_SITES=STREET_SERVICE_SITES.filter(s=>['real-estate-broker','property-developer','car-rental'].includes(s.type));
export const NEIGHBORHOOD_SITES=STREET_SERVICE_SITES.filter(s=>['small-restaurant','budget-hotel','fire','detention','prison'].includes(s.type));
export function neighborhoodVariant(id:string,type:string){
  if(type==='small-restaurant')return `mixed-${(Number(id.slice(-3))%3)+1}`;
  if(type==='budget-hotel')return 'express-hotel';
  if(type==='fire')return 'fire-station';
  if(type==='detention'||type==='prison')return type;
  return null;
}
export function venueVariant(id:string,type:string){
  if(type==='arcade')return 'arcade';
  if(type==='gym')return id.endsWith('002')||id.endsWith('003')?'aquatic':id.endsWith('004')||id.endsWith('005')||id.endsWith('006')?'studio':'iron';
  return null;
}
export const CITY_SERVICE_COLLIDERS=STREET_SERVICE_SITES.flatMap(s=>{
  if(REALTY_MOBILITY_SITES.includes(s)){
    const developer=s.type==='property-developer',width=developer?32:s.type==='car-rental'?30:28;
    const depth=developer?21:s.type==='car-rental'?18:17,height=developer?18:s.type==='car-rental'?7.5:8.4;
    return [
      {id:`${s.id}/rear`,min:[s.x-width/2,0,s.z-depth/2] as [number,number,number],max:[s.x+width/2,height,s.z-depth/2+.5] as [number,number,number]},
      ...[-1,1].map(side=>({id:`${s.id}/side-${side}`,min:[s.x+side*width/2-.3,0,s.z-depth/2] as [number,number,number],max:[s.x+side*width/2+.3,height,s.z+depth/2] as [number,number,number]})),
    ];
  }
  if(s.type==='detention'||s.type==='prison'){
    const halfWidth=s.type==='prison'?18:15,halfDepth=s.type==='prison'?13:10,height=s.type==='prison'?12.8:8.8;
    return [
      {id:`${s.id}/secure-building`,min:[s.x-halfWidth,0,s.z-halfDepth] as [number,number,number],max:[s.x+halfWidth,height,s.z+halfDepth] as [number,number,number]},
      {id:`${s.id}/west-fence`,min:[s.x-halfWidth-.25,0,s.z-12] as [number,number,number],max:[s.x-halfWidth+.25,4.4,s.z+28] as [number,number,number]},
      {id:`${s.id}/east-fence`,min:[s.x+halfWidth-.25,0,s.z-12] as [number,number,number],max:[s.x+halfWidth+.25,4.4,s.z+28] as [number,number,number]},
      {id:`${s.id}/north-fence`,min:[s.x-halfWidth,0,s.z-12] as [number,number,number],max:[s.x+halfWidth,4.4,s.z-11.7] as [number,number,number]},
      {id:`${s.id}/south-fence-left`,min:[s.x-halfWidth,0,s.z+27.8] as [number,number,number],max:[s.x-3,4.4,s.z+28.1] as [number,number,number]},
      {id:`${s.id}/south-fence-right`,min:[s.x+3,0,s.z+27.8] as [number,number,number],max:[s.x+halfWidth,4.4,s.z+28.1] as [number,number,number]},
      {id:`${s.id}/secure-gate`,min:[s.x-3,0,s.z+27.8] as [number,number,number],max:[s.x+3,4.1,s.z+28.1] as [number,number,number]},
    ];
  }
  if(s.type==='fire')return [
    {id:`${s.id}/rear-wall`,min:[s.x-15,0,s.z-10] as [number,number,number],max:[s.x+15,12.1,s.z-9.6] as [number,number,number]},
    {id:`${s.id}/left-wall`,min:[s.x-15,0,s.z-10] as [number,number,number],max:[s.x-14.6,12.1,s.z+10] as [number,number,number]},
    {id:`${s.id}/right-wall`,min:[s.x+14.6,0,s.z-10] as [number,number,number],max:[s.x+15,12.1,s.z+10] as [number,number,number]},
    {id:`${s.id}/upper-front`,min:[s.x-15,6.2,s.z+9.8] as [number,number,number],max:[s.x+15,12.1,s.z+10.2] as [number,number,number]},
    ...[-9,0,9].map(x=>({id:`${s.id}/fire-engine-${x}`,min:[s.x+x-1.4,0,s.z-3.1] as [number,number,number],max:[s.x+x+1.4,3.5,s.z+3.1] as [number,number,number]})),
  ];
  if(MODELED_STOREFRONT_TYPES.has(s.type)||s.type==='gym'||s.type==='arcade'||s.type==='small-restaurant'||s.type==='budget-hotel'){
    const aquatic=venueVariant(s.id,s.type)==='aquatic';
    const halfWidth=aquatic?15:s.type==='budget-hotel'?14:8,halfDepth=aquatic?10:s.type==='budget-hotel'?9:6;
    const height=aquatic?11.8:s.type==='budget-hotel'?20:s.type==='small-restaurant'?30:6.4;
    return [
      {id:`${s.id}/rear-wall`,min:[s.x-halfWidth,0,s.z-halfDepth] as [number,number,number],max:[s.x+halfWidth,height,s.z-halfDepth+.35] as [number,number,number]},
      {id:`${s.id}/left-wall`,min:[s.x-halfWidth,0,s.z-halfDepth] as [number,number,number],max:[s.x-halfWidth+.35,height,s.z+halfDepth] as [number,number,number]},
      {id:`${s.id}/right-wall`,min:[s.x+halfWidth-.35,0,s.z-halfDepth] as [number,number,number],max:[s.x+halfWidth,height,s.z+halfDepth] as [number,number,number]},
      {id:`${s.id}/left-glazing`,min:[s.x-halfWidth+.6,0,s.z+halfDepth-.2] as [number,number,number],max:[s.x-1.9,4.2,s.z+halfDepth+.2] as [number,number,number]},
      {id:`${s.id}/right-glazing`,min:[s.x+1.9,0,s.z+halfDepth-.2] as [number,number,number],max:[s.x+halfWidth-.6,4.2,s.z+halfDepth+.2] as [number,number,number]},
      {id:`${s.id}/entry-left`,min:[s.x-1.9,0,s.z+halfDepth-.2] as [number,number,number],max:[s.x-1.55,4.6,s.z+halfDepth+.2] as [number,number,number]},
      {id:`${s.id}/entry-right`,min:[s.x+1.55,0,s.z+halfDepth-.2] as [number,number,number],max:[s.x+1.9,4.6,s.z+halfDepth+.2] as [number,number,number]},
      ...(['small-restaurant','budget-hotel'].includes(s.type)?[{id:`${s.id}/upper-front`,min:[s.x-halfWidth,4.5,s.z+halfDepth-.2] as [number,number,number],max:[s.x+halfWidth,height,s.z+halfDepth+.2] as [number,number,number]}]:[]),
    ];
  }
  const halfWidth=s.type==='police'?15:s.type==='bank'||s.type==='nightclub'?12:8;
  const height=['school','hotel','community','police','fire'].includes(s.type)?11:6;
  return [{id:`${s.id}/building`,min:[s.x-halfWidth,0,s.z-6] as [number,number,number],max:[s.x+halfWidth,height,s.z+6] as [number,number,number]}];
});

function StorefrontBatch({mesh,sites}:{mesh:Mesh;sites:typeof STREET_SERVICE_SITES}){
  const ref=useRef<InstancedMesh>(null);
  useEffect(()=>{
    const instance=ref.current;if(!instance)return;
    const placement=new Object3D(),matrix=new Matrix4();
    mesh.updateWorldMatrix(true,false);
    sites.forEach((site,index)=>{
      placement.position.set(site.x,0,site.z);
      placement.updateMatrix();
      matrix.multiplyMatrices(placement.matrix,mesh.matrixWorld);
      instance.setMatrixAt(index,matrix);
    });
    instance.instanceMatrix.needsUpdate=true;
    instance.computeBoundingSphere();
  },[mesh,sites]);
  return <instancedMesh ref={ref} args={[mesh.geometry,mesh.material,sites.length]} castShadow receiveShadow frustumCulled={false}/>;
}

function ModeledStorefronts(){
  const {scene}=useGLTF('/assets/3d/ampliworld/GC-STREET-SERVICE-KIT-001/model.glb');
  const meshes=useMemo(()=>{const result:Mesh[]=[];scene.traverse(object=>{if((object as Mesh).isMesh)result.push(object as Mesh);});return result;},[scene]);
  return <group name="Blender-authored street storefronts">{meshes.map(mesh=><StorefrontBatch key={mesh.uuid} mesh={mesh} sites={MODELED_STOREFRONT_SITES}/>)}</group>;
}

function NeighborhoodAssets({variant}:{variant:'mixed-1'|'mixed-2'|'mixed-3'|'express-hotel'|'fire-station'|'detention'|'prison'}){
  const {scene}=useGLTF(`/assets/3d/ampliworld/GC-NEIGHBORHOOD-001/${variant}.glb`);
  const meshes=useMemo(()=>{const result:Mesh[]=[];scene.traverse(object=>{if((object as Mesh).isMesh)result.push(object as Mesh);});return result;},[scene]);
  const sites=useMemo(()=>NEIGHBORHOOD_SITES.filter(s=>neighborhoodVariant(s.id,s.type)===variant),[variant]);
  return <group name={`Blender ${variant} neighborhood buildings`}>{meshes.map(mesh=><StorefrontBatch key={mesh.uuid} mesh={mesh} sites={sites}/>)}</group>;
}

function SpecialVenue({variant}:{variant:'aquatic'|'studio'|'iron'|'arcade'}){
  const {scene}=useGLTF(`/assets/3d/ampliworld/GC-FITNESS-ARCADE-001/${variant}.glb`);
  return <group name={`Blender ${variant} venues`}>{SPECIAL_SERVICE_SITES.filter(s=>venueVariant(s.id,s.type)===variant).map(s=><group key={s.id} position={[s.x,0,s.z]}>
    <Clone object={scene} castShadow receiveShadow/>
    <Text position={[0,5.65,variant==='aquatic'?13.1:8.6]} fontSize={variant==='aquatic'?.86:.52} color="#e9dfc7" anchorX="center" maxWidth={variant==='aquatic'?26:13}>{s.name}</Text>
  </group>)}</group>;
}

function CommercialAsset({variant}:{variant:'brokerage'|'developer'|'car-rental'}){
  const {scene}=useGLTF(`/assets/3d/ampliworld/GC-REALTY-MOBILITY-001/${variant}.glb`);
  const type=variant==='brokerage'?'real-estate-broker':variant==='developer'?'property-developer':'car-rental';
  return <group name={`${variant} physical business sites`}>
    {REALTY_MOBILITY_SITES.filter(s=>s.type===type).map(s=><group key={s.id} position={[s.x,0,s.z]}>
      <Clone object={scene} castShadow receiveShadow/>
    </group>)}
  </group>;
}

export function CityServiceBuildings(){
  const bodies=useRef<InstancedMesh>(null),glass=useRef<InstancedMesh>(null),roofs=useRef<InstancedMesh>(null),paving=useRef<InstancedMesh>(null);
  useEffect(()=>{const o=new Object3D(),c=new Color();STREET_SERVICE_SITES.forEach((s,i)=>{
    const tall=['school','hotel','community','police','fire'].includes(s.type),sides=s.type==='police'?1.8:s.type==='bank'||s.type==='nightclub'?1.45:['auto-repair','fuel'].includes(s.type)?1.5:1;
    const shellScale=MODELED_STOREFRONT_TYPES.has(s.type)||s.type==='gym'||s.type==='arcade'||NEIGHBORHOOD_SITES.includes(s)||REALTY_MOBILITY_SITES.includes(s)?0:1;
    o.position.set(s.x,tall?5:2.8,s.z);o.scale.set(sides*shellScale,(tall?1.8:1)*shellScale,shellScale);o.updateMatrix();bodies.current!.setMatrixAt(i,o.matrix);bodies.current!.setColorAt(i,c.setHSL((i*.097)%1,.16,.58));
    o.position.set(s.x,tall?4.2:2.4,s.z+6.04);o.scale.set(sides*shellScale,.75*shellScale,shellScale);o.updateMatrix();glass.current!.setMatrixAt(i,o.matrix);
    o.position.set(s.x,tall?10.2:5.8,s.z);o.scale.set(sides*shellScale,shellScale,shellScale);o.updateMatrix();roofs.current!.setMatrixAt(i,o.matrix);
    o.position.set(s.x,.04,s.z+10);o.scale.set(sides,1,1);o.updateMatrix();paving.current!.setMatrixAt(i,o.matrix);
  });for(const r of [bodies,glass,roofs,paving]){r.current!.instanceMatrix.needsUpdate=true;if(r.current!.instanceColor)r.current!.instanceColor.needsUpdate=true;}},[]);
  const count=STREET_SERVICE_SITES.length;
  return <group name="Physical street services">
    <Suspense fallback={null}><ModeledStorefronts/></Suspense>
    <Suspense fallback={null}><SpecialVenue variant="aquatic"/><SpecialVenue variant="studio"/><SpecialVenue variant="iron"/><SpecialVenue variant="arcade"/></Suspense>
    <Suspense fallback={null}><NeighborhoodAssets variant="mixed-1"/><NeighborhoodAssets variant="mixed-2"/><NeighborhoodAssets variant="mixed-3"/><NeighborhoodAssets variant="express-hotel"/><NeighborhoodAssets variant="fire-station"/><NeighborhoodAssets variant="detention"/><NeighborhoodAssets variant="prison"/></Suspense>
    <Suspense fallback={null}><CommercialAsset variant="brokerage"/><CommercialAsset variant="developer"/><CommercialAsset variant="car-rental"/></Suspense>
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
    {STREET_SERVICE_SITES.filter(s=>s.type==='dry-cleaning'||s.type==='laundromat').map(s=><Text key={s.id} position={[s.x,5.49,s.z+6.22]} fontSize={.58} color="#f7f0df" anchorX="center">{s.name}</Text>)}
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
