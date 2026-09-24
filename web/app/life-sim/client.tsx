'use client';
import {Localized,useLanguage} from '../language';
import {englishNameFor} from './english-names';
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
import {WellbeingHexagon} from './wellbeing-hexagon';
import type {AgentGoal} from './agent-cycle';
import './population.css';
type PopulationResponse = { world?: LifeWorld; error?: string };

export function usePopulation() {
  const [world, setWorld] = useState<LifeWorld | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [playing, setPlaying] = useState(false);
  const current = useRef(world),
    locked = useRef(false),
    observeAt=useRef<[number,number]>([0,-68]),
    areaRequest=useRef(0);
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
  const loadArea=useCallback(async(x:number,z:number)=>{
    observeAt.current=[x,z];
    const request=++areaRequest.current;
    try{
      const response=await fetch(`/api/population?x=${Math.round(x)}&z=${Math.round(z)}`,{cache:'no-store'}),data=(await response.json()) as PopulationResponse;
      if(request!==areaRequest.current)return;
      if(!response.ok||!data.world)throw new Error(data.error||'Area stream failed');
      current.current=data.world;setWorld(data.world);setError('');
    }catch(error){if(request===areaRequest.current)setError(error instanceof Error?error.message:'Area stream failed');}
  },[]);
  useEffect(() => {
    void load();
  }, [load]);
  const advance = useCallback(async (minutes: number,llmResidentId?:string) => {
    if (locked.current || !current.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const response = await fetch('/api/population', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            minutes,
            ...(llmResidentId?{llmResidentId}:{}),
            revision: current.current.revision,
            operationId: crypto.randomUUID(),
            observeX:observeAt.current[0],observeZ:observeAt.current[1],
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
  const submitEvent=useCallback(async(eventText:string)=>{
    if(locked.current||!current.current||!eventText.trim())return;
    locked.current=true;setBusy(true);
    try{
      const response=await fetch('/api/population',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventText:eventText.trim(),revision:current.current.revision,operationId:crypto.randomUUID(),observeX:observeAt.current[0],observeZ:observeAt.current[1]})});
      const data=(await response.json()) as PopulationResponse;
      if(data.world){current.current=data.world;setWorld(data.world);}
      if(!response.ok)throw new Error(data.error||'Event injection failed');
      setError('');
    }catch(error){setError(error instanceof Error?error.message:'Event injection was not confirmed');}
    finally{locked.current=false;setBusy(false);}
  },[]);
  const submitMarket=useCallback(async(raw:string)=>{
    if(locked.current||!current.current)return;
    let marketSnapshot:unknown;
    try{marketSnapshot=JSON.parse(raw);}catch{setError('Market snapshot must be valid JSON');return;}
    locked.current=true;setBusy(true);
    try{
      const response=await fetch('/api/population',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({marketSnapshot,revision:current.current.revision,operationId:crypto.randomUUID(),observeX:observeAt.current[0],observeZ:observeAt.current[1]})});
      const data=(await response.json()) as PopulationResponse;
      if(data.world){current.current=data.world;setWorld(data.world);}
      if(!response.ok)throw Error(data.error||'Market ingestion failed');
      setError('');
    }catch(error){setError(error instanceof Error?error.message:'Market ingestion failed');}
    finally{locked.current=false;setBusy(false);}
  },[]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      if (!document.hidden) void advance(15);
    }, 5000);
    return () => clearInterval(timer);
  }, [playing, advance]);
  return { world, error, busy, playing, setPlaying, advance, submitEvent, submitMarket, load, loadArea };
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
      object.scale.setScalar(r.journey?0:scale);
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
const agentGoalLabels:Record<AgentGoal,[string,string]>={
  hydration:['饮水','Hydration'],liquidity:['流动资金','Liquidity'],health:['身体健康','Health'],nutrition:['营养','Nutrition'],
  recovery:['恢复精力','Recovery'],education:['学习','Education'],income:['工资收入','Income'],
  'fresh-food':['新鲜饮食','Fresh food'],wellbeing:['心情与幸福','Wellbeing'],
  'household-supply':['家庭补给','Household supply'],portfolio:['投资组合','Portfolio'],exploration:['探索与出行','Exploration'],
};
export function PopulationPanel({
  controller,
  selected,
  onSelect,
  collapseForPlay = false,
}: {
  controller: PopulationController;
  selected: string | null;
  onSelect: (id: string | null) => void;
  collapseForPlay?: boolean;
}) {
  const language=useLanguage();
  const displayName=(r:{id:string;name:string;englishName?:string})=>language==='en'?(r.englishName||englishNameFor(r.id)):r.name;
  const [open, setOpen] = useState(true),
    [eventText,setEventText]=useState(''),
    [marketText,setMarketText]=useState(''),
    [occupation, setOccupation] = useState('all'),
    [tab, setTab] = useState<'society' | 'services' | 'resident' | 'event'>('society'),
    { world, error, busy, playing, setPlaying, advance, submitEvent, submitMarket, load } = controller;
  useEffect(() => {
    if (selected) setOpen(true);
  }, [selected]);
  useEffect(() => {
    if (collapseForPlay) setOpen(false);
  }, [collapseForPlay]);
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
      (n, r) => n + residentNetWorth(r, world.minute,world.market),
      0,
    ) ?? 0;
  const occupations=Array.from(new Map((world?.residents||[]).map(r=>[r.profile?.occupation||r.job,{id:r.profile?.occupation||r.job,label:r.job}])).values());
  const rankedResidents=[...(world?.residents||[])].sort((a,b)=>residentNetWorth(a,world!.minute,world!.market)-residentNetWorth(b,world!.minute,world!.market)||a.id.localeCompare(b.id));
  const memoryText=(item:{minute:number;text:string})=>{
    if(language!=='en')return item.text;
    const match=item.text.match(/^与(.+?)交谈：([\s\S]*)$/);
    if(!match)return item.text;
    const encounter=world?.socialEncounters?.find(e=>e.minute===item.minute&&(e.a===resident?.id||e.b===resident?.id));
    const partnerId=encounter?(encounter.a===resident?.id?encounter.b:encounter.a):undefined;
    const candidates=world?.residents.filter(r=>partnerId?r.id===partnerId:r.name===match[1])||[];
    return `Conversation with ${candidates.length===1?displayName(candidates[0]):'another resident'}: ${match[2]}`;
  };
  return (
    <Localized><aside
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
            ? `${(world.populationTotal||world.residents.length).toLocaleString('en-US')} 名居民 · ${timestamp(world.minute)}`
            : '加载实验存档'}{' '}
          {open ? '−' : '＋'}
        </span>
      </button>
      {open && (
        <div className="population-content">
          <p className="population-note">
            企业观察实验室 · 同一居民身份、生活与财务存档 · 合成规则模型
          </p>
          {tab==='event'&&<form className="world-event-form" onSubmit={event=>{event.preventDefault();const value=eventText.trim();if(value){void submitEvent(value);setEventText('');}}}>
            <label htmlFor="world-event">GOD VIEW · INJECT NEWS</label>
            <textarea id="world-event" maxLength={280} value={eventText} onChange={event=>setEventText(event.target.value)} placeholder="Milk prices rise 20% / Bread prices rise 20% / Cash transfer $10 to low-income residents" />
            <button disabled={!world||busy||!eventText.trim()}>Run population reaction</button>
          </form>}
          {tab==='event'&&<form className="world-event-form" onSubmit={event=>{event.preventDefault();if(marketText.trim())void submitMarket(marketText);}}>
            <label htmlFor="market-snapshot">TIMESTAMPED MARKET SNAPSHOT · PROVENANCE UNVERIFIED</label>
            <textarea id="market-snapshot" maxLength={1700} value={marketText} onChange={event=>setMarketText(event.target.value)} placeholder={'{"asOf":"2026-09-22T20:00:00Z","availableAt":"2026-09-22T20:01:00Z","source":"licensed-feed-id","quotes":{"AAPL":22535,"MSFT":51240}}'} />
            <small>Prices are integer cents. Include the actual source and when each quote became available; this interface does not certify vendor provenance.</small>
            <button disabled={!world||busy||!marketText.trim()}>Load quotes for resident decisions</button>
          </form>}
          {tab==='event'&&world?.market&&<p className="population-note">Market: {world.market.latest.asOf} · available {world.market.latest.availableAt} · {Object.keys(world.market.latest.quotes).length} symbols · {world.market.latest.source}</p>}
          {tab==='event'&&world?.worldEvents?.at(-1)&&(()=>{const item=world.worldEvents!.at(-1)!;return <section className="world-event-result" aria-live="polite">
            <strong>{item.text}</strong><small>{item.subject} · {item.direction} {item.shockPct}% · {(world.populationTotal||world.residents.length).toLocaleString('en-US')} residents</small>
            <div><span>REDUCE <b>{item.counts.reduce}</b></span><span>MAINTAIN <b>{item.counts.maintain}</b></span><span>INCREASE <b>{item.counts.increase}</b></span></div>
            {item.transferredCents!==undefined&&<small>Public cash transferred: {usd(item.transferredCents)} · eligibility proxy: bottom 50% of opening wealth</small>}
            {item.foodForecast&&<small>Planned basket changes — bread +{item.foodForecast.bread.increase} / ={item.foodForecast.bread.maintain} / −{item.foodForecast.bread.reduce}; sugar +{item.foodForecast.sugar.increase}; protein +{item.foodForecast.protein.increase}. These are model plans, not completed purchases.</small>}
          </section>})()}
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
                ['event', '事件实验'],
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
                每名居民是独立个体，同一家人各有个人账户。初始财富差异借用美国家庭统计作为情景参考，并非已校准的个人财富分布；旧存档保留既有财产。当前全城有 30,000 条持久居民记录，不代表 30,000 个大模型同时推理。
              </p>
              <p>全城 {world.populationTotal||world.residents.length} 名居民 · {world.householdTotal||Object.keys(world.housing||{}).length} 个家庭 · {world.employedTotal||world.residents.filter(r=>r.employment).length} 名就业居民 · {world.businessTotal||Object.keys(world.businesses||{}).length} 个经营及公共主体。当前前端观察样本 {world.observableSample||world.residents.length} 人，完整人口在服务端持续模拟。</p>
              {world.cityWellbeing&&<WellbeingHexagon scores={world.cityWellbeing} />}
              <p className="population-note">当前按个人净财富重新排序分组；人数占比和财富份额是不同指标。参考数据按家庭统计，仅作情景对照。</p>
              <div className="wealth-table">
                {WEALTH_REFERENCE.groups.map((group, index) => {
                  const boundaries=[0,.5,.9,.99,1];
                  const members = rankedResidents.slice(Math.floor(rankedResidents.length*boundaries[index]),Math.floor(rankedResidents.length*boundaries[index+1])),
                    share =
                      (members.reduce(
                        (n, r) => n + residentNetWorth(r, world.minute,world.market),
                        0,
                      ) /
                        (netWorth || 1)) *
                      100;
                  return (
                    <div key={group.id}>
                      <a href={group.url} target="_blank" rel="noreferrer">
                        {group.label}
                      </a>
                      <span>{members.length.toLocaleString('en-US')}{' 人 · '}{(members.length/Math.max(1,world.residents.length)*100).toFixed(0)}%{' 人口占比'}</span>
                      <b>财富份额 {netWorth>0?share.toFixed(1)+'%':'—'}</b>
                      <div className="wealth-track">
                        <i style={{ width: `${Math.max(0,Math.min(100, share))}%` }} />
                      </div>
                      <small>初始家庭统计参考 {group.share}%</small>
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
                {Object.values(world.businesses||{}).map(b=><details key={b.id}><summary><strong>{b.name}</strong> · {b.staffIds.length} 人 · 今日 {b.todayVisits} 单 / {usd(b.todayRevenue)}</summary><p>{b.open}:00–{b.close}:00 · 累计工时 {b.workedHours}<br/>经营余额 {usd(b.cash)} · 未付工资 {usd(b.unpaidWages)}</p><p>{b.ownerId?'经营者':'负责人'}：{(()=>{const owner=world.residents.find(r=>r.id===(b.ownerId||b.managerId));return owner?displayName(owner):'待招聘';})()}</p><div className="occupation-grid">{b.staffIds.slice(0,12).map(id=>{const r=world.residents.find(r=>r.id===id);return r?<button key={id} onClick={()=>onSelect(id)}>{displayName(r)} · {r.job}</button>:null;})}</div><small>{b.id}{b.floor?' · '+b.floor:''}</small></details>)}
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
                店铺按实际完成的消费记账；工资从经营账户支付，公共服务由公共账户支持。未付工资单独显示，不凭空补钱。医院与警务当前接入人员和服务工时，并不代表完整诊疗或治安模型；酒店短住为消费事件，客房内部尚未逐间构建。
              </p>
            </section>
          )}
          {world && tab === 'resident' && (
            <>
              <button disabled={busy||!resident||resident.remaining>0||!!resident.journey} onClick={()=>resident&&void advance(15,resident.id)}>为此居民请求一次大模型决策</button><p className="population-note">单人验证模式：需要配置推理服务；每次只请求一个决定，服务器检查后执行。未配置时会明确报错，不把规则结果冒充大模型。</p>
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
                      {displayName(r)} · {r.job}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {resident && world && tab === 'resident' && (
            <>
              <h3>
                {displayName(resident)} <small>{resident.job}</small>
              </h3>
              <p>{resident.reason}</p>
              {resident.agentEpisode&&<section className="population-agent-cycle" aria-label={language==='en'?'Latest agent decision':'最近一次居民决策'}>
                <h4>{language==='en'?'Agent loop · latest decision':'Agent 决策循环 · 最近一次'}</h4>
                <p><b>{language==='en'?'Observed':'观察'}</b> · {language==='en'?'Mood':'心情'} {Math.round(resident.agentEpisode.observation.mood)} · {language==='en'?'Nutrition':'营养'} {Math.round(resident.agentEpisode.observation.nutrition)} · {language==='en'?'Cash':'现金'} {usd(resident.agentEpisode.observation.cashCents)}{resident.agentEpisode.observation.lastEventId?` · ${language==='en'?'Event':'事件'} ${resident.agentEpisode.observation.lastEventId}`:''}</p>
                <p><b>{language==='en'?'Goal':'目标'}</b> · {agentGoalLabels[resident.agentEpisode.goal][language==='en'?1:0]} → <b>{language==='en'?'Action':'行动'}</b> · {resident.agentEpisode.action}</p>
                {resident.agentEpisode.alternatives.length>1&&<p><b>{language==='en'?'Considered':'比较过'}</b> · {resident.agentEpisode.alternatives.map(option=>`${option.action} ${option.score}`).join(' / ')}</p>}
                <p><b>{language==='en'?'Feedback':'反馈'}</b> · {resident.agentEpisode.result
                  ?resident.agentEpisode.result.status==='delayed'
                    ?language==='en'?'Market outcome pending later quotes':'市场结果等待后续行情'
                    :`${resident.agentEpisode.result.metric} ${resident.agentEpisode.result.actualDelta!>=0?'+':''}${resident.agentEpisode.result.actualDelta} · ${language==='en'?'forecast error':'预期误差'} ${resident.agentEpisode.result.forecastError!>=0?'+':''}${resident.agentEpisode.result.forecastError}`
                  :language==='en'?'Action in progress':'行动执行中'}</p>
                <small>{language==='en'?'Inspectable rule-based decisions; not 30,000 LLM agents.':'可检查的规则决策；并非三万个大模型自主智能体。'}</small>
              </section>}
              <p className="population-note">累计出行 {((resident.travelSeconds||0)/60).toFixed(1)} 分钟 · 其中等灯 {((resident.crossingWaitSeconds||0)/60).toFixed(1)} 分钟</p>
              <p>{resident.id} · {resident.identity?.age} 岁<br/>模拟银行账户：{resident.bankAccountId}</p>
              {resident.identity&&<><p>{resident.identity.home}<br/><small>{resident.identity.homeStatus}</small></p><p>兴趣：{resident.identity.preference} · 工作单位：{resident.identity.workplace||'家庭 / 学校 / 社区'}</p><h4>家庭、邻居与同事</h4><div className="occupation-grid">{resident.identity.relations.map(link=>{const other=world.residents.find(r=>r.id===`R${String(link.index+1).padStart(3,'0')}`);return other?<button key={other.id} onClick={()=>onSelect(other.id)}>{link.type} · {displayName(other)}</button>:null;})}{world.residents.filter(r=>r.id!==resident.id&&!!resident.identity?.workplace&&r.identity?.workplace===resident.identity.workplace).slice(0,4).map(r=><button key={`coworker-${r.id}`} onClick={()=>onSelect(r.id)}>同事 · {displayName(r)}</button>)}</div><h4>人格参数（合成，非大模型）</h4>{Object.entries(resident.identity.personality).map(([key,value],i)=><p className="service-hours" key={key}><span>{['开放性','尽责性','外向性','亲和性','情绪稳定性'][i]}</span><b>{value}</b></p>)}</>}
              <WellbeingHexagon resident={resident} />
              <div className="population-needs">
                {(
                  [
                    ['饮水', resident.water],
                    ['营养', resident.nutrition],
                    ['健康', resident.health],
                    ['精力', resident.energy],
                    ['幸福', resident.happiness],
                    ['当前心情', resident.wellbeing?.mood??resident.happiness],
                    ['压力（越低越好）', resident.stress],
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
                      optimum={label.startsWith('压力')?0:90}
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
                <div><dt>名义时薪</dt><dd>{resident.wage?`${usd(resident.wage)}/h`:'无有薪工作'}</dd></div>
                <div><dt>应发 / 实发工资</dt><dd>{usd(resident.payroll?.earnedCents||0)} / {usd(resident.payroll?.paidCents||0)}</dd></div>
                <div><dt>未付 / 已补发</dt><dd>{usd(resident.payroll?.outstandingCents||0)} / {usd(resident.payroll?.arrearsRepaidCents||0)}</dd></div>
                <div><dt>未获付薪排班天数</dt><dd>{resident.underemployedDays||0}</dd></div>
                <div>
                  <dt>虚拟持仓</dt>
                  <dd>
                    {resident.shares} 份 /{' '}
                    {usd(resident.shares * paperPrice(world.minute))}
                    {Object.entries(resident.holdings||{}).map(([symbol,milliShares])=><span key={symbol}><br/>{symbol}: {(milliShares/1000).toFixed(3)} 股 / {usd(Math.floor(milliShares*(world.market?.latest.quotes[symbol]||0)/1000))}</span>)}
                  </dd>
                </div>
              </dl>
              <p className="population-note">存款是可用资金，非现金资产不是存款。开局流动资金按年龄和工资分层；旧存档仅调整原开局额度，后续收入保留。完整税费、生活账单尚未校准。</p>
              {resident.adaptivePolicy&&<><h4>Adaptive memory · 动态决策</h4><p className="population-note">交易倾向 {resident.adaptivePolicy.trendPreference>.18?'Momentum':resident.adaptivePolicy.trendPreference<-.18?'Contrarian':'Deliberative'} · 风险预算倍率 {resident.adaptivePolicy.riskMultiplier.toFixed(2)} · 已观察行情结果 {resident.adaptivePolicy.marketObservations} 次。消费和家庭经历会逐步改变偏好；此处是可审计的在线规则，不是训练过的自主心智。</p><ol className="population-memory">{resident.adaptivePolicy.experiences.slice(-4).reverse().map((experience,index)=><li key={`${experience.minute}-${index}`}><time>{timestamp(experience.minute)}</time>{experience.kind}: {experience.detail} · {experience.outcome>=0?'+':''}{experience.outcome.toFixed(2)}</li>)}</ol></>}
              <dl className="population-money">
                <div>
                  <dt>非现金资产（情景值）</dt>
                  <dd>{usd(resident.profile?.nonCashAssets || 0)}</dd>
                </div>
                <div><dt>贷款余额</dt><dd>{usd(resident.profile?.debt||0)}</dd></div>
                <div><dt>个人净资产</dt><dd>{usd(residentNetWorth(resident,world.minute,world.market))}</dd></div>
                <div>
                  <dt>家庭食品库存</dt>
                  <dd>{resident.profile?.pantry || 0} 份</dd>
                </div>
                {resident.profile?.lastFoodBasket&&<div><dt>最近食品篮子</dt><dd>面包 {resident.profile.lastFoodBasket.bread} · 蛋白食品 {resident.profile.lastFoodBasket.protein} · 甜食 {resident.profile.lastFoodBasket.sugar} · 水果 {resident.profile.lastFoodBasket.fruit} · {usd(resident.profile.lastFoodBasket.costCents)}{resident.profile.lastFoodStoreId&&world.businesses?.[resident.profile.lastFoodStoreId]?` · ${world.businesses[resident.profile.lastFoodStoreId].name}`:''}</dd></div>}
              </dl>
              <h4>最近记忆与收支</h4>
              {resident.dwellingId&&world.housing?.[resident.dwellingId]&&(()=>{const h=world.housing![resident.dwellingId!],arrears=(h.payment?.rentArrearsCents||0)+(h.payment?.mortgageArrearsCents||0);return <><h4>住房产权与就业</h4><p>{h.buildingName}<br/>{h.unitId}</p><p>{h.tenure==='owner'?'家庭自有住房':'租住房屋'} · 产权人：{h.ownerResidentId||'城市住房信托'}<br/>住户：{h.residentIds.join(' / ')}</p><dl className="population-money"><div><dt>满工时税前月薪（非实收）</dt><dd>{usd(resident.employment?.monthlyGrossCents||0)}</dd></div><div><dt>房屋情景估值</dt><dd>{usd(h.propertyValueCents)}</dd></div><div><dt>家庭剩余房贷</dt><dd>{usd(h.loanBalanceCents)}</dd></div><div><dt>{h.tenure==='owner'?'每月房贷':'每月租金'}</dt><dd>{usd(h.monthlyMortgageCents||h.monthlyRentCents)}</dd></div><div><dt>上月实付</dt><dd>{usd(h.payment?.lastPaymentCents||0)}</dd></div><div><dt>住房欠款</dt><dd>{usd(arrears)}</dd></div></dl><p>{resident.employment?resident.employment.name+' · '+resident.employment.placeId:'非就业居民'}{resident.employment?.floor?' · '+resident.employment.floor:''}</p><p className="population-note">房价、工资与租金均为可调整的模拟假设。每30个模拟日按家庭账户实际扣取租金或房贷；现金不足时使用存款，仍不足的部分记为欠款。房贷利息进入公共金融账户，本金转为业主非现金资产；完整税费、处置和信用模型尚未接入。</p></>;})()}
              <p className="population-note">账户为模拟居民账户。跨区通勤目前按距离估时，不代表已完成全城道路寻路。</p>
              <ol className="population-memory">
                {resident.memory
                  .slice(-8)
                  .reverse()
                  .map((item, i) => (
                    <li key={`${item.minute}-${i}`}>
                      <time>{timestamp(item.minute)}</time>
                      {memoryText(item)}
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
            城市显示位置快照；模拟时钟独立于视觉昼夜。银行、医疗为基础规则；未加载行情时采用合成指数，手工加载的行情未核验数据来源或真实交易可执行性。
          </p>
        </div>
      )}
    </aside></Localized>
  );
}
