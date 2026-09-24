import type {Action,LifeWorld,Resident} from './engine';
import {policyFor} from './adaptive-policy';
import {wellbeingFor} from './wellbeing';

export type AgentGoal='hydration'|'liquidity'|'health'|'nutrition'|'recovery'|'education'|'income'|'fresh-food'|'wellbeing'|'household-supply'|'portfolio'|'exploration';
export type AgentMetric='water'|'cash'|'health'|'nutrition'|'energy'|'mood'|'pantry'|'worked';
export type AgentOption={action:Action;goal:AgentGoal;score:number;reason:string};
export type AgentObservation={minute:number;cashCents:number;savingsCents:number;water:number;nutrition:number;energy:number;health:number;mood:number;stress:number;pantry:number;workedMinutes:number;eventPressure:number;lastEventId?:string;marketAsOf?:string};
export type AgentEpisode={
  source:'local-policy'|'model-proposal';
  observation:AgentObservation;
  goal:AgentGoal;
  action:Action;
  reason:string;
  alternatives:AgentOption[];
  expectation:{metric:AgentMetric;delta:number}|null;
  result?:{minute:number;metric:AgentMetric|null;actualDelta:number|null;forecastError:number|null;status:'met'|'missed'|'delayed'};
};
const round=(n:number)=>Math.round(n*100)/100;

/** Only information already visible to this resident enters the observation. */
export function observeResident(w:LifeWorld,r:Resident):AgentObservation{
  return {minute:w.minute,cashCents:r.cash,savingsCents:r.savings,water:r.water,nutrition:r.nutrition,
    energy:r.energy,health:r.health,mood:wellbeingFor(r).mood,stress:r.stress,pantry:r.profile?.pantry??0,workedMinutes:r.worked,
    eventPressure:wellbeingFor(r).eventPressure,lastEventId:r.lastEventReaction?.eventId,
    marketAsOf:w.market?.latest.asOf};
}

/** Feasible discretionary goals compete; safety, school and funded shifts stay hard constraints in engine.ts. */
export function rankDiscretionaryOptions(w:LifeWorld,r:Resident):AgentOption[]{
  const p=policyFor(r),o=observeResident(w,r),day=Math.floor(w.minute/1440),hour=(w.minute%1440)/60;
  const candidates:AgentOption[]=[{action:'home',goal:'recovery',score:25+o.stress*.24,reason:'Return home and preserve a cash buffer'}];
  const add=(action:Action,goal:AgentGoal,score:number,reason:string)=>candidates.push({action,goal,score:round(score),reason});
  if(r.lastFruitDay!==day&&r.nutrition<72+p.freshFoodAffinity*12&&r.cash>=900)
    add('fruit','fresh-food',45+(72-o.nutrition)*1.2+p.freshFoodAffinity*17-o.eventPressure*3,'Buy fresh food while nutrition is falling');
  if(r.happiness<48+p.outingsAffinity*7-p.familySupport*5)
    add('leisure','wellbeing',42+(50-r.happiness)*1.25+p.outingsAffinity*18-o.eventPressure*4,'Seek affordable relief from a low mood');
  const bread=w.foodPrices?.bread??350;
  if(r.profile&&r.profile.lastShopDay!==day&&r.cash>=2*bread&&r.cash+r.savings>=20*bread&&r.profile.pantry<2)
    add('shop','household-supply',55+(2-o.pantry)*9+o.eventPressure*3,'Replenish household essentials before the pantry empties');
  if((r.identity?.age??18)>=18&&r.risk*p.riskMultiplier>.55&&r.cash+r.savings>50000&&r.stress<78&&
    (w.market?r.lastTradeAsOf!==w.market.latest.asOf:r.lastTradeDay!==day))
    add('trade','portfolio',37+r.risk*26*p.riskMultiplier-o.stress*.24-o.eventPressure*4,'Search available market information within the risk budget');
  if(day%7>=5&&r.cash>25000+o.eventPressure*1200&&r.lastTripDay!==day)
    add('travel','exploration',36+(70-o.mood)*.35+p.outingsAffinity*14-o.eventPressure*5,'Use leisure time for a budgeted trip');
  if((r.identity?.age??18)>=18&&r.cash>12000&&r.lastBrowseDay!==day&&hour>=10&&hour<21&&Number(r.id.slice(1))%4===day%4)
    add('leisure','exploration',30+(r.consumerPersona?.personalCareInterest??0)*19+p.outingsAffinity*8,'Browse a local venue within the spending limit');
  return candidates.sort((a,b)=>b.score-a.score||a.action.localeCompare(b.action));
}

const goals:Record<Action,AgentGoal>={home:'recovery',drink:'hydration',eat:'nutrition',work:'income',rest:'recovery',hospital:'health',
  leisure:'wellbeing',travel:'exploration',bank:'liquidity',trade:'portfolio',shop:'household-supply',fruit:'fresh-food',study:'education'};
function forecast(action:Action,o:AgentObservation,r:Resident):AgentEpisode['expectation']{
  switch(action){
    case 'drink':return {metric:'water',delta:round(95-o.water)};
    case 'eat':return {metric:'nutrition',delta:round(90-o.nutrition)};
    case 'fruit':return {metric:'nutrition',delta:round(Math.min(12,100-o.nutrition))};
    case 'rest':return {metric:'energy',delta:round(Math.min(60,100-o.energy))};
    case 'hospital':return {metric:'health',delta:round((100-o.health)*.65)};
    case 'work':return {metric:'cash',delta:r.wage};
    case 'study':return {metric:'worked',delta:60};
    case 'shop':return {metric:'pantry',delta:2};
    case 'leisure':case 'travel':return {metric:'mood',delta:round(Math.min(8,100-o.mood))};
    case 'bank':return {metric:'cash',delta:o.cashCents<1800?Math.min(15000,o.savingsCents):-Math.max(0,o.cashCents-25000)};
    case 'home':return {metric:'energy',delta:1};
    case 'trade':return null; // Market return is observed only after later quotes, not at order placement.
  }
}
export function beginAgentEpisode(w:LifeWorld,r:Resident,action:Action,reason:string,alternatives:AgentOption[],source:AgentEpisode['source']):void{
  const observation=observeResident(w,r);
  r.agentEpisode={source,observation,goal:alternatives.find(a=>a.action===action)?.goal??goals[action],action,reason:reason.slice(0,220),
    alternatives:alternatives.slice(0,3),expectation:forecast(action,observation,r)};
}
export function reflectAgentEpisode(w:LifeWorld,r:Resident):void{
  const episode=r.agentEpisode;
  if(!episode||episode.result)return;
  const expectation=episode.expectation;
  if(!expectation){episode.result={minute:w.minute,metric:null,actualDelta:null,forecastError:null,status:'delayed'};return;}
  const o=episode.observation;
  const baseline:Record<AgentMetric,number>={water:o.water,cash:o.cashCents,health:o.health,nutrition:o.nutrition,
    energy:o.energy,mood:o.mood,pantry:o.pantry,worked:o.workedMinutes};
  const current:Record<AgentMetric,number>={water:r.water,cash:r.cash,health:r.health,nutrition:r.nutrition,
    energy:r.energy,mood:wellbeingFor(r).mood,pantry:r.profile?.pantry??0,worked:r.worked};
  const actual=round(current[expectation.metric]-baseline[expectation.metric]);
  const error=round(actual-expectation.delta);
  const tolerance=Math.max(expectation.metric==='cash'?100:1,Math.abs(expectation.delta)*.3);
  episode.result={minute:w.minute,metric:expectation.metric,actualDelta:actual,forecastError:error,
    status:Math.abs(error)<=tolerance?'met':'missed'};
}
