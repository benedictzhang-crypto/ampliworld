/** Original metric six-level walk-in retail campus. No imported meshes or image facades.
 * Copy beside mall-merchandise.mjs and mall-parking.mjs before running.
 * Lift machinery/cabs/doors are a separate runtime system; these plates contain real holes.
 */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import fontJson from 'three/examples/fonts/helvetiker_regular.typeface.json' with { type: 'json' };
import { mkdir, writeFile } from 'node:fs/promises';
import { merchandise } from './mall-merchandise.mjs';
import { buildParking } from './mall-parking.mjs';
if (!globalThis.FileReader) globalThis.FileReader = class { readAsArrayBuffer(b) { b.arrayBuffer().then(v => { this.result = v; this.onloadend?.(); }); } };
const out = new URL('../../public/assets/3d/ampliworld/GC-MALL-002/', import.meta.url);
const materials = {};
for (const [key,color,metalness,roughness] of [
  ['ivory',0xe5e1d5,.1,.42],['gold',0xb99957,.72,.28],['dark',0x18303b,.5,.2],
  ['stone',0x9fa5a5,.05,.85],['light',0xffe6ac,.15,.3],['leather',0x613a28,.1,.64],
  ['red',0x993c46,.1,.42],['diamond',0xd6f7ff,.5,.08],['leaf',0x426957,0,.9],
  ['wood',0x75543d,0,.8],['water',0x559795,.5,.16],
]) materials[key]=new T.MeshStandardMaterial({name:key,color,metalness,roughness});
materials.light.emissive=new T.Color(0xffca78); materials.light.emissiveIntensity=.6;
materials.glass=new T.MeshStandardMaterial({name:'Architectural clear glazing',color:0xc3dce0,transparent:true,opacity:.18,roughness:.1,metalness:.05,side:T.DoubleSide,depthWrite:false});
const buckets={}, colliders=[], surfaces=[], shops=[];
function add(g,m,x=0,y=0,z=0,ry=0){g.rotateY(ry);g.translate(x,y,z);if(g.index)g=g.toNonIndexed();delete g.attributes.uv;(buckets[m]??=[]).push(g);}
function box(m,x,y,z,w,h,d,ry=0){add(new T.BoxGeometry(w,h,d),m,x,y,z,ry);}
function solid(id,min,max){colliders.push({id,min,max});}
function block(id,m,x,y,z,w,h,d){box(m,x,y,z,w,h,d);solid(id,[x-w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z+d/2]);}
const font=new FontLoader().parse(fontJson);
function text3d(label,x,y,z,size,ry=0){const g=new TextGeometry(label,{font,size,depth:.025,curveSegments:2,bevelEnabled:false});g.computeBoundingBox();g.translate(-(g.boundingBox.max.x-g.boundingBox.min.x)/2,0,0);add(g,'gold',x,y,z,ry);}
const W=225,D=180,IW=90,ID=70;
const FLOOR_Y=[.17,6.48,11.28,16.08,20.88,25.68];
const ROOF_Y=31.05;
const liftGroups=[
 {id:'NW',min:[-82,-81],max:[-70,-76],doorDirection:1},
 {id:'NE',min:[18,-81],max:[30,-76],doorDirection:1},
 {id:'SW',min:[-82,60.5],max:[-70,65.5],doorDirection:-1},
 {id:'SE',min:[18,60.5],max:[30,65.5],doorDirection:-1},
];
// Rectangle subtraction avoids hidden solid floor across an elevator shaft.
function subtract(r,h){const x0=Math.max(r[0],h.min[0]),z0=Math.max(r[1],h.min[1]),x1=Math.min(r[2],h.max[0]),z1=Math.min(r[3],h.max[1]);if(x1<=x0||z1<=z0)return[r];return [[r[0],r[1],x0,r[3]],[x1,r[1],r[2],r[3]],[x0,r[1],x1,z0],[x0,z1,x1,r[3]]].filter(a=>a[2]-a[0]>.001&&a[3]-a[1]>.001);}
function plate(level,y,thickness){let rs=[[-112.5,-90,112.5,-35],[-112.5,35,112.5,90],[-112.5,-35,-45,35],[45,-35,112.5,35]];for(const h of liftGroups)rs=rs.flatMap(r=>subtract(r,h));rs.forEach((r,i)=>{const id=`${level}-plate-${i}`;block(id,'ivory',(r[0]+r[2])/2,y-thickness/2,(r[1]+r[3])/2,r[2]-r[0],thickness,r[3]-r[1]);surfaces.push({id,min:[r[0],r[1]],max:[r[2],r[3]],y,level});});}
FLOOR_Y.forEach((y,i)=>plate('L'+(i+1),y,i===0?.17:.48));plate('ROOF',ROOF_Y,.5);
// The garden is ground-level only. Every upper floor retains the open 90 x 70m atrium.
block('courtyard-base','ivory',0,.085,0,90,.17,70);surfaces.push({id:'courtyard',min:[-45,-35],max:[45,35],y:.17,level:'L1'});
function rail(id,x,z,w,d,y){block(id,'glass',x,y+.58,z,w,1.16,d);box('gold',x,y+1.18,z,w+.04,.07,d+.04);}
for(const [f,y] of [...FLOOR_Y.slice(1),ROOF_Y].entries()){
  rail(`atrium-${f}-N`,0,-35.12,90, .12,y);rail(`atrium-${f}-S`,0,35.12,90,.12,y);
  rail(`atrium-${f}-W`,-45.12,0,.12,70,y);rail(`atrium-${f}-E`,45.12,0,.12,70,y);
}
// Full-height outer glazing, interrupted only by actual ground entrances.
for(let f=0;f<6;f++){
 const y=FLOOR_Y[f], top=f===5?30.55:FLOOR_Y[f+1]-.48,h=top-y;
 for(const s of [-1,1]){
  const ns=f===0?[[-112.5,-8],[8,112.5]]:[[-112.5,112.5]];
  for(const [a,b] of ns)block(`facade-${f}-z${s}-${a}`,'glass',(a+b)/2,y+h/2,s*89.9,b-a,h,.16);
  const ew=f===0?[[-90,-8],[8,90]]:[[-90,90]];
  for(const [a,b] of ew)block(`facade-${f}-x${s}-${a}`,'glass',s*112.4,y+h/2,(a+b)/2,.16,h,b-a);
  for(let x=-108;x<=108;x+=12)box('gold',x,y+h/2,s*89.85,.14,h,.24);
  for(let z=-84;z<=84;z+=12)box('gold',s*112.35,y+h/2,z,.24,h,.14);
  box('gold',0,top-.1,s*90,225,.18,.4);box('gold',s*112.5,top-.1,0,.4,.18,180);
 }
 // Slender load-bearing columns, outside galleries' principal circulation axes.
 for(const x of [-107,-62,62,107])for(const z of [-84,-30,30,84])block(`column-${f}-${x}-${z}`,'stone',x,y+h/2,z,.6,h,.6);
 for(const x of [-52,52])for(const z of [-24,0,24]){box('gold',x,top-.15,z,.7,.18,14);box('light',x,top-.26,z,.36,.06,12);}
 for(const z of [-43,43])for(const x of [-84,-42,0,42,84]){box('gold',x,top-.15,z,16,.18,.7);box('light',x,top-.26,z,14,.06,.36);}
}
const brands=[
 ['Dior','Louis Vuitton','Prada','Hermes','Gucci','Tumi','Coach','Chanel','Rolex','Richard Mille','Sephora','Uniqlo','MUJI','Apple'],
 ['CELINE','Loewe','Bottega Veneta','Cartier','Tiffany','Bvlgari','Burberry','Moncler','Fendi','Chopard','Valentino','Loro Piana','Aurea Atelier','Gallery Editions'],
 ['Garmin',"Arc'teryx",'Apple','Samsung','Sony','DJI','Bose','HUAWEI','LEGO','Uniqlo','MUJI','COS','H&M','Outdoor Studio'],
 ['Patagonia','The North Face','Salomon','New Balance','Nike','Adidas','Decathlon','On','Outdoor Lab','Urban Fashion','Travel Gear','Camera Studio','Tech Workshop','Active Life'],
 ['Aurea Tea','Lotus Dining','Garden Table','Cedar Kitchen','Cloud Patisserie','Bamboo Tea','Gallery Cafe','Fine Dining','Tea Collection','Aurea Cinema','Supper Club','Sky Kitchen','Arcade Lounge','Dessert Atelier'],
 ['Roofside Tea','Sunset Dining','Orchid Table','Stone & Fire','Cloud Cafe','Cinema Lounge','Arcade Studio','Tea Pavilion','Garden Dining','Aurea Cinema','Play Lounge','Private Dining','Art Kitchen','Evening Bar'],
];
function room(label,x,z,ry,f,index){
 const y=FLOOR_Y[f],c=Math.cos(ry),s=Math.sin(ry),w=16,depth=23,h=3.9,id=`L${f+1}-shop-${index}`;
 const pt=(u,v)=>[x+u*c+v*s,z-u*s+v*c];
 const b=(key,m,u,yy,v,ww,hh,dd,collision=true)=>{const p=pt(u,v);box(m,p[0],y+yy,p[1],ww,hh,dd,ry);if(collision){const ex=Math.abs(c)*ww/2+Math.abs(s)*dd/2,ez=Math.abs(s)*ww/2+Math.abs(c)*dd/2;solid(id+'-'+key,[p[0]-ex,y+yy-hh/2,p[1]-ez],[p[0]+ex,y+yy+hh/2,p[1]+ez]);}};
 b('back','ivory',0,h/2,-depth,w,h,.18);for(const side of [-1,1])b('side'+side,'stone',side*w/2,h/2,-depth/2,.16,h,depth);
 // Real 3.4m open doorway; no full-width invisible display collider.
 for(const side of [-1,1]){b('window'+side,'glass',side*4.85,1.6,0,6.3,3.2,.10);b('jamb'+side,'gold',side*1.74,1.65,.04,.10,3.3,.15);}
 b('header','ivory',0,3.6,0,w,.7,.25);b('sign-light','light',0,3.25,-.2,12,.04,.25,false);
 text3d(label,x+.19*s,y+3.45,z+.19*c,Math.min(.58,9/Math.max(1,label.length)*1.28),ry);
 b('display','stone',-4,.65,-7,4,1.1,2);b('desk','wood',4,.72,-16,4,1.3,1.4);
 if(f<2){const p=pt(-4,-7);merchandise(T,add,box,['handbag','shoe-pair','coat','necklace','watch','ring'][index%6],p[0],y+1.22,p[1],ry);}
 else if(f<4){for(const u of [-5,-3]){b('device-'+u,'dark',u,1.5,-7,.75,.45,.10,false);b('devicebase-'+u,'gold',u,1.23,-7,.7,.06,.5,false);}b('rack','gold',-4,1.7,-16,5,.07,.07,false);for(const u of [-6,-2])b('rackleg'+u,'gold',u,.9,-16,.07,1.7,.07,false);}
 else {
  for(const u of [-4,4])for(const v of [-6,-12]){b(`table-${u}-${v}`,'wood',u,.8,v,2,.12,2);b(`leg-${u}-${v}`,'gold',u,.4,v,.18,.8,.18);for(const du of [-1.5,1.5]){b(`seat-${u}-${v}-${du}`,'leather',u+du,.47,v,.65,.16,.7);b(`seatback-${u}-${v}-${du}`,'leather',u+du,.84,v+.3,.65,.65,.14);}}
  if(/Cinema|Arcade|Play/.test(label)){b('screen','dark',0,2.05,-depth+.14,10,2.7,.10,false);b('screenlight','light',0,2.05,-depth+.21,8.7,1.9,.035,false);}
 }
 shops.push({id,label,level:'L'+(f+1),floorY:y,position:[x,y,z],rotationY:ry,doorWidth:3.4,door:[x,y,z],open:true,interior:'walk-in furnished room',commercialStatus:'Illustrative name text only; no affiliation or live tenancy claimed'});
}
const centers=[-96,-54,-33,-12,46,67,88];
for(let f=0;f<6;f++){let n=0;for(const z of [-51,51])for(const x of centers)room(brands[f][n%14],x,z,z<0?0:Math.PI,f,n++);
 // Side-wing rooms face inward, with entrance clear of the 17m-wide main gallery.
 for(const s of [-1,1])for(const z of [-20,20])room(f<4?'Gallery Select':f===4?'Tea Lounge':'Sky Dining',s*70,z,s>0?-Math.PI/2:Math.PI/2,f,n++);
 for(const g of liftGroups){const x=(g.min[0]+g.max[0])/2,z=g.doorDirection>0?g.max[1]+.25:g.min[1]-.25; text3d(`L${f+1}  LIFTS ${g.id}`,x,FLOOR_Y[f]+3.55,z,.42,g.doorDirection>0?0:Math.PI);}
}
// Central garden leaves 12m clear cross-axes and open ground-floor routes on all sides.
for(const x of [-27,27])for(const z of [-19,19]){
 block(`garden-${x}-${z}`,'stone',x,.45,z,25,.56,17);box('leaf',x,.75,z,24.4,.06,16.4);
 for(const u of [-7,7]){add(new T.CylinderGeometry(.16,.22,3.8,8),'wood',x+u,2.65,z);const g=new T.IcosahedronGeometry(2.5,1);g.scale(1,.9,1);add(g,'leaf',x+u,5,z);}
 block(`garden-seat-${x}-${z}`,'wood',x,.66,z>0?8:-8,10,.24,1.1);
}
box('water',0,.185,0,7,.02,7);solid('garden-basin',[-3.5,.17,-3.5],[3.5,.35,3.5]);add(new T.TorusKnotGeometry(1.8,.24,48,8),'gold',0,2.8,0);
// Roof promenade, balustrades, shaded benches and modest planted beds.
for(const z of [-89.5,89.5])rail('roof-edge-z'+z,0,z,224,.15,ROOF_Y);
for(const x of [-112,112])rail('roof-edge-x'+x,x,0,.15,179,ROOF_Y);
for(const x of [-103,103])for(const z of [-64,-20,20,64]){block(`roof-planter-${x}-${z}`,'stone',x,ROOF_Y+.43,z,7,.86,9);box('leaf',x,ROOF_Y+.87,z,6.6,.05,8.6);add(new T.IcosahedronGeometry(1.7,1),'leaf',x,ROOF_Y+2.3,z);}
for(const z of [-43,43])for(const x of [-20,0,45])block(`roof-bench-${x}-${z}`,'wood',x,ROOF_Y+.5,z,7,.25,1.2);
for(const s of [-1,1]){for(const x of [-40,40])block(`pergola-${s}-${x}`,'gold',x,ROOF_Y+1.6,s*84,.15,3.2,.15);for(let x=-40;x<=40;x+=4)box('wood',x,ROOF_Y+3.22,s*81,.18,.16,8);}
text3d('ROOF PROMENADE',0,ROOF_Y+1.5,87,.75);
// Preserve only the original ramp and below-grade terminal, never its former customer lot.
const keepRampGeometry=(g,m,x=0,y=0,z=0,ry=0)=>{g.rotateY(ry);g.translate(x,y,z);g.computeBoundingBox();const b=g.boundingBox;if(b.min.x>=113.8&&b.max.x<=127.1&&b.min.z>=59.5&&b.max.z<=109.1)add(g,m);};
const rampParking=buildParking(T,keepRampGeometry,(m,x,y,z,w,h,d,ry=0)=>keepRampGeometry(new T.BoxGeometry(w,h,d),m,x,y,z,ry),(id,min,max)=>{if(id.startsWith('ramp-')||id.startsWith('b1-'))solid(id,min,max);},(label,x,y,z,size,ry=0)=>{if(x>113&&x<128&&z>=59.5)text3d(label,x,y,z,size,ry);});
// Service campus: no customer bay striping/cars. South 18m turning apron remains empty.
block('service-yard-base','stone',158.5,.085,11,63,.17,118);surfaces.push({id:'service-yard',min:[127,-48],max:[190,70],y:.17});
for(const z of [-42,-20,2]){
 block('loading-dock-'+z,'ivory',135,.72,z,12,1.1,11);
 for(const dz of [-5,5])box('gold',147,.182,z+dz,17,.02,.13);
 // Original delivery lorry: closed cargo body, separate cab, windscreen and six wheels.
 block('truck-cargo-'+z,'ivory',150,2.35,z,10,3.9,2.8);
 block('truck-cab-'+z,'dark',157,1.58,z,3.6,2.6,2.65);
 box('glass',158.82,2.05,z,.035,.95,2.22);box('gold',159.03,.8,z,.2,.16,2.8);
 for(const xx of [146,149,156.9])for(const dz of [-1.48,1.48]){const g=new T.CylinderGeometry(.48,.48,.32,12);g.rotateX(Math.PI/2);add(g,'dark',xx,.65,z+dz);const r=new T.CylinderGeometry(.26,.26,.34,10);r.rotateX(Math.PI/2);add(r,'stone',xx,.65,z+dz);}
 text3d('LOADING',134,2,z+5.7,.42);
}
for(const z of [-37,-15,9]){block('service-equipment-'+z,'dark',184,1.8,z,6,3.2,10);for(const dz of [-3,0,3]){add(new T.CylinderGeometry(1.1,1.1,.14,16),'stone',184,3.47,z+dz);box('gold',184,2.2,z+dz,6.03,.10,.13);}}
for(const x of [133,187])for(const z of [-45,32]){add(new T.CylinderGeometry(.085,.085,6,8),'dark',x,3.17,z);box('light',x,6.18,z,2,.08,1);}
text3d('SERVICE / LOADING ONLY',158,3.5,47,.8);text3d('B1 PARKING VIA RAMP',159,1.65,68,.58);
// Original forecourt and approach lanes, maintaining the existing ramp throat gap.
box('ivory',0,.08,98,225,.16,12);surfaces.push({id:'front-forecourt',min:[-112.5,92],max:[112.5,104],y:.16});
box('stone',.75,.035,113,226.5,.07,16);box('stone',159.75,.035,113,65.5,.07,16);box('stone',120.5,.085,114.5,13,.17,13);
for(const z of [-91,91]){box('gold',0,5.6,z,18,.2,7);box('light',0,5.45,z,16,.08,6);}
// Deep facade ribbons are physical geometry with open ground-level portals.
for(const side of [-1,1])for(let f=1;f<=6;f++){
 const y=f===6?ROOF_Y:FLOOR_Y[f];
 for(let x=-108;x<=108;x+=6){const depth=1.4+.8*Math.cos(x/23+f*.65);
  box('ivory',x,y-.12,side*(90+depth/2),6.05,.48,depth);
  box('gold',x,y-.39,side*(90+depth),6.05,.08,.14);
 }
 for(let z=-84;z<=84;z+=6){const depth=1.3+.7*Math.cos(z/20+f*.65);
  box('ivory',side*(112.5+depth/2),y-.12,z,depth,.48,6.05);
  box('gold',side*(112.5+depth),y-.39,z,.14,.08,6.05);
 }
}
for(const s of [-1,1])for(let x=-102;x<=102;x+=12){
 if(Math.abs(x)<9)continue; // Preserve the full 16m entrance opening.
 block(`facade-pier-${s}-${x}`,'ivory',x,2.85,s*90.25,.7,5.4,.9);
 box('light',x+.42,2.9,s*90.75,.06,4.7,.07);
}
for(const s of [-1,1]){
 for(let x=-14;x<=14;x+=2)box('gold',x,6.25,s*94,.14,.26,10);
 box('glass',0,6.42,s*94,30,.18,10);
 for(const x of [-28,28,-68,68]){
  block(`forecourt-planter-${s}-${x}`,'stone',x,.48,s*98,8,.64,2.2);
  box('leaf',x,.87,s*98,7.6,.16,1.8);
  block(`forecourt-seat-${s}-${x}`,'wood',x,.52,s*100,7,.3,.85);
 }
}
for(let x=-110;x<=110;x+=3)box('stone',x,.164,98,.035,.006,11.5);
for(const z of [93,96,99,102])box('stone',0,.164,z,224,.006,.035);
text3d('AUREA GALLERIA',0,5,90.8,1.05);
const scene=new T.Scene();scene.name='GC-MALL-002_Six_Level_Walkable_Galleries';let triangles=0;
for(const [m,parts]of Object.entries(buckets)){const g=mergeVertices(mergeGeometries(parts),1e-5);const mesh=new T.Mesh(g,materials[m]);mesh.name='mall_'+m;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);triangles+=(g.index?.count??g.attributes.position.count)/3;}
scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(scene);
await mkdir(out,{recursive:true});const binary=await new GLTFExporter().parseAsync(scene,{binary:true});await writeFile(new URL('mall-lod0.glb',out),new Uint8Array(binary));
const manifest={id:'GC-MALL-002',name:'Aurea Galleria Campus',units:'metres',stories:6,height:bounds.max.y,mainBuildingFootprint:[W,D],courtyard:[IW,ID],asset:'mall-lod0.glb',bytes:binary.byteLength,triangles,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},floors:FLOOR_Y.map((y,i)=>({id:'L'+(i+1),y,walkable:true,theme:i<2?'luxury and lifestyle':i<4?'technology, outdoor and accessible fashion':'tea, dining, cinema and arcade rooms'})),roof:{id:'ROOF',y:ROOF_Y,walkable:true},liftGroups:liftGroups.map(g=>({...g,cars:4,runtime:true})),shops,colliders,surfaces,parking:{bays:0,cars:0,truckLoadingBays:3,serviceYard:{min:[127,-48],max:[190,70]},ramp:rampParking.ramp},indoorEntrances:[[0,.17,90],[0,.17,-90],[-112.5,.17,0],[112.5,.17,0]],status:'Six furnished walk-in retail levels and roof promenade; elevator movement and B1 food/VIP are separate runtime/garage components',provenance:'Original procedural geometry. Brand names are ordinary illustrative text, not official logos, endorsements, tenancy confirmations or Michelin awards.',limitations:['Shop merchandise is illustrative; no purchasing or trading system.','Cinema/arcade rooms contain static furnishings/screens, not playable media.','Lift openings require the separate runtime shaft/door/cab system before public traversal.']};
await writeFile(new URL('mall-manifest.json',out),JSON.stringify(manifest,null,2));await writeFile(new URL('FONT-LICENSE.txt',out),fontJson.original_font_information.license_description);console.log(JSON.stringify({triangles,bytes:binary.byteLength,shops:shops.length,surfaces:surfaces.length,colliders:colliders.length,liftGroups:liftGroups.length}));
