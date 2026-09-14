/** Shared simulated seconds, not the visual day/night clock. Core crossing pilot. */
export function signalAt(second:number){
  const p=((second%90)+90)%90;
  return {northSouth:p<30?'green':p<34?'amber':'red',eastWest:p>=36&&p<66?'green':p>=66&&p<70?'amber':'red',pedestrian:p>=72&&p<88};
}
export function crossingWait(second:number,length:number,speed=1.25){
  const duration=length/speed;
  if(duration>16)return Infinity;
  const p=((second%90)+90)%90;
  return p>=72&&p+duration<=88?0:p<72?72-p:90-p+72;
}
export function coreCarMustStop(x:number,z:number,nextX:number,nextZ:number,second:number){
  const signal=signalAt(second);
  if(Math.abs(x)<8&&signal.northSouth!=='green')return(z>17&&nextZ<=17)||(z< -17&&nextZ>=-17);
  if(Math.abs(z)<8&&signal.eastWest!=='green')return(x>17&&nextX<=17)||(x< -17&&nextX>=-17);
  return false;
}
