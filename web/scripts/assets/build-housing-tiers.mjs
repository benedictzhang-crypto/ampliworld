/** Original AmpliWorld housing kit: eight metric prototypes in four tiers.
 * Install as scripts/assets/build-housing-tiers.mjs. No images/imported meshes.
 * Geometry is indexed after material merging to keep large districts practical.
 */
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {mkdir,writeFile} from 'node:fs/promises';
if(!globalThis.FileReader)globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}};
const out=new URL('../../public/assets/3d/ampliworld/GC-HOUSING-KIT-001/',import.meta.url);
const definitions=[
  {id:'HK-LOW-01',kind:'low',name:'Weathered Court',nameZh:'旧庭六层住宅',storeys:6,floorHeight:2.85,w:36,d:14,variant:0},
  {id:'HK-LOW-02',kind:'low',name:'Faded Gallery',nameZh:'灰廊六层住宅',storeys:6,floorHeight:2.85,w:36,d:14,variant:1},
  {id:'HK-MID-01',kind:'lower-middle',name:'Garden Row',nameZh:'庭荫八层住宅',storeys:8,floorHeight:3,w:30,d:18,variant:0},
  {id:'HK-MID-02',kind:'lower-middle',name:'Courtyard Rise',nameZh:'晴庭十层住宅',storeys:10,floorHeight:3,w:30,d:18,variant:1},
  {id:'HK-HIGH-01',kind:'high',name:'Terrace Atelier',nameZh:'台地五层华邸',storeys:5,floorHeight:3.7,w:38,d:24,variant:0},
  {id:'HK-HIGH-02',kind:'high',name:'Stone Garden',nameZh:'叠园八层华邸',storeys:8,floorHeight:3.7,w:38,d:24,variant:1},
  {id:'HK-ULTRA-01',kind:'ultra',name:'Aureate Crown',nameZh:'鎏冠五十层私邸',storeys:50,floorHeight:4,w:50,d:40,variant:0},
  {id:'HK-ULTRA-02',kind:'ultra',name:'River Lantern',nameZh:'云澜六十层私邸',storeys:60,floorHeight:4,w:50,d:40,variant:1},
];
const palette={
  concrete:[0x9eaaa7,.06,.88],faded:[0xc3c1ad,.08,.83],patch:[0x7f8d8b,.04,.94],
  ivory:[0xe1dfd2,.16,.49],stone:[0xb9bab0,.09,.61],silver:[0xb3c1c8,.80,.29],
  dark:[0x283f4c,.43,.40],glazing:[0x6893a1,.75,.22],glass:[0xa7cbd1,.18,.13],
  gold:[0xbfa16a,.73,.30],rust:[0x846554,.20,.78],white:[0xd9dfdc,.12,.60],
  leaf:[0x577760,0,.94],wood:[0x8d7658,.07,.81],light:[0xffe3ad,.16,.31],
};

function build(spec){
  const H=spec.storeys*spec.floorHeight,F=spec.floorHeight,buckets={},materials={},colliders=[],surfaces=[],balconies=[];
  const ultra=spec.kind==='ultra',high=spec.kind==='high',low=spec.kind==='low';
  for(const [name,[color,metalness,roughness]] of Object.entries(palette))materials[name]=new T.MeshStandardMaterial({name,color,metalness,roughness});
  materials.glass.transparent=true;materials.glass.opacity=.24;materials.glass.depthWrite=false;materials.glass.side=T.DoubleSide;
  materials.light.emissive=new T.Color(0xffd698);materials.light.emissiveIntensity=.45;
  function add(g,m,x=0,y=0,z=0){g.translate(x,y,z);if(g.index)g=g.toNonIndexed();delete g.attributes.uv;(buckets[m]??=[]).push(g);}
  function box(m,x,y,z,w,h,d){add(new T.BoxGeometry(w,h,d),m,x,y,z);}
  function solid(id,min,max){colliders.push({id,min,max});}
  function surface(id,x0,z0,x1,z1,y){surfaces.push({id,min:[x0,z0],max:[x1,z1],y});}
  function closedMass(id,x,z,w,d,y0,y1,m){box(m,x,(y0+y1)/2,z,w,y1-y0,d);solid(id,[x-w/2,y0,z-d/2],[x+w/2,y1,z+d/2]);}
  function plant(x,y,z,w=1.1){box('stone',x,y+.23,z,w,.46,w*.65);add(new T.IcosahedronGeometry(w*.42,0),'leaf',x,y+.62,z);}
  // Three closed rails and a projecting slab create actual usable balcony form.
  // These are exterior geometry only: upper apartments and access are not built.
  function balcony(id,x,z,w,d,y,front=-1,style='glass'){
    box(low?'concrete':'ivory',x,y-.10,z,w,.20,d);
    const railMat=low?(spec.variant?'faded':'concrete'):style,railH=low?.87:1.03;
    if(front===0){ // side-facing balcony, outer edge selected by x sign
      const sx=Math.sign(x)||1;
      box(railMat,x+sx*(w/2-.07),y+railH/2,z,.14,railH,d);
      for(const sz of [-1,1])box(railMat,x,y+railH/2,z+sz*(d/2-.07),w,railH,.14);
    }else{
      box(railMat,x,y+railH/2,z+front*(d/2-.07),w,railH,.14);
      for(const sx of [-1,1])box(railMat,x+sx*(w/2-.07),y+railH/2,z,.14,railH,d);
    }
    balconies.push({id,position:[x,y,z],width:w,depth:d,frontDirection:front===0?(x<0?'-X':'+X'):front<0?'-Z':'+Z'});
    solid(`${id}-slab`,[x-w/2,y-.2,z-d/2],[x+w/2,y,z+d/2]);
  }
  function ac(x,y,z,side=1){box('white',x,y,z,.78,.53,.33);box('dark',x,y,z+side*.176,.53,.32,.025);box('rust',x,y-.32,z,.87,.035,.45);}
  function cage(x,y,z){
    for(const dx of [-.64,0,.64])box('rust',x+dx,y,z,.035,1.26,.04);
    for(const dy of [-.61,.61])box('rust',x,y+dy,z,1.34,.035,.04);
  }
  function window(x,y,z,w,h,side){
    if(side==='x')box('glazing',x,y,z,.055,h,w);
    else box('glazing',x,y,z,w,h,.055);
  }
  function poly(rx,rz,count=12,round=true){return Array.from({length:count},(_,i)=>{const a=i*Math.PI*2/count,c=Math.cos(a),s=Math.sin(a),p=round?.48:1;
    return [Math.sign(c)*Math.pow(Math.abs(c),p)*rx,Math.sign(s)*Math.pow(Math.abs(s),p)*rz];});}
  function loft(id,rings,mat){const n=rings[0].p.length,v=[],f=[];
    for(const r of rings)for(const [x,z] of r.p)v.push(x,r.y,z);
    for(let r=0;r<rings.length-1;r++)for(let i=0;i<n;i++){const a=r*n+i,b=r*n+(i+1)%n;f.push(a,a+n,b,b,a+n,b+n);}
    for(const t of [0,rings.length-1]){const p=rings[t].p,c=p.reduce((a,b)=>[a[0]+b[0]/n,a[1]+b[1]/n],[0,0]),idx=v.length/3;v.push(c[0],rings[t].y,c[1]);for(let i=0;i<n;i++)f.push(...(t?[idx,t*n+(i+1)%n,t*n+i]:[idx,t*n+i,t*n+(i+1)%n]));}
    let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));g.setIndex(f);g=g.toNonIndexed();g.computeVertexNormals();add(g,mat);
    if(id)for(let i=0;i<rings.length-1;i++){const b=new T.Box3();for(const r of [rings[i],rings[i+1]])for(const [x,z] of r.p)b.expandByPoint(new T.Vector3(x,r.y,z));solid(`${id}-${i}`,b.min.toArray(),b.max.toArray());}
  }
  function plate(y,p,mat='ivory',thick=.16){loft(null,[{y:y-thick,p},{y,p}],mat);}
  // Reserved dimensions include every balcony and canopy, not just the core.
  box('stone',0,.02,0,spec.w,.04,spec.d);surface('parcel',-spec.w/2,-spec.d/2,spec.w/2,spec.d/2,.04);
  const bw=ultra?43:high?33.8:spec.w-.4,bd=ultra?29:high?16.5:low?10.6:14;
  const baseMat=low?(spec.variant?'concrete':'faded'):high?'stone':'ivory';

  if(!ultra){
    // Six-metre entrance lobby is open from +Z, lit and genuinely walkable.
    const gap=high?7:6,wing=(bw-gap)/2;
    for(const s of [-1,1])closedMass(`ground-wing-${s}`,s*(gap/2+wing/2),0,wing,bd,.06,F,baseMat);
    closedMass('lobby-rear-wall',0,-bd/2+.12,gap,.24,.06,F,'dark');
    box('stone',0,.03,0,gap,.06,bd);surface('open-lobby',-gap/2,-bd/2,gap/2,bd/2,.06);
    box('ivory',0,F-.12,0,gap,.24,bd);solid('lobby-ceiling',[-gap/2,F-.24,-bd/2],[gap/2,F,bd/2]);
    for(const s of [-1,1])box(low?'concrete':'gold',s*(gap/2-.10),F/2,bd/2+.05,.20,F,.18);
    box('light',0,F-.31,0,gap-1.0,.045,.32);
    box('wood',-gap/2+.32,.71,-bd/2+1.2,.45,1.30,1.4);
    solid('lobby-mailboxes',[-gap/2+.09,.06,-bd/2+.50],[-gap/2+.55,1.36,-bd/2+1.90]);
    // Closed rear service/elevator doors do not pretend apartments are built.
    for(const s of [-1,1])box('silver',s*1.14,1.12,-bd/2+.27,1.15,2.12,.08);
    if(high){
      const stepFloor=spec.variant?5:3,split=stepFloor*F;
      closedMass('upper-lower-envelope',0,0,bw,bd,F,split,'glazing');
      closedMass('setback-upper-envelope',2.0,0,bw-6.5,bd-3.0,split,H,'glazing');
      for(let k=1;k<spec.storeys;k++){
        const y=k*F,upper=k>=stepFloor,w=upper?bw-6.5:bw,d=upper?bd-3:bd,cx=upper?2:0;
        box('ivory',cx,y-.12,0,w+.28,.24,d+.28);
        for(const side of [-1,1])for(const dx of [-8.4,8.4])balcony(`terrace-${k}-${side}-${dx}`,cx+dx,side*(d/2+1.40),10.7,2.80,y,side);
      }
      for(const x of [-9.4,-3.4,7.4,13.4])plant(x,split,-8.45,1.3);
      // Roof slab stays within the exact storey-derived top height.
      box('ivory',2,H-.12,0,bw-6.1,.24,bd-2.6);
    }else{
      closedMass('upper-residential-envelope',0,0,bw,bd,F,H,baseMat);
      for(let k=1;k<spec.storeys;k++)box(low?'patch':'ivory',0,k*F-.10,0,bw+.12,.20,bd+.12);
      const columns=low?6:5,spacing=(bw-4)/columns;
      for(let k=1;k<spec.storeys;k++)for(const side of [-1,1])for(let col=0;col<columns;col++){
        const x=(col-(columns-1)/2)*spacing;
        window(x,k*F+F*.53,side*(bd/2+.032),low?1.48:1.85,low?1.30:1.52,'z');
        if((low?col%3===spec.variant:col===1||col===3)){
          const depth=low?1.55:1.75,width=low?3.5:4.5;
          balcony(`balcony-${k}-${side}-${col}`,x,side*(bd/2+depth/2),width,depth,k*F,side,low?'concrete':'glass');
        }
      }
      for(let k=1;k<spec.storeys;k++)for(const side of [-1,1])for(const z of [-2.5,2.5])window(side*(bw/2+.031),k*F+F*.53,z,1.40,1.4,'x');
      box('ivory',0,H-.10,0,bw+.20,.20,bd+.20);
      if(low){
        // Irregular raised repair patches, rust frames, ACs and cages are real geometry.
        for(let i=0;i<9;i++)box(i%2?'patch':'faded',-14+(i*7)%29,1.2+(i%5)*F,bd/2+.045,.60+(i%3)*.30,.58+(i%2)*.60,.055);
        for(let i=0;i<10;i++)ac(-12+(i%5)*6,4.7+Math.floor(i/5)*F*2,bd/2+.21);
        for(let i=0;i<6;i++)cage(-11+(i%3)*11,4.4+Math.floor(i/3)*F*2,bd/2+.22);
      }else{
        for(let i=0;i<4;i++)ac(-10+i*6.7,5.15,-bd/2-.21,-1);
        box('gold',0,2.60,bd/2+.15,4.6,.11,.22);
      }
    }
    // Four facade corner accents and sparse high-tier window divisions.
    if(high)for(const s of [-1,1]){
      for(const z of [-bd/2+.12,bd/2-.12])box('ivory',s*(bw/2-.12),F+(H-F)*.34,z,.25,(H-F)*.68,.25);
      for(const x of [-12,-6,0,6,12])box('gold',x,H*.47,s*(bd/2+.026),.045,H*.63,.044);
    }
  }else{
    const profile=(t)=>{
      const rx=(spec.variant?20.5:21.3)*(1-.18*t),rz=14.5*(1-.12*t),cx=spec.variant?3.7*Math.sin(t*Math.PI):0;
      const shape=spec.variant?[[rx,-rz*.75],[rx,rz*.75],[rx*.75,rz],[-rx*.75,rz],[-rx,rz*.75],[-rx,-rz*.75],[-rx*.75,-rz],[rx*.75,-rz]]:poly(rx,rz,12,true);
      return shape.map(([x,z])=>[x+cx,z]);
    };
    const rings=[0,.12,.42,.72,1].map(t=>({y:t*H,p:profile(t)}));
    loft('sealed-ultra-envelope',rings,spec.variant?'dark':'glazing');
    // Every two floors has a thin closed geometric band; all storeys remain metric.
    for(let k=2;k<spec.storeys;k+=2)plate(k*F,profile(k/spec.storeys),'ivory',.20);
    plate(H,profile(1),'gold',.28);
    for(const i of [0,1,3,4,6,7]){
      if(i>=rings[0].p.length)continue;
      for(let k=0;k<rings.length-1;k++){
        const a=new T.Vector3(rings[k].p[i][0],rings[k].y,rings[k].p[i][1]),b=new T.Vector3(rings[k+1].p[i][0],rings[k+1].y,rings[k+1].p[i][1]);
        // Stop fins below the top plane so nominal height is exact.
        if(b.y===H)b.y-=.35;
        const delta=b.clone().sub(a),g=new T.BoxGeometry(.16,delta.length(),.16);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));
        const c=a.add(b).multiplyScalar(.5);add(g,'gold',c.x,c.y,c.z);
      }
    }
    const floors=Array.from({length:12},(_,i)=>Math.round((i+1)*(spec.storeys-1)/13));
    for(const [i,k] of floors.entries()){
      const t=k/spec.storeys,shape=profile(t),xs=shape.map(p=>p[0]),zs=shape.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,rx=(Math.max(...xs)-Math.min(...xs))/2,rz=Math.max(...zs),y=k*F;
      for(const s of [-1,1])balcony(`ultra-view-${k}-${s}`,cx,s*(rz+1.05),12.0,3.0,y,s);
      const s=i%2?-1:1;balcony(`ultra-side-${k}`,cx+s*(rx+.63),0,3.0,8.4,y,0);
    }
    // A closed premium arrival lobby: doors, portico and structural columns.
    box('ivory',0,3.15,17.1,17.5,.30,4.2);box('gold',0,3.34,17.1,17.6,.075,4.3);
    for(const s of [-1,1]){box('ivory',s*7.4,1.55,18.1,.32,3.1,.38);solid(`portico-column-${s}`,[s*7.4-.17,0,17.9],[s*7.4+.17,3.1,18.3]);}
    box('dark',0,1.45,14.63,4.8,2.9,.14);box('gold',0,2.98,14.78,5.2,.11,.14);
    solid('closed-ultra-street-door',[-2.45,0,14.5],[2.45,3.05,14.9]);
    solid('ultra-portico-roof',[-8.8,3.0,14.95],[8.8,3.39,19.25]);
  }

  const scene=new T.Group();scene.name=spec.name;let triangles=0,vertices=0;
  for(const [name,list] of Object.entries(buckets)){
    const merged=mergeGeometries(list,false);if(!merged)throw new Error(`Merge failed:${name}`);
    const g=mergeVertices(merged,1e-5);merged.dispose();for(const part of list)part.dispose();
    g.computeBoundingBox();g.computeBoundingSphere();for(const value of g.attributes.position.array)if(!Number.isFinite(value))throw new Error('Non-finite vertex');
    triangles+=(g.index?g.index.count:g.attributes.position.count)/3;vertices+=g.attributes.position.count;
    const mesh=new T.Mesh(g,materials[name]);mesh.name=`${spec.id}-${name}`;scene.add(mesh);
  }
  scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(scene);
  if(bounds.min.x< -spec.w/2-.005||bounds.max.x>spec.w/2+.005||bounds.min.z< -spec.d/2-.005||bounds.max.z>spec.d/2+.005)throw new Error(`Footprint exceeded:${spec.id}`);
  if(Math.abs(bounds.max.y-H)>.02)throw new Error(`Height mismatch:${spec.id}:${bounds.max.y}/${H}`);
  if(triangles>5000)throw new Error(`Per-prototype5000triangle budget exceeded:${spec.id}:${triangles}`);
  surfaces.sort((a,b)=>b.y-a.y);
  return {scene,manifest:{kind:spec.kind,id:spec.id,name:spec.name,nameZh:spec.nameZh,file:`${spec.id.toLowerCase()}.glb`,
    height:H,storeys:spec.storeys,floorHeight:F,footprintMeters:{width:spec.w,depth:spec.d},
    bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},colliders,surfaces,
    frontAxis:'+Z',localGroundY:0,lobbyFloorY:.06,entrance:[0,bd/2+.20],balconies,
    lobby:{built:!ultra,open:!ultra,interiorApartmentAccess:false,clearHeight:ultra?null:F-.30},
    residentialPlan:ultra?{residencesPerFloor:1,elevators:2,status:'planned-not-built',apartmentInteriorsBuilt:false,elevatorsOperational:false}:{apartmentInteriorsBuilt:false},
    stats:{triangles,vertices,drawCalls:scene.children.length,indexed:true},
    provenance:{type:'original-procedural',author:'AmpliWorld',externalImages:[],externalMeshes:[],handAuthoredUniqueInstanceClaim:false},
    limitations:['Upper apartments and balcony access are future work; only declared ground lobbies are open.','Exterior tier geometry is built; occupancy, elevators and residential interiors are not simulated here.'],
  }};
}

const assets=[];let totalBytes=0,totalTriangles=0;
for(const def of definitions){const {scene,manifest}=build(def),buffer=Buffer.from(await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true}));manifest.stats.bytes=buffer.byteLength;totalBytes+=buffer.byteLength;totalTriangles+=manifest.stats.triangles;assets.push({buffer,manifest});}
if(totalBytes>2400000)throw new Error(`Eight indexed housing GLBs exceed2.4MB:${totalBytes}`);
await mkdir(out,{recursive:true});for(const asset of assets)await writeFile(new URL(asset.manifest.file,out),asset.buffer);
const manifest={id:'GC-HOUSING-KIT-001',version:1,units:'meters',prototypes:assets.map(a=>a.manifest),stats:{prototypeCount:8,totalBytes,totalTriangles},
  implementation:'Eight original reusable indexed prototypes, not hand-authored unique models for every placement. Parent owns district replacement, rendering and occupancy.'};
await writeFile(new URL('kit-manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
process.stdout.write(JSON.stringify({stats:manifest.stats,prototypes:manifest.prototypes.map(p=>({id:p.id,...p.stats}))})+'\n');

