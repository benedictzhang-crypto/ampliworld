'use client';
import { Clone, Text, useGLTF } from '@react-three/drei';
import { CIVIC_PLACES } from './civic-registry';
import { useEffect,useMemo,useRef } from 'react';
import { Mesh, Material, InstancedMesh, Matrix4, Object3D } from 'three';
import { MALL_GARAGE, garageLevelAt } from './mall-garage';
import {RETAIL_CAMPUSES,CITY_CINEMAS,FOOD_VENUES} from './retail-registry';
import marina from '../../public/assets/3d/ampliworld/GC-MARINA-001/marina-manifest.json';

type MooredYacht=typeof marina.berths[number];
function MarinaFleetMesh({mesh,berths}:{mesh:Mesh;berths:MooredYacht[]}){
  const ref=useRef<InstancedMesh>(null);
  useEffect(()=>{
    const instances=ref.current;if(!instances)return;
    const placement=new Object3D(),matrix=new Matrix4();
    mesh.updateWorldMatrix(true,false);
    berths.forEach((berth,index)=>{
      placement.position.set(berth.center[0],berth.center[1],berth.center[2]);
      placement.rotation.set(0,berth.side==='west'?Math.PI:0,0);
      placement.updateMatrix();matrix.multiplyMatrices(placement.matrix,mesh.matrixWorld);
      instances.setMatrixAt(index,matrix);
    });
    instances.instanceMatrix.needsUpdate=true;instances.computeBoundingSphere();
  },[mesh,berths]);
  return <instancedMesh ref={ref} args={[mesh.geometry,mesh.material,berths.length]} castShadow receiveShadow frustumCulled={false}/>;
}
function MarinaFleetVariant({length}:{length:14|18|22}){
  const {scene}=useGLTF(`/assets/3d/ampliworld/GC-YACHT-FLEET-001/${length}m.glb`);
  const meshes=useMemo(()=>{const result:Mesh[]=[];scene.traverse(object=>{if((object as Mesh).isMesh)result.push(object as Mesh);});return result;},[scene]);
  const berths=useMemo(()=>marina.berths.filter(b=>b.occupied&&b.yachtLength===length),[length]);
  return <group name={`${length}m Blender marina fleet`}>{meshes.map(mesh=><MarinaFleetMesh key={mesh.uuid} mesh={mesh} berths={berths}/>)}</group>;
}
function MarinaFleet(){return <group name="Blender-authored marina yachts"><MarinaFleetVariant length={14}/><MarinaFleetVariant length={18}/><MarinaFleetVariant length={22}/></group>}

function RetailCampus({site}:{site:(typeof RETAIL_CAMPUSES)[number]}){
  const accent=site.kind==='premium-grocery'?'#5f8067':site.kind==='department-store'?'#a84b47':site.kind==='asian-grocery'?'#9a5548':'#536875';
  return <group position={[site.x,0,site.z]}>
    <mesh position={[0,.08,site.d*.72]} receiveShadow><boxGeometry args={[site.w*1.35,.16,site.d*.55]}/><meshStandardMaterial color="#777c78" roughness={.94}/></mesh>
    {[-.34,-.11,.11,.34].map((n,i)=><mesh key={i} position={[site.w*n,.13,site.d*.72]} receiveShadow><boxGeometry args={[site.w*.18,.12,site.d*.48]}/><meshStandardMaterial color={i%2?'#8e918c':'#a8aaa2'} roughness={.9}/></mesh>)}
    <mesh position={[0,4.8,0]} castShadow receiveShadow><boxGeometry args={[site.w,9.6,site.d]}/><meshStandardMaterial color="#b6b5ad" roughness={.78}/></mesh>
    <mesh position={[0,4.4,site.d/2+.04]}><boxGeometry args={[site.w*.76,6.6,.16]}/><meshPhysicalMaterial color="#7f9b9c" transparent opacity={.52} roughness={.16}/></mesh>
    <mesh position={[0,9.9,0]} castShadow><boxGeometry args={[site.w+2,.45,site.d+2]}/><meshStandardMaterial color={accent} roughness={.48}/></mesh>
    <Text position={[0,7.4,site.d/2+.18]} fontSize={Math.min(3.2,site.w/15)} color="#f6f1df" anchorX="center" anchorY="middle">{site.name}</Text>
    {[-1,1].map(s=><group key={s} position={[s*(site.w*.58),0,site.d*.67]}><mesh position={[0,.5,0]}><boxGeometry args={[2.4,1,2.4]}/><meshStandardMaterial color="#7d7468"/></mesh><mesh position={[0,1.7,0]}><sphereGeometry args={[1.6,12,8]}/><meshStandardMaterial color="#45694f" roughness={.96}/></mesh></group>)}
  </group>;
}
function CinemaMarker({site}:{site:(typeof CITY_CINEMAS)[number]}){
  return <group position={[site.x,1,site.z]}><mesh castShadow receiveShadow><boxGeometry args={[46,18,34]}/><meshStandardMaterial color="#34343b" roughness={.5}/></mesh><mesh position={[0,0,17.1]}><boxGeometry args={[34,10,.25]}/><meshStandardMaterial color="#876a45" metalness={.55}/></mesh><Text position={[0,2,17.3]} fontSize={2.5} color="#f2dfb7">{site.name}</Text></group>;
}
function HospitalityLandscape(){return <>{[[245,-82],[290,-82],[335,-82]].map(([x,z],i)=><group key={i}><mesh position={[x,.035,z+11]} receiveShadow><boxGeometry args={[25,.07,8]}/><meshStandardMaterial color={i===1?'#595b58':'#898c86'} roughness={.96}/></mesh>{[-1,1].map(s=><group key={s} position={[x+s*11,.1,z+12]}><mesh position={[0,.35,0]}><boxGeometry args={[2.2,.7,2.2]}/><meshStandardMaterial color="#817769"/></mesh><mesh position={[0,1.1,0]}><sphereGeometry args={[1.25,12,8]}/><meshStandardMaterial color="#48614b" roughness={1}/></mesh></group>)}</group>)}</>}
function FoodTruck({site}:{site:(typeof FOOD_VENUES)[number]}){if(site.type!=='food-truck')return null;return <group position={[site.x,.7,site.z]}><mesh castShadow><boxGeometry args={[5.8,2.8,2.5]}/><meshStandardMaterial color="#ded8c7" roughness={.55}/></mesh><mesh position={[0,.25,1.27]}><boxGeometry args={[3.2,1.25,.08]}/><meshStandardMaterial color="#29383a"/></mesh>{[-2,2].map(x=><mesh key={x} position={[x,-1.22,0]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.52,.52,.3,16]}/><meshStandardMaterial color="#22252a"/></mesh>)}<Text position={[0,1.85,0]} fontSize={.48} color="#5d4533">{site.name}</Text></group>}
function CivicAsset({
  id,
  assetId,
  file,
  x,
  z,
}: {
  id: string;
  assetId?:string;
  file: string;
  x: number;
  z: number;
}) {
  const { scene } = useGLTF(`/assets/3d/ampliworld/${assetId||id}/${file}`);
  const display = useMemo(() => {
    const c = scene.clone(true);
    if (id === 'GC-SPORT-STREET-001')
      c.traverse((o) => {
        const m = o as Mesh;
        if (
          m.isMesh &&
          ['wood', 'leaf'].includes((m.material as Material).name)
        )
          m.visible = false;
      });
    if(id==='GC-MARINA-001')c.traverse(object=>{if(object.name.includes(' yacht '))object.visible=false;});
    return c;
  }, [scene, id]);
  return (
    <group position={[x, 0, z]}>
      {id==='GC-MARINA-001'?<><primitive object={display}/><MarinaFleet/></>:<Clone object={display} castShadow receiveShadow />}
    </group>
  );
}
export function CivicPlaces({ garageY = 0 }: { garageY?: number }) {
  const floor = garageLevelAt(garageY).floorY;
  return (
    <>
      <CivicAsset
        id="GC-SPORT-STREET-001"
        file="sports-streets.glb"
        x={0}
        z={0}
      />
      {CIVIC_PLACES.map((p) => (
        <CivicAsset key={`${p.id}/${p.x}/${p.z}`} {...p} />
      ))}
      <HospitalityLandscape />
      {RETAIL_CAMPUSES.map(site=><RetailCampus key={site.id} site={site}/>)}
      {CITY_CINEMAS.filter(site=>site.id!=='CINEMA-CBD').map(site=><CinemaMarker key={site.id} site={site}/>)}
      {FOOD_VENUES.map(site=><FoodTruck key={site.id} site={site}/>)}
      <CivicAsset id="GC-MALL-GARAGE-002" file="garage.glb" x={0} z={-188} />
      {[-70, 0, 75].flatMap((x) =>
        [-240, -150].map((z) => (
          <pointLight
            key={`${x}/${z}`}
            position={[x, floor + 4.3, z]}
            color="#e3eaff"
            intensity={200}
            distance={100}
            decay={1}
          />
        )),
      )}
    </>
  );
}
