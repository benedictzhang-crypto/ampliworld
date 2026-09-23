import type {Resident} from './engine';

export type ExperienceKind='market'|'family'|'food'|'leisure'|'work';
export type Experience={minute:number;kind:ExperienceKind;outcome:number;detail:string};
export type AdaptivePolicy={
  version:1;
  trendPreference:number; // -1 contrarian, +1 momentum
  riskMultiplier:number;
  freshFoodAffinity:number;
  outingsAffinity:number;
  familySupport:number;
  workReliability:number;
  marketObservations:number;
  entryStyle?:Record<string,'momentum'|'contrarian'|'deliberative'>;
  experiences:Experience[];
};
const bound=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const blend=(old:number,signal:number,rate:number)=>old+(signal-old)*rate;

/** Compact, deterministic online state. This is a rule-based learner, not a trained world model. */
export function seedAdaptivePolicy(resident:Resident):AdaptivePolicy{
  const deliberative=resident.consumerPersona?.dimensions.decision_style==='Deliberative';
  return {
    version:1,
    trendPreference:resident.frugality>.6?-.55:deliberative? .25:.55,
    riskMultiplier:1,
    freshFoodAffinity:0,
    outingsAffinity:0,
    familySupport:0,
    workReliability:0,
    marketObservations:0,
    experiences:[],
  };
}
export function policyFor(resident:Resident):AdaptivePolicy{
  return resident.adaptivePolicy??(resident.adaptivePolicy=seedAdaptivePolicy(resident));
}
/** Outcome is observed after an event, never before it. A short bounded trace explains later choices. */
export function learnExperience(resident:Resident,minute:number,kind:ExperienceKind,outcome:number,detail:string):void{
  const policy=policyFor(resident),reward=bound(outcome,-1,1);
  if(kind==='food')policy.freshFoodAffinity=bound(blend(policy.freshFoodAffinity,reward,.12),-1,1);
  if(kind==='leisure')policy.outingsAffinity=bound(blend(policy.outingsAffinity,reward,.12),-1,1);
  if(kind==='family')policy.familySupport=bound(blend(policy.familySupport,reward,.18),-1,1);
  if(kind==='work')policy.workReliability=bound(blend(policy.workReliability,reward,.12),-1,1);
  policy.experiences.push({minute,kind,outcome:reward,detail:detail.slice(0,90)});
  if(policy.experiences.length>8)policy.experiences.shift();
}
export function learnMarketOutcome(resident:Resident,minute:number,symbol:string,returnPct:number):void{
  const policy=policyFor(resident);
  const style=policy.entryStyle?.[symbol];
  if(!style||!Number.isFinite(returnPct))return;
  const reward=bound(returnPct/.08,-1,1);
  const direction=style==='contrarian'?-1:1;
  // Require repeated observations to reverse an initial style; a single quote cannot do it.
  policy.trendPreference=bound(policy.trendPreference+direction*reward*.16,-1,1);
  policy.riskMultiplier=bound(policy.riskMultiplier+(reward<0?reward*.10:reward*.025),.4,1.1);
  policy.marketObservations++;
  learnExperience(resident,minute,'market',reward,`${symbol} ${(returnPct*100).toFixed(2)}% after ${style} entry`);
}
export function ageAdaptivePolicy(resident:Resident):void{
  const policy=policyFor(resident);
  policy.freshFoodAffinity*=.995;
  policy.outingsAffinity*=.995;
  policy.familySupport*=.99;
  policy.workReliability*=.995;
  policy.riskMultiplier=blend(policy.riskMultiplier,1,.005);
}
export function learnedMarketStyle(resident:Resident):'momentum'|'contrarian'|'deliberative'{
  const preference=policyFor(resident).trendPreference;
  return preference>.18?'momentum':preference<-.18?'contrarian':'deliberative';
}
