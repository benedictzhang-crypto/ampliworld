import { CITY_INFRA, cityGroundHeight } from './city-surface';
import { METRO_ELEVATED_PILOT, METRO_STATIONS } from './metro-network';
import { CatmullRomCurve3, Vector3 } from 'three';

/** Three high stations currently have physical floor support. A player can
 * walk beneath the viaduct without snapping onto the platform overhead. */
export function metroGroundHeight(x: number, z: number, currentY: number) {
  for (const stop of METRO_STATIONS) {
    if (stop.mode !== 'ELEVATED') continue;
    const dx = x - stop.x;
    const dz = z - stop.z;
    if (Math.abs(dx) > 27 || Math.abs(dz) > 21) continue;
    const base = cityGroundHeight(stop.x, stop.z);
    if (Math.abs(dx) <= 26 && Math.abs(dz) <= 6.75 && currentY >= base + 11.1)
      return base + 11.8;
    // The two escalator belts descend toward the street entrance at +17.5 Z.
    if ((Math.abs(dx + 12) <= 1.1 || Math.abs(dx + 8) <= 1.1) && dz >= -2.5 && dz <= 17.5) {
      const belt = base + .4 + (17.5 - dz) * 11.5 / 20;
      if (currentY >= belt - .3) return belt;
    }
    if (currentY >= base - .35) return base + .24;
  }
  return undefined;
}

export const METRO_PIER_COLLIDERS = METRO_STATIONS.filter((s) => s.mode === 'ELEVATED').flatMap((s) =>
  [-20, -7, 7, 20].flatMap((dx) => [-6, 6].map((dz) => ({
    min: [s.x + dx - .75, cityGroundHeight(s.x, s.z), s.z + dz - .75] as [number, number, number],
    max: [s.x + dx + .75, cityGroundHeight(s.x, s.z) + 11.2, s.z + dz + .75] as [number, number, number],
  }))),
).concat((() => {
  const route = new CatmullRomCurve3(METRO_ELEVATED_PILOT.map(p => new Vector3(p.x, 11.3, p.z)), false, 'centripetal');
  const length = route.getLength();
  const piers: { min: [number, number, number]; max: [number, number, number] }[] = [];
  for (let d = 72; d < length - 60; d += 96) {
    const point = route.getPointAt(d / length);
    if (CITY_INFRA.roadrects.some(road => point.x >= road.min[0] - 3 && point.x <= road.max[0] + 3 &&
      point.z >= road.min[1] - 3 && point.z <= road.max[1] + 3)) continue;
    const ground = cityGroundHeight(point.x, point.z);
    piers.push({ min: [point.x - .95, ground, point.z - 1.05],
      max: [point.x + .95, 10.45, point.z + 1.05] });
  }
  return piers;
})());
