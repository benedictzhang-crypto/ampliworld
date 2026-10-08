'use client';
import {useRef,useState,useEffect} from 'react';
import {PILOT_SHOPS,PRODUCT_BY_SKU,COLLECTIONS,PALETTES,type Product,type Collection,type Palette,type WearSlot} from './mall-retail-catalog';
import {wallet,owns,stock,unitSettings,nearUnit,type RetailState,type RetailAction} from './mall-retail-state';
import plan from './mall-tenants-plan.json';
import spatial from './mall-spatial-plan.json';
import './mall-retail.css';
const money=(n:number)=>'$'+(n/100).toLocaleString('en-US',{minimumFractionDigits:2});
function ProductCardArt({p}:{p:Product}){
 return <svg viewBox="0 0 180 130" role="img" aria-label={p.name} className="retail-product-art"><ellipse cx="90" cy="117" rx="55" ry="6" fill="#30291c16"/>
 {p.slot==='top'?<><path d="M64 20 40 32 20 66 40 78 56 56 56 110 124 110 124 56 140 78 160 66 140 32 116 20 105 32 75 32Z" fill={p.color} stroke={p.trim} strokeWidth="2"/><path d="m65 23 15 38 10-20 10 20 15-38M90 40v68" fill="none" stroke={p.trim} strokeWidth="3"/></>:
 p.slot==='bottom'?<path d="M58 15h64l7 99h-30l-9-58-9 58H51Z" fill={p.color} stroke={p.trim} strokeWidth="3"/>:
 p.slot==='shoes'?<><path d="m25 65 35-12 24 28 48 6q24 6 24 21H25Z" fill={p.color} stroke={p.trim} strokeWidth="3"/><path d="M26 104h126M66 73l14-6m-4 15 13-6" stroke={p.trim} strokeWidth="5"/></>:
 p.slot==='bag'?<><rect x="42" y="45" width="96" height="65" rx="12" fill={p.color}/><path d="M66 49V35q24-35 48 0v14" fill="none" stroke={p.trim} strokeWidth="6"/><rect x="84" y="69" width="13" height="10" fill={p.trim}/></>:
 <><path d="M47 85q0-75 86-45v45Z" fill={p.color}/><path d="M42 83h96l24 15H50Z" fill={p.trim}/></>}
 </svg>;
}
export function MallRetailPanel({state,ready,notice,dispatch,position,onVisit,onOpenChange,selection}:{state:RetailState;ready:boolean;notice:string;dispatch:(a:RetailAction)=>void;position:[number,number,number];onVisit:(x:number,z:number,y:number)=>void;onOpenChange:(v:boolean)=>void;selection?:{unit:string;sku:string;nonce:number}|null}){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [tab,setTab]=useState<'shop'|'wardrobe'|'studio'>('shop'),[unit,setUnit]=useState<string>('chanel-tailoring');
 const [name,setName]=useState(''),[collection,setCollection]=useState<Collection>('tailored'),[palette,setPalette]=useState<Palette>('original');
 const settings=unitSettings(state,unit),u=plan.shops.find(s=>s.id===unit)!;
 useEffect(()=>{if(!selection)return;setUnit(selection.unit);setTab('shop');dialog.current?.showModal();onOpenChange(true);},[selection,onOpenChange]);
 useEffect(()=>{setName(settings.name);setCollection(settings.collection);setPalette(settings.palette);},[unit,settings.name,settings.collection,settings.palette]);
 function open(){const near=PILOT_SHOPS.find(id=>nearUnit(id,position));if(near)setUnit(near);dialog.current?.showModal();onOpenChange(true);}
 function close(){dialog.current?.close();}
 const items=tab==='wardrobe'?state.receipts.map(r=>r.sku):[...COLLECTIONS[settings.collection]];
 const canBuy=nearUnit(unit,position);
 return <><button onClick={open} ref={trigger}>Shopping & wardrobe</button>
 <dialog className="retail-dialog" ref={dialog} aria-labelledby="retail-title" onClose={()=>{onOpenChange(false);trigger.current?.focus();}}>
 <header><div><small>AUREA · EXPLORATION RETAIL PILOT</small><h2 id="retail-title">Shop. Style. Reimagine.</h2></div><button aria-label="Close shopping" onClick={close}>×</button></header>
 <div className="retail-wallet"><span>Virtual balance <strong>{money(wallet(state))}</strong></span><small>Local sandbox · no real payments · separate from resident accounts</small></div>
 <nav aria-label="Retail sections">{(['shop','wardrobe','studio'] as const).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>setTab(t)}>{t==='shop'?'Shop':t==='wardrobe'?'Wardrobe':'Renovation studio'}</button>)}</nav>
 {tab!=='wardrobe'&&<div className="retail-unit"><label>Physical shop<select aria-label="Physical shop" value={unit} onChange={e=>setUnit(e.target.value)}>{PILOT_SHOPS.map(id=><option key={id} value={id}>{unitSettings(state,id).name} · {plan.shops.find(p=>p.id===id)!.level}</option>)}</select></label><button onClick={()=>{const front=u.z<0?1:-1;onVisit(u.x,u.z+front*(u.d/2+2)-188,spatial.floors.find(f=>f.id===u.level)!.y);close();}}>Visit entrance</button></div>}
 {tab==='shop'&&<p>{canBuy?'You are at this store. Purchases go to your wardrobe.':'Browse anywhere; visit this store entrance to purchase.'} {selection?.unit===unit&&PRODUCT_BY_SKU[selection.sku]?'Selected: '+PRODUCT_BY_SKU[selection.sku].name+'. ':''}Original virtual products and scenario prices—not official brand merchandise.</p>}
 {tab==='studio'?<section className="retail-studio"><p>Change one pilot unit without changing walls, doors or neighbours. These changes are saved only in this browser.</p>
 <label>Tenant name<input aria-label="Tenant name" value={name} maxLength={40} onChange={e=>setName(e.target.value)}/></label>
 <label>Merchandise collection<select aria-label="Merchandise collection" value={collection} onChange={e=>setCollection(e.target.value as Collection)}>{Object.keys(COLLECTIONS).map(c=><option key={c}>{c}</option>)}</select></label>
 <label>Interior finish<select aria-label="Interior finish" value={palette} onChange={e=>setPalette(e.target.value as Palette)}>{Object.entries(PALETTES).map(([id,p])=><option key={id} value={id}>{p.name}</option>)}</select></label>
 <div className="retail-materials">{[PALETTES[palette].stone,PALETTES[palette].wood,PALETTES[palette].accent].map(c=><span key={c} style={{background:c}}/>)}</div>
 <button disabled={!ready} onClick={()=>dispatch({type:'fitout',unit,name,collection,palette})}>Apply renovation & stock</button><button onClick={()=>dispatch({type:'restore-unit',unit})}>Restore original unit</button>
 <small>Stable unit: {unit} · Revision {settings.revision}. Existing purchased items are retained when stock changes. Floor plans and service workflows are not changed by this editor.</small>
 </section>:<div className="retail-products">{items.length===0?<p>Your wardrobe is empty. Visit a pilot store to buy your first item.</p>:items.map(sku=>{const p=PRODUCT_BY_SKU[sku],owned=owns(state,sku),worn=state.equipped[p.slot]===sku;return <article key={sku}><ProductCardArt p={p}/><h3>{p.name}</h3><p>{tab==='shop'?money(p.price)+' · '+stock(state,unit,sku)+' in stock':p.slot+' · '+(worn?'Wearing':'Owned')}</p>{tab==='shop'?<button disabled={!ready||owned||!canBuy||wallet(state)<p.price} onClick={()=>dispatch({type:'buy',unit,sku,position})}>{owned?'Owned':`Buy · ${money(p.price)}`}</button>:<button disabled={worn} onClick={()=>dispatch({type:'equip',sku})}>{worn?'Wearing now':'Wear item'}</button>}</article>;})}</div>}
 {tab==='wardrobe'&&<div className="retail-reset">{Object.entries(state.equipped).map(([slot])=><button key={slot} onClick={()=>dispatch({type:'unequip',slot:slot as WearSlot})}>Remove {slot}</button>)}</div>}
 <p className="retail-notice" role="status">{notice||'Purchased items, outfit and renovations are saved in this browser.'}</p>
 </dialog></>;
}
