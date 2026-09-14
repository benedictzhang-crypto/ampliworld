import type {LifeWorld} from './engine';
import type {Business} from './commerce';
export const REGIONAL_SERVICES=[
 {id:'GC-NAILS-01',name:'青庭 Nail Atelier',type:'salon',x:-1100,z:1000,price:4500,staff:3},
 {id:'GC-NAILS-02',name:'东城 Luma Nails',type:'salon',x:5350,z:3350,price:6800,staff:4},
 {id:'GC-NAILS-03',name:'河西 Willow Nails',type:'salon',x:-1350,z:8350,price:3800,staff:3},
 {id:'GC-SC-DINE-01',name:'东城 Olive Terrace',type:'restaurant',x:5300,z:3400,price:2200,staff:6},
 {id:'GC-SC-DINE-02',name:'河西 Bronze Garden',type:'restaurant',x:-1300,z:8400,price:1800,staff:5},
] as const;
const TENANTS=['Vector 数据研究','Fold 建筑设计','Prism 软件工作室','Tidal 城市咨询','Harbor 供应链','Beacon 创意传媒'];
export function expandRegionalServices(w:LifeWorld){
 if(w.regionalVersion===1||!w.businesses)return;
 const offices=Object.values(w.businesses).filter(b=>b.type==='office');
 for(const [i,b] of offices.filter(b=>b.id.startsWith('SC')).entries()){b.name+=` · ${TENANTS[i]}（虚构入驻公司）`;for(const id of b.staffIds){const r=w.residents.find(r=>r.id===id)!;r.employment!.name=b.name;r.identity!.workplace=b.name;}}
 for(const p of REGIONAL_SERVICES){
  const b:Business={id:p.id,name:p.name,type:p.type,entry:[p.x,p.z+10],staffIds:[],managerId:null,ownerId:null,price:p.price,open:9,close:21,cash:0,visits:0,revenue:0,workedHours:0,day:Math.floor(w.minute/1440),todayVisits:0,todayRevenue:0,unpaidWages:0};
  for(let i=0;i<p.staff;i++){const donor=offices.slice().sort((a,b)=>b.staffIds.length-a.staffIds.length)[0];if(!donor||donor.staffIds.length<10)break;const id=donor.staffIds.pop()!,r=w.residents.find(r=>r.id===id)!;b.staffIds.push(id);r.job=p.type==='salon'?(i===0?'美甲店经营者':'美甲师'):(i===0?'餐厅经营者':i%2?'厨师':'服务员');r.identity!.occupation=r.job;r.identity!.workplace=p.name;r.employment={placeId:p.id,name:p.name,entry:b.entry,monthlyGrossCents:r.wage*176};if(r.profile){r.profile.occupation=r.job;r.profile.sector=p.type;}}
  b.managerId=b.ownerId=b.staffIds[0]||null;const funding=Math.min(w.treasury,b.staffIds.length*50000);w.treasury-=funding;b.cash=funding;w.businesses[b.id]=b;
 }
 w.regionalVersion=1;
}
