import catalog from './occupancy-catalog.json';
import {monthlySalaryCents} from './housing-finance';
import type {LifeWorld,Resident} from './engine';
import {RETAIL_CAMPUSES,CITY_CINEMAS,FOOD_VENUES} from '../world-client/retail-registry';
import {SERVICE_SITES,TRANSPORT_HUBS,EMPLOYMENT_DISTRICTS,CITY_OPERATION_SITES} from './city-service-plan';
export const COMMERCE_VERSION=5;
export const HOSPITALITY=[
 {id:'GC-RESTAURANT-001',name:'Lotus Siam · 泰国菜',type:'restaurant',entry:[245,-68],price:2600,staff:12},
 {id:'GC-RESTAURANT-002',name:'Bronze Garden · 花园中餐',type:'restaurant',entry:[290,-68],price:2800,staff:9},
 {id:'GC-RESTAURANT-003',name:'Ember Prime · 高档牛排店',type:'restaurant',entry:[335,-68],price:12800,staff:14},
 {id:'GC-HOTEL-005',name:'Aurelia Grand · 五星酒店',type:'hotel',entry:[-150,-620],price:32000,staff:48},
 {id:'GC-HOTEL-004',name:'Meridian · 四星酒店',type:'hotel',entry:[150,-620],price:16000,staff:28},
] as const;
export type Business={id:string;name:string;type:string;entry:[number,number];floor?:string;staffIds:string[];managerId:string|null;ownerId:string|null;price:number;open:number;close:number;cash:number;visits:number;revenue:number;workedHours:number;day:number;todayVisits:number;todayRevenue:number;unpaidWages:number};
const hash=(s:string)=>[...s].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,17);
export function initializeCommerce(w:LifeWorld){
 if(w.commerceVersion===COMMERCE_VERSION&&w.businesses)return;
 const definitions=[
  {id:'SERVICE-clinic',name:'社区医院诊疗中心',type:'hospital',entry:[-10,-16],jobCapacity:54},
  {id:'SERVICE-precinct',name:'CBD 警务服务站',type:'police',entry:[10,28],jobCapacity:32},
  {id:'SERVICE-school',name:'社区学院',type:'school',entry:[-10,26],jobCapacity:62},
  ...HOSPITALITY.map(b=>({...b,jobCapacity:b.staff})),
  ...RETAIL_CAMPUSES.map(s=>({id:s.id,name:s.name,type:'supermarket',entry:[s.x,s.z] as [number,number],price:s.kind==='premium-grocery'?5200:s.kind==='warehouse-club'?9800:3600,jobCapacity:s.staff})),
  ...CITY_CINEMAS.map(s=>({id:s.id,name:s.name,type:'cinema',entry:[s.x,s.z] as [number,number],price:2200,jobCapacity:s.staff})),
  ...FOOD_VENUES.map(s=>({id:s.id,name:s.name,type:s.type==='food-truck'?'restaurant':'restaurant',entry:[s.x,s.z] as [number,number],price:s.price,jobCapacity:s.staff})),
  ...SERVICE_SITES.map(s=>({id:s.id,name:s.name,type:s.type.endsWith('restaurant')?'restaurant':s.type,entry:[s.x,s.z] as [number,number],price:s.price,jobCapacity:s.staff,...(s.placement==='mall'?{floor:s.floor}:{})})),
  ...TRANSPORT_HUBS.filter(h=>'x' in h).map(h=>({id:h.id,name:h.name,type:h.mode,entry:[h.x,h.z] as [number,number],price:0,jobCapacity:h.staff})),
  ...EMPLOYMENT_DISTRICTS.map(s=>({id:s.id,name:s.name,type:s.type,entry:[s.x,s.z] as [number,number],price:0,jobCapacity:s.staff})),
  ...CITY_OPERATION_SITES.map(s=>({id:s.id,name:s.name,type:s.type,entry:[s.x,s.z] as [number,number],price:0,jobCapacity:s.staff})),
  ...catalog.employers,
 ];
 w.businesses??={};
 const adults=w.residents.filter(r=>(r.identity?.age||0)>=18&&r.wage>0).sort((a,b)=>hash(a.id)-hash(b.id));
 const remaining=new Set(adults.map(r=>r.id));
 function role(type:string,i:number):string{
  if(type==='hospital')return i===0?'医院行政主管':i<13?'医生':i<39?'护士':i<47?'药剂师':'医院前台';
  if(type==='police')return i===0?'警务主管':i<25?'警员':'警务文员';
  if(type==='school')return i<42?'教师':i<50?'图书管理员':'行政助理';
  if(type==='restaurant')return i===0?'餐厅经营者':i%3===0?'厨师':i%3===1?'服务员':'收银员';
  if(type==='hotel')return i===0?'酒店经理':i%4===0?'客房保洁员':i%4===1?'酒店前台':i%4===2?'礼宾员':'服务员';
  if(type==='auto')return i===0?'汽车中心经理':i%3===0?'维修技师':'汽车销售顾问';
  if(type==='retail-shop')return i===0?'店长':'零售顾问';
  if(type==='guardhouse')return '保安';
  if(type==='management')return i===0?'物业经理':i%2?'物业管家':'园林养护员';
  if(type==='supermarket')return i===0?'超市店长':i%2?'超市理货员':'收银员';
  if(type==='cinema')return i===0?'影院经理':i%3===0?'放映技术员':i%3===1?'影院服务员':'票务员';
  if(type==='pharmacy')return i===0?'药店经理':i%3===0?'药剂师':i%3===1?'药店理货员':'收银员';
  if(type==='convenience')return i===0?'便利店店长':i%2?'便利店员':'收银员';
  if(type==='florist')return i===0?'花店经营者':'花艺师';
  if(type==='cafe')return i===0?'咖啡店经理':i%2?'咖啡师':'烘焙师';
  if(type==='milk-tea')return i===0?'奶茶店店长':i%2?'调饮师':'外卖打包员';
  if(type==='bakery')return i===0?'烘焙店店长':i%2?'烘焙师':'店员';
  if(type==='apple-store'||type==='samsung-store')return i===0?'手机店店长':i%3===0?'技术顾问':'销售顾问';
  if(type==='electronics-repair')return i===0?'电子维修店经理':'电子产品维修技师';
  if(type==='auto-repair')return i===0?'汽车维修店经理':i%3===0?'汽车维修技师':i%3===1?'钣金技师':'服务顾问';
  if(type==='gas-station')return i===0?'加油站经理':i%2?'加油站服务员':'便利店员';
  if(type==='ev-charging')return i===0?'充电站主管':i%2?'充电运维技师':'充电服务员';
  if(type==='ev-dealer')return i===0?'电动车店经理':i%3===0?'电动车维修技师':'电动车销售顾问';
  if(type==='motorcycle-dealer')return i===0?'摩托车店经理':i%3===0?'摩托车维修技师':'摩托车销售顾问';
  if(type==='fire')return i===0?'消防站主管':'消防员';
  if(type==='airport'||type==='high-speed-rail')return i===0?'交通枢纽主管':i%3===0?'运营调度员':i%3===1?'安检员':'旅客服务员';
  if(type==='metro')return i===0?'地铁运营主管':i%3===0?'地铁运营员':i%3===1?'地铁安检员':'站务员';
  if(type==='logistics')return i===0?'物流园主管':i%3===0?'货车司机':i%3===1?'仓库管理员':'配送员';
  if(type==='construction')return i===0?'项目经理':i%5===0?'塔吊司机':i%5===1?'水泥搅拌车司机':i%5===2?'建筑工人':i%5===3?'电工':'安全员';
  if(type==='waste')return i===0?'垃圾处理中心主管':i%3===0?'垃圾车司机':i%3===1?'焚烧炉操作员':'环卫工人';
  if(type==='power')return i===0?'电厂运行主管':i%3===0?'电力运行员':i%3===1?'设备维修工程师':'电网调度员';
  if(type==='tax')return i===0?'税务局主管':i%3===0?'税务审查员':i%3===1?'纳税服务专员':'政府会计';
  if(type==='museum')return i===0?'博物馆馆长':i%4===0?'策展人':i%4===1?'藏品维护员':i%4===2?'博物馆讲解员':'公共教育专员';
  if(type==='art-gallery')return i===0?'美术馆馆长':i%4===0?'当代艺术策展人':i%4===1?'艺术品维护员':i%4===2?'美术馆讲解员':'展览运营员';
  return '';
 }
 // Services and individual shops get staffing first; office populations fill remaining capacity.
 const ordered=definitions.sort((a,b)=>Number(a.type==='office')-Number(b.type==='office'));
 for(const d of ordered){
  const target=d.type==='retail-shop'?2+hash(d.id)%5:d.type==='restaurant'?12:d.type==='auto'?22:d.type==='office'?Math.min(d.jobCapacity,60+hash(d.id)%210):Math.min(d.jobCapacity,8+hash(d.id)%19);
  const requested=d.type==='office'?Math.min(target,Math.max(0,remaining.size-(ordered.length-ordered.indexOf(d)-1)*8)):d.type==='retail-shop'?target:Math.min(d.jobCapacity,remaining.size);
  const b:Business=w.businesses[d.id]??={id:d.id,name:d.name,type:d.type,entry:d.entry as [number,number],...('floor' in d&&d.floor?{floor:d.floor}:{}),staffIds:[],managerId:null,ownerId:null,price:'price' in d?d.price:d.type==='restaurant'?2600:d.type==='retail-shop'?2500+(hash(d.id)%12)*1500:d.type==='auto'?8500:d.type==='hospital'?1800:0,open:['hotel','hospital','police'].includes(d.type)?0:d.type==='supermarket'?7:d.type==='cinema'?10:8,close:['hotel','hospital','police'].includes(d.type)?24:d.type==='cinema'?24:d.type==='supermarket'?23:22,cash:0,visits:0,revenue:0,workedHours:0,day:Math.floor(w.minute/1440),todayVisits:0,todayRevenue:0,unpaidWages:0};
  b.name=d.name;b.type=d.type;b.entry=d.entry as [number,number];if('floor' in d&&d.floor)b.floor=d.floor;
  for(let i=0;i<requested&&remaining.size;i++){
   const wanted=role(d.type,i);
   const minimum=wanted==='医生'?26:wanted==='护士'?21:/经理|主管|店长|经营者/.test(wanted)?24:18;
   const person=adults.find(r=>remaining.has(r.id)&&r.identity!.age>=minimum&&wanted&&r.job===wanted)||adults.find(r=>remaining.has(r.id)&&r.identity!.age>=minimum);
   if(!person)break;
   remaining.delete(person.id);b.staffIds.push(person.id);
   if(wanted)person.job=wanted;
   person.identity!.occupation=person.job;person.identity!.workplace=d.name;
   const varied=.85+(hash(person.id+'salary')%36)/100;
   person.wage=Math.round(monthlySalaryCents(person.job,person.identity!.age,true)*varied/176);
   person.employment={placeId:d.id,name:d.name,entry:b.entry,monthlyGrossCents:person.wage*176,...(b.floor?{floor:b.floor}:{})};
   if(person.profile){person.profile.occupation=person.job;person.profile.sector=d.type;}
  }
  b.managerId=b.staffIds[0]||null;
  if(d.type==='restaurant')b.ownerId=b.managerId;
  const funding=['hospital','police','school'].includes(b.type)?0:Math.min(w.treasury,b.staffIds.reduce((n,id)=>n+(w.residents.find(r=>r.id===id)?.wage||0)*16,0));
  b.cash+=funding;w.treasury-=funding;
 }
 // Remaining professionals retain differentiated roles in office jobs, with no duplicate employment.
 const offices=Object.values(w.businesses).filter(b=>b.type==='office');
 for(const r of adults.filter(r=>remaining.has(r.id))){const b=offices[hash(r.id)%offices.length];b.staffIds.push(r.id);r.employment={placeId:b.id,name:b.name,entry:b.entry,monthlyGrossCents:r.wage*176};r.identity!.workplace=b.name;}
 // Preserve existing housing underwriting/loan terms when jobs change.
 w.commerceVersion=COMMERCE_VERSION;
}
export function openBusinesses(w:LifeWorld,types:string[]){const hour=(w.minute%1440)/60;return Object.values(w.businesses||{}).filter(b=>types.includes(b.type)&&b.staffIds.length>0&&hour>=b.open&&hour<b.close);}
export function chooseBusiness(w:LifeWorld,r:Resident,types:string[],budget:number){
 const choices=openBusinesses(w,types).filter(b=>b.price<=budget).sort((a,b)=>Math.hypot(a.entry[0]-r.x,a.entry[1]-r.z)-Math.hypot(b.entry[0]-r.x,b.entry[1]-r.z));
 return choices[(hash(r.id+Math.floor(w.minute/1440))%Math.min(choices.length,5))];
}
