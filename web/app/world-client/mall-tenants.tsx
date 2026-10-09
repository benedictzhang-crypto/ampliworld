'use client';
import {Clone,useGLTF} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useRef,useMemo,useEffect,useState,memo} from 'react';
import {CanvasTexture,Mesh,MeshStandardMaterial,type PointLight} from 'three';
import {useMallMaterials} from './mall-materials';
import {AssetIsland} from './asset-island';
import {COLLECTIONS,PALETTES,PRODUCT_BY_SKU,isPilot} from './mall-retail-catalog';
import {unitSettings,type RetailState} from './mall-retail-state';
import {ProductModel} from './retail-products';
import {selectMallUnits,admitMallUnits,STREAM_INTERVAL} from './mall-streaming';
import manifest from '../../public/assets/3d/ampliworld/GC-MALL-TENANTS-001/tenants-manifest.json';
import spatial from './mall-spatial-plan.json';
export const MALL_TENANT_COLLIDERS=manifest.colliders.map(c=>({id:c.id,min:[c.min[0],c.min[1],c.min[2]-188],max:[c.max[0],c.max[1],c.max[2]-188]}));
export function mallTenantLocation(x:number,z:number,y:number,state?:RetailState){
 const s=manifest.shops.find(s=>Math.abs(x-s.x)<s.w/2&&Math.abs(z+188-s.z)<s.d/2&&Math.abs(y-s.floorY)<2);
 return s?(state?unitSettings(state,s.id).name:s.name):undefined;
}
function Sign({name,x,y,z,width,front}:{name:string;x:number;y:number;z:number;width:number;front:number}){
 const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d')!;ctx.clearRect(0,0,1024,128);ctx.fillStyle='#f5ecd9';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 50px sans-serif';ctx.fillText(name,512,66,980);return new CanvasTexture(c);},[name]);
 useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={[x,y,z]} rotation={[0,front<0?Math.PI:0,0]}><planeGeometry args={[width,.70]}/><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false}/></mesh>;
}
function Shared(){const {scene}=useGLTF('/assets/3d/ampliworld/GC-MALL-TENANTS-001/shared.glb','/assets/decoders/draco/');return <Clone object={useMallMaterials(scene)} receiveShadow/>;}
const TenantUnit=memo(function TenantUnit({unit:u,state,onInspect}:{unit:typeof manifest.shops[number];state:RetailState;onInspect:(unit:string,sku:string)=>void}){
 const {scene}=useGLTF(u.asset,'/assets/decoders/draco/'),glass=useMallMaterials(scene),settings=unitSettings(state,u.id),pilot=isPilot(u.id);
 const styled=useMemo(()=>{
  const copy=glass.clone(true),owned:MeshStandardMaterial[]=[],cache=new Map<MeshStandardMaterial,MeshStandardMaterial>();
  copy.traverse(o=>{if(!(o instanceof Mesh))return;
   const source=(Array.isArray(o.material)?o.material[0]:o.material) as MeshStandardMaterial;
   if(pilot&&/::(Inventory|Signage)::/.test(source.name)){o.visible=false;return;}
   const replace=(m:MeshStandardMaterial)=>{
    if(settings.palette==='original')return m;
    const leaf=m.name.split('::').at(-1)??'',pal=PALETTES[settings.palette];
    const color=leaf==='Travertine'||leaf==='Cream marble'?pal.stone:leaf==='Walnut'?pal.wood:leaf==='Bronze'||leaf==='Tenant '+u.id?pal.accent:null;
    if(!color)return m;if(cache.has(m))return cache.get(m)!;
    const n=m.clone();n.color.set(color);cache.set(m,n);owned.push(n);return n;
   };
   o.material=Array.isArray(o.material)?o.material.map(replace):replace(source);
  });return {scene:copy,owned};
 },[glass,settings.palette,pilot,u.id]);
 useEffect(()=>()=>styled.owned.forEach(m=>m.dispose()),[styled]);
 const front=u.z<0?1:-1,door=u.z+front*u.d/2,products=COLLECTIONS[settings.collection];
 return <group><Clone object={styled.scene} castShadow receiveShadow/>
 {pilot&&<><Sign name={settings.name} x={u.x} y={u.floorY+4.3} z={door+front*.19} width={Math.min(u.w-1,25)} front={front}/>
 {products.map((sku,i)=>{const left=Math.ceil(products.length/2),first=i<left,count=first?left:products.length-left,index=first?i:i-left;const dx=(first?-1:1)*u.w*.30+(index-(count-1)/2)*.9;return <group key={sku} position={[u.x+dx,u.floorY+.38,door-front*4]} rotation={[0,front<0?Math.PI:0,0]} onClick={e=>{e.stopPropagation();onInspect(u.id,sku);}}>
  <ProductModel product={PRODUCT_BY_SKU[sku]}/>
  {PRODUCT_BY_SKU[sku].slot==='top'&&<mesh position={[0,.40,-.05]}><cylinderGeometry args={[.025,.025,.8,8]}/><meshStandardMaterial color="#ac9561" metalness={.6}/></mesh>}
 </group>;})}</>}
 </group>;
});
export function MallTenants({state,onInspect}:{state:RetailState;onInspect:(unit:string,sku:string)=>void}){
 const a=useRef<PointLight>(null),b=useRef<PointLight>(null);
 const [active,setActive]=useState<string[]>([]),activeRef=useRef<string[]>([]),last=useRef(-Infinity);
 const [shared,setShared]=useState(false),sharedRef=useRef(false);
 useFrame(({camera,clock,gl})=>{
  if(clock.elapsedTime-last.current>=STREAM_INTERVAL){
   last.current=clock.elapsedTime;
   const desired=selectMallUnits(manifest.shops,camera.position.x,camera.position.y,camera.position.z,activeRef.current);
   const next=admitMallUnits(desired,activeRef.current);
   if(next.join('|')!==activeRef.current.join('|')){activeRef.current=next;setActive(next);}
   const close=Math.abs(camera.position.x)<250&&Math.abs(camera.position.z+188)<150&&camera.position.y<70;
   if(close!==sharedRef.current){sharedRef.current=close;setShared(close);}
   gl.domElement.dataset.mallUnits=String(next.length);
  }
  if(!a.current||!b.current)return;
  const x=camera.position.x,z=camera.position.z+188,y=camera.position.y;
  const level=spatial.floors.find(f=>y>f.y&&y<f.y+f.clearHeight),basement=y>-7.2&&y<-.4;
  const visible=Math.abs(x)<190&&Math.abs(z)<85&&(!!level||basement);
  a.current.visible=b.current.visible=visible;if(!visible)return;
  const fy=basement?-7.2:level!.y,ax=Math.round(x/12)*12,az=Math.round(z/12)*12;
  a.current.position.set(ax,fy+4.4,az);b.current.position.set(ax+(x>0?-9:9),fy+4.4,az+8);
 });
 return <group position={[0,0,-188]}>{shared&&<AssetIsland name="mall shared finishes"><Shared/></AssetIsland>}
 {manifest.shops.filter(unit=>active.includes(unit.id)).map(unit=><AssetIsland name={unit.unitId} key={unit.unitId}><TenantUnit unit={unit} state={state} onInspect={onInspect}/></AssetIsland>)}
 <pointLight ref={a} color="#ffecd2" intensity={90} distance={24} decay={2}/><pointLight ref={b} color="#fff5e4" intensity={65} distance={24} decay={2}/>
 </group>;
}
