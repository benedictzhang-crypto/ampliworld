/** Physical retail capacity planned for a 30,000-resident first operating district. */
export const RETAIL_CAMPUSES=[
  ...[[-420,-320],[420,-420],[900,650],[-920,820],[5220,3220],[-1420,8220]].map((p,i)=>({id:`WF-${i+1}`,name:'Whole Foods Market',kind:'premium-grocery',x:p[0],z:p[1],w:54,d:38,staff:42})),
  ...[[-620,260],[680,240],[5480,3500],[-1180,8580]].map((p,i)=>({id:`TARGET-${i+1}`,name:'Target',kind:'department-store',x:p[0],z:p[1],w:78,d:52,staff:58})),
  ...[[1180,1100],[-1800,7600]].map((p,i)=>({id:`WALMART-${i+1}`,name:'Walmart',kind:'hypermarket',x:p[0],z:p[1],w:94,d:62,staff:72})),
  {id:'HOMEDEPOT-1',name:'The Home Depot',kind:'home-improvement',x:-1450,z:1650,w:98,d:64,staff:55},
  {id:'SAMS-1',name:"Sam's Club",kind:'warehouse-club',x:1650,z:1780,w:106,d:68,staff:62},
  ...[[760,-980],[5100,3700],[-1550,8020]].map((p,i)=>({id:`DAHUA-${i+1}`,name:'88 Ranch Market',kind:'asian-grocery',x:p[0],z:p[1],w:60,d:42,staff:38})),
] as const;

export const CITY_CINEMAS=[
  {id:'CINEMA-CBD',name:'Aurea Cinema',x:0,z:-188,auditoriums:12,staff:38},
  {id:'CINEMA-EAST',name:'East Arc Cinema',x:5400,z:3400,auditoriums:10,staff:30},
  {id:'CINEMA-RIVER',name:'Riverlight Cinema',x:-1300,z:8400,auditoriums:9,staff:27},
  {id:'CINEMA-SOUTH',name:'Southgate Cinema',x:1100,z:7200,auditoriums:8,staff:24},
] as const;

export const FOOD_VENUES=[
  {id:'TRUCK-SCHOOL-1',name:'Campus Noodle Truck',type:'food-truck',x:-30,z:82,price:900,staff:3},
  {id:'TRUCK-SCHOOL-2',name:'Library Taco Truck',type:'food-truck',x:18,z:88,price:1100,staff:3},
  {id:'TRUCK-CBD-1',name:'CBD Rice Bowl Truck',type:'food-truck',x:-82,z:-32,price:1200,staff:3},
  {id:'TRUCK-EAST-1',name:'East Arc Street Kitchen',type:'food-truck',x:5260,z:3460,price:1400,staff:3},
  {id:'SKY-DINE-CBD',name:'Aurea Skyline Dining',type:'sky-restaurant',x:110,z:-120,price:26000,staff:22},
  {id:'SKY-DINE-EAST',name:'East Crown Restaurant',type:'sky-restaurant',x:5400,z:3400,price:18800,staff:18},
  {id:'SKY-DINE-RIVER',name:'Riverlight Table',type:'sky-restaurant',x:-1300,z:8400,price:16800,staff:16},
] as const;

export const RETAIL_PLANNING={population:30000,totalStores:RETAIL_CAMPUSES.length,wholeFoods:6,target:4,walmart:2,homeDepot:1,samsClub:1,ranchMarket:3,cinemas:CITY_CINEMAS.length} as const;
