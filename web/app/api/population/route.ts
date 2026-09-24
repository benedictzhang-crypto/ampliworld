import { getChatGPTUser } from '../../chatgpt-auth';
import { populationDB,inferenceConfig } from '../../life-sim/storage';
import {deliberate} from '../../life-sim/deliberation';
import {encodeSnapshot,decodeSnapshot,splitSnapshot} from '../../life-sim/snapshot-codec';
import {
  createLifeWorld,
  advanceLifeWorld,
  upgradeLifeWorld,
} from '../../life-sim/engine';
import {applyWorldEvent} from '../../life-sim/world-events';
import {ingestMarketSnapshot,validateMarketSnapshot} from '../../life-sim/market-feed';
import type {LifeWorld} from '../../life-sim/engine';
import {populationWellbeingScores} from '../../life-sim/wellbeing';
const response = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
async function load(userId: string) {
  const db = populationDB();
  let row = await db
    .prepare(
      'SELECT revision, state_json FROM population_runs WHERE user_id = ?',
    )
    .bind(userId)
    .first<{ revision: number; state_json: string }>();
  if (!row) {
    const chunks=splitSnapshot(await encodeSnapshot(createLifeWorld()));
    await db.batch([
      db.prepare('INSERT OR IGNORE INTO population_runs (user_id, revision, state_json, updated_at) VALUES (?, 0, ?, ?)')
        .bind(userId,`chunks:${chunks.length}`,new Date().toISOString()),
      ...chunks.map((payload,index)=>db.prepare('INSERT OR IGNORE INTO population_run_chunks (user_id, revision, chunk_index, payload) VALUES (?, 0, ?, ?)')
        .bind(userId,index,payload)),
    ]);
    row = await db
      .prepare(
        'SELECT revision, state_json FROM population_runs WHERE user_id = ?',
      )
      .bind(userId)
      .first<{ revision: number; state_json: string }>();
  }
  if (!row) throw new Error('Population persistence unavailable');
  let encoded=row.state_json;
  if(encoded.startsWith('chunks:')){
    const expected=Number(encoded.slice(7));
    if(!Number.isSafeInteger(expected)||expected<1||expected>32)throw new Error('Invalid population chunk manifest');
    const result=await db.prepare('SELECT chunk_index, payload FROM population_run_chunks WHERE user_id = ? AND revision = ? ORDER BY chunk_index')
      .bind(userId,row.revision).all<{chunk_index:number;payload:string}>();
    const pieces=result.results||[];
    if(pieces.length!==expected||pieces.some((piece,index)=>piece.chunk_index!==index))throw new Error('Incomplete population snapshot');
    encoded=pieces.map(piece=>piece.payload).join('');
  }
  return upgradeLifeWorld(await decodeSnapshot(encoded));
}
let guestWorld:LifeWorld|undefined;
function observable(world:LifeWorld,center:[number,number]=[0,-68]):LifeWorld{
  const sample=[...world.residents].sort((a,b)=>
    Math.hypot(a.x-center[0],a.z-center[1])-Math.hypot(b.x-center[0],b.z-center[1])||a.id.localeCompare(b.id)
  ).slice(0,1200);
  return {...world,
    cityWellbeing:populationWellbeingScores(world.residents),
    populationTotal:world.residents.length,
    householdTotal:Object.keys(world.housing||{}).length,
    employedTotal:world.residents.filter(r=>r.employment).length,
    businessTotal:Object.keys(world.businesses||{}).length,
    observableSample:sample.length,
    residents:sample,
    housing:undefined,
  };
}
export async function GET(request:Request) {
  const user = await getChatGPTUser();
  try {
    if(!user)guestWorld??=createLifeWorld();
    const url=new URL(request.url),x=Number(url.searchParams.get('x')||0),z=Number(url.searchParams.get('z')||-68);
    return response({ world: observable(user?await load(user.userId):guestWorld!,[Number.isFinite(x)?x:0,Number.isFinite(z)?z:-68]) });
  } catch (error) {
    console.error('population load failed', error);
    return response({ error: '居民存档暂时无法加载，请稍后重试' }, 503);
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return response({ error: '请求来源不匹配' }, 403);
  try {
    const text = await request.text();
    if (text.length > 2048) return response({ error: '请求过大' }, 413);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return response({ error: '请求不是有效 JSON' }, 400);
    }
    const eventText=typeof body?.eventText==='string'?body.eventText.trim():'';
    const hasMarketSnapshot=body?.marketSnapshot!==undefined;
    const observe:[number,number]=[Number.isFinite(body?.observeX)?body.observeX:0,Number.isFinite(body?.observeZ)?body.observeZ:-68];
    if (
      !body ||
      Number(Boolean(eventText))+Number([15,60,1440].includes(body.minutes))+Number(hasMarketSnapshot)!==1 ||
      eventText.length>280 ||
      !Number.isSafeInteger(body.revision) ||
      typeof body.operationId !== 'string' ||
      body.operationId.length > 80 ||
      body.operationId.length < 8
    )
      return response({ error: '无效的模拟请求' }, 400);
    if(hasMarketSnapshot)try{validateMarketSnapshot(body.marketSnapshot);}catch(error){return response({error:error instanceof Error?error.message:'Invalid market snapshot'},400);}
    if(!user)guestWorld??=createLifeWorld();
    const current = user?await load(user.userId):guestWorld!;
    if (current.lastOperation === body.operationId)
      return response({ world: observable(current,observe) });
    if (current.revision !== body.revision)
      return response(
        { world: observable(current,observe), error: '其他窗口已推进世界，已刷新' },
        409,
      );
    if(body.llmResidentId!==undefined){if(typeof body.llmResidentId!=='string')return response({error:'居民编号无效'},400);try{await deliberate(current,body.llmResidentId,inferenceConfig());}catch(e){return response({error:e instanceof Error?e.message:'推理失败'},422);}}
    let next:LifeWorld;
    try{next=eventText?applyWorldEvent(current,eventText):hasMarketSnapshot?ingestMarketSnapshot(current,body.marketSnapshot):advanceLifeWorld(current, body.minutes);}
    catch(error){if(hasMarketSnapshot||eventText)return response({error:error instanceof Error?error.message:'Invalid simulation event'},422);throw error;}
    next.lastOperation = body.operationId;
    if(!user){guestWorld=next;return response({world:observable(next,observe)});}
    const db=populationDB(),chunks=splitSnapshot(await encodeSnapshot(next));
    const updates=await db.batch([
      ...chunks.map((payload,index)=>db.prepare('INSERT OR IGNORE INTO population_run_chunks (user_id, revision, chunk_index, payload) VALUES (?, ?, ?, ?)')
        .bind(user.userId,next.revision,index,payload)),
      db.prepare('UPDATE population_runs SET revision = ?, state_json = ?, updated_at = ? WHERE user_id = ? AND revision = ?')
        .bind(next.revision,`chunks:${chunks.length}`,new Date().toISOString(),user.userId,current.revision),
    ]);
    const update=updates.at(-1);
    if (update?.meta.changes !== 1)
      return response(
        { world: observable(await load(user.userId),observe), error: '并发更新，已刷新' },
        409,
      );
    await db.prepare('DELETE FROM population_run_chunks WHERE user_id = ? AND revision < ?')
      .bind(user.userId,next.revision).run();
    return response({ world: observable(next,observe) });
  } catch (error) {
    console.error('population step failed', error);
    return response({ error: '本次推进未确认，请刷新存档后重试' }, 503);
  }
}
