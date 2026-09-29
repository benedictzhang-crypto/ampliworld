import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Raycaster, Vector3 } from 'three';
import { finishParkSurfaces, parkPathHeight } from '../app/world-client/park-surfaces.ts';

const data=readFileSync(new URL('../public/assets/3d/ampliworld/GC-AMUSEMENT-001/amusement-park.glb',import.meta.url));
const {scene}=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
scene.updateMatrixWorld(true);
const ray=new Raycaster();
for(const [x,z] of [[8,432],[-8,414],[0,290],[-315,-80],[350,-150],[290,331]]){
  ray.set(new Vector3(x,2,z),new Vector3(0,-1,0));
  const top=ray.intersectObject(scene,true).find(h=>h.point.y<.4)?.point.y;
  assert.ok(top!==undefined,`Missing surface at ${x},${z}`);
  assert.ok(Math.abs(top-parkPathHeight(x,z))<.015,`Physics/mesh mismatch at ${x},${z}: ${top}`);
}
let sourcePaving;
scene.traverse(o=>{if(o.isMesh&&o.material.name==='paving')sourcePaving=o;});
const originalGeometry=sourcePaving.geometry,originalMaterial=sourcePaving.material;
const finished=finishParkSurfaces(scene);
let paving;
finished.scene.traverse(o=>{if(o.isMesh&&o.material.name==='paving')paving=o;});
assert.notEqual(paving.geometry,originalGeometry);
assert.notEqual(paving.material,originalMaterial);
assert.ok(paving.material.map);
assert.equal(originalMaterial.map,null,'Do not mutate the GLTF cache');
assert.equal(paving.geometry.getAttribute('uv').count,paving.geometry.getAttribute('position').count);
finished.dispose();
console.log('Park surface checks passed: six mesh/physics probes, metre-scale paving UVs, isolated resources.');
