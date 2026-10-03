import plan from './mall-luxury-plan.json';
/** The exported 36 risers and this support function share one metric plan. */
export function boutiqueStairHeight(x:number,z:number,currentY:number){
  const s=plan.stairs;
  if(x<s.min[0]||x>s.max[0]||z<s.min[1]||z>s.max[1])return undefined;
  const t=(z-s.min[1])/(s.max[1]-s.min[1]);
  const y=s.low+Math.min(s.steps,Math.floor(t*s.steps)+1)*(s.high-s.low)/s.steps;
  // Do not pull people walking on higher floors down onto this staircase.
  return Math.abs(y-currentY)<.7?y:undefined;
}
