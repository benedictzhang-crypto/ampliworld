import type {LifeWorld,Resident,WorldEvent} from './engine';
import {applyPublicShock} from './wellbeing';
import {learnExperience} from './adaptive-policy';

const hash=(value:string)=>{let h=2166136261;for(let i=0;i<value.length;i++)h=Math.imul(h^value.charCodeAt(i),16777619);return (h>>>0)/4294967296;};
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));

function interpret(text:string){
  const pct=Math.min(100,Math.max(1,Number(text.match(/(\d+(?:\.\d+)?)\s*%/)?.[1]||10)));
  const down=/(降价|下跌|减少|便宜|降薪|裁员|price cut|falls?|drops?|decrease|wage cut|job cuts?)/i.test(text);
  const up=/(涨价|上涨|增加|昂贵|price hike|rises?|jumps?|increase)/i.test(text);
  const householdCost=/(牛奶|汽油|燃油|房租|物价|食品|日用品|milk|gasoline|fuel|rent|inflation|cost of living|food prices?|consumer prices?)/i.test(text);
  const householdIncome=/(工资|薪水|收入|就业|失业|wages?|salar(?:y|ies)|income|jobs?|employment)/i.test(text);
  const subject=/(牛奶|milk)/i.test(text)?'milk':/(汽油|燃油|gasoline|fuel)/i.test(text)?'fuel':/(房租|rent)/i.test(text)?'rent':householdIncome?'income':householdCost?'daily goods':'society';
  const negative=/(战争|灾害|裁员|失业|疫情|停电|污染|war|disaster|layoffs?|unemployment|outbreak|power outage|pollution)/i.test(text);
  const positive=/(和平|就业增加|复苏|peace|new jobs|recovery)/i.test(text);
  const tone=negative||(householdCost&&up)||(householdIncome&&down)?'negative':positive||(householdCost&&down)||(householdIncome&&up)?'positive':'neutral';
  const direction=householdCost?(down?'down':up?'up':'neutral'):'neutral';
  return {subject,shockPct:pct,direction,tone} as const;
}

function decide(r:Resident,eventId:string,direction:'up'|'down'|'neutral',shock:number){
  const draw=hash(`${eventId}:${r.id}`),liquid=r.cash+r.savings,
    pressure=clamp(r.frugality*.55+(liquid<Math.max(1,r.wage)*30?.18:0)+shock/100*.42),
    capacity=clamp(liquid/Math.max(1,r.wage*120),0,1);
  let reaction:'reduce'|'maintain'|'increase'='maintain';
  if(direction==='up') reaction=draw<pressure?'reduce':draw>.94-capacity*.05?'increase':'maintain';
  else if(direction==='down') reaction=draw<clamp(.18+shock/100*.58+(1-r.frugality)*.15)?'increase':draw>.985?'reduce':'maintain';
  else reaction=draw<.08?'reduce':draw>.92?'increase':'maintain';
  const reason=reaction==='reduce'
    ?`Budget pressure and ${(r.frugality*100).toFixed(0)}% frugality favor substitution.`
    :reaction==='increase'?`Available liquidity supports advance or additional purchasing.`
    :`The price signal is not strong enough to change this household's routine.`;
  return {reaction,reason};
}

/** Applies one public-information shock to every resident without changing balances. */
export function applyWorldEvent(input:LifeWorld,text:string):LifeWorld{
  const next=structuredClone(input),parsed=interpret(text.trim()),id=`EVT-${input.revision+1}-${input.minute}`;
  const counts={reduce:0,maintain:0,increase:0},examples:WorldEvent['examples']=[];
  for(const resident of next.residents){
    const result=decide(resident,id,parsed.direction,parsed.shockPct);
    counts[result.reaction]++;
    resident.lastEventReaction={eventId:id,...result};
    const liquid=resident.cash+resident.savings;
    const sensitivity=.55+resident.frugality*.35+(liquid<Math.max(1,resident.wage)*30?.35:0)+(result.reaction==='reduce'?.15:0);
    applyPublicShock(resident,parsed.tone,parsed.shockPct,sensitivity);
    learnExperience(resident,input.minute,'news',parsed.tone==='negative'?-parsed.shockPct/100:parsed.tone==='positive'?parsed.shockPct/100:0,`${text.trim().slice(0,70)}; reaction ${result.reaction}`);
    resident.memory.push({minute:input.minute,text:`新闻：${text.trim().slice(0,90)}；反应：${result.reaction}`,cashDelta:0});
    if(resident.memory.length>32)resident.memory.shift();
    if(examples.length<12&&examples.filter(e=>e.reaction===result.reaction).length<4)examples.push({residentId:resident.id,...result});
  }
  const event:WorldEvent={id,text:text.trim(),minute:input.minute,...parsed,counts,examples};
  next.worldEvents=[...(next.worldEvents||[]),event].slice(-8);
  next.revision=input.revision+1;
  return next;
}
