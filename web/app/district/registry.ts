import cbdStreet from '../../public/assets/3d/ampliworld/GC-CBD-STREET-001/street-manifest.json';
import concourse from '../../public/assets/3d/ampliworld/GC-CBD-CONCOURSE-001/concourse-manifest.json';
import { cityGroundHeight } from '../world-client/city-surface';
import { civicGroundHeight } from '../world-client/civic-registry';
import { communityGroundHeight } from '../world-client/community-registry';
import { metropolitanGroundHeight } from '../world-client/metropolitan-registry';
import { garageGroundHeight } from '../world-client/mall-garage';
import { housingGroundHeight } from '../world-client/housing-registry';
// New metre-space block. City origin and asset transforms are data, not mesh JSX.
export const DISTRICT = {
  id: 'GC-GARDENS-B01',
  originWorldMeters: [-625, 8, -125],
  sizeMeters: [20000, 30000],
  status: 'WALKABLE_BLOCK_PROTOTYPE',
  buildings: [
    {
      id: 'GC-GARDENS-R01',
      assetId: 'GC-RES-001',
      x: -46,
      z: -34,
      rotationY: 0,
    },
    {
      id: 'GC-GARDENS-R02',
      assetId: 'GC-RES-001',
      x: 46,
      z: -34,
      rotationY: 0,
    },
    {
      id: 'GC-GARDENS-R03',
      assetId: 'GC-RES-001',
      x: -46,
      z: 34,
      rotationY: Math.PI,
    },
    {
      id: 'GC-GARDENS-R04',
      assetId: 'GC-RES-001',
      x: 46,
      z: 34,
      rotationY: Math.PI,
    },
  ],
  mall: { id: 'GC-GARDENS-M01', assetId: 'GC-MALL-002', x: 0, z: -188 },
  offices: [
    {
      id: 'GC-CBD-O01',
      assetId: 'GC-OFFICE-001',
      name: '天阙之环',
      heightMeters: 500,
      x: -310,
      z: -490,
    },
    {
      id: 'GC-CBD-O02',
      assetId: 'GC-OFFICE-002',
      name: '双曜之门',
      heightMeters: 350,
      x: 310,
      z: -490,
    },
    {
      id: 'GC-CBD-O03',
      assetId: 'GC-OFFICE-003',
      name: '星环中心',
      heightMeters: 420,
      x: 0,
      z: -900,
    },
  ],
  spawnLocalMeters: [0, -68],
  limitations: [
    'Four instances of one residential type, not four architectural designs.',
    'Metro pavilion is not yet connected to fares or train travel.',
    'Economy services are retained for future integration; retired legacy scene has no player route.',
  ],
} as const;

// Surface heights from the exported street kit, not a flat offset above every surface.
export function districtGroundHeight(x: number, z: number, currentY = 0) {
  const housingY = housingGroundHeight(x, z, currentY);
  if (housingY !== undefined) return housingY;
  const metropolitanY = metropolitanGroundHeight(x, z, currentY);
  if (metropolitanY !== undefined) return metropolitanY;
  const garageY = garageGroundHeight(x, z, currentY);
  if (garageY !== undefined) return garageY;
  const civicY = civicGroundHeight(x, z, currentY);
  if (civicY !== undefined) return civicY;
  const communityY = communityGroundHeight(x, z, currentY);
  if (communityY !== undefined) return communityY;
  if (Math.abs(x) > 600 || Math.abs(z) > 1100) return cityGroundHeight(x, z);
  for (const r of concourse.ramps)
    if (x >= r.min[0] && x <= r.max[0] && z >= r.min[1] && z <= r.max[1])
      return (
        r.lowY + ((z - r.min[1]) / (r.max[1] - r.min[1])) * (r.highY - r.lowY)
      );
  const inHole = concourse.holes.some(
    (h) => x >= h.min[0] && x <= h.max[0] && z >= h.min[1] && z <= h.max[1],
  );
  if (currentY < -0.5 || inHole)
    for (const s of concourse.surfaces)
      if (x >= s.min[0] && x <= s.max[0] && z >= s.min[1] && z <= s.max[1])
        return s.y;
  for (const s of cbdStreet.surfaces)
    if (x >= s.min[0] && x <= s.max[0] && z >= s.min[1] && z <= s.max[1])
      return s.y;
  const mz = z - DISTRICT.mall.z;
  if (x >= 115 && x <= 126 && mz >= 72 && mz <= 108)
    return -4.2 + ((mz - 72) * 4.37) / 36;
  if (x >= 115 && x <= 126 && mz >= 60 && mz < 72) return -4.2;
  if (x >= 114 && x <= 127 && mz >= 108 && mz <= 121) return 0.17;
  if (x >= 127 && x <= 131 && mz >= -46.5 && mz <= 68.5) return 0.32;
  if (x >= 127 && x <= 190 && mz >= -48 && mz <= 70) return 0.17;
  if (Math.abs(x) <= 112.5 && Math.abs(mz) <= 90) return 0.17;
  if (Math.abs(x) <= 112.5 && mz >= 92 && mz <= 104) return 0.16;
  if (x >= -112.5 && x <= 192.5 && mz >= 105 && mz <= 121) return 0.07;
  if (z < -80) return 0.035;
  const ax = Math.abs(x),
    az = Math.abs(z);
  if (ax < 7 || az < 7) return 0.035;
  if (x >= 83 && x <= 93 && z >= 28 && z <= 38) return 0.17;
  if (
    (ax >= 14 && Math.abs(az - 10) <= 0.125) ||
    (az >= 14 && Math.abs(ax - 10) <= 0.125)
  )
    return 0.26;
  if (
    (ax >= 14 && Math.abs(az - 7.25) <= 0.14) ||
    (az >= 14 && Math.abs(ax - 7.25) <= 0.14)
  )
    return 0.2;
  if ((ax >= 14 && az >= 10 && az <= 16) || (az >= 14 && ax >= 10 && ax <= 16))
    return 0.17;
  if (ax >= 8 && ax <= 16 && az >= 8 && az <= 16) return 0.13;
  if (
    (ax >= 14 && az >= 7.35 && az <= 9.65) ||
    (az >= 14 && ax >= 7.35 && ax <= 9.65)
  )
    return 0.03;
  if (
    Math.abs(az - 65) <= 2 ||
    Math.abs(ax - 76) <= 2 ||
    Math.abs(ax - 105) <= 2
  )
    return 0.025;
  return 0;
}

export function districtLocation(x: number, z: number) {
  if (Math.abs(x) < 145 && z > 420 && z < 780)
    return '晖环体育场 · 南侧开放入口通向足球场 · 看台暂未开放';
  if (Math.abs(x - 180) < 13 && Math.abs(z + 38) < 14)
    return '森间寿司 · 沿暖光门洞进入 · 餐饮交易尚未接入';
  if (Math.abs(x) < 450 && z > 80 && z < 1050)
    return '体育公园街区 · 沿中央步道向南，绕球场东侧到南入口';
  if (Math.abs(x) > 650 || Math.abs(z) > 1150)
    return `金庭主城区 · ${Math.floor((x + 10000) / 1000) + 1} 列 / ${Math.floor((z + 15000) / 1000) + 1} 街区 · 外围为生成底稿`;
  if (z < -300)
    return '金庭 CBD · 天阙之环 / 双曜之门 / 星环中心 · 下沉广场连接地下商业步道';
  if (Math.abs(x) > 215) return 'CBD 环线大道 · 沿道路北行抵达摩天楼广场';
  const mz = z - DISTRICT.mall.z;
  if (x >= 115 && x <= 126 && mz >= 60 && mz < 72)
    return 'B1 入口厅 · 直行进入 CBD 地下步行连廊';
  if (x >= 115 && x <= 126 && mz >= 72 && mz <= 108) return '地下停车入口坡道';
  if (x >= 127 && x <= 190 && mz >= -48 && mz <= 70)
    return '室外停车场 · 人行步道靠商场侧';
  if (Math.abs(x) > 6 && Math.abs(x) < 112 && mz > 35.5 && mz < 89.5)
    return x < 0 ? '西侧室内长廊' : '东侧室内长廊';
  if (Math.abs(x) < 45 && Math.abs(mz) < 35) return '中央露天花园';
  if (Math.abs(x) <= 6 && mz >= 35 && mz <= 90)
    return '花园通道 · 左右大门进入商场';
  return '金庭汇前街 · 直行花园与商场，右侧停车入口';
}
