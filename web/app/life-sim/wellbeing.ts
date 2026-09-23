import type {Resident} from './engine';

export type WellbeingState={
  version:1;
  happinessSetpoint:number;
  stressSetpoint:number;
  mood:number;
  eventPressure:number;
  mentalHealth:number;
  mentalHealthSetpoint:number;
  financialSecuritySetpoint:number;
};
export type WellbeingScores={happiness:number;mood:number;stressManagement:number;mentalHealth:number;physicalHealth:number;financialSecurity:number};
const cap=(value:number)=>Math.max(0,Math.min(100,value));
// Internal synthetic neutral-day calibration, not population-survey estimates.
const ROUTINE_MOOD_BUFFER=10;
const ROUTINE_STRESS_LOAD=9;

/** Individual setpoints create population stability without fixing the population mean. */
export function wellbeingFor(resident:Resident):WellbeingState{
  if(resident.wellbeing?.mentalHealth!==undefined&&resident.wellbeing.financialSecuritySetpoint!==undefined)return resident.wellbeing;
  const mentalHealthSetpoint=cap(65+(resident.happiness-60)*.15-(resident.stress-33)*.2);
  if(resident.wellbeing){
    resident.wellbeing.mentalHealthSetpoint??=mentalHealthSetpoint;
    resident.wellbeing.mentalHealth??=mentalHealthSetpoint;
    resident.wellbeing.financialSecuritySetpoint??=financialSecurity(resident);
    return resident.wellbeing;
  }
  return resident.wellbeing={
    version:1,
    happinessSetpoint:resident.happiness,
    stressSetpoint:resident.stress,
    // Start near the routine-supported mood equilibrium; no aggregate clamp is applied later.
    mood:cap(resident.happiness+ROUTINE_MOOD_BUFFER),
    eventPressure:0,
    mentalHealth:mentalHealthSetpoint,
    mentalHealthSetpoint,
    financialSecuritySetpoint:financialSecurity(resident),
  };
}
export function addMood(resident:Resident,change:number):void{
  const state=wellbeingFor(resident);
  state.mood=cap(state.mood+change);
}
/** Each five-minute step: temporary joy fades; persistent circumstances may shift the equilibrium. */
export function updateWellbeing(resident:Resident):void{
  const state=wellbeingFor(resident);
  const needPressure=Math.max(0,35-resident.water)*.09+Math.max(0,35-resident.nutrition)*.09+Math.max(0,30-resident.energy)*.06;
  const stressTarget=cap(state.stressSetpoint+ROUTINE_STRESS_LOAD+state.eventPressure*.9+needPressure);
  resident.stress=cap(resident.stress+(stressTarget-resident.stress)*.002);
  const happinessTarget=cap(state.happinessSetpoint-state.eventPressure-Math.max(0,resident.stress-state.stressSetpoint)*.2);
  resident.happiness=cap(resident.happiness+(happinessTarget-resident.happiness)*.002);
  const moodTarget=cap(resident.happiness-Math.max(0,resident.stress-state.stressSetpoint)*.16);
  state.mood=cap(state.mood+(moodTarget-state.mood)*.004);
  const mentalTarget=cap(state.mentalHealthSetpoint-state.eventPressure*.6-Math.max(0,resident.stress-state.stressSetpoint)*.35+(resident.adaptivePolicy?.familySupport||0)*4+(financialSecurity(resident)-state.financialSecuritySetpoint)*.08+(resident.energy<25?-3:0));
  state.mentalHealth=cap(state.mentalHealth+(mentalTarget-state.mentalHealth)*.0007);
}
export function financialSecurity(resident:Resident):number{
  const monthlyIncome=resident.employment?.monthlyGrossCents||resident.wage*160;
  const monthlyNeeds=Math.max(100000,monthlyIncome*.65);
  const cashBuffer=Math.max(0,resident.cash+resident.savings)/monthlyNeeds;
  const debtLoad=Math.min(15,(resident.profile?.debt||0)/Math.max(100000,monthlyIncome*12)*2);
  return cap(20+80*cashBuffer/(cashBuffer+2)-debtLoad);
}
export function residentWellbeingScores(resident:Resident):WellbeingScores{
  return {happiness:resident.happiness,mood:resident.wellbeing?.mood??resident.happiness,stressManagement:100-resident.stress,mentalHealth:resident.wellbeing?.mentalHealth??65,physicalHealth:resident.health,financialSecurity:financialSecurity(resident)};
}
export function populationWellbeingScores(residents:Resident[]):WellbeingScores{
  const totals:WellbeingScores={happiness:0,mood:0,stressManagement:0,mentalHealth:0,physicalHealth:0,financialSecurity:0};
  if(!residents.length)return totals;
  for(const resident of residents){const scores=residentWellbeingScores(resident);for(const key of Object.keys(totals) as (keyof WellbeingScores)[])totals[key]+=scores[key];}
  for(const key of Object.keys(totals) as (keyof WellbeingScores)[])totals[key]/=residents.length;
  return totals;
}
export function ageWellbeing(resident:Resident):void{
  const state=wellbeingFor(resident);
  state.eventPressure*=.995;
  if(Math.abs(state.eventPressure)<.005)state.eventPressure=0;
}
/** Public news changes perceived conditions; vendor-level repricing is not yet modeled. */
export function applyPublicShock(resident:Resident,tone:'negative'|'positive'|'neutral',shockPct:number,sensitivity:number):void{
  if(tone==='neutral')return;
  const state=wellbeingFor(resident);
  const change=Math.min(10,shockPct*.16)*Math.max(.3,Math.min(1.5,sensitivity));
  state.eventPressure=Math.max(0,Math.min(20,state.eventPressure+(tone==='negative'?change:-change)));
  const immediate=tone==='negative'?-change:change;
  state.mood=cap(state.mood+immediate);
  resident.happiness=cap(resident.happiness+immediate*.35);
  resident.stress=cap(resident.stress-immediate*.55);
}
