'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, Sky, Stars } from '@react-three/drei';
import { Banknote, Car, Home, Map, Menu, Shirt, ShoppingBag, Smile, Trophy, WalletCards, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

type Place = 'market' | 'fashion' | 'restaurant' | 'property' | null;
const stocks = [{ symbol: 'NVDA', price: 184.26, move: 2.84 }, { symbol: 'AAPL', price: 238.41, move: 1.12 }, { symbol: 'LVMUY', price: 134.08, move: .76 }, { symbol: 'UUP', price: 27.16, move: -.38 }];

function Building({ position, size, color, glow, label, place, onEnter }: { position:[number,number,number], size:[number,number,number], color:string, glow:string, label:string, place?:Place, onEnter?:(p:Place)=>void }) {
  return <group position={position} onClick={() => place && onEnter?.(place)}>
    <mesh castShadow receiveShadow position={[0,size[1]/2,0]}><boxGeometry args={size}/><meshStandardMaterial color={color} metalness={.55} roughness={.3} emissive={glow} emissiveIntensity={.22}/></mesh>
    {Array.from({length:Math.max(2,Math.floor(size[1]))}).map((_,i)=><mesh key={i} position={[0,size[1]-.55-i*.78,size[2]/2+.011]}><planeGeometry args={[size[0]*.72,.18]}/><meshBasicMaterial color={i%2?'#39f4ba':'#79a8ff'}/></mesh>)}
    <Html position={[0,size[1]+.45,0]} center distanceFactor={13}><button className={place?'world-label enterable':'world-label'} onClick={() => place && onEnter?.(place)}>{label}</button></Html>
  </group>;
}

function Player() {
  const body=useRef<THREE.Group>(null); const keys=useRef<Record<string,boolean>>({}); const {camera}=useThree();
  useEffect(()=>{const down=(e:KeyboardEvent)=>keys.current[e.key.toLowerCase()]=true;const up=(e:KeyboardEvent)=>keys.current[e.key.toLowerCase()]=false;window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up)}},[]);
  useFrame((_,dt)=>{if(!body.current)return;const k=keys.current;const dx=(k.d?1:0)-(k.a?1:0);const dz=(k.s?1:0)-(k.w?1:0);if(dx||dz){const v=new THREE.Vector3(dx,0,dz).normalize().multiplyScalar(dt*5);body.current.position.add(v);body.current.position.x=THREE.MathUtils.clamp(body.current.position.x,-19,19);body.current.position.z=THREE.MathUtils.clamp(body.current.position.z,-16,18);body.current.rotation.y=Math.atan2(v.x,v.z)}const target=body.current.position.clone().add(new THREE.Vector3(0,5.8,8));camera.position.lerp(target,.07);camera.lookAt(body.current.position.clone().add(new THREE.Vector3(0,1,0))) });
  return <group ref={body} position={[0,0,5]}><mesh castShadow position={[0,.8,0]}><capsuleGeometry args={[.38,.9,6,12]}/><meshStandardMaterial color="#e7fff5" metalness={.65} roughness={.22} emissive="#27e8a1" emissiveIntensity={.25}/></mesh><mesh castShadow position={[0,1.65,0]}><sphereGeometry args={[.34,20,20]}/><meshStandardMaterial color="#182c25" metalness={.8}/></mesh><mesh position={[0,1.68,.32]}><boxGeometry args={[.36,.09,.04]}/><meshBasicMaterial color="#4af7b5"/></mesh></group>;
}

function World({onEnter}:{onEnter:(p:Place)=>void}) {
  const towers:[number,number,number][]=[[-8,0,-6],[-5,0,-10],[5,0,-9],[9,0,-5],[-11,0,2],[11,0,2]];
  return <><Sky sunPosition={[1,.15,-1]} turbidity={8} rayleigh={1.4}/><Stars radius={70} depth={45} count={1400} factor={2}/><ambientLight intensity={.48}/><directionalLight castShadow position={[6,14,7]} intensity={2.4} color="#d9fff1"/>
    <mesh receiveShadow rotation={[-Math.PI/2,0,0]}><planeGeometry args={[50,44]}/><meshStandardMaterial color="#091511" roughness={.84}/></mesh>
    <mesh receiveShadow position={[0,.015,1]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[9,42]}/><meshStandardMaterial color="#14201e"/></mesh>
    {[-2.5,0,2.5].map(x=><mesh key={x} position={[x,.03,1]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.08,42]}/><meshBasicMaterial color="#36eaa5"/></mesh>)}
    {towers.map((p,i)=><Building key={i} position={p} size={[2.8,5+i%3*1.3,2.8]} color="#112722" glow="#1d9c72" label={i===1?'WORLD EXCHANGE':i===2?'AMPLIALPHA':'CYBER CBD'} />)}
    <Building position={[-4,0,1]} size={[3.3,3.1,3]} color="#162b27" glow="#22e69e" label="STOCK EXCHANGE" place="market" onEnter={onEnter}/>
    <Building position={[4,0,2]} size={[3,2.6,2.8]} color="#291b36" glow="#c366ff" label="NEON ATELIER" place="fashion" onEnter={onEnter}/>
    <Building position={[-4,0,8]} size={[3.1,2.2,2.8]} color="#36241a" glow="#ff9d45" label="NOVA DINING" place="restaurant" onEnter={onEnter}/>
    <Building position={[5,0,9]} size={[3.4,3.8,3]} color="#172b36" glow="#4dbdff" label="SKYLINE REALTY" place="property" onEnter={onEnter}/>
    <group position={[-14,0,-11]}><mesh position={[0,.3,0]}><cylinderGeometry args={[5,6,.6,32]}/><meshStandardMaterial color="#b59b6b"/></mesh><mesh position={[0,.15,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[8,32]}/><meshStandardMaterial color="#176171" transparent opacity={.8}/></mesh><Html position={[0,2,0]} center distanceFactor={14}><span className="zone-label">ISLAND DISTRICT</span></Html></group>
    <group position={[15,0,-11]}><mesh position={[0,.4,0]}><boxGeometry args={[8,.8,7]}/><meshStandardMaterial color="#2d211d"/></mesh><Html position={[0,2,0]} center distanceFactor={14}><span className="zone-label war">WAR ZONE · LOCKED</span></Html></group>
    <group position={[-14,0,13]}>{[-2,0,2].map(x=><mesh key={x} position={[x,.5,0]}><coneGeometry args={[1.1,2.3,8]}/><meshStandardMaterial color="#25452c"/></mesh>)}<Html position={[0,2.5,0]} center distanceFactor={14}><span className="zone-label">COUNTRYSIDE</span></Html></group>
    <Player/><Environment preset="night"/>
  </>;
}

export function GameShell({playerName,signedIn,signInPath}:{playerName:string;signedIn:boolean;signInPath:string}) {
  const [cash,setCash]=useState(10000),[portfolio,setPortfolio]=useState(0),[happiness,setHappiness]=useState(52),[place,setPlace]=useState<Place>(null),[inventory,setInventory]=useState<string[]>([]),[tax,setTax]=useState(0),[notice,setNotice]=useState('WASD TO MOVE · CLICK A BUILDING TO ENTER');
  useEffect(()=>{if(signedIn)fetch('/api/game').then(r=>r.ok?r.json():null).then(d=>{if(d){setCash(d.cash);setPortfolio(d.portfolioValue)}})},[signedIn]);
  const spend=(price:number,item:string,joy:number)=>{const fee=Math.round(price*.02);if(cash<price+fee)return setNotice('YOU NEED MORE CASH — RETURN TO THE MARKET');setCash(v=>v-price-fee);setTax(v=>v+fee);setHappiness(v=>Math.min(100,v+joy));setInventory(v=>[...v,item]);setNotice(`${item.toUpperCase()} ACQUIRED · $${fee} CITY TAX PAID`)};
  const buyStock=async(symbol:string)=>{if(cash<500)return setNotice('INSUFFICIENT CASH');if(signedIn){const r=await fetch('/api/game',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'buy',symbol,notional:500})});const d=await r.json();if(r.ok){setCash(d.cash);setPortfolio(d.portfolioValue)}}else{setCash(v=>v-500);setPortfolio(v=>v+500)}setNotice(`BOUGHT $500 ${symbol} · POSITION ADDED`)};
  return <main className="game"><header><div className="logo">A</div><div><b>AMPLIWORLD</b><small>THE LIVING MARKET</small></div><div className="day">DAY 001 · 20:42 · CYBER CITY</div><div className="player"><span>{playerName}</span>{signedIn?<i>ONLINE</i>:<a href={signInPath} target="_top">SIGN IN TO SAVE</a>}</div></header>
    <section className="playfield"><Canvas shadows camera={{position:[0,6,13],fov:50}}><World onEnter={setPlace}/></Canvas><div className="mission"><small>PRIMARY MISSION</small><b>Turn $10,000 into a life worth living.</b><span>{notice}</span></div><div className="controls"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> MOVE · DRAG TO LOOK</div>
      <aside className="hud"><div><WalletCards/><span>CASH<big>${cash.toLocaleString()}</big></span></div><div><Banknote/><span>PORTFOLIO<big>${portfolio.toLocaleString()}</big></span></div><div><Smile/><span>HAPPINESS<big>{happiness}%</big></span></div><div><Trophy/><span>CITY RANK<big>#8,214</big></span></div></aside>
      <nav><button><Map/>MAP</button><button onClick={()=>setPlace('market')}><Banknote/>TRADE</button><button><Home/>HOME</button><button><Car/>GARAGE</button><button><ShoppingBag/>ITEMS <em>{inventory.length}</em></button><button><Menu/>MENU</button></nav>
      {place&&<div className="modal"><button className="close" onClick={()=>setPlace(null)}><X/></button>{place==='market'&&<><small>CYBER CITY EXCHANGE</small><h1>Trade the living world</h1><p>World events move this virtual market. Build wealth, unlock the city.</p><div className="stock-grid">{stocks.map(s=><button key={s.symbol} onClick={()=>buyStock(s.symbol)}><b>{s.symbol}</b><span>${s.price}</span><i className={s.move>0?'gain':'loss'}>{s.move>0?'+':''}{s.move}%</i><em>BUY $500</em></button>)}</div></>}{place==='fashion'&&<><small>NEON ATELIER</small><h1>Wear your success</h1><p>Skins are visible status. Purchases add happiness and fund the city.</p><div className="goods"><button onClick={()=>spend(180,'Midnight Trader Jacket',8)}><Shirt/><b>Midnight Trader Jacket</b><span>$180 + 2% tax</span></button><button onClick={()=>spend(480,'Founder Skin',15)}><Shirt/><b>Founder Skin</b><span>$480 + 2% tax</span></button></div></>}{place==='restaurant'&&<><small>NOVA DINING</small><h1>Tonight&apos;s table</h1><p>Celebrate a green day—or spend carefully after a red one.</p><div className="goods"><button onClick={()=>spend(42,'Skyline Dinner',6)}><b>Skyline Dinner</b><span>$42 + 2% tax</span></button><button onClick={()=>spend(160,'Investor Tasting Menu',12)}><b>Investor Tasting Menu</b><span>$160 + 2% tax</span></button></div></>}{place==='property'&&<><small>SKYLINE REALTY</small><h1>Turn returns into a skyline</h1><p>Your starter apartment has 364 days left. Premium homes are permanent assets.</p><div className="property"><Home/><div><b>Cloudline Penthouse</b><span>$2,500,000 · Requires City Rank 100</span></div><i>LOCKED</i></div></>}</div>}
    </section><footer><span>NET WORTH <b>${(cash+portfolio).toLocaleString()}</b></span><span>INVENTORY <b>{inventory.length} ITEMS</b></span><span>CITY TREASURY CONTRIBUTION <b>${tax}</b></span><span>STARTER APARTMENT <b>364 DAYS</b></span></footer>
  </main>;
}
