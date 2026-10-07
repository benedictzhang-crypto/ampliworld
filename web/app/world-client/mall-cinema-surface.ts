import spatial from './mall-spatial-plan.json';
/** Same half-row risers and entrance stair as the Blender auditorium builder. */
export function cinemaGroundHeight(x:number,z:number,currentY:number){
  const c=spatial.cinema,y=spatial.floors[5].y;
  if(currentY<y-.5||currentY>y+6)return undefined;
  const center=c.centersZ.find(cz=>Math.abs(z-cz)<c.halfWidth-.25);
  if(center===undefined||x<c.minX||x>c.maxX)return undefined;
  if(x>=c.seatStartX&&x<c.rearStairMinX){
    return y+Math.min(24,Math.floor((x-c.seatStartX)/1.5)+1)*.15;
  }
  if(x>=c.rearStairMinX&&x<c.rearStairMaxX&&Math.abs(z-center)<1.2){
    return y+(24-Math.floor((x-c.rearStairMinX)/.5))*.15;
  }
  return y;
}
