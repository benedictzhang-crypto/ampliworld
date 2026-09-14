import stadium from '../../public/assets/3d/ampliworld/GC-STADIUM-001/stadium-manifest.json';
import sushi from '../../public/assets/3d/ampliworld/GC-SUSHI-001/sushi-manifest.json';
import dealership from '../../public/assets/3d/ampliworld/GC-AUTO-001/dealership-manifest.json';
import streets from '../../public/assets/3d/ampliworld/GC-SPORT-STREET-001/street-manifest.json';
import sushiGarden from '../../public/assets/3d/ampliworld/GC-SUSHI-GARDEN-001/garden-manifest.json';
import marina from '../../public/assets/3d/ampliworld/GC-MARINA-001/marina-manifest.json';
import hotel5 from '../../public/assets/3d/ampliworld/GC-HOTEL-005/manifest.json';
import hotel4 from '../../public/assets/3d/ampliworld/GC-HOTEL-004/manifest.json';
import restaurant1 from '../../public/assets/3d/ampliworld/GC-RESTAURANT-001/manifest.json';
import restaurant2 from '../../public/assets/3d/ampliworld/GC-RESTAURANT-002/manifest.json';
import restaurant3 from '../../public/assets/3d/ampliworld/GC-RESTAURANT-003/manifest.json';

export const CIVIC_PLACES = [
  {id:'GC-HOTEL-005',name:'Aurelia Grand · 五星酒店',x:-150,z:-644.5,file:'model.glb',manifest:hotel5},
  {id:'GC-HOTEL-004',name:'Meridian · 四星酒店',x:150,z:-644.5,file:'model.glb',manifest:hotel4},
  {id:'GC-RESTAURANT-001',name:'Olive Terrace · 地中海餐厅',x:245,z:-82,file:'model.glb',manifest:restaurant1},
  {id:'GC-RESTAURANT-002',name:'Bronze Garden · 花园中餐',x:290,z:-82,file:'model.glb',manifest:restaurant2},
  {id:'GC-RESTAURANT-003',name:'Ember Grill · 炭烤餐厅',x:335,z:-82,file:'model.glb',manifest:restaurant3},
  {id:'GC-MARINA-001',name:'东湾游艇港酒店 · 150 泊位',x:6500,z:13200,file:'marina-yacht-hotel.glb',manifest:marina},
  {
    id: 'GC-STADIUM-001',
    name: '晖环体育场',
    x: 0,
    z: 600,
    file: 'stadium.glb',
    manifest: stadium,
  },
  {
    id: 'GC-SUSHI-001',
    name: '森间寿司',
    x: 180,
    z: -38,
    file: 'sushi.glb',
    manifest: sushi,
  },
  {
    id: 'GC-AUTO-001',
    name: 'Aureline 汽车中心',
    x: -565,
    z: 655,
    file: 'dealership.glb',
    manifest: dealership,
  },
  {id:'GC-SUSHI-GARDEN-001',name:'森间日式庭院与停车场',x:180,z:-38,file:'garden.glb',manifest:sushiGarden},
] as const;
export const SPORTS_STREETS = streets;
export const CIVIC_COLLIDERS = [
  ...streets.colliders,
  ...CIVIC_PLACES.flatMap((p) =>
    p.manifest.colliders.map((c) => ({
      id: `${p.id}/${c.id}`,
      min: [c.min[0] + p.x, c.min[1], c.min[2] + p.z],
      max: [c.max[0] + p.x, c.max[1], c.max[2] + p.z],
    })),
  ),
];
export function civicGroundHeight(
  x: number,
  z: number,
  currentY = 0,
): number | undefined {
  for(const ramp of marina.ramps){const lx=x-6500,lz=z-13200;if(lx>=ramp.min[0]&&lx<=ramp.max[0]&&lz>=ramp.min[1]&&lz<=ramp.max[1])return ramp.startY+(lz-ramp.min[1])/(ramp.max[1]-ramp.min[1])*(ramp.endY-ramp.startY);}
  let support: number | undefined, lowest: number | undefined;
  for (const p of CIVIC_PLACES)
    for (const s of p.manifest.surfaces)
      if (
        x >= s.min[0] + p.x &&
        x <= s.max[0] + p.x &&
        z >= s.min[1] + p.z &&
        z <= s.max[1] + p.z
      ) {
        lowest = Math.min(lowest ?? Infinity, s.y);
        if (s.y <= currentY + 0.29)
          support = Math.max(support ?? -Infinity, s.y);
      }
  if (support !== undefined || lowest !== undefined) return support ?? lowest;
  for (const s of streets.surfaces)
    if (x >= s.min[0] && x <= s.max[0] && z >= s.min[1] && z <= s.max[1])
      return s.y;
}
