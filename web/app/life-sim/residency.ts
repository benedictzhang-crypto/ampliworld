import catalog from './occupancy-catalog.json';
import {createOpeningHousing,hourlyWageCents,monthlySalaryCents,monthlyMortgagePaymentCents,type HousingLedger} from './housing-finance';
import type {LifeWorld,Resident} from './engine';
import {VENUES} from './society';
import type {HousingPaymentState} from './housing-payments';
import {SERVICE_SITES,TRANSPORT_HUBS,EMPLOYMENT_DISTRICTS,CITY_OPERATION_SITES} from './city-service-plan';
import {RETAIL_CAMPUSES,CITY_CINEMAS,FOOD_VENUES} from '../world-client/retail-registry';
export type Dwelling = HousingLedger & {buildingId:string;buildingName:string;group:string;tier:string;equityAccounting:'included-in-existing-net-assets';landlordId:string;marketMonthlyRentCents?:number;landlordCapitalAllocatedCents?:number;payment?:HousingPaymentState};
export type Employment = {placeId:string;name:string;entry:[number,number];monthlyGrossCents:number;floor?:string};
export const RESIDENCY_VERSION=3;
export function marketMonthlyRentCents(valueCents:number, entry:readonly number[]){
  const [x,z]=entry;
  const cbd=Math.hypot(x,z)<1200||Math.hypot(x-5300,z-3000)<850;
  const school=Math.hypot(x-3650,z-4600)<900;
  return Math.round(valueCents*.003*(cbd?1.20:1)*(school?1.12:1));
}
export function bindResidency(w:LifeWorld){
  if(w.residencyVersion===RESIDENCY_VERSION&&w.housing)return;
  const families=new Map<string,Resident[]>();
  for(const r of w.residents){const id=r.identity!.familyId;families.set(id,[...(families.get(id)||[]),r]);}
  const plannedJobs=[
    ...SERVICE_SITES.map(s=>({id:s.id,name:s.name,type:s.type.endsWith('restaurant')?'restaurant':s.type==='budget-hotel'?'hotel':s.type==='fresh-market'?'supermarket':s.type,entry:[s.x,s.z] as [number,number],jobCapacity:s.staff,...(s.placement==='mall'?{floor:s.floor}:{})})),
    ...TRANSPORT_HUBS.filter(h=>'x' in h).map(h=>({id:h.id,name:h.name,type:h.mode,entry:[h.x,h.z] as [number,number],jobCapacity:h.staff})),
    ...EMPLOYMENT_DISTRICTS.map(s=>({id:s.id,name:s.name,type:s.type,entry:[s.x,s.z] as [number,number],jobCapacity:s.staff})),
    ...CITY_OPERATION_SITES.map(s=>({id:s.id,name:s.name,type:s.type,entry:('entry' in s?[...s.entry]:[s.x,s.z]) as [number,number],jobCapacity:s.staff})),
    ...RETAIL_CAMPUSES.map(s=>({id:s.id,name:s.name,type:'supermarket',entry:[s.x,s.z] as [number,number],jobCapacity:s.staff})),
    ...CITY_CINEMAS.map(s=>({id:s.id,name:s.name,type:'cinema',entry:[s.x,s.z] as [number,number],jobCapacity:s.staff})),
    ...FOOD_VENUES.map(s=>({id:s.id,name:s.name,type:'restaurant',entry:[s.x,s.z] as [number,number],jobCapacity:s.staff})),
  ];
  const jobs=[...plannedJobs,...catalog.employers].map(e=>({...e,filled:0}));
  for(const r of w.residents){
    // Fresh worlds staff their real business registry first. Do not replace
    // those jobs with an unrelated provisional venue before housing is priced.
    if(r.employment)continue;
    const monthly=monthlySalaryCents(r.job,r.identity!.age,!!r.identity!.workplace);
    if(!monthly)continue;
    const serviceId=/医生|护士|药剂|康复/.test(r.job)?'clinic':/教师|老师|图书|实验室/.test(r.job)?'school':/警员|消防员/.test(r.job)?'precinct':/银行/.test(r.job)?'bank':null;
    const service=VENUES.find(v=>v.id===serviceId);
    if(service){r.wage=hourlyWageCents(monthly);r.employment={placeId:'SERVICE-'+service.id,name:service.name+'（现有服务点）',entry:[service.x,service.z],monthlyGrossCents:r.wage*176};r.identity!.workplace=r.employment.name;continue;}
    const kind=/保安|警员|消防员/.test(r.job)?['guardhouse','management']:/园林|物业|保洁|水管|电工|维修/.test(r.job)?['management','clubhouse']:/前台|照护|健身/.test(r.job)?['hotel','clubhouse']:/销售|店长|理货|收银|厨师|服务员|咖啡|烘焙|理发/.test(r.job)?['retail-shop','retail','restaurant','dealership']:['office'];
    const available=jobs.filter(j=>j.filled<j.jobCapacity);
    const compatible=available.filter(j=>kind.includes(j.type));
    const place=(compatible.length?compatible:available).sort((a,b)=>a.filled/a.jobCapacity-b.filled/b.jobCapacity||a.id.localeCompare(b.id))[0];
    if(!place)throw new Error('Insufficient job capacity');
    place.filled++;
    r.wage=hourlyWageCents(monthly);
    r.employment={placeId:place.id,name:place.name,entry:place.entry as [number,number],monthlyGrossCents:r.wage*176,...('floor' in place&&place.floor?{floor:place.floor}:{})};
    r.identity!.workplace=place.name;
  }
  // At the 30k operating census use the declared physical unit capacity, not
  // the earlier 3k pilot's sampled household count.
  const slots=catalog.homes.flatMap(h=>Array.from({length:h.unitCapacity},(_,i)=>({home:h,unit:i+1}))).sort((a,b)=>b.home.valueCents-a.home.valueCents||a.home.id.localeCompare(b.home.id)||a.unit-b.unit);
  const wealth=(members:Resident[])=>members.reduce((total,r)=>total+Math.max(0,r.cash+r.savings+(r.profile?.nonCashAssets||0)-(r.profile?.debt||0)),0);
  const ordered=[...families.entries()].sort((a,b)=>wealth(b[1])-wealth(a[1])||a[0].localeCompare(b[0]));
  if(ordered.length>slots.length)throw new Error('Insufficient housing capacity');
  w.housing??={};
  ordered.forEach(([familyId,members])=>{
    const candidate=members.filter(r=>r.identity!.age>=18).sort((a,b)=>(b.profile?.nonCashAssets||0)-(b.profile?.debt||0)-((a.profile?.nonCashAssets||0)-(a.profile?.debt||0))||a.id.localeCompare(b.id))[0];
    const income=members.reduce((n,r)=>n+(r.employment?.monthlyGrossCents||0),0),equity=Math.max(0,(candidate?.profile?.nonCashAssets||0)-(candidate?.profile?.debt||0));
    const affordableOwner=slots.findIndex(s=>s.home.valueCents<=equity*5&&monthlyMortgagePaymentCents(Math.max(0,s.home.valueCents-equity))<=income*.35);
    const affordableRenter=affordableOwner<0?slots.findIndex(s=>Math.round(s.home.valueCents*.003)<=income*.35):-1;
    // If a household cannot afford any market unit, place it in the cheapest
    // remaining home. The housing ledger then explicitly records capped rent;
    // never hand an unaffordable household the most expensive vacant unit.
    const slotIndex=affordableOwner>=0?affordableOwner:affordableRenter>=0?affordableRenter:slots.length-1;
    const {home,unit}=slots.splice(slotIndex,1)[0],unitId=home.id+'/unit-'+String(unit).padStart(3,'0');
    // An owner's housing equity is a classification of existing wealth, never new cash/assets.
    const marketRent=marketMonthlyRentCents(home.valueCents,home.entry);
    const ledger=createOpeningHousing({familyId,unitId,members:members.map(r=>({id:r.id,age:r.identity!.age,monthlyGrossIncomeCents:r.employment?.monthlyGrossCents||0})),propertyValueCents:home.valueCents,startingHousingWealthCents:Math.max(0,(candidate?.profile?.nonCashAssets||0)-(candidate?.profile?.debt||0)),offeredMonthlyRentCents:marketRent});
    if(ledger.tenure==='owner')ledger.ownerResidentId=candidate.id;
    const dwelling: Dwelling={...ledger,buildingId:home.id,buildingName:home.name,group:home.group,tier:home.tier,equityAccounting:'included-in-existing-net-assets',landlordId:ledger.ownerResidentId||'CITY-HOUSING-TRUST',marketMonthlyRentCents:marketRent};
    w.housing![familyId]??=dwelling;
    for(const r of members){r.dwellingId=familyId;r.home=[...home.entry] as [number,number];r.identity!.home=home.name+' · '+unitId;r.identity!.homeStatus='已绑定实体建筑；房号为逻辑单元，室内尚未逐户生成';}
  });
  // Investment units are allocated from already-recorded non-cash wealth, not
  // minted as new assets. A landlord may own multiple rented apartments;
  // remaining units belong to the city housing trust.
  const budgets=[...ordered].map(([,members])=>{
    const investor=members.filter(r=>r.identity!.age>=18).sort((a,b)=>(b.profile?.nonCashAssets||0)-(b.profile?.debt||0)-((a.profile?.nonCashAssets||0)-(a.profile?.debt||0))||a.id.localeCompare(b.id))[0];
    if(!investor)return null;
    const primary=w.housing![investor.identity!.familyId];
    const available=Math.max(0,(investor.profile?.nonCashAssets||0)-(investor.profile?.debt||0)-(primary?.ownerResidentId===investor.id?primary.downPaymentCents:0));
    return {id:investor.id,available,units:0};
  }).filter((x):x is {id:string;available:number;units:number}=>!!x).sort((a,b)=>b.available-a.available||a.id.localeCompare(b.id));
  for(const home of Object.values(w.housing!).filter(h=>h.tenure==='renter').sort((a,b)=>b.propertyValueCents-a.propertyValueCents||a.unitId.localeCompare(b.unitId))){
    if(home.landlordId!=='CITY-HOUSING-TRUST')continue;
    const investor=budgets.find(owner=>owner.units<12&&owner.available>=home.propertyValueCents&&!home.residentIds.includes(owner.id));
    if(!investor)continue;
    investor.available-=home.propertyValueCents;
    investor.units++;
    home.landlordId=investor.id;
    home.landlordCapitalAllocatedCents=home.propertyValueCents;
  }
  w.residencyVersion=RESIDENCY_VERSION;
}
