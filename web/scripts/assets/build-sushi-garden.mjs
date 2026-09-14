/** Original, metre-scale Mori garden and 12-bay parking court. Coordinates relative to restaurant. */
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {mkdir,writeFile} from 'node:fs/promises';
if(!globalThis.FileReader)globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}};
const out=new URL('../../public/assets/3d/ampliworld/GC-SUSHI-GARDEN-001/',import.meta.url);
const palette={slate:0x68716d,pale:0xb8b8a7,gravel:0xd2ccb9,moss:0x657856,pine:0x3a5946,maple:0xa75c48,wood:0x6d5742,dark:0x353e40,white:0xe4dfc9,light:0xf4cd89};
const materials=Object.fromEntries(Object.entries(palette).map(([name,color])=>[name,new T.MeshStandardMaterial({name,color,roughness:.86})]));
materials.light.emissive=new T.Color(0xffc880);materials.light.emissiveIntensity=.65;
const buckets={},colliders=[],surfaces=[],bays=[];
function add(g,m,x=0,y=0,z=0){g.translate(x,y,z);if(g.index)g=g.toNonIndexed();delete g.attributes.uv;(buckets[m]??=[]).push(g);}
function box(m,x,y,z,w,h,d,solid=false,id=m){add(new T.BoxGeometry(w,h,d),m,x,y,z);if(solid)colliders.push({id:`${id}-${colliders.length}`,min:[x-w/2,y-h/2,z-d/2],max:[x+w/2,y+h/2,z+d/2]});}
function floor(m,x,z,w,d,y=.17){box(m,x,y/2,z,w,y,d);surfaces.push({min:[x-w/2,z-d/2],max:[x+w/2,z+d/2],y});}
function branch(a,b,r){const from=new T.Vector3(...a),to=new T.Vector3(...b),direction=to.clone().sub(from),g=new T.CylinderGeometry(r*.65,r,direction.length(),7);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize()));add(g,'wood',(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);}
function rock(x,z,s=1){const g=new T.IcosahedronGeometry(1,1);g.scale(.7*s,.48*s,.53*s);g.rotateY(x*.43);add(g,'slate',x,.17+.3*s,z);colliders.push({id:`garden-rock-${colliders.length}`,min:[x-.65*s,.17,z-.5*s],max:[x+.65*s,.17+.78*s,z+.5*s]});}
function crown(m,x,y,z,rx,ry,rz){const g=new T.SphereGeometry(1,10,6);g.scale(rx,ry,rz);add(g,m,x,y,z);}
function pine(x,z,scale=1,maple=false){branch([x,.17,z],[x+.22,3.2*scale,z],.15*scale);colliders.push({id:`garden-tree-${colliders.length}`,min:[x-.24,.17,z-.24],max:[x+.4,3.2*scale,z+.24]});for(let j=0;j<5;j++){const a=j*2.4,bx=x+Math.cos(a)*(1+j%2*.4)*scale,bz=z+Math.sin(a)*1.1*scale,y=(1.65+j*.38)*scale;branch([x,1+j*.2,z],[bx,y,bz],.065*scale);crown(maple?'maple':'pine',bx,y+.2,bz,(maple?1:1.2)*scale,.42*scale,.85*scale);}}
function lantern(x,z){box('slate',x,.26,z,.55,.18,.55,true,'lantern-base');box('pale',x,.62,z,.19,.62,.19,true,'lantern-stem');box('light',x,1.04,z,.32,.3,.32);for(const dx of [-.2,.2])for(const dz of [-.2,.2])box('slate',x+dx,1.04,z+dz,.06,.42,.06);const roof=new T.ConeGeometry(.47,.22,4);roof.rotateY(Math.PI/4);add(roof,'slate',x,1.38,z);}
// Disjoint garden beds keep a continuous, level circulation ring around the enlarged building.
floor('moss',-16,0,8,36,.1);floor('moss',16,0,8,36,.1);floor('moss',0,-16,24,8,.1);
for(const x of [-15.4,15.4])floor('gravel',x,-1,2.8,30,.17);
floor('gravel',0,-14.7,33.6,2.8,.17);
floor('gravel',0,13,37,6,.17);
floor('slate',0,18,5,6,.17);
floor('slate',26.7,13,23.4,3.6,.17);
// Individual slate slabs, visible bevels and joints; surfaces are registered at the slab tops.
for(let z=-14;z<=12;z+=1.4)for(const x of [-15.4,15.4]){box('slate',x,.182,z,2.3,.024,1.15);surfaces.push({min:[x-1.15,z-.575],max:[x+1.15,z+.575],y:.194});}
for(let x=-14;x<=14;x+=1.5){box('slate',x,.182,-14.7,1.23,.024,2.25);box(x%3?'slate':'pale',x,.182,13,1.23,.024,2.25);}
for(let z=9.2;z<20;z+=1.25){box('pale',0,.184,z,3.7,.028,1.06);surfaces.push({min:[-1.85,z-.53],max:[1.85,z+.53],y:.198});}
// Low stone-and-timber boundary, open guest gate and separate side pedestrian gate.
for(const x of [-19.4,19.4]){for(const [z,d] of x<0?[[0,38]]:[[-4,28],[18,2]]){box('slate',x,.53,z,.32,.8,d,true,'garden-wall');for(let p=z-d/2+.4;p<z+d/2;p+=.6)box('wood',x,1.12,p,.1,.55,.075);}}
box('slate',0,.53,-19,38.8,.8,.32,true,'rear-garden-wall');
for(const x of [-11.2,11.2])box('slate',x,.53,18.5,16.4,.8,.32,true,'front-garden-wall');
for(const x of [-2.8,2.8]){box('wood',x,1.75,18.5,.24,3.15,.24,true,'garden-gate-post');}
box('dark',0,3.4,18.5,6.2,.24,.7,true,'garden-gate-lintel');
for(const [x,z,s,m] of [[-17.5,-12,.9,0],[-17.4,2,1,0],[-17.2,10,.75,1],[17.4,-10,.85,0],[17.4,2,.8,1],[-8,-17.2,.75,0],[7,-17.2,.85,1]])pine(x,z,s,!!m);
for(const [x,z] of [[-17,-6],[17,-4],[-8,-17],[10,-17],[-11,15],[11,15]]){rock(x,z,.9);rock(x+.85,z+.4,.5);lantern(x-.6,z+(z<-15?-.8:1.7));}
// Bamboo and dry-garden raked lines add close-range structure rather than billboard foliage.
for(const side of [-1,1])for(let i=0;i<8;i++){const x=side*(17.8+(i%2)*.35),z=-16+i*.38;branch([x,.17,z],[x+.1,2.8+(i%3)*.25,z],.045);for(let h=1;h<2.8;h+=.55)crown('pine',x+side*.2,h,z,.3,.07,.13);}
for(const x of [-8,8]){floor('gravel',x,15.6,5,2.3,.14);for(let j=0;j<9;j++)box('pale',x,.146,14.7+j*.2,4.8,.008,.035);}
// 12 bays in two banks of six; 8m clear manoeuvring aisle and independent road connection.
floor('dark',34,-2,24,26,.06);floor('dark',34,24,8,26,.06);
for(const side of [-1,1])for(let row=0;row<6;row++){
  const x=34+side*7.8,z=-11+row*3.6,id=`MS-${String(bays.length+1).padStart(2,'0')}`;
  bays.push({id,x,z,width:3.3,length:5.8,heading:side>0?-Math.PI/2:Math.PI/2});
  for(const dz of [-1.65,1.65])box('white',x,.074,z+dz,5.8,.015,.09);
  box('white',x+side*2.9,.074,z,.09,.015,3.3);
  box('pale',x+side*2.55,.15,z,.18,.18,1.7,true,'parking-wheel-stop');
  // Six raised tally positions on each bay end identify rows without texture text.
  for(let n=0;n<=row;n++)box('white',x-side*2.2,.078,z-.5+n*.16,.26,.02,.07);
}
for(const x of [22,46])box('slate',x,.16,-2,.22,.2,26,true,'parking-edge');
box('slate',34,.16,-15,24,.2,.22,true,'parking-edge');
for(let z=12;z<35;z+=5)box('white',34,.074,z,.12,.012,2);
// Guest crossing from parking to garden stays clear of the aisle and vehicle entrance.
for(let x=24;x<=38;x+=1.4)box('white',x,.181,13,.7,.015,2.7);
const scene=new T.Group();scene.name='GC-SUSHI-GARDEN-001';let triangles=0;
for(const [m,gs]of Object.entries(buckets)){const g=mergeVertices(mergeGeometries(gs,false));triangles+=(g.index?.count||g.attributes.position.count)/3;scene.add(new T.Mesh(g,materials[m]));}
const bounds=new T.Box3().setFromObject(scene),data=await new GLTFExporter().parseAsync(scene,{binary:true});
await mkdir(out,{recursive:true});await writeFile(new URL('garden.glb',out),Buffer.from(data));
await writeFile(new URL('garden-manifest.json',out),JSON.stringify({id:scene.name,units:'METERS',triangles,drawCalls:scene.children.length,bytes:data.byteLength,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},colliders,surfaces,parking:{bays,capacity:12,aisleWidth:8,roadEntry:[34,37],guestWalk:[0,20]},provenance:{creator:'AmpliWorld',type:'ORIGINAL_PROCEDURAL_GEOMETRY',externalAssets:[]}},null,2)+'\n');
console.log(JSON.stringify({id:scene.name,triangles,drawCalls:scene.children.length,parking:bays.length}));
