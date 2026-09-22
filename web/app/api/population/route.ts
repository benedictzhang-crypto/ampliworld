import { getChatGPTUser } from '../../chatgpt-auth';
import { populationDB,inferenceConfig } from '../../life-sim/storage';
import {deliberate} from '../../life-sim/deliberation';
import {encodeSnapshot,decodeSnapshot} from '../../life-sim/snapshot-codec';
import {
  createLifeWorld,
  advanceLifeWorld,
  upgradeLifeWorld,
} from '../../life-sim/engine';
import {applyWorldEvent} from '../../life-sim/world-events';
import type {LifeWorld} from '../../life-sim/engine';
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
    await db
      .prepare(
        'INSERT OR IGNORE INTO population_runs (user_id, revision, state_json, updated_at) VALUES (?, 0, ?, ?)',
      )
      .bind(userId, await encodeSnapshot(createLifeWorld()), new Date().toISOString())
      .run();
    row = await db
      .prepare(
        'SELECT revision, state_json FROM population_runs WHERE user_id = ?',
      )
      .bind(userId)
      .first<{ revision: number; state_json: string }>();
  }
  if (!row) throw new Error('Population persistence unavailable');
  return upgradeLifeWorld(await decodeSnapshot(row.state_json));
}
let guestWorld:LifeWorld|undefined;
function observable(world:LifeWorld):LifeWorld{
  const sample=world.residents.slice(0,1200);
  return {...world,
    populationTotal:world.residents.length,
    householdTotal:Object.keys(world.housing||{}).length,
    employedTotal:world.residents.filter(r=>r.employment).length,
    businessTotal:Object.keys(world.businesses||{}).length,
    observableSample:sample.length,
    residents:sample,
    housing:undefined,
  };
}
export async function GET() {
  const user = await getChatGPTUser();
  try {
    if(!user)guestWorld??=createLifeWorld();
    return response({ world: observable(user?await load(user.userId):guestWorld!) });
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
    if (
      !body ||
      (!eventText&&![15, 60, 1440].includes(body.minutes)) ||
      eventText.length>280 ||
      !Number.isSafeInteger(body.revision) ||
      typeof body.operationId !== 'string' ||
      body.operationId.length > 80 ||
      body.operationId.length < 8
    )
      return response({ error: '无效的模拟请求' }, 400);
    if(!user)guestWorld??=createLifeWorld();
    const current = user?await load(user.userId):guestWorld!;
    if (current.lastOperation === body.operationId)
      return response({ world: observable(current) });
    if (current.revision !== body.revision)
      return response(
        { world: observable(current), error: '其他窗口已推进世界，已刷新' },
        409,
      );
    if(body.llmResidentId!==undefined){if(typeof body.llmResidentId!=='string')return response({error:'居民编号无效'},400);try{await deliberate(current,body.llmResidentId,inferenceConfig());}catch(e){return response({error:e instanceof Error?e.message:'推理失败'},422);}}
    const next = eventText?applyWorldEvent(current,eventText):advanceLifeWorld(current, body.minutes);
    next.lastOperation = body.operationId;
    if(!user){guestWorld=next;return response({world:observable(next)});}
    const update = await populationDB()
      .prepare(
        'UPDATE population_runs SET revision = ?, state_json = ?, updated_at = ? WHERE user_id = ? AND revision = ?',
      )
      .bind(
        next.revision,
        await encodeSnapshot(next),
        new Date().toISOString(),
        user.userId,
        current.revision,
      )
      .run();
    if (update.meta.changes !== 1)
      return response(
        { world: observable(await load(user.userId)), error: '并发更新，已刷新' },
        409,
      );
    return response({ world: observable(next) });
  } catch (error) {
    console.error('population step failed', error);
    return response({ error: '本次推进未确认，请刷新存档后重试' }, 503);
  }
}
