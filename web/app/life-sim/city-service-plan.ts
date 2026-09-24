/** Needs-based operating plan for one 30,000-resident city, not a brand-request checklist. */
import housingPlan from '../world-client/housing-parcels.json';
import {CIVIC_PLACES} from '../world-client/civic-registry';
import {METROPOLITAN_PLACES} from '../world-client/metropolitan-registry';
import {riverCenterX,riverHalfWidth} from '../world-client/river-profile.mjs';
import {WORLD_SOLID_FOOTPRINTS} from '../world-spatial-registry';

export const CITY_SERVICE_PLAN=[
  {kind:'convenience',label:'7-Eleven convenience store',count:30,staff:7,price:1600},
  {kind:'pharmacy',label:'CVS Pharmacy',count:12,staff:11,price:2600},
  {kind:'florist',label:'Neighborhood florist',count:8,staff:4,price:4200},
  {kind:'signature-restaurant',label:'Michelin-level tasting restaurant (fictional)',count:2,staff:28,price:32000},
  {kind:'premium-restaurant',label:'Premium destination restaurant',count:5,staff:22,price:18000},
  {kind:'upper-restaurant',label:'Upper-mid restaurant',count:12,staff:16,price:9000},
  {kind:'mid-restaurant',label:'Mid-price restaurant',count:30,staff:11,price:4200},
  {kind:'value-restaurant',label:'Neighborhood value restaurant',count:55,staff:8,price:1800},
  {kind:'milk-tea',label:'Milk tea shop',count:10,staff:6,price:900},
  {kind:'cafe',label:'Cafe',count:10,staff:7,price:1400},
  {kind:'bakery',label:'Neighborhood bakery',count:20,staff:6,price:1200},
  {kind:'apple-store',label:'Apple products store',count:2,staff:18,price:85000},
  {kind:'samsung-store',label:'Samsung products store',count:2,staff:16,price:65000},
  {kind:'electronics-repair',label:'Electronics repair shop',count:10,staff:5,price:8500},
  {kind:'auto-repair',label:'Automotive repair shop',count:10,staff:9,price:22000},
  {kind:'dry-cleaning',label:'Full-service dry cleaner',count:8,staff:6,price:3800},
  {kind:'laundromat',label:'Self-service laundromat',count:10,staff:3,price:1400},
  {kind:'salon',label:'Hair, nail and personal care',count:24,staff:6,price:4800},
  {kind:'gym',label:'Fitness club',count:10,staff:8,price:6500},
  {kind:'arcade',label:'Arcade and games hall',count:2,staff:10,price:2400},
  {kind:'bank',label:'Bank branch',count:10,staff:12,price:0},
  {kind:'bar',label:'Neighborhood bar',count:18,staff:8,price:3200},
  {kind:'nightclub',label:'Nightclub',count:5,staff:22,price:8500},
  {kind:'clinic',label:'Community clinic',count:12,staff:18,price:1800},
  {kind:'dentist',label:'Dental clinic',count:10,staff:9,price:8500},
  {kind:'daycare',label:'Daycare center',count:10,staff:14,price:5200},
  {kind:'school',label:'Primary or secondary school',count:12,staff:55,price:0},
  {kind:'pet',label:'Pet care and veterinary service',count:8,staff:8,price:4600},
  {kind:'repair',label:'Household repair service',count:8,staff:7,price:5500},
  {kind:'gas-station',label:'Fuel station',count:6,staff:7,price:4800},
  {kind:'ev-charging',label:'Public EV charging hub',count:12,staff:4,price:2600},
  {kind:'ev-dealer',label:'Electric vehicle showroom',count:4,staff:18,price:12000},
  {kind:'motorcycle-dealer',label:'Motorcycle showroom and service',count:4,staff:14,price:9000},
  {kind:'hotel',label:'Hotel',count:6,staff:35,price:14000},
  {kind:'community',label:'Community service center',count:10,staff:12,price:0},
  {kind:'police',label:'Police precinct',count:4,staff:36,price:0},
  {kind:'fire',label:'Fire station',count:4,staff:28,price:0},
  {kind:'post',label:'Post and parcel center',count:6,staff:9,price:1200},
  // Additions follow the old deterministic layout so existing business IDs
  // and street coordinates remain stable in saved worlds.
  {kind:'small-restaurant',label:'Neighborhood kitchen',count:24,staff:5,price:1400},
  {kind:'budget-hotel',label:'Neighborhood express hotel',count:8,staff:9,price:6500},
  {kind:'detention',label:'Metropolitan detention and intake center',count:1,staff:50,price:0},
  {kind:'prison',label:'Regional correctional campus',count:1,staff:110,price:0},
  {kind:'gas-station-expansion',label:'Neighborhood fuel station',count:6,staff:7,price:4800},
  {kind:'fire-expansion',label:'Neighborhood fire station',count:2,staff:28,price:0},
  {kind:'real-estate-broker',label:'Residential property brokerage',count:4,staff:12,price:0},
  {kind:'property-developer',label:'Metropolitan property developer',count:2,staff:48,price:0},
  {kind:'car-rental',label:'City car rental and fleet service',count:3,staff:16,price:4800},
] as const;

const centers=[[0,0],[5400,3400],[-1300,8400],[1100,7200],[-1100,1000],[6500,13200]] as const;
const neighborhoodCenters=[[-4800,3500],[3200,9200],[-4400,12500],[7900,6800],[-7300,17000],[4000,18500],[8500,14500],[-3000,21000]] as const;
const mallSlots:Record<string,{x:number;z:number;floor:string;shopId:string}>={
  'apple-store:0':{x:88,z:-137,floor:'L1',shopId:'L1-shop-13'},'apple-store:1':{x:-33,z:-239,floor:'L3',shopId:'L3-shop-2'},
  'samsung-store:0':{x:-12,z:-239,floor:'L3',shopId:'L3-shop-3'},
  'signature-restaurant:0':{x:46,z:-137,floor:'L6',shopId:'L6-shop-11'},'signature-restaurant:1':{x:70,z:-208,floor:'L6',shopId:'L6-shop-14'},
  'premium-restaurant:0':{x:-96,z:-137,floor:'L5',shopId:'L5-shop-7'},'premium-restaurant:1':{x:-54,z:-239,floor:'L6',shopId:'L6-shop-1'},'premium-restaurant:2':{x:-54,z:-137,floor:'L6',shopId:'L6-shop-8'},'premium-restaurant:3':{x:70,z:-208,floor:'L6',shopId:'L6-shop-16'},'premium-restaurant:4':{x:70,z:-168,floor:'L6',shopId:'L6-shop-17'},
  'cafe:0':{x:88,z:-239,floor:'L5',shopId:'L5-shop-6'},'cafe:1':{x:46,z:-239,floor:'L6',shopId:'L6-shop-4'},
  'gym:0':{x:88,z:-137,floor:'L4',shopId:'L4-shop-13'},
  'arcade:0':{x:88,z:-239,floor:'L6',shopId:'L6-shop-6'},
};
const occupiedStreetSites:{x:number;z:number}[]=[];
// Reserve the whole storefront/forecourt, not just the central body collider.
// Gas pumps, police parking and shop canopies project beyond the main walls.
const SERVICE_HALF_WIDTH=18, SERVICE_BACK=13, SERVICE_FRONT=31, CLEARANCE=3;
function streetParcelIsClear(x:number,z:number){
  const left=x-SERVICE_HALF_WIDTH-CLEARANCE,right=x+SERVICE_HALF_WIDTH+CLEARANCE;
  const back=z-SERVICE_BACK-CLEARANCE,front=z+SERVICE_FRONT+CLEARANCE;
  if(occupiedStreetSites.some(site=>left<site.x+SERVICE_HALF_WIDTH+CLEARANCE&&right>site.x-SERVICE_HALF_WIDTH-CLEARANCE&&back<site.z+SERVICE_FRONT+CLEARANCE&&front>site.z-SERVICE_BACK-CLEARANCE))return false;
  for(const parcel of housingPlan.placements){
    const c=Math.cos(parcel.angle),s=Math.sin(parcel.angle);
    const dx=x-parcel.x,dz=z+(SERVICE_FRONT-SERVICE_BACK)/2-parcel.z;
    const lx=dx*c-dz*s,lz=dx*s+dz*c;
    const hx=SERVICE_HALF_WIDTH+CLEARANCE,hz=(SERVICE_FRONT+SERVICE_BACK)/2+CLEARANCE;
    if(Math.abs(lx)<parcel.width/2+hx*Math.abs(c)+hz*Math.abs(s)&&Math.abs(lz)<parcel.depth/2+hx*Math.abs(s)+hz*Math.abs(c))return false;
  }
  for(const place of [...CIVIC_PLACES,...METROPOLITAN_PLACES]){
    const b=place.manifest.bounds;
    if(left<place.x+b.max[0]&&right>place.x+b.min[0]&&back<place.z+b.max[2]&&front>place.z+b.min[2])return false;
  }
  for(const solid of WORLD_SOLID_FOOTPRINTS){
    const angle=solid.rotationRadians||0,c=Math.cos(angle),s=Math.sin(angle);
    const hx=solid.halfExtents[0]*Math.abs(c)+solid.halfExtents[1]*Math.abs(s);
    const hz=solid.halfExtents[0]*Math.abs(s)+solid.halfExtents[1]*Math.abs(c);
    if(left<solid.center[0]+hx&&right>solid.center[0]-hx&&back<solid.center[1]+hz&&front>solid.center[1]-hz)return false;
  }
  for(const sampleZ of [back,z,front])if(Math.abs(x-riverCenterX(sampleZ))<riverHalfWidth(sampleZ)+SERVICE_HALF_WIDTH+CLEARANCE)return false;
  return true;
}
export const SERVICE_SITES=CITY_SERVICE_PLAN.flatMap((service,categoryIndex)=>Array.from({length:service.count},(_,i)=>{
  const satellite=['small-restaurant','budget-hotel','gas-station-expansion','fire-expansion','prison','detention'].includes(service.kind);
  const pool=satellite?neighborhoodCenters:centers;
  const center=service.kind==='detention'?([1450,520] as const):service.kind==='prison'?([-7200,16000] as const):service.kind==='small-restaurant'&&i%3===0?([(i%6-2.5)*720,(Math.floor(i/6)-1.5)*950] as const):pool[(i+categoryIndex)%pool.length];
  const baseRing=service.kind==='detention'?180:service.kind==='prison'?240:180+Math.floor(i/pool.length)*135,baseAngle=(i*2.399+categoryIndex*.73);
  const slot=mallSlots[`${service.kind}:${i}`];
  let x=slot?.x??0,z=slot?.z??0,found=!!slot;
  if(!slot){
    for(let attempt=0;attempt<720;attempt++){
      const ring=baseRing+Math.floor(attempt/12)*48,angle=baseAngle+attempt*.517;
      const candidate={x:Math.round(center[0]+Math.cos(angle)*ring),z:Math.round(center[1]+Math.sin(angle)*ring)};
      if(streetParcelIsClear(candidate.x,candidate.z)){x=candidate.x;z=candidate.z;found=true;break;}
    }
    if(!found)throw new Error(`No collision-free parcel for ${service.kind} ${i+1}`);
    occupiedStreetSites.push({x,z});
  }
  const type=service.kind==='gas-station-expansion'?'gas-station':service.kind==='fire-expansion'?'fire':service.kind;
  const name=service.kind==='bank'
    ? `${i<5?'AmpliTrust Bank':'Worldline Bank'} · ${['Central','East Arc','Riverfront','Southgate','Marina'][i%5]} Branch`
    : service.kind==='police'
      ? `Metropolitan Police Precinct ${i+1}`
      : service.kind==='gym'
        ? `${i===0?'Aurea Galleria Fitness':i<=2?'Aurea Aquatic Club':i<=5?'Ampli Fitness Studio':'Iron District Gym'} ${i+1}`
        : `${service.label} ${i+1}`;
  const staff=service.kind==='gym'?(i<=2?16:i<=5?10:6):service.staff;
  const price=service.kind==='gym'?(i<=2?12000:i<=5?6500:2800):service.price;
  return {id:`CITY-${service.kind.toUpperCase()}-${String(i+1).padStart(3,'0')}`,name,type,x,z,staff,price,...(slot?{placement:'mall' as const,floor:slot.floor,shopId:slot.shopId}:{placement:'street' as const})};
}));

export const TRANSPORT_HUBS=[
  {id:'AIR-01',name:'AmpliWorld International Airport',mode:'airport',x:8800,z:11800,staff:1800},
  {id:'HSR-01',name:'Grand Central High-Speed Rail',mode:'high-speed-rail',x:1600,z:500,staff:420},
  {id:'HSR-02',name:'East City High-Speed Rail',mode:'high-speed-rail',x:5900,z:3900,staff:280},
  {id:'METRO-NETWORK',name:'Metropolitan Metro Network',mode:'metro',stations:14,x:0,z:25,staff:620},
] as const;

export const EMPLOYMENT_DISTRICTS=[
  ...Array.from({length:24},(_,i)=>({id:`OFFICE-CAMPUS-${i+1}`,name:`Professional and technology campus ${i+1}`,type:'office',x:(i%6-2.5)*720,z:(Math.floor(i/6)-1.5)*950,staff:300})),
  ...Array.from({length:8},(_,i)=>({id:`LOGISTICS-${i+1}`,name:`Logistics and light-industry park ${i+1}`,type:'logistics',x:-3200+(i%4)*1800,z:10400+Math.floor(i/4)*1400,staff:250})),
  ...Array.from({length:10},(_,i)=>({id:`CITY-MAINTENANCE-${i+1}`,name:`Construction and city maintenance depot ${i+1}`,type:'maintenance',x:-2600+(i%5)*1300,z:2200+Math.floor(i/5)*1600,staff:80})),
] as const;

export const CITY_OPERATION_SITES=[
  {id:'CONSTRUCTION-01',name:'East Arc Construction Site',type:'construction',x:2600,z:1800,staff:180},
  {id:'WASTE-01',name:'West Circular Waste and Incineration Center',type:'waste',x:-4200,z:9800,staff:140},
  {id:'POWER-01',name:'AmpliWorld Combined Power Station',type:'power',x:-5400,z:11200,staff:165},
  {id:'TAX-01',name:'Metropolitan Revenue and Taxation Bureau',type:'tax',x:850,z:650,staff:210},
  {id:'MUSEUM-01',name:'AmpliWorld Metropolitan Museum',type:'museum',x:820,z:820,staff:64},
  {id:'ART-01',name:'AmpliWorld Contemporary Art Museum',type:'art-gallery',x:1040,z:820,staff:48},
  {id:'WATER-01',name:'AmpliWorld Water Utility and Treatment Works',type:'water',x:-4700,z:7600,staff:145},
  {id:'SEWAGE-01',name:'South Basin Wastewater Reclamation Plant',type:'wastewater',x:-6500,z:9800,staff:120},
  {id:'CITYHALL-01',name:'AmpliWorld City Hall and Civic Services',type:'city-hall',x:1250,z:520,entry:[1250,572],staff:260},
  {id:'COURT-01',name:'Metropolitan Court and Justice Center',type:'court',x:1450,z:520,entry:[1450,569],staff:190},
  {id:'EMS-01',name:'Metropolitan Emergency Medical Service',type:'ems',x:3270,z:4400,entry:[3321,4439],staff:125},
  {id:'DOT-01',name:'Department of Roads and Transportation',type:'transport-authority',x:2300,z:7200,staff:230},
] as const;

export const CITY_CAPACITY_SUMMARY={population:30000,serviceSites:SERVICE_SITES.length,employmentDistricts:EMPLOYMENT_DISTRICTS.length,cityOperationSites:CITY_OPERATION_SITES.length,transportHubs:TRANSPORT_HUBS.length,metroStations:14};
