/** Needs-based operating plan for one 30,000-resident city, not a brand-request checklist. */
export const CITY_SERVICE_PLAN=[
  {kind:'convenience',label:'7-Eleven convenience store',count:30,staff:7,price:1600},
  {kind:'pharmacy',label:'CVS Pharmacy',count:12,staff:11,price:2600},
  {kind:'florist',label:'Neighborhood florist',count:8,staff:4,price:4200},
  {kind:'restaurant',label:'Everyday restaurant',count:90,staff:10,price:2400},
  {kind:'fine-restaurant',label:'Destination restaurant',count:18,staff:18,price:11000},
  {kind:'cafe',label:'Cafe and bakery',count:45,staff:7,price:1400},
  {kind:'laundry',label:'Laundry and dry cleaning',count:15,staff:4,price:2200},
  {kind:'salon',label:'Hair, nail and personal care',count:24,staff:6,price:4800},
  {kind:'gym',label:'Gym and fitness studio',count:12,staff:9,price:6500},
  {kind:'bank',label:'Bank branch',count:10,staff:12,price:0},
  {kind:'clinic',label:'Community clinic',count:12,staff:18,price:1800},
  {kind:'dentist',label:'Dental clinic',count:10,staff:9,price:8500},
  {kind:'daycare',label:'Daycare center',count:10,staff:14,price:5200},
  {kind:'school',label:'Primary or secondary school',count:12,staff:55,price:0},
  {kind:'pet',label:'Pet care and veterinary service',count:8,staff:8,price:4600},
  {kind:'repair',label:'Auto and household repair',count:12,staff:9,price:5500},
  {kind:'fuel',label:'Fuel and EV charging station',count:8,staff:5,price:4800},
  {kind:'hotel',label:'Hotel',count:6,staff:35,price:14000},
  {kind:'community',label:'Community service center',count:10,staff:12,price:0},
  {kind:'police',label:'Police precinct',count:4,staff:36,price:0},
  {kind:'fire',label:'Fire station',count:4,staff:28,price:0},
  {kind:'post',label:'Post and parcel center',count:6,staff:9,price:1200},
] as const;

const centers=[[0,0],[5400,3400],[-1300,8400],[1100,7200],[-1100,1000],[6500,13200]] as const;
export const SERVICE_SITES=CITY_SERVICE_PLAN.flatMap((service,categoryIndex)=>Array.from({length:service.count},(_,i)=>{
  const center=centers[(i+categoryIndex)%centers.length],ring=180+Math.floor(i/centers.length)*135,angle=(i*2.399+categoryIndex*.73);
  return {id:`CITY-${service.kind.toUpperCase()}-${String(i+1).padStart(3,'0')}`,name:`${service.label} ${i+1}`,type:service.kind,x:Math.round(center[0]+Math.cos(angle)*ring),z:Math.round(center[1]+Math.sin(angle)*ring),staff:service.staff,price:service.price};
}));

export const TRANSPORT_HUBS=[
  {id:'AIR-01',name:'AmpliWorld International Airport',mode:'airport',x:8800,z:11800,staff:1800},
  {id:'HSR-01',name:'Grand Central High-Speed Rail',mode:'high-speed-rail',x:900,z:500,staff:420},
  {id:'HSR-02',name:'East City High-Speed Rail',mode:'high-speed-rail',x:5900,z:3900,staff:280},
  {id:'METRO-NETWORK',name:'Metropolitan Metro Network',mode:'metro',stations:14,staff:620},
] as const;

export const EMPLOYMENT_DISTRICTS=[
  ...Array.from({length:24},(_,i)=>({id:`OFFICE-CAMPUS-${i+1}`,name:`Professional and technology campus ${i+1}`,type:'office',x:(i%6-2.5)*720,z:(Math.floor(i/6)-1.5)*950,staff:300})),
  ...Array.from({length:8},(_,i)=>({id:`LOGISTICS-${i+1}`,name:`Logistics and light-industry park ${i+1}`,type:'logistics',x:-3200+(i%4)*1800,z:10400+Math.floor(i/4)*1400,staff:250})),
  ...Array.from({length:10},(_,i)=>({id:`CITY-MAINTENANCE-${i+1}`,name:`Construction and city maintenance depot ${i+1}`,type:'maintenance',x:-2600+(i%5)*1300,z:2200+Math.floor(i/5)*1600,staff:80})),
] as const;

export const CITY_CAPACITY_SUMMARY={population:30000,serviceSites:SERVICE_SITES.length,employmentDistricts:EMPLOYMENT_DISTRICTS.length,transportHubs:TRANSPORT_HUBS.length,metroStations:14};
