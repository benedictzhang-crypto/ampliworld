/** Deterministic, inspectable bootstrap policy. Not an LLM or calibrated human predictor. */
import { OCCUPATIONS, VENUES, profileAt, type CitizenProfile } from './society';
import {citizen,CENSUS_SIZE,CENSUS_VERSION} from './census';
import {crossingWait} from './traffic';
import {consumerPersona} from './persona-adapter';
import {bindResidency,type Dwelling,type Employment} from './residency';
import {initializeCommerce,chooseBusiness,COMMERCE_VERSION,type Business} from './commerce';
import {occupationFor} from './occupation-weights';
import type {Decision} from './deliberation';
import {expandRegionalServices} from './regional-services';
export type Action =
  | 'home'
  | 'drink'
  | 'eat'
  | 'work'
  | 'rest'
  | 'hospital'
  | 'leisure'
  | 'travel'
  | 'bank'
  | 'trade'
  | 'shop'
  | 'study';
export const FACILITIES = [
  { id: 'drink', label: '公共饮水点', x: -10, z: 10, color: '#53c4dc' },
  { id: 'eat', label: '商场餐饮服务', x: 0, z: -96, color: '#edb673' },
  { id: 'work', label: '社区工作中心', x: 10, z: -12, color: '#8cbcae' },
  { id: 'hospital', label: '社区医疗服务点', x: -10, z: -12, color: '#ee9393' },
  { id: 'leisure', label: '街心休闲区', x: 10, z: 12, color: '#d4a4de' },
  { id: 'travel', label: '体育公园出游点', x: 10, z: 100, color: '#87cba2' },
  { id: 'bank', label: '银行服务点', x: -10, z: 12, color: '#d8c989' },
  { id: 'trade', label: '虚拟证券服务点', x: 10, z: -10, color: '#86b2f0' },
] as const;
export type Resident = {
  plannedDecision?:Decision;
  businessId?:string;
  diningOut?:boolean;
  lastBrowseDay?:number;
  dwellingId?:string;
  employment?:Employment;
  journey?:{destination:[number,number];minutes:number};
  consumerPersona?:ReturnType<typeof consumerPersona>;
  travelSeconds?:number;
  crossingWaitSeconds?:number;
  identity?: ReturnType<typeof citizen>;
  bankAccountId?: string;
  profile?: CitizenProfile;
  id: string;
  name: string;
  job: string;
  cash: number;
  savings: number;
  shares: number;
  wage: number;
  risk: number;
  frugality: number;
  health: number;
  water: number;
  nutrition: number;
  energy: number;
  happiness: number;
  home: [number, number];
  x: number;
  z: number;
  action: Action;
  reason: string;
  remaining: number;
  route: [number, number][];
  worked: number;
  lastTradeDay: number;
  lastTripDay: number;
  memory: { minute: number; text: string; cashDelta: number }[];
};
export type LifeWorld = {
  regionalVersion?:number;
  deliberation?:{status:string;residentId?:string;model?:string;minute?:number};
  commerceVersion?:number;
  businesses?:Record<string,Business>;
  residencyVersion?:number;
  housing?:Record<string,Dwelling>;
  censusVersion?:string;
  socialEncounters?:{minute:number;a:string;b:string;text:string;topic:string;kind:string}[];
  societyVersion?: 1;
  venueStats?: Record<string, { visits: number; revenue: number }>;
  serviceHours?: Record<string, number>;
  schema: 1;
  minute: number;
  revision: number;
  residents: Resident[];
  treasury: number;
  openingMoney: number;
  lastOperation: string;
  source: 'synthetic-bootstrap';
  daily: {
    day: number;
    consumption: number;
    wages: number;
    clinicVisits: number;
    trades: number;
  }[];
};
const cap = (v: number) => Math.max(0, Math.min(100, v));
export const paperPrice = (minute: number) =>
  1000 + Math.round(Math.sin(Math.floor(minute / 1440) * 0.77) * 120);
export const moneyTotal = (w: LifeWorld) =>
  w.treasury + w.residents.reduce((n, r) => n + r.cash + r.savings, 0)+Object.values(w.businesses||{}).reduce((n,b)=>n+b.cash,0);
export function createLifeWorld(): LifeWorld {
  const jobs = OCCUPATIONS.map((o) => o.label);
  const residents = Array.from({ length: CENSUS_SIZE }, (_, i): Resident => {
    const sx = i % 2 ? 1 : -1,
      sz = Math.floor(i / 2) % 2 ? 1 : -1,
      home: [number, number] = [sx * (36 + (i % 6) * 3), sz * 19];
    const cash = 12000 + ((i * 913) % 54000),
      savings = 10000 + ((i * 1771) % 85000);
    return {
      profile: profileAt(i, cash + savings,CENSUS_SIZE),
      id: `R${String(i + 1).padStart(3, '0')}`,
      name: `居民 ${String(i + 1).padStart(3, '0')}`,
      job: jobs[i % jobs.length],
      cash,
      savings,
      shares: 0,
      wage: OCCUPATIONS[i % OCCUPATIONS.length].wage,
      risk: (i % 11) / 10,
      frugality: (i % 7) / 6,
      health: i % 13 === 0 ? 32 : 75 + (i % 20),
      water: 32 + (i % 50),
      nutrition: 30 + ((i * 3) % 50),
      energy: 45 + (i % 45),
      happiness: 35 + (i % 50),
      home,
      x: home[0],
      z: home[1],
      action: 'home',
      reason: '准备开始一天',
      remaining: 0,
      route: [],
      worked: 0,
      lastTradeDay: -1,
      lastTripDay: -1,
      memory: [],
    };
  });
  const w: LifeWorld = {
    schema: 1,
    minute: 480,
    revision: 0,
    residents,
    treasury: 1_000_000_000,
    openingMoney: 0,
    lastOperation: '',
    source: 'synthetic-bootstrap',
    daily: [{ day: 0, consumption: 0, wages: 0, clinicVisits: 0, trades: 0 }],
  };
  w.societyVersion = 1;
  w.venueStats = {};
  w.serviceHours = {};
  w.openingMoney = moneyTotal(w);
  attachIdentities(w);
  bindResidency(w);
  initializeCommerce(w);
  expandRegionalServices(w);
  for(const r of w.residents){r.x=r.home[0];r.z=r.home[1];}
  return w;
}
function attachIdentities(w:LifeWorld){
  w.residents.forEach((r)=>{
    const i=Number(r.id.slice(1))-1;
    r.identity??=citizen(i);
    if(w.commerceVersion!==COMMERCE_VERSION)r.identity.occupation=occupationFor(i,r.identity.age,r.identity.occupation);
    r.consumerPersona??=consumerPersona(i);
    r.bankAccountId??=`SIM-BANK-${r.id}`;
    r.name=r.identity.name;r.job=r.identity.occupation;
    const employed=!!r.identity.workplace;
    if(!employed){r.wage=0;if(r.action==='work'){r.action='home';r.remaining=0;r.route=[];}}
    else if(!r.wage)r.wage=2400;
    if(r.profile&&w.commerceVersion!==COMMERCE_VERSION){const known=OCCUPATIONS.find(o=>o.label===r.job);r.profile.occupation=r.identity.age<18||r.job==='大学生'?'student':known?.id||r.job;r.profile.sector=known?.sector||(employed?'社会职业':'非就业');}
    if(r.identity.age<18&&r.action==='trade'){r.action='home';r.remaining=0;r.route=[];}
  });
  w.censusVersion=CENSUS_VERSION;
}
export function upgradeLifeWorld(input: LifeWorld): LifeWorld {
  if (input.societyVersion === 1&&input.censusVersion===CENSUS_VERSION&&input.residencyVersion===1&&input.commerceVersion===COMMERCE_VERSION&&input.regionalVersion===1&&input.housing&&input.residents.every(r=>r.consumerPersona)) return input;
  const w = structuredClone(input),
    fresh = createLifeWorld();
  if(input.societyVersion!==1)for (let i = 0; i < w.residents.length; i++) {
    const r = w.residents[i],
      occupation = OCCUPATIONS[i % OCCUPATIONS.length];
    r.profile = profileAt(
      i,
      r.cash + r.savings + r.shares * paperPrice(w.minute),
    );
    r.job = occupation.label;
    r.wage = occupation.wage;
  }
  const existingIds=new Set(w.residents.map(r=>r.id));
  for (const r of fresh.residents.filter(r=>!existingIds.has(r.id))) {
    r.cash = Math.min(r.cash, Math.max(0, w.treasury));
    w.treasury -= r.cash;
    r.savings = Math.min(r.savings, Math.max(0, w.treasury));
    w.treasury -= r.savings;
    r.profile = profileAt(Number(r.id.slice(1))-1, r.cash + r.savings,CENSUS_SIZE);
    w.residents.push(r);
  }
  w.societyVersion = 1;
  w.venueStats ??= {};
  w.serviceHours ??= {};
  attachIdentities(w);
  bindResidency(w);
  initializeCommerce(w);
  expandRegionalServices(w);
  return w;
}
export const residentNetWorth = (r: Resident, minute: number) =>
  r.cash +
  r.savings +
  r.shares * paperPrice(minute) +
  (r.profile?.nonCashAssets || 0) -
  (r.profile?.debt || 0);
function remember(w: LifeWorld, r: Resident, text: string, cashDelta = 0) {
  r.memory.push({ minute: w.minute, text, cashDelta });
  if (r.memory.length > 32) r.memory.shift();
}
function choose(w: LifeWorld, r: Resident): [Action, string] {
  const hour = (w.minute % 1440) / 60,
    day = Math.floor(w.minute / 1440);
  if (r.water < 38) return ['drink', '口渴，寻找免费饮水点'];
  if (r.cash < 1800 && r.savings > 0)
    return ['bank', '生活现金不足，提取自己的存款'];
  if (r.health < 40)
    return [
      'hospital',
      r.cash >= 1800 ? '健康下降，预约基础诊疗' : '现金不足，申请基础救助诊疗',
    ];
  if (r.nutrition < 38)
    return [
      'eat',
      r.cash >= 800 ? '饥饿，根据预算选择餐食' : '现金不足，选择社区救助餐',
    ];
  if (r.energy < 25 || hour >= 22 || hour < 6)
    return ['rest', '疲劳或到达夜间，回家休息'];
  if (
    hour >= 9 &&
    hour < 15 &&
    r.worked < 360 &&
    day % 7 < 5 &&
    r.profile?.occupation === 'student'
  )
    return ['study', '前往学院学习，不把学生上课计作工资收入'];
  const employer=r.employment&&w.businesses?.[r.employment.placeId];
  const shiftStart=employer&&['hotel','hospital','police'].includes(employer.type)?(Number(r.id.slice(1))%3)*8:employer?.type==='restaurant'?11:9;
  if (hour >= shiftStart && hour < shiftStart+8 && r.worked < 480 && (day % 7 < 5||employer&&['hotel','hospital','police','restaurant','retail-shop'].includes(employer.type)) && r.wage > 0)
    return ['work', `${r.job}：在岗位完成一小时服务，完成后领取工资`];
  if (r.cash > 65000) return ['bank', '保留生活费，把多余现金存入银行'];
  if (r.happiness < 48)
    return [
      'leisure',
      r.cash >= 600 ? '需要放松，选择付费娱乐' : '选择免费的街心公园活动',
    ];
  if (
    r.profile &&
    r.profile.lastShopDay !== day &&
    r.cash > 10000 &&
    r.profile.pantry < 2
  )
    return ['shop', '检查家庭食品库存，根据预算采购生活必需品'];
  if ((r.identity?.age??18)>=18 && r.risk > 0.55 && r.cash > 30000 && r.lastTradeDay !== day)
    return ['trade', '生活费有余，按风险预算进行一次虚拟交易'];
  if (day % 7 >= 5 && r.cash > 25000 && r.lastTripDay !== day)
    return ['travel', '休息日有预算，安排一次短途出游'];
  if((r.identity?.age||0)>=18&&r.cash>12000&&r.lastBrowseDay!==day&&hour>=10&&hour<21&&Number(r.id.slice(1))%4===day%4)return ['leisure','有可支配预算，逛店或安排车辆服务'];
  return ['home', '回家补充精力，保留消费预算'];
}
// Explicit sidewalk waypoints in the detailed core. Cross-city navigation is not implied.
function routeTo(r: Resident, dest: [number, number]): [number, number][] {
  if (Math.hypot(r.x - dest[0], r.z - dest[1]) < 0.01) return [];
  const fromSide = r.x < 0 ? -10 : 10,
    toSide = dest[0] < 0 ? -10 : 10;
  return [
    [r.x, r.z < 0 ? -10 : 10],
    [fromSide, r.z < 0 ? -10 : 10],
    [fromSide, 0],
    [toSide, 0],
    [toSide, dest[1]],
    [...dest],
  ];
}
function start(w: LifeWorld, r: Resident) {
  const plan=r.plannedDecision&&r.plannedDecision.validUntil>=w.minute&&r.health>=40&&r.water>=38&&r.nutrition>=38?r.plannedDecision:undefined;
  delete r.plannedDecision;
  if(w.deliberation?.residentId===r.id&&w.deliberation.status==='proposed')w.deliberation.status=plan?'executing':'overridden-by-needs';
  const [action, reason] = plan?[plan.action,'自主决策 · '+plan.reason]:choose(w, r),
    f = FACILITIES.find((f) => f.id === action);
  let venueId = '';
  r.businessId=undefined;r.diningOut=false;
  if (action === 'eat' && (!r.profile?.pantry||((Number(r.id.slice(1))+Math.floor(w.minute/1440))%10)<(r.frugality>.5?3:6))) {
    const restaurant=chooseBusiness(w,r,['restaurant'],Math.max(0,Math.min(r.cash-1500,r.cash*.35)));
    if(restaurant){r.businessId=restaurant.id;r.diningOut=true;}
    const restaurants = VENUES.filter(
      (v) => v.kind === '餐饮' && v.price <= Math.min(r.cash, r.cash * 0.18),
    );
    venueId =
      (r.frugality > 0.5
        ? restaurants[0]
        : restaurants[
            (Number(r.id.slice(1)) + Math.floor(w.minute / 1440)) %
              Math.max(1, restaurants.length)
          ]
      )?.id || '';
  }
  if (action === 'shop')
    venueId = r.frugality > 0.5 ? 'market' : 'premium-market';
  if (action === 'study') venueId = 'school';
  if (action === 'hospital') venueId = 'clinic';
  if (action === 'work') {
    const job = r.profile?.occupation;
    venueId =
      job === 'police'
        ? 'precinct'
        : job === 'gardener' || job === 'cleaner'
          ? 'landscape'
          : job === 'doctor' || job === 'nurse'
            ? 'clinic'
            : job === 'teacher'
              ? 'school'
              : job === 'grocer'
                ? 'market'
                : job === 'chef'
                  ? 'bistro'
                  : job === 'retail'
                    ? 'clothing'
                    : '';
  }
  if(action==='hospital')r.businessId='SERVICE-clinic';
  if(action==='leisure'&&reason.includes('逛店')){r.businessId=chooseBusiness(w,r,(r.consumerPersona?.personalCareInterest||0)>.65?['salon']:Number(r.id.slice(1))%8===0?['auto']:['retail-shop'],r.cash-6000)?.id;r.lastBrowseDay=Math.floor(w.minute/1440);}
  if(action==='travel')r.businessId=chooseBusiness(w,r,['hotel'],Math.max(0,r.cash-15000))?.id;
  if(plan?.businessId){r.businessId=plan.businessId;r.diningOut=action==='eat';}
  if (r.profile) r.profile.venueId = venueId;
  const venue = VENUES.find((v) => v.id === venueId);
  r.action = action;
  const business=r.businessId?w.businesses?.[r.businessId]:undefined;
  r.reason = reason + (business?` · ${business.name}`:venue ? ` · ${venue.name}` : '');
  r.remaining =
    action === 'rest'
      ? 120
      : action === 'work' || action === 'study'
        ? 60
        : action === 'travel'
          ? 120
          : action === 'home'
            ? 30
            : 15;
  const homeMeal = action === 'eat' && !!r.profile?.pantry&&!r.diningOut;
  const destination:[number,number]=action==='work'&&r.employment?r.employment.entry:business?business.entry:homeMeal?r.home:venue?[venue.x,venue.z]:f?[f.x,f.z]:r.home;
  const distance=Math.hypot(destination[0]-r.x,destination[1]-r.z);
  // Outside the verified core footpath: timed, abstract transit, not a straight walk through buildings.
  if(distance>250||Math.abs(r.x)>140||Math.abs(r.z)>140||Math.abs(destination[0])>140||Math.abs(destination[1])>140){
    r.route=[];r.journey={destination,minutes:Math.max(5,Math.ceil(distance/400)+5)};
    r.reason+=' · 估算通勤（未连接逐段道路寻路）';
  }else r.route=routeTo(r,destination);
  remember(w, r, r.reason);
}
function complete(w: LifeWorld, r: Resident) {
  const log = w.daily.at(-1)!;
  const venue = VENUES.find((v) => v.id === r.profile?.venueId);
  const business=r.businessId?w.businesses?.[r.businessId]:undefined;
  const recordVisit = (revenue: number) => {
    if(business){business.visits++;business.todayVisits++;business.revenue+=revenue;business.todayRevenue+=revenue;}
    if (!venue) return;
    w.venueStats ??= {};
    const stats = (w.venueStats[venue.id] ??= { visits: 0, revenue: 0 });
    stats.visits++;
    stats.revenue += revenue;
  };
  const pay = (cents: number, description: string) => {
    const cost = Math.min(r.cash, cents);
    r.cash -= cost;
    if(business)business.cash+=cost;else w.treasury += cost;
    log.consumption += cost;
    remember(w, r, description, -cost);
    return cost;
  };
  switch (r.action) {
    case 'drink':
      r.water = 95;
      remember(w, r, '完成饮水（免费）');
      break;
    case 'eat':
      if (r.profile && r.profile.pantry > 0&&!r.diningOut) {
        r.profile.pantry--;
        remember(w, r, '在家使用已购食材做饭');
      } else {
        recordVisit(
          pay(
            business?.price||venue?.price || 0,
            business?`${business.name}用餐`:venue ? `${venue.name}用餐` : '领取社区救助餐',
          ),
        );
      }
      r.nutrition = 90;
      r.happiness = cap(r.happiness + 4);
      break;
    case 'shop': {
      const cost = venue?.price || 2400;
      if (r.cash >= cost) {
        recordVisit(pay(cost, '采购三份家庭餐食食材'));
        if (r.profile) r.profile.pantry += 3;
      }
      if (r.profile) r.profile.lastShopDay = Math.floor(w.minute / 1440);
      break;
    }
    case 'study':
      r.worked += 60;
      if (r.profile) r.profile.studyMinutes += 60;
      remember(w, r, '完成一小时学习，无工资支付');
      break;
    case 'work': {
      if((r.identity?.age??18)<18)break;
      const employer=r.employment&&w.businesses?.[r.employment.placeId];
      const publicEmployer=!!employer&&['hospital','police','school'].includes(employer.type);
      const wage = Math.min(employer&&!publicEmployer?employer.cash:w.treasury, r.wage);
      if(employer){if(publicEmployer)w.treasury-=wage;else employer.cash-=wage;employer.workedHours++;employer.unpaidWages+=r.wage-wage;}else w.treasury -= wage;
      r.cash += wage;
      r.worked += 60;
      log.wages += wage;
      r.energy = cap(r.energy - 5);
      w.serviceHours ??= {};
      const role = r.profile?.occupation || 'worker';
      w.serviceHours[role] = (w.serviceHours[role] || 0) + 1;
      remember(w, r, `${r.job}完成一小时工作，工资到账`, wage);
      break;
    }
    case 'rest':
      r.energy = cap(r.energy + 60);
      r.health = cap(r.health + 4);
      remember(w, r, '睡眠恢复精力');
      break;
    case 'home':
      r.energy = cap(r.energy + 15);
      r.happiness = cap(r.happiness + 2);
      break;
    case 'hospital':
      recordVisit(pay(r.cash >= 1800 ? 1800 : 0, '完成基础诊疗'));
      r.health = cap(r.health + 45);
      log.clinicVisits++;
      break;
    case 'leisure':
      recordVisit(pay(business?.price||(r.cash >= 600 ? 600 : 0), business?`${business.name}完成消费或服务`:'完成休闲活动'));
      r.happiness = cap(r.happiness + 30);
      break;
    case 'travel':
      recordVisit(pay(business?.price||2200, business?`${business.name}完成短住体验`:'完成短途公园出游（含交通）'));
      r.happiness = cap(r.happiness + 40);
      r.energy = cap(r.energy - 10);
      r.lastTripDay = Math.floor(w.minute / 1440);
      break;
    case 'bank': {
      const delta =
        r.cash < 1800
          ? Math.min(15000, r.savings)
          : -Math.max(0, r.cash - 25000);
      r.cash += delta;
      r.savings -= delta;
      remember(w, r, delta >= 0 ? '从个人存款取现' : '现金转入个人存款', delta);
      break;
    }
    case 'trade': {
      if((r.identity?.age??18)<18)break;
      const price = paperPrice(w.minute);
      if (r.shares > 0) {
        const proceeds = r.shares * price;
        if (w.treasury >= proceeds) {
          w.treasury -= proceeds;
          r.cash += proceeds;
          remember(w, r, '卖出虚拟指数份额', proceeds);
          r.shares = 0;
          log.trades++;
        }
      } else {
        const quantity = Math.floor(
          (Math.max(0, r.cash - 25000) * 0.15) / price,
        );
        if (quantity > 0) {
          const cost = quantity * price;
          r.cash -= cost;
          w.treasury += cost;
          r.shares += quantity;
          remember(w, r, '买入虚拟指数份额（保留生活费）', -cost);
          log.trades++;
        } else remember(w, r, '可投资预算不足一份，放弃交易');
      }
      r.lastTradeDay = Math.floor(w.minute / 1440);
      break;
    }
  }
}
export function advanceLifeWorld(input: LifeWorld, minutes: number): LifeWorld {
  if (![15, 60, 1440].includes(minutes)) throw new Error('Unsupported advance');
  const w = structuredClone(upgradeLifeWorld(input));
  for (let t = 0; t < minutes; t += 5) {
    const previousDay = Math.floor(w.minute / 1440);
    w.minute += 5;
    if (Math.floor(w.minute / 1440) !== previousDay) {
      for(const b of Object.values(w.businesses||{})){b.day=previousDay+1;b.todayVisits=0;b.todayRevenue=0;}
      w.residents.forEach((r) => (r.worked = 0));
      w.daily.push({
        day: previousDay + 1,
        consumption: 0,
        wages: 0,
        clinicVisits: 0,
        trades: 0,
      });
      if (w.daily.length > 31) w.daily.shift();
    }
    for (const r of w.residents) {
      r.water = cap(r.water - 0.32);
      r.nutrition = cap(r.nutrition - 0.48);
      r.energy = cap(r.energy - 0.13);
      r.happiness = cap(r.happiness - 0.045);
      if (r.water < 12 || r.nutrition < 12) r.health = cap(r.health - 0.12);
      if (!r.remaining) start(w, r);
      if(r.journey){r.journey.minutes=Math.max(0,r.journey.minutes-5);r.travelSeconds=(r.travelSeconds||0)+300;if(!r.journey.minutes){[r.x,r.z]=r.journey.destination;r.journey=undefined;}continue;}
      let walkBudget = 1.25 * 300;
      while (r.route.length && walkBudget > 0) {
        const target = r.route[0],
          dx = target[0] - r.x,
          dz = target[1] - r.z,
          d = Math.hypot(dx, dz),
          crossing=Math.abs(r.z)<.01&&Math.abs(target[1])<.01&&r.x*target[0]<0,
          wait=crossing?crossingWait((w.minute-5)*60+(375-walkBudget)/1.25,d):0;
        if(wait>0){const spent=Math.min(wait,walkBudget/1.25);walkBudget-=spent*1.25;r.crossingWaitSeconds=(r.crossingWaitSeconds||0)+spent;r.travelSeconds=(r.travelSeconds||0)+spent;if(walkBudget<=0)break;}
        const step=Math.min(d,walkBudget);
        if (d > 0.001) {
          r.x += (dx / d) * step;
          r.z += (dz / d) * step;
        }
        walkBudget -= step;
        r.travelSeconds=(r.travelSeconds||0)+step/1.25;
        if (d <= step + 0.001) r.route.shift();
      }
      if (!r.route.length) {
        r.remaining = Math.max(0, r.remaining - walkBudget / 75);
        if (!r.remaining) complete(w, r);
      }
    }
  }
  // Conversations only involve persisted residents who actually share a location.
  const a=w.residents[Math.floor(w.minute/15)%w.residents.length];
  const b=w.residents.find(r=>r.id!==a.id&&Math.hypot(r.x-a.x,r.z-a.z)<3);
  if(b){const text=(a.identity?.age??18)<18||(b.identity?.age??18)<18?'今天学校和生活过得怎么样？':'今天过得怎么样？一起聊聊附近的生活。';
    w.socialEncounters=[...(w.socialEncounters||[]),{minute:w.minute,a:a.id,b:b.id,text,topic:'附近居民交流',kind:'规则模板交谈'}].slice(-50);
    remember(w,a,`与${b.name}交谈：${text}`);remember(w,b,`与${a.name}交谈：${text}`);}
  w.revision++;
  return w;
}
