const levels=[.17,6.48,11.28,16.08,20.88,25.68];
export const ESCALATORS=levels.slice(0,-1).flatMap((low,i)=>[51,56].map((x,j)=>({id:`L${i+1}-${j?'down':'up'}`,x,minZ:-17,maxZ:-3,low,high:levels[i+1],direction:j?-1:1})));
export const ESCALATOR_OPENING={min:[48.8,-17.6],max:[58.2,-2.5]};
export function escalatorHeight(x,z,y){
 for(const e of ESCALATORS){
  if(Math.abs(x-e.x)>1.25||z<e.minZ||z>e.maxZ)continue;
  const h=e.low+(z-e.minZ)/(e.maxZ-e.minZ)*(e.high-e.low);
  if(Math.abs(h-y)<.5)return h;
 }
}
export function escalatorVelocity(x,z,y){
 const localZ=z+188;
 for(const e of ESCALATORS){
  if(Math.abs(x-e.x)>1.2||localZ<e.minZ||localZ>e.maxZ)continue;
  const h=e.low+(localZ-e.minZ)/(e.maxZ-e.minZ)*(e.high-e.low);
  if(Math.abs(h-y)<.22)return .65*e.direction;
 }
 return 0;
}
