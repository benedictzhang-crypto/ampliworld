/** Original metric hospital and school campuses. No imported meshes or image textures. */
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {mkdir,writeFile} from 'node:fs/promises';

if(!globalThis.FileReader)globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}};

const OUT=new URL('../../public/assets/3d/ampliworld/',import.meta.url).pathname;
const palette={
  concrete:0xb5b3aa,limestone:0xd8d3c7,white:0xe8e7e1,dark:0x2e373a,
  glass:0x7294a0,steel:0x657078,red:0xb64b4c,blue:0x446f8d,
  gold:0xb2945d,road:0x414749,mark:0xeae4d1,green:0x526f57,
  turf:0x47734e,track:0xa65b49,wood:0x98765d,ambulance:0xf3f2eb,
};
const materials=Object.fromEntries(Object.entries(palette).map(([name,color])=>[name,new T.MeshStandardMaterial({
  name,color,roughness:name==='glass'?.16:name==='road'?.96:name==='steel'?.38:.7,
  metalness:['steel','gold'].includes(name)?.52:.03,
})]));
materials.glass.transparent=true;materials.glass.opacity=.48;materials.glass.depthWrite=false;materials.glass.side=T.DoubleSide;

function campus(id,name){
  const scene=new T.Scene(),buckets={},colliders=[],surfaces=[];
  function add(geometry,material,x=0,y=0,z=0,rx=0,ry=0,rz=0){
    geometry.rotateX(rx);geometry.rotateY(ry);geometry.rotateZ(rz);geometry.translate(x,y,z);
    if(geometry.index)geometry=geometry.toNonIndexed();delete geometry.attributes.uv;
    (buckets[material]??=[]).push(geometry);
  }
  function box(material,x,y,z,w,h,d,solid=false,label=material,ry=0){
    add(new T.BoxGeometry(w,h,d),material,x,y,z,0,ry,0);
    if(solid){
      const ex=Math.abs(Math.cos(ry))*w/2+Math.abs(Math.sin(ry))*d/2;
      const ez=Math.abs(Math.sin(ry))*w/2+Math.abs(Math.cos(ry))*d/2;
      colliders.push({id:`${label}-${colliders.length}`,min:[x-ex,y-h/2,z-ez],max:[x+ex,y+h/2,z+ez]});
    }
  }
  function cyl(material,x,y,z,r,h,segments=20,rx=0,ry=0,rz=0){add(new T.CylinderGeometry(r,r,h,segments),material,x,y,z,rx,ry,rz);}
  function surface(id,min,max,y=.1){surfaces.push({id,min,max,y});}
  function tree(x,z,scale=1){cyl('dark',x,2.1*scale,z,.24*scale,4.2*scale,8);add(new T.IcosahedronGeometry(2.25*scale,1),'green',x,5.3*scale,z);}
  function windows(cx,cz,w,h,levels,columns,side='south',base=3.2){
    for(let level=0;level<levels;level++)for(let col=0;col<columns;col++){
      const y=base+level*(h/levels),span=w/columns;
      if(side==='south')box('glass',cx-w/2+span*(col+.5),y,cz+.03,span*.62,1.8,.14);
      else box('glass',cx+.03,y,cz-w/2+span*(col+.5),.14,1.8,span*.62);
    }
  }
  async function finish(extra){
    for(const [material,geometries] of Object.entries(buckets)){
      const geometry=mergeVertices(mergeGeometries(geometries));geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const mesh=new T.Mesh(geometry,materials[material]);mesh.name=`${name}: ${material}`;
      mesh.castShadow=!['road','mark','glass','turf','track'].includes(material);mesh.receiveShadow=true;scene.add(mesh);
    }
    scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(scene);let triangles=0;
    scene.traverse(object=>{if(object.isMesh)triangles+=(object.geometry.index?.count??object.geometry.attributes.position.count)/3;});
    const data=await new GLTFExporter().parseAsync(scene,{binary:true});const dir=`${OUT}/${id}`;await mkdir(dir,{recursive:true});
    await writeFile(`${dir}/model.glb`,Buffer.from(data));
    const manifest={id,name,file:'model.glb',units:'METERS',upAxis:'Y',bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},colliders,surfaces,triangles,bytes:data.byteLength,provenance:{type:'ORIGINAL_PROCEDURAL_GEOMETRY',externalAssets:[],externalImages:[],license:'Project-original'},...extra};
    await writeFile(`${dir}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
    console.log(JSON.stringify({id,triangles,bytes:data.byteLength,colliders:colliders.length,surfaces:surfaces.length}));
  }
  return {add,box,cyl,surface,tree,windows,finish};
}

function ambulance(k,x,z,yaw=0){
  const {box,cyl}=k;box('ambulance',x,1.35,z,5.8,2.45,2.25,false,'ambulance',yaw);
  box('red',x+Math.cos(yaw)*.2,1.5,z-Math.sin(yaw)*.2,3.8,.42,2.28,false,'stripe',yaw);
  box('glass',x+Math.cos(yaw)*2.12,1.72,z-Math.sin(yaw)*2.12,1.1,.85,2.3,false,'cab',yaw);
  box('blue',x,2.7,z,.7,.16,.7,false,'beacon',yaw);
  for(const s of [-1,1])cyl('dark',x+s*Math.cos(yaw)*1.75,.38,z-s*Math.sin(yaw)*1.75,.48,.32,14,Math.PI/2,0,-yaw);
}

async function hospital(){
  const k=campus('GC-HOSPITAL-001','Meridian University Medical Center'),{box,cyl,surface,tree,windows,add}=k;
  // Landscaped medical campus ground and loop road.
  box('concrete',0,.06,0,260,.12,190);surface('medical-campus',[-130,-95],[130,95],.12);
  box('road',0,.1,70,235,.12,23);surface('emergency-loop',[-117,-81.5],[117,-58.5],.16);
  box('road',105,.1,4,22,.12,155);surface('service-road',[94,-73.5],[116,81.5],.16);
  for(let x=-112;x<=80;x+=12)box('mark',x,.18,70,.16,.03,11);

  // Main outpatient podium: generous glazed atrium and separate physical wings.
  box('limestone',-22,11,18,142,22,54,true,'outpatient-podium');
  box('glass',-22,10.5,45.1,102,16,.18);windows(-22,45.15,126,19,4,12,'south',4);
  for(const x of [-42,-22,-2])box('dark',x,3.9,45.4,7,7,.7,true,'lobby-door');
  box('steel',-22,22.4,18,150,.8,60);
  // A curved-looking entrance canopy made from three overlapping elliptical roof plates.
  for(const x of [-42,-22,-2]){add(new T.CylinderGeometry(13,13,.5,32),'white',x,8.7,54,0,0,0);cyl('steel',x,4.4,56,.28,8.5,12);}

  // Two inpatient towers with bridges and rooftop clinical floors.
  box('white',-63,42,-24,54,84,44,true,'inpatient-west');
  box('white',9,36,-25,58,72,46,true,'inpatient-east');
  windows(-63,-1.95,48,76,16,8,'south',5);windows(9,-1.95,52,64,14,8,'south',5);
  windows(-35.95,-24,42,76,16,7,'east',5);windows(38.05,-25,44,64,14,7,'east',5);
  box('glass',-26,33,-24,20,5,13,false,'skybridge');box('steel',-26,36,-24,22,.7,15);
  box('steel',-63,84.5,-24,58,1,48);box('steel',9,72.5,-25,62,1,50);
  // Helipad with raised deck and recognizable H marking.
  cyl('concrete',-63,87.2,-24,16,1.2,36);cyl('red',-63,87.85,-24,13,.12,36);
  box('white',-63,88,-24,10,.12,2);box('white',-63,88,-24,2,.12,10);

  // Emergency department, ambulance canopy and four vehicle bays.
  box('white',70,7,24,52,14,42,true,'emergency-wing');box('glass',70,6.7,45.1,38,8,.16);
  box('red',70,14.3,24,56,.6,46);box('steel',72,6.4,57,66,.5,16);
  for(const x of [47,63,79,95]){cyl('steel',x,3.2,59,.22,6.2,10);ambulance(k,x,70,Math.PI/2);}
  // Multi-level parking and plant/services zone.
  box('concrete',79,10,-49,68,20,54,true,'parking-deck');
  for(let y=3;y<19;y+=4.6)box('dark',79,y,-21.85,58,.22,.18);
  for(let x=52;x<=106;x+=13.5)for(let y=3;y<19;y+=4.6)box('dark',x,y,-21.7,.18,2.3,.18);
  box('steel',108,7,-54,22,14,20,true,'central-plant');

  // Gardens, patient walking path and arrival plaza.
  box('green',-76,.16,69,70,.22,26);surface('healing-garden',[-111,56],[-41,82],.28);
  for(const x of [-105,-88,-71,-54,-37])tree(x,74,.9);
  for(const [x,z] of [[-118,33],[-116,6],[-116,-23],[-114,-52],[120,65],[120,36],[120,7],[120,-22]])tree(x,z,.82);

  return k.finish({
    category:'HOSPITAL_CAMPUS',entrances:{main:[-22,0,46],emergency:[70,0,46],service:[108,0,-42]},
    programme:{outpatient:true,emergency:true,inpatientBeds:520,operatingTheatres:12,helipad:1,ambulanceBays:4,parkingSpaces:460},
    staffCapacity:1250,
    limitations:['Clinical rooms are represented by a structural campus shell; department interiors and medical equipment are future assets.','Ambulances are static world props pending fleet simulation.'],
  });
}

function bus(k,x,z,yaw=0,color='blue'){
  const {box,cyl}=k;box(color,x,1.75,z,10,3.2,2.6,false,'school-bus',yaw);box('glass',x,2.15,z,7.8,1.25,2.66,false,'bus-window',yaw);
  for(const s of [-1,1])cyl('dark',x+s*Math.cos(yaw)*3.1,.48,z-s*Math.sin(yaw)*3.1,.54,.34,14,Math.PI/2,0,-yaw);
}

async function school(){
  const k=campus('GC-SCHOOL-001','AmpliWorld Academy Campus'),{box,cyl,surface,tree,windows}=k;
  box('concrete',0,.06,0,280,.12,225);surface('academy-campus',[-140,-112.5],[140,112.5],.12);
  // Gate plaza, security lodge and bus loop.
  box('road',0,.1,92,254,.12,26);surface('school-arrival',[-127,79],[127,105],.16);
  box('road',98,.1,58,34,.12,68);surface('school-bus-loop',[81,24],[115,92],.16);
  box('limestone',-116,3.4,72,18,6.8,13,true,'gatehouse');box('glass',-116,3.4,78.6,10,3.6,.16);
  box('steel',-72,5.8,77,72,.7,11);for(const x of [-102,-78,-54,-30])cyl('steel',x,2.9,77,.2,5.8,10);
  for(const z of [82,95])bus(k,96,z,0,z===82?'blue':'gold');

  // Three teaching wings form an actual courtyard rather than one rectangular block.
  box('limestone',-38,12,34,116,24,34,true,'teaching-south');
  box('white',-80,15,-18,32,30,72,true,'teaching-west');
  box('white',4,15,-18,32,30,72,true,'teaching-east');
  windows(-38,51.05,106,20,5,12,'south',4);
  windows(-63.95,-18,65,26,6,8,'east',4);windows(20.05,-18,65,26,6,8,'east',4);
  box('steel',-38,24.5,34,122,.8,40);box('steel',-80,30.5,-18,38,.8,78);box('steel',4,30.5,-18,38,.8,78);
  // Library bridge and covered circulation around the planted courtyard.
  box('glass',-38,18,-52,52,12,20,true,'library');box('steel',-38,24.4,-52,56,.7,24);
  for(const x of [-67,-52,-38,-24,-9])cyl('steel',x,3.2,6,.18,6.2,10);
  box('glass',-38,6.4,6,64,.35,7);surface('academic-courtyard',[-62,-42],[-14,10],.18);
  for(const [x,z] of [[-58,-31],[-38,-30],[-18,-31],[-50,-8],[-26,-8]])tree(x,z,.72);

  // Gymnasium, performing arts hall and service/loading area.
  box('steel',78,10,-35,86,20,62,true,'gymnasium');box('glass',78,8,-3.9,58,10,.18);
  box('gold',78,20.5,-35,92,1,68);box('dark',109,7,-72,24,14,18,true,'school-service');
  // Full playing field and athletics track.
  box('track',38,.18,-88,190,.22,40);box('turf',38,.3,-88,158,.16,25);surface('athletics-field',[-57,-108],[133,-68],.4);
  for(let x=-34;x<=110;x+=12)box('mark',x,.4,-88,.08,.02,25);
  box('white',-41,.48,-88,.2,.1,25);box('white',117,.48,-88,.2,.1,25);
  for(const x of [-38,114]){box('white',x,1.45,-88,.15,2.4,7);box('white',x,2.65,-88,7,.15,.15);}

  // Perimeter landscape gives the campus a readable civic edge.
  for(let x=-126;x<=126;x+=18){tree(x,111,.72);tree(x,-111,.72);}
  for(let z=-84;z<=58;z+=18){tree(-132,z,.72);tree(132,z,.72);}

  return k.finish({
    category:'SCHOOL_CAMPUS',entrances:{main:[-80,0,78],bus:[98,0,78],service:[109,0,-62]},
    programme:{studentCapacity:1800,classrooms:54,library:true,gymnasium:true,performingArts:true,playingField:true,busBays:6},
    staffCapacity:240,
    limitations:['Classrooms and specialist rooms are represented by the architectural shell; detailed interior furnishings are future assets.','School buses are static world props pending scheduled transport simulation.'],
  });
}

await mkdir(OUT,{recursive:true});
await hospital();
await school();
