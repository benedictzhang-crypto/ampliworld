'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useThree} from '@react-three/fiber';
import {Color,InstancedMesh,Object3D} from 'three';
import {FACILITIES,paperPrice,type LifeWorld} from './engine';
import './population.css';
type PopulationResponse={world?:LifeWorld;error?:string};

export function usePopulation(){
  const [world,setWorld]=useState<LifeWorld|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[playing,setPlaying]=useState(false);
  const current=useRef(world),locked=useRef(false);current.current=world;
  const load=useCallback(async()=>{
    try{const response=await fetch('/api/population',{cache:'no-store'}),data=await response.json() as PopulationResponse;if(!response.ok||!data.world)throw new Error(data.error||'存档格式错误');setWorld(data.world);setError('');}
    catch(error){setError(error instanceof Error?error.message:'存档加载失败');}
  },[]);
  useEffect(()=>{void load();},[load]);
  const advance=useCallback(async(minutes:number)=>{
    if(locked.current||!current.current)return;
    locked.current=true;setBusy(true);
    try{
      const response=await fetch('/api/population',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({minutes,revision:current.current.revision,operationId:crypto.randomUUID()})}),data=await response.json() as PopulationResponse;
      if(data.world){current.current=data.world;setWorld(data.world);}
      if(!response.ok)throw new Error(data.error||'推进失败');setError('');
    }catch(error){setPlaying(false);setError(error instanceof Error?error.message:'推进未确认；请刷新存档');}
    finally{locked.current=false;setBusy(false);}
  },[]);
  useEffect(()=>{if(!playing)return;const timer=setInterval(()=>{if(!document.hidden)void advance(15);},5000);return()=>clearInterval(timer);},[playing,advance]);
  return {world,error,busy,playing,setPlaying,advance,load};
}
export type PopulationController=ReturnType<typeof usePopulation>;

/** Snapshot visualization only: authoritative movement remains in the simulation engine. */
export function PopulationLayer({world,onSelect}:{world:LifeWorld|null;onSelect:(id:string)=>void}){
  const bodies=useRef<InstancedMesh>(null),heads=useRef<InstancedMesh>(null),legs=useRef<InstancedMesh>(null),invalidate=useThree(s=>s.invalidate);
  useEffect(()=>{
    if(!world||!bodies.current||!heads.current||!legs.current)return;
    const object=new Object3D(),color=new Color();
    world.residents.forEach((r,i)=>{
      const offset=(i%4)*.28;
      object.position.set(r.x+offset,.99,r.z);object.scale.set(1,1,1);object.updateMatrix();bodies.current!.setMatrixAt(i,object.matrix);
      bodies.current!.setColorAt(i,color.setHSL((i*.137)%1,.28,.52));
      object.position.y=1.57;object.updateMatrix();heads.current!.setMatrixAt(i,object.matrix);
      for(let leg=0;leg<2;leg++){object.position.set(r.x+offset+(leg?-.13:.13),.38,r.z);object.updateMatrix();legs.current!.setMatrixAt(i*2+leg,object.matrix);}
    });
    for(const ref of [bodies,heads,legs]){ref.current!.instanceMatrix.needsUpdate=true;if(ref.current!.instanceColor)ref.current!.instanceColor.needsUpdate=true;ref.current!.computeBoundingSphere();}invalidate();
  },[world,invalidate]);
  if(!world)return null;
  return <group>
    <instancedMesh ref={bodies} args={[undefined,undefined,48]} onClick={event=>{event.stopPropagation();if(event.instanceId!==undefined)onSelect(world.residents[event.instanceId].id);}}><capsuleGeometry args={[.22,.48,3,6]}/><meshStandardMaterial roughness={.9}/></instancedMesh>
    <instancedMesh ref={heads} args={[undefined,undefined,48]}><sphereGeometry args={[.18,8,6]}/><meshStandardMaterial color="#c49b7f"/></instancedMesh>
    <instancedMesh ref={legs} args={[undefined,undefined,96]}><cylinderGeometry args={[.09,.08,.7,6]}/><meshStandardMaterial color="#3c434d"/></instancedMesh>
    {FACILITIES.map(f=><group key={f.id} position={[f.x,.08,f.z]}><mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.65,.9,24]}/><meshBasicMaterial color={f.color} transparent opacity={.7}/></mesh></group>)}
  </group>;
}
const usd=(cents:number)=>`$${(cents/100).toLocaleString('en-US',{maximumFractionDigits:2})}`;
const timestamp=(minute:number)=>`第 ${Math.floor(minute/1440)+1} 天 ${String(Math.floor(minute%1440/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
export function PopulationPanel({controller,selected,onSelect}:{controller:PopulationController;selected:string|null;onSelect:(id:string|null)=>void}){
  const [open,setOpen]=useState(false),{world,error,busy,playing,setPlaying,advance,load}=controller;
  useEffect(()=>{if(selected)setOpen(true);},[selected]);
  const resident=world?.residents.find(r=>r.id===selected)||world?.residents[0],daily=world?.daily.at(-1);
  return <aside className={`population-panel ${open?'is-open':''}`} onKeyDown={event=>event.stopPropagation()}>
    <button className="population-toggle" onClick={()=>setOpen(!open)} aria-expanded={open}>居民生活 <span>{world?`${world.residents.length} 人 · ${timestamp(world.minute)}`:'加载存档'} {open?'−':'＋'}</span></button>
    {open&&<div className="population-content">
      <p className="population-note">生活实验室 · 合成测试居民 / 可解释规则。独立模拟时钟；城市显示位置快照，不代表已完成人群寻路与预测校准。</p>
      {error&&<p role="alert" className="population-error">{error} <button disabled={busy} onClick={()=>void load()}>刷新存档</button></p>}
      <div className="population-controls"><button disabled={!world||busy||!!error} onClick={()=>setPlaying(!playing)}>{playing?'暂停':'运行'}</button><button disabled={!world||busy||playing||!!error} onClick={()=>void advance(60)}>＋1 小时</button><button disabled={!world||busy||playing||!!error} onClick={()=>void advance(1440)}>＋1 天</button></div>
      <p className="population-note">{busy?'正在推进并保存…':playing?'每 5 秒推进 15 分钟；隐藏页面自动停止推进':'暂停中 · 刷新后可继续；暂不离线推进'}</p>
      {daily&&<div className="population-summary"><span>今日消费 <b>{usd(daily.consumption)}</b></span><span>今日工资 <b>{usd(daily.wages)}</b></span><span>就诊 / 成交 <b>{daily.clinicVisits} / {daily.trades}</b></span></div>}
      {world&&<label className="population-select">观察居民<select value={resident?.id} onChange={event=>onSelect(event.target.value)}>{world.residents.map(r=><option key={r.id} value={r.id}>{r.name} · {r.job}</option>)}</select></label>}
      {resident&&world&&<>
        <h3>{resident.name} <small>{resident.job}</small></h3><p>{resident.reason}</p>
        <div className="population-needs">{([['饮水',resident.water],['营养',resident.nutrition],['健康',resident.health],['精力',resident.energy],['幸福',resident.happiness]] as const).map(([label,value])=><label key={label}><span>{label} {Math.round(value)}</span><meter min={0} max={100} low={30} optimum={90} value={value}/></label>)}</div>
        <dl className="population-money"><div><dt>现金</dt><dd>{usd(resident.cash)}</dd></div><div><dt>银行存款</dt><dd>{usd(resident.savings)}</dd></div><div><dt>虚拟持仓</dt><dd>{resident.shares} 份 / {usd(resident.shares*paperPrice(world.minute))}</dd></div></dl>
        <h4>最近记忆与收支</h4><ol className="population-memory">{resident.memory.slice(-8).reverse().map((item,i)=><li key={`${item.minute}-${i}`}><time>{timestamp(item.minute)}</time>{item.text}{item.cashDelta!==0&&<b>{item.cashDelta>0?'+':'−'}{usd(Math.abs(item.cashDelta))}</b>}</li>)}</ol>
      </>}
      <p className="population-note">银行只提供存取款；医疗是基础服务规则；股票采用合成指数价格，不连接真实市场。</p>
    </div>}
  </aside>;
}
