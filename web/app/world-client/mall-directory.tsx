'use client';
import {useRef,useState} from 'react';
import {TOUR_DESTINATIONS,type TourDestination} from './tour-destinations';
import spatial from './mall-spatial-plan.json';
import './mall-directory.css';
const entries=TOUR_DESTINATIONS.filter(d=>d.id.startsWith('GC-MALL-'));
function floor(d:TourDestination){if((d.arrivalY??0)<0)return 'B1';if((d.arrivalY??0)>50)return 'RF';return spatial.floors.find(f=>Math.abs(f.y-(d.arrivalY??.17))<.5)?.id??'L1';}
export function MallDirectory({onVisit}:{onVisit:(d:TourDestination)=>void}){
  const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const [query,setQuery]=useState(''),[level,setLevel]=useState('ALL');
  const shown=entries.filter(d=>(level==='ALL'||floor(d)===level)&&d.searchText.includes(query.toLowerCase()));
  return <><button ref={trigger} onClick={()=>dialog.current?.showModal()}>Mall directory · 商场导览</button>
    <dialog className="mall-directory" ref={dialog} onClose={()=>trigger.current?.focus()} aria-labelledby="mall-directory-title">
      <header><div><small>AUREA GALLERIA · 380 × 170 M</small><h2 id="mall-directory-title">Explore the mall</h2></div><button aria-label="Close mall directory" onClick={()=>dialog.current?.close()}>×</button></header>
      <p>Choose a floor, find a store and visit its entrance. Concept interiors; purchases and restaurant service are not connected.</p>
      <input autoFocus aria-label="Search mall stores" placeholder="Brand, food, books, golf…" value={query} onChange={e=>setQuery(e.target.value)}/>
      <div className="mall-floor-tabs" aria-label="Mall floors">{['ALL','B1','L1','L2','L3','L4','L5','L6','RF'].map(l=><button key={l} aria-pressed={level===l} onClick={()=>setLevel(l)}>{l}</button>)}</div>
      <div className="mall-directory-results">{shown.length===0?<p>No matching stores on this floor.</p>:shown.map(d=><button key={d.id} onClick={()=>{dialog.current?.close();onVisit(d);}}><span>{floor(d)}</span><div><strong>{d.name}</strong><small>{d.kind}</small></div><b aria-hidden>→</b></button>)}</div>
    </dialog></>;
}
