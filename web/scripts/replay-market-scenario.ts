/** Research-only replay of archived quotes through all persisted residents.
 * stdin: NDJSON MarketSnapshot rows. Not a PIT or profitability backtest.
 */
import {readFileSync} from 'node:fs';
import {advanceLifeWorld,createLifeWorld,moneyTotal} from '../app/life-sim/engine';
import {ingestMarketSnapshot,type MarketSnapshot} from '../app/life-sim/market-feed';

const rows=readFileSync(0,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line) as MarketSnapshot);
if(rows.length<2||rows.length>60)throw Error('Replay requires 2–60 ordered market snapshots');
let world=createLifeWorld();
const openingMoney=moneyTotal(world),days=[];
for(const row of rows){
  world=ingestMarketSnapshot(world,row);
  const tradesBefore=world.daily.reduce((sum,day)=>sum+day.trades,0);
  world=advanceLifeWorld(world,1440);
  if(moneyTotal(world)!==openingMoney)throw Error('Cash conservation failure');
  const holders=world.residents.filter(r=>Object.values(r.holdings||{}).some(amount=>amount>0)).length;
  const mean=(field:'health'|'happiness'|'stress')=>Math.round(world.residents.reduce((sum,r)=>sum+r[field],0)/world.residents.length*10)/10;
  days.push({quoteAsOf:row.asOf,availableAt:row.availableAt,trades:world.daily.reduce((sum,day)=>sum+day.trades,0)-tradesBefore,stockHolders:holders,meanHealth:mean('health'),meanHappiness:mean('happiness'),meanStress:mean('stress')});
}
console.log(JSON.stringify({status:'historical-scenario-not-PIT-validation',population:world.residents.length,symbols:Object.keys(world.market!.latest.quotes),days,openingMoney,closingMoney:moneyTotal(world)},null,2));
