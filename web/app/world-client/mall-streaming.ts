export type StreamUnit={id:string;x:number;z:number;w:number;d:number;floorY:number};
export const TENANT_LIMIT=6;
export const STREAM_INTERVAL=.25;
/** Prioritise the current floor, retaining neighbours across cell boundaries. */
export function selectMallUnits(units:readonly StreamUnit[],x:number,y:number,z:number,previous:readonly string[]=[]) {
  return units.map(u=>{
    const dx=Math.max(0,Math.abs(x-u.x)-u.w/2),dz=Math.max(0,Math.abs(z+188-u.z)-u.d/2);
    const dy=Math.abs(y-(u.floorY+2));
    const held=previous.includes(u.id);
    return {id:u.id,eligible:dx*dx+dz*dz<(held?110:85)**2&&dy<(held?11:9),score:dx*dx+dz*dz+dy*dy*90-(held?400:0)};
  }).filter(u=>u.eligible).sort((a,b)=>a.score-b.score||a.id.localeCompare(b.id)).slice(0,TENANT_LIMIT).map(u=>u.id);
}
export function admitMallUnits(desired:readonly string[],current:readonly string[]) {
  const kept=current.filter(id=>desired.includes(id));
  const next=desired.find(id=>!kept.includes(id));
  return next?[...kept,next]:kept;
}
