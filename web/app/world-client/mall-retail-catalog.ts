/** Original virtual merchandise. Prices are simulation settings, not brand prices. */
export type WearSlot='top'|'bottom'|'shoes'|'bag'|'hat';
export type Product={sku:string;name:string;slot:WearSlot;shape:'jacket'|'shirt'|'trousers'|'sneakers'|'loafers'|'bag'|'cap';color:string;trim:string;price:number};
export const PRODUCTS:readonly Product[]=[
  {sku:'ivory-jacket',name:'Ivory tailored jacket',slot:'top',shape:'jacket',color:'#ded3b6',trim:'#805d35',price:48000},
  {sku:'noir-jacket',name:'Noir evening jacket',slot:'top',shape:'jacket',color:'#252d35',trim:'#b89859',price:62000},
  {sku:'sage-shirt',name:'Sage cotton shirt',slot:'top',shape:'shirt',color:'#66806a',trim:'#e6dcc5',price:8500},
  {sku:'coral-shirt',name:'Coral leisure shirt',slot:'top',shape:'shirt',color:'#b55c50',trim:'#f4e1c4',price:7500},
  {sku:'sand-trousers',name:'Sand tailored trousers',slot:'bottom',shape:'trousers',color:'#b49b78',trim:'#645842',price:14000},
  {sku:'slate-trousers',name:'Slate travel trousers',slot:'bottom',shape:'trousers',color:'#45535c',trim:'#849ba2',price:12500},
  {sku:'white-sneakers',name:'Cloud leather sneakers',slot:'shoes',shape:'sneakers',color:'#e8e4d7',trim:'#7b938c',price:18000},
  {sku:'copper-loafers',name:'Copper leather loafers',slot:'shoes',shape:'loafers',color:'#7b4b31',trim:'#cda85e',price:24000},
  {sku:'cobalt-bag',name:'Cobalt crossbody bag',slot:'bag',shape:'bag',color:'#315a91',trim:'#c9a45c',price:32000},
  {sku:'tan-bag',name:'Tan city satchel',slot:'bag',shape:'bag',color:'#9e683f',trim:'#e0be70',price:38000},
  {sku:'sage-cap',name:'Sage weekend cap',slot:'hat',shape:'cap',color:'#52684c',trim:'#e4d7b8',price:5500},
];
export const PRODUCT_BY_SKU=Object.fromEntries(PRODUCTS.map(p=>[p.sku,p])) as Record<string,Product>;
export const PILOT_SHOPS=['chanel-tailoring','balenciaga','dior','hermes','loewe','shoe-salon'] as const;
export const COLLECTIONS={tailored:['ivory-jacket','noir-jacket','sand-trousers','copper-loafers'],weekend:['sage-shirt','coral-shirt','slate-trousers','white-sneakers','sage-cap'],travel:['cobalt-bag','tan-bag','white-sneakers','slate-trousers']} as const;
export type Collection=keyof typeof COLLECTIONS;
export const PALETTES={original:{name:'Original concept',stone:'#c4baa2',wood:'#624631',accent:'#a08754'},ivory:{name:'Ivory & champagne',stone:'#d4cdbc',wood:'#947354',accent:'#b49a65'},noir:{name:'Noir & bronze',stone:'#3b4144',wood:'#44372c',accent:'#b38748'},sage:{name:'Sage & oak',stone:'#a2aa96',wood:'#8e7150',accent:'#b39c6c'}} as const;
export type Palette=keyof typeof PALETTES;
export const defaultCollection=(id:string):Collection=>id==='hermes'||id==='loewe'?'travel':id==='balenciaga'||id==='shoe-salon'?'weekend':'tailored';
export const isPilot=(id:string)=>PILOT_SHOPS.some(s=>s===id);
