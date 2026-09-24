import {CIVIC_PLACES,CIVIC_COLLIDERS} from './civic-registry';
import {METROPOLITAN_PLACES,METROPOLITAN_COLLIDERS} from './metropolitan-registry';
import {SERVICE_SITES,CITY_OPERATION_SITES} from '../life-sim/city-service-plan';
import {districtGroundHeight} from '../district/registry';
import {CITY} from './city-layer';
import {CITY_SERVICE_COLLIDERS} from './city-service-buildings';
import {CITY_OPERATION_COLLIDERS} from './city-operations';

export type TourDestination={id:string;name:string;kind:string;x:number;z:number;arrivalX:number;arrivalZ:number;featured:boolean;searchText:string};
const destination=(id:string,name:string,kind:string,x:number,z:number,arrivalX:number,arrivalZ:number,featured=false):TourDestination=>
  ({id,name,kind,x,z,arrivalX,arrivalZ,featured,searchText:`${id} ${name} ${kind}`.toLowerCase()});

const civic=CIVIC_PLACES.map(p=>{
  const manifest=p.manifest as {entrances?:{main?:number[]};entrance?:number[];bounds:{max:number[]}};
  const door=manifest.entrances?.main??manifest.entrance;
  const ax=p.id==='GC-MARINA-001'?p.x:p.x+(door?.[0]??0);
  const az=p.id==='GC-MARINA-001'?p.z-110:p.z+(door?.[2]??manifest.bounds.max[2])+8;
  const kind=p.id.includes('HOSPITAL')?'医院 hospital':p.id.includes('SCHOOL')?'学校 school':p.id.includes('AUTO')?'汽车中心 car dealer':p.id.includes('CITYHALL')?'市政府 city hall':p.id.includes('COURT')?'法院 court':'城市地标 landmark';
  return destination(p.id,p.name,kind,p.x,p.z,ax,az,kind.includes('医院')||kind.includes('学校')||kind.includes('市政府'));
});
const services=SERVICE_SITES.filter(s=>s.placement==='street').map(s=>{
  const kind=s.type==='fire'?'消防站 fire station':s.type==='clinic'?'诊所 clinic':s.type==='real-estate-broker'?'房地产中介 real estate':s.type==='property-developer'?'房地产开发商 developer':s.type==='car-rental'?'汽车租赁 car rental':s.type==='bank'?'银行 bank':s.type;
  // These lots reserve a 31 m front apron. The visitor arrives outside the
  // modeled wall, doors, parked cars and fire-engine bay, never at its centre.
  const front=s.type==='fire'?32:s.type==='car-rental'?25:21;
  return destination(s.id,s.name,kind,s.x,s.z,s.x,s.z+front,
    s.type==='fire'&&s.id.endsWith('001')||s.type==='real-estate-broker'&&s.id.endsWith('001')||s.type==='car-rental'&&s.id.endsWith('001'));
});
const operationFront:Record<string,number>={'CONSTRUCTION-01':75,'WASTE-01':82,'POWER-01':90,'WATER-01':95,'SEWAGE-01':105,'DOT-01':85};
const operations=CITY_OPERATION_SITES.map(s=>destination(s.id,s.name,s.type,s.x,s.z,
  'entry' in s?s.entry[0]:s.x,'entry' in s?s.entry[1]+7:s.z+(operationFront[s.id]??45),s.id==='DOT-01'));
const subcenters=METROPOLITAN_PLACES.filter(p=>p.id.startsWith('GC-SUBCENTER')).map(p=>{
  const b=p.manifest.bounds;
  return destination(p.id,p.manifest.name,'副中心 subcenter',p.x,p.z,p.x,p.z+b.max[2]+9,false);
});
const allVisibleSolids=[...CIVIC_COLLIDERS,...METROPOLITAN_COLLIDERS,...CITY_SERVICE_COLLIDERS,
  ...CITY_OPERATION_COLLIDERS,...CITY.tiles.flatMap(tile=>tile.colliders)];

// Do not advertise ocean-floor, out-of-bounds or unfinished waterfront lots
// as visitable. Those sites require a separate land/road repair first.
export const TOUR_DESTINATIONS:readonly TourDestination[]=[...civic,...services,...operations,...subcenters]
  .filter(d=>Math.abs(d.arrivalX)<9900&&Math.abs(d.arrivalZ)<14900&&districtGroundHeight(d.arrivalX,d.arrivalZ)>-.1)
  .filter(d=>!allVisibleSolids.some(c=>d.arrivalX>c.min[0]-.4&&d.arrivalX<c.max[0]+.4&&
    d.arrivalZ>c.min[2]-.4&&d.arrivalZ<c.max[2]+.4&&c.max[1]>1));
