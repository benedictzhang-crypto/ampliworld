import {COLLECTIONS,PALETTES,PRODUCT_BY_SKU,defaultCollection,isPilot,type Collection,type Palette,type WearSlot} from './mall-retail-catalog';
import plan from './mall-tenants-plan.json';
import spatial from './mall-spatial-plan.json';
export const RETAIL_STORAGE_KEY='ampliworld-exploration-retail-v1';
export const STARTING_WALLET=1000000;
export type UnitFitout={name:string;collection:Collection;palette:Palette;revision:number};
export type Receipt={id:number;unit:string;sku:string;price:number};
export type RetailState={version:1;receipts:Receipt[];equipped:Partial<Record<WearSlot,string>>;units:Record<string,UnitFitout>};
export type RetailAction={type:'buy';unit:string;sku:string;position:[number,number,number]}|{type:'equip';sku:string}|{type:'unequip';slot:WearSlot}|{type:'fitout';unit:string;name:string;collection:Collection;palette:Palette}|{type:'restore-unit';unit:string};
export const initialRetailState=():RetailState=>({version:1,receipts:[],equipped:{},units:{}});
export const wallet=(s:RetailState)=>STARTING_WALLET-s.receipts.reduce((n,r)=>n+r.price,0);
export const owns=(s:RetailState,sku:string)=>s.receipts.some(r=>r.sku===sku);
export const unitSettings=(s:RetailState,id:string):UnitFitout=>s.units[id]??{name:plan.shops.find(p=>p.id===id)?.name??id,collection:defaultCollection(id),palette:'original',revision:0};
export const stock=(s:RetailState,unit:string,sku:string)=>3-s.receipts.filter(r=>r.unit===unit&&r.sku===sku).length;
export function nearUnit(id:string,position:readonly number[]){
  const u=plan.shops.find(p=>p.id===id);if(!u)return false;
  const y=u.level==='B1'?-7.2:spatial.floors.find(f=>f.id===u.level)!.y;
  return Math.abs(position[0]-u.x)<u.w/2+3&&Math.abs(position[2]-(u.z-188))<u.d/2+3&&Math.abs(position[1]-y)<2;
}
export function transact(s:RetailState,a:RetailAction):{state:RetailState;message:string}{
  if(a.type==='buy'){
    const p=PRODUCT_BY_SKU[a.sku],unit=unitSettings(s,a.unit);
    if(!isPilot(a.unit)||!nearUnit(a.unit,a.position))return {state:s,message:'Visit this store entrance before buying.'};
    if(!p||!(COLLECTIONS[unit.collection] as readonly string[]).includes(a.sku))return {state:s,message:'This item is no longer offered by this store.'};
    if(owns(s,a.sku))return {state:s,message:'Already in your wardrobe. No second charge.'};
    if(stock(s,a.unit,a.sku)<1)return {state:s,message:'Out of stock.'};
    if(wallet(s)<p.price)return {state:s,message:'Insufficient virtual balance.'};
    return {state:{...s,receipts:[...s.receipts,{id:s.receipts.length+1,unit:a.unit,sku:p.sku,price:p.price}]},message:p.name+' purchased. Open Wardrobe to wear it.'};
  }
  if(a.type==='equip'){
    const p=PRODUCT_BY_SKU[a.sku];if(!p||!owns(s,p.sku))return {state:s,message:'Purchase this item before wearing it.'};
    return {state:{...s,equipped:{...s.equipped,[p.slot]:p.sku}},message:p.name+' equipped.'};
  }
  if(a.type==='unequip'){
    const equipped={...s.equipped};delete equipped[a.slot];return {state:{...s,equipped},message:'Starter item restored.'};
  }
  if(!isPilot(a.unit))return {state:s,message:'This unit is not enabled for the retail pilot.'};
  const units={...s.units};
  if(a.type==='restore-unit'){delete units[a.unit];return {state:{...s,units},message:'Original tenant restored; purchases and ownership retained.'};}
  if(!Object.hasOwn(COLLECTIONS,a.collection)||!Object.hasOwn(PALETTES,a.palette))return {state:s,message:'Invalid renovation preset.'};
  const name=a.name.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,40);
  if(!name)return {state:s,message:'Enter a store name.'};
  units[a.unit]={name,collection:a.collection,palette:a.palette,revision:unitSettings(s,a.unit).revision+1};
  return {state:{...s,units},message:'Tenant, stock and finish updated. Structural walls and exits are unchanged.'};
}
/** Fail closed on malformed saves; this local sandbox is not an authoritative wallet. */
export function parseRetailSave(raw:string|null):RetailState{
  if(!raw)return initialRetailState();
  try{
    const v=JSON.parse(raw);if(v?.version!==1||!Array.isArray(v.receipts)||v.receipts.length>100)return initialRetailState();
    const s=initialRetailState();
    for(const r of v.receipts){
      const p=PRODUCT_BY_SKU[r.sku];
      if(!p||!isPilot(r.unit)||r.price!==p.price||owns(s,r.sku))continue;
      if(wallet(s)<r.price)continue;
      s.receipts.push({id:s.receipts.length+1,unit:r.unit,sku:r.sku,price:r.price});
    }
    for(const sku of Object.values(v.equipped??{}))if(typeof sku==='string'&&PRODUCT_BY_SKU[sku]&&owns(s,sku))s.equipped[PRODUCT_BY_SKU[sku].slot]=sku;
    for(const [id,u] of Object.entries(v.units??{}) as [string,any][])if(isPilot(id)&&u&&typeof u.name==='string'&&typeof u.collection==='string'&&typeof u.palette==='string'&&Object.hasOwn(COLLECTIONS,u.collection)&&Object.hasOwn(PALETTES,u.palette)){
      s.units[id]={name:u.name.replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,40),collection:u.collection as Collection,palette:u.palette as Palette,revision:Number.isSafeInteger(u.revision)&&u.revision>=0?u.revision:0};
    }
    return s;
  }catch{return initialRetailState();}
}
