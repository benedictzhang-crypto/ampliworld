import { getChatGPTUser } from '../../chatgpt-auth';
import { populationDB } from '../../life-sim/storage';
import {encodeSnapshot,decodeSnapshot} from '../../life-sim/snapshot-codec';
import {
  createLifeWorld,
  advanceLifeWorld,
  upgradeLifeWorld,
  type LifeWorld,
} from '../../life-sim/engine';
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
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return response({ error: '请登录后加载居民世界' }, 401);
  try {
    return response({ world: await load(user.userId) });
  } catch (error) {
    console.error('population load failed', error);
    return response({ error: '居民存档暂时无法加载，请稍后重试' }, 503);
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return response({ error: '请先登录' }, 401);
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
    if (
      !body ||
      ![15, 60, 1440].includes(body.minutes) ||
      !Number.isSafeInteger(body.revision) ||
      typeof body.operationId !== 'string' ||
      body.operationId.length > 80 ||
      body.operationId.length < 8
    )
      return response({ error: '无效的模拟请求' }, 400);
    const current = await load(user.userId);
    if (current.lastOperation === body.operationId)
      return response({ world: current });
    if (current.revision !== body.revision)
      return response(
        { world: current, error: '其他窗口已推进世界，已刷新' },
        409,
      );
    const next = advanceLifeWorld(current, body.minutes);
    next.lastOperation = body.operationId;
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
        { world: await load(user.userId), error: '并发更新，已刷新' },
        409,
      );
    return response({ world: next });
  } catch (error) {
    console.error('population step failed', error);
    return response({ error: '本次推进未确认，请刷新存档后重试' }, 503);
  }
}
