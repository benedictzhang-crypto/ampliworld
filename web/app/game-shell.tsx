'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, Float, OrbitControls, RoundedBox } from '@react-three/drei';
import { Bell, BriefcaseBusiness, Building2, ChartCandlestick, ChevronRight, Clock3, Home, Newspaper, Plane, ShoppingBag, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';

const stocks = [
  { symbol: 'NVDA', price: 184.26, move: 2.84, signal: 'World demand ↑' },
  { symbol: 'AAPL', price: 238.41, move: 1.12, signal: 'Devices ↑' },
  { symbol: 'LVMUY', price: 134.08, move: .76, signal: 'Luxury ↑' },
  { symbol: 'UUP', price: 27.16, move: -.38, signal: 'Dollar ↓' },
];

function ApartmentScene() {
  return <Canvas camera={{ position: [5.5, 4.1, 6], fov: 42 }} shadows>
    <color attach="background" args={['#07110f']} /><ambientLight intensity={.65} /><directionalLight castShadow position={[4, 7, 3]} intensity={2.2} color="#d9ffe9" />
    <group position={[0, -1.15, 0]}>
      <mesh receiveShadow><boxGeometry args={[7, .18, 5]} /><meshStandardMaterial color="#18231f" roughness={.82} /></mesh>
      <mesh receiveShadow position={[-3.4, 1.7, 0]}><boxGeometry args={[.16, 3.5, 5]} /><meshStandardMaterial color="#203029" /></mesh>
      <mesh receiveShadow position={[0, 1.7, -2.4]}><boxGeometry args={[7, 3.5, .16]} /><meshStandardMaterial color="#1b2924" /></mesh>
      <RoundedBox castShadow args={[3.2, .16, 1.35]} radius={.08} position={[.65, 1.18, -.55]}><meshStandardMaterial color="#4a3426" /></RoundedBox>
      {[-.65, 1.95].map((x) => <mesh castShadow key={x} position={[x, .5, -.55]}><boxGeometry args={[.12, 1.35, .12]} /><meshStandardMaterial color="#211b17" /></mesh>)}
      <Float speed={1.1} rotationIntensity={.05} floatIntensity={.08}>
        <RoundedBox castShadow args={[1.55, 1.05, .12]} radius={.06} position={[-.1, 1.95, -.55]}><meshStandardMaterial color="#07110f" emissive="#2cf4a0" emissiveIntensity={.18} /></RoundedBox>
        <RoundedBox castShadow args={[1.55, 1.05, .12]} radius={.06} position={[1.55, 1.95, -.55]}><meshStandardMaterial color="#07110f" emissive="#4e8cff" emissiveIntensity={.16} /></RoundedBox>
      </Float>
      <mesh position={[-.1, 1.95, -.47]}><planeGeometry args={[1.25,.72]} /><meshBasicMaterial color="#112d25" /></mesh>
      <mesh position={[1.55, 1.95, -.47]}><planeGeometry args={[1.25,.72]} /><meshBasicMaterial color="#111c31" /></mesh>
      <RoundedBox castShadow args={[2.15, .42, .9]} radius={.12} position={[-1.95, .55, 1.25]}><meshStandardMaterial color="#59635f" /></RoundedBox>
      <mesh position={[2.75, 1.28, -2.25]}><boxGeometry args={[.9, 1.65, .08]} /><meshStandardMaterial color="#89bed0" emissive="#3a89a3" emissiveIntensity={.25} /></mesh>
    </group><OrbitControls enablePan={false} minDistance={5.5} maxDistance={9} maxPolarAngle={1.46} /><Environment preset="city" />
  </Canvas>;
}

export function GameShell({ playerName, signedIn, signInPath }: { playerName: string; signedIn: boolean; signInPath: string }) {
  const [cash, setCash] = useState(10_000); const [portfolio, setPortfolio] = useState(0); const [selected, setSelected] = useState(stocks[0]); const [message, setMessage] = useState('Market opens in 01:42:16');
  useEffect(() => { if (!signedIn) return; fetch('/api/game').then(r => r.ok ? r.json() : null).then(data => { if (data) { setCash(data.cash); setPortfolio(data.portfolioValue); } }); }, [signedIn]);
  const buy = async () => {
    if (cash < 500) return setMessage('Not enough available cash.');
    if (!signedIn) { setCash(v => v - 500); setPortfolio(v => v + 500); return setMessage(`Guest preview: bought $500 of ${selected.symbol}. Sign in to save.`); }
    const response = await fetch('/api/game', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'buy', symbol: selected.symbol, notional: 500 }) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error ?? 'Order failed.');
    setCash(data.cash); setPortfolio(data.portfolioValue); setMessage(`Bought $500 of ${selected.symbol}. Position saved.`);
  };
  return <main className="game-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">A</span><div><strong>AMPLIWORLD</strong><small>TURN 001 · NEW YORK</small></div></div><div className="market-clock"><span className="live-dot" /> PRE-MARKET <b>{message}</b></div><div className="account"><Bell size={17} /><div><strong>{playerName}</strong><small>Level 1 · Resident</small></div>{signedIn ? <span className="online">ONLINE</span> : <a href={signInPath} target="_top">SIGN IN</a>}</div></header>
    <section className="viewport"><aside className="rail"><button className="active" aria-label="Apartment"><Home /></button><button aria-label="Markets"><ChartCandlestick /></button><button aria-label="World news"><Newspaper /></button><button aria-label="Career"><BriefcaseBusiness /></button><button aria-label="City"><Building2 /></button><button aria-label="Lifestyle"><ShoppingBag /></button><button aria-label="Travel"><Plane /></button></aside>
      <div className="world-view"><ApartmentScene /><div className="location-chip"><Home size={14} /> YOUR APARTMENT · LEASE 364 DAYS</div><div className="scene-hint">DRAG TO LOOK AROUND <span>·</span> SELECT THE DESK TO TRADE</div></div>
      <aside className="terminal"><div className="terminal-head"><div><small>WORLD MARKET</small><h1>Opportunity Desk</h1></div><Clock3 size={18} /></div><div className="wealth-card"><div><small>NET WORTH</small><strong>${(cash + portfolio).toLocaleString()}</strong></div><span>DAY 1</span><div className="wealth-split"><p>Cash <b>${cash.toLocaleString()}</b></p><p>Portfolio <b>${portfolio.toLocaleString()}</b></p></div></div>
        <div className="world-pulse"><span>WORLD PULSE</span><b>Risk appetite improving</b><p>Ceasefire talks and luxury demand are moving today&apos;s opportunity set.</p></div><div className="watchlist-title"><span>AMPLIWORLD SIGNALS</span><small>4 ASSETS</small></div><div className="watchlist">{stocks.map(stock => <button key={stock.symbol} onClick={() => setSelected(stock)} className={selected.symbol === stock.symbol ? 'selected' : ''}><div><b>{stock.symbol}</b><small>{stock.signal}</small></div><div><strong>${stock.price}</strong><span className={stock.move >= 0 ? 'up' : 'down'}>{stock.move >= 0 ? '+' : ''}{stock.move}%</span></div></button>)}</div>
        <div className="trade-ticket"><div><small>SELECTED</small><b>{selected.symbol}</b><span>Model conviction 68%</span></div><button onClick={buy}>BUY $500 <ChevronRight size={16} /></button></div></aside>
    </section><footer className="statusbar"><div><WalletCards size={14} /> STARTING CAPITAL <b>$10,000</b></div><div>CAREER <b>UNEMPLOYED</b> · 3 INTERVIEWS AVAILABLE</div><div className="objective">OBJECTIVE <b>BUILD WEALTH THROUGH THE MARKET</b></div></footer>
  </main>;
}
