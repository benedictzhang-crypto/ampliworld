'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import type {LifeWorld} from './engine';

type PopulationResponse={world?:LifeWorld;error?:string};

/** Server-authoritative population transport; visual layers only consume snapshots. */
export function usePopulation(){
  const [world,setWorld]=useState<LifeWorld|null>(null),
    [error,setError]=useState(''),
    [busy,setBusy]=useState(false),
    [playing,setPlaying]=useState(false);
  const current=useRef(world),
    locked=useRef(false),
    observeAt=useRef<[number,number]>([0,-68]),
    areaRequest=useRef(0);
  current.current=world;
  const load=useCallback(async()=>{
    try{
      const response=await fetch('/api/population',{cache:'no-store'}),
        data=(await response.json()) as PopulationResponse;
      if(!response.ok||!data.world)throw new Error(data.error||'存档格式错误');
      setWorld(data.world);setError('');
    }catch(error){setError(error instanceof Error?error.message:'存档加载失败');}
  },[]);
  const loadArea=useCallback(async(x:number,z:number)=>{
    observeAt.current=[x,z];
    const request=++areaRequest.current;
    try{
      const response=await fetch(`/api/population?x=${Math.round(x)}&z=${Math.round(z)}`,{cache:'no-store'}),
        data=(await response.json()) as PopulationResponse;
      if(request!==areaRequest.current)return;
      if(!response.ok||!data.world)throw new Error(data.error||'Area stream failed');
      current.current=data.world;setWorld(data.world);setError('');
    }catch(error){if(request===areaRequest.current)setError(error instanceof Error?error.message:'Area stream failed');}
  },[]);
  const advance=useCallback(async(minutes:number,llmResidentId?:string)=>{
    if(locked.current||!current.current)return;
    locked.current=true;setBusy(true);
    try{
      const response=await fetch('/api/population',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({minutes,...(llmResidentId?{llmResidentId}:{}),revision:current.current.revision,
          operationId:crypto.randomUUID(),observeX:observeAt.current[0],observeZ:observeAt.current[1]}),
      }),data=(await response.json()) as PopulationResponse;
      if(data.world){current.current=data.world;setWorld(data.world);}
      if(!response.ok)throw new Error(data.error||'推进失败');
      setError('');
    }catch(error){setPlaying(false);setError(error instanceof Error?error.message:'推进未确认；请刷新存档');}
    finally{locked.current=false;setBusy(false);}
  },[]);
  const submitEvent=useCallback(async(eventText:string)=>{
    if(locked.current||!current.current||!eventText.trim())return;
    locked.current=true;setBusy(true);
    try{
      const response=await fetch('/api/population',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({eventText:eventText.trim(),revision:current.current.revision,operationId:crypto.randomUUID(),observeX:observeAt.current[0],observeZ:observeAt.current[1]})});
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
      const response=await fetch('/api/population',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({marketSnapshot,revision:current.current.revision,operationId:crypto.randomUUID(),observeX:observeAt.current[0],observeZ:observeAt.current[1]})});
      const data=(await response.json()) as PopulationResponse;
      if(data.world){current.current=data.world;setWorld(data.world);}
      if(!response.ok)throw Error(data.error||'Market ingestion failed');
      setError('');
    }catch(error){setError(error instanceof Error?error.message:'Market ingestion failed');}
    finally{locked.current=false;setBusy(false);}
  },[]);
  useEffect(()=>{
    if(!playing)return;
    const timer=setInterval(()=>{if(!document.hidden)void advance(15);},5000);
    return()=>clearInterval(timer);
  },[playing,advance]);
  return {world,error,busy,playing,setPlaying,advance,submitEvent,submitMarket,load,loadArea};
}

export type PopulationController=ReturnType<typeof usePopulation>;
