/** Original AmpliWorld marina. METRES, Y up, local origin [6500,0,13200]. */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { writeFile } from 'node:fs/promises';
if(!globalThis.FileReader)globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}};
const dir=new URL('../../public/assets/3d/ampliworld/GC-MARINA-001/',import.meta.url), scene=new T.Scene(),buckets={},colliders=[],surfaces=[],ramps=[],berths=[];
const palette={ivory:0xeae7dc,stone:0xadb8b7,teak:0x997451,dark:0x1d3443,glass:0x6b9aa8,gold:0xb7a171,light:0xffdfa2,navy:0x18344e,water:0x58a4b0,leaf:0x54795b};
const mats=Object.fromEntries(Object.entries(palette).map(([k,c])=>[k,new T.MeshStandardMaterial({name:k,color:c,roughness:k==='glass'?.2:.6,metalness:['glass','gold','dark'].includes(k)?.5:.06})]));
mats.light.emissive=new T.Color(0xffc982);mats.light.emissiveIntensity=.7;
function add(g,m,x=0,y=0,z=0){g.translate(x,y,z);if(g.index)g=g.toNonIndexed();delete g.attributes.uv;(buckets[m]??=[]).push(g);}
function box(m,x,y,z,w,h,d,solid=false,id=m){add(new T.BoxGeometry(w,h,d),m,x,y,z);if(solid)colliders.push({id:`${id}-${colliders.length}`,min:[x-w/2,y-h/2,z-d/2],max:[x+w/2,y+h/2,z+d/2]});}
function cyl(m,x,y,z,r,h){add(new T.CylinderGeometry(r,r,h,8),m,x,y,z);}
function deck(id,x,z,w,d,y=-6.9,m='teak'){box(m,x,y-.17,z,w,.34,d);surfaces.push({id,min:[x-w/2,z-d/2],max:[x+w/2,z+d/2],y});}
function rail(x1,z1,x2,z2,y){const dx=x2-x1,dz=z2-z1,L=Math.hypot(dx,dz);const g=new T.BoxGeometry(L,.08,.08);g.rotateY(-Math.atan2(dz,dx));add(g,'dark',(x1+x2)/2,y+1.05,(z1+z2)/2);for(let t=0;t<=L;t+=3)cyl('dark',x1+dx*t/L,y+.54,z1+dz*t/L,.035,1.08);}
const segs=['abcedf','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'];
function label(text,x,z){box('navy',x,-6.71,z,1.75,.08,.8);for(let i=0;i<text.length;i++){let cx=x-.52+i*.5;for(const s of segs[Number(text[i])]){const p={a:[0,-.25,.29,.04],g:[0,0,.29,.04],d:[0,.25,.29,.04],f:[-.15,-.125,.04,.2],b:[.15,-.125,.04,.2],e:[-.15,.125,.04,.2],c:[.15,.125,.04,.2]}[s];box('ivory',cx+p[0],-6.662,z+p[1],p[2],.012,p[3]);}}}
// Dry-bank arrival court and continuous harbor promenade, safely north of coast.
deck('arrival-court',0,-93,162,84,.18,'stone');deck('coast-promenade',0,-8,510,14,.18,'stone');
deck('hotel-front-terrace',0,-30,150,28,.18,'teak');
for(const x of [-244,244])rail(x,-14,x,-1,.18);
rail(-255,-1,-8,-1,.18);rail(8,-1,255,-1,.18);
// Main public gangway: 7.08m fall over 96m, 1:13.56 slope, railings follow slope.
const ramp={id:'public-gangway',min:[-4,-1],max:[4,95],axis:'z',startY:.18,endY:-6.9};ramps.push(ramp);
const rg=new T.BoxGeometry(8,.3,Math.hypot(96,7.08));rg.rotateX(Math.atan2(7.08,96));add(rg,'teak',0,-3.51,47);
for(const x of [-4,4]){for(let j=0;j<33;j++){const z=-1+j*3,y=.18-(z+1)/96*7.08;cyl('dark',x,y+.55,z,.045,1.1);}const g=new T.BoxGeometry(.07,.07,Math.hypot(96,7.08));g.rotateX(Math.atan2(7.08,96));add(g,'dark',x,-2.23,47);}
deck('head-pier',0,100,500,10);rail(-250,95,-5,95,-6.9);rail(5,95,250,95,-6.9);
// Five 4m access piers, 15 paired berths each. 26m-long / 10.6m-clear berths.
for(let p=0;p<5;p++){const x=(p-2)*96;deck(`pier-${p+1}`,x,201,4,192);for(let j=0;j<=15;j++){const z=109+j*12;for(const side of [-1,1]){deck(`finger-${p+1}-${j}-${side}`,x+side*15,z,26,1.4);cyl('dark',x+side*27,-7.1,z,.16,3.8);cyl('gold',x+side*5,-6.58,z,.1,.64);}}
for(let j=0;j<15;j++)for(const side of [-1,1]){const id=String(berths.length+1).padStart(3,'0'),z=115+j*12,cx=x+side*15,L=[14,18,22][(j+p)%3],occupied=(j+p+(side===1?1:0))%3!==0;berths.push({id:`YB-${id}`,pier:p+1,side:side<0?'west':'east',center:[cx,-8,z],length:26,width:10.6,maxYachtLength:24,occupied,yachtLength:occupied?L:null});label(id,x+side*.98,z);box('ivory',x+side*1.2,-6.44,z-2,.4,.9,.36,true,'service-pedestal');box('light',x+side*1.2,-6.03,z-1.81,.2,.1,.03);}}
// Separate shared geometry yachts, hull shaped with chine/rake sections, not boxes/billboards.
function yachtPrototype(L,index){const group=new T.Group(),W=L*.24,H=L*.065;const sections=[[-L*.5,.30,.62],[-L*.32,.49,.96],[L*.23,.5,1],[L*.43,.28,.92],[L*.5,.025,.64]],verts=[],idx=[];for(const [x,w,h]of sections)verts.push(x,-H*.65,0,x,-H*.28,-W*w*.78,x,H*h*.45,-W*w,x,H*h*.45,W*w,x,-H*.28,W*w*.78);for(let j=0;j<sections.length-1;j++)for(let k=0;k<5;k++){const a=j*5+k,b=j*5+(k+1)%5,c=a+5,d=b+5;idx.push(a,b,c,b,d,c);}for(const end of [0,4])for(let k=1;k<4;k++)idx.push(end*5,end*5+k,end*5+k+1);let hull=new T.BufferGeometry();hull.setAttribute('position',new T.Float32BufferAttribute(verts,3));hull.setIndex(idx);hull.computeVertexNormals();group.add(new T.Mesh(hull,mats[index===1?'navy':'ivory']));
function part(m,x,y,z,w,h,d){const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mats[m]);mesh.position.set(x,y,z);group.add(mesh);}
part('teak',-L*.05,H*.46,0,L*.75,.09,W*.76);part('ivory',-L*.07,H*.95,0,L*.44,H*.95,W*.69);part('glass',-L*.04,H*1.08,0,L*.4,H*.45,W*.702);part('ivory',-L*.10,H*1.47,0,L*.5,.17,W*.77);part('dark',L*.145,H*1.13,0,.1,H*.5,W*.63);part('ivory',-L*.17,H*1.81,0,L*.24,.13,W*.6);part('gold',-L*.11,H*2.03,0,.12,H*.5,.12);part('dark',-L*.11,H*2.26,0,L*.12,.06,.06);part('ivory',-L*.43,H*.66,0,L*.12,.23,W*.48);for(const s of [-1,1]){part('dark',L*.05,H*.75,s*W*.37,L*.72,.045,.045);for(let j=0;j<7;j++)part('dark',-L*.3+j*L*.105,H*.6,s*W*.37,.035,H*.3,.035);for(let j=0;j<4;j++)part('dark',-L*.3+j*L*.17,H*.12,s*W*.505,.22,.48,.16);}return group;}
const yachts=[14,18,22].map(yachtPrototype);
for(let p=0;p<3;p++){
  const bs=berths.filter(b=>b.occupied&&b.yachtLength===[14,18,22][p]),parts={};
  yachts[p].updateMatrixWorld(true);
  for(const mesh of yachts[p].children){let g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);if(g.index)g=g.toNonIndexed();delete g.attributes.uv;(parts[mesh.material.name]??=[]).push(g);}
  for(const [name,geos]of Object.entries(parts)){const inst=new T.InstancedMesh(mergeGeometries(geos),mats[name],bs.length);inst.name=`${[14,18,22][p]}m yacht ${name} fleet`;inst.userData.berthIds=bs.map(b=>b.id);for(let i=0;i<bs.length;i++){const b=bs[i],mt=new T.Matrix4().compose(new T.Vector3(...b.center),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),b.side==='west'?Math.PI:0),new T.Vector3(1,1,1));inst.setMatrixAt(i,mt);}inst.computeBoundingBox();scene.add(inst);}
}
for(const b of berths)if(b.occupied)colliders.push({id:`yacht-${b.id}`,min:[b.center[0]-b.yachtLength*.5,-8.6,b.center[2]-b.yachtLength*.125],max:[b.center[0]+b.yachtLength*.5,-4.6,b.center[2]+b.yachtLength*.125]});
// Three-storey waterfront yacht hotel: expressed columns, glazed bays, balconies.
for(const wing of [{x:0,z:-64,w:144,d:26},{x:-62,z:-99,w:20,d:44},{x:62,z:-99,w:20,d:44}]){box('stone',wing.x,.43,wing.z,wing.w,.5,wing.d,true,'hotel-plinth');for(let f=0;f<3;f++){const y=.68+f*4.2;box('ivory',wing.x,y+.15,wing.z,wing.w,.3,wing.d,true,'hotel-floor');box('glass',wing.x,y+2.1,wing.z,wing.w-1,3.6,wing.d-1,true,'hotel-envelope');for(let x=wing.x-wing.w/2+1;x<=wing.x+wing.w/2;x+=6)for(const zz of [wing.z-wing.d/2,wing.z+wing.d/2])box('ivory',x,y+2.1,zz,.36,3.9,.4);box('ivory',wing.x,y+4.03,wing.z,wing.w+1,.24,wing.d+1);}box('stone',wing.x,13.4,wing.z,wing.w+2,.44,wing.d+2);}
for(let f=0;f<3;f++)for(let i=0;i<24;i++){const x=-69+i*6,y=.98+f*4.2;box('teak',x,y,-48.6,5.65,.16,4.4);box('glass',x,y+.64,-46.4,5.5,1.15,.08);box('gold',x,y+1.23,-46.4,5.65,.06,.07);for(const s of [-1,1])box('ivory',x+s*2.86,y+.72,-48.7,.13,1.6,4.5);box('dark',x,y+.6,-49.1,1.2,.13,.65);box('teak',x+1.1,y+.3,-48.9,.5,.6,.5);}
// Lobby portico, rooftop lounge/pergola, reflecting pool and promenade furniture.
box('ivory',0,4.1,-82,30,.4,10);for(const x of [-13,-7,7,13])box('gold',x,2,-85,.24,4,.24);
for(let x=-24;x<=24;x+=4)box('teak',x,16.1,-65,.14,.3,18);for(const x of [-24,24])for(const z of [-73,-57])box('gold',x,14.8,z,.2,2.6,.2);
box('stone',0,.31,-28,44,.26,13);box('water',0,.455,-28,41,.025,10);for(const x of [-31,31])for(let j=0;j<5;j++){box('ivory',x,.55,-35+j*3,2.2,.5,.9);box('teak',x,.83,-35+j*3,2.3,.12,1);}
for(let x=-228;x<=228;x+=24){for(const z of [-9,100]){cyl('dark',x,z<0?2.18:-4.9,z,.075,4);box('light',x,z<0?4.18:-2.9,z,.5,.18,.5);}box('stone',x,.68,-17,3,1,2);add(new T.SphereGeometry(1.5,8,5),'leaf',x,1.8,-17);}
for(const [m,geos]of Object.entries(buckets)){const mesh=new T.Mesh(mergeGeometries(geos),mats[m]);mesh.name=`Marina ${m}`;scene.add(mesh);}
scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(scene);let triangles=0;scene.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});
const buffer=await new GLTFExporter().parseAsync(scene,{binary:true});await writeFile(new URL('marina-yacht-hotel.glb',dir),Buffer.from(buffer));
const manifest={id:'GC-MARINA-001',name:'Eastwater Yacht Marina & Hotel',nameZh:'东湾游艇港酒店',units:'METERS',upAxis:'Y',absoluteCoordinates:false,origin:[6500,0,13200],file:'marina-yacht-hotel.glb',bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},colliders,surfaces,ramps,berths,berthCount:berths.length,dockedYachtCount:berths.filter(b=>b.occupied).length,hotel:{storeys:3,balconyBays:72,interiors:false},hydrology:{seaY:-8,coastZ:13200},triangles,bytes:buffer.byteLength,provenance:{type:'ORIGINAL_PROCEDURAL_GEOMETRY',externalAssets:[],textures:[],license:'Project-original'},limitations:['Polished original low-poly first slice, not AAA finish.','Hotel exterior only; rooms are not enterable.','Yachts static; no sailing simulation.','Ramp requires sloped ground-height integration; not a flat surface.','Berth labels are original horizontal 3D segment numerals.','Site integration and walking QA must be performed by main agent.']};
if(berths.length!==150)throw Error('Expected exactly 150 berths');await writeFile(new URL('marina-manifest.json',dir),JSON.stringify(manifest));console.log(JSON.stringify({path:dir.pathname,triangles,bytes:buffer.byteLength,berths:berths.length,yachts:manifest.dockedYachtCount,bounds:manifest.bounds,surfaces:surfaces.length,colliders:colliders.length}));
