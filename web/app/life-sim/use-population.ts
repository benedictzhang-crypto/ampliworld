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
    areaRequest=useRef(0),
    areaAbort=useRef<AbortController|null>(null);
  current.current=world;
  const loadArea=useCallback(async(x:number,z:number)=>{
    observeAt.current=[x,z];
    const request=++areaRequest.current;
    areaAbort.current?.abort();
    const abort=new AbortController();
    areaAbort.current=abort;
    const timeout=setTimeout(()=>abort.abort(),20000);
    try{
      const response=await fetch(`/api/population?x=${Math.round(x)}&z=${Math.round(z)}`,{cache:'no-store',signal:abort.signal}),
        data=(await response.json()) as PopulationResponse;
      if(request!==areaRequest.current)return;
      if(!response.ok||!data.world)throw new Error(data.error||'Area stream failed');
      // An earlier GET must not overwrite a newer simulation action.
      if(current.current && data.world.revision < current.current.revision)return;
      current.current=data.world;setWorld(data.world);setError('');
    }catch(error){if(request===areaRequest.current)setError(abort.signal.aborted?'Resident loading timed out. Retry; city controls remain available.':error instanceof Error?error.message:'Area stream failed');}
    finally{clearTimeout(timeout);}
  },[]);
  const load=useCallback(()=>loadArea(...observeAt.current),[loadArea]);
  useEffect(()=>()=>{areaRequest.current++;areaAbort.current?.abort();},[]);
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
