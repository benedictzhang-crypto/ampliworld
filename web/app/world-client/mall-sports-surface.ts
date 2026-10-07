import plan from './mall-sports-plan.json';
// Bilinear support uses exactly the vertices exported by Blender, not a flat collider.
export function golfVertexHeight(x:number,z:number){
  const g=plan.green,u=(x-g.min[0])/(g.max[0]-g.min[0]),v=(z-g.min[1])/(g.max[1]-g.min[1]);
  return g.maxRise*Math.sin(Math.PI*u)**2*Math.sin(Math.PI*v)**2*(.72+.28*Math.cos(3*Math.PI*u));
}
export function sportsGroundHeight(x:number,z:number,y:number){
  const g=plan.green;
  if(y<plan.floorY-.3||y>plan.floorY+2||x<g.min[0]||x>g.max[0]||z<g.min[1]||z>g.max[1])return undefined;
  const gx=Math.min(g.max[0]-g.step,g.min[0]+Math.floor((x-g.min[0])/g.step)*g.step);
  const gz=Math.min(g.max[1]-g.step,g.min[1]+Math.floor((z-g.min[1])/g.step)*g.step);
  const u=(x-gx)/g.step,v=(z-gz)/g.step;
  // Exported quads are triangulated on the a-c diagonal.
  const a=golfVertexHeight(gx,gz),b=golfVertexHeight(gx+g.step,gz),c=golfVertexHeight(gx+g.step,gz+g.step),d=golfVertexHeight(gx,gz+g.step);
  return plan.floorY+.012+(u>=v?a+(b-a)*u+(c-b)*v:a+(c-d)*u+(d-a)*v);
}
