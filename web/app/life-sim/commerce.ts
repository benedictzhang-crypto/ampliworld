import catalog from './occupancy-catalog.json';
import {hourlyWageCents,monthlySalaryCents} from './housing-finance';
import type {LifeWorld,Resident} from './engine';
import {RETAIL_CAMPUSES,CITY_CINEMAS,FOOD_VENUES} from '../world-client/retail-registry';
import {SERVICE_SITES,TRANSPORT_HUBS,EMPLOYMENT_DISTRICTS,CITY_OPERATION_SITES} from './city-service-plan';
export const COMMERCE_VERSION=13;
export const HOSPITALITY=[
 {id:'GC-RESTAURANT-001',name:'Lotus Siam · 泰国菜',type:'restaurant',entry:[245,-68],price:2600,staff:12},
 {id:'GC-RESTAURANT-002',name:'Bronze Garden · 花园中餐',type:'restaurant',entry:[290,-68],price:2800,staff:9},
 {id:'GC-RESTAURANT-003',name:'Ember Prime · 高档牛排店',type:'restaurant',entry:[335,-68],price:12800,staff:14},
 {id:'GC-HOTEL-005',name:'Aurelia Grand · 五星酒店',type:'hotel',entry:[-150,-620],price:32000,staff:48},
 {id:'GC-HOTEL-004',name:'Meridian · 四星酒店',type:'hotel',entry:[150,-620],price:16000,staff:28},
] as const;
export type Business={id:string;name:string;type:string;entry:[number,number];floor?:string;staffIds:string[];managerId:string|null;ownerId:string|null;price:number;open:number;close:number;cash:number;visits:number;revenue:number;workedHours:number;day:number;todayVisits:number;todayRevenue:number;unpaidWages:number};
const hash=(s:string)=>{let value=17;for(let i=0;i<s.length;i++)value=(Math.imul(value,31)+s.charCodeAt(i))>>>0;return value;};
export function initializeCommerce(w:LifeWorld){
 if(w.commerceVersion===COMMERCE_VERSION&&w.businesses)return;
 const definitions=[
  {id:'SERVICE-clinic',name:'Meridian University Medical Center',type:'hospital',entry:[3000,4446],jobCapacity:1250},
  {id:'SERVICE-precinct',name:'CBD 警务服务站',type:'police',entry:[10,28],jobCapacity:32},
  {id:'SERVICE-school',name:'AmpliWorld Academy Campus',type:'school',entry:[3570,4678],jobCapacity:240},
  ...HOSPITALITY.map(b=>({...b,jobCapacity:b.staff})),
  ...RETAIL_CAMPUSES.map(s=>({id:s.id,name:s.name,type:'supermarket',entry:[s.x,s.z] as [number,number],price:s.kind==='premium-grocery'?5200:s.kind==='warehouse-club'?9800:3600,jobCapacity:s.staff})),
  ...CITY_CINEMAS.map(s=>({id:s.id,name:s.name,type:'cinema',entry:[s.x,s.z] as [number,number],price:2200,jobCapacity:s.staff})),
  ...FOOD_VENUES.map(s=>({id:s.id,name:s.name,type:s.type==='food-truck'?'restaurant':'restaurant',entry:[s.x,s.z] as [number,number],price:s.price,jobCapacity:s.staff})),
  ...SERVICE_SITES.map(s=>({id:s.id,name:s.name,type:s.type.endsWith('restaurant')?'restaurant':s.type==='budget-hotel'?'hotel':s.type,entry:[s.x,s.z] as [number,number],price:s.price,jobCapacity:s.staff,...(s.placement==='mall'?{floor:s.floor}:{})})),
  ...TRANSPORT_HUBS.filter(h=>'x' in h).map(h=>({id:h.id,name:h.name,type:h.mode,entry:[h.x,h.z] as [number,number],price:0,jobCapacity:h.staff})),
  ...EMPLOYMENT_DISTRICTS.map(s=>({id:s.id,name:s.name,type:s.type,entry:[s.x,s.z] as [number,number],price:0,jobCapacity:s.staff})),
  ...CITY_OPERATION_SITES.map(s=>({id:s.id,name:s.name,type:s.type,entry:('entry' in s?[...s.entry]:[s.x,s.z]) as [number,number],price:0,jobCapacity:s.staff})),
  ...catalog.employers,
 ];
 w.businesses??={};
 const activeIds=new Set(definitions.map(d=>d.id));
 for(const [id,business] of Object.entries(w.businesses)){
  if(!activeIds.has(id)){delete w.businesses[id];continue;}
  business.staffIds=[];business.managerId=null;business.ownerId=null;
 }
 const adults=w.residents.filter(r=>(r.identity?.age||0)>=18&&r.wage>0).sort((a,b)=>hash(a.id)-hash(b.id));
 const remaining=new Set(adults.map(r=>r.id));
 function role(type:string,i:number,placeId=''):string{
  if(type==='hospital'){
   const n=i%100;
   return i===0?'医院行政主管':n<22?'医生':n<64?'护士':n<72?'医学检验技师':n<78?'影像技师':n<83?'急救员':n<87?'药剂师':n<91?'康复治疗师':n<94?'医院前台':n<97?'医院后勤人员':'医院保安';
  }
  if(type==='police'){
   const n=i%36;
   return i===0?'警务主管':n<15?'巡逻警员':n<22?'交通警员':n<27?'刑事调查员':n<31?'警务调度员':n<34?'警务档案员':'警局保洁员';
  }
  if(type==='school'){
   // Most schools in this 30k-resident scenario have 55 places; percentages
   // must therefore repeat within each school rather than over a 100-person cycle.
   const n=i%20;
   return i===0?'校长':n<9?'教师':n===9?'音乐教师':n===10?'教学助理':n===11?'学校心理辅导员':n===12?'图书管理员':n<15?'学校行政人员':n<17?'校园餐饮员工':n<19?'校园保洁员':'校园保安';
  }
  if(type==='restaurant'){
   const n=i%12;
   return i===0?'餐厅经营者':n<4?'厨师':n<8?'服务员':n===8?'餐厅接待员':n===9?'洗碗工':n===10?'餐厅保洁员':'备餐员';
  }
  if(type==='bar')return i===0?'酒吧经理':i%8<3?'调酒师':i%8<5?'酒吧服务员':i%8===5?'酒吧保安':i%8===6?'洗杯员':'酒吧保洁员';
  if(type==='nightclub')return i===0?'夜店经理':i%11<2?'DJ':i%11<5?'调酒师':i%11<7?'夜店服务员':i%11<9?'夜店保安':i%11===9?'洗杯员':'夜店保洁员';
  if(type==='dry-cleaning')return i===0?'干洗店经理':i%6<3?'干洗技师':i%6===3?'熨烫整形员':i%6===4?'衣物修补员':'干洗店前台';
  if(type==='laundromat')return i===0?'自助洗衣店经理':i%3===1?'洗衣店值班员':'洗衣设备维护员';
  if(type==='bank')return i===0?'银行网点经理':i%12<4?'银行柜员':i%12<7?'客户经理':i%12<9?'信贷专员':i%12===9?'银行客服':i%12===10?'银行保安':'银行保洁员';
  if(type==='hotel')return i===0?'酒店经理':i%4===0?'客房保洁员':i%4===1?'酒店前台':i%4===2?'礼宾员':'服务员';
  if(type==='auto')return i===0?'汽车中心经理':i%3===0?'维修技师':'汽车销售顾问';
  if(type==='real-estate-broker')return i===0?'房地产中介店长':i%4===0?'租赁经纪人':i%4===1?'新房销售顾问':i%4===2?'房源摄影师':'房地产经纪人';
  if(type==='property-developer')return i===0?'房地产开发总经理':i%7===0?'城市规划师':i%7===1?'建筑设计师':i%7===2?'项目经理':i%7===3?'造价工程师':i%7===4?'招商专员':i%7===5?'物业策划师':'开发商销售顾问';
  if(type==='car-rental')return i===0?'汽车租赁店长':i%5===0?'车队调度员':i%5===1?'租车顾问':i%5===2?'车辆清洁员':i%5===3?'汽车维修技师':'租车接送司机';
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
  if(type==='apple-store'||type==='samsung-store')return i===0?'手机店店长':i%3===0?'技术顾问':'手机销售顾问';
  if(type==='electronics-repair')return i===0?'电子维修店经理':'电子产品维修技师';
  if(type==='auto-repair')return i===0?'汽车维修店经理':i%3===0?'汽车维修技师':i%3===1?'钣金技师':'服务顾问';
  if(type==='gas-station')return i===0?'加油站经理':i%2?'加油站服务员':'便利店员';
  if(type==='ev-charging')return i===0?'充电站主管':i%2?'充电运维技师':'充电服务员';
  if(type==='ev-dealer')return i===0?'电动车店经理':i%3===0?'电动车维修技师':'电动车销售顾问';
  if(type==='motorcycle-dealer')return i===0?'摩托车店经理':i%3===0?'摩托车维修技师':'摩托车销售顾问';
  if(type==='fire')return i===0?'消防站主管':'消防员';
  if(type==='detention')return i===0?'拘留中心主任':i%10<5?'拘留所警员':i%10<7?'羁押医疗人员':i%10===7?'值班登记员':i%10===8?'设施维修员':'拘留所后勤人员';
  if(type==='prison')return i===0?'监狱长':i%12<6?'监狱警员':i%12<8?'矫正教育员':i%12===8?'监狱医护人员':i%12===9?'厨房工作人员':i%12===10?'设施维修员':'行政档案员';
  if(type==='airport')return i===0?'机场运营主管':i%4===0?'运营调度员':i%4===1?'机场安检员':i%4===2?'机场地勤':'旅客服务员';
  if(type==='high-speed-rail')return i===0?'高铁站运营主管':i%3===0?'运营调度员':i%3===1?'高铁安检员':'旅客服务员';
  if(type==='metro')return i===0?'地铁运营主管':i%3===0?'地铁运营员':i%3===1?'地铁安检员':'站务员';
  if(type==='logistics')return i===0?'物流园主管':i%3===0?'货车司机':i%3===1?'仓库管理员':'配送员';
  if(type==='construction')return i===0?'项目经理':i%5===0?'塔吊司机':i%5===1?'水泥搅拌车司机':i%5===2?'建筑工人':i%5===3?'电工':'安全员';
  if(type==='waste')return i===0?'垃圾处理中心主管':i%5===0?'垃圾车司机':i%5===1?'焚烧炉操作员':i%5===2?'环卫工人':i%5===3?'道路清扫车司机':'垃圾分类员';
  if(type==='power')return i===0?'电厂运行主管':i%3===0?'电力运行员':i%3===1?'设备维修工程师':'电网调度员';
  if(type==='tax')return i===0?'税务局主管':i%3===0?'税务审查员':i%3===1?'纳税服务专员':'政府会计';
  if(type==='museum')return i===0?'博物馆馆长':i%4===0?'策展人':i%4===1?'藏品维护员':i%4===2?'博物馆讲解员':'公共教育专员';
  if(type==='art-gallery')return i===0?'美术馆馆长':i%4===0?'当代艺术策展人':i%4===1?'艺术品维护员':i%4===2?'美术馆讲解员':'展览运营员';
  if(type==='clinic')return i===0?'诊所主任':i%12<4?'医生':i%12<7?'护士':i%12===7?'康复师':i%12===8?'实验室技术员':i%12===9?'诊所前台':i%12===10?'药剂师':'诊所保洁员';
  if(type==='dentist')return i===0?'牙科诊所主任':i%6<3?'牙医':i%6<5?'牙科助理':'牙科前台';
  if(type==='daycare')return i===0?'托育中心主任':i%6<3?'幼教老师':i%6<5?'保育员':'托育中心后勤';
  if(type==='pet')return i===0?'宠物医院院长':i%5<2?'兽医':i%5===2?'宠物护理员':i%5===3?'宠物美容师':'宠物医院前台';
  if(type==='repair')return i===0?'维修店经理':i%4<3?'维修技师':'维修店前台';
  if(type==='salon')return i===0?'美容店经理':i%5<2?'美甲师':i%5<4?'理发师':'美容店前台';
  if(type==='gym'){
   if(i===0)return '健身房经理';
   if(/00[2-3]$/.test(placeId))return i<3?'救生员':i<8?'健身教练':i<10?'健身房前台':i<12?'游泳教练':i<15?'健身房保洁员':'健身器材维护技师';
   if(/001$/.test(placeId))return i<8?'健身教练':i<11?'健身房前台':i<14?'健身房保洁员':'健身器材维护技师';
   if(/00[4-6]$/.test(placeId))return i<6?'健身教练':i<8?'健身房前台':i===8?'健身房保洁员':'健身器材维护技师';
   return i<3?'健身教练':i===3?'健身房前台':i===4?'健身房保洁员':'健身器材维护技师';
  }
  if(type==='arcade')return i===0?'电玩城经理':i%5<3?'游戏厅服务员':i%5===3?'游戏设备维修技师':'电玩城保洁员';
  if(type==='community')return i===0?'社区服务主管':i%5<2?'社工':i%5===2?'照护员':i%5===3?'社区活动协调员':'社区保洁员';
  if(type==='post')return i===0?'邮政网点主管':i%5<2?'邮件分拣员':i%5<4?'邮递员':'邮政柜员';
  if(type==='clubhouse')return i===0?'会所经理':i%4===0?'会所礼宾员':i%4===1?'健身教练':i%4===2?'会所服务员':'会所保洁员';
  if(type==='stadium')return i===0?'体育场运营主管':i%5===0?'草坪维护员':i%5===1?'赛事安保员':i%5===2?'票务员':i%5===3?'设施维修技师':'赛事服务员';
  if(type==='retail')return i===0?'商场运营主管':i%5===0?'商场客服':i%5===1?'招商专员':i%5===2?'商场设施维护员':i%5===3?'商场保安':'商场保洁员';
  if(type==='maintenance')return i===0?'设施维护主管':i%5===0?'电工':i%5===1?'水管工':i%5===2?'维修技师':i%5===3?'保洁员':'园林养护员';
  if(type==='office')return i===0?'办公室负责人':i%18<3?'行政助理':i%18<5?'会计':i%18<7?'软件工程师':i%18===7?'产品经理':i%18===8?'设计师':i%18===9?'客户经理':i%18===10?'研究员':i%18===11?'审计员':i%18===12?'律师':i%18===13?'人事专员':i%18===14?'摄影师':i%18===15?'设施维护员':'办公室保洁员';
  if(type==='water')return i===0?'水务公司主管':i%5===0?'水处理操作员':i%5===1?'水质检验员':i%5===2?'供水管网维修员':i%5===3?'水务工程师':'水务调度员';
  if(type==='wastewater')return i===0?'污水处理厂主管':i%5===0?'污水处理操作员':i%5===1?'环境检验员':i%5===2?'排水管网维修员':i%5===3?'污泥处理员':'设备维修技师';
  if(type==='city-hall')return i===0?'市政厅行政主管':i%6===0?'城市规划师':i%6===1?'行政审批员':i%6===2?'民政服务专员':i%6===3?'政府采购专员':i%6===4?'市政档案员':'政务服务人员';
  if(type==='court')return i===0?'法院行政主管':i%7===0?'法官':i%7===1?'检察官':i%7===2?'公设辩护人':i%7===3?'法庭书记员':i%7===4?'法警':i%7===5?'法律援助专员':'法院档案员';
  if(type==='ems')return i===0?'急救中心主管':i%5===0?'急救调度员':i%5<3?'急救员':i%5===3?'救护车司机':'救护车维修技师';
  if(type==='transport-authority')return i===0?'道路交通管理局主管':i%9===0?'道路养护工':i%9===1?'交通信号技师':i%9===2?'停车执法员':i%9===3?'拖车司机':i%9===4?'交通规划师':i%9===5?'桥梁巡检员':i%9===6?'路政洒水车司机':i%9===7?'道路施工安全员':'道路调度员';
  return '';
 }
 // Services and individual shops get staffing first; office populations fill remaining capacity.
 const ordered=definitions.sort((a,b)=>Number(a.type==='office')-Number(b.type==='office'));
 for(const d of ordered){
  const fullStaff=['water','wastewater','city-hall','court','ems','transport-authority','fire','detention','prison'];
  const target=d.type==='hospital'?Math.min(d.jobCapacity,900):d.type==='school'?Math.min(d.jobCapacity,220):fullStaff.includes(d.type)?d.jobCapacity:d.type==='police'?d.jobCapacity:d.type==='restaurant'?d.jobCapacity:d.type==='bank'?d.jobCapacity:d.type==='bar'||d.type==='nightclub'||d.type==='dry-cleaning'||d.type==='laundromat'?d.jobCapacity:d.type==='retail-shop'?2+hash(d.id)%5:d.type==='auto'?22:d.type==='office'?Math.min(d.jobCapacity,60+hash(d.id)%210):Math.min(d.jobCapacity,8+hash(d.id)%19);
  const requested=d.type==='office'?Math.min(target,Math.max(0,remaining.size-(ordered.length-ordered.indexOf(d)-1)*8)):d.type==='retail-shop'?target:Math.min(d.jobCapacity,remaining.size);
  const alwaysOpen=['hotel','hospital','police','fire','detention','prison','water','wastewater','ems','transport-authority'];
  const b:Business=w.businesses[d.id]??={id:d.id,name:d.name,type:d.type,entry:d.entry as [number,number],...('floor' in d&&d.floor?{floor:d.floor}:{}),staffIds:[],managerId:null,ownerId:null,price:'price' in d?d.price:d.type==='restaurant'?2600:d.type==='retail-shop'?2500+(hash(d.id)%12)*1500:d.type==='auto'?8500:d.type==='hospital'?1800:0,open:alwaysOpen.includes(d.type)?0:d.type==='nightclub'?20:d.type==='bar'?17:d.type==='supermarket'?7:d.type==='cinema'?10:8,close:alwaysOpen.includes(d.type)?24:d.type==='nightclub'?4:d.type==='bar'?2:d.type==='cinema'?24:d.type==='supermarket'?23:22,cash:0,visits:0,revenue:0,workedHours:0,day:Math.floor(w.minute/1440),todayVisits:0,todayRevenue:0,unpaidWages:0};
  b.name=d.name;b.type=d.type;b.entry=d.entry as [number,number];if('floor' in d&&d.floor)b.floor=d.floor;
  for(let i=0;i<requested&&remaining.size;i++){
   const wanted=d.type==='restaurant'&&'price' in d&&typeof d.price==='number'&&d.price<=4200&&i===requested-1&&i>3?'外卖员':role(d.type,i,d.id);
   const minimum=/医生|牙医|兽医/.test(wanted)?26:wanted==='护士'?21:/经理|主管|店长|经营者|主任|院长/.test(wanted)?24:18;
   const person=adults.find(r=>remaining.has(r.id)&&r.identity!.age>=minimum&&wanted&&r.job===wanted)||adults.find(r=>remaining.has(r.id)&&r.identity!.age>=minimum);
   if(!person)break;
   remaining.delete(person.id);b.staffIds.push(person.id);
   if(wanted)person.job=wanted;
   person.identity!.occupation=person.job;person.identity!.workplace=d.name;
   const varied=.85+(hash(person.id+'salary')%36)/100;
   person.wage=hourlyWageCents(monthlySalaryCents(person.job,person.identity!.age,true),varied);
   person.employment={placeId:d.id,name:d.name,entry:b.entry,monthlyGrossCents:person.wage*176,...(b.floor?{floor:b.floor}:{})};
   if(person.profile){person.profile.occupation=person.job;person.profile.sector=d.type;}
  }
  b.managerId=b.staffIds[0]||null;
  if(d.type==='restaurant')b.ownerId=b.managerId;
  const funding=['hospital','police','fire','detention','prison','school','water','wastewater','city-hall','court','ems','transport-authority'].includes(b.type)?0:Math.min(w.treasury,b.staffIds.reduce((n,id)=>n+(w.residents.find(r=>r.id===id)?.wage||0)*16,0));
  b.cash+=funding;w.treasury-=funding;
 }
 // Remaining professionals retain differentiated roles in office jobs, with no duplicate employment.
 const offices=Object.values(w.businesses).filter(b=>b.type==='office');
 for(const r of adults.filter(r=>remaining.has(r.id))){const b=offices[hash(r.id)%offices.length];b.staffIds.push(r.id);r.employment={placeId:b.id,name:b.name,entry:b.entry,monthlyGrossCents:r.wage*176};r.identity!.workplace=b.name;}
 // Preserve existing housing underwriting/loan terms when jobs change.
 w.commerceVersion=COMMERCE_VERSION;
}
export function openBusinesses(w:LifeWorld,types:string[]){const hour=(w.minute%1440)/60;return Object.values(w.businesses||{}).filter(b=>types.includes(b.type)&&b.staffIds.length>0&&(b.open<=b.close?hour>=b.open&&hour<b.close:hour>=b.open||hour<b.close));}
export function chooseBusiness(w:LifeWorld,r:Resident,types:string[],budget:number){
 const choices=openBusinesses(w,types).filter(b=>b.price<=budget).sort((a,b)=>Math.hypot(a.entry[0]-r.x,a.entry[1]-r.z)-Math.hypot(b.entry[0]-r.x,b.entry[1]-r.z));
 return choices[(hash(r.id+Math.floor(w.minute/1440))%Math.min(choices.length,5))];
}
