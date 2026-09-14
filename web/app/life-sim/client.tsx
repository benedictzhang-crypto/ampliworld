'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Color, InstancedMesh, Object3D } from 'three';
import {
  FACILITIES,
  paperPrice,
  residentNetWorth,
  type LifeWorld,
} from './engine';
import { OCCUPATIONS, VENUES, WEALTH_REFERENCE } from './society';
import {CENSUS_SIZE} from './census';
import './population.css';
type PopulationResponse = { world?: LifeWorld; error?: string };

export function usePopulation() {
  const [world, setWorld] = useState<LifeWorld | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [playing, setPlaying] = useState(false);
  const current = useRef(world),
    locked = useRef(false);
  current.current = world;
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/population', { cache: 'no-store' }),
        data = (await response.json()) as PopulationResponse;
      if (!response.ok || !data.world)
        throw new Error(data.error || '存档格式错误');
      setWorld(data.world);
      setError('');
    } catch (error) {
      setError(error instanceof Error ? error.message : '存档加载失败');
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const advance = useCallback(async (minutes: number) => {
    if (locked.current || !current.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const response = await fetch('/api/population', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            minutes,
            revision: current.current.revision,
            operationId: crypto.randomUUID(),
          }),
        }),
        data = (await response.json()) as PopulationResponse;
      if (data.world) {
        current.current = data.world;
        setWorld(data.world);
      }
      if (!response.ok) throw new Error(data.error || '推进失败');
      setError('');
    } catch (error) {
      setPlaying(false);
      setError(
        error instanceof Error ? error.message : '推进未确认；请刷新存档',
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (!document.hidden) void advance(15);
    }, 5000);
    return () => clearInterval(timer);
  }, [playing, advance]);
  return { world, error, busy, playing, setPlaying, advance, load };
}
export type PopulationController = ReturnType<typeof usePopulation>;

/** Snapshot visualization only: authoritative movement remains in the simulation engine. */
export function PopulationLayer({
  world,
  onSelect,
}: {
  world: LifeWorld | null;
  onSelect: (id: string) => void;
}) {
  const bodies = useRef<InstancedMesh>(null),
    heads = useRef<InstancedMesh>(null),
    legs = useRef<InstancedMesh>(null),
    invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!world || !bodies.current || !heads.current || !legs.current) return;
    const object = new Object3D(),
      color = new Color();
    world.residents.forEach((r, i) => {
      const offset = (i % 4) * 0.28;
      object.position.set(r.x + offset, 0.99, r.z);
      const scale=(r.identity?.age??18)<12?.67:1;
      object.scale.setScalar(scale);
      object.position.y=.17+.82*scale;
      object.updateMatrix();
      bodies.current!.setMatrixAt(i, object.matrix);
      bodies.current!.setColorAt(i, color.setHSL((i * 0.137) % 1, 0.28, 0.52));
      object.position.y = .17+1.4*scale;
      object.updateMatrix();
      heads.current!.setMatrixAt(i, object.matrix);
      for (let leg = 0; leg < 2; leg++) {
        object.position.set(r.x + offset + (leg ? -0.13 : 0.13)*scale, .17+.21*scale, r.z);
        object.updateMatrix();
        legs.current!.setMatrixAt(i * 2 + leg, object.matrix);
      }
    });
    for (const ref of [bodies, heads, legs]) {
      ref.current!.instanceMatrix.needsUpdate = true;
      if (ref.current!.instanceColor)
        ref.current!.instanceColor.needsUpdate = true;
      ref.current!.computeBoundingSphere();
    }
    invalidate();
  }, [world, invalidate]);
  if (!world) return null;
  return (
    <group>
      <instancedMesh
        ref={bodies}
        args={[undefined, undefined, CENSUS_SIZE]}
        onClick={(event) => {
          event.stopPropagation();
          if (event.instanceId !== undefined)
            onSelect(world.residents[event.instanceId].id);
        }}
      >
        <capsuleGeometry args={[0.22, 0.48, 3, 6]} />
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, CENSUS_SIZE]}>
        <sphereGeometry args={[0.18, 8, 6]} />
        <meshStandardMaterial color="#c49b7f" />
      </instancedMesh>
      <instancedMesh ref={legs} args={[undefined, undefined, CENSUS_SIZE*2]}>
        <cylinderGeometry args={[0.09, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#3c434d" />
      </instancedMesh>
      {FACILITIES.map((f) => (
        <group key={f.id} position={[f.x, 0.08, f.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.65, 0.9, 24]} />
            <meshBasicMaterial color={f.color} transparent opacity={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
const usd = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const timestamp = (minute: number) =>
  `第 ${Math.floor(minute / 1440) + 1} 天 ${String(Math.floor((minute % 1440) / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export function PopulationPanel({
  controller,
  selected,
  onSelect,
}: {
  controller: PopulationController;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(true),
    [occupation, setOccupation] = useState('all'),
    [tab, setTab] = useState<'society' | 'services' | 'resident'>('society'),
    { world, error, busy, playing, setPlaying, advance, load } = controller;
  useEffect(() => {
    if (selected) setOpen(true);
  }, [selected]);
  useEffect(() => {
    if (selected) setTab('resident');
  }, [selected]);
  useEffect(() => {
    if (
      selected &&
      occupation !== 'all' &&
      world?.residents.find((r) => r.id === selected)?.profile?.occupation !==
        occupation
    )
      setOccupation('all');
  }, [selected, occupation, world]);
  const resident =
      world?.residents.find((r) => r.id === selected) || world?.residents[0],
    daily = world?.daily.at(-1);
  const filtered =
    world?.residents.filter(
      (r) => occupation === 'all' || r.profile?.occupation === occupation,
    ) || [];
  const netWorth =
    world?.residents.reduce(
      (n, r) => n + residentNetWorth(r, world.minute),
      0,
    ) || 1;
  const occupations=Array.from(new Map((world?.residents||[]).map(r=>[r.profile?.occupation||r.job,{id:r.profile?.occupation||r.job,label:r.job}])).values());
  return (
    <aside
      className={`population-panel ${open ? 'is-open' : ''}`}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        className="population-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        WORLD LAB{' '}
        <span>
          {world
            ? `${world.residents.length} 名居民 · ${timestamp(world.minute)}`
            : '加载实验存档'}{' '}
          {open ? '−' : '＋'}
        </span>
      </button>
      {open && (
        <div className="population-content">
          <p className="population-note">
            企业观察实验室 · 同一居民身份、生活与财务存档 · 合成规则模型
          </p>
          {error && (
            <p role="alert" className="population-error">
              {error}{' '}
              <button disabled={busy} onClick={() => void load()}>
                刷新存档
              </button>
            </p>
          )}
          <div className="population-controls">
            <button
              disabled={!world || busy || !!error}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? '暂停' : '运行'}
            </button>
            <button
              disabled={!world || busy || playing || !!error}
              onClick={() => void advance(60)}
            >
              ＋1 小时
            </button>
            <button
              disabled={!world || busy || playing || !!error}
              onClick={() => void advance(1440)}
            >
              ＋1 天
            </button>
          </div>
          <p className="population-note">
            {busy
              ? '正在推进并保存…'
              : playing
                ? '每 5 秒推进 15 分钟；隐藏页面自动停止推进'
                : '暂停中 · 刷新后可继续；暂不离线推进'}
          </p>
          {daily && (
            <div className="population-summary">
              <span>
                今日消费 <b>{usd(daily.consumption)}</b>
              </span>
              <span>
                今日工资 <b>{usd(daily.wages)}</b>
              </span>
              <span>
                就诊 / 成交{' '}
                <b>
                  {daily.clinicVisits} / {daily.trades}
                </b>
              </span>
            </div>
          )}
          <div className="lab-tabs" aria-label="观察维度">
            {(
              [
                ['society', '社会结构'],
                ['services', '商业与服务'],
                ['resident', '个体追踪'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {world && tab === 'society' && (
            <section aria-label="家庭财富与职业结构">
              <h3>
                居民财富分布 <small>实验情景</small>
              </h3>
              <p className="population-note">
                每名居民是独立个体，同一家人各有个人账户。初始财富差异借用美国家庭统计作为情景参考，并非已校准的个人财富分布；旧存档保留既有财产。CBD 数万人是扩容目标，不是当前已运行人数。
              </p>
              <div className="wealth-table">
                {WEALTH_REFERENCE.groups.map((group) => {
                  const members = world.residents.filter(
                      (r) => r.profile?.cohort === group.id,
                    ),
                    share =
                      (members.reduce(
                        (n, r) => n + residentNetWorth(r, world.minute),
                        0,
                      ) /
                        netWorth) *
                      100;
                  return (
                    <div key={group.id}>
                      <a href={group.url} target="_blank" rel="noreferrer">
                        {group.label}
                      </a>
                      <span>{members.length} 人</span>
                      <b>{share.toFixed(1)}%</b>
                      <div className="wealth-track">
                        <i style={{ width: `${Math.min(100, share)}%` }} />
                      </div>
                      <small>初始参考 {group.share}%</small>
                    </div>
                  );
                })}
              </div>
              <h4>职业覆盖</h4>
              <div className="occupation-grid">
                {occupations.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setOccupation(o.id);
                      setTab('resident');
                      const first = world.residents.find(
                        (r) => r.profile?.occupation === o.id,
                      );
                      if (first) onSelect(first.id);
                    }}
                  >
                    <span>{o.label}</span>
                    <b>
                      {
                        world.residents.filter(
                          (r) => r.profile?.occupation === o.id,
                        ).length
                      }
                    </b>
                  </button>
                ))}
              </div>
              <p className="population-note">
                职业比例是测试覆盖，并非真实就业结构；职业不用于推断性格或能力。净财富包括非现金资产，不等于购物预算。
              </p>
            </section>
          )}
          {world && tab === 'services' && (
            <section aria-label="商业与公共服务观察">
              <h3>消费去向与服务活动</h3>
              <p className="population-note">
                本轮累计完成的服务；标为“服务点”的条目不代表新建筑室内已建成。
              </p>
              <div className="venue-table">
                {VENUES.map((v) => (
                  <div key={v.id}>
                    <strong>
                      {v.name}
                      <small>{v.kind} · 服务点</small>
                    </strong>
                    <span>
                      {world.venueStats?.[v.id]?.visits || 0} 次<br />
                      {usd(world.venueStats?.[v.id]?.revenue || 0)}
                    </span>
                  </div>
                ))}
              </div>
              <h4>公共服务累计工时</h4>
              {OCCUPATIONS.filter((o) =>
                ['医疗', '公共安全', '公共环境', '教育'].includes(o.sector),
              ).map((o) => (
                <p key={o.id} className="service-hours">
                  <span>{o.label}</span>
                  <b>
                    {o.id === 'student'
                      ? world.residents.reduce(
                          (n, r) => n + (r.profile?.studyMinutes || 0),
                          0,
                        ) / 60
                      : world.serviceHours?.[o.id] || 0}{' '}
                    小时
                  </b>
                </p>
              ))}
              <p className="population-note">
                当前为工时观察；未据此声称治安改善、诊疗效果或草坪维护已完成物理联动。零售非食品购买策略待接入。
              </p>
            </section>
          )}
          {world && tab === 'resident' && (
            <>
              <label className="population-select">
                职业筛选
                <select
                  value={occupation}
                  onChange={(event) => {
                    const role = event.target.value;
                    setOccupation(role);
                    const first = world.residents.find(
                      (r) => role === 'all' || r.profile?.occupation === role,
                    );
                    if (first) onSelect(first.id);
                  }}
                >
                  <option value="all">全部职业</option>
                  {occupations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="population-select">
                追踪对象
                <select
                  value={resident?.id}
                  onChange={(event) => onSelect(event.target.value)}
                >
                  {filtered.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {r.job}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {resident && world && tab === 'resident' && (
            <>
              <h3>
                {resident.name} <small>{resident.job}</small>
              </h3>
              <p>{resident.reason}</p>
              <p>{resident.id} · {resident.identity?.age} 岁<br/>模拟银行账户：{resident.bankAccountId}</p>
              {resident.identity&&<><p>{resident.identity.home}<br/><small>{resident.identity.homeStatus}</small></p><p>兴趣：{resident.identity.preference} · 工作单位：{resident.identity.workplace||'家庭 / 学校 / 社区'}</p><h4>家庭、邻居与同事</h4><div className="occupation-grid">{resident.identity.relations.map(link=>{const other=world.residents.find(r=>r.id===`R${String(link.index+1).padStart(3,'0')}`);return other?<button key={other.id} onClick={()=>onSelect(other.id)}>{link.type} · {other.name}</button>:null;})}{world.residents.filter(r=>r.id!==resident.id&&!!resident.identity?.workplace&&r.identity?.workplace===resident.identity.workplace).slice(0,4).map(r=><button key={`coworker-${r.id}`} onClick={()=>onSelect(r.id)}>同事 · {r.name}</button>)}</div><h4>人格参数（合成，非大模型）</h4>{Object.entries(resident.identity.personality).map(([key,value],i)=><p className="service-hours" key={key}><span>{['开放性','尽责性','外向性','亲和性','情绪稳定性'][i]}</span><b>{value}</b></p>)}</>}
              <div className="population-needs">
                {(
                  [
                    ['饮水', resident.water],
                    ['营养', resident.nutrition],
                    ['健康', resident.health],
                    ['精力', resident.energy],
                    ['幸福', resident.happiness],
                  ] as const
                ).map(([label, value]) => (
                  <label key={label}>
                    <span>
                      {label} {Math.round(value)}
                    </span>
                    <meter
                      min={0}
                      max={100}
                      low={30}
                      optimum={90}
                      value={value}
                    />
                  </label>
                ))}
              </div>
              <dl className="population-money">
                <div>
                  <dt>现金</dt>
                  <dd>{usd(resident.cash)}</dd>
                </div>
                <div>
                  <dt>银行存款</dt>
                  <dd>{usd(resident.savings)}</dd>
                </div>
                <div>
                  <dt>虚拟持仓</dt>
                  <dd>
                    {resident.shares} 份 /{' '}
                    {usd(resident.shares * paperPrice(world.minute))}
                  </dd>
                </div>
              </dl>
              <dl className="population-money">
                <div>
                  <dt>非现金资产（情景值）</dt>
                  <dd>{usd(resident.profile?.nonCashAssets || 0)}</dd>
                </div>
                <div><dt>贷款余额</dt><dd>{usd(resident.profile?.debt||0)}</dd></div>
                <div><dt>个人净资产</dt><dd>{usd(residentNetWorth(resident,world.minute))}</dd></div>
                <div>
                  <dt>家庭食品库存</dt>
                  <dd>{resident.profile?.pantry || 0} 份</dd>
                </div>
              </dl>
              <h4>最近记忆与收支</h4>
              <p className="population-note">资产目前记录个人总估值；房产、车辆逐项产权及贷款合同、利息和还款计划尚未接入。这里的账户是模拟居民账户，不是真实银行或真人登录账号。</p>
              <ol className="population-memory">
                {resident.memory
                  .slice(-8)
                  .reverse()
                  .map((item, i) => (
                    <li key={`${item.minute}-${i}`}>
                      <time>{timestamp(item.minute)}</time>
                      {item.text}
                      {item.cashDelta !== 0 && (
                        <b>
                          {item.cashDelta > 0 ? '+' : '−'}
                          {usd(Math.abs(item.cashDelta))}
                        </b>
                      )}
                    </li>
                  ))}
              </ol>
            </>
          )}
          <p className="population-note">
            城市显示位置快照；模拟时钟独立于视觉昼夜。银行、医疗为基础规则；股票采用合成指数，不连接真实市场。
          </p>
        </div>
      )}
    </aside>
  );
}
