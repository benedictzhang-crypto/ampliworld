import {useMemo,useEffect} from 'react';
import {Mesh,MeshPhysicalMaterial,MeshStandardMaterial,Group} from 'three';

/** Cached shell geometry is shared; only this instance's glass is replaced.
 * Environment-based highlights, not expensive screen-space transmission. */
export function useMallMaterials(source:Group){
  const result=useMemo(()=>{
    const scene=source.clone(true);
    const glass=new MeshPhysicalMaterial({
      name:'Mall low-iron glazing',color:'#d4e8e7',metalness:0,roughness:.075,
      transparent:true,opacity:.22,depthWrite:false,side:2,
      clearcoat:1,clearcoatRoughness:.08,ior:1.5,envMapIntensity:1.1,
    });
    scene.traverse(o=>{
      if(!(o instanceof Mesh))return;
      const replace=(m:MeshStandardMaterial)=>/Architectural clear glazing|^(?:.*::)?(?:Glass|Tenant glass)$/i.test(m.name)?glass:m;
      o.material=Array.isArray(o.material)?o.material.map(replace):replace(o.material);
    });
    return {scene,glass};
  },[source]);
  useEffect(()=>()=>result.glass.dispose(),[result]);
  return result.scene;
}
