import { Box3, Vector3 } from 'three';
import luxury from './mall-luxury-plan.json';
import spatial from './mall-spatial-plan.json';

export const MALL_LEVELS = [
  { id: 'B4', y: -25.2, label: 'B4 · 公共停车' },
  { id: 'B3', y: -19.2, label: 'B3 · 公共停车' },
  { id: 'B2', y: -13.2, label: 'B2 · 公共停车' },
  { id: 'B1', y: -7.2, label: 'B1 · VIP / 食集 / 活动' },
  ...spatial.floors.map((f,i)=>({id:f.id,y:f.y,label:[
    '1F · 奢侈品 / 城市生活','2F · 奢侈品 / 珠宝腕表','3F · 科技 / 户外旅行',
    '4F · 时装 / 健身房','5F · 茶楼 / 餐饮','6F · 餐饮 / 影院 / 电玩城'][i]})),
  { id: 'RF', y: spatial.roofY, label: 'RF · 屋顶观景步道' },
] as const;
export const LIFT_GROUPS = [
  { id: 'A', x: -76, z: -78.5, front: 1, color: '#398de5' },
  { id: 'B', x: 24, z: -78.5, front: 1, color: '#42ae81' },
  { id: 'C', x: -76, z: 63, front: -1, color: '#e6ae41' },
  { id: 'D', x: 24, z: 63, front: -1, color: '#a778de' },
] as const;
export const liftBox = (x:number,y:number,z:number,w:number,h:number,d:number) => new Box3(new Vector3(x-w/2,y-h/2,z-d/2),new Vector3(x+w/2,y+h/2,z+d/2));
export function createMallLifts() {
  const publicCars=LIFT_GROUPS.flatMap(g => [-4.5,-1.5,1.5,4.5].map((dx,i) => ({
    id: `${g.id}${i+1}`, group:g, x:g.x+dx, z:g.z-188,width:2.7,depth:4.7,cabHeight:3.1,
    y:.17, target:.17, door:1, phase:'idle' as 'idle'|'closing'|'moving'|'opening',
    levels:[...MALL_LEVELS],
    doors:MALL_LEVELS.map(l => liftBox(g.x+dx,l.y+1.55,g.z-188+g.front*2.45,2.75,3.1,.2)),
    platform:liftBox(g.x+dx,.11,g.z-188,2.72,.12,4.7),
  })));
  const g=luxury.lift;
  const levels=MALL_LEVELS.filter(l=>l.id==='L1'||l.id==='L2');
  return [...publicCars,{
    id:g.id,group:g,x:g.x,z:g.z-188,width:2.7,depth:4.7,cabHeight:3.1,y:.17,target:.17,door:1,phase:'idle' as 'idle'|'closing'|'moving'|'opening',levels,
    doors:levels.map(l=>liftBox(g.x,l.y+1.55,g.z-188+g.front*2.45,2.75,3.1,.2)),
    platform:liftBox(g.x,.11,g.z-188,2.72,.12,4.7),
  },{
    id:'SERVICE',group:spatial.serviceLift,x:spatial.serviceLift.x,z:spatial.serviceLift.z-188,
    width:spatial.serviceLift.width,depth:spatial.serviceLift.depth,cabHeight:spatial.serviceLift.cabHeight,
    y:.17,target:.17,door:1,phase:'idle' as 'idle'|'closing'|'moving'|'opening',levels:[...MALL_LEVELS],
    doors:MALL_LEVELS.map(l=>liftBox(spatial.serviceLift.x,l.y+2.1,spatial.serviceLift.z-188+4.5,6.8,4.2,.2)),
    platform:liftBox(spatial.serviceLift.x,.11,spatial.serviceLift.z-188,6.8,.12,8.8),
  }];
}
export type MallLift = ReturnType<typeof createMallLifts>[number];
export type LiftCarrier = { active:boolean; y:number; carId:string|null };
export function nearestMallLevel(y:number) { return MALL_LEVELS.reduce((a,b)=>Math.abs(a.y-y)<Math.abs(b.y-y)?a:b); }
export function liftContains(c:MallLift,x:number,z:number,y:number) { return Math.abs(x-c.x)<c.width/2-.15&&Math.abs(z-c.z)<c.depth/2-.25&&Math.abs(y-c.y)<.35; }
export function requestMallLift(c:MallLift,target:number) {
  if(c.phase!=='idle'||!c.levels.some(l=>l.y===target)) return false;
  if(Math.abs(c.y-target)<.01) return true;
  c.target=target;c.phase='closing';return true;
}
export function stepMallLift(c:MallLift,elapsed:number) {
  const dt=Math.min(.1,Math.max(0,elapsed));
  if(c.phase==='closing') { c.door=Math.max(0,c.door-dt*1.2);if(c.door===0)c.phase='moving'; }
  else if(c.phase==='moving') {
    const delta=c.target-c.y;
    c.y+=Math.sign(delta)*Math.min(Math.abs(delta),4*dt);
    if(Math.abs(c.target-c.y)<.001){c.y=c.target;c.phase='opening';}
  } else if(c.phase==='opening') {c.door=Math.min(1,c.door+dt*1.2);if(c.door===1)c.phase='idle';}
  c.platform.min.y=c.y-.12;c.platform.max.y=c.y;
  c.doors.forEach((b,i)=>{
    const l=c.levels[i],open=Math.abs(c.y-l.y)<.01&&c.door>.85;
    if(open)b.makeEmpty();
    else {b.min.set(c.x-c.width/2-.025,l.y,c.z+c.group.front*(c.depth/2+.1)-.1);b.max.set(c.x+c.width/2+.025,l.y+c.cabHeight,c.z+c.group.front*(c.depth/2+.1)+.1);}
  });
}
export const LIFT_STATIC_SOLIDS = LIFT_GROUPS.flatMap(g => {
  const a:Box3[]=[];
  const height=spatial.shaftTop-spatial.shaftBottom,mid=(spatial.shaftTop+spatial.shaftBottom)/2;
  for(let i=0;i<5;i++)a.push(liftBox(g.x-6+i*3,mid,g.z-188,.18,height,5));
  a.push(liftBox(g.x,mid,g.z-188-g.front*2.48,12,height,.16));
  MALL_LEVELS.forEach((l,i)=>{
    const h=(MALL_LEVELS[i+1]?.y??spatial.shaftTop)-l.y-3.1;
    a.push(liftBox(g.x,l.y+3.1+h/2,g.z-188+g.front*2.45,12,h,.2));
  });
  return a;
});
