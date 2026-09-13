/** Read-only production-kernel regression. From web/: node --import tsx /tmp/check-garage-production-drive.mjs
 * Optional --route=/absolute/route.json runs a continuous waypoint controller.
 * Route JSON: {start:{x,z,yaw,speed:0,y?},points:[[x,z],...],speed:4,fps:60,expectedY?:number,bayId?:string}.
 * Positions/yaw/floor are NEVER reassigned after the initial spawn.
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=process.env.AMPLIWORLD_WEB||fileURLToPath(new URL('..',import.meta.url));
const require=createRequire(root+'/package.json'),{Box3,Vector3}=require('three');
const load=p=>import(pathToFileURL(path.join(root,p)).href);
const read=p=>JSON.parse(fs.readFileSync(path.join(root,'public/assets/3d/ampliworld',p),'utf8'));
const [{stepVehicleMotion,carBlocked},{districtGroundHeight:floor,DISTRICT},{GARAGE_COLLIDERS,MALL_GARAGE,parkedGarageBay},{CIVIC_COLLIDERS},{COMMUNITY_COLLIDERS},{METROPOLITAN_COLLIDERS},{housingColliders},{CITY_INFRA}]=await Promise.all([
 load('app/world-client/vehicle-physics.ts'),load('app/district/registry.ts'),load('app/world-client/mall-garage.ts'),load('app/world-client/civic-registry.ts'),load('app/world-client/community-registry.ts'),load('app/world-client/metropolitan-registry.ts'),load('app/world-client/housing-registry.ts'),load('app/world-client/city-surface.ts')]);
const city=read('GC-CITY-2030/city-manifest.json');
const tagged=(list,prefix,dx=0,dz=0)=>list.map(c=>({id:prefix+'/'+c.id,min:[c.min[0]+dx,c.min[1],c.min[2]+dz],max:[c.max[0]+dx,c.max[1],c.max[2]+dz]}));
// Mirrors district/view.tsx solids for the initial core cell; never includes walker-only own-car collider.
const raw=[...CIVIC_COLLIDERS,...GARAGE_COLLIDERS,...COMMUNITY_COLLIDERS,...housingColliders(0,0,new Set()),...METROPOLITAN_COLLIDERS,
 ...city.tiles.filter(t=>Math.abs(t.cx)<=2000&&Math.abs(t.cz)<=2000).flatMap(t=>t.colliders),
 ...CITY_INFRA.colliders.filter(c=>Math.abs((c.min[0]+c.max[0])/2)<3000&&Math.abs((c.min[2]+c.max[2])/2)<3000),
 ...tagged(read('GC-CBD-CONCOURSE-001/concourse-manifest.json').colliders,'concourse'),
 ...DISTRICT.offices.flatMap((b,i)=>tagged(read(`GC-OFFICE-00${i+1}/tower-manifest.json`).colliders,b.id,b.x,b.z)),
 ...tagged(read('GC-CBD-STREET-001/street-manifest.json').colliders,'cbd-street'),
 ...tagged(read('GC-MALL-002/mall-manifest.json').colliders,'mall',0,DISTRICT.mall.z),
 ...DISTRICT.buildings.map(b=>({id:b.id,min:[b.x-16,-1,b.z-12],max:[b.x+16,29.1,b.z+12]})),
 ...tagged(read('GC-STREET-001/street-manifest.json').colliders,'street')];
const nearby=raw.filter(c=>c.max[0]>=-160&&c.min[0]<=160&&c.max[2]>=-350&&c.min[2]<=-30);
const solids=nearby.map(c=>new Box3(new Vector3(...c.min),new Vector3(...c.max)));
const failures=[],results=[];
function explain(s,input,dt){
 const probe={...s};const terrainMotionPass=stepVehicleMotion(probe,input,dt,[],floor);
 const y=floor(s.x,s.z,s.y),c=Math.cos(s.yaw),sn=Math.sin(s.yaw);
 const py=floor(probe.x,probe.z,probe.y);
 return {pose:{...s},attempted:probe,terrainMotionPass,actualBlockingColliders:nearby.filter((b,i)=>carBlocked(probe.x,probe.z,[solids[i]],()=>py,py,probe.yaw)).map(b=>({id:b.id,min:b.min,max:b.max})).slice(0,8),terrainBlockedAtRest:carBlocked(s.x,s.z,[],floor,s.y,s.yaw),tyres:[-1,1].flatMap(side=>[-1,1].map(axle=>{const x=s.x+c*.86*side+sn*1.5*axle,z=s.z-sn*.86*side+c*1.5*axle;return{x,z,y:floor(x,z,y)}}))};
}
for(const fps of [20,30,60])for(const x of [117,120.5,124]){
 const state={x,z:-68,yaw:0,speed:0,y:floor(x,-68,0)},dt=1/fps;let success=false,frame=0;
 for(;frame<fps*20;frame++){
  const input={throttle:1,steer:0,brake:false};
  if(!stepVehicleMotion(state,input,dt,solids,floor)){failures.push({test:'offset-ramp-descent',fps,x,frame,...explain(state,input,dt)});break;}
  if(state.z<=-115){success=true;break;}
 }
 if(!success&&frame===fps*20)failures.push({test:'offset-ramp-timeout',fps,x,state});
 results.push({test:'offset-ramp-descent',fps,startX:x,pass:success,final:{...state}});
}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
/** Pure-pursuit controller; every motion is performed only by stepVehicleMotion. */
function followRoute(spec){
 const fps=spec.fps||60,dt=1/fps,state={...spec.start};state.y??=floor(state.x,state.z,0);state.speed??=0;
 const points=spec.points,cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
 let along=0,segment=0;const checkpoints=[];
 for(let frame=0;frame<fps*360;frame++){
  for(let j=segment;j<Math.min(points.length-1,segment+8);j++){const a=points[j],b=points[j+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),t=clamp(((state.x-a[0])*dx+(state.z-a[1])*dz)/(len*len),0,1);if(Math.hypot(state.x-a[0]-dx*t,state.z-a[1]-dz*t)<5&&cumulative[j]+t*len>along){along=cumulative[j]+t*len;segment=j;}}
  const remaining=cumulative.at(-1)-along,dest=points.at(-1),atEnd=Math.hypot(state.x-dest[0],state.z-dest[1])<(spec.stopRadius||.5);
  const lookahead=spec.lookahead||3,aimDistance=Math.min(cumulative.at(-1),along+lookahead),j=Math.max(0,Math.min(points.length-2,cumulative.findIndex(v=>v>=aimDistance)-1)),length=cumulative[j+1]-cumulative[j],t=clamp((aimDistance-cumulative[j])/length,0,1),aim=[points[j][0]+t*(points[j+1][0]-points[j][0]),points[j][1]+t*(points[j+1][1]-points[j][1])];
  if(spec.terminalStraight&&remaining<6){const a=points.at(-2),b=points.at(-1),len=Math.hypot(b[0]-a[0],b[1]-a[1]),extra=along+lookahead-cumulative.at(-1);aim[0]=b[0]+(b[0]-a[0])/len*extra;aim[1]=b[1]+(b[1]-a[1])/len*extra;}
  const sign=spec.reverse?-1:1,desired=Math.atan2(-(aim[0]-state.x),-(aim[1]-state.z))+(spec.reverse?Math.PI:0),error=wrap(desired-state.yaw),speed=Math.min(spec.speed||4,Math.max(.65,remaining*.8));
  const input={throttle:atEnd?0:Math.abs(state.speed)<speed?sign:0,steer:clamp(sign*2*5.2*Math.sin(error)/Math.max(1,Math.hypot(aim[0]-state.x,aim[1]-state.z)),-1,1),brake:atEnd};
  const before={...state};if(!stepVehicleMotion(state,input,dt,solids,floor))return{pass:false,frame,along,reason:'production-kernel-block',...explain(before,input,dt),checkpoints};
  if(frame%fps===0)checkpoints.push({...state});
  if(atEnd&&Math.abs(state.speed)<.15){const bay=parkedGarageBay(state);return{pass:spec.expectedY===undefined||Math.abs(state.y-spec.expectedY)<.12,final:state,bayId:bay?.id,bayMatches:spec.bayId===undefined||bay?.id===spec.bayId,frames:frame,checkpoints};}
 }
 return{pass:false,reason:'route-timeout',final:state,along,checkpoints};
}
const routeArg=process.argv.find(a=>a.startsWith('--route='));
if(routeArg){const spec=JSON.parse(fs.readFileSync(routeArg.slice(8),'utf8'));const result=followRoute(spec);results.push({test:'continuous-waypoint-drive',...result});if(!result.pass||result.bayMatches===false)failures.push({test:'continuous-waypoint-drive',...result});}
const report={pass:failures.length===0,productionKernel:'app/world-client/vehicle-physics.ts:stepVehicleMotion',assembledRuntimeSolids:raw.length,conservativeGarageBroadphaseSolids:solids.length,garageLevels:MALL_GARAGE.levels??'current manifest has no levels',results,failures,notes:['No position/yaw/height teleport after initial spawn.','Offset regression finishes before the basement left turn; optional route validates real turns/helix/parking.','Broadphase covers entire mall/garage and approach x[-160,160],z[-350,-30]; expand for routes outside it.']};
if(!process.env.QA_VERBOSE)for(const r of report.results)delete r.checkpoints;console.log(JSON.stringify(report,null,2));if(failures.length)process.exitCode=1;
