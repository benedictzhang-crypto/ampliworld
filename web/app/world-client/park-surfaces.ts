import { DataTexture, Float32BufferAttribute, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, Vector3, type Object3D } from 'three';

/** Walkable tops of the Blender-authored park paths (metres, park-local X/Z). */
export const PARK_PATHS = [
  [0,181,18,520,.13], [0,20,1080,16,.125],
  [350,-152,14,265,.13], [-315,-85,14,610,.125],
  [0,331,690,13,.125], [0,414,115,48,.15],
] as const;
export function parkPathHeight(x:number,z:number) {
  let y=.02;
  for(const [cx,cz,w,d,top] of PARK_PATHS)
    if(Math.abs(x-cx)<=w/2 && Math.abs(z-cz)<=d/2) y=Math.max(y,top);
  for(const [cx,cz,r] of [[390,10,76],[170,110,58],[350,-155,57],[0,355,43]])
    if(Math.hypot(x-cx,z-cz)<=r)y=Math.max(y,.09);
  return y;
}

function stoneTexture(){
  const size=128,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const row=Math.floor(y/32),offset=row%2?32:0;
    const joint=(x+offset)%64<1 || y%32<1;
    const hash=(Math.imul(x+7,73856093)^Math.imul(y+11,19349663))>>>0;
    const shade=joint?90:192+(hash%21)-10;
    const i=(y*size+x)*4;
    data[i]=shade;data[i+1]=shade;data[i+2]=shade-5;data[i+3]=255;
  }
  const map=new DataTexture(data,size,size);map.colorSpace=SRGBColorSpace;
  map.generateMipmaps=true;map.minFilter=LinearMipmapLinearFilter;map.magFilter=LinearFilter;map.anisotropy=4;
  map.wrapS=map.wrapT=RepeatWrapping;map.needsUpdate=true;
  return map;
}

/** Edit cloned resources only; shared GLTF assets remain unchanged. */
export function finishParkSurfaces(source:Object3D){
  const scene=source.clone(true),map=stoneTexture();
  const geometries:Mesh['geometry'][]=[],materials:MeshStandardMaterial[]=[];
  const shared=new Map<string,MeshStandardMaterial>();
  scene.updateMatrixWorld(true);
  scene.traverse(object=>{
    if(!(object instanceof Mesh)||Array.isArray(object.material))return;
    const original=object.material as MeshStandardMaterial;
    if(!['paving','grass','asphalt'].includes(original.name))return;
    let material=shared.get(original.name);
    if(!material){
      material=original.clone();
      material.color.set(original.name==='grass'?'#50734b':original.name==='asphalt'?'#424b50':'#96998d');
      material.roughness=.94;
      if(original.name==='paving')material.map=map;
      shared.set(original.name,material);materials.push(material);
    }
    object.material=material;
    if(original.name!=='paving')return;
    const geometry=object.geometry.clone(),positions=geometry.getAttribute('position');
    const uv=new Float32Array(positions.count*2),point=new Vector3();
    for(let i=0;i<positions.count;i++){
      point.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);
      uv[i*2]=point.x/2.4;uv[i*2+1]=point.z/2.4;
    }
    geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));
    object.geometry=geometry;geometries.push(geometry);
  });
  return {scene,dispose(){map.dispose();materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());}};
}
