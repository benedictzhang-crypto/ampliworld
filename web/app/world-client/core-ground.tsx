'use client';

import {useEffect,useMemo} from 'react';
import {
  BufferGeometry,DataTexture,Float32BufferAttribute,RGBAFormat,
  RepeatWrapping,SRGBColorSpace,Color,
} from 'three';
import concourse from '../../public/assets/3d/ampliworld/GC-CBD-CONCOURSE-001/concourse-manifest.json';

type Finish='paving'|'garden';
const X_MIN=-600,X_MAX=600,Z_MIN=-1100,Z_MAX=1100,TILE=55;
const PALETTE={
  paving:['#929995','#858e8b','#a1a7a0','#777f7d'],
  garden:['#647d63','#728569','#5d755d','#819074'],
} as const;

function grid(min:number,max:number,step:number,boundaries:number[]){
  const points=[min,max,...boundaries];
  for(let value=min+step;value<max;value+=step)points.push(value);
  return [...new Set(points)].sort((a,b)=>a-b);
}
function hash(x:number,z:number){
  let value=(Math.imul(Math.round(x),73856093)^Math.imul(Math.round(z),19349663))>>>0;
  value=Math.imul(value^(value>>>16),2246822519)>>>0;
  return (value^(value>>>13))>>>0;
}
function finishAt(x:number,z:number):Finish{
  if(Math.abs(x)<310&&Math.abs(z)<490)return 'paving';
  if(Math.abs(x)>440||Math.abs(z)>800)return hash(Math.floor(x/110),Math.floor(z/110))%5<4?'garden':'paving';
  return hash(Math.floor(x/110),Math.floor(z/110))%4===0?'garden':'paving';
}
function makeDetailTexture(finish:Finish){
  const size=64,pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,noise=hash(x,y)%23;
    const joint=finish==='paving'&&(x%16===0||y%16===0);
    const value=joint?164:finish==='paving'?225+noise:198+noise;
    pixels[i]=value;pixels[i+1]=value;pixels[i+2]=value;pixels[i+3]=255;
  }
  const texture=new DataTexture(pixels,size,size,RGBAFormat);
  texture.colorSpace=SRGBColorSpace;
  texture.wrapS=texture.wrapT=RepeatWrapping;
  texture.needsUpdate=true;
  return texture;
}
function makeCoreGround(){
  const holes=[...concourse.holes,{min:[114,-128],max:[127,-79]}];
  const xs=grid(X_MIN,X_MAX,TILE,holes.flatMap(h=>[h.min[0],h.max[0]]));
  const zs=grid(Z_MIN,Z_MAX,TILE,holes.flatMap(h=>[h.min[1],h.max[1]]));
  const geometry={} as Record<Finish,BufferGeometry>;
  for(const finish of ['paving','garden'] as const){
    const positions:number[]=[],colors:number[]=[],uvs:number[]=[];
    for(let ix=1;ix<xs.length;ix++)for(let iz=1;iz<zs.length;iz++){
      const x0=xs[ix-1],x1=xs[ix],z0=zs[iz-1],z1=zs[iz];
      if(x0===x1||z0===z1)continue;
      const x=(x0+x1)/2,z=(z0+z1)/2;
      if(holes.some(h=>x>h.min[0]&&x<h.max[0]&&z>h.min[1]&&z<h.max[1]))continue;
      if(finishAt(x,z)!==finish)continue;
      const palette=PALETTE[finish],color=new Color(palette[hash(ix,iz)%palette.length]);
      for(const [px,pz] of [[x0,z0],[x0,z1],[x1,z0],[x1,z0],[x0,z1],[x1,z1]]){
        positions.push(px,-0.015,pz);
        colors.push(color.r,color.g,color.b);
        uvs.push(px/8,pz/8);
      }
    }
    const mesh=new BufferGeometry();
    mesh.setAttribute('position',new Float32BufferAttribute(positions,3));
    mesh.setAttribute('color',new Float32BufferAttribute(colors,3));
    mesh.setAttribute('uv',new Float32BufferAttribute(uvs,2));
    mesh.computeVertexNormals();
    geometry[finish]=mesh;
  }
  return geometry;
}

/** One editable ground finish per tile; opening coordinates remain authoritative. */
export function CoreGround(){
  const geometry=useMemo(makeCoreGround,[]);
  const textures=useMemo(()=>({paving:makeDetailTexture('paving'),garden:makeDetailTexture('garden')}),[]);
  useEffect(()=>()=>{
    geometry.paving.dispose();geometry.garden.dispose();
    textures.paving.dispose();textures.garden.dispose();
  },[geometry,textures]);
  return <group name="CBD modular ground finishes">
    <mesh geometry={geometry.paving} receiveShadow>
      <meshStandardMaterial map={textures.paving} vertexColors roughness={0.92}/>
    </mesh>
    <mesh geometry={geometry.garden} receiveShadow>
      <meshStandardMaterial map={textures.garden} vertexColors roughness={0.98}/>
    </mesh>
    <mesh position={[0,0,-81]} receiveShadow>
      <boxGeometry args={[14,0.06,14]}/>
      <meshStandardMaterial color="#737c7c" roughness={0.9}/>
    </mesh>
  </group>;
}
