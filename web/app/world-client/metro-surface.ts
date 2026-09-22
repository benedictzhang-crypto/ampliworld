import { cityGroundHeight } from './city-surface';
import { METRO_STATIONS } from './metro-network';

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
);
