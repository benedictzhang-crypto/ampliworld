/** Original AmpliWorld hospitality kit. Regenerates the original hospitality kit. */
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {mkdir,writeFile} from 'node:fs/promises';
if(!globalThis.FileReader)globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}};
const OUT=new URL('../../public/assets/3d/ampliworld/',import.meta.url).pathname;
const palette={ivory:0xe8e7e1,stone:0xa6ada9,concrete:0xc4c8c3,bronze:0xa89068,dark:0x303a3e,glass:0x8da6a6,teak:0x958574,leaf:0x53675a,light:0xffdda5,water:0x799c9e};
const mats=Object.fromEntries(Object.entries(palette).map(([name,color])=>[name,new T.MeshStandardMaterial({name,color,roughness:name==='glass'?.18:name==='bronze'?.35:.73,metalness:name==='bronze'?.68:name==='glass'?.25:.04})]));
mats.glass.transparent=true;mats.glass.opacity=.32;mats.glass.depthWrite=false;mats.glass.side=T.DoubleSide;mats.light.emissive=new T.Color(0xffd49a);mats.light.emissiveIntensity=.6;
const glyphs={A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['111','010','010','010','010','010','111'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','11001','10101','10011','10011','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100']};
function kit(id,name,w,d,door){
 const scene=new T.Scene(),buckets={},colliders=[];scene.name=name;
 function add(g,m,x=0,y=0,z=0){g.translate(x,y,z);if(g.index)g=g.toNonIndexed();delete g.attributes.uv;(buckets[m]??=[]).push(g);}
 function box(m,x,y,z,W,H,D,solid=false,label=m){add(new T.BoxGeometry(W,H,D),m,x,y,z);if(solid)colliders.push({id:`${label}-${colliders.length}`,min:[x-W/2,y-H/2,z-D/2],max:[x+W/2,y+H/2,z+D/2]});}
 function cyl(m,x,y,z,r,h,n=12){add(new T.CylinderGeometry(r,r,h,n),m,x,y,z);}
 function plant(x,z,r=.6){box('stone',x,.45,z,r*2,.9,r*2,true,'planter');add(new T.SphereGeometry(r*.88,8,6),'leaf',x,1.08,z);}
 function sign(s,y,z,p=.105){const len=[...s].reduce((a,c)=>a+(c===' '?3:(glyphs[c]?.[0].length??5)+1),0)*p;box('dark',0,y,z,len+.7,p*9,.12);let x=-len/2;for(const c of s){if(c===' '){x+=p*3;continue;}const g=glyphs[c]??glyphs.I;for(let j=0;j<7;j++)for(let i=0;i<g[j].length;i++)if(g[j][i]==='1')box('bronze',x+i*p,y+(3-j)*p,z+.08,p*.78,p*.78,.075);x+=(g[0].length+1)*p;}}
 function envelope(h){
  box('stone',0,.05,0,w,.1,d);box('ivory',0,h/2,-d/2+.18,w,h,.36,true,'rear-wall');
  for(const x of [-w/2+.18,w/2-.18])box('concrete',x,h/2,0,.36,h,d,true,'side-wall');
  for(const s of [-1,1]){const W=(w-door)/2,x=s*(door/2+W/2);box('stone',x,.42,d/2-.14,W,.84,.3,true,'front-sill');box('glass',x,(h+.8)/2,d/2-.08,W,h-.8,.12,true,'front-glass');for(let xx=door/2;xx<w/2;xx+=2.7)box('bronze',s*xx,h/2,d/2+.06,.1,h,.22);}
  box('ivory',0,h-.38,d/2,door,.76,.48,true,'door-lintel');
  for(const s of [-1,1])box('bronze',s*(door/2+.09),(h-.76)/2,d/2,.18,h-.76,.48,true,'door-jamb');
 }
 function table(x,z,round=false){if(round)cyl('ivory',x,.79,z,.7,.1,20);else box('ivory',x,.79,z,1.5,.1,1.1);cyl('bronze',x,.4,z,.08,.75);cyl('dark',x,.11,z,.4,.12);colliders.push({id:`table-${colliders.length}`,min:[x-.76,0,z-.56],max:[x+.76,.85,z+.56]});for(const s of [-1,1]){box('teak',x,.47,z+s*.97,.57,.12,.52);box('dark',x,.78,z+s*1.19,.59,.65,.1);for(const a of [-1,1])for(const b of [-1,1])box('bronze',x+a*.22,.24,z+s*.97+b*.19,.045,.46,.045);}cyl('bronze',x,.91,z,.075,.16);add(new T.SphereGeometry(.11,6,5),'leaf',x,1.04,z);}
 async function finish(extra){for(const[m,gs]of Object.entries(buckets)){const geo=mergeVertices(mergeGeometries(gs));const mesh=new T.Mesh(geo,mats[m]);mesh.name=`${name}: ${m}`;mesh.castShadow=m!=='glass';mesh.receiveShadow=true;scene.add(mesh);}scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(scene);let triangles=0;scene.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});const data=await new GLTFExporter().parseAsync(scene,{binary:true});const dir=`${OUT}/${id}`;await mkdir(dir,{recursive:true});await writeFile(`${dir}/model.glb`,Buffer.from(data));
  const manifest={id,name,glb:'model.glb',file:'model.glb',units:'METERS',upAxis:'Y',frontAxis:'+Z',floorY:.1,mainFootprintMeters:[w,d],entrance:[0,d/2],entranceWidth:door,approachAnchor:[0,0,d/2+7],entranceAnchor:[0,.1,d/2],interiorAnchor:[0,.1,d/2-4],bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},colliders,collisionRectangles:colliders.filter(c=>c.min[1]<2&&c.max[1]>.25).map(c=>({id:c.id,min:[c.min[0],c.min[2]],max:[c.max[0],c.max[2]]})),surfaces:[{id:'ground-floor',min:[-w/2,-d/2],max:[w/2,d/2],y:.1},{id:'entry-approach',min:[-door/2,d/2],max:[door/2,d/2+7],y:.1}],triangles,drawCalls:scene.children.length,bytes:data.byteLength,provenance:{type:'ORIGINAL_PROCEDURAL_GEOMETRY',creator:'AmpliWorld',externalAssets:[],externalImages:[],textures:[],license:'Project-original'},...extra};await writeFile(`${dir}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({id,dir,triangles,bytes:data.byteLength,bounds:manifest.bounds,colliders:colliders.length}));return manifest;
 }
 return {box,cyl,add,plant,sign,envelope,table,finish,colliders};
}
async function hotel(stars){
 const five=stars===5,id=five?'GC-HOTEL-005':'GC-HOTEL-004',name=five?'Aurelia Grand Hotel':'Meridian Hotel',w=45,d=35,h=five?6:5,n=five?15:9,step=4,door=4.8;
 const k=kit(id,name,w,d,door),{box,cyl,add,plant,sign}=k;k.envelope(h);
 // A genuine hollow lobby: stone shell, framed glazing, open central entry.
 box('stone',0,.11,0,w-.8,.04,d-.8);for(let x=-20;x<=20;x+=2.5)box('concrete',x,.136,0,.025,.009,d-.8);
 for(const s of [-1,1]){box('stone',s*13,1.2,-9,9,2.2,1.2,true,'reception');box('bronze',s*13,2.34,-9,9.2,.12,1.4);box('dark',s*13,1,-15,9,1.8,.7,true,'lobby-display');for(let j=0;j<4;j++){box('teak',s*13+(j-1.5)*2.1,.49,5,1.75,.65,.95,true,'lobby-seat');box('teak',s*13+(j-1.5)*2.1,.86,5.4,1.75,.8,.13);}plant(s*19,12,1);plant(s*6,15,.7);}
 box('ivory',0,h-.15,0,w+.6,.3,d+.6);box('ivory',0,h-.8,d/2+2,14,.4,5.5);for(const s of [-1,1])box('bronze',s*6.6,(h-1)/2,d/2+4,.22,h-1,.22,true,'portico-column');
 sign(five?'AURELIA GRAND':'MERIDIAN HOTEL',h-.85,d/2+.25,.13);
 for(let f=0;f<n;f++){
  const y=h+f*step,W=five&&f>=12?33:39,D=five&&f>=12?23:27;
  box('ivory',0,y+.16,0,W+.6,.32,D+.6,true,'upper-floor');
  for(const s of [-1,1]){box('glass',0,y+2,s*(D/2-.1),W-1,3.6,.12);box('glass',s*(W/2-.1),y+2,0,.12,3.6,D-1);box('dark',0,y+.65,s*(D/2-.18),W-.8,.7,.2);}
  for(let x=-W/2+.6;x<W/2;x+=3.9)for(const s of [-1,1]){box('concrete',x,y+2,s*D/2,.28,3.7,.55);box('bronze',x+1.75,y+2,s*(D/2+.01),.07,3.5,.14);}
  for(let z=-D/2+1;z<D/2;z+=4)for(const s of [-1,1])box('concrete',s*W/2,y+2,z,.55,3.7,.28);
  // Deep projecting balconies with clear glass rail panels, side dividers and caps.
  for(let x=-W/2+2.1;x<W/2-1;x+=3.9)for(const s of [-1,1]){const z=s*(D/2+1.05);box('concrete',x,y+.4,z,3.75,.2,2.4);box('glass',x,y+1.04,s*(D/2+2.23),3.62,1.05,.07);box('bronze',x,y+1.6,s*(D/2+2.23),3.78,.06,.1);for(const a of [-1,1])box('ivory',x+a*1.88,y+1.01,z,.11,1.3,2.4);if(f%3===0){cyl('dark',x,y+.83,z,.24,.1,8);cyl('bronze',x,y+.65,z,.025,.3,6);}}
  if(f%3===2)for(const s of [-1,1]){box('concrete',s*(W/2+.65),y+.38,0,1.6,.2,D);box('glass',s*(W/2+1.42),y+1.04,0,.07,1.05,D);box('bronze',s*(W/2+1.42),y+1.6,0,.1,.06,D);}
 }
 const top=h+n*step,tw=five?34:40,td=five?24:28;
 box('ivory',0,top+.25,0,tw+1,.5,td+1);box('stone',0,top+.67,0,tw, .32,td);
 for(const s of [-1,1]){box('glass',0,top+1.3,s*td/2,tw,1.1,.09);box('bronze',0,top+1.9,s*td/2,tw,.07,.1);box('glass',s*tw/2,top+1.3,0,.09,1.1,td);}
 for(const x of [-10,10])for(const z of [-7,7])box('bronze',x,top+2.2,z,.2,3.1,.2);
 for(let x=-11;x<=11;x+=1)box('bronze',x,top+3.7,0,.14,.25,16);
 box('dark',0,top+1.45,-6,8,1.4,4);box('stone',0,top+2.2,-6,8.5,.18,4.5);
 return k.finish({category:'HOTEL',stars,storeys:n+1,hotel:{lobbyEnterable:true,guestRoomsEnterable:false},functionality:'VISUAL_ENTERABLE_LOBBY_ONLY',notes:['Original multi-sided architectural geometry; no photo or facade textures.','Open 4.8m front portal and hollow lobby; upper rooms are exterior architectural representations.','Balcony slabs, railings, columns, mullions, stepped roof and portico have real depth.','No booking or room-service functionality.']});
}
async function restaurant(v){
 const defs=[['GC-RESTAURANT-001','Olive Terrace','OLIVE TERRACE'],['GC-RESTAURANT-002','Bronze Garden','BRONZE GARDEN'],['GC-RESTAURANT-003','Ember Grill','EMBER GRILL']], [id,name,label]=defs[v],w=16,d=14,h=4.4,door=3.2,k=kit(id,name,w,d,door),{box,cyl,add,plant,sign}=k;k.envelope(h);
 box(v===1?'dark':'stone',0,.11,0,w-.7,.04,d-.7);for(let x=-7;x<8;x+=1)box('concrete',x,.14,0,.018,.015,d-.7);
 for(const x of [-4.7,4.7])for(const z of [-.5,3.1])k.table(x,z,v===0);
 box('stone',-2.4,.68,-4.7,7.5,1.15,1.3,true,'service-counter');box('ivory',-2.4,1.3,-4.7,7.7,.12,1.5);for(let x=-5.6;x<1;x+=.3)box('bronze',x,.69,-3.99,.07,1,.09);
 box('dark',0,1,-6.4,13,1.8,.7,true,'rear-kitchen');box('ivory',0,1.94,-6.4,13.2,.1,.85);for(const x of [-5,-2,1,4]){box('bronze',x,2.45,-6.58,1.8,.08,.45);for(let j=0;j<4;j++)cyl('glass',x-.55+j*.35,2.7,-6.48,.09,.4,8);}box('stone',3.8,3,-6.2,3,.6,1.15);for(let x=2.8;x<5.2;x+=.15)box('dark',x,3.01,-5.61,.045,.38,.03);
 sign(label,3.69,7.23,.09);for(const x of [-6.3,6.3])plant(x,7.75,.65);
 for(const x of [-4,4]){cyl('bronze',x,3.2,2,.045,1.2,8);add(new T.SphereGeometry(.38,12,8),'light',x,2.61,2);}
 if(v===0){
  // Mediterranean-inspired restrained pale pavilion and deep open pergola.
  box('ivory',0,4.49,0,17.4,.32,15.4);box('stone',0,4.74,0,16.3,.18,14.3);
  for(const x of [-7.6,7.6])box('bronze',x,2.25,9,.16,4.5,.16,true,'pergola-post');
  for(let x=-8;x<=8;x+=.55)box('teak',x,4.58,8,.13,.24,4.4);
  for(const s of [-1,1])for(let z=-6;z<6.5;z+=.48)box('ivory',s*8.12,2.3,z,.25,3.9,.12);
 }else if(v===1){
  // Floating double bronze-edged roof, cloister screens and paired lanterns.
  box('dark',0,4.46,0,18,.25,16);box('bronze',0,4.63,0,18.1,.09,16.1);box('ivory',0,4.87,-.3,14,.35,11.7);box('dark',0,5.13,-.3,15.2,.18,13);box('bronze',0,5.24,-.3,15.3,.07,13.1);
  for(const s of [-1,1])for(let z=-6.7;z<6.8;z+=.34)box('bronze',s*8.2,2.15,z,.15,4,.1);
  for(const x of [-5.5,5.5]){box('bronze',x,3.15,7.7,.55,.85,.55);box('light',x,3.15,7.7,.48,.71,.48);box('dark',x,3.62,7.7,.68,.08,.68);}
 }else{
  // Sawtooth roof silhouette formed by true sloping concrete roof sections.
  for(let j=0;j<4;j++){const g=new T.BoxGeometry(4.25,.18,15.6);g.rotateZ(.115);add(g,'concrete',-6.375+j*4.25,4.68,0);box('glass',-4.29+j*4.25,4.61,0,.09,.5,15.2);box('bronze',-4.2+j*4.25,4.87,0,.15,.09,15.8);}
  for(const x of [-7,-5,5,7])box('stone',x,2.3,7.34,.4,4.6,.74);
  box('dark',4.5,5.6,-4,1.8,2,1.8);box('bronze',4.5,6.67,-4,2.1,.16,2.1);
 }
 return k.finish({category:'RESTAURANT',variant:v,functionality:'VISUAL_ENTERABLE_RESTAURANT_ONLY',notes:['Original built geometry with open 3.2m entry and central circulation aisle.','Four dining tables, eight chairs, counter, kitchen display and pendant lights.','No ordering, staffing or payment functionality.']});
}
await mkdir(OUT,{recursive:true});const manifests=[];for(const s of [5,4])manifests.push(await hotel(s));for(let v=0;v<3;v++)manifests.push(await restaurant(v));await writeFile(`${OUT}/hospitality-index.json`,JSON.stringify(manifests.map(({id,name,mainFootprintMeters,bounds,entranceWidth,approachAnchor,triangles,bytes})=>({id,name,mainFootprintMeters,bounds,entranceWidth,approachAnchor,triangles,bytes})),null,2)+'\n');
