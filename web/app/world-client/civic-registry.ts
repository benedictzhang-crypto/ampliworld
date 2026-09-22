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
import salon from '../../public/assets/3d/ampliworld/GC-SALON-001/manifest.json';
import sculptedHomes from '../../public/assets/3d/ampliworld/GC-CBD-RESIDENCES-001/manifest.json';
import airport from '../../public/assets/3d/ampliworld/GC-AIRPORT-001/manifest.json';
import hsr1 from '../../public/assets/3d/ampliworld/GC-HSR-001/manifest.json';
import hsr2 from '../../public/assets/3d/ampliworld/GC-HSR-002/manifest.json';
import hospital from '../../public/assets/3d/ampliworld/GC-HOSPITAL-001/manifest.json';
import school from '../../public/assets/3d/ampliworld/GC-SCHOOL-001/manifest.json';
import cityHall from '../../public/assets/3d/ampliworld/GC-CITYHALL-001/manifest.json';
import court from '../../public/assets/3d/ampliworld/GC-COURT-001/manifest.json';
import emergency from '../../public/assets/3d/ampliworld/GC-EMS-001/manifest.json';

export const CIVIC_PLACES = [
  {id:'GC-CITYHALL-001',name:'AmpliWorld City Hall and Civic Services',x:1250,z:520,file:'model.glb',manifest:cityHall},
  {id:'GC-COURT-001',name:'Metropolitan Court and Justice Center',x:1450,z:520,file:'model.glb',manifest:court},
  {id:'GC-EMS-001',name:'Metropolitan Emergency Medical Service',x:3270,z:4400,file:'model.glb',manifest:emergency},
  {id:'GC-AIRPORT-001',name:'AmpliWorld International Airport',x:8800,z:11800,file:'model.glb',manifest:airport},
  {id:'GC-HSR-001',name:'Grand Central High-Speed Rail',x:1600,z:500,file:'model.glb',manifest:hsr1},
  {id:'GC-HSR-002',name:'East City High-Speed Rail',x:5900,z:3900,file:'model.glb',manifest:hsr2},
  {id:'GC-HOSPITAL-001',name:'Meridian University Medical Center',x:3000,z:4400,file:'model.glb',manifest:hospital},
  {id:'GC-SCHOOL-001',name:'AmpliWorld Academy Campus',x:3650,z:4600,file:'model.glb',manifest:school},
  {id:'GC-CBD-RESIDENCES-001',name:'云庭曲廊 · 五栋露台公馆',x:535,z:-250,file:'residences.glb',manifest:sculptedHomes},
  {id:'GC-NAILS-01',assetId:'GC-SALON-001',name:'青庭 Nail Atelier',x:-1100,z:1000,file:'model.glb',manifest:salon},
  {id:'GC-NAILS-02',assetId:'GC-SALON-001',name:'东城 Luma Nails',x:5350,z:3350,file:'model.glb',manifest:salon},
  {id:'GC-NAILS-03',assetId:'GC-SALON-001',name:'河西 Willow Nails',x:-1350,z:8350,file:'model.glb',manifest:salon},
  {id:'GC-SC-DINE-01',assetId:'GC-RESTAURANT-001',name:'东城 Olive Terrace',x:5300,z:3400,file:'model.glb',manifest:restaurant1},
  {id:'GC-SC-DINE-02',assetId:'GC-RESTAURANT-002',name:'河西 Bronze Garden',x:-1300,z:8400,file:'model.glb',manifest:restaurant2},
  {id:'GC-HOTEL-005',name:'Aurelia Grand · 五星酒店',x:-150,z:-644.5,file:'model.glb',manifest:hotel5},
  {id:'GC-HOTEL-004',name:'Meridian · 四星酒店',x:150,z:-644.5,file:'model.glb',manifest:hotel4},
  {id:'GC-RESTAURANT-001',name:'Lotus Siam · 泰国菜',x:245,z:-82,file:'model.glb',manifest:restaurant1},
  {id:'GC-RESTAURANT-002',name:'Bronze Garden · 花园中餐',x:290,z:-82,file:'model.glb',manifest:restaurant2},
  {id:'GC-RESTAURANT-003',name:'Ember Prime · 高档牛排店',x:335,z:-82,file:'model.glb',manifest:restaurant3},
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
