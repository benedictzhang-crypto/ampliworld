/** Original four-level mall garage. Absolute Y, mall-local X/Z; runtime world Z offset=-188. */
import { createRequire } from 'node:module';
import { dirname,join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir,writeFile,readFile } from 'node:fs/promises';
const require=createRequire(new URL('../../package.json',import.meta.url));
const threeRoot=dirname(dirname(require.resolve('three')));
const T=await import(pathToFileURL(join(threeRoot,'build/three.module.js')).href);
const {GLTFExporter}=await import(pathToFileURL(join(threeRoot,'examples/jsm/exporters/GLTFExporter.js')).href);
const {mergeGeometries,mergeVertices}=await import(pathToFileURL(join(threeRoot,'examples/jsm/utils/BufferGeometryUtils.js')).href);
const {FontLoader}=await import(pathToFileURL(join(threeRoot,'examples/jsm/loaders/FontLoader.js')).href);
const {TextGeometry}=await import(pathToFileURL(join(threeRoot,'examples/jsm/geometries/TextGeometry.js')).href);
const font=new FontLoader().parse(JSON.parse(await readFile(join(threeRoot,'examples/fonts/helvetiker_regular.typeface.json'),'utf8')));
if(!globalThis.FileReader)globalThis.FileReader=class{readAsArrayBuffer(b){b.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}};
const out=new URL('../../public/assets/3d/ampliworld/GC-MALL-GARAGE-002/',import.meta.url).pathname;await mkdir(out,{recursive:true});
const buckets={},materials={},colliders=[],surfaces=[],bays=[],cars=[],lightAnchors=[],levels=[];
for(const [name,color,metalness,roughness]of [['asphalt',0x4a555c,.03,.9],['white',0xe1e3dd,.05,.7],['concrete',0xaeb7b3,.03,.85],['gold',0xb9a574,.6,.35],['blue',0x5a7d92,.22,.5],['sage',0x45895d,.04,.7],['amber',0xc58d36,.08,.65],['violet',0x8c61b5,.06,.6],['wood',0xa18461,.03,.77],['foodRed',0xbd7359,0,.82],['steel',0x849ba4,.68,.36],['dark',0x23343e,.28,.38],['light',0xffe6b7,0,.45],['carWhite',0xc9d4d2,.65,.29],['carRed',0xa36f66,.6,.3],['rubber',0x1e292e,0,.93],['glass',0x314d5b,.55,.22]])materials[name]=new T.MeshStandardMaterial({name,color,metalness,roughness});
materials.light.emissive=new T.Color(0xffd797);materials.light.emissiveIntensity=.95;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function add(g,m,x=0,y=0,z=0){g.translate(x,y,z);if(g.index)g=g.toNonIndexed();delete g.attributes.uv;(buckets[m]??=[]).push(g);}
function solid(id,min,max,extra={}){colliders.push({id,min,max,...extra});}
function box(m,x,y,z,w,h,d,collision=false,id=m,extra={}){add(new T.BoxGeometry(w,h,d),m,x,y,z);if(collision)solid(`${id}-${colliders.length}`,[x-w/2,y-h/2,z-d/2],[x+w/2,y+h/2,z+d/2],extra);}
function quad(m,a,b,c,d){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([...a,...b,...c,...a,...c,...d],3));g.computeVertexNormals();add(g,m);}
function slab(id,x0,z0,x1,z1,y,level){box('asphalt',(x0+x1)/2,y-.12,(z0+z1)/2,x1-x0,.24,z1-z0);surfaces.push({id,min:[x0,z0],max:[x1,z1],y,level,levelY:y});}
function label(value,x,y,z,size=.8,ry=0,flat=false,material='white'){
  const g=new TextGeometry(value,{font,size,depth:.012,curveSegments:1,bevelEnabled:false});g.computeBoundingBox();g.translate(-(g.boundingBox.max.x-g.boundingBox.min.x)/2,0,0);if(flat)g.rotateX(-Math.PI/2);g.rotateY(ry);add(g,material,x,y,z);
}
function beam(m,a,b,w=.12,d=.12){const p=new T.Vector3(...a),q=new T.Vector3(...b),delta=q.clone().sub(p),g=new T.BoxGeometry(w,delta.length(),d);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));const c=p.add(q).multiplyScalar(.5);add(g,m,c.x,c.y,c.z);}
const helix={center:[78,-45],radius:24,halfWidth:6,turns:3,topY:-7.2,dropPerTurn:6,landingAngle:.22,startAngle:Math.PI,direction:'INCREASING_ANGLE_COS_SIN',shaftHole:{min:[46,-77],max:[110,-13]}};
const entryRamp={id:'B1-INTERNAL-ENTRY',min:[74,59],max:[114,73],axis:'x',lowY:-7.2,highY:-4.2,startY:-7.2,endY:-4.2,ascendingDirection:'+X',joinsVestibuleAt:[114,-4.2,66],joinsB1At:[74,-7.2,66],width:14};
const ys=[-7.2,-13.2,-19.2,-25.2],rowZ=[-70,-48,-26,-4,18,40],bankStarts=[-96,-20];
const inRect=(x,z,r)=>x>r.min[0]&&x<r.max[0]&&z>r.min[1]&&z<r.max[1];
const elevatorGroups=[
  {id:'LIFT-NW',center:[-76,-78.5],min:[-82,-81],max:[-70,-76],frontZ:-76,frontDirection:'+Z'},
  {id:'LIFT-NE',center:[24,-78.5],min:[18,-81],max:[30,-76],frontZ:-76,frontDirection:'+Z'},
  {id:'LIFT-SW',center:[-76,63],min:[-82,60.5],max:[-70,65.5],frontZ:60.5,frontDirection:'-Z'},
  {id:'LIFT-SE',center:[24,63],min:[18,60.5],max:[30,65.5],frontZ:60.5,frontDirection:'-Z'},
].map(g=>({...g,carCount:4,carWidth:2.7,carDepth:4.6,doorWidth:2,doorCenters:[-4.5,-1.5,1.5,4.5].map(dx=>[g.center[0]+dx,g.frontZ]),shaftOwner:'RUNTIME_MALL_ELEVATORS'}));
const zones=[{id:'A',color:0x5a7d92,material:'blue',label:'BLUE'},{id:'B',color:0x45895d,material:'sage',label:'GREEN'},{id:'C',color:0xc58d36,material:'amber',label:'AMBER'},{id:'D',color:0x8c61b5,material:'violet',label:'VIOLET'}];
const zoneAt=(x,z)=>zones[(z<-15?0:2)+(x<-29?0:1)];
const foodZone={id:'B1-FOOD-ACTIVITY',level:'B1',levelY:-7.2,min:[-99,-74],max:[-46,0],entrance:[-76,-74],removedBayIds:[],usage:'PHYSICAL_FOOD_COUNTERS_SEATING_AND_ACTIVITY_SPACE'};
const omitBay=(li,r,bank,q)=>li===0&&r<4&&bank===0&&q<16;

function car(x,z,y,level,index){
  const material=['blue','carWhite','carRed','sage'][index%4],tall=index%5===0,H=tall?1.95:1.5,W=tall?2.04:1.92,L=tall?5.15:4.8;
  // Closed tapered body and roof, geometry-only wheels and glazing.
  box(material,x,y+.61,z,W,.57,L);
  box(material,x,y+.41,z,W*.95,.18,L*1.02);
  const shape=new T.Shape();shape.moveTo(-L*.30,.84);shape.lineTo(-L*.18,H-.08);shape.lineTo(L*.16,H);shape.lineTo(L*.32,.84);shape.closePath();
  const cabin=new T.ExtrudeGeometry(shape,{depth:W*.78,bevelEnabled:false,curveSegments:1});cabin.translate(0,0,-W*.39);cabin.rotateY(Math.PI/2);add(cabin,'glass',x,y,z);
  box(material,x,y+H,z-.05,W*.79,.07,L*.35);
  for(const sx of [-1,1])for(const sz of [-1,1]){
    const g=new T.CylinderGeometry(.33,.33,.2,12);g.rotateZ(Math.PI/2);add(g,'rubber',x+sx*W*.49,y+.33,z+sz*L*.31);
    const rim=new T.CylinderGeometry(.21,.21,.025,8);rim.rotateZ(Math.PI/2);add(rim,'steel',x+sx*W*.548,y+.33,z+sz*L*.31);
  }
  for(const sx of [-1,1]){box('light',x+sx*.64,y+.66,z+L*.505,.43,.09,.025);box('carRed',x+sx*.64,y+.67,z-L*.505,.4,.08,.025);}
  const id=`garage-${level}-car-${index}`;solid(id,[x-W/2-.09,y,z-L/2-.08],[x+W/2+.09,y+H+.07,z+L/2+.08],{level,levelY:y,kind:'parked-car'});
  cars.push({id,type:tall?'SUV':'sedan',position:[x,y,z],yaw:0,dimensions:[W,H,L],level,levelY:y,original:true});
}
for(let li=0;li<ys.length;li++){
  const y=ys[li],level=`B${li+1}`,ceiling=y+5.6,levelStart=bays.length;
  levels.push({id:level,index:li,level:li+1,floorY:y,levelY:y,ceilingY:ceiling,ceilingUndersideY:ceiling,structuralClearance:5.6,minimumServicesClearance:4.8,bayCount:li===0?152:216,parkingType:li===0?'VIP':'STANDARD',elevatorGroups:4,elevatorCars:16});
  // Explicit rectangle subdivision preserves the helical shaft and B1 entry void.
  const xs=[-104,-82,-70,18,30,46,74,110,114],zs=[-85,-81,-77,-76,-13,59,60.5,65.5,70];
  for(let ix=0;ix<xs.length-1;ix++)for(let iz=0;iz<zs.length-1;iz++){
    const x0=xs[ix],x1=xs[ix+1],z0=zs[iz],z1=zs[iz+1],x=(x0+x1)/2,z=(z0+z1)/2;
    if(inRect(x,z,helix.shaftHole)||elevatorGroups.some(g=>inRect(x,z,g)))continue;
    if(li===0&&inRect(x,z,entryRamp))continue;
    slab(`${level}-floor-${ix}-${iz}`,x0,z0,x1,z1,y,level);
    box('concrete',x,ceiling+.16,z,x1-x0,.32,z1-z0,true,`${level}-ceiling`,{level,levelY:y,kind:'ceiling'});
  }
  slab(`${level}-west-helix-landing`,38,-52,61,-38,y,level);
  solid(`${level}-landing-slab`,[38,y-.24,-52],[61,y,-38],{level,levelY:y,kind:'landing-slab'});
  // Structural perimeter walls avoid both the side entry and the helix corridor.
  box('white',-103.8,y+2.8,-7.5,.4,5.6,155,true,`${level}-west-wall`);
  box('white',5,y+2.8,-84.8,218,5.6,.4,true,`${level}-north-wall`);
  box('white',113.8,y+2.8,li===0?-13: -7.5,.4,5.6,li===0?144:155,true,`${level}-east-wall`);
  if(li===0)box('white',-15,y+2.8,69.8,178,5.6,.4,true,`${level}-south-wall`);
  else box('white',5,y+2.8,69.8,218,5.6,.4,true,`${level}-south-wall`);
  // Floor-edge guards leave the entire fourteen-metre west landing open.
  for(const [x0,z0,x1,z1]of [[46,-77,46,-52],[46,-38,46,-13],[110,-77,110,-13],[46,-77,110,-77],[46,-13,110,-13]]){
    box('steel',(x0+x1)/2,y+.61,(z0+z1)/2,Math.max(.14,x1-x0),1.22,Math.max(.14,z1-z0),true,`${level}-shaft-guard`,{level,levelY:y});
    box('gold',(x0+x1)/2,y+1.23,(z0+z1)/2,Math.max(.17,x1-x0),.07,Math.max(.17,z1-z0));
  }
  for(let r=0;r<6;r++)for(let bank=0;bank<2;bank++)for(let q=0;q<18;q++){
    const x=bankStarts[bank]+q*3.3,z=rowZ[r],id=`${level}-${String.fromCharCode(65+r)}${bank+1}-${String(q+1).padStart(2,'0')}`;
    if(omitBay(li,r,bank,q)){foodZone.removedBayIds.push(id);continue;}
    const zone=zoneAt(x,z);
    bays.push({id,center:[x,y,z],width:3.15,length:6,row:String.fromCharCode(65+r),zone:zone.id,zoneColor:zone.color,parkingType:li===0?'VIP':'STANDARD',vip:li===0,level,levelY:y});
    for(const s of [-1,1])box('white',x+s*1.575,y+.008,z,.06,.016,6);
    box('white',x,y+.008,z+3,3.15,.016,.06);
    box(zone.material,x,y+.012,z+2.69,3,.024,.48);
    box('concrete',x,y+.09,z+2.28,1.7,.18,.18,true,`${id}-wheelstop`,{level,levelY:y,kind:'wheelstop'});
    if((q===0&&r===0)||id==='B1-F2-12')label(id,x,y+.031,z+2.82,.27,Math.PI,true);
  }
  // Twenty-four occupied bays per level: four per row, safely inside each bay.
  for(let r=0;r<6;r++)for(const [bank,q]of [[0,2],[0,11],[1,4],[1,13]])
    if(!omitBay(li,r,bank,q))car(bankStarts[bank]+q*3.3,rowZ[r],y,level,cars.length);
  if(li===0)for(const r of [4,5])for(const q of [5,8,14,16])car(bankStarts[0]+q*3.3,rowZ[r],y,level,cars.length);
  if(bays.length-levelStart!==(li===0?152:216))throw new Error(`${level} incorrect bay count`);
  for(const [x,z]of [[-102,-81],[-102,-3],[-102,53],[112,-81],[112,-3],[112,53],[-70,-82],[-20,-82],[30,-82],[75,-82],[-70,68],[-20,68],[30,68],[60,68]]){
    const zone=zoneAt(x,z);
    box('concrete',x,y+2.8,z,.9,5.6,.9,true,`${level}-column`);
    box(zone.material,x,y+1.9,z,.98,3.8,.98);box('gold',x,y+.22,z,1.15,.44,1.15);
    label(`${level}-${zone.id}`,x,y+2.25,z+.51,.30);
  }
  for(const z of [-59,-37,-15,7,29,54])for(const x of [-76,-37,3]){
    box('dark',x,y+5.11,z,18,.18,.7,true,`${level}-light-housing`,{level,levelY:y,kind:'fixture'});
    box('light',x,y+5.005,z,17.6,.035,.44);
  }
  for(const z of [-58,-14,54]){
    box('blue',-29,y+5.05,z,7,.5,.16,true,`${level}-zone-sign`,{level,levelY:y,kind:'fixture'});
    label(`${level}  PARKING`,-29,y+4.88,z+.09,.48);
  }
  for(const z of [-59,-15,53])for(const x of [-70,-5,38])lightAnchors.push({position:[x,y+4.95,z],level,levelY:y,intensity:2.8,distance:80});
  for(const [x,z,zone,ry]of [[-48,-84.54,zones[0],0],[5,-84.54,zones[1],0],[-48,69.54,zones[2],Math.PI],[5,69.54,zones[3],Math.PI]]){
    box(zone.material,x,y+2.15,z,16,3.0,.06);
    label(`${level} - ${zone.id}`,x,y+2.15,z+(ry===0?.045:-.045),1.15,ry);
    label(zone.label,x,y+1.25,z+(ry===0?.046:-.046),.48,ry);
  }
  label(`${level} / ${li===0?'VIP 152':'216'} BAYS`,-29,y+4.84,-84.53,.56);
  for(const g of elevatorGroups){
    const toward=g.frontDirection==='+Z'?1:-1;
    label('LIFTS',g.center[0],y+4.85,g.frontZ+toward*.12,.62,toward===1?0:Math.PI);
  }
  label('RAMP >',36,y+.025,-45,1.0,Math.PI/2,true,'gold');
  for(const z of [-59,-37,-15,7,29,58])for(const x of [-78,-29,22]){
    if(li===0&&inRect(x,z,foodZone))continue;
    box('gold',x,y+.016,z,4,.02,.13);quad('gold',[x+2,y+.032,z-.6],[x+3.1,y+.032,z],[x+2,y+.032,z+.6],[x+2.35,y+.032,z]);
  }
}
// B1 cleared food/activity block: a continuous public room, not parked cars with labels.
{
  const y=-7.2;
  box('white',-72.5,y+.012,-37,53,.024,74);
  for(const [i,z]of [-64,-46,-28,-10].entries()){
    box('wood',-95,y+.63,z,3,1.26,11,true,'B1-food-counter',{level:'B1',levelY:y,kind:'food-counter'});
    box('white',-95,y+1.31,z,3.25,.12,11.15);
    box('sage',-97.0,y+1.55,z,.22,3.1,11.2,true,'B1-food-backwall',{level:'B1',levelY:y});
    label(['NOODLES','BAKERY','TEA','FRESH'][i],-93.35,y+1.75,z,.48,Math.PI/2);
    for(let q=0;q<6;q++){
      const pz=z-4+q*1.6;
      box('dark',-94.5,y+1.41,pz,1.6,.08,1.1);
      if(i===2){box('gold',-94.5,y+1.71,pz,.36,.52,.36);}
      else for(const dx of [-.4,0,.4])add(new T.IcosahedronGeometry(.15,0),i%2?'gold':'foodRed',-94.5+dx,y+1.64,pz);
    }
  }
  for(const x of [-82,-69,-56])for(const z of [-62,-42,-22]){
    box('wood',x,y+.94,z,3,.14,2.2,true,'B1-food-table',{level:'B1',levelY:y});
    box('steel',x,y+.48,z,.22,.96,.22);
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const cx=x+sx*1.92,cz=z+sz*.69;
      box('sage',cx,y+.5,cz,.65,.14,.68,true,'B1-food-chair',{level:'B1',levelY:y});
      box('wood',cx,y+.8,cz+sz*.29,.65,.6,.09);
      box('steel',cx,y+.24,cz,.2,.48,.2);
    }
    for(const dx of [-.75,.75])box('gold',x+dx,y+1.035,z,.48,.045,.48);
  }
  for(const z of [-68,-50,-32,-14]){
    box('concrete',-46.75,y+.37,z,.8,.74,4,true,'B1-food-protective-planter',{level:'B1',levelY:y});
    box('sage',-46.75,y+.88,z,.68,.29,3.8);
  }
  box('amber',-66,y+.025,-6,35,.035,8);
  for(const x of [-81,-66,-51]){
    box('wood',x,y+.45,-3.2,7,.24,1.15,true,'B1-activity-bench',{level:'B1',levelY:y});
    for(const dx of [-2.5,2.5])box('dark',x+dx,y+.23,-3.2,.2,.46,.8);
  }
  label('FOOD + ACTIVITY',-72,y+.06,-.8,1.15,0,true,'blue');
  label('VIP PARKING',-28,y+.035,51,1.5,0,true,'gold');
}
slab('vestibule-bridge-apron',114,62,115,70,-4.2,'ARRIVAL');
// The new entry begins exactly after the preserved external vestibule. No end cap.
const rampY=x=>-7.2+(x-74)/40*3;
quad('asphalt',[74,rampY(74),59],[74,rampY(74),73],[114,rampY(114),73],[114,rampY(114),59]);
quad('concrete',[74,rampY(74)-.22,59],[114,rampY(114)-.22,59],[114,rampY(114)-.22,73],[74,rampY(74)-.22,73]);
for(const z of [59,73]){
  quad('concrete',[74,rampY(74),z],[114,rampY(114),z],[114,rampY(114)-.22,z],[74,rampY(74)-.22,z]);
  for(let x=74;x<114;x+=4){const end=Math.min(x+4,114);beam('gold',[x,rampY(x)+1.05,z],[end,rampY(end)+1.05,z],.12,.12);solid(`entry-rail-${x}-${z}`,[x,rampY(x),z-.14],[end,rampY(end)+1.12,z+.14],{kind:'entry-rail'});box('steel',x,rampY(x)+.53,z,.1,1.06,.1);}
}
// Arrival signage faces the incoming westward car; it sits beside, not above, the turn.
box('blue',110.8,-2.35,52.8,.16,1.15,12.2);
label('PARKING B1-B4 <-',110.91,-2.55,52.8,.66,Math.PI/2);
solid('arrival-sign',[110.6,-2.94,46.7],[110.95,-1.75,58.9],{kind:'fixture'});
function helixY(turn,t){return helix.topY-turn*6-6*clamp((t-.22)/(2*Math.PI-.44),0,1);}
function polar(r,t,y){const a=Math.PI+t;return [78+r*Math.cos(a),y,-45+r*Math.sin(a)];}
const cuts=[...new Set([0,.22,2*Math.PI-.22,2*Math.PI,...Array.from({length:145},(_,i)=>i/144*2*Math.PI)])].sort((a,b)=>a-b);
for(let turn=0;turn<3;turn++)for(let i=0;i<cuts.length-1;i++){
  const a=cuts[i],b=cuts[i+1],ya=helixY(turn,a),yb=helixY(turn,b);
  const i0=polar(18,a,ya),i1=polar(18,b,yb),o0=polar(30,a,ya),o1=polar(30,b,yb);
  quad('asphalt',i0,i1,o1,o0);quad('concrete',polar(18,a,ya-.22),polar(30,a,ya-.22),polar(30,b,yb-.22),polar(18,b,yb-.22));
  quad('concrete',o0,o1,polar(30,b,yb-.22),polar(30,a,ya-.22));quad('concrete',i1,i0,polar(18,a,ya-.22),polar(18,b,yb-.22));
  // Small radial bands preserve undersides for head/camera collision without
  // a single broad AABB cutting across the curved driving lane.
  for(let r=18;r<30;r+=2){
    const q=[polar(r,a,ya),polar(r+2,a,ya),polar(r,b,yb),polar(r+2,b,yb)];
    solid(`helix-road-${turn}-${i}-${r}`,[Math.min(...q.map(p=>p[0])),Math.min(ya,yb)-.22,Math.min(...q.map(p=>p[2]))],[Math.max(...q.map(p=>p[0])),Math.max(ya,yb),Math.max(...q.map(p=>p[2]))],{kind:'helix-road',turn});
  }
  const landing=(a+b)/2<.22||(a+b)/2>2*Math.PI-.22;
  for(const radius of [18,30]){
    if(radius===30&&landing)continue;
    const p0=polar(radius,a,ya),p1=polar(radius,b,yb);
    quad('white',p0,p1,[p1[0],yb+1.4,p1[2]],[p0[0],ya+1.4,p0[2]]);
    beam('gold',[p0[0],ya+1.5,p0[2]],[p1[0],yb+1.5,p1[2]],.12,.12);
    solid(`helix-${turn}-${radius}-${i}`,[Math.min(p0[0],p1[0])-.12,Math.min(ya,yb),Math.min(p0[2],p1[2])-.12],[Math.max(p0[0],p1[0])+.12,Math.max(ya,yb)+1.6,Math.max(p0[2],p1[2])+.12],{kind:'helix-barrier',turn});
  }
  if(i%6===0){const p=polar(24,(a+b)/2,(ya+yb)/2+.018);box('white',p[0],p[1],p[2],.14,.016,.45);}
}
if(bays.length!==800||cars.length!==96||foodZone.removedBayIds.length!==64)throw new Error('Garage capacity contract failed');
for(let i=0;i<bays.length;i++)for(let j=i+1;j<bays.length;j++){
  const a=bays[i],b=bays[j];if(a.level!==b.level)continue;
  if(Math.abs(a.center[0]-b.center[0])<(a.width+b.width)/2-1e-6&&Math.abs(a.center[2]-b.center[2])<(a.length+b.length)/2-1e-6)throw new Error(`Overlapping bays ${a.id}/${b.id}`);
}
for(const b of bays)if(b.center[0]+b.width/2>=40)throw new Error('Bay enters helix approach');
if(!bays.some(b=>b.id==='B1-F2-12'))throw new Error('Required VIP parking test bay removed');
for(const g of elevatorGroups)for(const r of surfaces){
  if(!ys.includes(r.y))continue;
  if(r.min[0]<g.max[0]&&r.max[0]>g.min[0]&&r.min[1]<g.max[1]&&r.max[1]>g.min[1])throw new Error(`Floor crosses lift well ${g.id}`);
}
const scene=new T.Group();scene.name='GC-MALL-GARAGE-002';let triangles=0;
for(const [m,list]of Object.entries(buckets)){const g=mergeVertices(mergeGeometries(list,false));g.computeBoundingBox();g.computeBoundingSphere();triangles+=(g.index?g.index.count:g.attributes.position.count)/3;const mesh=new T.Mesh(g,materials[m]);mesh.name=`GarageV2-${m}`;mesh.receiveShadow=true;scene.add(mesh);}
const bounds=new T.Box3().setFromObject(scene),bin=await new GLTFExporter().parseAsync(scene,{binary:true});
if(bin.byteLength>8000000)throw new Error(`Garage exceeds8MB:${bin.byteLength}`);
await writeFile(join(out,'garage.glb'),Buffer.from(bin));
const manifest={id:'GC-MALL-GARAGE-002',name:'Golden Gallery Four-level Garage',nameZh:'鎏金广场四层地下停车场',version:3,units:'meters',file:'garage.glb',coordinateSystem:'Mall-local XZ, absolute Y; world offset[0,0,-188]',worldOffset:[0,0,-188],bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},floorY:-7.2,levels,helix,entryRamp,elevatorGroups,zones,foodZone,colliders,surfaces,bays,cars,lightAnchors,lighting:{anchors:lightAnchors.map(a=>a.position),warmColor:0xffdfab,requiresRuntimeLights:true},entry:[114.5,66],entrance:[114.5,66],entryY:-4.2,portal:{axis:'x',x:114.5,zMin:62,zMax:70,floorY:-4.2,directionIntoGarage:'-X'},reservedConcourse:{min:[114.5,-132],max:[126.5,60],geometryExcluded:true},rampThroat:{min:[115,72],max:[126,108],floorAndCeilingExcluded:true},structuralClearanceMeters:5.6,minimumServicesClearanceMeters:4.8,triangles,bytes:bin.byteLength,materialDrawCalls:scene.children.length,stats:{levels:4,bays:bays.length,vipBays:152,standardBays:648,cars:cars.length,emptyBays:bays.length-cars.length,elevatorGroups:4,elevatorCars:16},provenance:{type:'original-procedural',author:'AmpliWorld',externalImages:[],externalMeshes:[],vehicleBrands:[]},limitations:['Static display cars; parking and camera physics are supplied by the consuming scene.','Entry vestibule/external descent retained by parent; all old garage faces must be replaced, not overlaid.','Consumer must use level-aware floors and exact helical/entry-ramp height queries; flat floor surfaces deliberately exclude the shaft.','Helix inner safety rail remains continuous; outer rail opens only at the west landings.']};
await writeFile(join(out,'garage-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({path:out,triangles,bytes:bin.byteLength,bays:bays.length,cars:cars.length,colliders:colliders.length}));
