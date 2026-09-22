/** Original metric airport and high-speed rail hubs. No imported meshes or image textures. */
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {mkdir,writeFile} from 'node:fs/promises';
if(!globalThis.FileReader)globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}};
const OUT=new URL('../../public/assets/3d/ampliworld/',import.meta.url).pathname;
const palette={concrete:0xa8aaa5,stone:0xd5d1c6,dark:0x30383d,glass:0x7e9da4,steel:0x626b70,white:0xe7e6df,blue:0x47718a,gold:0xb39358,road:0x43484a,mark:0xe8e2c9,green:0x56705a,red:0xb5524b};
const materials=Object.fromEntries(Object.entries(palette).map(([name,color])=>[name,new T.MeshStandardMaterial({name,color,roughness:name==='glass'?.18:name==='road'?.95:.68,metalness:['steel','gold'].includes(name)?.55:.04})]));
materials.glass.transparent=true;materials.glass.opacity=.48;materials.glass.depthWrite=false;materials.glass.side=T.DoubleSide;
function kit(id,name){
 const scene=new T.Scene(),buckets={},colliders=[],surfaces=[];
 function add(g,m,x=0,y=0,z=0,rx=0,ry=0,rz=0){g.rotateX(rx);g.rotateY(ry);g.rotateZ(rz);g.translate(x,y,z);if(g.index)g=g.toNonIndexed();delete g.attributes.uv;(buckets[m]??=[]).push(g);}
 function box(m,x,y,z,w,h,d,solid=false,label=m,ry=0){add(new T.BoxGeometry(w,h,d),m,x,y,z,0,ry,0);if(solid){const ex=Math.abs(Math.cos(ry))*w/2+Math.abs(Math.sin(ry))*d/2,ez=Math.abs(Math.sin(ry))*w/2+Math.abs(Math.cos(ry))*d/2;colliders.push({id:`${label}-${colliders.length}`,min:[x-ex,y-h/2,z-ez],max:[x+ex,y+h/2,z+ez]});}}
 function cyl(m,x,y,z,r,h,n=20,rx=0,ry=0,rz=0){add(new T.CylinderGeometry(r,r,h,n),m,x,y,z,rx,ry,rz);}
 function surface(id,min,max,y=.1){surfaces.push({id,min,max,y});}
 async function finish(extra){for(const[m,gs]of Object.entries(buckets)){const geo=mergeVertices(mergeGeometries(gs));geo.computeBoundingBox();geo.computeBoundingSphere();const mesh=new T.Mesh(geo,materials[m]);mesh.name=`${name}: ${m}`;mesh.castShadow=!['road','mark','glass'].includes(m);mesh.receiveShadow=true;scene.add(mesh);}scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(scene);let triangles=0;scene.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});const data=await new GLTFExporter().parseAsync(scene,{binary:true});const dir=`${OUT}/${id}`;await mkdir(dir,{recursive:true});await writeFile(`${dir}/model.glb`,Buffer.from(data));const manifest={id,name,file:'model.glb',units:'METERS',upAxis:'Y',bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},colliders,surfaces,triangles,bytes:data.byteLength,provenance:{type:'ORIGINAL_PROCEDURAL_GEOMETRY',externalAssets:[],externalImages:[],license:'Project-original'},...extra};await writeFile(`${dir}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({id,triangles,bytes:data.byteLength,colliders:colliders.length,surfaces:surfaces.length}));}
 return {add,box,cyl,surface,finish};
}
function aircraft(k,x,z,yaw=0){const {add,box,cyl}=k;cyl('white',x,3.2,z,2.05,34,24,0,0,Math.PI/2+yaw);add(new T.SphereGeometry(2.05,18,12),'white',x+Math.cos(yaw)*17,3.2,z-Math.sin(yaw)*17);box('blue',x,3.25,z,4.4,.35,38,false,'wing',yaw+Math.PI/2);box('white',x-Math.cos(yaw)*13,6.1,z+Math.sin(yaw)*13,.45,6.5,8,false,'tail',yaw);for(const s of [-1,1])cyl('dark',x+s*Math.sin(yaw)*4.2,1.25,z+s*Math.cos(yaw)*4.2,.65,1.1,14,Math.PI/2,0,0);}
async function airport(){const k=kit('GC-AIRPORT-001','AmpliWorld International Airport'),{box,cyl,surface}=k;
 box('road',0,.04,-245,1450,.08,62);surface('runway',[-725,-276],[725,-214],.08);for(let x=-680;x<=680;x+=40)box('mark',x,.095,-245,18,.03,1.2);for(const z of [-273,-217])box('mark',0,.1,z,1400,.035,.35);
 box('road',0,.05,-150,1320,.1,25);surface('taxiway',[-660,-163],[660,-137],.1);for(let x=-620;x<=620;x+=32)cyl('gold',x,.14,-150,.11,.08,8);
 box('concrete',0,.08,10,760,.16,210);surface('apron',[-380,-95],[380,115],.16);
 // Three-dimensional terminal with a central hall, two concourses and true door gaps.
 box('stone',0,15,145,330,30,78,true,'terminal-main');box('glass',0,15,105.8,280,22,.16);box('steel',0,30.3,145,340,.6,84);
 for(const x of [-240,240]){box('stone',x,10,45,250,20,42,true,'concourse');box('glass',x,10,23.9,220,13,.14);box('steel',x,20.3,45,258,.55,46);for(const gx of [-90,-45,0,45,90]){box('glass',x+gx,5,15,20,8,.16);box('steel',x+gx,4,0,4,3,30,true,'jetbridge');}}
 for(const x of [-130,-65,0,65,130]){box('gold',x,8,105.5,.45,16,.5);box('dark',x,3.6,105.2,8,5,.7,true,'terminal-door');}
 // Control tower, parking decks and service hangars.
 cyl('concrete',360,24,150,6,48,20);cyl('glass',360,50,150,14,6,20);cyl('steel',360,54,150,15,.7,20);
 box('concrete',-285,9,180,190,18,90,true,'parking-deck');for(let y=3;y<17;y+=5)box('dark',-285,y,134.8,170,.35,.2);
 for(const x of [-420,430]){box('steel',x,14,-55,150,28,80,true,'hangar');box('dark',x,10,-14.8,110,18,.3);}
 for(const [x,z,y] of [[-210,5,0],[-40,2,.06],[175,2,-.05]])aircraft(k,x,z,y);
 // Airside buses, baggage tractors and original runway approach lights.
 for(const x of [-300,-120,80,280]){box('blue',x,1.6,80,10,3,3);for(const s of [-1,1])cyl('dark',x+s*3.2,.55,78.6,.48,.35,12,Math.PI/2);}
 for(let x=-700;x<=700;x+=35)for(const z of [-286,-204])cyl('red',x,.18,z,.1,.12,8);
 return k.finish({category:'AIRPORT',runways:1,terminal:{levels:3,checkInHall:true,securityHall:true,airsideConcourse:true,interiors:'structural shell only'},gates:10,aircraft:3,staffCapacity:1800,limitations:['Static aircraft and service vehicles; flight and baggage simulations are future systems.','Terminal structural volumes and doors are physical; detailed shops and individual check-in counters remain future assets.']});}
function train(k,x,z,yaw=0,cars=8){const {box}=k;for(let i=0;i<cars;i++){const px=x+Math.cos(yaw)*(i-(cars-1)/2)*22,pz=z-Math.sin(yaw)*(i-(cars-1)/2)*22;box('white',px,2.4,pz,20,4.6,3.4,false,'train-car',yaw);box('blue',px,3,pz,17,.8,3.44,false,'train-window',yaw);}}
async function hsr(id,name,variant=0){const k=kit(id,name),{box,cyl,surface}=k,w=variant?260:300,d=variant?92:110;
 box('concrete',0,.08,0,w,.16,d);surface('station-plaza',[-w/2,-d/2],[w/2,d/2],.16);
 // Four tracks and two island platforms pass through a high vaulted hall.
 for(const z of [-27,-18,18,27]){box('steel',0,.24,z,w+180,.16,.18);box('steel',0,.24,z+.9,w+180,.16,.18);for(let x=-w/2-80;x<w/2+80;x+=3)box('concrete',x,.12,z+.45,1.8,.16,2.2);}
 for(const z of [-22.5,22.5]){box('stone',0,.42,z,w-20,.52,7);surface(`platform-${z}`,[-w/2+10,z-3.5],[w/2-10,z+3.5],.68);for(let x=-w/2+15;x<w/2-10;x+=20){box('steel',x,4.7,z,.4,8,.4,true,'canopy-column');box('glass',x,8.7,z,20,.28,10);}}
 box('stone',0,10,0,w*.58,20,d-18,true,'station-hall');box('glass',0,10,d/2-9.1,w*.48,14,.16);box('steel',0,20.4,0,w*.62,.8,d-12);
 for(const x of [-w*.22,-w*.11,0,w*.11,w*.22])box('dark',x,3.5,d/2-8.8,8,6,.8,true,'station-door');
 for(const x of [-w*.32,w*.32]){cyl('steel',x,8,0,.45,15,12);box('glass',x,15.7,0,24,.35,d-2);}
 train(k,-10,-27,0,8);train(k,8,27,Math.PI,8);
 // Taxi/bus forecourt, bicycle bays and planted civic edge.
 box('road',0,.04,d/2+32,w*.9,.08,32);surface('forecourt',[-w*.45,d/2+16],[w*.45,d/2+48],.08);for(const x of [-w*.38,-w*.22,w*.22,w*.38])box('blue',x,1.55,d/2+32,12,3,3);
 for(let x=-w*.42;x<=w*.42;x+=24){box('concrete',x,.5,-d/2-7,5,1,5);addTree(k,x,-d/2-7);}
 return k.finish({category:'HIGH_SPEED_RAIL',platforms:2,tracks:4,trains:2,staffCapacity:variant?280:420,entrances:[[-w*.22,0,d/2-8.5],[0,0,d/2-8.5],[w*.22,0,d/2-8.5]],limitations:['Static trains; timetable, boarding and rail signaling are future systems.','Platforms, halls, columns, doors and forecourt are physical geometry.']});}
function addTree(k,x,z){k.cyl('dark',x,2,z,.22,4,8);k.add(new T.IcosahedronGeometry(2,1),'green',x,5,z);}
await mkdir(OUT,{recursive:true});await airport();await hsr('GC-HSR-001','Grand Central High-Speed Rail',0);await hsr('GC-HSR-002','East City High-Speed Rail',1);
