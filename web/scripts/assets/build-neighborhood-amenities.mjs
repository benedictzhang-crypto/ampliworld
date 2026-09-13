/** Original metric compound amenities. Local +Z fronts. No textures or imported art. */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mkdir, writeFile } from 'node:fs/promises';
if(!globalThis.FileReader)globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}};
const out=new URL('../../public/assets/3d/ampliworld/GC-NEIGHBORHOOD-KIT-001/',import.meta.url);
await mkdir(out,{recursive:true});
const specs=[
  {id:'GC-NK-SUPERMARKET',kind:'supermarket',file:'supermarket.glb',name:'Neighbourhood Market',nameZh:'社区生活超市',width:24,depth:16,height:5,doorWidth:4,open:true},
  {id:'GC-NK-MANAGEMENT',kind:'management',file:'management.glb',name:'Community Services',nameZh:'物业服务中心',width:12,depth:10,height:4,doorWidth:2.6,open:true},
  {id:'GC-NK-GUARDHOUSE',kind:'guardhouse',file:'guardhouse.glb',name:'Gatehouse',nameZh:'门卫室',width:5,depth:4,height:3,doorWidth:1.5,open:true},
  {id:'GC-NK-CLUBHOUSE',kind:'clubhouse',file:'clubhouse.glb',name:'Garden Residents Club',nameZh:'园林会所',width:40,depth:30,height:10,doorWidth:6,open:true},
  {id:'GC-NK-VILLA',kind:'villa',file:'villa.glb',name:'Grand Garden Residence',nameZh:'独栋园邸',width:40,depth:32,height:16,doorWidth:4,open:false},
  {id:'GC-NK-TOWNHOUSE',kind:'townhouse',file:'townhouse.glb',name:'Three Garden Townhouses',nameZh:'三联排花园住宅',width:45,depth:20,height:12,doorWidth:2,open:false},
  {id:'GC-NK-DUPLEX',kind:'duplex',file:'duplex.glb',name:'Paired Garden Residences',nameZh:'双拼花园住宅',width:30,depth:22,height:12,doorWidth:2.4,open:false},
  {id:'GC-NK-POOL',kind:'reflecting-pool',file:'pool.glb',name:'Protected Residents Pool',nameZh:'会所景观水池',width:26,depth:18,height:1.8,doorWidth:0,open:false},
];
const prototypes=[];
for(const spec of specs){
  const buckets={},colliders=[],surfaces=[],materials={},F=.18;
  for(const [m,color,metalness,roughness]of [['stone',0xbdc3be,.03,.86],['white',0xe5e2d8,.02,.74],['gold',0xb39a66,.65,.34],['dark',0x33464c,.23,.45],['wood',0x957a57,.02,.81],['sage',0x93a192,0,.85],['leaf',0x638260,0,.94],['red',0xc36d53,0,.73],['cream',0xe7d7a5,0,.78],['water',0x6b9c9c,.34,.22]])materials[m]=new T.MeshStandardMaterial({name:m,color,metalness,roughness});
  materials.glass=new T.MeshStandardMaterial({name:'clear architectural glass',color:0xaec9c8,transparent:true,opacity:.21,roughness:.13,metalness:.08,side:T.DoubleSide,depthWrite:false});
  function add(g,m,x=0,y=0,z=0){g.translate(x,y,z);if(g.index)g=g.toNonIndexed();delete g.attributes.uv;(buckets[m]??=[]).push(g);}
  function solid(id,x,y,z,w,h,d){colliders.push({id:`${id}-${colliders.length}`,min:[x-w/2,y-h/2,z-d/2],max:[x+w/2,y+h/2,z+d/2]});}
  function box(m,x,y,z,w,h,d,collision=false,id=m){add(new T.BoxGeometry(w,h,d),m,x,y,z);if(collision)solid(id,x,y,z,w,h,d);}
  function floor(id,x,z,w,d,y=F){box('stone',x,y/2,z,w,y,d);surfaces.push({id,min:[x-w/2,z-d/2],max:[x+w/2,z+d/2],y});}
  function roof(x,z,w,d,y,rise=1){
    const topW=w*.62,topD=d*.58,v=[x-w/2,y,z-d/2,x+w/2,y,z-d/2,x+w/2,y,z+d/2,x-w/2,y,z+d/2,x-topW/2,y+rise,z-topD/2,x+topW/2,y+rise,z-topD/2,x+topW/2,y+rise,z+topD/2,x-topW/2,y+rise,z+topD/2];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex([0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7,4,5,6,4,6,7,3,2,1,3,1,0]);const idx=g.index.array;for(let i=0;i<idx.length;i+=3){const a=idx[i+1];idx[i+1]=idx[i+2];idx[i+2]=a;}g.computeVertexNormals();add(g,'dark');
    for(const s of [-1,1])box('gold',x,y+.025,z+s*d/2,w,.08,.12);
  }
  function framedWindow(x,y,z,w,h,side=false){
    box('glass',x,y,z,side?.045:w,h,side?w:.045);
    if(side){for(const dz of [-w/2,w/2])box('dark',x,y,z+dz,.1,h+.12,.07);}
    else for(const dx of [-w/2,w/2])box('dark',x+dx,y,z,.07,h+.12,.1);
  }
  function planter(x,z,w=2,d=2){box('stone',x,.58,z,w,.8,d,true,'planter');box('leaf',x,1.08,z,w-.18,.28,d-.18);}
  function chair(x,z){box('wood',x,.62,z,.58,.1,.58,true,'chair-seat');box('dark',x,.4,z,.16,.45,.16);box('wood',x,.97,z+.26,.58,.63,.06);}
  function desk(x,z,w=2.6,d=1.2){box('wood',x,.93,z,w,.12,d,true,'desk');for(const dx of [-w*.4,w*.4])box('dark',x+dx,.57,z,.1,.63,d*.75);box('dark',x,1.27,z-.2,.67,.46,.08);box('dark',x,1.025,z+.2,.65,.025,.2);}
  function openShell(w,d,h,door){
    floor('interior-floor',0,0,w,d);
    const wallH=h-.38-F;
    box('white',0,F+wallH/2,-d/2+.1,w,wallH,.2,true,'rear-wall');
    for(const s of [-1,1])box('white',s*(w/2-.1),F+wallH/2,0,.2,wallH,d,true,'side-wall');
    const wing=(w-door)/2;
    for(const s of [-1,1]){
      const x=s*(door/2+wing/2);
      box('stone',x,.44,d/2-.08,wing,.52,.16,true,'window-plinth');
      box('white',x,h-.66,d/2-.08,wing,.62,.16,true,'window-header');
      box('glass',x,(.72+h-1)/2,d/2-.025,wing-.14,h-1.72,.06,true,'fixed-front-glazing');
      for(const dx of [-wing/2+.08,wing/2-.08])box('dark',x+dx,(F+h-.38)/2,d/2+.015,.1,h-.38-F,.1);
    }
    box('gold',0,h-.72,d/2+.06,door+.22,.22,.16,true,'door-header');
    box('stone',0,h-.24,0,w+.4,.28,d+.4,true,'roof-slab');
    for(const s of [-1,1])box('gold',0,h-.07,s*(d/2+.16),w+.4,.14,.08);
    // Door leaf is parked parallel to a side return; the central opening stays clear.
    box('glass',-door/2-.14,1.32,d/2-.76,.045,2.15,1.28,true,'parked-open-door');
  }
  if(spec.kind==='supermarket'){
    openShell(24,16,5,4);
    for(const x of [-6,0,6]){
      box('sage',x,1.13,-2,1.25,1.9,5.8,true,'gondola-shelf');
      for(const y of [.65,1.23,1.81]){
        box('white',x,y,-2,1.45,.08,6.0);
        for(const side of [-1,1])for(let i=0;i<7;i++)box(i%3===0?'red':i%3===1?'cream':'sage',x+side*.48,y+.21,-4.5+i*.78,.27,.33,.34);
      }
    }
    box('wood',-7, .75,4,6,1.14,1.45,true,'produce-counter');
    for(let i=0;i<5;i++){
      const x=-9.4+i*1.2;
      box('dark',x,1.35,4,1.05,.12,1.23);
      for(const dx of [-.25,0,.25])for(const dz of [-.25,.25])add(new T.IcosahedronGeometry(.12,0),i%2?'red':'leaf',x+dx,1.51,4+dz);
    }
    box('white',7,.84,4.7,3.6,1.32,1.35,true,'checkout-counter');
    box('dark',6.3,1.7,4.7,.68,.45,.08);box('dark',7.7,1.51,4.7,1.25,.05,.85);
    for(const x of [-10.5,10.5])planter(x,7.0,1.1,1.1);
    box('sage',0,4.15,8.15,12,.65,.17);
    // Solid geometric icon: a basket, rather than a pretend interactive checkout UI.
    for(const dx of [-1.1,1.1])box('cream',dx,4.15,8.255,.08,.42,.045);
    box('cream',0,3.95,8.255,2.2,.08,.045);
  }else if(spec.kind==='management'){
    openShell(12,10,4,2.6);desk(-2.8,-1);desk(2.8,-1);chair(-2.8,-2.2);chair(2.8,-2.2);
    box('sage',0,1.12,-4.58,4.6,1.88,.62,true,'archive-cabinet');
    for(const x of [-1.7,-.6,.6,1.7])box('gold',x,1.14,-4.24,.045,1.45,.03);
    for(const x of [-4.7,4.7]){chair(x,2.8);planter(x,4.1,.8,.8);}
    box('sage',0,3.3,5.16,5.4,.47,.1);
  }else if(spec.kind==='guardhouse'){
    openShell(5,4,3,1.5);desk(.65,-.55,2.1,.8);chair(.65,-1.2);
    framedWindow(-2.515,1.6,-.3,2.1,1.15,true);framedWindow(2.515,1.6,-.3,2.1,1.15,true);
    box('gold',0,2.67,2.17,3.5,.16,.08);
  }else if(spec.kind==='clubhouse'){
    floor('clubhouse-floor',0,0,40,30);
    floor('clubhouse-front-portico',0,16.4,20,4);
    // Side wings and a rear volume leave a real 14×10m ground lobby.
    for(const s of [-1,1])box('white',s*13.5,2.23,0,13,4.1,30,true,'club-wing');
    box('white',0,2.23,-5.0,14,4.1,20,true,'club-rear-core');
    box('stone',0,6.55,0,40,4.55,30,true,'upper-storey-envelope');
    for(const s of [-1,1]){
      box('sage',s*5.0,2.23,14.9,4,4.1,.2,true,'lobby-front-return');
      box('white',s*6.9,2.23,10,.2,4.1,10,true,'lobby-side-return');
      framedWindow(s*13.4,2.25,15.12,10.3,3.1);
      for(const z of [-9,0,9])framedWindow(s*20.12,6.55,z,6.4,2.8,true);
      box('gold',s*3.12,2.25,15.08,.14,4.1,.18);
      box('glass',s*8.5,4.91,16.1,6.2,1.1,.045);
    }
    box('white',0,4.27,10,14,.15,10,true,'club-lobby-ceiling');
    box('dark',0,4.45,15.35,18,.18,4.3);
    for(const x of [-8,-4,4,8])box('white',x,2.29,16.6,.5,4.22,.5,true,'portico-column');
    for(const x of [-14,-7,0,7,14])framedWindow(x,6.55,15.12,5.2,2.8);
    box('white',0,9.01,0,40.3,.35,30.3);
    for(const s of [-1,1])box('gold',0,9.28,s*15.12,40.3,.15,.15);
    box('sage',0,9.58,-5,12,.7,8);box('dark',0,9.975,-5,12.1,.05,8.1);
    desk(-4,7.1,3.4,1.1);for(const x of [2.2,4.2])chair(x,7.4);planter(5,12,1.8,1.8);
  }else if(spec.kind==='villa'){
    box('stone',0,.09,0,40,.18,32,true,'villa-foundation');
    floor('villa-forecourt',0,16.6,22,5.2);
    box('white',0,6.69,0,20,13.02,29,true,'villa-central-mass');
    for(const s of [-1,1])box('stone',s*15,5.34,-1,10,10.32,30,true,'villa-wing');
    roof(0,0,20.7,30,13.2,2.4);
    for(const s of [-1,1])roof(s*15,-1,10.6,30.8,10.5,1.8);
    box('dark',0,15.82,-2,3,.36,2);
    for(const x of [-8,-4,4,8]){
      box('stone',x,3.63,16.8,.58,6.9,.58,true,'villa-portico-column');
      box('gold',x,6.83,16.8,.7,.18,.7);
    }
    box('white',0,7.15,16.7,20.3,.28,5.2);
    for(const y of [2.2,6.25,10.2])for(const x of [-7,0,7]){
      framedWindow(x,y,14.56,3.7,2.6);framedWindow(x,y,-14.56,3.7,2.6);
    }
    for(const s of [-1,1])for(const y of [2.2,6.6])for(const z of [-10,-2,6])framedWindow(s*20.055,y,z,3.1,2.6,true);
    box('wood',0,2.2,14.6,4,4.04,.12);box('gold',0,2.2,14.68,.09,3.9,.05);
    for(const s of [-1,1]){box('gold',s*9.8,7.93,16.7,.08,1.25,5.1);box('glass',s*5,7.93,19.22,9.4,1.25,.055);planter(s*10,18,1.2,1.2);}
  }else if(spec.kind==='townhouse'||spec.kind==='duplex'){
    box('stone',0,.09,0,spec.width,.18,spec.depth,true,'residential-foundation');
    const count=spec.kind==='townhouse'?3:2,module=spec.width/count;
    for(let i=0;i<count;i++){
      const x=(i-(count-1)/2)*module,front=spec.depth/2;
      box(i%2?'sage':'white',x,5.04,0,module,9.72,spec.depth,true,'sealed-residence-module');
      roof(x,0,module-.08,spec.depth+.55,9.9,2.1);
      box('stone',x,3.62,front+.65,module*.68,.2,2.8);
      box('wood',x,1.76,front+.08,2.0,3.15,.12);
      for(const y of [1.9,5.05,8.15])for(const dx of [-module*.31,module*.31]){
        framedWindow(x+dx,y,front+.08,2.65,2.2);framedWindow(x+dx,y,-front-.08,2.65,2.2);
      }
      box('white',x,6.58,front+.58,module*.8,.17,1.65);
      box('glass',x,7.18,front+1.4,module*.8,1.02,.04);
      for(const s of [-1,1])box('gold',x+s*module*.395,7.18,front+.6,.065,1.1,1.62);
      floor(`front-door-${i}`,x,front+1.2,3.3,2.4);
    }
    for(const s of [-1,1])for(const y of [2.1,5.1,8.1])for(const z of [-5,5])framedWindow(s*(spec.width/2+.07),y,z,2.1,2.05,true);
  }else if(spec.kind==='reflecting-pool'){
    // Raised basin avoids cutting any parent terrain. Glazed guards make its
    // non-swimmable status physically honest while preserving a clear water view.
    floor('pool-north-rim',0,-7.8,26,2.4,.7);floor('pool-south-rim',0,7.8,26,2.4,.7);
    floor('pool-west-rim',-11.8,0,2.4,13.2,.7);floor('pool-east-rim',11.8,0,2.4,13.2,.7);
    box('stone',0,.1,0,21.2,.2,13.2);
    box('water',0,.52,0,21.2,.06,13.2);
    for(const s of [-1,1]){
      box('glass',0,1.24,s*6.64,21.3,1.06,.055,true,'pool-safety-glass');
      box('glass',s*10.64,1.24,0,.055,1.06,13.3,true,'pool-safety-glass');
      box('gold',0,1.8,s*6.64,21.4,.04,.07);box('gold',s*10.64,1.8,0,.07,.04,13.4);
    }
    floor('pool-step-low',0,11.3,6,1.6,.23);floor('pool-step-middle',0,9.9,6,1.4,.46);
    floor('pool-step-top',0,8.6,6,1.2,.7);
  }
  const scene=new T.Group();scene.name=spec.id;let triangles=0;
  for(const [m,list]of Object.entries(buckets)){const g=mergeVertices(mergeGeometries(list,false));g.computeBoundingBox();g.computeBoundingSphere();triangles+=(g.index?g.index.count:g.attributes.position.count)/3;const mesh=new T.Mesh(g,materials[m]);mesh.name=`${spec.id}-${m}`;mesh.castShadow=m!=='glass';mesh.receiveShadow=true;scene.add(mesh);}
  const bounds=new T.Box3().setFromObject(scene),data=await new GLTFExporter().parseAsync(scene,{binary:true});
  await writeFile(new URL(spec.file,out),Buffer.from(data));
  surfaces.sort((a,b)=>b.y-a.y);
  prototypes.push({...spec,storeys:spec.kind==='clubhouse'?2:['townhouse','duplex'].includes(spec.kind)?3:spec.kind==='villa'?3:1,
    floorY:F,entrance:spec.kind==='reflecting-pool'?[0,12.2]:[spec.kind==='duplex'?-7.5:0,spec.depth/2+.22],colliders,surfaces,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},triangles,bytes:data.byteLength,materialDrawCalls:scene.children.length,
    entryStatus:spec.open?'OPEN_PHYSICAL_INTERIOR':spec.kind==='reflecting-pool'?'GUARDED_REFLECTING_POOL':'SEALED_DISPLAY_RESIDENCE',
    optionalPoolPrototype:['villa','clubhouse'].includes(spec.kind)?'GC-NK-POOL':null});
}
const bytes=prototypes.reduce((n,p)=>n+p.bytes,0);
if(bytes>=1000000)throw new Error(`Amenities pack exceeds 1MB: ${bytes}`);
const manifest={id:'GC-NEIGHBORHOOD-KIT-001',name:'Original Chinese compound amenity kit',nameZh:'社区配套与花园住宅原创建筑包',units:'METERS',upAxis:'Y',frontAxis:'+Z',prototypes,totalBytes:bytes,
  provenance:{creator:'AmpliWorld',type:'ORIGINAL_PROCEDURAL_GEOMETRY',externalAssets:[],textures:[]},
  limitations:['Supermarket, management office, guardhouse and clubhouse ground lobby have real open doorways and object-specific interior collision.','These are physical visual spaces, not shopping, staffing, checkout, property-management or security mechanics.','Clubhouse upper floor and all villa/townhouse/duplex interiors remain sealed; visible doors on those residences do not imply entry.','Pool is a separate raised, glass-guarded reflecting basin; swimming is not implemented and no terrain excavation is needed.','Footprints describe main bodies; bounds include projecting porches, balconies and eaves. Gate movement is owned by the consuming scene.']};
await writeFile(new URL('amenities-manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({bytes,prototypes:prototypes.map(({id,bytes,triangles})=>({id,bytes,triangles}))}));

