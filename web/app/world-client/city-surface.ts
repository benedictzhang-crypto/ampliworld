import infra from '../../public/assets/3d/ampliworld/GC-CITY-INFRA-001/infra-manifest.json';
import city from '../../public/assets/3d/ampliworld/GC-CITY-2030/city-manifest.json';
export const CITY_INFRA = infra;
const roadCells = new Map<string, typeof infra.roadrects>();
for (const r of infra.roadrects)
  for (
    let i = Math.floor(r.min[0] / 1000);
    i <= Math.floor(r.max[0] / 1000);
    i++
  )
    for (
      let j = Math.floor(r.min[1] / 1000);
      j <= Math.floor(r.max[1] / 1000);
      j++
    ) {
      const key = `${i}:${j}`;
      const list = roadCells.get(key) || [];
      list.push(r);
      roadCells.set(key, list);
    }
const tiles = new Map(city.tiles.map((t) => [`${t.cx}:${t.cz}`, t]));
export const riverX = (z: number) => 2200 + 550 * Math.sin(z / 3500);
export function cityGroundHeight(x: number, z: number) {
  for (const r of roadCells.get(
    `${Math.floor(x / 1000)}:${Math.floor(z / 1000)}`,
  ) || [])
    if (x >= r.min[0] && x <= r.max[0] && z >= r.min[1] && z <= r.max[1]) {
      const i = r.axis === 'x' ? 0 : 1,
        p = i === 0 ? x : z;
      return (
        r.startY +
        ((p - r.min[i]) / (r.max[i] - r.min[i])) * (r.endY - r.startY)
      );
    }
  if (z >= 13200) return -8;
  if (
    Math.abs(x - riverX(z)) <
    180 + 820 * Math.max(0, Math.min(1, (z - 13000) / 200))
  )
    return -4;
  for (const c of tiles.get(
    `${Math.round(x / 1000) * 1000}:${Math.round(z / 1000) * 1000}`,
  )?.compounds || [])
    if (Math.abs(x - c.x) <= 169 && Math.abs(z - c.z) <= 169) return 0.18;
  return 0.035;
}
