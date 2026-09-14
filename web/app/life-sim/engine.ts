/** Deterministic, inspectable bootstrap policy. Not an LLM or calibrated human predictor. */
export type Action = 'home'|'drink'|'eat'|'work'|'rest'|'hospital'|'leisure'|'travel'|'bank'|'trade';
export const FACILITIES = [
  {id:'drink',label:'公共饮水点',x:-10,z:10,color:'#53c4dc'},
  {id:'eat',label:'商场餐饮服务',x:0,z:-96,color:'#edb673'},
  {id:'work',label:'社区工作中心',x:10,z:-12,color:'#8cbcae'},
  {id:'hospital',label:'社区医疗服务点',x:-10,z:-12,color:'#ee9393'},
  {id:'leisure',label:'街心休闲区',x:10,z:12,color:'#d4a4de'},
  {id:'travel',label:'体育公园出游点',x:10,z:100,color:'#87cba2'},
  {id:'bank',label:'银行服务点',x:-10,z:12,color:'#d8c989'},
  {id:'trade',label:'虚拟证券服务点',x:10,z:-10,color:'#86b2f0'},
] as const;
export type Resident={id:string;name:string;job:string;cash:number;savings:number;shares:number;wage:number;risk:number;frugality:number;health:number;water:number;nutrition:number;energy:number;happiness:number;home:[number,number];x:number;z:number;action:Action;reason:string;remaining:number;route:[number,number][];worked:number;lastTradeDay:number;lastTripDay:number;memory:{minute:number;text:string;cashDelta:number}[]};
export type LifeWorld={schema:1;minute:number;revision:number;residents:Resident[];treasury:number;openingMoney:number;lastOperation:string;source:'synthetic-bootstrap';daily:{day:number;consumption:number;wages:number;clinicVisits:number;trades:number}[]};
const cap=(v:number)=>Math.max(0,Math.min(100,v));
export const paperPrice=(minute:number)=>1000+Math.round(Math.sin(Math.floor(minute/1440)*.77)*120);
export const moneyTotal=(w:LifeWorld)=>w.treasury+w.residents.reduce((n,r)=>n+r.cash+r.savings,0);
export function createLifeWorld():LifeWorld{
  const jobs=['零售店员','设计师','维修技师','餐饮员工','软件工程师','办公室职员'];
  const residents=Array.from({length:48},(_,i):Resident=>{
    const sx=i%2?1:-1,sz=Math.floor(i/2)%2?1:-1,home:[number,number]=[sx*(36+(i%6)*3),sz*19];
    return {id:`R${String(i+1).padStart(3,'0')}`,name:`居民 ${String(i+1).padStart(3,'0')}`,job:jobs[i%6],cash:12000+(i*913)%54000,savings:10000+(i*1771)%85000,shares:0,wage:1400+(i%6)*500,risk:(i%11)/10,frugality:(i%7)/6,health:i%13===0?32:75+i%20,water:32+i%50,nutrition:30+(i*3)%50,energy:45+i%45,happiness:35+i%50,home,x:home[0],z:home[1],action:'home',reason:'准备开始一天',remaining:0,route:[],worked:0,lastTradeDay:-1,lastTripDay:-1,memory:[]};
  });
  const w:LifeWorld={schema:1,minute:480,revision:0,residents,treasury:1_000_000_000,openingMoney:0,lastOperation:'',source:'synthetic-bootstrap',daily:[{day:0,consumption:0,wages:0,clinicVisits:0,trades:0}]};
  w.openingMoney=moneyTotal(w);return w;
}
function remember(w:LifeWorld,r:Resident,text:string,cashDelta=0){r.memory.push({minute:w.minute,text,cashDelta});if(r.memory.length>32)r.memory.shift();}
function choose(w:LifeWorld,r:Resident):[Action,string]{
  const hour=(w.minute%1440)/60,day=Math.floor(w.minute/1440);
  if(r.water<38)return ['drink','口渴，寻找免费饮水点'];
  if(r.cash<1800&&r.savings>0)return ['bank','生活现金不足，提取自己的存款'];
  if(r.health<40)return ['hospital',r.cash>=1800?'健康下降，预约基础诊疗':'现金不足，申请基础救助诊疗'];
  if(r.nutrition<38)return ['eat',r.cash>=800?'饥饿，根据预算选择餐食':'现金不足，选择社区救助餐'];
  if(r.energy<25||hour>=22||hour<6)return ['rest','疲劳或到达夜间，回家休息'];
  if(hour>=9&&hour<17&&r.worked<480&&day%7<5)return ['work','在工作时段完成一小时工作，完成后领取工资'];
  if(r.cash>65000)return ['bank','保留生活费，把多余现金存入银行'];
  if(r.happiness<48)return ['leisure',r.cash>=600?'需要放松，选择付费娱乐':'选择免费的街心公园活动'];
  if(r.risk>.55&&r.cash>30000&&r.lastTradeDay!==day)return ['trade','生活费有余，按风险预算进行一次虚拟交易'];
  if(day%7>=5&&r.cash>25000&&r.lastTripDay!==day)return ['travel','休息日有预算，安排一次短途出游'];
  return ['home','回家补充精力，保留消费预算'];
}
// Explicit sidewalk waypoints in the detailed core. Cross-city navigation is not implied.
function routeTo(r:Resident,dest:[number,number]):[number,number][]{
  if(Math.hypot(r.x-dest[0],r.z-dest[1])<.01)return [];
  const fromSide=r.x<0?-10:10,toSide=dest[0]<0?-10:10;
  return [[r.x,r.z<0?-10:10],[fromSide,r.z<0?-10:10],[fromSide,0],[toSide,0],[toSide,dest[1]],[...dest]];
}
function start(w:LifeWorld,r:Resident){
  const [action,reason]=choose(w,r),f=FACILITIES.find(f=>f.id===action);
  r.action=action;r.reason=reason;r.remaining=action==='rest'?120:action==='work'?60:action==='travel'?120:action==='home'?30:15;
  r.route=routeTo(r,f?[f.x,f.z]:r.home);remember(w,r,reason);
}
function complete(w:LifeWorld,r:Resident){
  const log=w.daily.at(-1)!;
  const pay=(cents:number,description:string)=>{
    const cost=Math.min(r.cash,cents);r.cash-=cost;w.treasury+=cost;log.consumption+=cost;remember(w,r,description,-cost);return cost;
  };
  switch(r.action){
    case 'drink':r.water=95;remember(w,r,'完成饮水（免费）');break;
    case 'eat':pay(r.cash<800?0:r.frugality>.5?800:1400,r.cash<800?'领取救助餐':'购买一份餐食');r.nutrition=90;r.happiness=cap(r.happiness+4);break;
    case 'work':{const wage=Math.min(w.treasury,r.wage);w.treasury-=wage;r.cash+=wage;r.worked+=60;log.wages+=wage;r.energy=cap(r.energy-5);remember(w,r,'完成一小时工作，工资到账',wage);break;}
    case 'rest':r.energy=cap(r.energy+60);r.health=cap(r.health+4);remember(w,r,'睡眠恢复精力');break;
    case 'home':r.energy=cap(r.energy+15);r.happiness=cap(r.happiness+2);break;
    case 'hospital':pay(r.cash>=1800?1800:0,'完成基础诊疗');r.health=cap(r.health+45);log.clinicVisits++;break;
    case 'leisure':pay(r.cash>=600?600:0,'完成休闲活动');r.happiness=cap(r.happiness+30);break;
    case 'travel':pay(2200,'完成短途公园出游（含交通）');r.happiness=cap(r.happiness+40);r.energy=cap(r.energy-10);r.lastTripDay=Math.floor(w.minute/1440);break;
    case 'bank':{const delta=r.cash<1800?Math.min(15000,r.savings):-Math.max(0,r.cash-25000);r.cash+=delta;r.savings-=delta;remember(w,r,delta>=0?'从个人存款取现':'现金转入个人存款',delta);break;}
    case 'trade':{
      const price=paperPrice(w.minute);
      if(r.shares>0){const proceeds=r.shares*price;if(w.treasury>=proceeds){w.treasury-=proceeds;r.cash+=proceeds;remember(w,r,'卖出虚拟指数份额',proceeds);r.shares=0;log.trades++;}}
      else{const quantity=Math.floor(Math.max(0,r.cash-25000)*.15/price);if(quantity>0){const cost=quantity*price;r.cash-=cost;w.treasury+=cost;r.shares+=quantity;remember(w,r,'买入虚拟指数份额（保留生活费）',-cost);log.trades++;}else remember(w,r,'可投资预算不足一份，放弃交易');}
      r.lastTradeDay=Math.floor(w.minute/1440);break;
    }
  }
}
export function advanceLifeWorld(input:LifeWorld,minutes:number):LifeWorld{
  if(![15,60,1440].includes(minutes))throw new Error('Unsupported advance');
  const w=structuredClone(input);
  for(let t=0;t<minutes;t+=5){
    const previousDay=Math.floor(w.minute/1440);w.minute+=5;
    if(Math.floor(w.minute/1440)!==previousDay){w.residents.forEach(r=>r.worked=0);w.daily.push({day:previousDay+1,consumption:0,wages:0,clinicVisits:0,trades:0});if(w.daily.length>31)w.daily.shift();}
    for(const r of w.residents){
      r.water=cap(r.water-.32);r.nutrition=cap(r.nutrition-.23);r.energy=cap(r.energy-.13);r.happiness=cap(r.happiness-.045);
      if(r.water<12||r.nutrition<12)r.health=cap(r.health-.12);
      if(!r.remaining)start(w,r);
      let walkBudget=1.25*300;
      while(r.route.length&&walkBudget>0){const target=r.route[0],dx=target[0]-r.x,dz=target[1]-r.z,d=Math.hypot(dx,dz),step=Math.min(d,walkBudget);if(d>.001){r.x+=dx/d*step;r.z+=dz/d*step;}walkBudget-=step;if(d<=step+.001)r.route.shift();}
      if(!r.route.length){r.remaining=Math.max(0,r.remaining-walkBudget/75);if(!r.remaining)complete(w,r);}
    }
  }
  w.revision++;return w;
}
