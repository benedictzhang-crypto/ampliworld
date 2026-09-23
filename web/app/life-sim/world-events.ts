import type {LifeWorld,Resident,WorldEvent} from './engine';
import {applyPublicShock} from './wellbeing';
import {learnExperience} from './adaptive-policy';
import {BASE_FOOD_PRICES,residentFoodBasket,type FoodGood,type FoodPrices} from './food-choice';

const hash=(value:string)=>{let h=2166136261;for(let i=0;i<value.length;i++)h=Math.imul(h^value.charCodeAt(i),16777619);return (h>>>0)/4294967296;};
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));

function interpret(text:string){
  const pct=Math.min(100,Math.max(1,Number(text.match(/(\d+(?:\.\d+)?)\s*%/)?.[1]||10)));
  const down=/(降价|下跌|减少|便宜|降薪|裁员|price cut|falls?|drops?|decrease|wage cut|job cuts?)/i.test(text);
  const up=/(涨价|上涨|增加|昂贵|price hike|rises?|jumps?|increase)/i.test(text);
  const householdCost=/(牛奶|面包|小麦|汽油|燃油|房租|物价|食品|日用品|milk|bread|wheat|gasoline|fuel|rent|inflation|cost of living|food prices?|consumer prices?)/i.test(text);
  const householdIncome=/(工资|薪水|收入|就业|失业|wages?|salar(?:y|ies)|income|jobs?|employment)/i.test(text);
  const transferRequested=/(现金补助|发钱|cash transfer|income transfer)/i.test(text);
  const targetedToPoor=/(低收入|贫困|穷人|low-income|lowest-wealth|poor residents|poor households)/i.test(text);
  if(transferRequested&&householdCost&&(up||down))throw new Error('Run the transfer and price change as separate interventions');
  if(transferRequested&&!targetedToPoor)throw new Error('Specify low-income residents for the cash-transfer scenario');
  const transferMatch=transferRequested&&targetedToPoor?text.match(/(?:现金补助|发钱|cash transfer|income transfer)[^\d$]*(?:\$|USD\s*)?(\d+(?:\.\d{1,2})?)\s*(?:美元|美金|dollars?)?/i):null;
  const transferCents=transferMatch?Math.round(Number(transferMatch[1])*100):0;
  if(transferRequested&&(!transferCents||transferCents>100_000))throw new Error('Cash transfer must specify $0.01–$1,000 per eligible resident');
  const subject=transferCents?'cash transfer':/(面包|小麦|bread|wheat)/i.test(text)?'bread':/(牛奶|milk)/i.test(text)?'milk':/(汽油|燃油|gasoline|fuel)/i.test(text)?'fuel':/(房租|rent)/i.test(text)?'rent':householdIncome?'income':householdCost?'daily goods':'society';
  const negative=/(战争|灾害|裁员|失业|疫情|停电|污染|war|disaster|layoffs?|unemployment|outbreak|power outage|pollution)/i.test(text);
  const positive=/(和平|就业增加|复苏|peace|new jobs|recovery)/i.test(text);
  const tone=negative||(householdCost&&up)||(householdIncome&&down)?'negative':transferCents||positive||(householdCost&&down)||(householdIncome&&up)?'positive':'neutral';
  const direction=householdCost?(down?'down':up?'up':'neutral'):'neutral';
  return {subject,shockPct:pct,direction,tone,transferCents} as const;
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

/** Applies a news scenario; explicit funded transfers are the only cash-moving case. */
export function applyWorldEvent(input:LifeWorld,text:string):LifeWorld{
  const next=structuredClone(input),parsed=interpret(text.trim()),id=`EVT-${input.revision+1}-${input.minute}`;
  const counts={reduce:0,maintain:0,increase:0},examples:WorldEvent['examples']=[];
  const previousPrices:FoodPrices={...BASE_FOOD_PRICES,...input.foodPrices};
  const currentPrices:FoodPrices={...previousPrices};
  if(parsed.subject==='bread'&&parsed.direction!=='neutral'){
    const factor=parsed.direction==='up'?1+parsed.shockPct/100:1-parsed.shockPct/100;
    currentPrices.bread=Math.max(1,Math.round(previousPrices.bread*factor));
    next.foodPrices=currentPrices;
  }
  const recipients=parsed.transferCents?next.residents.filter(r=>r.profile?.cohort==='bottom50'):[];
  const totalTransfer=recipients.length*parsed.transferCents;
  if(totalTransfer>next.treasury)throw new Error('Public account cannot fund this cash-transfer scenario');
  if(totalTransfer){
    for(const resident of recipients){resident.cash+=parsed.transferCents;resident.memory.push({minute:input.minute,text:'收到低收入现金补助',cashDelta:parsed.transferCents});if(resident.memory.length>32)resident.memory.shift();}
    next.treasury-=totalTransfer;
  }
  const foodForecast:WorldEvent['foodForecast']=parsed.subject==='bread'||parsed.transferCents?{
    bread:{increase:0,maintain:0,reduce:0},protein:{increase:0,maintain:0,reduce:0},sugar:{increase:0,maintain:0,reduce:0},fruit:{increase:0,maintain:0,reduce:0},
  }:undefined;
  for(let index=0;index<next.residents.length;index++){
    const resident=next.residents[index];
    const before=foodForecast?residentFoodBasket(input.residents[index],previousPrices):undefined;
    const after=foodForecast?residentFoodBasket(resident,currentPrices):undefined;
    if(before&&after&&foodForecast)for(const good of Object.keys(foodForecast) as FoodGood[]){
      foodForecast[good][after[good]>before[good]?'increase':after[good]<before[good]?'reduce':'maintain']++;
    }
    const result=parsed.subject==='bread'&&before&&after?{
      reaction:(after.bread>before.bread?'increase':after.bread<before.bread?'reduce':'maintain') as 'increase'|'reduce'|'maintain',
      reason:after.bread>before.bread?'Subsistence budget displaced protein with more staple food.':after.bread===before.bread?'Staple need kept planned bread quantity unchanged.':'The household can substitute away from bread.',
    }:parsed.transferCents&&before&&after?{
      reaction:(after.sugar+after.protein+after.fruit>before.sugar+before.protein+before.fruit?'increase':'maintain') as 'increase'|'maintain',
      reason:resident.profile?.cohort==='bottom50'?'A funded transfer changed the feasible food basket according to this resident\'s budget and preferences.':'This resident did not receive the targeted transfer.',
    }:decide(resident,id,parsed.direction,parsed.shockPct);
    counts[result.reaction]++;
    resident.lastEventReaction={eventId:id,...result};
    const liquid=resident.cash+resident.savings;
    const sensitivity=.55+resident.frugality*.35+(liquid<Math.max(1,resident.wage)*30?.35:0)+(result.reaction==='reduce'?.15:0);
    const affectedByTransfer=!parsed.transferCents||resident.profile?.cohort==='bottom50';
    applyPublicShock(resident,affectedByTransfer?parsed.tone:'neutral',parsed.shockPct,sensitivity);
    learnExperience(resident,input.minute,'news',affectedByTransfer?(parsed.tone==='negative'?-parsed.shockPct/100:parsed.tone==='positive'?parsed.shockPct/100:0):0,`${text.trim().slice(0,70)}; reaction ${result.reaction}`);
    resident.memory.push({minute:input.minute,text:`新闻：${text.trim().slice(0,90)}；反应：${result.reaction}`,cashDelta:0});
    if(resident.memory.length>32)resident.memory.shift();
    if(examples.length<12&&examples.filter(e=>e.reaction===result.reaction).length<4)examples.push({residentId:resident.id,...result});
  }
  const {transferCents:_,...eventFields}=parsed;
  const event:WorldEvent={id,text:text.trim(),minute:input.minute,...eventFields,counts,examples,...(totalTransfer?{transferredCents:totalTransfer,transferEligibility:'bottom-wealth-50' as const}:{}),...(foodForecast?{foodForecast}:{})};
  next.worldEvents=[...(next.worldEvents||[]),event].slice(-8);
  next.revision=input.revision+1;
  return next;
}
