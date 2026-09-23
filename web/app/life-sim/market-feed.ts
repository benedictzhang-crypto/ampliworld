import type {LifeWorld} from './engine';
import {learnMarketOutcome} from './adaptive-policy';
import {addMood} from './wellbeing';

/** A quote is usable only after its recorded availability time. Prices are cents. */
export type MarketSnapshot={
  asOf:string;
  availableAt:string;
  source:string;
  quotes:Record<string,number>;
  delistedSymbols?:string[];
};
export type MarketState={latest:MarketSnapshot;previous?:MarketSnapshot;history:MarketSnapshot[]};

const utc=(value:unknown)=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)&&!Number.isNaN(Date.parse(value));

export function validateMarketSnapshot(value:unknown,now=new Date().toISOString()):MarketSnapshot{
  if(!value||typeof value!=='object')throw Error('Market snapshot must be an object');
  const row=value as Record<string,unknown>;
  if(!utc(row.asOf)||!utc(row.availableAt))throw Error('Market timestamps must be UTC ISO-8601');
  if(Date.parse(row.asOf as string)>Date.parse(row.availableAt as string))throw Error('Quote cannot be available before observation');
  if(Date.parse(row.availableAt as string)>Date.parse(now))throw Error('Future information is not available');
  if(typeof row.source!=='string'||!row.source.trim()||row.source.length>120)throw Error('Market source is required');
  if(!row.quotes||typeof row.quotes!=='object'||Array.isArray(row.quotes))throw Error('Quotes must be symbol-to-cents values');
  const quotes=row.quotes as Record<string,unknown>,symbols=Object.keys(quotes);
  if(!symbols.length||symbols.length>50)throw Error('Supply 1–50 quoted symbols');
  const delisted=row.delistedSymbols===undefined?[]:row.delistedSymbols;
  if(!Array.isArray(delisted)||delisted.some(symbol=>typeof symbol!=='string'||!symbols.includes(symbol))||new Set(delisted).size!==delisted.length)throw Error('Invalid delisting list');
  for(const symbol of symbols){
    if(!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol))throw Error(`Invalid symbol: ${symbol}`);
    if(!Number.isSafeInteger(quotes[symbol])||(quotes[symbol] as number)<0||((quotes[symbol] as number)===0&&!delisted.includes(symbol)))throw Error(`Invalid cent price: ${symbol}`);
  }
  return {asOf:row.asOf as string,availableAt:row.availableAt as string,source:row.source.trim(),quotes:quotes as Record<string,number>,...(delisted.length?{delistedSymbols:delisted as string[]}:{} )};
}

/** Monotone, append-only in world time; does not certify vendor point-in-time provenance. */
export function ingestMarketSnapshot(input:LifeWorld,value:unknown,now?:string):LifeWorld{
  const snapshot=validateMarketSnapshot(value,now);
  const prior=input.market?.latest;
  if(prior&&Date.parse(snapshot.asOf)<=Date.parse(prior.asOf))throw Error('Market observations must advance monotonically');
  if(prior&&Date.parse(snapshot.availableAt)<Date.parse(prior.availableAt))throw Error('Availability time cannot move backwards');
  if(prior)for(const symbol of Object.keys(prior.quotes)){
    if(!(symbol in snapshot.quotes))throw Error(`Missing prior symbol ${symbol}; include its price or explicit delisting at zero`);
    if(prior.quotes[symbol]===0&&snapshot.quotes[symbol]!==0)throw Error(`Delisted symbol ${symbol} cannot resume without a corporate-action record`);
  }
  const next=structuredClone(input);
  next.market={latest:snapshot,...(prior?{previous:prior}:{}),history:[...(input.market?.history||[]),snapshot].slice(-30)};
  if(prior)for(const resident of next.residents){
    let exposure=0;
    for(const [symbol,milliShares] of Object.entries(resident.holdings||{})){
      const old=prior.quotes[symbol],price=snapshot.quotes[symbol];
      if(old>0&&price!==undefined){
        exposure+=milliShares*(price-old)/1000;
        if(milliShares>0)learnMarketOutcome(resident,next.minute,symbol,price/old-1);
      }
    }
    if(exposure){
      const swing=Math.min(12,Math.abs(exposure)/Math.max(10000,resident.cash+resident.savings)*100);
      resident.stress=Math.max(0,Math.min(100,resident.stress+(exposure<0?swing:-swing*.4)));
      resident.happiness=Math.max(0,Math.min(100,resident.happiness+(exposure>0?swing*.1:-swing*.15)));
      addMood(resident,exposure>0?swing*.5:-swing*.6);
    }
  }
  next.revision++;
  return next;
}

export function quoteReturn(market:MarketState,symbol:string):number|null{
  const old=market.previous?.quotes[symbol],current=market.latest.quotes[symbol];
  return old&&current!==undefined?current/old-1:null;
}
