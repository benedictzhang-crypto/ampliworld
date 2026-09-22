/** Needs-based operating plan for one 30,000-resident city, not a brand-request checklist. */
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
  {kind:'laundry',label:'Laundry and dry cleaning',count:15,staff:4,price:2200},
  {kind:'salon',label:'Hair, nail and personal care',count:24,staff:6,price:4800},
  {kind:'gym',label:'Gym and fitness studio',count:12,staff:9,price:6500},
  {kind:'bank',label:'Bank branch',count:10,staff:12,price:0},
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
] as const;

const centers=[[0,0],[5400,3400],[-1300,8400],[1100,7200],[-1100,1000],[6500,13200]] as const;
const mallSlots:Record<string,{x:number;z:number;floor:string;shopId:string}>={
  'apple-store:0':{x:88,z:-137,floor:'L1',shopId:'L1-shop-13'},'apple-store:1':{x:-33,z:-239,floor:'L3',shopId:'L3-shop-2'},
  'samsung-store:0':{x:-12,z:-239,floor:'L3',shopId:'L3-shop-3'},
  'signature-restaurant:0':{x:46,z:-137,floor:'L6',shopId:'L6-shop-11'},'signature-restaurant:1':{x:70,z:-208,floor:'L6',shopId:'L6-shop-14'},
  'premium-restaurant:0':{x:-96,z:-137,floor:'L5',shopId:'L5-shop-7'},'premium-restaurant:1':{x:-54,z:-239,floor:'L6',shopId:'L6-shop-1'},'premium-restaurant:2':{x:-54,z:-137,floor:'L6',shopId:'L6-shop-8'},'premium-restaurant:3':{x:70,z:-208,floor:'L6',shopId:'L6-shop-16'},'premium-restaurant:4':{x:70,z:-168,floor:'L6',shopId:'L6-shop-17'},
  'cafe:0':{x:88,z:-239,floor:'L5',shopId:'L5-shop-6'},'cafe:1':{x:46,z:-239,floor:'L6',shopId:'L6-shop-4'},
};
export const SERVICE_SITES=CITY_SERVICE_PLAN.flatMap((service,categoryIndex)=>Array.from({length:service.count},(_,i)=>{
  const center=centers[(i+categoryIndex)%centers.length],ring=180+Math.floor(i/centers.length)*135,angle=(i*2.399+categoryIndex*.73);
  const slot=mallSlots[`${service.kind}:${i}`];
  const x=slot?.x??Math.round(center[0]+Math.cos(angle)*ring),z=slot?.z??Math.round(center[1]+Math.sin(angle)*ring);
  return {id:`CITY-${service.kind.toUpperCase()}-${String(i+1).padStart(3,'0')}`,name:`${service.label} ${i+1}`,type:service.kind,x,z,staff:service.staff,price:service.price,...(slot?{placement:'mall' as const,floor:slot.floor,shopId:slot.shopId}:{placement:'street' as const})};
}));

export const TRANSPORT_HUBS=[
  {id:'AIR-01',name:'AmpliWorld International Airport',mode:'airport',x:8800,z:11800,staff:1800},
  {id:'HSR-01',name:'Grand Central High-Speed Rail',mode:'high-speed-rail',x:900,z:500,staff:420},
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
] as const;

export const CITY_CAPACITY_SUMMARY={population:30000,serviceSites:SERVICE_SITES.length,employmentDistricts:EMPLOYMENT_DISTRICTS.length,cityOperationSites:CITY_OPERATION_SITES.length,transportHubs:TRANSPORT_HUBS.length,metroStations:14};
