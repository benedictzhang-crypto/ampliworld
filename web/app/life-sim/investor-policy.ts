import type {Resident} from './engine';
import {quoteReturn,type MarketState} from './market-feed';
import {learnedMarketStyle,policyFor} from './adaptive-policy';

export type StockSearch={symbol:string;side:'buy'|'sell'|'hold';score:number;uncertainty:number;reason:string;style?:'momentum'|'contrarian'|'deliberative'};

/** Searches every available symbol. This is an interpretable heuristic baseline, not alpha. */
export function searchStockOpportunity(resident:Resident,market:MarketState):StockSearch{
  const style=learnedMarketStyle(resident),policy=policyFor(resident);
  const candidates=Object.keys(market.latest.quotes).sort().map(symbol=>{
    const price=market.latest.quotes[symbol],recent=quoteReturn(market,symbol);
    const history=market.history.slice(-8).map(row=>row.quotes[symbol]).filter((price):price is number=>price!==undefined&&price>0);
    const returns=history.slice(1).map((price,index)=>price/history[index]-1);
    const mean=returns.reduce((sum,value)=>sum+value,0)/Math.max(1,returns.length);
    const volatility=Math.sqrt(returns.reduce((sum,value)=>sum+(value-mean)**2,0)/Math.max(1,returns.length))+.01;
    const held=resident.holdings?.[symbol]||0;
    if(price===0)return {symbol,side:'hold' as const,score:-Infinity,uncertainty:volatility,reason:'Delisted: no executable quote'};
    if(recent===null)return {symbol,side:'hold' as const,score:-Infinity,uncertainty:volatility,reason:'No previous observation'};
    const direction=style==='contrarian'?-1:1;
    const disconfirmed=style==='deliberative'&&returns.length>=2&&Math.sign(returns.at(-1)!)!==Math.sign(returns.at(-2)!);
    const score=disconfirmed?0:direction*recent/(.02+volatility)*(.65+.35*resident.risk)*policy.riskMultiplier-resident.stress/300;
    if(held>0&&recent<-.005)return {symbol,side:'sell' as const,score:Math.abs(recent)/volatility,uncertainty:volatility,reason:`Held position fell ${(recent*100).toFixed(1)}%; reduce risk`};
    return {symbol,side:score>.2?'buy' as const:'hold' as const,score,uncertainty:volatility,style,reason:`${style} scan: recent ${(recent*100).toFixed(1)}%, volatility ${(volatility*100).toFixed(1)}%, stress ${resident.stress.toFixed(0)}, learned from ${policy.marketObservations} outcomes`};
  });
  const sells=candidates.filter(candidate=>candidate.side==='sell').sort((a,b)=>b.score-a.score);
  const buys=candidates.filter(candidate=>candidate.side==='buy').sort((a,b)=>b.score-a.score);
  return sells[0]||buys[0]||{symbol:'',side:'hold',score:0,uncertainty:1,reason:'No stock passed the evidence threshold'};
}
