/** Original metric-scale public sports park. Generated geometry, not imagery. */
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {mkdir,writeFile} from 'node:fs/promises';

if(!globalThis.FileReader)globalThis.FileReader=class{
  readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}
};
const out=new URL('../../public/assets/3d/ampliworld/GC-CRESCENT-COMMONS-001/',import.meta.url);
const id='GC-CRESCENT-COMMONS-001',buckets={},colliders=[],surfaces=[];
const palette={
  lawn:[0x648653,.98,0],meadow:[0x739663,.98,0],stone:[0x8e948d,.86,0],path:[0xaaa69a,.83,0],
  track:[0x9c5751,.9,0],court:[0x35646b,.72,0],clay:[0xb96648,.95,0],
  green:[0x427e4b,.9,0],white:[0xe8e9de,.72,0],dark:[0x273b43,.5,.12],
  glass:[0x91b6c3,.19,.3],steel:[0x9baba9,.36,.55],wood:[0x765944,.85,0],
  foliage:[0x5b8b58,.94,0],shrub:[0x3e7046,.98,0],flower:[0xc7798a,.82,0],flowerGold:[0xe0bc63,.82,0],
  gold:[0xbda36c,.48,.48],lanes:[0xbb9561,.62,0],
  water:[0x558e9c,.3,.25],seat:[0x314e57,.7,.1],light:[0xffe4ad,.3,.2],
};
const materials=Object.fromEntries(Object.entries(palette).map(([name,[color,roughness,metalness]])=>
  [name,new T.MeshStandardMaterial({name,color,roughness,metalness,transparent:name==='glass',opacity:name==='glass'?.46:1,side:name==='glass'?T.DoubleSide:T.FrontSide})]));
materials.light.emissive=new T.Color(0xffd58c);materials.light.emissiveIntensity=.8;
function add(geometry,material,x=0,y=0,z=0,rotation=0){
  if(rotation)geometry.rotateY(rotation);
  geometry.translate(x,y,z);
  if(geometry.index)geometry=geometry.toNonIndexed();
  delete geometry.attributes.uv;
  (buckets[material]??=[]).push(geometry);
}
function box(material,x,y,z,w,h,d,rotation=0){add(new T.BoxGeometry(w,h,d),material,x,y,z,rotation);}
function disk(material,x,y,z,rx,rz,height=.08){const g=new T.CylinderGeometry(1,1,height,32);g.scale(rx,1,rz);add(g,material,x,y,z);}
function rod(material,a,b,r=.06){const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p);
  const g=new T.CylinderGeometry(r,r,v.length(),7);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));
  add(g,material,...p.add(q).multiplyScalar(.5).toArray());}
function solid(name,min,max){colliders.push({id:name,min,max});}
function surface(name,min,max,y){surfaces.push({id:name,min,max,y});}
function slab(material,name,x,z,w,d,top=.22){box(material,x,top/2,z,w,top,d);surface(name,[x-w/2,z-d/2],[x+w/2,z+d/2],top);}
function markings(x,z,w,d,y=.275){
  const line=(px,pz,bx,bz)=>box('white',px,y,pz,bx,.018,bz);
  for(const side of [-1,1]){line(x+side*w/2,z,.12,d);line(x,z+side*d/2,w,.12);}
  line(x,z,w,.12);
}
function fence(name,x,z,w,d,y=0.24,height=3.4,gates=[{side:'south',half:2}]){
  const halfW=w/2,halfD=d/2;
  for(const side of [-1,1]){
    const px=x+side*halfW;
    for(let q=-halfD;q<=halfD+.1;q+=6){rod('steel',[px,y,q+z],[px,y+height,q+z],.045);}
    rod('steel',[px,y+height,z-halfD],[px,y+height,z+halfD],.055);
    solid(`${name}-side-${side}`,[px-.09,y,z-halfD],[px+.09,y+height,z+halfD]);
  }
  for(const side of [-1,1]){
    const pz=z+side*halfD,gate=gates.find(g=>g.side===(side<0?'north':'south'));
    const ranges=gate?[[-halfW,-gate.half],[gate.half,halfW]]:[[-halfW,halfW]];
    for(const [a,b] of ranges){
      rod('steel',[x+a,y+height,pz],[x+b,y+height,pz],.055);
      solid(`${name}-end-${side}-${a}`,[x+a,y,pz-.09],[x+b,y+height,pz+.09]);
    }
    for(let q=-halfW;q<=halfW+.1;q+=6){if(gate&&Math.abs(q)<gate.half+.5)continue;rod('steel',[q+x,y,pz],[q+x,y+height,pz],.045);}
  }
}
function tree(x,z,s=1){
  add(new T.CylinderGeometry(.28*s,.39*s,4.1*s,7),'wood',x,2.27*s,z);
  for(const [dx,dy,dz,r] of [[0,5.4,0,2.7],[-1.15,4.65,.3,2.1],[1.05,4.8,-.5,2.15]])
    add(new T.IcosahedronGeometry(r*s,1),'foliage',x+dx*s,dy*s,z+dz*s);
  solid(`tree-${x}-${z}`,[x-.4*s,.2,z-.4*s],[x+.4*s,4.35*s,z+.4*s]);
}
function curvedWalk(points,width=5){
  const curve=new T.CatmullRomCurve3(points.map(([x,z])=>new T.Vector3(x,0,z)));
  const samples=70;
  for(let i=0;i<samples;i++){
    const a=curve.getPoint(i/samples),b=curve.getPoint((i+1)/samples),mid=a.clone().add(b).multiplyScalar(.5);
    box('path',mid.x,.21,mid.z,width,.04,a.distanceTo(b)+.22,Math.atan2(b.x-a.x,b.z-a.z));
  }
}

// 640 × 290 m reserved parcel: no named building, housing parcel or ROW is replaced.
slab('lawn','park-ground',0,0,640,290,.22);
for(const x of [-300,300])box('stone',x,.24,0,3,.05,290);
for(const z of [-145,145])box('stone',0,.24,z,640,.05,3);
curvedWalk([[-310,118],[-220,106],[-124,121],[-48,101],[50,128],[136,105],[226,122],[306,130]],6);
curvedWalk([[-310,-115],[-205,-102],[-105,-120],[12,-105],[130,-115],[237,-105],[307,-117]],5);
curvedWalk([[-55,117],[-12,69],[64,44],[142,64],[177,91]],4.2);
// Roadside entrance: a gently bent pedestrian approach from the existing road at z=1455.
curvedWalk([[15,142],[20,160],[35,187],[50,214],[70,226]],5.5);
// Layered meadows and planting beds are below the path finish, so the route
// remains readable and physically unobstructed instead of a decorative decal.
for(const [x,z,rx,rz] of [[-132,76,32,20],[-15,65,35,22],[89,72,32,17],[290,-6,16,55],[-292,6,16,62]]){
  disk('meadow',x,.213,z,rx,rz,.018);
  for(let i=0;i<16;i++){
    const angle=i*2.39996,r=.25+.68*((i*7)%13)/12;
    const px=x+Math.cos(angle)*rx*r,pz=z+Math.sin(angle)*rz*r;
    add(new T.IcosahedronGeometry(.65+(i%3)*.15,0),'shrub',px,.65,pz);
    if(i%2===0)add(new T.IcosahedronGeometry(.24,0),i%4?'flower':'flowerGold',px,.98,pz);
  }
}
for(const [x,z] of [[-295,105],[-260,122],[-225,111],[-188,126],[-143,105],[-82,127],[-25,132],[38,138],[99,116],[153,128],[286,120],[-288,-111],[-240,-127],[-182,-119],[-130,-132],[-15,-132],[112,-132],[170,-127],[298,-97]])tree(x,z,(x+z)%3===0?1.12:.9);
for(const [x,z] of [[-152,53],[-113,68],[-94,85],[-55,53],[-28,75],[18,70],[48,82],[73,59],[112,68],[137,87],[282,-54],[295,48],[-300,-62],[-286,56]])tree(x,z,.76);
// Woodland groups frame the open playfields without turning the circulation
// corridors or court runoffs into invisible collision traps.
for(const [x,z] of [
  [-286,76],[-274,89],[-263,75],[-248,82],[-235,69],[-208,83],[-191,76],
  [-292,-81],[-277,-91],[-258,-83],[-240,-95],[-222,-82],[-204,-91],
  [-135,13],[-119,25],[-104,12],[-89,28],[-74,8],[-58,20],[-44,5],
  [-14,16],[2,29],[19,13],[38,23],[55,11],[73,29],[88,9],[105,23],
  [159,-24],[176,-14],[192,-31],[209,-20],[228,-13],[247,-28],[266,-15],[285,-26],
  [157,-76],[176,-82],[194,-73],[211,-87],[230,-78],[248,-87],[268,-72],
])tree(x,z,.72);
// Shaded public pavilion: a dimensional eight-post canopy, seating and a
// permeable roof rather than a second anonymous rectangular building.
for(const [x,z] of [[130,13],[130,27],[148,13],[148,27],[139,13],[139,27]]){
  rod('steel',[x,.22,z],[x,4.2,z],.12);
  solid(`pavilion-post-${x}-${z}`,[x-.14,.22,z-.14],[x+.14,4.2,z+.14]);
}
for(let i=0;i<12;i++)box('wood',129+i*1.8,4.25,20,.28,.22,19);
for(const x of [133,145]){box('wood',x,.67,20,2.2,.16,1.1);box('stone',x,.46,20,.13,.48,.13);}
// Park gateway opens directly onto the curved entrance promenade.
for(const x of [9,21]){
  box('stone',x,1.9,137,1.2,3.4,1.2);
  solid(`entry-post-${x}`,[x-.6,.22,136.4],[x+.6,3.62,137.6]);
}
rod('gold',[9,3.72,137],[15,5,137],.22);rod('gold',[15,5,137],[21,3.72,137],.22);
for(const x of [10,13,16,19])add(new T.SphereGeometry(.25,8,6),'light',x,3.9+1.08*(1-Math.abs(x-15)/6),137);
for(const [x,z] of [[-275,87],[-160,112],[-24,91],[124,114],[270,110]]){
  box('wood',x,.72,z,2.8,.16,.75);box('steel',x-.95,.4,z,.1,.7,.1);box('steel',x+.95,.4,z,.1,.7,.1);
}
// Community football: full 105 × 68 m pitch, open public access and modest spectator edge.
slab('track','football-runoff',-215,-5,88,124,.24);
slab('green','football-pitch',-215,-5,68,105,.265);
markings(-215,-5,68,105,.28);
for(const side of [-1,1]){
  box('white',-215,.28,-5+side*36,40,.018,.12);
  box('white',-215,.28,-5+side*46,18,.018,.12);
  const goalZ=-5+side*52.5;
  for(const gx of [-3.66,3.66]){
    rod('white',[-215+gx,.265,goalZ],[-215+gx,2.7,goalZ],.07);
    solid(`football-post-${side}-${gx}`,[-215+gx-.08,.265,goalZ-.08],[-215+gx+.08,2.7,goalZ+.08]);
  }
  rod('white',[-218.66,2.7,goalZ],[-211.34,2.7,goalZ],.07);
}
for(const side of [-1,1])for(let row=0;row<3;row++){
  box('stone',-215+side*(36+row*2.2),.38+row*.3,-5,1.65,.5+row*.6,110);
  for(let q=-50;q<=50;q+=4)box('seat',-215+side*(36+row*2.2),.68+row*.6,-5+q,1.75,.08,2.7);
}
// Two playable-sized basketball surfaces; hoops, transparent approach and runoffs.
for(const [index,x] of [[0,-94],[1,-38]]){
  const z=-54;
  slab('court',`basketball-${index}`,x,z,34,21,.255);
  markings(x,z,28,15,.27);
  for(const side of [-1,1]){
    const hz=z+side*8.6;
    rod('steel',[x,.25,hz+side*2],[x,3.4,hz+side*2],.085);
    box('white',x,3.2,hz+side*.25,1.8,1.05,.08);
    const points=Array.from({length:25},(_,i)=>[x+Math.cos(i*Math.PI/12)*.45,3.05,hz+side*.65+Math.sin(i*Math.PI/12)*.45]);
    for(let i=0;i<24;i++)rod('gold',points[i],points[i+1],.025);
    solid(`basket-hoop-${index}-${side}`,[x-.13,.25,hz+side*2-.13],[x+.13,3.4,hz+side*2+.13]);
  }
}
// One acrylic hard court and one red-clay court, including nets and gated fences.
function tennis(name,x,z,material,baseY=.22){
  slab(material,`${name}-court`,x,z,38,21,baseY+.04);
  const y=baseY+.067;
  for(const side of [-1,1]){box('white',x+side*11.88,y,z,.1,.018,10.97);box('white',x,y,z+side*5.485,23.76,.018,.1);}
  box('white',x,y,z,23.76,.018,.1);
  for(const side of [-1,1])box('white',x+side*5.94,y,z,.1,.018,10.97);
  rod('steel',[x-6,baseY,z],[x-6,baseY+1.05,z],.05);rod('steel',[x+6,baseY,z],[x+6,baseY+1.05,z],.05);
  for(let i=0;i<=12;i++)rod('white',[x-6+i,baseY+.15,z],[x-6+i,baseY+1.02,z],.008);
  rod('white',[x-6,baseY+1.02,z],[x+6,baseY+1.02,z],.024);
  fence(`${name}-fence`,x,z,41,24,baseY+.04,3.2,[{side:'south',half:2.2}]);
}
tennis('hard',28,-54,'court');
tennis('clay',99,-54,'clay');
// Bowling hall: physical open front, structural glazing, twelve visible lanes.
const hall={x:216,z:57,w:88,d:56,roof:11.02};
slab('stone','bowling-floor',hall.x,hall.z,hall.w,hall.d,.25);
for(const side of [-1,1]){
  const x=hall.x+side*hall.w/2;
  box('dark',x,5.6,hall.z,.55,10.7,hall.d);
  solid(`bowling-wall-x-${side}`,[x-.28,.25,hall.z-hall.d/2],[x+.28,10.95,hall.z+hall.d/2]);
}
const rearZ=hall.z-hall.d/2,frontZ=hall.z+hall.d/2;
box('dark',hall.x,5.6,rearZ,hall.w,10.7,.55);
solid('bowling-rear-wall',[hall.x-hall.w/2,.25,rearZ-.28],[hall.x+hall.w/2,10.95,rearZ+.28]);
for(const side of [-1,1]){
  const x=hall.x+side*30.5;
  box('dark',x,5.6,frontZ,27,10.7,.55);
  solid(`bowling-front-${side}`,[x-13.5,.25,frontZ-.28],[x+13.5,10.95,frontZ+.28]);
  box('glass',x,5.3,frontZ+.32,24,6.7,.12);
}
for(const x of [hall.x-16,hall.x+16]){
  box('glass',x,4.2,frontZ+.35,15,7.5,.12);
  solid(`bowling-glass-${x}`,[x-7.5,.45,frontZ+.29],[x+7.5,7.95,frontZ+.41]);
}
box('gold',hall.x,10.6,frontZ+1.4,34,.6,3.4);
box('dark',hall.x,5.6,frontZ+1.5,2.2,10.8,2.3);
solid('bowling-entry-pier',[hall.x-1.1,.2,frontZ+.35],[hall.x+1.1,11,frontZ+2.65]);
box('stone',hall.x,hall.roof-.26,hall.z,hall.w+.5,.52,hall.d+.5);
solid('bowling-roof-slab',[hall.x-hall.w/2-.25,hall.roof-.52,hall.z-hall.d/2-.25],
  [hall.x+hall.w/2+.25,hall.roof,hall.z+hall.d/2+.25]);
surface('bowling-roof',[hall.x-hall.w/2,hall.z-hall.d/2],[hall.x+hall.w/2,hall.z+hall.d/2],hall.roof);
for(let lane=0;lane<12;lane++){
  const x=hall.x-30+lane*5.4;
  box('lanes',x,.285,hall.z-1,3.7,.06,31);
  for(const side of [-1,1])box('dark',x+side*2,.31,hall.z-1,.18,.06,31);
  for(let pin=0;pin<10;pin++){
    const row=Math.floor((Math.sqrt(8*pin+1)-1)/2),column=pin-row*(row+1)/2;
    const px=x+(column-row/2)*.34,pz=hall.z-12-row*.38;
    add(new T.CylinderGeometry(.055,.082,.31,7),'white',px,.5,pz);
  }
  box('seat',x,.65,hall.z+18,3,.7,1.1);
}
// Walkable roof hard court. A 54-step stair rises 0.20 m per tread; an open
// top bridge meets the registered roof support rather than teleporting there.
const stairX=hall.x+hall.w/2+7;
for(let step=1;step<=54;step++){
  const z=131-step,y=.22+step*.2;
  box('stone',stairX,y-.1,z,4,.2,1.02);
  surface(`roof-stair-${step}`,[stairX-2,z-.51],[stairX+2,z+.51],y);
}
box('stone',stairX-5.6,hall.roof-.12,77,11.4,.24,4.2);
surface('roof-stair-bridge',[stairX-11.3,74.9],[stairX,79.1],hall.roof);
for(const side of [-1,1]){
  const x=stairX+side*2.35;
  rod('steel',[x,.42,130],[x,12.04,77],.06);
  solid(`stair-rail-${side}`,[x-.08,.22,76],[x+.08,12.05,131]);
}
tennis('roof',hall.x,hall.z,'court',hall.roof);
// Roof guard is physical except for the eastern bridge opening.
for(const side of [-1,1]){
  const x=hall.x+side*hall.w/2;
  if(side<0){box('steel',x,hall.roof+1,hall.z,.14,2,hall.d);solid('roof-west-guard',[x-.07,hall.roof,hall.z-hall.d/2],[x+.07,hall.roof+2,hall.z+hall.d/2]);}
  else for(const [a,b] of [[hall.z-hall.d/2,74.7],[79.3,hall.z+hall.d/2]]){
    box('steel',x,hall.roof+1,(a+b)/2,.14,2,b-a);
    solid(`roof-east-${a}`,[x-.07,hall.roof,a],[x+.07,hall.roof+2,b]);
  }
}
for(const side of [-1,1]){
  const z=hall.z+side*hall.d/2;
  box('steel',hall.x,hall.roof+1,z,hall.w,2,.14);
  solid(`roof-end-${side}`,[hall.x-hall.w/2,hall.roof,z-.07],[hall.x+hall.w/2,hall.roof+2,z+.07]);
}
// A sculpted curved entrance canopy, dimensional fins and lighting.
for(const side of [-1,1])for(let i=0;i<10;i++){
  const x=hall.x+side*(5+i*3.2),z=frontZ+1.5+Math.sin(i/9*Math.PI)*3.3;
  box('steel',x,7,z,.22,5.5,.58);
}
for(let i=0;i<17;i++){
  const x=hall.x-40+i*5;
  box('gold',x,10.9,frontZ+.5+Math.sin(i/16*Math.PI)*3,.22,.2,4.2);
}
for(const x of [-265,-160,-90,10,110,183,270]){
  box('steel',x,3.7,109,.13,7,.13);
  add(new T.SphereGeometry(.43,8,6),'light',x,7.35,109);
  solid(`lamp-${x}`,[x-.1,.22,108.9],[x+.1,7.4,109.1]);
}

const scene=new T.Group();scene.name=id;
let triangles=0;
for(const [material,list] of Object.entries(buckets)){
  const geometry=mergeGeometries(list,false);
  if(!geometry)throw new Error(`Could not merge ${material}`);
  geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  triangles+=geometry.attributes.position.count/3;
  const mesh=new T.Mesh(geometry,materials[material]);mesh.name=`${id}-${material}`;scene.add(mesh);
  for(const item of list)item.dispose();
}
await mkdir(out,{recursive:true});
const bin=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});
await writeFile(new URL('commons.glb',out),Buffer.from(bin));
const bounds=new T.Box3().setFromObject(scene);
const manifest={id,name:'Crescent Commons Sports Park',nameZh:'月湾全民运动公园',version:1,
  units:'meters',coordinateSystem:'local Y-up, world placement (970, 1230)',file:'commons.glb',
  bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},colliders,surfaces,
  entrances:{main:[15,.22,137],bowling:[hall.x,.25,frontZ+4],roofStair:[stairX,.22,131]},
  facilities:['public football pitch 105×68m','two basketball courts','hard tennis court','clay tennis court','roof tennis court with stairs','twelve-lane bowling hall','curved public promenade'],
  limits:['sports are visual/physical spaces; ball physics, booking and staffed operations are not yet implemented'],
  triangles,bytes:Buffer.byteLength(Buffer.from(bin))};
await writeFile(new URL('manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
console.log(`${id}: ${triangles} triangles, ${colliders.length} colliders, ${surfaces.length} surfaces`);
