/** Original AmpliWorld CBD assets. Install as web/scripts/assets/build-cbd.mjs.
 * Procedural metric geometry only: no imported meshes, textures or branding.
 */
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mkdir, writeFile } from 'node:fs/promises';
if (!globalThis.FileReader) globalThis.FileReader=class {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}
};

const PALETTE={
  glass:[0x517f91,.78,.18],glassLight:[0x90b4bc,.7,.22],glassDark:[0x203e52,.78,.20],
  gold:[0xc6aa6e,.8,.26],silver:[0xc2ced1,.75,.30],stone:[0xccc9bc,.08,.66],
  dark:[0x23333c,.45,.38],light:[0xf6dc9a,.35,.30],leaf:[0x426953,0,.85],
};

function author(spec){
  const buckets={},colliders=[],materials={};
  for(const [key,[color,metalness,roughness]] of Object.entries(PALETTE)){
    materials[key]=new T.MeshStandardMaterial({name:key,color,metalness,roughness});
    if(key==='light'){materials[key].emissive=new T.Color(0xf5ce85);materials[key].emissiveIntensity=.8;}
  }
  const add=(g,m,x=0,y=0,z=0,ry=0)=>{
    if(ry)g.rotateY(ry);g.translate(x,y,z);if(g.index)g=g.toNonIndexed();
    delete g.attributes.uv;(buckets[m]??=[]).push(g);
  };
  const box=(m,x,y,z,w,h,d,ry=0)=>add(new T.BoxGeometry(w,h,d),m,x,y,z,ry);
  const solid=(id,min,max)=>colliders.push({id,min,max});
  const tube=(points,r,m,radial=6)=>{
    if(points.length<2)return;
    add(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(1,points.length-1),r,radial,false),m);
  };
  const disk=(m,r,h,y,x=0,z=0,n=48)=>add(new T.CylinderGeometry(r,r,h,n),m,x,y,z);
  const roundedSlab=(m,w,d,r,y,h)=>{
    const s=new T.Shape(),x=-w/2,z=-d/2;
    s.moveTo(x+r,z);s.lineTo(-x-r,z);s.quadraticCurveTo(-x,z,-x,z+r);
    s.lineTo(-x,-z-r);s.quadraticCurveTo(-x,-z,-x-r,-z);s.lineTo(x+r,-z);
    s.quadraticCurveTo(x,-z,x,-z-r);s.lineTo(x,z+r);s.quadraticCurveTo(x,z,x+r,z);
    const g=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:8});g.rotateX(-Math.PI/2);add(g,m,0,y,0);
  };
  // Sweep samples return world-local positions. All envelope ends are capped.
  const sweep=(sample,levels,segments,mat='glass',accent=false)=>{
    const verts=[],indices=[];
    for(let i=0;i<=levels;i++)for(let j=0;j<=segments;j++)verts.push(...sample(i/levels,j/segments*Math.PI*2));
    // Conservative vertical bands support third-person camera collision at any height.
    for(let i=0;i<levels;i+=6){
      const band=new T.Box3();
      for(let k=i;k<=Math.min(levels,i+6);k++)for(let j=0;j<segments;j++)band.expandByPoint(new T.Vector3(...sample(k/levels,j/segments*Math.PI*2)));
      solid(`envelope-${colliders.length}`,band.min.toArray(),band.max.toArray());
    }
    for(let i=0;i<levels;i++)for(let j=0;j<segments;j++){
      const a=i*(segments+1)+j,b=a+segments+1;indices.push(a,b,a+1,a+1,b,b+1);
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(verts,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    add(geometry,mat);
    for(const top of [false,true]){
      const t=top?1:0,points=Array.from({length:segments},(_,j)=>sample(t,j/segments*Math.PI*2));
      const center=points.reduce((v,p)=>v.add(new T.Vector3(...p)),new T.Vector3()).multiplyScalar(1/segments);
      const positions=[...center.toArray(),...points.flat()],faces=[];
      for(let j=0;j<segments;j++){const a=j+1,b=(j+1)%segments+1;faces.push(...(top?[0,b,a]:[0,a,b]));}
      const cap=new T.BufferGeometry();cap.setAttribute('position',new T.Float32BufferAttribute(positions,3));cap.setIndex(faces);cap.computeVertexNormals();add(cap,top?'silver':'dark');
    }
    if(accent)for(let j=0;j<segments;j+=3){const pts=[];for(let i=0;i<=levels;i++)pts.push(new T.Vector3(...sample(i/levels,j/segments*Math.PI*2)));tube(pts,.16,'silver',5);}
  };
  const floorBand=(sample,t,segments,mat='silver',radius=.16)=>{
    const pts=Array.from({length:segments+1},(_,j)=>new T.Vector3(...sample(t,j/segments*Math.PI*2)));tube(pts,radius,mat,5);
  };
  // Pedestrian-scale plaza and a fully sealed podium root prevent floating towers.
  roundedSlab('stone',96,96,10,0,.18);
  solid('plaza-slab',[-48,0,-48],[48,.18,48]);
  roundedSlab('dark',66,62,12,.18,5.82);
  roundedSlab('gold',67,63,12,5.80,.24);
  solid('sealed-podium',[-33,0,-31],[33,6.04,31]);
  // Entrance is an honest sealed lobby facade; interiors/elevators are not built.
  box('glassDark',0,2.65,31.045,17,4.9,.11);
  for(const x of [-8.6,-2.6,2.6,8.6])box('gold',x,2.70,31.16,.16,5.05,.30);
  box('gold',0,5.30,31.17,17.5,.22,.34);
  // Arcing cantilever with a thin illuminated underside, not a rectangular roof.
  const canopy=new T.Shape();canopy.moveTo(-16,-3);canopy.quadraticCurveTo(0,-7,16,-3);canopy.lineTo(16,5);canopy.quadraticCurveTo(0,10,-16,5);canopy.closePath();
  const cg=new T.ExtrudeGeometry(canopy,{depth:.46,bevelEnabled:true,bevelSize:.15,bevelThickness:.10,bevelSegments:1,curveSegments:16});cg.rotateX(-Math.PI/2);add(cg,'silver',0,5.2,33);
  box('light',0,5.10,35,25,.10,.55);
  for(const x of [-13.5,13.5]){
    add(new T.CylinderGeometry(.20,.25,5.0,10),'gold',x,2.68,36.5);
    solid(`entrance-column-${x}`,[x-.25,.18,36.25],[x+.25,5.18,36.75]);
  }
  solid('entrance-canopy',[-16.2,5.05,26],[16.2,5.90,43.2]);
  for(const s of [-1,1])for(const z of [-35,-14,14,36]){
    box('stone',s*40,.50,z,5,.65,7);
    solid(`planter-${s}-${z}`,[s*40-2.5,.18,z-3.5],[s*40+2.5,1.9,z+3.5]);
    for(let i=0;i<3;i++){
      const g=new T.SphereGeometry(1,10,6);g.scale(1.1,.9,1.1);add(g,'leaf',s*40,.98,z-2+i*2);
    }
  }
  for(const s of [-1,1]){
    box('gold',s*21,.30,40,10,.20,2.1);box('dark',s*21,.53,40,9.7,.27,1.7);
    solid(`bench-${s}`,[s*21-5,.18,38.95],[s*21+5,.665,41.05]);
  }

  if(spec.id==='GC-OFFICE-001'){
    const sample=(t,a)=>{
      const theta=a+1.48*t, r=29*(1-.69*Math.pow(t,1.65))*(1+.13*Math.cos(3*a));
      return [r*Math.cos(theta),6+474*t,r*Math.sin(theta)];
    };
    sweep(sample,120,60,'glass',true);
    for(let i=1;i<119;i++)floorBand(sample,i/120,60,i%10===0?'gold':'silver',i%10===0?.30:.14);
    for(let j=0;j<3;j++){
      const pts=[];for(let i=0;i<=120;i++)pts.push(new T.Vector3(...sample(i/120,j*Math.PI*2/3)));
      tube(pts,.52,'gold',7);
    }
    disk('gold',7.9,.7,480.35);
    add(new T.ConeGeometry(1.5,19.3,16),'silver',0,490.35,0);
    solid('crown-spire',[-1.5,480,-1.5],[1.5,500,1.5]);
    solid('tower-base',[-33,6,-33],[33,20,33]);
  }
  if(spec.id==='GC-OFFICE-002'){
    const sample=(t,a)=>{
      const shoulder=t<.57?1+.065*Math.sin(t/.57*Math.PI):1-.70*Math.pow((t-.57)/.43,.75);
      const wave=1+.035*Math.cos(4*a),turn=.26*Math.sin(Math.PI*t);
      const xx=27*shoulder*wave*Math.cos(a),zz=24*shoulder*wave*Math.sin(a);
      return [xx*Math.cos(turn)+zz*Math.sin(turn)+3.5*Math.sin(t*Math.PI),6+316*t,zz*Math.cos(turn)-xx*Math.sin(turn)];
    };
    sweep(sample,96,32,'glassLight',true);
    for(let i=1;i<95;i++)floorBand(sample,i/96,32,i%12===0?'gold':'silver',i%12===0?.34:.17);
    for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
      const pts=[];for(let i=0;i<=96;i++)pts.push(new T.Vector3(...sample(i/96,a)));tube(pts,.45,'silver',6);
    }
    // Four unequal crystalline shoulders form an original oblique lantern.
    const crown=(t,a)=>{const r=8*(1-t);return [r*Math.cos(a),322+16*t+3*Math.sin(a)*(1-t),r*.89*Math.sin(a)];};
    sweep(crown,8,16,'glassDark');
    add(new T.ConeGeometry(1.05,12,12),'gold',0,344,0);
    solid('crown-spire',[-1.05,338,-1.05],[1.05,350,1.05]);
    solid('tower-base',[-30,6,-27],[31,20,27]);
  }
  if(spec.id==='GC-OFFICE-003'){
    const central=(t,a)=>{
      const r=15.8*(1-.62*t)*(1+.045*Math.cos(5*a));
      return [r*Math.cos(a),6+377*t,r*Math.sin(a)];
    };
    sweep(central,108,48,'glass',true);
    for(let i=1;i<108;i++)floorBand(central,i/108,48,i%15===0?'gold':'silver',.17);
    // Asymmetrical clustered petals shrink through rounded, explicit setbacks.
    const petals=[{a:0,h:302,r:12,d:17},{a:2.1,h:348,r:10.5,d:16.5},{a:4.25,h:264,r:12.4,d:17}];
    for(const [k,p] of petals.entries()){
      const profile=(t,a)=>{
        let setback=1;
        for(const edge of [.36,.59,.79])setback-=.12*Math.min(1,Math.max(0,(t-edge)/.045));
        const radius=p.r*(1-.43*t)*setback*(1+.07*Math.cos(3*a));
        const center=p.d*(1-.22*t),spin=p.a+.14*t;
        return [center*Math.cos(spin)+radius*Math.cos(a),6+(p.h-6)*t,center*Math.sin(spin)+radius*Math.sin(a)];
      };
      sweep(profile,90,36,k%2?'glassLight':'glassDark',true);
      for(let i=1;i<Math.floor(p.h/3.9);i++)floorBand(profile,i/Math.floor(p.h/3.9),36,i%14===0?'gold':'silver',.18);
      const tip=profile(1,0);disk('gold',p.r*.31,.5,p.h+.25,tip[0]-p.r*(1-.43)*.64,tip[2]);
    }
    disk('silver',5.7,.6,383.3);
    add(new T.CylinderGeometry(.48,2.0,22,16),'silver',0,394.6,0);
    add(new T.ConeGeometry(.48,14.4,12),'gold',0,412.8,0);
    solid('crown-spire',[-2,383,-2],[2,420,2]);
    solid('tower-base',[-33,6,-33],[33,20,33]);
  }
  const scene=new T.Group();scene.name=spec.name;
  let triangles=0;
  for(const [key,geoms] of Object.entries(buckets)){
    const merged=mergeGeometries(geoms,false);
    if(!merged)throw new Error(`Cannot merge ${spec.id}/${key}`);
    merged.computeBoundingBox();merged.computeBoundingSphere();
    for(const component of merged.attributes.position.array)if(!Number.isFinite(component))throw new Error('Non-finite vertex');
    triangles+=merged.attributes.position.count/3;
    const mesh=new T.Mesh(merged,materials[key]);mesh.name=`${spec.id}-${key}`;scene.add(mesh);
    for(const g of geoms)g.dispose();
  }
  scene.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(scene),height=bounds.max.y-bounds.min.y;
  if(Math.abs(height-spec.height)>.005)throw new Error(`${spec.id}: height ${height}, expected ${spec.height}`);
  if(bounds.max.x-bounds.min.x>100||bounds.max.z-bounds.min.z>100)throw new Error('Plaza exceeds 100 m');
  return {scene,manifest:{
    id:spec.id,name:spec.name,nameZh:spec.nameZh,assetVersion:1,units:'meters',coordinateSystem:'right-handed Y-up; front +Z',
    heightMeters:spec.height,footprintMeters:{width:96,depth:96},plazaTopY:.18,towerBaseMaxWidthMeters:67,
    bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},entranceAnchor:[0,.18,37],
    files:{lod0:'tower-lod0.glb'},lods:[{level:0,file:'tower-lod0.glb',triangles,drawCalls:scene.children.length}],
    colliders,design:spec.design,
    provenance:{type:'original-procedural',author:'AmpliWorld',externalMeshes:[],externalTextures:[],referenceReproduction:false,
      note:'Original geometry generated mathematically. No imported textures, trademark logos or reproduced building mesh.'},
    stats:{triangles,materialDrawCalls:scene.children.length,meshes:scene.children.length},
    limitations:['Exterior-only sealed podium; lobby interiors and lifts pending.','Only LOD0 exported; automatic LOD/HLOD and district streaming are integration work.','Conservative AABB ground colliders; no occupied upper-floor interiors.'],
  }};
}

for(const spec of [
  {id:'GC-OFFICE-001',name:'Aurelia Helix',nameZh:'曜旋',height:500,design:'Rounded triangular swept tower with continuous 85-degree twist, three bronze helicoidal ribs, slender crown and sealed podium.'},
  {id:'GC-OFFICE-002',name:'Prism Gate',nameZh:'棱境',height:350,design:'Faceted curved crystal envelope with oblique shoulders, gently shifting centreline and an asymmetric crown lantern.'},
  {id:'GC-OFFICE-003',name:'Celestial Spire',nameZh:'星穹',height:420,design:'Asymmetric rounded petal cluster, graduated three-stage setbacks, central taper and fine two-stage spire.'},
]){
  const {scene,manifest}=author(spec);
  const out=new URL(`../../public/assets/3d/ampliworld/${spec.id}/`,import.meta.url);
  await mkdir(out,{recursive:true});
  const glb=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});
  await writeFile(new URL('tower-lod0.glb',out),Buffer.from(glb));
  await writeFile(new URL('tower-manifest.json',out),JSON.stringify(manifest,null,2)+'\n');
  process.stdout.write(`${spec.id}: ${manifest.heightMeters} m; ${manifest.stats.triangles} triangles; ${manifest.stats.materialDrawCalls} meshes\n`);
}
