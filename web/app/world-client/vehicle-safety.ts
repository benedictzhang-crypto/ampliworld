import { Box3, Ray, Vector3 } from 'three';
import { isGarageDriveArea } from './mall-garage';
import { carBlocked } from './vehicle-physics';
type VehiclePose = { x: number; z: number; yaw: number; y?: number };
/** Shared arrival placement; callers include other parked cars as obstacles. */
export function findVehicleArrival(x:number,z:number,boxes:readonly Box3[],floor:(x:number,z:number,y?:number)=>number){
  const base=floor(x,z);
  for(const radius of [6,8,10,14,20,28,40])for(let step=0;step<16;step++){
    const angle=step*Math.PI/8,cx=x+Math.cos(angle)*radius,cz=z+Math.sin(angle)*radius;
    const y=floor(cx,cz,base);
    if(Math.abs(y-base)>1.2 || carBlocked(cx,cz,boxes,floor,y,0))continue;
    return {x:cx,z:cz,y,yaw:0,speed:0,radius};
  }
  return undefined;
}
export function findVehicleExit(
  car: VehiclePose,
  boxes: readonly Box3[],
  floor: (x: number, z: number, y?: number) => number,
) {
  const startY = floor(car.x, car.z, car.y),
    c = Math.cos(car.yaw),
    s = Math.sin(car.yaw);
  const hx = Math.abs(c) * 1.05 + Math.abs(s) * 2.5,
    hz = Math.abs(s) * 1.05 + Math.abs(c) * 2.5;
  for (const distance of [1.85, 2.4, 3.8])
    for (const side of [1, -1]) {
      const x = car.x + c * distance * side,
        z = car.z - s * distance * side;
      if (Math.abs(x - car.x) < hx + 0.42 && Math.abs(z - car.z) < hz + 0.42)
        continue;
      let safe = true,
        y = startY;
      for (let i = 1; i <= 20; i++) {
        const px = car.x + ((x - car.x) * i) / 20,
          pz = car.z + ((z - car.z) * i) / 20;
        y = floor(px, pz, startY);
        if (
          !Number.isFinite(y) ||
          Math.abs(y - startY) > 0.29 ||
          Math.abs(px) > 9995 ||
          Math.abs(pz) > 14995 ||
          (y < -0.1 && !isGarageDriveArea(px, pz)) ||
          boxes.some(
            (b) =>
              b.max.y > y + 0.29 &&
              b.min.y < y + 2.08 &&
              px > b.min.x - 0.4 &&
              px < b.max.x + 0.4 &&
              pz > b.min.z - 0.4 &&
              pz < b.max.z + 0.4,
          )
        ) {
          safe = false;
          break;
        }
      }
      if (safe) return { x, z, y };
    }
  return undefined;
}
/** Revalidate the actual eye after interpolation, not only its desired endpoint. */
export function clipVehicleCamera(
  eye: Vector3,
  target: Vector3,
  boxes: readonly Box3[],
  ray: Ray,
  direction: Vector3,
  hit: Vector3,
) {
  direction.subVectors(eye, target);
  let length = direction.length();
  if (length < 0.00001) return;
  direction.normalize();
  ray.set(target, direction);
  for (const box of boxes)
    if (ray.intersectBox(box, hit))
      length = Math.min(length, Math.max(0.05, target.distanceTo(hit) - 0.22));
  eye.copy(target).addScaledVector(direction, length);
}
