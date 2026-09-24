import assert from 'node:assert/strict';
import {createLifeWorld,advanceLifeWorld} from '../app/life-sim/engine';
import {beginAgentEpisode,rankDiscretionaryOptions,reflectAgentEpisode} from '../app/life-sim/agent-cycle';
import {wellbeingFor} from '../app/life-sim/wellbeing';
import {encodeSnapshot,decodeSnapshot,splitSnapshot} from '../app/life-sim/snapshot-codec';

async function main(){
  const world=createLifeWorld();
  const resident=world.residents.find(r=>(r.identity?.age??0)>=25&&!!r.profile);
  assert.ok(resident);
  resident.cash=30000;resident.savings=50000;resident.risk=0;
  resident.water=90;resident.health=90;resident.energy=90;resident.nutrition=60;resident.happiness=35;resident.stress=40;
  resident.profile!.pantry=0;resident.lastFruitDay=Math.floor(world.minute/1440);
  const needsSupplies=rankDiscretionaryOptions(world,resident);
  assert.equal(needsSupplies[0].action,'shop','an empty pantry should outrank optional leisure');
  resident.profile!.pantry=8;
  const wantsLeisure=rankDiscretionaryOptions(world,resident);
  assert.equal(wantsLeisure[0].action,'leisure','a supplied resident can prioritize wellbeing');
  wellbeingFor(resident).eventPressure=8;
  const underShock=rankDiscretionaryOptions(world,resident);
  assert.equal(underShock[0].action,'home','event pressure should alter the feasible goal ranking');

  resident.water=20;
  beginAgentEpisode(world,resident,'drink','urgent water need',[],'local-policy');
  resident.water=95;
  reflectAgentEpisode(world,resident);
  assert.equal(resident.agentEpisode?.result?.status,'met');
  assert.equal(resident.agentEpisode?.result?.actualDelta,75);

  const advanced=advanceLifeWorld(world,15);
  assert.equal(advanced.residents.length,30000);
  assert.ok(advanced.residents.some(r=>r.agentEpisode?.action==='drink'));
  const encoded=await encodeSnapshot(advanced),chunks=splitSnapshot(encoded);
  assert.ok(chunks.length>1&&chunks.every(chunk=>chunk.length<=1_500_000));
  const decoded=await decodeSnapshot(chunks.join(''));
  assert.equal(decoded.residents.length,advanced.residents.length);
  assert.equal(decoded.residents[0].agentEpisode?.action,advanced.residents[0].agentEpisode?.action);
  console.log(JSON.stringify({status:'passed',residents:decoded.residents.length,chunks:chunks.length,
    bytes:encoded.length,goalShift:[needsSupplies[0].action,wantsLeisure[0].action,underShock[0].action]}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
