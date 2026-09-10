'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Clone, Environment, Html, Sky, Stars, useAnimations, useGLTF } from '@react-three/drei';
import {
  Banknote,
  BriefcaseBusiness,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Home,
  Map as MapIcon,
  Menu,
  Newspaper,
  Shirt,
  ShoppingBag,
  Smile,
  Trophy,
  WalletCards,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

type Place = 'market' | 'fashion' | 'restaurant' | 'property' | 'career' | 'news' | 'map' | 'inventory' | 'menu' | 'villa' | null;
type Stock = {
  symbol: string;
  name: string;
  price: number;
  open: number;
  volatility: number;
  signal: string;
  sector: string;
};
type Holding = {
  symbol: string;
  quantity: number;
  avgPrice: number;
  leverage: number;
  marginPosted: number;
  borrowedAmount: number;
  liquidationPrice?: number;
};
type WorldEvent = {
  id: string;
  domain: string;
  headline: string;
  impacts: string[];
  marketImpacts?: Partial<Record<string, number>>;
};
type PlayerSnapshot = {
  cash?: unknown;
  happiness?: unknown;
  cityTax?: unknown;
  cityTaxPaid?: unknown;
  turn?: unknown;
  apartmentLeaseDays?: unknown;
  careerStatus?: unknown;
  grossExposure?: unknown;
  borrowedExposure?: unknown;
  marginUsed?: unknown;
  maintenanceMarginRequired?: unknown;
  marginExcess?: unknown;
  effectiveLeverage?: unknown;
  mansionEligible?: unknown;
  propertyValue?: unknown;
  accountStatus?: unknown;
  reliefEligible?: unknown;
  reliefClaimsRemaining?: unknown;
};
type GameApiResponse = PlayerSnapshot & {
  player?: PlayerSnapshot;
  holdings?: unknown;
  inventory?: unknown;
  market?: unknown;
  execution?: unknown;
  purchase?: unknown;
  career?: unknown;
  dayClose?: unknown;
  worldEvent?: unknown;
  relief?: unknown;
  error?: unknown;
};

const INITIAL_STOCKS: Stock[] = [
  { symbol: 'NVDA', name: 'Nvidia', price: 184.26, open: 179.17, volatility: 0.006, signal: 'AI infrastructure demand rising', sector: 'Technology' },
  { symbol: 'AAPL', name: 'Apple', price: 238.41, open: 235.77, volatility: 0.0035, signal: 'Device demand improving', sector: 'Consumer technology' },
  { symbol: 'LVMUY', name: 'LVMH', price: 134.08, open: 133.07, volatility: 0.0045, signal: 'Luxury traffic rising', sector: 'Luxury' },
  { symbol: 'UUP', name: 'Dollar Index ETF', price: 27.16, open: 27.26, volatility: 0.0018, signal: 'Dollar pressure increasing', sector: 'Currency' },
  { symbol: 'JETS', name: 'Airline ETF', price: 24.63, open: 24.28, volatility: 0.005, signal: 'Travel bookings expanding', sector: 'Travel' },
  { symbol: 'ITA', name: 'Aerospace ETF', price: 203.52, open: 205.11, volatility: 0.004, signal: 'Ceasefire risk repricing', sector: 'Defense' },
];

const WORLD_EVENTS: WorldEvent[] = [
  { id: 'ai-capex-wave', domain: 'TECHNOLOGY', headline: 'Global AI infrastructure orders accelerate', impacts: ['Semiconductor demand rises', 'Consumer technology sentiment improves'], marketImpacts: { NVDA: 0.027, AAPL: 0.006, UUP: -0.001 } },
  { id: 'ceasefire-talks', domain: 'GEOPOLITICS', headline: 'Ceasefire talks reduce immediate shipping risk', impacts: ['Air travel risk falls', 'Defense premium contracts'], marketImpacts: { JETS: 0.022, ITA: -0.019, UUP: -0.002 } },
  { id: 'luxury-traffic', domain: 'CONSUMER', headline: 'Luxury bookings and restaurant traffic rise', impacts: ['Premium consumption strengthens', 'Travel demand gains'], marketImpacts: { LVMUY: 0.024, JETS: 0.008, AAPL: 0.004 } },
  { id: 'rate-repricing', domain: 'MONETARY POLICY', headline: 'Rate expectations shift higher after inflation surprise', impacts: ['Dollar demand rises', 'Long-duration technology reprices'], marketImpacts: { UUP: 0.012, NVDA: -0.018, AAPL: -0.009 } },
  { id: 'shipping-disruption', domain: 'WAR & ENERGY', headline: 'Shipping disruption raises fuel and security costs', impacts: ['Airline margins compress', 'Defense demand increases'], marketImpacts: { JETS: -0.055, ITA: 0.023, UUP: 0.004 } },
  { id: 'travel-season', domain: 'TRAVEL', headline: 'International bookings exceed seasonal expectations', impacts: ['Airline utilization rises', 'Luxury destination spending improves'], marketImpacts: { JETS: 0.029, LVMUY: 0.008 } },
  { id: 'device-delay', domain: 'SUPPLY CHAIN', headline: 'Electronic component delays hit premium device production', impacts: ['Device shipments fall', 'Chip order timing becomes uncertain'], marketImpacts: { AAPL: -0.023, NVDA: -0.011, UUP: 0.002 } },
  { id: 'risk-off-session', domain: 'GLOBAL ECONOMY', headline: 'Growth concerns trigger a broad risk-off session', impacts: ['Equity risk appetite falls', 'Defensive dollar demand rises'], marketImpacts: { NVDA: -0.065, AAPL: -0.035, LVMUY: -0.05, JETS: -0.045, ITA: -0.006, UUP: 0.011 } },
];

const PLAYER_BLOCKERS = [
  [-8, -6, 1.8, 1.8], [-5, -10, 1.8, 1.8], [5, -9, 1.8, 1.8], [9, -5, 1.8, 1.8],
  [-11, 2, 1.8, 1.8], [11, 2, 1.8, 1.8], [-4, 1, 2.1, 2], [4, 2, 2, 1.9],
  [-4, 8, 2, 1.9], [5, 9, 2.2, 2], [0, -13, 2.7, 2],
] as const;

function readableString(value: unknown, fallback = ''): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : fallback;
}

function readableNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalizeHoldings(value: unknown): Holding[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const symbol = readableString(record.symbol);
    const quantity = readableNumber(record.quantity);
    const avgPrice = readableNumber(record.avgPrice ?? record.averagePrice ?? record.avg_price);
    const leverage = readableNumber(record.leverage, 1);
    const marketCost = quantity * avgPrice;
    const marginPosted = readableNumber(record.marginPosted, marketCost / Math.max(1, leverage));
    const borrowedAmount = readableNumber(record.borrowedAmount, Math.max(0, marketCost - marginPosted));
    const liquidationPrice = readableNumber(record.liquidationPrice, 0);
    return symbol && Number.isFinite(quantity) && Number.isFinite(avgPrice) ? [{ symbol, quantity, avgPrice, leverage, marginPosted, borrowedAmount, ...(liquidationPrice > 0 ? { liquidationPrice } : {}) }] : [];
  });
}

function normalizeInventory(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const name = readableString(record.name ?? record.displayName ?? record.itemName ?? record.item_name);
    return name ? [name] : [];
  });
}

function normalizeWorldEvent(value: unknown, fallback: WorldEvent): WorldEvent {
  const event = recordOf(value);
  if (!event) return fallback;
  const impacts = Array.isArray(event.impacts) ? event.impacts.map((impact) => readableString(impact)).filter(Boolean) : fallback.impacts;
  return {
    id: readableString(event.id, fallback.id),
    domain: readableString(event.domain, fallback.domain),
    headline: readableString(event.headline, fallback.headline),
    impacts,
  };
}

function mergeMarket(stocks: Stock[], value: unknown): Stock[] {
  if (!Array.isArray(value)) return stocks;
  const quotes = new Map(value.flatMap((item) => {
    const quote = recordOf(item);
    const symbol = readableString(quote?.symbol).toUpperCase();
    const price = readableNumber(quote?.price);
    const open = readableNumber(quote?.open, price);
    return symbol && price > 0 ? [[symbol, { price, open }] as const] : [];
  }));
  return stocks.map((stock) => {
    const quote = quotes.get(stock.symbol);
    return quote ? { ...stock, price: quote.price, open: quote.open } : stock;
  });
}

function Building({ position, size, color, glow, label, place, onEnter, assetUrl, assetScale = 1, assetRotation = [0, 0, 0], labelHeight }: {
  position: [number, number, number]; size: [number, number, number]; color: string; glow: string;
  label: string; place?: Place; onEnter?: (place: Place) => void;
  assetUrl?: string; assetScale?: number; assetRotation?: [number, number, number]; labelHeight?: number;
}) {
  const resolvedLabelHeight = labelHeight ?? size[1] + 0.45;
  const proceduralBody = <>
    <mesh castShadow receiveShadow position={[0, size[1] / 2, 0]}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={0.55} roughness={0.3} emissive={glow} emissiveIntensity={0.22} />
    </mesh>
    {Array.from({ length: Math.max(2, Math.floor(size[1])) }).map((_, index) => (
      <mesh key={index} position={[0, size[1] - 0.55 - index * 0.78, size[2] / 2 + 0.011]}>
        <planeGeometry args={[size[0] * 0.72, 0.18]} />
        <meshBasicMaterial color={index % 2 ? '#39f4ba' : '#79a8ff'} />
      </mesh>
    ))}
  </>;
  return (
    <group position={position} onClick={() => place && onEnter?.(place)}>
      {assetUrl
        ? <Suspense fallback={proceduralBody}><StaticAsset url={assetUrl} scale={assetScale} rotation={assetRotation} /></Suspense>
        : proceduralBody}
      {assetUrl && <pointLight position={[0, Math.min(resolvedLabelHeight, 3), 1]} intensity={0.22} distance={5} color={glow} />}
      <Html position={[0, resolvedLabelHeight, 0]} center distanceFactor={13} zIndexRange={[3, 0]}>
        <button className={place ? 'world-label enterable' : 'world-label'} onClick={() => place && onEnter?.(place)}>{label}</button>
      </Html>
    </group>
  );
}

const SUBURBAN_ASSET_ROOT = '/assets/3d/vendor/kenney/city-kit-suburban/models';
const COMMERCIAL_ASSET_ROOT = '/assets/3d/vendor/kenney/city-kit-commercial/models';
const INDUSTRIAL_ASSET_ROOT = '/assets/3d/vendor/kenney/city-kit-industrial/models';
const ROAD_ASSET_ROOT = '/assets/3d/vendor/kenney/city-kit-roads/models';
const CAR_ASSET_ROOT = '/assets/3d/vendor/kenney/car-kit/models';
const HERO_CHARACTER_ASSET_ROOT = '/assets/3d/vendor/quaternius/ultimate-modular-citizens/models';

function StaticAsset({ url, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, shadows = true }: {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  shadows?: boolean;
}) {
  const { scene } = useGLTF(url);
  return <Clone object={scene} position={position} rotation={rotation} scale={scale} castShadow={shadows} receiveShadow={shadows} />;
}

function CharacterAsset({ url, animation, scale = 1 }: { url: string; animation: string; scale?: number }) {
  const root = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, root);
  useEffect(() => {
    const action = actions[animation];
    action?.reset().fadeIn(0.18).play();
    return () => { action?.fadeOut(0.16); };
  }, [actions, animation]);
  return <group ref={root} scale={scale}><Clone object={scene} castShadow /></group>;
}

function Villa({ position, accent, rotation = 0 }: { position: [number, number, number]; accent: string; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh receiveShadow position={[0, 0.08, 0]}><boxGeometry args={[5.3, 0.16, 5.2]} /><meshStandardMaterial color="#718579" roughness={0.95} /></mesh>
      <mesh castShadow receiveShadow position={[0, 1.15, 0]}><boxGeometry args={[4.1, 2.2, 3.6]} /><meshStandardMaterial color="#d8ded8" roughness={0.7} /></mesh>
      <mesh castShadow receiveShadow position={[-0.55, 2.55, -0.2]}><boxGeometry args={[2.8, 1.2, 2.7]} /><meshStandardMaterial color="#f0eee7" roughness={0.62} /></mesh>
      <mesh castShadow position={[-0.55, 3.45, -0.2]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[2.35, 1.25, 4]} /><meshStandardMaterial color="#27322f" roughness={0.48} /></mesh>
      <mesh position={[1.12, 0.78, 1.82]}><boxGeometry args={[1.42, 1.38, 0.05]} /><meshStandardMaterial color="#202b2a" metalness={0.5} /></mesh>
      <mesh position={[-0.55, 0.92, 1.83]}><boxGeometry args={[0.72, 1.55, 0.06]} /><meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.18} /></mesh>
      {[-1.55, 0.2].map((x) => <mesh key={x} position={[x, 2.52, 1.18]}><boxGeometry args={[0.72, 0.58, 0.05]} /><meshStandardMaterial color="#8ee7e4" emissive="#237c78" emissiveIntensity={0.28} metalness={0.3} /></mesh>)}
      <mesh position={[1.4, 0.12, -1.25]}><boxGeometry args={[1.75, 0.18, 1.3]} /><meshStandardMaterial color="#54b8cb" transparent opacity={0.85} metalness={0.1} /></mesh>
      {[-2.2, 2.2].map((x) => <group key={x} position={[x, 0, -1.7]}><mesh position={[0, 0.42, 0]}><cylinderGeometry args={[0.16, 0.22, 0.8, 9]} /><meshStandardMaterial color="#594834" /></mesh><mesh position={[0, 1.02, 0]}><sphereGeometry args={[0.65, 12, 10]} /><meshStandardMaterial color="#1b5f3d" /></mesh></group>)}
    </group>
  );
}

function VillaDistrict({ netWorth, onEnter, onDenied }: { netWorth: number; onEnter: (place: Place) => void; onDenied: (message: string) => void }) {
  const verified = netWorth >= 1_000_000;
  const approach = () => verified ? onEnter('villa') : onDenied('MILLIONAIRE RIDGE REQUIRES VERIFIED $1,000,000 NET WORTH');
  return (
    <group position={[13, 0, 13]}>
      <mesh receiveShadow position={[0, 0.04, 0]}><boxGeometry args={[18, 0.08, 12]} /><meshStandardMaterial color="#40584b" roughness={0.94} /></mesh>
      <mesh receiveShadow position={[0, 0.09, 1]}><boxGeometry args={[3.1, 0.1, 11.8]} /><meshStandardMaterial color="#b8b4a6" roughness={0.9} /></mesh>
      <Suspense fallback={<Villa position={[-5.4, 0, -2.5]} accent="#65d8ff" rotation={0.08} />}>
        <StaticAsset url={`${SUBURBAN_ASSET_ROOT}/building-type-b.glb`} position={[-5.4, 0.1, -2.5]} rotation={[0, 0.08, 0]} scale={3.35} />
      </Suspense>
      <Suspense fallback={<Villa position={[4.8, 0, -2.8]} accent="#ffbd64" rotation={-0.06} />}>
        <StaticAsset url={`${SUBURBAN_ASSET_ROOT}/building-type-p.glb`} position={[4.8, 0.1, -2.8]} rotation={[0, -0.06, 0]} scale={3.55} />
      </Suspense>
      <Suspense fallback={<Villa position={[-5.1, 0, 3.3]} accent="#c67cff" rotation={Math.PI - 0.05} />}>
        <StaticAsset url={`${SUBURBAN_ASSET_ROOT}/building-type-d.glb`} position={[-5.1, 0.1, 3.3]} rotation={[0, Math.PI - 0.05, 0]} scale={3.45} />
      </Suspense>
      <Suspense fallback={<Villa position={[5.1, 0, 3.1]} accent="#42f5af" rotation={Math.PI + 0.06} />}>
        <StaticAsset url={`${SUBURBAN_ASSET_ROOT}/building-type-t.glb`} position={[5.1, 0.1, 3.1]} rotation={[0, Math.PI + 0.06, 0]} scale={3.65} />
      </Suspense>
      {([[-7.8, -4.8], [-2.8, -4.8], [2.7, -4.8], [7.7, -4.8], [-7.8, 0.6], [7.8, 0.6]] as [number, number][]).map(([x, z], index) => (
        <Suspense fallback={null} key={`${x}-${z}`}>
          <StaticAsset url={`${SUBURBAN_ASSET_ROOT}/${index % 2 ? 'tree-small' : 'tree-large'}.glb`} position={[x, 0.1, z]} scale={2.1 + (index % 3) * 0.18} shadows={index < 4} />
        </Suspense>
      ))}
      <mesh position={[4.8, 0.16, 0.5]}><boxGeometry args={[3.8, 0.16, 1.55]} /><meshStandardMaterial color="#2a98ae" metalness={0.15} roughness={0.18} transparent opacity={0.9} /></mesh>
      {[-2.1, 2.1].map((x) => <mesh key={x} castShadow position={[x, 1.2, -5.7]}><boxGeometry args={[0.42, 2.4, 0.42]} /><meshStandardMaterial color="#2b3d35" metalness={0.65} /></mesh>)}
      <mesh position={[0, 1.1, -5.7]}><boxGeometry args={[3.8, 1.05, 0.16]} /><meshStandardMaterial color={verified ? '#174c37' : '#442523'} metalness={0.72} transparent opacity={0.94} /></mesh>
      <Html position={[0, 2.4, -5.7]} center distanceFactor={13} zIndexRange={[3, 0]}>
        <button className={verified ? 'world-label enterable prestige' : 'world-label prestige locked'} onClick={approach}>MILLIONAIRE RIDGE · {verified ? 'VERIFIED' : '$1M PROOF OF WEALTH'}</button>
      </Html>
    </group>
  );
}

function Citizen({ seed }: { seed: number }) {
  const npc = useRef<THREE.Group>(null);
  const lane = (seed % 5) - 2;
  const offset = ((seed * 7) % 29) - 14;
  const vertical = seed % 2 === 0;
  const heroModels = ['male-suit', 'female-suit', 'male-casual-hoodie', 'female-casual'];
  const modelUrl = `${HERO_CHARACTER_ASSET_ROOT}/${heroModels[seed % heroModels.length]}.glb`;
  useFrame(({ clock }) => {
    if (!npc.current) return;
    const travel = Math.sin(clock.elapsedTime * (0.22 + (seed % 4) * 0.035) + seed) * 7;
    npc.current.position.x = vertical ? lane * 1.15 : travel + offset * 0.18;
    npc.current.position.z = vertical ? travel + offset * 0.22 : lane * 2.25;
    npc.current.rotation.y = vertical ? (Math.cos(clock.elapsedTime * 0.25 + seed) >= 0 ? 0 : Math.PI) : (Math.cos(clock.elapsedTime * 0.25 + seed) >= 0 ? Math.PI / 2 : -Math.PI / 2);
  });
  return (
    <group ref={npc} position={[0, 0, 0]} scale={0.84 + (seed % 4) * 0.035}>
      <Suspense fallback={<mesh castShadow position={[0, 0.68, 0]}><capsuleGeometry args={[0.18, 0.52, 4, 8]} /><meshStandardMaterial color="#55d8ac" roughness={0.75} /></mesh>}>
        <CharacterAsset url={modelUrl} animation="Walk" scale={0.9} />
      </Suspense>
    </group>
  );
}

function PopulationLayer() {
  return <group>{Array.from({ length: 32 }, (_, seed) => <Citizen key={seed} seed={seed} />)}</group>;
}

function Player() {
  const body = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const [movementAction, setMovementAction] = useState<'idle' | 'walk'>('idle');
  const { camera } = useThree();
  useEffect(() => {
    const update = (event: KeyboardEvent) => {
      const pressed = event.type === 'keydown';
      keys.current[event.key.toLowerCase()] = pressed;
      if (['w', 'a', 's', 'd'].includes(event.key.toLowerCase())) event.preventDefault();
    };
    const virtual = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; pressed: boolean }>).detail;
      keys.current[detail.key] = detail.pressed;
    };
    window.addEventListener('keydown', update);
    window.addEventListener('keyup', update);
    window.addEventListener('ampliworld-move', virtual);
    const release = () => { keys.current = {}; };
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', update);
      window.removeEventListener('keyup', update);
      window.removeEventListener('ampliworld-move', virtual);
      window.removeEventListener('blur', release);
    };
  }, []);
  useFrame((_, delta) => {
    if (!body.current) return;
    const keysDown = keys.current;
    const dx = (keysDown.d ? 1 : 0) - (keysDown.a ? 1 : 0);
    const dz = (keysDown.s ? 1 : 0) - (keysDown.w ? 1 : 0);
    if (dx || dz) {
      if (movementAction !== 'walk') setMovementAction('walk');
      const movement = new THREE.Vector3(dx, 0, dz).normalize().multiplyScalar(delta * 5);
      const next = body.current.position.clone().add(movement);
      next.x = THREE.MathUtils.clamp(next.x, -19, 19);
      next.z = THREE.MathUtils.clamp(next.z, -16, 18);
      const blocked = PLAYER_BLOCKERS.some(([x, z, halfX, halfZ]) => Math.abs(next.x - x) < halfX && Math.abs(next.z - z) < halfZ);
      if (!blocked) body.current.position.copy(next);
      body.current.rotation.y = Math.atan2(movement.x, movement.z);
    } else if (movementAction !== 'idle') {
      setMovementAction('idle');
    }
    camera.position.lerp(body.current.position.clone().add(new THREE.Vector3(0, 5.8, 8)), 0.07);
    camera.lookAt(body.current.position.clone().add(new THREE.Vector3(0, 1, 0)));
  });
  return (
    <group ref={body} position={[0, 0, 5]}>
      <Suspense fallback={<mesh castShadow position={[0, 0.8, 0]}><capsuleGeometry args={[0.38, 0.9, 6, 12]} /><meshStandardMaterial color="#e7fff5" metalness={0.65} roughness={0.22} emissive="#27e8a1" emissiveIntensity={0.25} /></mesh>}>
        <CharacterAsset url={`${HERO_CHARACTER_ASSET_ROOT}/male-casual-hoodie.glb`} animation={movementAction === 'walk' ? 'Walk' : 'Idle'} scale={0.98} />
      </Suspense>
      <pointLight position={[0, 1.45, 0.22]} intensity={0.32} distance={2.8} color="#42f5af" />
    </group>
  );
}

function World({ onEnter, onNotice, netWorth }: { onEnter: (place: Place) => void; onNotice: (message: string) => void; netWorth: number }) {
  const towers = [
    { position: [-8, 0, -6] as [number, number, number], model: 'building-skyscraper-c.glb', scale: 1.45, label: 'CYBER CBD', height: 6.25 },
    { position: [-5, 0, -10] as [number, number, number], model: 'building-skyscraper-e.glb', scale: 1.55, label: 'WORLD EXCHANGE', height: 6.5 },
    { position: [5, 0, -9] as [number, number, number], model: 'building-skyscraper-c.glb', scale: 1.6, label: 'AMPLIALPHA', height: 6.8 },
    { position: [9, 0, -5] as [number, number, number], model: 'building-skyscraper-e.glb', scale: 1.35, label: 'CYBER CBD', height: 5.75 },
    { position: [-11, 0, 2] as [number, number, number], model: 'building-skyscraper-a.glb', scale: 1.35, label: 'CYBER CBD', height: 4.4 },
    { position: [11, 0, 2] as [number, number, number], model: 'building-skyscraper-d.glb', scale: 0.92, label: 'CYBER CBD', height: 5.35 },
  ];
  return (
    <>
      <Sky sunPosition={[1, 0.15, -1]} turbidity={8} rayleigh={1.4} /><Stars radius={70} depth={45} count={1400} factor={2} />
      <ambientLight intensity={0.48} /><directionalLight castShadow position={[6, 14, 7]} intensity={2.4} color="#d9fff1" />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[50, 44]} /><meshStandardMaterial color="#091511" roughness={0.84} /></mesh>
      <mesh receiveShadow position={[0, 0.015, 1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[9, 42]} /><meshStandardMaterial color="#14201e" /></mesh>
      <Suspense fallback={null}>
        {[-15, -10, -5, 0, 5, 10, 15].map((z) => <StaticAsset key={z} url={`${ROAD_ASSET_ROOT}/road-straight.glb`} position={[0, 0.018, z]} rotation={[0, Math.PI / 2, 0]} scale={[5.02, 1, 5]} shadows={false} />)}
        <StaticAsset url={`${CAR_ASSET_ROOT}/sedan.glb`} position={[-1.4, 0.045, -4]} scale={0.88} />
        <StaticAsset url={`${CAR_ASSET_ROOT}/taxi.glb`} position={[1.45, 0.045, 6.2]} rotation={[0, Math.PI, 0]} scale={0.9} />
        <StaticAsset url={`${CAR_ASSET_ROOT}/race-future.glb`} position={[-1.45, 0.045, 12.2]} scale={0.92} />
      </Suspense>
      {[-1.5, 0, 1.5].map((x) => <mesh key={x} position={[x, 0.045, 1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.08, 42]} /><meshBasicMaterial color="#36eaa5" /></mesh>)}
      {towers.map((tower) => <Building key={`${tower.position[0]}-${tower.position[2]}`} position={tower.position} size={[2.8, tower.height - 0.45, 2.8]} color="#112722" glow="#1d9c72" label={tower.label} assetUrl={`${COMMERCIAL_ASSET_ROOT}/${tower.model}`} assetScale={tower.scale} labelHeight={tower.height} />)}
      <Building position={[-4, 0, 1]} size={[3.3, 3.4, 3]} color="#162b27" glow="#22e69e" label="STOCK EXCHANGE" place="market" onEnter={onEnter} assetUrl={`${COMMERCIAL_ASSET_ROOT}/building-n.glb`} assetScale={1.45} labelHeight={3.95} />
      <Building position={[4, 0, 2]} size={[3.7, 2.8, 2.8]} color="#291b36" glow="#c366ff" label="NEON ATELIER" place="fashion" onEnter={onEnter} assetUrl={`${COMMERCIAL_ASSET_ROOT}/building-k.glb`} assetScale={1.75} labelHeight={3.1} />
      <Building position={[-4, 0, 8]} size={[3.1, 2.5, 2.8]} color="#36241a" glow="#ff9d45" label="NOVA DINING" place="restaurant" onEnter={onEnter} assetUrl={`${COMMERCIAL_ASSET_ROOT}/building-h.glb`} assetScale={1.9} labelHeight={2.85} />
      <Building position={[5, 0, 9]} size={[3.4, 4.1, 3]} color="#172b36" glow="#4dbdff" label="SKYLINE REALTY" place="property" onEnter={onEnter} assetUrl={`${COMMERCIAL_ASSET_ROOT}/building-skyscraper-a.glb`} assetScale={1.35} labelHeight={4.45} />
      <Building position={[0, 0, -13]} size={[4.4, 4.8, 3.1]} color="#1d2434" glow="#718cff" label="CAREER TOWER" place="career" onEnter={onEnter} assetUrl={`${COMMERCIAL_ASSET_ROOT}/building-skyscraper-d.glb`} assetScale={0.88} labelHeight={5.15} />
      <group position={[-14, 0, -11]}><mesh position={[0, 0.3, 0]}><cylinderGeometry args={[5, 6, 0.6, 32]} /><meshStandardMaterial color="#b59b6b" /></mesh><mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[8, 32]} /><meshStandardMaterial color="#176171" transparent opacity={0.8} /></mesh><Html position={[0, 2, 0]} center distanceFactor={14} zIndexRange={[3, 0]}><span className={netWorth >= 100000 ? 'zone-label unlocked' : 'zone-label'}>ISLAND DISTRICT {netWorth < 100000 && '· $100K'}</span></Html></group>
      <group position={[15, 0, -11]}><mesh position={[0, 0.04, 0]}><boxGeometry args={[8, 0.08, 7]} /><meshStandardMaterial color="#172d35" /></mesh><Suspense fallback={null}><StaticAsset url={`${INDUSTRIAL_ASSET_ROOT}/building-t.glb`} position={[0, 0.08, 0]} scale={2.25} /><StaticAsset url={`${INDUSTRIAL_ASSET_ROOT}/solar-panel-landscape-group.glb`} position={[2.7, 0.08, 1.7]} scale={1.5} /></Suspense><Html position={[0, 3, 0]} center distanceFactor={14} zIndexRange={[3, 0]}><span className="zone-label signal">GLOBAL EVENT LAB · PREVIEW</span></Html></group>
      <group position={[-14, 0, 13]}>{[-2, 0, 2].map((x) => <mesh key={x} position={[x, 0.5, 0]}><coneGeometry args={[1.1, 2.3, 8]} /><meshStandardMaterial color="#25452c" /></mesh>)}<Html position={[0, 2.5, 0]} center distanceFactor={14} zIndexRange={[3, 0]}><span className="zone-label unlocked">COUNTRYSIDE · OPEN</span></Html></group>
      <VillaDistrict netWorth={netWorth} onEnter={onEnter} onDenied={onNotice} />
      <PopulationLayer /><Player /><Environment preset="night" />
    </>
  );
}

function TouchControls() {
  const move = (key: string, pressed: boolean) => window.dispatchEvent(new CustomEvent('ampliworld-move', { detail: { key, pressed } }));
  const bind = (key: string) => ({ onPointerDown: () => move(key, true), onPointerUp: () => move(key, false), onPointerCancel: () => move(key, false), onPointerLeave: () => move(key, false) });
  return <div className="touch-controls"><button {...bind('w')} aria-label="Move forward"><ChevronUp /></button><button {...bind('a')} aria-label="Move left"><ChevronLeft /></button><button {...bind('s')} aria-label="Move backward"><ChevronDown /></button><button {...bind('d')} aria-label="Move right"><ChevronRight /></button></div>;
}

function VisionPanel({ image, label, alt }: { image: string; label: string; alt: string }) {
  return (
    <figure className="vision-panel">
      <Image src={image} alt={alt} fill sizes="(max-width: 720px) 100vw, 650px" />
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export function GameShell({ playerName, signedIn, signInPath }: { playerName: string; signedIn: boolean; signInPath: string }) {
  const [cash, setCash] = useState(10000);
  const [propertyValue, setPropertyValue] = useState(0);
  const [happiness, setHappiness] = useState(52);
  const [worldEvent, setWorldEvent] = useState<WorldEvent>(WORLD_EVENTS[0]);
  const [place, setPlace] = useState<Place>(null);
  const [inventory, setInventory] = useState<string[]>([]);
  const [tax, setTax] = useState(0);
  const [notice, setNotice] = useState('WASD TO MOVE · CLICK A BUILDING TO ENTER');
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [day, setDay] = useState(1);
  const [leaseDays, setLeaseDays] = useState(365);
  const [career, setCareer] = useState('UNEMPLOYED');
  const [leverage, setLeverage] = useState<1 | 2 | 3 | 5>(1);
  const [reliefEligible, setReliefEligible] = useState(false);
  const [reliefClaimsRemaining, setReliefClaimsRemaining] = useState(2);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [missions, setMissions] = useState({ firstTrade: false, firstPurchase: false, firstJob: false });
  const actionLock = useRef(false);

  const portfolio = useMemo(() => holdings.reduce((total, holding) => {
    const price = stocks.find((stock) => stock.symbol === holding.symbol)?.price ?? holding.avgPrice;
    return total + holding.quantity * price;
  }, 0), [holdings, stocks]);
  const borrowedExposure = useMemo(() => holdings.reduce((total, holding) => total + holding.borrowedAmount, 0), [holdings]);
  const portfolioEquity = portfolio - borrowedExposure;
  const netWorth = cash + portfolioEquity + propertyValue;
  const maintenanceMargin = holdings.reduce((total, holding) => {
    const price = stocks.find((stock) => stock.symbol === holding.symbol)?.price ?? holding.avgPrice;
    const rate = holding.leverage === 2 ? 0.3 : holding.leverage === 3 ? 0.22 : holding.leverage === 5 ? 0.15 : 0;
    return total + holding.quantity * price * rate;
  }, 0);
  const marginExcess = cash + portfolioEquity - maintenanceMargin;

  const applySnapshot = (data: GameApiResponse) => {
    const player = data.player ?? data;
    setCash(readableNumber(player.cash, 10000));
    setHappiness(readableNumber(player.happiness, 52));
    setTax(readableNumber(player.cityTaxPaid ?? player.cityTax));
    setDay(readableNumber(player.turn, 1));
    setLeaseDays(readableNumber(player.apartmentLeaseDays, 365));
    setCareer(readableString(player.careerStatus, 'UNEMPLOYED'));
    setPropertyValue(readableNumber(player.propertyValue));
    setReliefEligible(Boolean(player.reliefEligible));
    setReliefClaimsRemaining(readableNumber(player.reliefClaimsRemaining, 2));
    if (data.holdings !== undefined) setHoldings(normalizeHoldings(data.holdings));
    if (data.inventory !== undefined) setInventory(normalizeInventory(data.inventory));
    if (data.market !== undefined) setStocks((current) => mergeMarket(current, data.market));
    if (data.worldEvent !== undefined) setWorldEvent((current) => normalizeWorldEvent(data.worldEvent, current));
  };

  const runCloudAction = async (payload: Record<string, unknown>) => {
    const response = await fetch('/api/game', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, requestId: crypto.randomUUID() }),
    });
    const data = await response.json() as GameApiResponse;
    if (!response.ok) throw new Error(readableString(data.error, 'ACTION REJECTED'));
    applySnapshot(data);
    return data;
  };

  useEffect(() => {
    if (!signedIn) return;
    void fetch('/api/game')
      .then(async (response) => response.ok ? await response.json() as GameApiResponse : null)
      .then((data) => {
        if (!data) return;
        applySnapshot(data);
      })
      .catch(() => setNotice('CLOUD SAVE UNAVAILABLE · LOCAL PLAY CONTINUES'));
  }, [signedIn]);

  useEffect(() => {
    if (signedIn) return;
    const timer = window.setInterval(() => setStocks((current) => current.map((stock, index) => {
      const phase = Date.now() / 7500 + index * 1.7;
      const movement = Math.sin(phase) * stock.volatility * 0.35 + Math.cos(phase * 0.43) * stock.volatility * 0.18;
      return { ...stock, price: Math.max(1, Number((stock.price * (1 + movement)).toFixed(2))) };
    })), 2500);
    return () => window.clearInterval(timer);
  }, [signedIn]);

  useEffect(() => {
    if (!place) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPlace(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [place]);

  const addGuestHolding = (symbol: string, quantity: number, price: number, level: number, marginPosted: number, borrowedAmount: number) => setHoldings((current) => {
    const existing = current.find((holding) => holding.symbol === symbol);
    if (!existing) return [...current, { symbol, quantity, avgPrice: price, leverage: level, marginPosted, borrowedAmount }];
    const nextQuantity = existing.quantity + quantity;
    const avgPrice = ((existing.avgPrice * existing.quantity) + (price * quantity)) / nextQuantity;
    return current.map((holding) => holding.symbol === symbol ? { ...holding, quantity: nextQuantity, avgPrice, marginPosted: holding.marginPosted + marginPosted, borrowedAmount: holding.borrowedAmount + borrowedAmount } : holding);
  });

  const order = async (symbol: string, side: 'buy' | 'sell') => {
    if (actionLock.current) return;
    const stock = stocks.find((item) => item.symbol === symbol);
    if (!stock) return;
    const currentHolding = holdings.find((holding) => holding.symbol === symbol);
    const owned = currentHolding?.quantity ?? 0;
    if (side === 'sell' && owned <= 0) return setNotice(`NO ${symbol} POSITION TO SELL`);
    if (side === 'buy' && currentHolding && currentHolding.leverage !== leverage) return setNotice(`CLOSE THE EXISTING ${currentHolding.leverage}× ${symbol} POSITION BEFORE USING ${leverage}×`);
    const marginAllocation = 500;
    const notional = side === 'buy' ? marginAllocation * leverage : owned * stock.price;
    const quantity = side === 'buy' ? notional / stock.price : owned;
    const fee = Number((notional * 0.001).toFixed(2));
    const tradingTax = Number((notional * 0.0005).toFixed(2));
    const requiredCash = side === 'buy' ? marginAllocation + fee + tradingTax : 0;
    if (side === 'buy' && cash < requiredCash) return setNotice('INSUFFICIENT VIRTUAL CASH FOR MARGIN AND COSTS');
    actionLock.current = true;
    setPendingAction(`${side}:${symbol}`);
    try {
      let executionPrice = stock.price;
      let executionNotional = notional;
      let executionFee = fee;
      let executionTax = tradingTax;
      let executionMargin = side === 'buy' ? marginAllocation : currentHolding?.marginPosted ?? 0;
      let executionBorrowed = side === 'buy' ? notional - marginAllocation : currentHolding?.borrowedAmount ?? 0;
      if (signedIn) {
        const data = await runCloudAction(side === 'buy' ? { action: side, symbol, notional, leverage } : { action: side, symbol, quantity });
        const execution = recordOf(data.execution);
        executionPrice = readableNumber(execution?.price, executionPrice);
        executionNotional = readableNumber(execution?.notional, executionNotional);
        executionFee = readableNumber(execution?.fee, executionFee);
        executionTax = readableNumber(execution?.tax, executionTax);
        executionMargin = readableNumber(execution?.marginPosted ?? execution?.marginRequired, executionMargin);
        executionBorrowed = readableNumber(execution?.borrowedAmount, executionBorrowed);
      } else {
        if (side === 'buy') {
          setCash((value) => value - marginAllocation - fee - tradingTax);
          addGuestHolding(symbol, quantity, stock.price, leverage, marginAllocation, notional - marginAllocation);
        } else {
          setCash((value) => value + notional - fee - tradingTax - (currentHolding?.borrowedAmount ?? 0));
          setHoldings((current) => current.filter((holding) => holding.symbol !== symbol));
        }
        setTax((value) => Number((value + tradingTax).toFixed(2)));
      }
      setMissions((value) => ({ ...value, firstTrade: true }));
      setNotice(`${side === 'buy' ? `${leverage}× LONG` : 'SOLD ALL'} ${symbol} @ $${executionPrice.toFixed(2)} · $${executionNotional.toFixed(2)} EXPOSURE · $${executionMargin.toFixed(2)} MARGIN · $${executionBorrowed.toFixed(2)} BORROWED · $${executionFee.toFixed(2)} FEE + $${executionTax.toFixed(2)} TAX`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message.toUpperCase() : 'ORDER REJECTED');
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const spend = async (price: number, item: string, joy: number) => {
    if (actionLock.current) return;
    const shoppingTax = Number((price * 0.02).toFixed(2));
    if (cash < price + shoppingTax) return setNotice('YOU NEED MORE CASH · RETURN TO THE MARKET');
    actionLock.current = true;
    setPendingAction(`spend:${item}`);
    try {
      if (signedIn) {
        await runCloudAction({ action: 'spend', item });
      } else {
        setCash((value) => value - price - shoppingTax);
        setTax((value) => Number((value + shoppingTax).toFixed(2)));
        setHappiness((value) => Math.min(100, value + joy));
        setInventory((value) => [...value, item]);
        if (price >= 1_000_000) setPropertyValue((value) => value + price);
      }
      setMissions((value) => ({ ...value, firstPurchase: true }));
      setNotice(`${item.toUpperCase()} ACQUIRED · $${shoppingTax.toFixed(2)} CITY TAX PAID`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message.toUpperCase() : 'PURCHASE REJECTED');
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const acceptJob = async () => {
    if (actionLock.current) return;
    actionLock.current = true;
    setPendingAction('hire');
    try {
      if (signedIn) await runCloudAction({ action: 'hire', job: 'MARKET_DATA_ASSISTANT' });
      else setCareer('MARKET DATA ASSISTANT');
      setMissions((value) => ({ ...value, firstJob: true }));
      setNotice('INTERVIEW PASSED · ROLE UNLOCKED · PAID WORK TASKS ARE NOT YET CONNECTED');
      setPlace(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message.toUpperCase() : 'INTERVIEW UNAVAILABLE');
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const claimRelief = async () => {
    if (actionLock.current) return;
    actionLock.current = true;
    setPendingAction('relief');
    try {
      let grant = Math.max(0, 1000 - Math.max(0, cash));
      if (signedIn) {
        const data = await runCloudAction({ action: 'claim_relief' });
        grant = readableNumber(recordOf(data.relief)?.grant, grant);
      } else {
        setCash(1000);
        setReliefClaimsRemaining((value) => Math.max(0, value - 1));
      }
      setReliefEligible(false);
      setNotice(`$${grant.toFixed(2)} VIRTUAL RELIEF ISSUED · PAPER ACCOUNT ONLY`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message.toUpperCase() : 'RELIEF UNAVAILABLE');
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const closeDay = async () => {
    if (actionLock.current) return;
    actionLock.current = true;
    setPendingAction('end-day');
    try {
      let wage = 0;
      let outcome = '';
      if (signedIn) {
        const data = await runCloudAction({ action: 'end_day' });
        const dayClose = recordOf(data.dayClose);
        wage = readableNumber(dayClose?.wage);
        if (readableNumber(dayClose?.liquidationCount) > 0 || (Array.isArray(dayClose?.liquidations) && dayClose.liquidations.length > 0)) outcome = ' · MARGIN CALL LIQUIDATED LEVERAGED POSITIONS';
      } else {
        const nextTurn = day + 1;
        const eventEntropy = crypto.getRandomValues(new Uint32Array(1))[0];
        const nextEvent = WORLD_EVENTS[eventEntropy % WORLD_EVENTS.length];
        const nextStocks = stocks.map((stock, index) => {
          const eventMove = nextEvent.marketImpacts?.[stock.symbol] ?? Math.sin(nextTurn * 0.73 + index) * stock.volatility;
          return { ...stock, open: stock.price, price: Math.max(0.01, Number((stock.price * (1 + eventMove)).toFixed(2))) };
        });
        const nextValue = holdings.reduce((total, holding) => total + holding.quantity * (nextStocks.find((stock) => stock.symbol === holding.symbol)?.price ?? holding.avgPrice), 0);
        const requiredMaintenance = holdings.reduce((total, holding) => {
          const marketValue = holding.quantity * (nextStocks.find((stock) => stock.symbol === holding.symbol)?.price ?? holding.avgPrice);
          const rate = holding.leverage === 2 ? 0.3 : holding.leverage === 3 ? 0.22 : holding.leverage === 5 ? 0.15 : 0;
          return total + marketValue * rate;
        }, 0);
        const marginCall = holdings.some((holding) => holding.leverage > 1) && cash + nextValue - borrowedExposure < requiredMaintenance;
        setStocks(nextStocks);
        setWorldEvent(nextEvent);
        setDay((value) => value + 1);
        setLeaseDays((value) => Math.max(0, value - 1));
        if (marginCall) {
          const liquidation = holdings.reduce((result, holding) => {
            const marketValue = holding.quantity * (nextStocks.find((stock) => stock.symbol === holding.symbol)?.price ?? holding.avgPrice);
            return {
              cashReturn: result.cashReturn + marketValue - holding.borrowedAmount - marketValue * 0.0015,
              cityTax: result.cityTax + marketValue * 0.0005,
            };
          }, { cashReturn: 0, cityTax: 0 });
          setHoldings([]);
          setCash((value) => value + wage + liquidation.cashReturn);
          setTax((value) => Number((value + liquidation.cityTax).toFixed(2)));
          outcome = ' · CROSS-MARGIN CALL LIQUIDATED ALL MARKET POSITIONS';
        } else {
          setCash((value) => value + wage);
        }
        setHappiness((value) => Math.max(0, value - 2));
      }
      setNotice(`DAY ${String(day).padStart(3, '0')} CLOSED · ${wage ? `$${wage} TASK PAY RECEIVED` : 'NO PASSIVE WAGE · MARKET REMAINS THE MAIN GAME'}${outcome}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message.toUpperCase() : 'DAY CLOSE FAILED');
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const marketMove = (stock: Stock) => ((stock.price / stock.open - 1) * 100);
  const completed = Object.values(missions).filter(Boolean).length;
  const visibleNews = [worldEvent, ...WORLD_EVENTS.filter((event) => event.id !== worldEvent.id)].slice(0, 3);
  const canClaimRelief = signedIn ? reliefEligible : netWorth < 500 && holdings.length === 0 && reliefClaimsRemaining > 0;

  return (
    <main className="game">
      <header><div className="logo">A</div><div><b>AMPLIWORLD</b><small>THE LIVING MARKET</small></div><div className="day">DAY {String(day).padStart(3, '0')} · 20:42 · CYBER CITY · VIRTUAL MARKET</div><div className="player"><span>{playerName}</span>{signedIn ? <i>ONLINE</i> : <a href={signInPath} target="_top">SIGN IN TO SAVE</a>}</div></header>
      <section className="playfield">
        <Canvas aria-label="Playable AmpliWorld city" tabIndex={0} shadows dpr={[1, 1.5]} camera={{ position: [0, 6, 13], fov: 50 }}><World onEnter={setPlace} onNotice={setNotice} netWorth={netWorth} /></Canvas>
        <div className="mission"><small>PRIMARY MISSION · {completed}/3</small><b>Turn $10,000 into a life worth living</b><span aria-live="polite">{notice}</span><div className="mission-track"><i className={missions.firstTrade ? 'done' : ''}>TRADE</i><i className={missions.firstJob ? 'done' : ''}>JOB</i><i className={missions.firstPurchase ? 'done' : ''}>LIFE</i></div></div>
        <div className="controls"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> MOVE · CLICK A LOCATION TO ENTER</div><TouchControls />
        <aside className="hud"><div><WalletCards /><span>CASH<big>${cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}</big></span></div><div><Banknote /><span>MARKET EQUITY<big>${portfolioEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</big></span></div><div><Smile /><span>HAPPINESS<big>{happiness}%</big></span></div><div><Trophy /><span>CITY STATUS<big>{netWorth >= 1_000_000 ? 'RIDGE VERIFIED' : netWorth >= 100_000 ? 'ISLAND ELIGIBLE' : 'STARTER'}</big></span></div></aside>
        <nav><button onClick={() => setPlace('map')}><MapIcon />MAP</button><button onClick={() => setPlace('market')}><Banknote />TRADE</button><button onClick={() => setPlace('news')}><Newspaper />WORLD</button><button onClick={() => setPlace('career')}><BriefcaseBusiness />JOB</button><button onClick={() => setPlace('inventory')}><ShoppingBag />ITEMS <em>{inventory.length}</em></button><button disabled={pendingAction !== null} onClick={() => void closeDay()}><Clock3 />{pendingAction === 'end-day' ? 'CLOSING…' : 'END DAY'}</button><button onClick={() => setPlace('menu')}><Menu />MENU</button></nav>

        {place && <dialog open className="modal" aria-label="AmpliWorld location panel"><button className="close" onClick={() => setPlace(null)} aria-label="Close"><X /></button>
          {place === 'market' && <><small>CYBER CITY EXCHANGE · EXECUTABLE VIRTUAL QUOTES</small><VisionPanel image="/visuals/ampliworld-trading-terminal.jpg" label="PRODUCT VISION · LIVE TRADING LOOP" alt="Concept visualization of the AmpliWorld trading terminal" /><h1>Trade the living world</h1><p>Every order is virtual. Allocate $500 of margin, choose 1×–5× exposure, and manage the risk of server-enforced liquidation.</p><div className="leverage-desk"><span><b>LEVERAGE</b>{([1, 2, 3, 5] as const).map((level) => <button key={level} className={leverage === level ? 'active' : ''} onClick={() => setLeverage(level)}>{level}×</button>)}</span><i>$500 margin → ${(500 * leverage).toLocaleString()} gross exposure</i></div><div className="market-table"><div className="market-row header"><span>Asset</span><span>Price</span><span>Day</span><span>Position</span><span>Order</span></div>{stocks.map((stock) => { const move = marketMove(stock); const holding = holdings.find((item) => item.symbol === stock.symbol); const buyPending = pendingAction === `buy:${stock.symbol}`; const sellPending = pendingAction === `sell:${stock.symbol}`; return <div className="market-row" key={stock.symbol}><span><b>{stock.symbol}</b><small>{stock.name}</small></span><span>${stock.price.toFixed(2)}</span><span className={move >= 0 ? 'gain' : 'loss'}>{move >= 0 ? '+' : ''}{move.toFixed(2)}%</span><span>{holding ? `${holding.quantity.toFixed(2)} sh · ${holding.leverage}×` : '—'}</span><span className="order-buttons"><button disabled={pendingAction !== null} onClick={() => void order(stock.symbol, 'buy')}>{buyPending ? '…' : `BUY ${leverage}×`}</button><button disabled={pendingAction !== null || !holding} onClick={() => void order(stock.symbol, 'sell')}>{sellPending ? '…' : 'SELL ALL'}</button></span></div>; })}</div><div className="portfolio-summary risk"><span>Gross exposure <b>${portfolio.toFixed(2)}</b></span><span>Account equity <b>${portfolioEquity.toFixed(2)}</b></span><span>Borrowed <b>${borrowedExposure.toFixed(2)}</b></span><span>Margin excess <b className={marginExcess >= 0 ? 'gain' : 'loss'}>${marginExcess.toFixed(2)}</b><small>Maintenance ${maintenanceMargin.toFixed(2)}</small></span></div>{canClaimRelief && <div className="relief-panel"><span><b>Paper-account relief available</b>Up to $1,000 virtual cash · {reliefClaimsRemaining} lifetime claim{reliefClaimsRemaining === 1 ? '' : 's'} remaining</span><button disabled={pendingAction !== null} onClick={() => void claimRelief()}>{pendingAction === 'relief' ? 'ISSUING…' : 'CLAIM VIRTUAL RELIEF'}</button></div>}</>}
          {place === 'news' && <><small>AMPLIWORLD NEWSWIRE · DAY {String(day).padStart(3, '0')}</small><VisionPanel image="/visuals/ampliworld-population-simulation.jpg" label="WORLD ENGINE · POPULATION TO SIGNAL" alt="Concept visualization of the AmpliWorld population simulation engine" /><h1>Today&apos;s world state</h1><p>The lead event is part of the active simulation state: close the day and its asset impacts settle into tomorrow&apos;s prices.</p><div className="population-strip"><span><b>8.3B</b>population frame</span><span><b>1M</b>weighted core</span><span><b>4,096</b>active cohorts</span><span><b>32</b>visible NPCs</span></div><div className="news-list">{visibleNews.map((event, index) => <article className={index === 0 ? 'lead' : ''} key={event.id}><i>{index === 0 ? `LIVE · ${event.domain}` : event.domain}</i><b>{event.headline}</b><span>{event.impacts.join(' · ')}</span></article>)}</div></>}
          {place === 'map' && <><small>CYBER CITY DIRECTORY</small><VisionPanel image="/visuals/ampliworld-city-gameplay.jpg" label="CITY VISION · TRADE, LIVE, ADVANCE" alt="Concept visualization of Cyber City and its trading lifestyle districts" /><h1>Choose what wealth unlocks</h1><p>The exchange is the economic core. Lifestyle districts give every virtual return a purpose.</p><div className="district-grid"><article><b>Cyber CBD</b><span>Exchange, career, fashion and dining</span><i>OPEN</i></article><article><b>Countryside</b><span>Lower-cost living and future local commerce</span><i>PREVIEW</i></article><article><b>Island District</b><span>Waterfront homes, clubs and premium travel</span><i>{netWorth >= 100000 ? 'PREVIEW' : '$100K NET WORTH'}</i></article><article><b>Millionaire Ridge</b><span>Gated detached-villa community with proof-of-wealth access</span><i>{netWorth >= 1_000_000 ? 'VERIFIED' : '$1M NET WORTH'}</i></article></div></>}
          {place === 'inventory' && <><small>OWNED GOODS</small><h1>Your life, made visible</h1><p>Trading performance becomes clothing, experiences and eventually property that other players can see.</p><div className="inventory-grid">{inventory.length ? inventory.map((item, index) => <article key={`${item}-${index}`}><ShoppingBag /><span><b>{item}</b><small>Owned · tradable marketplace support planned</small></span></article>) : <article className="empty"><ShoppingBag /><span><b>No items yet</b><small>Visit Neon Atelier or Nova Dining after your first trade.</small></span></article>}</div></>}
          {place === 'menu' && <><small>HOW TO PLAY</small><h1>Trade first. Build a life second.</h1><p>Use WASD or the touch pad to explore. Read world events, place virtual trades, then turn progress into choices across the city.</p><div className="menu-list"><span><kbd>1</kbd><b>Read</b> world news and company events</span><span><kbd>2</kbd><b>Trade</b> a $500 virtual order and manage risk</span><span><kbd>3</kbd><b>Live</b> through goods, dining, travel and property</span><span><kbd>4</kbd><b>Close day</b> to advance persistent world memory</span></div><p className="save-state">{signedIn ? 'Cloud save is connected for this player.' : 'Guest mode is playable now. Sign in to retain progress across sessions.'}<small>CC0 3D assets by Kenney and Quaternius.</small></p></>}
          {place === 'villa' && <><small>MILLIONAIRE RIDGE · VERIFIED ACCESS</small><VisionPanel image="/visuals/ampliworld-millionaire-ridge.jpg" label="MILLIONAIRE RIDGE · CONCEPT ENVIRONMENT" alt="Concept visualization of the gated AmpliWorld detached-villa community" /><h1>A community earned through the market</h1><p>Most residences are bought with virtual dollars earned in the market. The final estate offers either an extreme virtual-money path or a premium cosmetic edition—never a trading advantage.</p><div className="villa-ledger"><span><b>Your verified net worth</b>${netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span><span><b>Entry requirement</b>$1,000,000</span><span><b>Premium exchange</b>$1 = 100 Credits</span></div><div className="real-estate-grid"><article><small>GARDEN SERIES</small><h2>Parkside Villa</h2><p>Detached home, private garden and two-car garage.</p><b>$1,200,000 virtual</b><button disabled={pendingAction !== null} onClick={() => void spend(1_200_000, 'Parkside Villa', 20)}>BUY WITH VIRTUAL CASH</button></article><article><small>COURTYARD SERIES</small><h2>Glass Courtyard Villa</h2><p>Pool courtyard, gallery wing and city membership.</p><b>$4,800,000 virtual</b><button disabled={pendingAction !== null} onClick={() => void spend(4_800_000, 'Glass Courtyard Villa', 30)}>BUY WITH VIRTUAL CASH</button></article><article><small>ESTATE SERIES</small><h2>Helix Estate</h2><p>Hilltop grounds, guest house and private showroom.</p><b>$25,000,000 virtual</b><button disabled={pendingAction !== null} onClick={() => void spend(25_000_000, 'Helix Estate', 40)}>BUY WITH VIRTUAL CASH</button></article><article className="premium-estate"><small>FOUNDERS&apos; EDITION</small><h2>Sky Estate</h2><p>The same status can be earned through extraordinary play or purchased as a cosmetic world edition.</p><b>$250,000,000 virtual <em>or</em> 49,900 Credits</b><div><button disabled={pendingAction !== null} onClick={() => void spend(250_000_000, 'Founders Sky Estate', 50)}>EARN IN GAME</button><button disabled>PREMIUM CHECKOUT NOT CONNECTED</button></div></article></div></>}
          {place === 'fashion' && <><small>NEON ATELIER</small><h1>Wear your success</h1><p>Skins are visible status. Purchases increase happiness and fund the city treasury.</p><div className="goods"><button disabled={pendingAction !== null} onClick={() => void spend(180, 'Midnight Trader Jacket', 8)}><Shirt /><span><b>Midnight Trader Jacket</b><small>$180 + 2% tax</small></span></button><button disabled={pendingAction !== null} onClick={() => void spend(480, 'Founder Skin', 15)}><Shirt /><span><b>Founder Skin</b><small>$480 + 2% tax</small></span></button></div></>}
          {place === 'restaurant' && <><small>NOVA DINING</small><h1>Tonight&apos;s table</h1><p>Celebrate a green day or spend carefully after a red one.</p><div className="goods"><button disabled={pendingAction !== null} aria-label="Buy Skyline Dinner" onClick={() => void spend(42, 'Skyline Dinner', 6)}><span><b>Skyline Dinner</b><small>$42 + 2% tax</small></span></button><button disabled={pendingAction !== null} aria-label="Buy Investor Tasting Menu" onClick={() => void spend(160, 'Investor Tasting Menu', 12)}><span><b>Investor Tasting Menu</b><small>$160 + 2% tax</small></span></button></div></>}
          {place === 'property' && <><small>SKYLINE REALTY</small><h1>Turn returns into a skyline</h1><p>Your starter apartment has {leaseDays} days left. Premium homes become permanent world assets.</p><div className="property"><Home /><div><b>Cloudline Penthouse</b><span>$2,500,000 · Requires City Rank 100</span></div><i>LOCKED</i></div><div className="property"><Car /><div><b>Ion GT</b><span>$180,000 · Includes island access</span></div><i>LOCKED</i></div></>}
          {place === 'career' && <><small>CAREER TOWER · ROLEPLAY TRACK</small><h1>Market Data Assistant</h1><p>The interview unlocks a career identity and future skill-based work tasks. There is no passive wage to farm: trading remains the route to wealth, while limited paper-account relief handles true bankruptcy.</p><div className="interview"><BriefcaseBusiness /><div><b>{career === 'UNEMPLOYED' ? 'Interview available' : career}</b><span>Future task: analyze two market briefs accurately</span></div>{career === 'UNEMPLOYED' ? <button disabled={pendingAction !== null} onClick={() => void acceptJob()}>{pendingAction === 'hire' ? 'INTERVIEWING…' : 'INTERVIEW'}</button> : <i>HIRED</i>}</div></>}
        </dialog>}
      </section>
      <footer><span>NET WORTH <b>${netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b></span><span>TOTAL PROGRESS <b className={netWorth >= 10000 ? 'gain' : 'loss'}>{netWorth >= 10000 ? '+' : ''}${(netWorth - 10000).toFixed(2)}</b></span><span>PROPERTY <b>${propertyValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b></span><span>CITY TAX <b>${tax.toFixed(2)}</b></span><span>APARTMENT <b>{leaseDays} DAYS</b></span><span>SIM POPULATION <b>8.3B · 32 LOCAL NPCs</b></span></footer>
    </main>
  );
}
