'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Clone, Environment, Html, Sky, useAnimations, useGLTF } from '@react-three/drei';
import {
  Banknote,
  BriefcaseBusiness,
  Building2,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock3,
  Coins,
  Footprints,
  GraduationCap,
  Heart,
  Hospital,
  Home,
  Leaf,
  Map as MapIcon,
  MapPin,
  Menu,
  Newspaper,
  Shirt,
  ShoppingBag,
  Shield,
  Ship,
  Smile,
  Store,
  TrainFront,
  Trophy,
  Users,
  Utensils,
  WalletCards,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { WORLD_ASSET_COUNTS } from './world-asset-catalog';

type Place = 'market' | 'fashion' | 'restaurant' | 'property' | 'career' | 'news' | 'map' | 'inventory' | 'menu' | 'villa' | 'studio' | 'wellness' | 'social' | 'hospital' | 'police' | 'academy' | 'dealership' | 'grocer' | 'marina' | 'residences' | null;
type EnterPlace = (place: Place, atlasId?: string) => void;
type WorldDistrict = 'STARTER_ARCOLOGY' | 'CBD';
type WorldSceneId = WorldDistrict | 'AZURE_YACHT_MARINA' | 'CROWN_RESIDENTIAL_TOWERS' | 'MILLIONAIRE_RIDGE';
type SceneProfileId = WorldSceneId | 'STUDIO_INTERIOR';
type PlayerLocation = { scene: SceneProfileId; x: number; z: number };
type AtlasKind = 'HOME' | 'PARK' | 'MARKET' | 'SEA' | 'VILLAS' | 'MOUNTAINS' | 'HOSPITAL' | 'POLICE' | 'SCHOOL' | 'AUTO' | 'MARINA' | 'PORT' | 'GROCER' | 'RESIDENTIAL';
type AtlasNode = {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: AtlasKind;
  zone: string;
  detail: string;
  place?: Exclude<Place, null>;
  scene?: WorldSceneId;
  availability: 'PLAYABLE' | 'ACTIVITY' | 'GATED' | 'PLANNED';
};
type TransitMode = 'METRO' | 'TAXI';
type Journey = {
  destination: WorldDistrict;
  targetLabel: string;
  mode: TransitMode;
  fare: number;
  durationGameMinutes: number;
};
type CareCategory = 'MEAL' | 'WELLNESS' | 'LEISURE';
type LifeOption = {
  code: string;
  name: string;
  price: number;
  happiness: number;
  nutrition: number;
  protein: number;
  produce: number;
  carePoints: number;
  category: CareCategory;
  district: 'ANY' | 'CBD';
  description: string;
};
type JobOption = {
  code: string;
  name: string;
  pay: number;
  happiness: number;
  district: 'ANY' | 'CBD';
  durationMinutes: number;
  description: string;
  requiresCareer?: boolean;
};
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
  currentDistrict?: unknown;
  starterTower?: unknown;
  starterFloor?: unknown;
  starterUnit?: unknown;
  transitSpend?: unknown;
  transitTrips?: unknown;
  metroRides?: unknown;
  taxiRides?: unknown;
  nutrition?: unknown;
  careStreak?: unknown;
  dailyCarePoints?: unknown;
  dailyProtein?: unknown;
  dailyProduce?: unknown;
  tradingFeeBps?: unknown;
  lastMealTurn?: unknown;
  lastWellnessTurn?: unknown;
  lastLeisureTurn?: unknown;
  lastWorkTurn?: unknown;
  shiftsToday?: unknown;
  wagesToday?: unknown;
  lifetimeWages?: unknown;
  socialMode?: unknown;
  contactCoins?: unknown;
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
  residence?: unknown;
  mobility?: unknown;
  commute?: unknown;
  activity?: unknown;
  work?: unknown;
  wellbeing?: unknown;
  employment?: unknown;
  social?: unknown;
  socialUpdate?: unknown;
  error?: unknown;
};

const CBD_ONLY_PLACES: Place[] = ['market', 'fashion', 'restaurant', 'property', 'villa', 'hospital', 'police', 'academy', 'dealership', 'grocer', 'marina', 'residences'];
const CBD_ARRIVAL_PLACES: Place[] = [...CBD_ONLY_PLACES, 'career', 'wellness', 'social'];
const TRANSIT = {
  METRO: { fare: 5, durationGameMinutes: 28, realDurationMs: 1700 },
  TAXI: { fare: 45, durationGameMinutes: 11, realDurationMs: 900 },
} as const;

const LIFE_OPTIONS: LifeOption[] = [
  { code: 'DELIVERY_BOWL', name: 'Basic Delivery Bowl', price: 12, happiness: 2, nutrition: 6, protein: 15, produce: 5, carePoints: 0, category: 'MEAL', district: 'ANY', description: 'Keeps you going, but delivery alone will not improve long-term care.' },
  { code: 'PROTEIN_PLATE', name: 'Protein Plate', price: 22, happiness: 5, nutrition: 18, protein: 100, produce: 25, carePoints: 3, category: 'MEAL', district: 'CBD', description: 'A complete CBD meal with enough protein to materially improve recovery.' },
  { code: 'FRESH_FRUIT_BOX', name: 'Fresh Fruit Box', price: 8, happiness: 3, nutrition: 10, protein: 10, produce: 100, carePoints: 2, category: 'WELLNESS', district: 'ANY', description: 'A low-cost daily choice available at home or in the city.' },
  { code: 'PARK_WALK', name: 'Waterfront Park Walk', price: 0, happiness: 4, nutrition: 0, protein: 0, produce: 0, carePoints: 1, category: 'LEISURE', district: 'CBD', description: 'Free recovery on the CBD promenade after the market closes.' },
  { code: 'COAST_DAY_TRIP', name: 'Coast Day Trip', price: 80, happiness: 14, nutrition: 2, protein: 0, produce: 0, carePoints: 4, category: 'LEISURE', district: 'CBD', description: 'A compressed trip through coast, park and mountain overlook.' },
  { code: 'ISLAND_WEEKEND', name: 'Island Weekend', price: 320, happiness: 24, nutrition: 4, protein: 0, produce: 0, carePoints: 6, category: 'LEISURE', district: 'CBD', description: 'Premium leisure paid entirely with earned virtual dollars.' },
];

const JOB_OPTIONS: JobOption[] = [
  { code: 'REMOTE_NEWS_TAGGER', name: 'Remote News Tagger', pay: 12, happiness: -1, district: 'ANY', durationMinutes: 3, description: 'Classify world events from the home terminal.' },
  { code: 'PARK_STEWARD', name: 'Waterfront Park Steward', pay: 18, happiness: 2, district: 'CBD', durationMinutes: 4, description: 'Help visitors and keep the broad promenade relaxed.' },
  { code: 'CAFE_CLOSING_SHIFT', name: 'Nova Cafe Closing Shift', pay: 24, happiness: -3, district: 'CBD', durationMinutes: 5, description: 'A reliable shift that pays for several city visits.' },
  { code: 'MARKET_BRIEF_REVIEW', name: 'Market Brief Review', pay: 30, happiness: -4, district: 'CBD', durationMinutes: 6, description: 'A focused research task unlocked by the Career Tower interview.', requiresCareer: true },
];

const WORLD_ATLAS = [
  { id: 'starter', name: 'Starter Arcology', x: 2, y: 4, kind: 'HOME', zone: 'SOUTH RESIDENTIAL', detail: '1,000 residential towers · your 10 m² studio', place: 'studio', scene: 'STARTER_ARCOLOGY', availability: 'PLAYABLE' },
  { id: 'academy', name: 'AmpliWorld Academy', x: 5.5, y: 8, kind: 'SCHOOL', zone: 'EDUCATION BELT', detail: 'School campus, learning commons and sports court', place: 'academy', availability: 'PLAYABLE' },
  { id: 'deepwater', name: 'South Deepwater Port', x: 1, y: 10, kind: 'PORT', zone: 'INDUSTRIAL COAST', detail: 'Cargo handling, ocean liners, tugs and port employment', place: 'marina', availability: 'PLAYABLE' },
  { id: 'hospital', name: 'Meridian General Hospital', x: 8, y: 11, kind: 'HOSPITAL', zone: 'PUBLIC SERVICES', detail: 'Emergency department, inpatient towers and healing garden', place: 'hospital', availability: 'PLAYABLE' },
  { id: 'midrise', name: 'Canopy Pool Residences', x: 11.5, y: 12.5, kind: 'RESIDENTIAL', zone: 'MIDTOWN', detail: 'Five- and six-floor studios, 1B and 2B homes around a shared pool', place: 'residences', availability: 'PLAYABLE' },
  { id: 'police', name: 'Civic Safety Headquarters', x: 16.5, y: 14, kind: 'POLICE', zone: 'EAST CIVIC', detail: 'Police services, public lobby and emergency coordination', place: 'police', availability: 'PLAYABLE' },
  { id: 'public-marina', name: 'Harbor Steps Marina', x: 2, y: 15, kind: 'MARINA', zone: 'PUBLIC WATERFRONT', detail: 'Public slips, fishing boats, speedboats and city ferries', place: 'marina', availability: 'PLAYABLE' },
  { id: 'fresh-market', name: 'Verdant Fresh Market', x: 12.5, y: 15, kind: 'GROCER', zone: 'CENTRAL MARKET', detail: 'Fruit, vegetables and everyday nutrition for the daily-care loop', place: 'grocer', availability: 'PLAYABLE' },
  { id: 'park', name: 'Central Park', x: 11, y: 16, kind: 'PARK', zone: 'CENTRAL GREEN AXIS', detail: 'Lakes, trails and free daily recovery', place: 'wellness', availability: 'PLAYABLE' },
  { id: 'cbd', name: 'Cyber CBD', x: 14, y: 18, kind: 'MARKET', zone: 'CITY CORE', detail: 'Exchange, work, dining, social plaza and luxury residences', place: 'market', scene: 'CBD', availability: 'PLAYABLE' },
  { id: 'crown-residences', name: 'Crown Residential Towers', x: 15, y: 20.5, kind: 'RESIDENTIAL', zone: 'CITY CORE', detail: 'Distinctive sci-fi towers with one luxury full-floor home per level', place: 'residences', scene: 'CROWN_RESIDENTIAL_TOWERS', availability: 'PLAYABLE' },
  { id: 'auto-4s', name: 'Apex Motors 4S', x: 18, y: 9.5, kind: 'AUTO', zone: 'EAST AUTO DISTRICT', detail: 'Vehicle sales, service, spare parts and owner support', place: 'dealership', availability: 'PLAYABLE' },
  { id: 'yacht-marina', name: 'Azure Yacht Marina', x: 2.8, y: 21, kind: 'MARINA', zone: 'NORTH WATERFRONT', detail: 'Sailing boats, private yachts and large passenger vessels', place: 'marina', scene: 'AZURE_YACHT_MARINA', availability: 'PLAYABLE' },
  { id: 'ridge', name: 'Millionaire Ridge', x: 16.5, y: 24.5, kind: 'VILLAS', zone: 'NORTHEAST RIDGE', detail: 'Visit seven detached-home styles; ownership remains net-worth gated', place: 'villa', scene: 'MILLIONAIRE_RIDGE', availability: 'PLAYABLE' },
  { id: 'highlands', name: 'North Highlands', x: 9, y: 28, kind: 'MOUNTAINS', zone: 'NORTH HIGHLANDS', detail: 'Mountain trails, overlooks and research stations', availability: 'PLANNED' },
] as const satisfies readonly AtlasNode[];

const CBD_LOCAL_LANDMARKS = [
  { id: 'marina', label: 'MARINA', x: -34, z: 9, kind: 'marina' },
  { id: 'grocer', label: 'MARKET', x: -25, z: -3, kind: 'grocer' },
  { id: 'academy', label: 'SCHOOL', x: -25, z: 16, kind: 'school' },
  { id: 'exchange', label: 'EXCHANGE', x: 0, z: -33, kind: 'market' },
  { id: 'hospital', label: 'HOSPITAL', x: 27, z: -14, kind: 'hospital' },
  { id: 'police', label: 'POLICE', x: 27, z: 3, kind: 'police' },
  { id: 'dealer', label: '4S', x: 27, z: 25, kind: 'auto' },
] as const;

const MARINA_LOCAL_LANDMARKS = [
  { id: 'marina-promenade', label: 'PROMENADE', x: 6, z: 0, kind: 'marina' },
  { id: 'marina-club', label: 'YACHT CLUB', x: 23, z: -15, kind: 'market' },
  { id: 'marina-hotel', label: 'COAST HOTEL', x: 25, z: 14, kind: 'home' },
  { id: 'marina-piers', label: 'PIERS', x: -5, z: 5, kind: 'marina' },
] as const;

const CROWN_LOCAL_LANDMARKS = [
  { id: 'crown-helix', label: 'A01 HELIX', x: -15, z: -10, kind: 'home' },
  { id: 'crown-prism', label: 'A02 PRISM', x: 0, z: -15, kind: 'home' },
  { id: 'crown-bridge', label: 'A03 SKYBRIDGE', x: 15, z: -10, kind: 'home' },
  { id: 'crown-pool', label: 'RESIDENT POOL', x: 0, z: 7, kind: 'marina' },
] as const;

const RIDGE_LOCAL_LANDMARKS = [
  { id: 'ridge-cn', label: 'B01 HUA COURT', x: -15, z: 18, kind: 'home' },
  { id: 'ridge-gb', label: 'B02 COTSWOLD', x: 15, z: 18, kind: 'home' },
  { id: 'ridge-us', label: 'B03 PACIFIC', x: -15, z: 2, kind: 'home' },
  { id: 'ridge-concrete', label: 'B04 ATLAS', x: 15, z: 2, kind: 'home' },
  { id: 'ridge-whitewood', label: 'B05 WHITEWOOD', x: -15, z: -14, kind: 'home' },
  { id: 'ridge-meadow', label: 'B06 MEADOW', x: 15, z: -14, kind: 'home' },
  { id: 'ridge-cyber', label: 'B07 NEON CLIFF', x: 0, z: -31, kind: 'home' },
] as const;

const SCENE_ATLAS_IDS: Record<WorldSceneId, string> = {
  STARTER_ARCOLOGY: 'starter',
  CBD: 'cbd',
  AZURE_YACHT_MARINA: 'yacht-marina',
  CROWN_RESIDENTIAL_TOWERS: 'crown-residences',
  MILLIONAIRE_RIDGE: 'ridge',
};

const SCENE_LABELS: Record<WorldSceneId, string> = {
  STARTER_ARCOLOGY: 'OUTER RING · STARTER ARCOLOGY',
  CBD: 'CYBER CBD',
  AZURE_YACHT_MARINA: 'NORTH WATERFRONT · AZURE YACHT MARINA',
  CROWN_RESIDENTIAL_TOWERS: 'CITY CORE · CROWN RESIDENTIAL TOWERS',
  MILLIONAIRE_RIDGE: 'NORTHEAST RIDGE · VILLA DISTRICT',
};

const sceneDistrict = (scene: WorldSceneId): WorldDistrict => scene === 'STARTER_ARCOLOGY' ? 'STARTER_ARCOLOGY' : 'CBD';

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

const CBD_PLAYER_BLOCKERS = [
  [-19, -27, 4.6, 4.6], [0, -24, 4.8, 4.6], [19, -27, 4.6, 4.6], [0, -35, 4.2, 3.4],
  [-18, -12, 3.2, 3.2], [18, -12, 3.2, 3.2], [-18, 0, 3.2, 3.2], [18, 0, 3.2, 3.2],
  [27, -14, 6.2, 5.2], [27, 3, 5.3, 4.4], [-25, 16, 8.3, 7.2], [27, 25, 8.3, 6.3],
  [-25, -3, 5.4, 4.5], [-26, 29, 11.5, 7.2], [0, 13, 3.4, 3.4],
] as const;

const STARTER_PLAYER_BLOCKERS = [
  [-15, -6, 3.7, 4.1], [15, -6, 3.7, 4.1],
  [-15, 14, 3.5, 3.7], [15, 14, 3.5, 3.7],
  [0, -18, 3.2, 2.1],
] as const;

const STUDIO_PLAYER_BLOCKERS = [
  [-2.6, -0.8, 1.05, 2.1], [2.55, -1.4, 0.8, 1.2], [2.5, 2.2, 0.85, 0.85],
] as const;

const MARINA_PLAYER_BLOCKERS = [
  [23, -15, 3.8, 3.2], [25, 14, 4.2, 5.1],
] as const;

const CROWN_PLAYER_BLOCKERS = [
  [-15, -10, 4.8, 4.8], [0, -15, 4.8, 4.8], [15, -10, 4.8, 4.8], [0, 7, 5.4, 5.4],
] as const;

const RIDGE_PLAYER_BLOCKERS = [
  [-15, 18, 4.4, 4.7], [15, 18, 4.4, 4.7], [-15, 2, 4.4, 4.7], [15, 2, 4.4, 4.7],
  [-15, -14, 4.4, 4.7], [15, -14, 4.4, 4.7], [0, -31, 5.2, 5.2],
  [-2.1, 18, 1.4, 2.4], [2.1, 5, 1.4, 2.4], [-2.1, -13, 1.4, 2.4],
] as const;

const ARCOLOGY_TOWER_TOTAL = 1000;
const DETAILED_ARCOLOGY_TOWER_TOTAL = 4;
const ARCOLOGY_FLOORS = 50;
const ARCOLOGY_TOWER_HEIGHT = 29.7;

const SCENE_PROFILES: Record<SceneProfileId, {
  spawn: [number, number, number];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  cameraOffset: [number, number, number];
  speed: number;
  blockers: readonly (readonly [number, number, number, number])[];
}> = {
  STARTER_ARCOLOGY: { spawn: [0, 0, 9], bounds: { minX: -26, maxX: 26, minZ: -25, maxZ: 26 }, cameraOffset: [0, 3.5, 6.4], speed: 5.2, blockers: STARTER_PLAYER_BLOCKERS },
  CBD: { spawn: [0, 0, 34], bounds: { minX: -36, maxX: 37, minZ: -39, maxZ: 38 }, cameraOffset: [0, 3.5, 6.4], speed: 5.8, blockers: CBD_PLAYER_BLOCKERS },
  AZURE_YACHT_MARINA: { spawn: [3, 0, 22], bounds: { minX: -9, maxX: 34, minZ: -34, maxZ: 34 }, cameraOffset: [0, 3.5, 6.4], speed: 5.4, blockers: MARINA_PLAYER_BLOCKERS },
  CROWN_RESIDENTIAL_TOWERS: { spawn: [0, 0, 27], bounds: { minX: -28, maxX: 28, minZ: -22, maxZ: 30 }, cameraOffset: [0, 3.5, 6.4], speed: 5.2, blockers: CROWN_PLAYER_BLOCKERS },
  MILLIONAIRE_RIDGE: { spawn: [0, 0, 34], bounds: { minX: -34, maxX: 34, minZ: -39, maxZ: 37 }, cameraOffset: [0, 3.5, 6.4], speed: 5.2, blockers: RIDGE_PLAYER_BLOCKERS },
  STUDIO_INTERIOR: { spawn: [0, 0, 2.8], bounds: { minX: -3.8, maxX: 3.8, minZ: -3.7, maxZ: 4 }, cameraOffset: [0, 2.8, 4.7], speed: 3.8, blockers: STUDIO_PLAYER_BLOCKERS },
};

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
  label: string; place?: Place; onEnter?: EnterPlace;
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
const WATERCRAFT_ASSET_ROOT = '/assets/3d/vendor/kenney/watercraft-kit/models';
const HERO_CHARACTER_ASSET_ROOT = '/assets/3d/vendor/quaternius/ultimate-modular-citizens/models';
const NATURE_ASSET_ROOT = '/assets/3d/vendor/kenney/nature-kit/models';

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

function CharacterAsset({ url, animation, scale = 1, shadows = true }: { url: string; animation: string; scale?: number; shadows?: boolean }) {
  const root = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, root);
  useEffect(() => {
    const action = actions[animation];
    action?.reset().fadeIn(0.18).play();
    return () => { action?.fadeOut(0.16); };
  }, [actions, animation]);
  return <group ref={root} scale={scale}><Clone object={scene} castShadow={shadows} receiveShadow={shadows} /></group>;
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

export function VillaDistrict({ netWorth, onEnter }: { netWorth: number; onEnter: EnterPlace; onDenied: (message: string) => void }) {
  const verified = netWorth >= 1_000_000;
  const approach = () => onEnter('villa');
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
        <button className="world-label enterable prestige" onClick={approach}>MILLIONAIRE RIDGE · {verified ? 'PURCHASE STATUS VERIFIED' : 'VISITOR ACCESS'}</button>
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
        <CharacterAsset url={modelUrl} animation="Walk" scale={0.9} shadows={false} />
      </Suspense>
    </group>
  );
}

function PopulationLayer({ count = 32 }: { count?: number }) {
  return <group>{Array.from({ length: count }, (_, seed) => <Citizen key={seed} seed={seed} />)}</group>;
}

function TowerFloorBands({ width, depth, floors = ARCOLOGY_FLOORS }: { width: number; depth: number; floors?: number }) {
  const front = useRef<THREE.InstancedMesh>(null);
  const side = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const matrix = new THREE.Matrix4();
    for (let floor = 0; floor < floors; floor += 1) {
      const y = 0.37 + floor * 0.58;
      matrix.makeTranslation(0, y, depth / 2 + 0.012);
      front.current?.setMatrixAt(floor, matrix);
      matrix.makeRotationY(Math.PI / 2);
      matrix.setPosition(width / 2 + 0.012, y, 0);
      side.current?.setMatrixAt(floor, matrix);
    }
    if (front.current) front.current.instanceMatrix.needsUpdate = true;
    if (side.current) side.current.instanceMatrix.needsUpdate = true;
  }, [depth, floors, width]);
  return (
    <>
      <instancedMesh ref={front} args={[undefined, undefined, floors]} frustumCulled>
        <planeGeometry args={[width * 0.86, 0.055]} />
        <meshBasicMaterial color="#8aa9a4" toneMapped={false} transparent opacity={0.5} />
      </instancedMesh>
      <instancedMesh ref={side} args={[undefined, undefined, floors]} frustumCulled>
        <planeGeometry args={[depth * 0.86, 0.055]} />
        <meshBasicMaterial color="#5f7f7b" toneMapped={false} transparent opacity={0.4} />
      </instancedMesh>
    </>
  );
}

function ArcologyTower({ position, block, home = false, onEnter }: {
  position: [number, number, number];
  block: string;
  home?: boolean;
  onEnter: EnterPlace;
}) {
  const width = home ? 6.4 : 6;
  const depth = home ? 6.7 : 6.2;
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, ARCOLOGY_TOWER_HEIGHT / 2, 0]}>
        <boxGeometry args={[width, ARCOLOGY_TOWER_HEIGHT, depth]} />
        <meshStandardMaterial color={home ? '#18211f' : '#151d1d'} roughness={0.82} metalness={0.24} emissive={home ? '#193b31' : '#1e2a29'} emissiveIntensity={0.17} />
      </mesh>
      <TowerFloorBands width={width} depth={depth} />
      <mesh receiveShadow position={[0, 0.22, depth / 2 + 0.42]}>
        <boxGeometry args={[width + 0.8, 0.44, 1.15]} />
        <meshStandardMaterial color="#222927" roughness={0.94} />
      </mesh>
      <mesh position={[0, 1.36, depth / 2 + 0.04]}>
        <planeGeometry args={[1.65, 1.95]} />
        <meshStandardMaterial color="#0c1111" metalness={0.72} roughness={0.3} emissive={home ? '#42f5af' : '#6b7f79'} emissiveIntensity={home ? 0.42 : 0.1} />
      </mesh>
      <mesh castShadow position={[0, 30.2, 0]}>
        <boxGeometry args={[1.3, 1, 1.3]} />
        <meshStandardMaterial color="#262f2c" roughness={0.68} />
      </mesh>
      <Html position={[0, home ? 4.7 : 3.5, depth / 2 + 0.65]} center distanceFactor={13} zIndexRange={[3, 0]}>
        {home
          ? <button className="world-label enterable residence-label" onClick={() => onEnter('studio')}>{`YOUR 10 m² STUDIO · ${block}`}</button>
          : <span className="world-label arcology-label">{`${block} · 10,000 RESIDENTS`}</span>}
      </Html>
    </group>
  );
}

function ArcologyTowerField() {
  const towers = useRef<THREE.InstancedMesh>(null);
  const beacons = useRef<THREE.InstancedMesh>(null);
  const layout = useMemo(() => Array.from({ length: ARCOLOGY_TOWER_TOTAL - DETAILED_ARCOLOGY_TOWER_TOTAL }, (_, index) => {
    const column = index % 40;
    const row = Math.floor(index / 40);
    const height = ARCOLOGY_TOWER_HEIGHT;
    const width = 4.45 + ((index * 7) % 4) * 0.18;
    return {
      position: new THREE.Vector3((column - 19.5) * 8.5, height / 2, -31 - row * 9),
      scale: new THREE.Vector3(width, height, 4.75 + ((index * 11) % 3) * 0.18),
      color: new THREE.Color().setHSL(0.43 + (index % 7) * 0.005, 0.11, 0.12 + (index % 5) * 0.009),
    };
  }), []);
  useEffect(() => {
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    for (let index = 0; index < layout.length; index += 1) {
      const tower = layout[index];
      matrix.compose(tower.position, quaternion, tower.scale);
      towers.current?.setMatrixAt(index, matrix);
      towers.current?.setColorAt(index, tower.color);
      matrix.compose(
        new THREE.Vector3(tower.position.x, tower.scale.y + 0.28, tower.position.z),
        quaternion,
        new THREE.Vector3(0.16, 0.55, 0.16),
      );
      beacons.current?.setMatrixAt(index, matrix);
    }
    if (towers.current) {
      towers.current.instanceMatrix.needsUpdate = true;
      if (towers.current.instanceColor) towers.current.instanceColor.needsUpdate = true;
    }
    if (beacons.current) beacons.current.instanceMatrix.needsUpdate = true;
  }, [layout]);
  return (
    <group>
      <instancedMesh ref={towers} args={[undefined, undefined, layout.length]} castShadow={false} receiveShadow frustumCulled>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#26312f" vertexColors roughness={0.9} metalness={0.08} emissive="#172522" emissiveIntensity={0.2} />
      </instancedMesh>
      <instancedMesh ref={beacons} args={[undefined, undefined, layout.length]} frustumCulled>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#d05b3e" toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

function StarterArcology({ onEnter, onNotice, residenceBlock }: { onEnter: EnterPlace; onNotice: (message: string) => void; residenceBlock: string }) {
  return (
    <>
      <fog attach="fog" args={['#0b1010', 45, 245]} />
      <Sky sunPosition={[-2, 0.08, -4]} turbidity={13} rayleigh={3.1} mieCoefficient={0.02} mieDirectionalG={0.82} />
      <ambientLight intensity={0.42} color="#9db4aa" />
      <directionalLight castShadow position={[8, 19, 9]} intensity={1.65} color="#b6c7bd" shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[380, 520]} />
        <meshStandardMaterial color="#111716" roughness={0.98} />
      </mesh>
      <ArcologyTowerField />
      <ArcologyTower position={[-15, 0, -6]} block={`BLOCK ${residenceBlock}`} home onEnter={onEnter} />
      <ArcologyTower position={[15, 0, -6]} block="BLOCK 072" onEnter={onEnter} />
      <ArcologyTower position={[-15, 0, 14]} block="BLOCK 070" onEnter={onEnter} />
      <ArcologyTower position={[15, 0, 14]} block="BLOCK 073" onEnter={onEnter} />
      <mesh receiveShadow position={[0, 0.025, 1.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 44]} />
        <meshStandardMaterial color="#202827" roughness={0.96} />
      </mesh>
      {[-3.2, 0, 3.2].map((x) => <mesh key={x} position={[x, 0.05, 1.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.07, 44]} /><meshBasicMaterial color="#8f9c8d" transparent opacity={0.48} /></mesh>)}
      <group position={[0, 0, -18]} onClick={() => onEnter('map')}>
        <mesh castShadow receiveShadow position={[0, 1, 0]}><boxGeometry args={[6.2, 2, 3.7]} /><meshStandardMaterial color="#1d2625" metalness={0.33} roughness={0.63} /></mesh>
        <mesh position={[0, 1.15, 1.87]}><planeGeometry args={[4.8, 0.92]} /><meshStandardMaterial color="#07100e" emissive="#43a987" emissiveIntensity={0.36} /></mesh>
        <mesh position={[-2.15, 2.45, 0]}><cylinderGeometry args={[0.42, 0.42, 2.3, 20]} /><meshStandardMaterial color="#d05b3e" emissive="#c84332" emissiveIntensity={0.42} /></mesh>
        <Html position={[0, 3.15, 0]} center distanceFactor={12} zIndexRange={[3, 0]}><button className="world-label enterable transit-label" onClick={() => onEnter('map')}>METRO TO CBD · $5 · 28 MIN</button></Html>
      </group>
      <Suspense fallback={null}>
        <StaticAsset url={`${CAR_ASSET_ROOT}/taxi.glb`} position={[5.2, 0.05, -14.5]} rotation={[0, Math.PI, 0]} scale={0.9} />
      </Suspense>
      <Html position={[5.2, 2.35, -14.5]} center distanceFactor={12} zIndexRange={[3, 0]}><button className="world-label enterable taxi-label" onClick={() => { onNotice('CBD IS 18.4 KM AWAY · CHOOSE YOUR PAID RIDE'); onEnter('map'); }}>TAXI TO CBD · $45 · 11 MIN</button></Html>
      <group position={[0, 0, -28]}>
        <mesh position={[0, 0.16, 0]}><boxGeometry args={[20, 0.3, 0.22]} /><meshStandardMaterial color="#414a45" metalness={0.56} /></mesh>
        {[-9.5, -6.3, -3.1, 0, 3.1, 6.3, 9.5].map((x) => <mesh key={x} position={[x, 1.15, 0]}><boxGeometry args={[0.12, 2.2, 0.12]} /><meshStandardMaterial color="#343e39" /></mesh>)}
      </group>
      <Html position={[0, 10.8, -29]} center distanceFactor={17} zIndexRange={[3, 0]}>
        <span className="zone-label arcology-scale">STARTER ARCOLOGY · 1,000 TOWERS · 10,000,000 RESIDENTS</span>
      </Html>
    </>
  );
}

const ACTIVE_PLAYER_POSITION = new THREE.Vector3(9999, 0, 9999);
const ACTIVE_TRAFFIC_POSITIONS = Array.from({ length: 4 }, () => new THREE.Vector3(9999, 0, 9999));

function Player({ scene, onPositionChange, enabled = true }: {
  scene: SceneProfileId;
  onPositionChange?: (location: PlayerLocation) => void;
  enabled?: boolean;
}) {
  const body = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const queuedKeys = useRef<string[]>([]);
  const facingAngle = useRef(Math.PI);
  const lastPositionReport = useRef(0);
  const lastReportedPosition = useRef(new THREE.Vector2(Number.NaN, Number.NaN));
  const cameraTarget = useRef(new THREE.Vector3());
  const [movementAction, setMovementAction] = useState<'idle' | 'walk'>('idle');
  const { camera } = useThree();
  const profile = SCENE_PROFILES[scene];
  useEffect(() => {
    lastReportedPosition.current.set(profile.spawn[0], profile.spawn[2]);
    facingAngle.current = Math.PI;
    cameraTarget.current.set(profile.spawn[0], profile.spawn[1] + 1.3, profile.spawn[2] - 1.6);
    camera.position.set(
      profile.spawn[0] - profile.cameraOffset[0],
      profile.spawn[1] + profile.cameraOffset[1],
      profile.spawn[2] + profile.cameraOffset[2],
    );
    camera.lookAt(cameraTarget.current);
    onPositionChange?.({ scene, x: profile.spawn[0], z: profile.spawn[2] });
  }, [camera, onPositionChange, profile.cameraOffset, profile.spawn, scene]);
  useEffect(() => {
    const normalizeControlKey = (key: string) => {
      const normalized = key.toLowerCase();
      if (normalized === 'arrowup') return 'w';
      if (normalized === 'arrowleft') return 'a';
      if (normalized === 'arrowdown') return 's';
      if (normalized === 'arrowright') return 'd';
      return normalized;
    };
    const update = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable)) return;
      const key = normalizeControlKey(event.key);
      const pressed = event.type === 'keydown';
      const wasPressed = Boolean(keys.current[key]);
      keys.current[key] = pressed;
      if (pressed && !wasPressed && ['w', 'a', 's', 'd'].includes(key)) queuedKeys.current.push(key);
      if (['w', 'a', 's', 'd'].includes(key)) event.preventDefault();
    };
    const virtual = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; pressed: boolean }>).detail;
      const wasPressed = Boolean(keys.current[detail.key]);
      keys.current[detail.key] = detail.pressed;
      if (detail.pressed && !wasPressed) queuedKeys.current.push(detail.key);
    };
    window.addEventListener('keydown', update);
    window.addEventListener('keyup', update);
    window.addEventListener('ampliworld-move', virtual);
    const release = () => { keys.current = {}; queuedKeys.current = []; };
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', update);
      window.removeEventListener('keyup', update);
      window.removeEventListener('ampliworld-move', virtual);
      window.removeEventListener('blur', release);
    };
  }, []);
  useEffect(() => {
    if (enabled) return;
    keys.current = {};
    queuedKeys.current = [];
  }, [enabled]);
  useFrame(({ clock }, delta) => {
    if (!body.current) return;
    const keysDown = keys.current;
    if (!enabled) {
      keys.current = {};
      queuedKeys.current = [];
    }
    const heldForward = enabled ? (keysDown.w ? 1 : 0) - (keysDown.s ? 1 : 0) : 0;
    const heldTurn = enabled ? (keysDown.a ? 1 : 0) - (keysDown.d ? 1 : 0) : 0;
    const pendingKeys = queuedKeys.current;
    queuedKeys.current = [];
    const movementKeys = new Set<string>();
    if (enabled) {
      (['w', 'a', 's', 'd'] as const).forEach((key) => { if (keysDown[key]) movementKeys.add(key); });
      pendingKeys.forEach((key) => movementKeys.add(key));
    }
    const forwardInput = (movementKeys.has('w') ? 1 : 0) - (movementKeys.has('s') ? 1 : 0);
    const turnInput = (movementKeys.has('a') ? 1 : 0) - (movementKeys.has('d') ? 1 : 0);
    const usingTap = !heldForward && !heldTurn && pendingKeys.length > 0;
    if (turnInput) {
      const turnStep = usingTap ? 0.14 : Math.min(delta, 1 / 30) * 2.45;
      facingAngle.current = THREE.MathUtils.euclideanModulo(facingAngle.current + turnInput * turnStep, Math.PI * 2);
      body.current.rotation.y = facingAngle.current;
    }
    const appliedMovement = new THREE.Vector3();
    if (forwardInput) {
      const direction = new THREE.Vector3(Math.sin(facingAngle.current), 0, Math.cos(facingAngle.current));
      const movement = direction.multiplyScalar((usingTap ? 0.42 : Math.min(delta, 1 / 30) * profile.speed) * (forwardInput > 0 ? 1 : -0.68));
      const blocked = (next: THREE.Vector3) => (
        profile.blockers.some(([x, z, halfX, halfZ]) => Math.abs(next.x - x) < halfX + 0.38 && Math.abs(next.z - z) < halfZ + 0.38)
        || (scene === 'CBD' && ACTIVE_TRAFFIC_POSITIONS.some((vehicle) => next.distanceToSquared(vehicle) < 4))
      );
      const clamp = (next: THREE.Vector3) => {
        next.x = THREE.MathUtils.clamp(next.x, profile.bounds.minX, profile.bounds.maxX);
        next.z = THREE.MathUtils.clamp(next.z, profile.bounds.minZ, profile.bounds.maxZ);
        return next;
      };
      const start = body.current.position.clone();
      const substeps = Math.max(1, Math.ceil(movement.length() / 0.18));
      const step = movement.clone().divideScalar(substeps);
      for (let index = 0; index < substeps; index += 1) {
        const combined = clamp(body.current.position.clone().add(step));
        if (!blocked(combined)) {
          body.current.position.copy(combined);
        } else {
          const xOnly = clamp(body.current.position.clone().add(new THREE.Vector3(step.x, 0, 0)));
          if (step.x && !blocked(xOnly)) body.current.position.copy(xOnly);
          const zOnly = clamp(body.current.position.clone().add(new THREE.Vector3(0, 0, step.z)));
          if (step.z && !blocked(zOnly)) body.current.position.copy(zOnly);
        }
      }
      appliedMovement.copy(body.current.position).sub(start);
      if (appliedMovement.lengthSq() > 0.000001) {
        if (movementAction !== 'walk') setMovementAction('walk');
      } else if (movementAction !== 'idle') {
        setMovementAction('idle');
      }
      const reportedDx = body.current.position.x - lastReportedPosition.current.x;
      const reportedDz = body.current.position.z - lastReportedPosition.current.y;
      const reportedDistance = reportedDx * reportedDx + reportedDz * reportedDz;
      if ((usingTap || clock.elapsedTime - lastPositionReport.current >= 0.1) && reportedDistance >= 0.0025) {
        lastPositionReport.current = clock.elapsedTime;
        lastReportedPosition.current.set(body.current.position.x, body.current.position.z);
        onPositionChange?.({
          scene,
          x: Number(body.current.position.x.toFixed(2)),
          z: Number(body.current.position.z.toFixed(2)),
        });
      }
    } else if (movementAction !== 'idle') {
      setMovementAction('idle');
    }
    ACTIVE_PLAYER_POSITION.copy(body.current.position);
    const forward = new THREE.Vector3(Math.sin(facingAngle.current), 0, Math.cos(facingAngle.current));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    const desiredCamera = body.current.position.clone()
      .addScaledVector(forward, -profile.cameraOffset[2])
      .addScaledVector(right, profile.cameraOffset[0])
      .add(new THREE.Vector3(0, profile.cameraOffset[1], 0));
    const cameraAlpha = 1 - Math.exp(-delta * 5.4);
    const targetAlpha = 1 - Math.exp(-delta * 7);
    camera.position.lerp(desiredCamera, cameraAlpha);
    cameraTarget.current.lerp(body.current.position.clone().add(new THREE.Vector3(0, 1.3, 0)).addScaledVector(forward, 1.6), targetAlpha);
    camera.lookAt(cameraTarget.current);
  });
  return (
    <group ref={body} position={profile.spawn} rotation={[0, Math.PI, 0]}>
      <Suspense fallback={<mesh castShadow position={[0, 0.8, 0]}><capsuleGeometry args={[0.38, 0.9, 6, 12]} /><meshStandardMaterial color="#e7fff5" metalness={0.65} roughness={0.22} emissive="#27e8a1" emissiveIntensity={0.25} /></mesh>}>
        <CharacterAsset url={`${HERO_CHARACTER_ASSET_ROOT}/male-casual-hoodie.glb`} animation={movementAction === 'walk' ? 'Walk' : 'Idle'} scale={0.98} />
      </Suspense>
      <pointLight position={[0, 1.45, 0.22]} intensity={0.32} distance={2.8} color="#42f5af" />
    </group>
  );
}

function ParkTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.65, 0]}><cylinderGeometry args={[0.11, 0.18, 1.3, 8]} /><meshStandardMaterial color="#73543b" roughness={0.9} /></mesh>
      <mesh castShadow position={[0, 1.65, 0]}><dodecahedronGeometry args={[0.82, 0]} /><meshStandardMaterial color="#3d7654" roughness={0.88} /></mesh>
    </group>
  );
}

function LandmarkLabel({ position, label, place, atlasId, onEnter, tone = '' }: {
  position: [number, number, number];
  label: string;
  place: Exclude<Place, null>;
  atlasId?: string;
  onEnter: EnterPlace;
  tone?: string;
}) {
  return <Html position={position} center distanceFactor={13} zIndexRange={[3, 0]}><button className={`world-label enterable ${tone}`} onClick={(event) => { event.stopPropagation(); onEnter(place, atlasId); }}>{label}</button></Html>;
}

function CivicHospital({ onEnter }: { onEnter: EnterPlace }) {
  return (
    <group position={[27, 0, -14]} onClick={() => onEnter('hospital', 'hospital')}>
      <mesh receiveShadow position={[0, 0.08, 0]}><boxGeometry args={[12.2, 0.16, 10.2]} /><meshStandardMaterial color="#d8ddd8" roughness={0.88} /></mesh>
      <Suspense fallback={null}><StaticAsset url={`${COMMERCIAL_ASSET_ROOT}/building-j.glb`} position={[0, 0.15, -0.7]} scale={5.05} /></Suspense>
      {[-4.7, 4.7].map((x) => <mesh key={x} castShadow receiveShadow position={[x, 2.1, 1.1]}><boxGeometry args={[3.2, 4.1, 5.8]} /><meshStandardMaterial color="#edf0ea" roughness={0.72} metalness={0.08} /></mesh>)}
      {[-4.7, 4.7].flatMap((x) => [1, 2.15, 3.3].map((y) => <mesh key={`${x}-${y}`} position={[x, y, 4.02]}><boxGeometry args={[2.15, 0.38, 0.06]} /><meshStandardMaterial color="#7ec7d4" emissive="#255c68" emissiveIntensity={0.2} metalness={0.28} /></mesh>))}
      <mesh castShadow position={[0, 1.25, 4.15]}><boxGeometry args={[3.5, 0.28, 2.2]} /><meshStandardMaterial color="#eaf5f2" metalness={0.35} roughness={0.35} /></mesh>
      <mesh position={[0, 1.5, 4.02]}><boxGeometry args={[1.45, 2.25, 0.08]} /><meshStandardMaterial color="#24454c" metalness={0.5} roughness={0.2} transparent opacity={0.84} /></mesh>
      <mesh position={[0, 5.9, 3.42]}><boxGeometry args={[0.44, 1.65, 0.12]} /><meshStandardMaterial color="#ff514c" emissive="#ff2d27" emissiveIntensity={0.72} /></mesh>
      <mesh position={[0, 5.9, 3.43]}><boxGeometry args={[1.65, 0.44, 0.12]} /><meshStandardMaterial color="#ff514c" emissive="#ff2d27" emissiveIntensity={0.72} /></mesh>
      <mesh position={[0, 7.05, -0.2]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.8, 32]} /><meshStandardMaterial color="#dadeda" roughness={0.74} /></mesh>
      <mesh position={[0, 7.08, -0.2]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.15, 1.45, 32]} /><meshBasicMaterial color="#ef5650" /></mesh>
      <LandmarkLabel position={[0, 8.4, 0]} label="MERIDIAN GENERAL HOSPITAL" place="hospital" atlasId="hospital" onEnter={onEnter} tone="hospital-label" />
    </group>
  );
}

function CivicSafetyHQ({ onEnter }: { onEnter: EnterPlace }) {
  return (
    <group position={[27, 0, 3]} onClick={() => onEnter('police', 'police')}>
      <mesh receiveShadow position={[0, 0.08, 0]}><boxGeometry args={[10.4, 0.16, 8.6]} /><meshStandardMaterial color="#4c565c" roughness={0.93} /></mesh>
      <Suspense fallback={null}><StaticAsset url={`${INDUSTRIAL_ASSET_ROOT}/building-o.glb`} position={[0, 0.13, -0.4]} scale={5.8} /></Suspense>
      <mesh castShadow position={[-2.8, 2.05, 1.2]}><boxGeometry args={[3.8, 4, 5.4]} /><meshStandardMaterial color="#c9d0cf" roughness={0.76} /></mesh>
      <mesh castShadow position={[3.1, 1.45, 0.8]}><boxGeometry args={[4.1, 2.8, 5.9]} /><meshStandardMaterial color="#747f83" roughness={0.78} /></mesh>
      <mesh position={[-2.8, 1.45, 3.94]}><boxGeometry args={[1.55, 2.2, 0.08]} /><meshStandardMaterial color="#153144" emissive="#24669f" emissiveIntensity={0.34} metalness={0.42} /></mesh>
      <mesh position={[-3.25, 4.65, 1]}><boxGeometry args={[1.2, 0.16, 0.25]} /><meshStandardMaterial color="#4ebcff" emissive="#2189da" emissiveIntensity={0.85} /></mesh>
      <mesh position={[-2.35, 4.65, 1]}><boxGeometry args={[0.6, 0.16, 0.25]} /><meshStandardMaterial color="#ff5e61" emissive="#e52d35" emissiveIntensity={0.82} /></mesh>
      <mesh position={[2.8, 4.2, -1]}><cylinderGeometry args={[0.06, 0.06, 4.2, 8]} /><meshStandardMaterial color="#293238" metalness={0.8} /></mesh>
      <LandmarkLabel position={[0, 6.5, 0]} label="CIVIC SAFETY · POLICE" place="police" atlasId="police" onEnter={onEnter} tone="police-label" />
    </group>
  );
}

function AcademyCampus({ onEnter }: { onEnter: EnterPlace }) {
  return (
    <group position={[-25, 0, 16]} onClick={() => onEnter('academy', 'academy')}>
      <mesh receiveShadow position={[0, 0.06, 0]}><boxGeometry args={[16.2, 0.12, 13.8]} /><meshStandardMaterial color="#708063" roughness={0.96} /></mesh>
      <Suspense fallback={null}>
        <StaticAsset url={`${COMMERCIAL_ASSET_ROOT}/building-k.glb`} position={[-3.6, 0.12, -2.7]} rotation={[0, Math.PI / 2, 0]} scale={3.25} />
        <StaticAsset url={`${COMMERCIAL_ASSET_ROOT}/building-k.glb`} position={[3.6, 0.12, -2.7]} rotation={[0, -Math.PI / 2, 0]} scale={3.25} />
      </Suspense>
      <mesh castShadow position={[0, 2.05, -4.1]}><boxGeometry args={[5, 4, 3.4]} /><meshStandardMaterial color="#d8c9aa" roughness={0.8} /></mesh>
      <mesh position={[0, 1.5, -2.36]}><boxGeometry args={[1.7, 2.5, 0.08]} /><meshStandardMaterial color="#254352" emissive="#2c8292" emissiveIntensity={0.28} /></mesh>
      <mesh receiveShadow position={[3.3, 0.095, 3.5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[7.2, 4.8]} /><meshStandardMaterial color="#435f7d" roughness={0.85} /></mesh>
      {[0, 1].map((line) => <mesh key={line} position={[3.3, 0.105, 2.5 + line * 2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[6.5, 0.06]} /><meshBasicMaterial color="#e8e0ba" /></mesh>)}
      <mesh position={[-5.7, 3.35, -0.8]}><cylinderGeometry args={[0.05, 0.05, 6.6, 8]} /><meshStandardMaterial color="#d7d9d2" metalness={0.65} /></mesh>
      <LandmarkLabel position={[0, 6.3, -1]} label="AMPLIWORLD ACADEMY" place="academy" atlasId="academy" onEnter={onEnter} tone="school-label" />
    </group>
  );
}

function FreshMarket({ onEnter }: { onEnter: EnterPlace }) {
  return (
    <group position={[-25, 0, -3]} onClick={() => onEnter('grocer', 'fresh-market')}>
      <mesh receiveShadow position={[0, 0.06, 0]}><boxGeometry args={[10.4, 0.12, 8.4]} /><meshStandardMaterial color="#9b927a" roughness={0.92} /></mesh>
      <Suspense fallback={null}><StaticAsset url={`${COMMERCIAL_ASSET_ROOT}/building-g.glb`} position={[0, 0.12, -0.7]} scale={3.2} /></Suspense>
      <mesh castShadow position={[0, 1.45, 2.2]}><boxGeometry args={[8.1, 2.8, 3.2]} /><meshStandardMaterial color="#e2ddcb" roughness={0.76} /></mesh>
      <mesh position={[0, 1.4, 3.84]}><boxGeometry args={[6.8, 2, 0.08]} /><meshStandardMaterial color="#1e4e3d" emissive="#22895e" emissiveIntensity={0.3} /></mesh>
      {[-3, -1.5, 0, 1.5, 3].map((x, index) => <group key={x} position={[x, 0.48, 4.2]}><mesh castShadow><boxGeometry args={[1.15, 0.65, 0.9]} /><meshStandardMaterial color={index % 2 ? '#b47742' : '#8b5d39'} roughness={0.9} /></mesh>{Array.from({ length: 4 }, (_, fruit) => <mesh key={fruit} position={[-0.35 + (fruit % 2) * 0.7, 0.45, -0.24 + Math.floor(fruit / 2) * 0.45]}><sphereGeometry args={[0.18, 9, 7]} /><meshStandardMaterial color={index % 3 === 0 ? '#e66b48' : index % 3 === 1 ? '#72aa4f' : '#e3bd4e'} roughness={0.84} /></mesh>)}</group>)}
      <LandmarkLabel position={[0, 5.5, 0]} label="VERDANT · FRESH FRUIT &amp; VEGETABLES" place="grocer" atlasId="fresh-market" onEnter={onEnter} tone="grocer-label" />
    </group>
  );
}

function Auto4SDealership({ onEnter }: { onEnter: EnterPlace }) {
  const displayCars = [
    { model: 'sedan.glb', position: [-4.6, 0.24, 2.6] as [number, number, number], rotation: 0 },
    { model: 'suv-luxury.glb', position: [0, 0.24, 2.6] as [number, number, number], rotation: Math.PI },
    { model: 'race-future.glb', position: [4.6, 0.24, 2.6] as [number, number, number], rotation: 0 },
  ];
  return (
    <group position={[27, 0, 25]} onClick={() => onEnter('dealership', 'auto-4s')}>
      <mesh receiveShadow position={[0, 0.06, 0]}><boxGeometry args={[16.2, 0.12, 12.2]} /><meshStandardMaterial color="#545a57" roughness={0.94} /></mesh>
      <Suspense fallback={null}><StaticAsset url={`${INDUSTRIAL_ASSET_ROOT}/building-t.glb`} position={[4.5, 0.14, -2]} rotation={[0, Math.PI / 2, 0]} scale={4.5} /></Suspense>
      <mesh castShadow position={[-2.7, 2.1, -1.8]}><boxGeometry args={[9, 4.1, 5.2]} /><meshPhysicalMaterial color="#b9dfe5" metalness={0.18} roughness={0.12} transmission={0.42} transparent opacity={0.76} /></mesh>
      <mesh castShadow position={[-2.7, 4.25, -1.8]}><boxGeometry args={[9.6, 0.3, 5.7]} /><meshStandardMaterial color="#202c30" metalness={0.68} roughness={0.22} /></mesh>
      <mesh position={[-2.7, 2.2, 0.84]}><boxGeometry args={[7.7, 2.8, 0.08]} /><meshPhysicalMaterial color="#77bdca" transmission={0.6} transparent opacity={0.62} roughness={0.12} /></mesh>
      <Suspense fallback={null}>{displayCars.map((car) => <StaticAsset key={car.model} url={`${CAR_ASSET_ROOT}/${car.model}`} position={car.position} rotation={[0, car.rotation, 0]} scale={1.05} />)}</Suspense>
      {displayCars.map((car) => <mesh key={`${car.model}-pad`} position={[car.position[0], 0.13, car.position[2]]}><cylinderGeometry args={[1.35, 1.35, 0.12, 28]} /><meshStandardMaterial color="#5f7f82" metalness={0.5} roughness={0.22} /></mesh>)}
      <LandmarkLabel position={[0, 6.1, 0]} label="APEX MOTORS 4S" place="dealership" atlasId="auto-4s" onEnter={onEnter} tone="auto-label" />
    </group>
  );
}

function MidriseCommunity({ onEnter }: { onEnter: EnterPlace }) {
  const buildings = [
    { x: -6.3, z: 0, floors: 5, label: 'STUDIO' },
    { x: 0, z: -2, floors: 6, label: '1B' },
    { x: 6.3, z: 0, floors: 5, label: '2B' },
  ];
  return (
    <group position={[-26, 0, 29]} onClick={() => onEnter('residences', 'midrise')}>
      <mesh receiveShadow position={[0, 0.05, 0]}><boxGeometry args={[22.5, 0.1, 14]} /><meshStandardMaterial color="#71816e" roughness={0.96} /></mesh>
      {buildings.map((building) => <group key={building.label} position={[building.x, 0, building.z]}>
        <mesh castShadow receiveShadow position={[0, building.floors * 0.72, 0]}><boxGeometry args={[5.4, building.floors * 1.44, 5.2]} /><meshStandardMaterial color={building.label === '1B' ? '#d7d0c0' : '#e1ddd2'} roughness={0.78} /></mesh>
        {Array.from({ length: building.floors }, (_, floor) => <mesh key={floor} position={[0, 0.75 + floor * 1.42, 2.62]}><boxGeometry args={[4.25, 0.42, 0.06]} /><meshStandardMaterial color="#5d98a0" emissive="#25575f" emissiveIntensity={0.2} metalness={0.25} /></mesh>)}
        <mesh position={[0, 0.95, 2.67]}><boxGeometry args={[1.15, 1.65, 0.08]} /><meshStandardMaterial color="#394943" /></mesh>
        <Html position={[0, building.floors * 1.45 + 0.8, 0]} center distanceFactor={14} zIndexRange={[3, 0]}><span className="zone-label residence-tier">{building.label} · {building.floors} FLOORS</span></Html>
      </group>)}
      <mesh receiveShadow position={[0, 0.12, 4.2]}><boxGeometry args={[7.5, 0.18, 3.3]} /><meshPhysicalMaterial color="#4ea9bf" transmission={0.3} transparent opacity={0.82} roughness={0.12} /></mesh>
      <mesh position={[0, 0.24, 4.2]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[1.25, 1.38, 36]} /><meshBasicMaterial color="#d8f4ef" /></mesh>
      <LandmarkLabel position={[0, 10.3, 0]} label="CANOPY POOL RESIDENCES · STUDIO / 1B / 2B" place="residences" atlasId="midrise" onEnter={onEnter} tone="residential-label" />
    </group>
  );
}

function SciFiResidenceTower({ position, variant, label, onEnter }: {
  position: [number, number, number];
  variant: 'HELIX' | 'BRIDGE' | 'PRISM';
  label: string;
  onEnter: EnterPlace;
}) {
  return (
    <group position={position} onClick={() => onEnter('residences', 'crown-residences')}>
      {variant === 'HELIX' && Array.from({ length: 9 }, (_, floor) => <group key={floor} position={[0, 1.05 + floor * 1.35, 0]} rotation={[0, floor * 0.13, 0]}><mesh castShadow receiveShadow><boxGeometry args={[5.6, 1.2, 4.1]} /><meshStandardMaterial color={floor % 2 ? '#26383d' : '#d9dfdc'} metalness={0.42} roughness={0.28} /></mesh><mesh position={[0, 0, 2.07]}><boxGeometry args={[4.5, 0.48, 0.06]} /><meshStandardMaterial color="#66d7e7" emissive="#2d8e9c" emissiveIntensity={0.34} /></mesh></group>)}
      {variant === 'BRIDGE' && <><mesh castShadow receiveShadow position={[-2.15, 6.4, 0]}><boxGeometry args={[3.4, 12.8, 4]} /><meshStandardMaterial color="#d7dbd7" metalness={0.3} roughness={0.34} /></mesh><mesh castShadow receiveShadow position={[2.15, 7.6, 0]}><boxGeometry args={[3.4, 15.2, 4]} /><meshStandardMaterial color="#222f38" metalness={0.52} roughness={0.26} /></mesh>{[2.1, 5.2, 8.3, 11.4].map((y) => <mesh key={y} position={[0, y, 2.04]}><boxGeometry args={[6.5, 0.38, 0.06]} /><meshStandardMaterial color="#7cf0c3" emissive="#31b887" emissiveIntensity={0.42} /></mesh>)}<mesh castShadow position={[0, 10, 0]}><boxGeometry args={[2.8, 0.8, 3.2]} /><meshStandardMaterial color="#a7bbc0" metalness={0.6} roughness={0.22} /></mesh></>}
      {variant === 'PRISM' && Array.from({ length: 6 }, (_, tier) => <group key={tier} position={[0, 1.1 + tier * 2.15, 0]} rotation={[0, tier * 0.08, 0]}><mesh castShadow receiveShadow><cylinderGeometry args={[3.45 - tier * 0.2, 3.7 - tier * 0.2, 2, 8]} /><meshStandardMaterial color={tier % 2 ? '#1d3230' : '#cad6d0'} metalness={0.48} roughness={0.3} /></mesh><mesh position={[0, 0, 3.2 - tier * 0.18]}><boxGeometry args={[3.2, 0.45, 0.06]} /><meshStandardMaterial color="#d5a8ff" emissive="#9454ce" emissiveIntensity={0.4} /></mesh></group>)}
      <mesh receiveShadow position={[0, 0.08, 0]}><cylinderGeometry args={[4.2, 4.6, 0.16, 12]} /><meshStandardMaterial color="#47514e" roughness={0.88} /></mesh>
      <LandmarkLabel position={[0, 15.8, 0]} label={`${label} · FULL-FLOOR HOMES`} place="residences" atlasId="crown-residences" onEnter={onEnter} tone="residential-label" />
    </group>
  );
}

function FloatingWatercraft({ model, position, rotation = 0, scale = 1, phase = 0, shadows = true }: {
  model: string;
  position: [number, number, number];
  rotation?: number;
  scale?: number;
  phase?: number;
  shadows?: boolean;
}) {
  const craft = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!craft.current) return;
    craft.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.72 + phase) * 0.07;
    craft.current.rotation.z = Math.sin(clock.elapsedTime * 0.48 + phase) * 0.018;
  });
  return <group ref={craft} position={position} rotation={[0, rotation, 0]}><Suspense fallback={null}><StaticAsset url={`${WATERCRAFT_ASSET_ROOT}/${model}.glb`} scale={scale} shadows={shadows} /></Suspense></group>;
}

function WaterfrontMarina({ onEnter }: { onEnter: EnterPlace }) {
  const piers = [-18, -2, 14, 29];
  return (
    <group>
      <mesh receiveShadow position={[-47, -0.18, 1]}><boxGeometry args={[22, 0.32, 90]} /><meshPhysicalMaterial color="#267f9c" roughness={0.16} metalness={0.04} transmission={0.12} transparent opacity={0.9} /></mesh>
      <mesh receiveShadow position={[-36.5, 0.06, 1]}><boxGeometry args={[1.4, 0.28, 90]} /><meshStandardMaterial color="#8d8d7d" roughness={0.92} /></mesh>
      {piers.map((z, pier) => <group key={z}><mesh castShadow receiveShadow position={[-42, 0.18, z]}><boxGeometry args={[11.2, 0.28, 1.15]} /><meshStandardMaterial color="#7a5d42" roughness={0.88} /></mesh>{[-47, -43, -39].map((x) => <mesh key={x} position={[x, -0.15, z]}><cylinderGeometry args={[0.12, 0.16, 1.2, 8]} /><meshStandardMaterial color="#493829" roughness={0.96} /></mesh>)}{pier < 3 && <Suspense fallback={null}><StaticAsset url={`${WATERCRAFT_ASSET_ROOT}/buoy.glb`} position={[-46.5, 0.05, z + 2.8]} scale={1.5} shadows={false} /></Suspense>}</group>)}
      <FloatingWatercraft model="boat-fishing-small" position={[-42.5, 0.2, -14]} rotation={Math.PI / 2} scale={2.45} phase={1} />
      <FloatingWatercraft model="boat-speed-a" position={[-43.8, 0.2, -5]} rotation={Math.PI / 2} scale={2.7} phase={2} />
      <FloatingWatercraft model="boat-speed-f" position={[-43, 0.2, 7]} rotation={Math.PI / 2} scale={2.8} phase={3} />
      <FloatingWatercraft model="boat-sail-a" position={[-44.5, 0.2, 18]} rotation={Math.PI / 2} scale={2.7} phase={4} />
      <FloatingWatercraft model="ship-large" position={[-48, 0.3, 28]} rotation={Math.PI / 2} scale={2.25} phase={5} />
      <FloatingWatercraft model="boat-tug-a" position={[-50, 0.2, -28]} rotation={Math.PI / 2} scale={2.2} phase={6} shadows={false} />
      <FloatingWatercraft model="ship-cargo-a" position={[-54, 0.35, -17]} rotation={Math.PI / 2} scale={2.7} phase={7} shadows={false} />
      <FloatingWatercraft model="ship-ocean-liner" position={[-56, 0.4, 9]} rotation={Math.PI / 2} scale={2.5} phase={8} shadows={false} />
      <LandmarkLabel position={[-35.6, 4.1, 4]} label="HARBOR STEPS · BOATS / YACHTS / SHIPS" place="marina" atlasId="public-marina" onEnter={onEnter} tone="marina-label" />
    </group>
  );
}

const LEFT_CITY_TRAFFIC_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-13.35, 0.08, -18),
  new THREE.Vector3(-10.65, 0.08, -18),
  new THREE.Vector3(-10.65, 0.08, 36),
  new THREE.Vector3(-13.35, 0.08, 36),
], true, 'catmullrom', 0.08);

const RIGHT_CITY_TRAFFIC_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(10.65, 0.08, -18),
  new THREE.Vector3(13.35, 0.08, -18),
  new THREE.Vector3(13.35, 0.08, 36),
  new THREE.Vector3(10.65, 0.08, 36),
], true, 'catmullrom', 0.08);

function TrafficConvoy({ curve, vehicles: specs, slotOffset, initialProgress = 0 }: {
  curve: THREE.Curve<THREE.Vector3>;
  vehicles: readonly { model: string; phase: number }[];
  slotOffset: number;
  initialProgress?: number;
}) {
  const vehicles = useRef<Array<THREE.Group | null>>([]);
  const progress = useRef(initialProgress);
  useFrame((_, delta) => {
    const nextProgress = (progress.current + Math.min(delta, 0.05) * 0.025) % 1;
    const proposedPoints = specs.map((spec) => curve.getPointAt((nextProgress + spec.phase) % 1));
    const playerClear = proposedPoints.every((point) => point.distanceToSquared(ACTIVE_PLAYER_POSITION) > 12.25);
    if (playerClear) progress.current = nextProgress;
    specs.forEach((spec, index) => {
      const vehicle = vehicles.current[index];
      if (!vehicle) return;
      const vehicleProgress = (progress.current + spec.phase) % 1;
      const point = curve.getPointAt(vehicleProgress);
      const tangent = curve.getTangentAt(vehicleProgress);
      vehicle.position.copy(point);
      vehicle.rotation.y = Math.atan2(tangent.x, tangent.z);
      ACTIVE_TRAFFIC_POSITIONS[slotOffset + index].copy(point);
    });
  });
  return <group>{specs.map((spec, index) => <group ref={(node) => { vehicles.current[index] = node; }} key={`${spec.model}-${spec.phase}`}><Suspense fallback={null}><StaticAsset url={`${CAR_ASSET_ROOT}/${spec.model}.glb`} scale={0.85} shadows={false} /></Suspense></group>)}</group>;
}

function CityTraffic() {
  return <group>
    <TrafficConvoy curve={LEFT_CITY_TRAFFIC_CURVE} slotOffset={0} vehicles={[{ model: 'sedan', phase: 0 }, { model: 'taxi', phase: 0.5 }]} />
    <TrafficConvoy curve={RIGHT_CITY_TRAFFIC_CURVE} slotOffset={2} initialProgress={0.25} vehicles={[{ model: 'delivery', phase: 0 }, { model: 'race-future', phase: 0.5 }]} />
  </group>;
}

type VillaStyle = 'CHINESE' | 'ENGLISH' | 'AMERICAN' | 'CONCRETE' | 'WHITEWOOD' | 'PASTORAL' | 'CYBER';

const VILLA_STYLE_MODELS: Record<VillaStyle, { model: string; scale: number; accent: string }> = {
  CHINESE: { model: 'building-type-p.glb', scale: 2.65, accent: '#d5aa72' },
  ENGLISH: { model: 'building-type-d.glb', scale: 2.55, accent: '#bba487' },
  AMERICAN: { model: 'building-type-b.glb', scale: 2.6, accent: '#63cbd1' },
  CONCRETE: { model: 'building-type-q.glb', scale: 2.7, accent: '#acb4ae' },
  WHITEWOOD: { model: 'building-type-t.glb', scale: 2.65, accent: '#dfb070' },
  PASTORAL: { model: 'building-type-e.glb', scale: 2.6, accent: '#b7cf83' },
  CYBER: { model: 'building-type-u.glb', scale: 2.8, accent: '#52f2dc' },
};

function CatalogVilla({ id, name, style, position, rotation, onEnter }: {
  id: string;
  name: string;
  style: VillaStyle;
  position: [number, number, number];
  rotation: number;
  onEnter: EnterPlace;
}) {
  const asset = VILLA_STYLE_MODELS[style];
  const isCyber = style === 'CYBER';
  const hasPool = ['AMERICAN', 'CONCRETE', 'WHITEWOOD', 'CYBER'].includes(style);
  return (
    <group position={position} rotation={[0, rotation, 0]} onClick={() => onEnter('villa', 'ridge')}>
      <mesh receiveShadow position={[0, 0.055, 0]}><boxGeometry args={[11.8, 0.11, 11]} /><meshStandardMaterial color={style === 'PASTORAL' ? '#607354' : '#77786f'} roughness={0.96} /></mesh>
      <Suspense fallback={null}><StaticAsset url={`${SUBURBAN_ASSET_ROOT}/${asset.model}`} position={[0, 0.11, -0.7]} scale={asset.scale} /></Suspense>
      {style === 'CHINESE' && <>
        <mesh position={[0, 1.05, 3.7]}><boxGeometry args={[8.6, 0.13, 0.18]} /><meshStandardMaterial color="#382a22" roughness={0.74} /></mesh>
        {[-4.2, 4.2].map((x) => <mesh key={x} castShadow position={[x, 1.15, 1.2]}><boxGeometry args={[0.22, 2.3, 5.3]} /><meshStandardMaterial color="#efe8da" roughness={0.82} /></mesh>)}
        <mesh position={[0, 0.12, 2.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.7, 2.2]} /><meshPhysicalMaterial color="#315f68" transparent opacity={0.82} roughness={0.16} /></mesh>
      </>}
      {style === 'ENGLISH' && <>{[-2.3, 2.25].map((x) => <mesh key={x} castShadow position={[x, 4.9, -1.4]}><boxGeometry args={[0.6, 2.8, 0.6]} /><meshStandardMaterial color="#665247" roughness={0.9} /></mesh>)}</>}
      {style === 'CONCRETE' && <mesh castShadow position={[0, 1.65, 2.9]}><boxGeometry args={[7.7, 2.8, 0.4]} /><meshStandardMaterial color="#999e99" roughness={0.98} /></mesh>}
      {(style === 'WHITEWOOD' || isCyber) && <>{[-3.5, -2.3, -1.1, 1.1, 2.3, 3.5].map((x) => <mesh key={x} position={[x, 2.25, 3.35]}><boxGeometry args={[0.12, 4.4, 0.22]} /><meshStandardMaterial color={isCyber ? '#5ff4df' : '#9b6b3f'} emissive={isCyber ? '#2ddfca' : '#000000'} emissiveIntensity={isCyber ? 0.5 : 0} /></mesh>)}</>}
      {hasPool && <mesh position={[3.5, 0.14, -3.7]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.6, 2.35]} /><meshPhysicalMaterial color="#57b9d0" transmission={0.28} transparent opacity={0.86} roughness={0.12} /></mesh>}
      <pointLight position={[0, 2.8, 2.8]} intensity={isCyber ? 1.1 : 0.45} distance={8} color={asset.accent} />
      <Html position={[0, 7.4, 0]} center distanceFactor={14} zIndexRange={[3, 0]}><button className={`world-label enterable residential-label ${isCyber ? 'prestige' : ''}`} onClick={(event) => { event.stopPropagation(); onEnter('villa', 'ridge'); }}>{id} · {name}</button></Html>
    </group>
  );
}

function AzureYachtMarinaScene({ onEnter, onPositionChange }: { onEnter: EnterPlace; onPositionChange?: (location: PlayerLocation) => void }) {
  const palms = [
    [8, -27, 'tree_palmDetailedTall.glb', 3.4], [9, -16, 'tree_palmBend.glb', 3.1], [7.5, -4, 'tree_palmDetailedShort.glb', 3.5],
    [8.5, 9, 'tree_palmDetailedTall.glb', 3.3], [7.2, 22, 'tree_palmBend.glb', 3.2], [10, 30, 'tree_palmDetailedShort.glb', 3.6],
  ] as const;
  return (
    <>
      <fog attach="fog" args={['#a9cad3', 62, 180]} />
      <Sky sunPosition={[-18, 7, -25]} turbidity={4.2} rayleigh={1.08} mieCoefficient={0.006} mieDirectionalG={0.8} />
      <ambientLight intensity={0.88} color="#e6f6ff" />
      <hemisphereLight intensity={0.72} color="#d8f4ff" groundColor="#6d5c44" />
      <directionalLight castShadow position={[-18, 28, 12]} intensity={2.7} color="#ffd6a1" shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <mesh receiveShadow position={[-28, -0.18, 0]}><boxGeometry args={[56, 0.3, 96]} /><meshPhysicalMaterial color="#1e7f9f" roughness={0.12} metalness={0.04} transmission={0.16} transparent opacity={0.92} /></mesh>
      <mesh receiveShadow position={[-4.5, 0.015, 0]}><boxGeometry args={[11, 0.08, 84]} /><meshStandardMaterial color="#d8c59b" roughness={0.98} /></mesh>
      <mesh receiveShadow position={[4, 0.035, 0]}><boxGeometry args={[6, 0.1, 84]} /><meshStandardMaterial color="#c7c1b0" roughness={0.88} /></mesh>
      <mesh receiveShadow position={[21, 0.015, 0]}><boxGeometry args={[28, 0.08, 84]} /><meshStandardMaterial color="#6d7868" roughness={0.96} /></mesh>
      {[-24, -8, 8, 24].map((z) => <group key={z} position={[-4.5, 0.12, z]}>{[-8, -4, 0].map((x) => <Suspense fallback={null} key={x}><StaticAsset url={`${NATURE_ASSET_ROOT}/bridge_center_wood.glb`} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={3.1} shadows={false} /></Suspense>)}</group>)}
      <FloatingWatercraft model="boat-sail-a" position={[-22, 0.08, -17]} rotation={Math.PI / 2} scale={3.4} phase={1} />
      <FloatingWatercraft model="boat-speed-a" position={[-22, 0.08, 5.5]} rotation={Math.PI / 2} scale={4.05} phase={2} />
      <FloatingWatercraft model="boat-speed-f" position={[-30, 0.08, -6]} rotation={Math.PI / 2} scale={5.85} phase={3} />
      <FloatingWatercraft model="boat-speed-f" position={[-29, 0.08, -29]} rotation={Math.PI / 2} scale={6.35} phase={3.6} />
      <FloatingWatercraft model="boat-fishing-small" position={[-28, 0.08, 13.5]} rotation={Math.PI / 2} scale={3} phase={4} />
      <FloatingWatercraft model="ship-large" position={[-40, 0.08, -42]} rotation={Math.PI / 2} scale={1.86} phase={5} shadows={false} />
      <FloatingWatercraft model="ship-ocean-liner-small" position={[-40.5, 0.06, 22.5]} rotation={Math.PI / 2} scale={2} phase={6} shadows={false} />
      <Suspense fallback={null}>
        <StaticAsset url={`${COMMERCIAL_ASSET_ROOT}/building-h.glb`} position={[23, 0.1, -15]} rotation={[0, -Math.PI / 2, 0]} scale={3.4} />
        <StaticAsset url={`${COMMERCIAL_ASSET_ROOT}/building-j.glb`} position={[25, 0.1, 14]} rotation={[0, -Math.PI / 2, 0]} scale={3.1} />
        {[-19, -16, -13].map((z) => <StaticAsset key={z} url={`${COMMERCIAL_ASSET_ROOT}/detail-parasol-a.glb`} position={[15, 0.12, z]} scale={2.1} shadows={false} />)}
        {palms.map(([x, z, model, scale]) => <StaticAsset key={`${x}-${z}`} url={`${NATURE_ASSET_ROOT}/${model}`} position={[x, 0.08, z]} scale={scale} shadows={false} />)}
      </Suspense>
      <LandmarkLabel position={[-10, 4.3, -17]} label="SAI-C42 · 42 FT SAILING YACHT" place="marina" atlasId="yacht-marina" onEnter={onEnter} tone="marina-label" />
      <LandmarkLabel position={[-10, 4.3, 5.5]} label="YHT-A45 · 45 FT SPORT CRUISER" place="marina" atlasId="yacht-marina" onEnter={onEnter} tone="marina-label" />
      <LandmarkLabel position={[-11, 5.1, -6]} label="YHT-A55 · 55 FT FLYBRIDGE" place="marina" atlasId="yacht-marina" onEnter={onEnter} tone="marina-label" />
      <LandmarkLabel position={[-11, 5.1, -29]} label="YHT-A60 · 60 FT OPEN YACHT" place="marina" atlasId="yacht-marina" onEnter={onEnter} tone="marina-label" />
      <LandmarkLabel position={[-11, 4.5, 13.5]} label="FSH-B38 · 38 FT SPORT FISHER" place="marina" atlasId="yacht-marina" onEnter={onEnter} tone="marina-label" />
      <LandmarkLabel position={[-19, 6.1, -32]} label="YHT-A80 · 80 FT SKYLOUNGE" place="marina" atlasId="yacht-marina" onEnter={onEnter} tone="marina-label" />
      <LandmarkLabel position={[-19, 6.1, 22.5]} label="YHT-A100 · 100+ FT FLAGSHIP" place="marina" atlasId="yacht-marina" onEnter={onEnter} tone="marina-label" />
      <LandmarkLabel position={[23, 7.2, -15]} label="AZURE YACHT CLUB" place="marina" atlasId="yacht-marina" onEnter={onEnter} tone="marina-label" />
      <Html position={[4, 3.4, 32]} center distanceFactor={13} zIndexRange={[3, 0]}><button className="world-label enterable transit-label" onClick={() => onEnter('map')}>CITY MAP · CBD · RESIDENCES</button></Html>
      <PopulationLayer count={18} />
      <Player scene="AZURE_YACHT_MARINA" onPositionChange={onPositionChange} />
      <Environment preset="sunset" />
    </>
  );
}

function CrownResidentialScene({ onEnter, onPositionChange }: { onEnter: EnterPlace; onPositionChange?: (location: PlayerLocation) => void }) {
  return (
    <>
      <fog attach="fog" args={['#99b8bf', 55, 150]} />
      <Sky sunPosition={[-10, 8, -20]} turbidity={4.8} rayleigh={1.12} mieCoefficient={0.006} mieDirectionalG={0.82} />
      <ambientLight intensity={0.82} color="#e4f4ff" />
      <directionalLight castShadow position={[-16, 27, 16]} intensity={2.75} color="#ffd7a2" shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[72, 74]} /><meshStandardMaterial color="#777d74" roughness={0.94} /></mesh>
      <mesh receiveShadow position={[0, 0.035, 5]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[25, 45]} /><meshStandardMaterial color="#d3cdbd" roughness={0.84} /></mesh>
      <mesh receiveShadow position={[0, 0.02, -32]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[72, 18]} /><meshPhysicalMaterial color="#288ca7" roughness={0.12} transparent opacity={0.88} /></mesh>
      <SciFiResidenceTower position={[-15, 0, -10]} variant="HELIX" label="BLD-A01 · HELIX ONE" onEnter={onEnter} />
      <SciFiResidenceTower position={[0, 0, -15]} variant="PRISM" label="BLD-A02 · PRISM HOUSE" onEnter={onEnter} />
      <SciFiResidenceTower position={[15, 0, -10]} variant="BRIDGE" label="BLD-A03 · SKYBRIDGE" onEnter={onEnter} />
      <mesh receiveShadow position={[0, 0.1, 7]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[5.2, 48]} /><meshPhysicalMaterial color="#50bfd0" transmission={0.32} transparent opacity={0.86} roughness={0.1} /></mesh>
      {[-8, -4, 4, 8].flatMap((x) => [-1, 14].map((z) => <ParkTree key={`${x}-${z}`} position={[x, 0.06, z]} scale={1.1} />))}
      <LandmarkLabel position={[0, 4.4, 7]} label="RESIDENT SKY POOL · SEA VIEW" place="residences" atlasId="crown-residences" onEnter={onEnter} tone="residential-label" />
      <Html position={[0, 3.2, 27]} center distanceFactor={13} zIndexRange={[3, 0]}><button className="world-label enterable transit-label" onClick={() => onEnter('map')}>CITY MAP · MARINA · VILLA RIDGE</button></Html>
      <PopulationLayer count={20} />
      <Player scene="CROWN_RESIDENTIAL_TOWERS" onPositionChange={onPositionChange} />
      <Environment preset="sunset" />
    </>
  );
}

function MillionaireRidgeScene({ onEnter, onPositionChange }: { onEnter: EnterPlace; onPositionChange?: (location: PlayerLocation) => void }) {
  const villas = [
    { id: 'BLD-B01', name: 'HUA COURT', style: 'CHINESE' as const, position: [-15, 0, 18] as [number, number, number], rotation: Math.PI / 2 },
    { id: 'BLD-B02', name: 'COTSWOLD HOUSE', style: 'ENGLISH' as const, position: [15, 0, 18] as [number, number, number], rotation: -Math.PI / 2 },
    { id: 'BLD-B03', name: 'PACIFIC TERRACE', style: 'AMERICAN' as const, position: [-15, 0, 2] as [number, number, number], rotation: Math.PI / 2 },
    { id: 'BLD-B04', name: 'ATLAS CONCRETE', style: 'CONCRETE' as const, position: [15, 0, 2] as [number, number, number], rotation: -Math.PI / 2 },
    { id: 'BLD-B05', name: 'WHITEWOOD HOUSE', style: 'WHITEWOOD' as const, position: [-15, 0, -14] as [number, number, number], rotation: Math.PI / 2 },
    { id: 'BLD-B06', name: 'MEADOW HOUSE', style: 'PASTORAL' as const, position: [15, 0, -14] as [number, number, number], rotation: -Math.PI / 2 },
    { id: 'BLD-B07', name: 'NEON CLIFF HOUSE', style: 'CYBER' as const, position: [0, 0, -31] as [number, number, number], rotation: 0 },
  ];
  return (
    <>
      <fog attach="fog" args={['#aeb8ae', 62, 170]} />
      <Sky sunPosition={[-15, 9, -22]} turbidity={5.5} rayleigh={1.15} mieCoefficient={0.006} mieDirectionalG={0.8} />
      <ambientLight intensity={0.86} color="#f2ead7" />
      <directionalLight castShadow position={[-18, 28, 15]} intensity={2.6} color="#ffd3a0" shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[84, 94]} /><meshStandardMaterial color="#63785e" roughness={0.98} /></mesh>
      <mesh receiveShadow position={[0, 0.035, 8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[9, 66]} /><meshStandardMaterial color="#323838" roughness={0.95} /></mesh>
      {[-6.1, 6.1].map((x) => <mesh key={x} receiveShadow position={[x, 0.045, 8]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.1, 66]} /><meshStandardMaterial color="#bbb8aa" roughness={0.9} /></mesh>)}
      {[-22, -6, 10, 26].map((z) => <mesh key={z} receiveShadow position={[0, 0.04, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[70, 5]} /><meshStandardMaterial color="#393f3e" roughness={0.94} /></mesh>)}
      {[-22, -6, 10, 26].flatMap((z) => [-20, -12, 12, 20].map((x) => <mesh key={`${x}-${z}`} position={[x, 0.06, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.2, 0.08]} /><meshBasicMaterial color="#d8c979" /></mesh>))}
      {villas.map((villa) => <CatalogVilla key={villa.id} {...villa} onEnter={onEnter} />)}
      <Suspense fallback={null}>
        {([-7.2, 7.2] as const).flatMap((x) => [-24, -8, 8, 24, 34].map((z) => <StaticAsset key={`${x}-${z}`} url={`${ROAD_ASSET_ROOT}/light-square.glb`} position={[x, 0.06, z]} scale={3.15} shadows={false} />))}
        {([-29, 29] as const).flatMap((x) => [-20, 0, 20].map((z) => <StaticAsset key={`${x}-${z}`} url={`${NATURE_ASSET_ROOT}/${z === 0 ? 'tree_oak.glb' : 'tree_detailed.glb'}`} position={[x, 0.05, z]} scale={3.1} shadows={false} />))}
        <StaticAsset url={`${CAR_ASSET_ROOT}/sedan.glb`} position={[-2.1, 0.12, 18]} scale={0.88} shadows={false} />
        <StaticAsset url={`${CAR_ASSET_ROOT}/suv-luxury.glb`} position={[2.1, 0.12, 5]} rotation={[0, Math.PI, 0]} scale={0.92} shadows={false} />
        <StaticAsset url={`${CAR_ASSET_ROOT}/race-future.glb`} position={[-2.1, 0.12, -13]} scale={0.92} shadows={false} />
      </Suspense>
      <Html position={[0, 3.3, 34]} center distanceFactor={13} zIndexRange={[3, 0]}><button className="world-label enterable transit-label" onClick={() => onEnter('map')}>VILLA DIRECTORY · CITY MAP</button></Html>
      <Player scene="MILLIONAIRE_RIDGE" onPositionChange={onPositionChange} />
      <Environment preset="sunset" />
    </>
  );
}

function StudioInterior({ onEnter, onPositionChange }: { onEnter: EnterPlace; onPositionChange?: (location: PlayerLocation) => void }) {
  return (
    <>
      <fog attach="fog" args={['#171816', 15, 36]} />
      <ambientLight intensity={0.72} color="#ffe2c1" />
      <directionalLight castShadow position={[-5, 9, 6]} intensity={1.8} color="#ffd19a" />
      <pointLight position={[2.3, 2.7, -1.4]} intensity={1.15} distance={9} color="#65d8ff" />
      <mesh receiveShadow position={[0, -0.04, 0]}><boxGeometry args={[8.8, 0.08, 9.2]} /><meshStandardMaterial color="#655f55" roughness={0.92} /></mesh>
      <mesh receiveShadow position={[-4.25, 2.2, 0]}><boxGeometry args={[0.18, 4.4, 9.2]} /><meshStandardMaterial color="#d9d0c1" roughness={0.84} /></mesh>
      <mesh receiveShadow position={[4.25, 2.2, 0]}><boxGeometry args={[0.18, 4.4, 9.2]} /><meshStandardMaterial color="#d9d0c1" roughness={0.84} /></mesh>
      <mesh receiveShadow position={[0, 2.2, -4.45]}><boxGeometry args={[8.7, 4.4, 0.18]} /><meshStandardMaterial color="#cfc6b6" roughness={0.82} /></mesh>
      <mesh position={[0, 2.5, -4.34]}><planeGeometry args={[4.9, 2.5]} /><meshStandardMaterial color="#3f7894" emissive="#e78b55" emissiveIntensity={0.32} metalness={0.4} roughness={0.22} /></mesh>
      {[-1.8, -0.7, 0.45, 1.55].map((x, index) => <mesh key={x} position={[x, 1.25 + index * 0.18, -4.18]}><boxGeometry args={[0.62, 1.4 + index * 0.36, 0.16]} /><meshStandardMaterial color="#253237" emissive="#d56e49" emissiveIntensity={0.18} /></mesh>)}
      <group position={[-2.65, 0, -0.8]}>
        <mesh castShadow position={[0, 0.32, 0]}><boxGeometry args={[1.9, 0.5, 3.7]} /><meshStandardMaterial color="#3b3e3a" roughness={0.85} /></mesh>
        <mesh position={[0, 0.61, -0.5]}><boxGeometry args={[1.75, 0.18, 2.45]} /><meshStandardMaterial color="#8f9b8c" roughness={0.95} /></mesh>
        <mesh position={[0, 0.72, 1.1]}><boxGeometry args={[1.55, 0.28, 0.72]} /><meshStandardMaterial color="#c5b8a1" roughness={1} /></mesh>
      </group>
      <group position={[2.5, 0, -1.35]}>
        <mesh castShadow position={[0, 0.8, 0]}><boxGeometry args={[2.15, 0.12, 1.15]} /><meshStandardMaterial color="#4a382b" roughness={0.72} /></mesh>
        {[-0.83, 0.83].map((x) => <mesh key={x} position={[x, 0.4, 0]}><boxGeometry args={[0.1, 0.8, 0.9]} /><meshStandardMaterial color="#332b26" /></mesh>)}
        <mesh position={[0, 1.65, -0.35]} rotation={[-0.1, 0, 0]}><boxGeometry args={[1.55, 1.05, 0.1]} /><meshStandardMaterial color="#071514" emissive="#42f5af" emissiveIntensity={0.38} metalness={0.65} /></mesh>
        <Html position={[0, 2.45, 0]} center distanceFactor={10} zIndexRange={[3, 0]}><button className="world-label enterable" onClick={() => onEnter('wellness')}>HOME LIFE · FOOD &amp; CARE</button></Html>
      </group>
      <group position={[2.65, 0, 2.3]}>
        <mesh castShadow position={[0, 1, 0]}><boxGeometry args={[1.35, 2, 1.05]} /><meshStandardMaterial color="#817a6d" roughness={0.78} /></mesh>
        <mesh position={[-0.34, 1, 0.54]}><boxGeometry args={[0.05, 1.68, 0.04]} /><meshStandardMaterial color="#b8ad9a" /></mesh>
      </group>
      <group position={[0, 0, 4.15]} onClick={() => onEnter(null)}>
        <mesh position={[0, 1.25, 0]}><boxGeometry args={[1.55, 2.5, 0.16]} /><meshStandardMaterial color="#292b28" roughness={0.7} /></mesh>
        <Html position={[0, 3.05, 0]} center distanceFactor={10} zIndexRange={[3, 0]}><button className="world-label enterable residence-label" onClick={() => onEnter(null)}>EXIT TO COURTYARD</button></Html>
      </group>
      <Html position={[-2.8, 3.6, -4.05]} center distanceFactor={11} zIndexRange={[3, 0]}><span className="zone-label">10 m² LEGAL FOOTPRINT · 2.1× NAVIGATION SCALE</span></Html>
      <Player scene="STUDIO_INTERIOR" onPositionChange={onPositionChange} />
      <Environment preset="apartment" />
    </>
  );
}

function CyberCBD({ onEnter, onPositionChange }: { onEnter: EnterPlace; onPositionChange?: (location: PlayerLocation) => void }) {
  const streetLights = [-30, -18, -6, 6, 18, 30];
  return (
    <>
      <fog attach="fog" args={['#c79b70', 58, 155]} />
      <Sky sunPosition={[-11, 6, -16]} turbidity={5.2} rayleigh={1.18} mieCoefficient={0.008} mieDirectionalG={0.82} />
      <ambientLight intensity={0.78} color="#ffe3bd" />
      <hemisphereLight intensity={0.52} color="#cce9ff" groundColor="#504737" />
      <directionalLight castShadow position={[-14, 24, 13]} intensity={2.55} color="#ffd29a" shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-42} shadow-camera-right={42} shadow-camera-top={42} shadow-camera-bottom={-42} />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[112, 96]} /><meshStandardMaterial color="#73776d" roughness={0.94} /></mesh>
      <mesh receiveShadow position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[17.5, 88]} /><meshStandardMaterial color="#c9c2b0" roughness={0.87} /></mesh>
      {[-12, 12].map((x) => <mesh key={x} receiveShadow position={[x, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[6.5, 88]} /><meshStandardMaterial color="#272e30" roughness={0.95} /></mesh>)}
      {[-9.25, 9.25].map((x) => <mesh key={x} position={[x, 0.046, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.72, 86]} /><meshStandardMaterial color="#318e9b" metalness={0.18} roughness={0.22} transparent opacity={0.88} /></mesh>)}
      {[-8, 19].map((z) => <group key={z}><mesh receiveShadow position={[2, 0.031, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[76, 6.5]} /><meshStandardMaterial color="#2a3032" roughness={0.96} /></mesh>{[-31, -17, -3, 11, 25, 36].map((x) => <mesh key={x} position={[x, 0.052, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[5.5, 0.09]} /><meshBasicMaterial color="#ddc878" /></mesh>)}</group>)}

      <WaterfrontMarina onEnter={onEnter} />
      <SciFiResidenceTower position={[-19, 0, -27]} variant="HELIX" label="HELIX ONE" onEnter={onEnter} />
      <SciFiResidenceTower position={[0, 0, -24]} variant="PRISM" label="PRISM HOUSE" onEnter={onEnter} />
      <SciFiResidenceTower position={[19, 0, -27]} variant="BRIDGE" label="SKYBRIDGE RESIDENCES" onEnter={onEnter} />
      <Building position={[0, 0, -35]} size={[5.8, 6.2, 4.4]} color="#162b27" glow="#22e69e" label="STOCK EXCHANGE" place="market" onEnter={onEnter} assetUrl={`${COMMERCIAL_ASSET_ROOT}/building-n.glb`} assetScale={2.25} labelHeight={6.5} />
      <Building position={[-18, 0, -12]} size={[4.4, 5.1, 3.5]} color="#1d2434" glow="#718cff" label="CAREER TOWER" place="career" onEnter={onEnter} assetUrl={`${COMMERCIAL_ASSET_ROOT}/building-skyscraper-d.glb`} assetScale={1.12} labelHeight={5.7} />
      <Building position={[18, 0, -12]} size={[4.2, 3.3, 3.4]} color="#291b36" glow="#c366ff" label="NEON ATELIER" place="fashion" onEnter={onEnter} assetUrl={`${COMMERCIAL_ASSET_ROOT}/building-k.glb`} assetScale={2.05} labelHeight={3.8} />
      <Building position={[-18, 0, 0]} size={[4.1, 3.2, 3.5]} color="#36241a" glow="#ff9d45" label="NOVA DINING" place="restaurant" onEnter={onEnter} assetUrl={`${COMMERCIAL_ASSET_ROOT}/building-h.glb`} assetScale={2.2} labelHeight={3.65} />
      <Building position={[18, 0, 0]} size={[4.4, 5.3, 3.7]} color="#172b36" glow="#4dbdff" label="SKYLINE REALTY" place="property" onEnter={onEnter} assetUrl={`${COMMERCIAL_ASSET_ROOT}/building-skyscraper-a.glb`} assetScale={1.65} labelHeight={5.8} />

      <CivicHospital onEnter={onEnter} />
      <CivicSafetyHQ onEnter={onEnter} />
      <AcademyCampus onEnter={onEnter} />
      <FreshMarket onEnter={onEnter} />
      <Auto4SDealership onEnter={onEnter} />
      <MidriseCommunity onEnter={onEnter} />

      <group position={[0, 0, 13]}>
        <mesh receiveShadow position={[0, 0.04, 0]}><boxGeometry args={[15, 0.08, 15]} /><meshStandardMaterial color="#657f5e" roughness={0.98} /></mesh>
        <mesh position={[0, 0.1, 0.9]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[3.25, 36]} /><meshStandardMaterial color="#4ca7b2" metalness={0.08} roughness={0.18} transparent opacity={0.91} /></mesh>
        {([[-5, -5], [-2, -5], [3, -5.5], [5, -2.5], [-5, 3.5], [-2.5, 5], [3, 4.8], [5.2, 2.5]] as [number, number][]).map(([x, z], index) => <ParkTree key={`${x}-${z}`} position={[x, 0.08, z]} scale={0.9 + (index % 3) * 0.12} />)}
        <Html position={[-3.7, 2.8, -1]} center distanceFactor={13} zIndexRange={[3, 0]}><button className="world-label enterable" onClick={() => onEnter('wellness')}>CENTRAL PARK · DAILY LIFE</button></Html>
        <Html position={[3.9, 2.8, -1]} center distanceFactor={13} zIndexRange={[3, 0]}><button className="world-label enterable" onClick={() => onEnter('social')}>SOCIAL PLAZA · PREVIEW</button></Html>
      </group>

      <Suspense fallback={null}>
        {streetLights.flatMap((z) => [-7.7, 7.7].map((x) => <StaticAsset key={`${x}-${z}`} url={`${ROAD_ASSET_ROOT}/light-curved.glb`} position={[x, 0.05, z]} rotation={[0, x < 0 ? 0 : Math.PI, 0]} scale={1.3} shadows={false} />))}
        <StaticAsset url={`${ROAD_ASSET_ROOT}/traffic-light-object-vertical.glb`} position={[-8.4, 0.05, -8]} scale={1.4} shadows={false} />
        <StaticAsset url={`${ROAD_ASSET_ROOT}/traffic-light-object-vertical.glb`} position={[8.4, 0.05, 19]} rotation={[0, Math.PI, 0]} scale={1.4} shadows={false} />
      </Suspense>
      <Html position={[0, 2.5, 35]} center distanceFactor={12} zIndexRange={[3, 0]}><button className="world-label enterable transit-label" onClick={() => onEnter('map')}>CITY DIRECTORY · OPEN LIVE MAP</button></Html>
      <CityTraffic />
      <PopulationLayer count={32} />
      <Player scene="CBD" onPositionChange={onPositionChange} />
      <Environment preset="sunset" />
    </>
  );
}

function World({ onEnter, onNotice, onPositionChange, scene = 'STARTER_ARCOLOGY', residenceBlock = '071', place }: {
  onEnter: EnterPlace;
  onNotice: (message: string) => void;
  onPositionChange?: (location: PlayerLocation) => void;
  scene?: WorldSceneId;
  residenceBlock?: string;
  place?: Place;
}) {
  if (scene === 'STARTER_ARCOLOGY' && place === 'studio') return <StudioInterior onEnter={onEnter} onPositionChange={onPositionChange} />;
  if (scene === 'CBD') return <CyberCBD onEnter={onEnter} onPositionChange={onPositionChange} />;
  if (scene === 'AZURE_YACHT_MARINA') return <AzureYachtMarinaScene onEnter={onEnter} onPositionChange={onPositionChange} />;
  if (scene === 'CROWN_RESIDENTIAL_TOWERS') return <CrownResidentialScene onEnter={onEnter} onPositionChange={onPositionChange} />;
  if (scene === 'MILLIONAIRE_RIDGE') return <MillionaireRidgeScene onEnter={onEnter} onPositionChange={onPositionChange} />;
  return (
    <>
      <StarterArcology onEnter={onEnter} onNotice={onNotice} residenceBlock={residenceBlock} />
      <PopulationLayer />
      <Player scene="STARTER_ARCOLOGY" onPositionChange={onPositionChange} />
      <Environment preset="night" />
    </>
  );
}

function MiniMap({ scene, residenceBlock, location, onOpen }: {
  scene: WorldSceneId;
  residenceBlock: string;
  location: PlayerLocation;
  onOpen: () => void;
}) {
  const effectiveLocation = location.scene === scene
    ? location
    : { scene, x: SCENE_PROFILES[scene].spawn[0], z: SCENE_PROFILES[scene].spawn[2] };
  const profile = SCENE_PROFILES[effectiveLocation.scene];
  const markerX = THREE.MathUtils.clamp((effectiveLocation.x - profile.bounds.minX) / (profile.bounds.maxX - profile.bounds.minX) * 100, 4, 96);
  const markerY = THREE.MathUtils.clamp((profile.bounds.maxZ - effectiveLocation.z) / (profile.bounds.maxZ - profile.bounds.minZ) * 100, 4, 96);
  const label = scene === 'STARTER_ARCOLOGY'
    ? `BLOCK ${residenceBlock}`
    : scene === 'CBD'
      ? 'CYBER CBD'
      : scene === 'AZURE_YACHT_MARINA'
        ? 'AZURE MARINA'
        : scene === 'CROWN_RESIDENTIAL_TOWERS'
          ? 'CROWN TOWERS'
          : 'MILLIONAIRE RIDGE';
  const landmarks = scene === 'CBD'
    ? CBD_LOCAL_LANDMARKS
    : scene === 'AZURE_YACHT_MARINA'
      ? MARINA_LOCAL_LANDMARKS
      : scene === 'CROWN_RESIDENTIAL_TOWERS'
        ? CROWN_LOCAL_LANDMARKS
        : scene === 'MILLIONAIRE_RIDGE'
          ? RIDGE_LOCAL_LANDMARKS
          : [
            { id: 'home', label: 'HOME', x: -15, z: -6, kind: 'home' },
            { id: 'metro', label: 'METRO', x: 0, z: -18, kind: 'market' },
          ];
  return (
    <button
      className={`mini-map ${scene === 'STARTER_ARCOLOGY' ? 'arcology' : 'city'}`}
      onClick={onOpen}
      aria-label={`Open city map. Current local position ${effectiveLocation.x.toFixed(1)} east, ${effectiveLocation.z.toFixed(1)} north in ${label}`}
      aria-controls="city-map-dialog"
      aria-expanded="false"
    >
      <span className="mini-map-header"><MapIcon /><b>{label}</b><small>OPEN MAP</small></span>
      <span className="mini-map-surface">
        <i className="mini-road vertical" /><i className="mini-road horizontal" />
        {landmarks.map((node) => {
          const nodeX = THREE.MathUtils.clamp((node.x - profile.bounds.minX) / (profile.bounds.maxX - profile.bounds.minX) * 100, 4, 96);
          const nodeY = THREE.MathUtils.clamp((profile.bounds.maxZ - node.z) / (profile.bounds.maxZ - profile.bounds.minZ) * 100, 4, 96);
          return <i className={`mini-landmark ${node.kind}`} style={{ left: `${nodeX}%`, bottom: `${nodeY}%` }} title={node.label} key={node.id} />;
        })}
        <span className="mini-player" style={{ left: `${markerX}%`, bottom: `${markerY}%` }}><MapPin /></span>
      </span>
      <span className="mini-coordinates">LOCAL X {effectiveLocation.x.toFixed(1)} · Z {effectiveLocation.z.toFixed(1)}</span>
    </button>
  );
}

function CityAtlas({ selectedId, playerNodeId, onSelect }: {
  selectedId: string;
  playerNodeId: string;
  onSelect: (nodeId: string) => void;
}) {
  const playerNode = WORLD_ATLAS.find((node) => node.id === playerNodeId) ?? WORLD_ATLAS[0];
  return (
    <div className="atlas-map-column">
      <div className="world-atlas full" aria-label="Interactive 20 by 30 kilometer AmpliWorld city atlas">
        <span className="atlas-sea">WEST COAST</span><span className="atlas-mountains">NORTH HIGHLANDS</span><span className="atlas-width">20 KM</span><span className="atlas-height">30 KM</span>
        <svg className="atlas-routes" viewBox="0 0 20 30" preserveAspectRatio="none" aria-hidden="true">
          <polyline className="green-line" points="2,26 5.5,22 8,19 11,14 14,12" />
          <polyline className="blue-line" points="1,20 2,15 11,14 14,12" />
          <polyline className="east-line" points="8,19 18,20.5 16.5,16 14,12" />
          <polyline className="ferry-line" points="2,15 2.8,9" />
        </svg>
        {WORLD_ATLAS.map((node) => <button
          type="button"
          className={`atlas-node ${node.kind.toLowerCase()} ${selectedId === node.id ? 'selected' : ''}`}
          style={{ left: `${node.x / 20 * 100}%`, bottom: `${node.y / 30 * 100}%` }}
          onClick={() => onSelect(node.id)}
          aria-label={`${node.name}, ${node.zone}, grid ${node.x} east ${node.y} north`}
          aria-pressed={selectedId === node.id}
          title={node.name}
          key={node.id}
        ><i /><b>{node.name}</b></button>)}
        <span className="atlas-player" style={{ left: `${playerNode.x / 20 * 100}%`, bottom: `${playerNode.y / 30 * 100}%` }}><MapPin /><b>YOU</b></span>
      </div>
      <div className="atlas-node-list" aria-label="City locations">
        {WORLD_ATLAS.map((node) => <button type="button" className={selectedId === node.id ? 'selected' : ''} onClick={() => onSelect(node.id)} aria-pressed={selectedId === node.id} key={`${node.id}-list`}>{node.name}</button>)}
      </div>
    </div>
  );
}

function TouchControls() {
  const move = (key: string, pressed: boolean) => window.dispatchEvent(new CustomEvent('ampliworld-move', { detail: { key, pressed } }));
  const bind = (key: string) => ({ onPointerDown: () => move(key, true), onPointerUp: () => move(key, false), onPointerCancel: () => move(key, false), onPointerLeave: () => move(key, false) });
  return <div className="touch-controls"><button {...bind('w')} aria-label="Walk forward"><ChevronUp /></button><button {...bind('a')} aria-label="Turn left"><ChevronLeft /></button><button {...bind('s')} aria-label="Walk backward"><ChevronDown /></button><button {...bind('d')} aria-label="Turn right"><ChevronRight /></button></div>;
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
  const [notice, setNotice] = useState('HOME: 10 m² STUDIO · CBD IS 18.4 KM AWAY · EVERY TRIP COSTS VIRTUAL CASH');
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [day, setDay] = useState(1);
  const [leaseDays, setLeaseDays] = useState(365);
  const [career, setCareer] = useState('UNEMPLOYED');
  const [leverage, setLeverage] = useState<1 | 2 | 3 | 5>(1);
  const [reliefEligible, setReliefEligible] = useState(false);
  const [reliefClaimsRemaining, setReliefClaimsRemaining] = useState(2);
  const [currentDistrict, setCurrentDistrict] = useState<WorldDistrict>('STARTER_ARCOLOGY');
  const [activeScene, setActiveScene] = useState<WorldSceneId>('STARTER_ARCOLOGY');
  const [starterTower, setStarterTower] = useState(71);
  const [starterFloor, setStarterFloor] = useState(38);
  const [starterUnit, setStarterUnit] = useState(184);
  const [transitSpend, setTransitSpend] = useState(0);
  const [transitTrips, setTransitTrips] = useState(0);
  const [metroRides, setMetroRides] = useState(0);
  const [taxiRides, setTaxiRides] = useState(0);
  const [nutrition, setNutrition] = useState(50);
  const [careStreak, setCareStreak] = useState(0);
  const [dailyCarePoints, setDailyCarePoints] = useState(0);
  const [dailyProtein, setDailyProtein] = useState(0);
  const [dailyProduce, setDailyProduce] = useState(0);
  const [mealComplete, setMealComplete] = useState(false);
  const [wellnessComplete, setWellnessComplete] = useState(false);
  const [leisureComplete, setLeisureComplete] = useState(false);
  const [tradingFeeBps, setTradingFeeBps] = useState(10);
  const [lastWorkTurn, setLastWorkTurn] = useState(0);
  const [shiftsToday, setShiftsToday] = useState(0);
  const [wagesToday, setWagesToday] = useState(0);
  const [lifetimeWages, setLifetimeWages] = useState(0);
  const [socialMode, setSocialMode] = useState<'PRIVATE' | 'APPROACHABLE'>('PRIVATE');
  const [contactCoins, setContactCoins] = useState(0);
  const [localPosition, setLocalPosition] = useState<PlayerLocation>({ scene: 'STARTER_ARCOLOGY', x: 0, z: 9 });
  const [selectedAtlasId, setSelectedAtlasId] = useState('starter');
  const [pendingAtlasId, setPendingAtlasId] = useState<string | null>(null);
  const [pendingDestination, setPendingDestination] = useState<Place>(null);
  const [journey, setJourney] = useState<Journey | null>(null);
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

  const applySnapshot = (data: GameApiResponse, syncActiveScene = true) => {
    const player = data.player ?? data;
    const residence = recordOf(data.residence);
    const wellbeing = recordOf(data.wellbeing);
    const employment = recordOf(data.employment);
    const social = recordOf(data.social);
    const district = readableString(player.currentDistrict);
    setCash(readableNumber(player.cash, 10000));
    setHappiness(readableNumber(player.happiness, 52));
    setTax(readableNumber(player.cityTaxPaid ?? player.cityTax));
    setDay(readableNumber(player.turn, 1));
    setLeaseDays(readableNumber(player.apartmentLeaseDays, 365));
    setCareer(readableString(player.careerStatus, 'UNEMPLOYED'));
    setPropertyValue(readableNumber(player.propertyValue));
    setReliefEligible(Boolean(player.reliefEligible));
    setReliefClaimsRemaining(readableNumber(player.reliefClaimsRemaining, 2));
    if (district === 'STARTER_ARCOLOGY' || district === 'CBD') {
      setCurrentDistrict(district);
      if (syncActiveScene) setActiveScene((current) => sceneDistrict(current) === district ? current : district);
    }
    setStarterTower(readableNumber(residence?.tower ?? player.starterTower, 71));
    setStarterFloor(readableNumber(residence?.floor ?? player.starterFloor, 38));
    setStarterUnit(readableNumber(residence?.unit ?? player.starterUnit, 184));
    setTransitSpend(readableNumber(player.transitSpend));
    setTransitTrips(readableNumber(player.transitTrips));
    setMetroRides(readableNumber(player.metroRides));
    setTaxiRides(readableNumber(player.taxiRides));
    setNutrition(readableNumber(wellbeing?.nutrition ?? player.nutrition, 50));
    setCareStreak(readableNumber(wellbeing?.careStreak ?? player.careStreak));
    setDailyCarePoints(readableNumber(wellbeing?.dailyCarePoints ?? player.dailyCarePoints));
    setDailyProtein(readableNumber(wellbeing?.dailyProtein ?? player.dailyProtein));
    setDailyProduce(readableNumber(wellbeing?.dailyProduce ?? player.dailyProduce));
    setMealComplete(Boolean(wellbeing?.mealComplete) || readableNumber(player.lastMealTurn) === readableNumber(player.turn));
    setWellnessComplete(Boolean(wellbeing?.wellnessComplete) || readableNumber(player.lastWellnessTurn) === readableNumber(player.turn));
    setLeisureComplete(Boolean(wellbeing?.leisureComplete) || readableNumber(player.lastLeisureTurn) === readableNumber(player.turn));
    setTradingFeeBps(readableNumber(wellbeing?.tradingFeeBps ?? player.tradingFeeBps, 10));
    setLastWorkTurn(readableNumber(player.lastWorkTurn));
    setShiftsToday(readableNumber(employment?.shiftsToday ?? player.shiftsToday));
    setWagesToday(readableNumber(employment?.wagesToday ?? player.wagesToday));
    setLifetimeWages(readableNumber(employment?.lifetimeWages ?? player.lifetimeWages));
    const nextSocialMode = readableString(social?.mode ?? player.socialMode, 'PRIVATE');
    setSocialMode(nextSocialMode === 'APPROACHABLE' ? 'APPROACHABLE' : 'PRIVATE');
    setContactCoins(readableNumber(social?.contactCoins ?? player.contactCoins));
    if (data.holdings !== undefined) setHoldings(normalizeHoldings(data.holdings));
    if (data.inventory !== undefined) setInventory(normalizeInventory(data.inventory));
    if (data.market !== undefined) setStocks((current) => mergeMarket(current, data.market));
    if (data.worldEvent !== undefined) setWorldEvent((current) => normalizeWorldEvent(data.worldEvent, current));
  };

  const runCloudAction = async (payload: Record<string, unknown>, syncActiveScene = true) => {
    const response = await fetch('/api/game', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, requestId: crypto.randomUUID() }),
    });
    const data = await response.json() as GameApiResponse;
    if (!response.ok) throw new Error(readableString(data.error, 'ACTION REJECTED'));
    applySnapshot(data, syncActiveScene);
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
    const handleMapKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && place) {
        setPlace(null);
        setPendingDestination(null);
        setPendingAtlasId(null);
      }
      if (event.key.toLowerCase() === 'm' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        setPlace((current) => {
          if (current === 'map') {
            setPendingDestination(null);
            setPendingAtlasId(null);
            return null;
          }
          setSelectedAtlasId(SCENE_ATLAS_IDS[activeScene]);
          setPendingDestination(null);
          setPendingAtlasId(null);
          return 'map';
        });
      }
    };
    window.addEventListener('keydown', handleMapKeys);
    return () => window.removeEventListener('keydown', handleMapKeys);
  }, [activeScene, place]);

  const openPlace: EnterPlace = (target, atlasId) => {
    if (!target) {
      setPlace(null);
      setPendingDestination(null);
      setPendingAtlasId(null);
      return;
    }
    const atlasNode: AtlasNode | undefined = atlasId ? WORLD_ATLAS.find((node) => node.id === atlasId) : undefined;
    if (atlasNode) setSelectedAtlasId(atlasNode.id);
    if (atlasNode?.scene && atlasNode.scene !== activeScene && sceneDistrict(atlasNode.scene) === currentDistrict) {
      setActiveScene(atlasNode.scene);
      setPlace(null);
      setPendingDestination(null);
      setPendingAtlasId(null);
      setNotice(`${atlasNode.name.toUpperCase()} · LIVE 3D SCENE ENTERED`);
      return;
    }
    if (target === 'map') {
      setSelectedAtlasId(SCENE_ATLAS_IDS[activeScene]);
      setPendingDestination(null);
      setPendingAtlasId(null);
    }
    const requiresCbd = CBD_ONLY_PLACES.includes(target);
    const requiresHome = target === 'studio';
    if ((requiresCbd && currentDistrict !== 'CBD') || (requiresHome && currentDistrict !== 'STARTER_ARCOLOGY')) {
      if (requiresHome) setSelectedAtlasId('starter');
      setPendingAtlasId(requiresCbd && atlasNode?.scene ? atlasNode.id : null);
      setPendingDestination(target);
      setPlace('map');
      setNotice(requiresCbd
        ? 'PAID TRAVEL REQUIRED · CHOOSE METRO $5 OR TAXI $45 TO ENTER THE CBD'
        : 'HOME IS 18.4 KM AWAY · THE RETURN TRIP ALSO COSTS VIRTUAL CASH');
      return;
    }
    setPendingDestination(null);
    setPendingAtlasId(null);
    setPlace(target);
  };

  const commute = async (mode: TransitMode) => {
    if (actionLock.current) return;
    const option = TRANSIT[mode];
    const destination: WorldDistrict = currentDistrict === 'CBD' ? 'STARTER_ARCOLOGY' : 'CBD';
    if (mode === 'METRO' && cash < 0) {
      setNotice('METRO EMERGENCY CREDIT IS UNAVAILABLE ONCE CASH IS ALREADY NEGATIVE');
      return;
    }
    if (mode === 'TAXI' && cash < option.fare) {
      setNotice('TAXI REQUIRES THE FULL $45 VIRTUAL FARE');
      return;
    }

    actionLock.current = true;
    setPendingAction(`commute:${mode}`);
    const targetNode = pendingAtlasId ? WORLD_ATLAS.find((node) => node.id === pendingAtlasId) : undefined;
    setJourney({
      destination,
      targetLabel: targetNode?.name ?? (destination === 'CBD' ? 'Cyber CBD' : 'Starter Arcology'),
      mode,
      fare: option.fare,
      durationGameMinutes: option.durationGameMinutes,
    });
    const startedAt = Date.now();
    try {
      let fare: number = option.fare;
      let gameMinutes: number = option.durationGameMinutes;
      let cashAfter = cash - fare;
      if (signedIn) {
        const data = await runCloudAction({ action: 'commute', destination, mode }, false);
        const result = recordOf(data.commute);
        fare = readableNumber(result?.fare, fare);
        gameMinutes = readableNumber(result?.durationGameMinutes, gameMinutes);
        cashAfter = readableNumber(result?.cashAfter, cashAfter);
      } else {
        setCash(cashAfter);
        setTransitSpend((value) => Number((value + fare).toFixed(2)));
        setTransitTrips((value) => value + 1);
        if (mode === 'METRO') setMetroRides((value) => value + 1);
        else setTaxiRides((value) => value + 1);
      }

      const remaining = Math.max(250, option.realDurationMs - (Date.now() - startedAt));
      await new Promise<void>((resolve) => window.setTimeout(resolve, remaining));
      if (!signedIn) setCurrentDistrict(destination);
      const nextPlace = pendingDestination;
      const nextAtlasId = pendingAtlasId;
      const nextAtlasNode: AtlasNode | undefined = nextAtlasId ? WORLD_ATLAS.find((node) => node.id === nextAtlasId) : undefined;
      const nextScene = nextAtlasNode?.scene ?? destination;
      setPendingDestination(null);
      setPendingAtlasId(null);
      setSelectedAtlasId(nextAtlasId ?? (destination === 'CBD' ? 'cbd' : 'starter'));
      setActiveScene(nextScene);
      setPlace(nextAtlasNode?.scene
        ? null
        : destination === 'CBD' && nextPlace && CBD_ARRIVAL_PLACES.includes(nextPlace)
          ? nextPlace
          : destination === 'STARTER_ARCOLOGY' && nextPlace === 'studio'
            ? 'studio'
            : null);
      setNotice(`${mode} ARRIVED · $${fare.toFixed(2)} VIRTUAL FARE PAID · ${gameMinutes} GAME MINUTES · CASH $${cashAfter.toFixed(2)}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message.toUpperCase() : 'TRANSIT UNAVAILABLE');
    } finally {
      setJourney(null);
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const addGuestHolding = (symbol: string, quantity: number, price: number, level: number, marginPosted: number, borrowedAmount: number) => setHoldings((current) => {
    const existing = current.find((holding) => holding.symbol === symbol);
    if (!existing) return [...current, { symbol, quantity, avgPrice: price, leverage: level, marginPosted, borrowedAmount }];
    const nextQuantity = existing.quantity + quantity;
    const avgPrice = ((existing.avgPrice * existing.quantity) + (price * quantity)) / nextQuantity;
    return current.map((holding) => holding.symbol === symbol ? { ...holding, quantity: nextQuantity, avgPrice, marginPosted: holding.marginPosted + marginPosted, borrowedAmount: holding.borrowedAmount + borrowedAmount } : holding);
  });

  const order = async (symbol: string, side: 'buy' | 'sell') => {
    if (actionLock.current) return;
    if (currentDistrict !== 'CBD') {
      openPlace('market');
      return;
    }
    const stock = stocks.find((item) => item.symbol === symbol);
    if (!stock) return;
    const currentHolding = holdings.find((holding) => holding.symbol === symbol);
    const owned = currentHolding?.quantity ?? 0;
    if (side === 'sell' && owned <= 0) return setNotice(`NO ${symbol} POSITION TO SELL`);
    if (side === 'buy' && currentHolding && currentHolding.leverage !== leverage) return setNotice(`CLOSE THE EXISTING ${currentHolding.leverage}× ${symbol} POSITION BEFORE USING ${leverage}×`);
    const marginAllocation = 500;
    const notional = side === 'buy' ? marginAllocation * leverage : owned * stock.price;
    const quantity = side === 'buy' ? notional / stock.price : owned;
    const fee = tradingFeeBps === 0 ? 0 : Math.max(0.01, Number((notional * tradingFeeBps / 10_000).toFixed(2)));
    const tradingTax = Number((notional * 0.0005).toFixed(2));
    const requiredCash = side === 'buy' ? marginAllocation + fee + tradingTax : 0;
    if (side === 'buy' && cash < requiredCash) return setNotice('INSUFFICIENT VIRTUAL CASH FOR MARGIN AND COSTS');
    actionLock.current = true;
    setPendingAction(`${side}:${symbol}`);
    try {
      let executionPrice = stock.price;
      let executionNotional = notional;
      let executionFee = fee;
      let executionFeeBps = tradingFeeBps;
      let executionTax = tradingTax;
      let executionMargin = side === 'buy' ? marginAllocation : currentHolding?.marginPosted ?? 0;
      let executionBorrowed = side === 'buy' ? notional - marginAllocation : currentHolding?.borrowedAmount ?? 0;
      if (signedIn) {
        const data = await runCloudAction(side === 'buy' ? { action: side, symbol, notional, leverage } : { action: side, symbol, quantity });
        const execution = recordOf(data.execution);
        executionPrice = readableNumber(execution?.price, executionPrice);
        executionNotional = readableNumber(execution?.notional, executionNotional);
        executionFee = readableNumber(execution?.fee, executionFee);
        executionFeeBps = readableNumber(execution?.feeBps, executionFeeBps);
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
      setNotice(`${side === 'buy' ? `${leverage}× LONG` : 'SOLD ALL'} ${symbol} @ $${executionPrice.toFixed(2)} · $${executionNotional.toFixed(2)} EXPOSURE · $${executionMargin.toFixed(2)} MARGIN · $${executionBorrowed.toFixed(2)} BORROWED · $${executionFee.toFixed(2)} FEE (${executionFeeBps} BPS) + $${executionTax.toFixed(2)} TAX`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message.toUpperCase() : 'ORDER REJECTED');
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const spend = async (price: number, item: string, _joy: number) => {
    if (actionLock.current) return;
    if (currentDistrict !== 'CBD') {
      openPlace('fashion');
      return;
    }
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
    if (currentDistrict !== 'CBD') {
      setPendingDestination('career');
      setPlace('map');
      setNotice('THE MARKET ASSISTANT INTERVIEW IS IN THE CBD · CHOOSE PAID TRANSIT');
      return;
    }
    actionLock.current = true;
    setPendingAction('hire');
    try {
      if (signedIn) await runCloudAction({ action: 'hire', job: 'MARKET_DATA_ASSISTANT' });
      else setCareer('MARKET DATA ASSISTANT');
      setMissions((value) => ({ ...value, firstJob: true }));
      setNotice('INTERVIEW PASSED · MARKET BRIEF REVIEW SHIFT UNLOCKED');
    } catch (error) {
      setNotice(error instanceof Error ? error.message.toUpperCase() : 'INTERVIEW UNAVAILABLE');
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const categoryComplete = (category: CareCategory) => category === 'MEAL'
    ? mealComplete
    : category === 'WELLNESS'
      ? wellnessComplete
      : leisureComplete;

  const performCare = async (option: LifeOption) => {
    if (actionLock.current || categoryComplete(option.category)) return;
    if (option.district === 'CBD' && currentDistrict !== 'CBD') {
      setPendingDestination('wellness');
      setPlace('map');
      setNotice(`${option.name.toUpperCase()} IS IN THE CBD · CHOOSE PAID TRANSIT`);
      return;
    }
    const activityTax = option.district === 'CBD' && option.price > 0 ? Number((option.price * 0.02).toFixed(2)) : 0;
    if (cash < option.price + activityTax) return setNotice('INSUFFICIENT VIRTUAL CASH FOR THIS DAILY CHOICE');
    actionLock.current = true;
    setPendingAction(`care:${option.code}`);
    try {
      if (signedIn) {
        await runCloudAction({ action: 'care', activityCode: option.code });
      } else {
        setCash((value) => Number((value - option.price - activityTax).toFixed(2)));
        setTax((value) => Number((value + activityTax).toFixed(2)));
        setHappiness((value) => Math.min(100, value + option.happiness));
        setNutrition((value) => Math.min(100, value + option.nutrition));
        setDailyCarePoints((value) => Math.min(20, value + option.carePoints));
        setDailyProtein((value) => Math.min(100, value + option.protein));
        setDailyProduce((value) => Math.min(100, value + option.produce));
        if (option.category === 'MEAL') setMealComplete(true);
        if (option.category === 'WELLNESS') setWellnessComplete(true);
        if (option.category === 'LEISURE') setLeisureComplete(true);
      }
      setNotice(`${option.name.toUpperCase()} COMPLETE · TODAY'S CARE RECORDED · FEE CHANGES ONLY AFTER END DAY`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message.toUpperCase() : 'DAILY CARE UNAVAILABLE');
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const completeShift = async (job: JobOption) => {
    if (actionLock.current) return;
    if (job.district === 'CBD' && currentDistrict !== 'CBD') {
      setPendingDestination('career');
      setPlace('map');
      setNotice(`${job.name.toUpperCase()} IS IN THE CBD · CHOOSE PAID TRANSIT`);
      return;
    }
    if (job.requiresCareer && career === 'UNEMPLOYED') return setNotice('COMPLETE THE CAREER TOWER INTERVIEW FIRST');
    if (lastWorkTurn === day) return setNotice('ONE ACTIVE PAID SHIFT IS ALLOWED PER GAME DAY');
    if (shiftsToday >= 2 || wagesToday >= 40) return setNotice('TODAY’S REAL-WORLD WORK ALLOWANCE IS COMPLETE');
    actionLock.current = true;
    setPendingAction(`work:${job.code}`);
    try {
      let pay = Math.min(job.pay, 40 - wagesToday);
      if (signedIn) {
        const data = await runCloudAction({ action: 'work', jobCode: job.code });
        pay = readableNumber(recordOf(data.work)?.pay, pay);
      } else {
        setCash((value) => Number((value + pay).toFixed(2)));
        setHappiness((value) => Math.max(0, Math.min(100, value + job.happiness)));
        setLastWorkTurn(day);
        setShiftsToday((value) => value + 1);
        setWagesToday((value) => Number((value + pay).toFixed(2)));
        setLifetimeWages((value) => Number((value + pay).toFixed(2)));
      }
      setMissions((value) => ({ ...value, firstJob: true }));
      setNotice(`${job.name.toUpperCase()} COMPLETE · $${pay.toFixed(2)} VIRTUAL PAY RECEIVED · NO PASSIVE WAGE`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message.toUpperCase() : 'WORK SHIFT UNAVAILABLE');
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const changeSocialMode = async (mode: 'PRIVATE' | 'APPROACHABLE') => {
    if (actionLock.current) return;
    actionLock.current = true;
    setPendingAction(`social:${mode}`);
    try {
      if (signedIn) await runCloudAction({ action: 'set_social_mode', mode });
      else setSocialMode(mode);
      setNotice(`${mode} SOCIAL PREFERENCE SAVED · REAL-PLAYER DISCOVERY IS NOT LIVE YET`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message.toUpperCase() : 'SOCIAL PREFERENCE UNAVAILABLE');
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
      let outcome = '';
      let careOutcome = '';
      if (signedIn) {
        const data = await runCloudAction({ action: 'end_day' });
        const dayClose = recordOf(data.dayClose);
        const settledWellbeing = recordOf(dayClose?.wellbeing);
        careOutcome = settledWellbeing?.completeCareDay
          ? ` · CARE STREAK ${readableNumber(settledWellbeing?.careStreak)}`
          : ' · CARE STREAK NOT ADVANCED';
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
          setCash((value) => value + liquidation.cashReturn);
          setTax((value) => Number((value + liquidation.cityTax).toFixed(2)));
          outcome = ' · CROSS-MARGIN CALL LIQUIDATED ALL MARKET POSITIONS';
        }
        const nextHappiness = Math.max(0, Math.round(happiness - 2));
        const nextNutrition = Math.max(0, Math.round(nutrition - 6));
        const completeCareDay = dailyCarePoints >= 4 && dailyProtein >= 70 && dailyProduce >= 70 && nextNutrition >= 55;
        const nextCareStreak = completeCareDay ? Math.min(30, careStreak + 1) : Math.max(0, careStreak - 1);
        const careScore = Math.min(100, Math.max(0, Math.round(nextHappiness * 0.6 + nextNutrition * 0.4 + Math.min(10, nextCareStreak))));
        const rawFeeBps = Math.min(10, Math.max(0, Math.ceil((100 - careScore) / 5)));
        const nextFeeBps = rawFeeBps === 0 && nextCareStreak < 7 ? 1 : rawFeeBps;
        setHappiness(nextHappiness);
        setNutrition(nextNutrition);
        setCareStreak(nextCareStreak);
        setTradingFeeBps(nextFeeBps);
        setDailyCarePoints(0);
        setDailyProtein(0);
        setDailyProduce(0);
        setMealComplete(false);
        setWellnessComplete(false);
        setLeisureComplete(false);
        careOutcome = completeCareDay ? ` · CARE STREAK ${nextCareStreak}` : ' · CARE STREAK NOT ADVANCED';
      }
      setNotice(`DAY ${String(day).padStart(3, '0')} CLOSED · NO PASSIVE WAGE · ACTIVE SHIFTS PAY IMMEDIATELY${careOutcome}${outcome}`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message.toUpperCase() : 'DAY CLOSE FAILED');
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const marketMove = (stock: Stock) => ((stock.price / stock.open - 1) * 100);
  const visibleNews = [worldEvent, ...WORLD_EVENTS.filter((event) => event.id !== worldEvent.id)].slice(0, 3);
  const fruitBoxOption = LIFE_OPTIONS.find((option) => option.code === 'FRESH_FRUIT_BOX')!;
  const coastDayTripOption = LIFE_OPTIONS.find((option) => option.code === 'COAST_DAY_TRIP')!;
  const islandWeekendOption = LIFE_OPTIONS.find((option) => option.code === 'ISLAND_WEEKEND')!;
  const careCost = (option: LifeOption) => option.price + (option.district === 'CBD' && option.price > 0 ? Number((option.price * 0.02).toFixed(2)) : 0);
  const canClaimRelief = signedIn ? reliefEligible : netWorth < 500 && holdings.length === 0 && reliefClaimsRemaining > 0;
  const residenceBlock = String(starterTower).padStart(3, '0');
  const atCbd = currentDistrict === 'CBD';
  const transitDestinationLabel = atCbd ? 'Starter Arcology' : 'Cyber CBD';
  const locationLabel = SCENE_LABELS[activeScene];
  const playerAtlasId = SCENE_ATLAS_IDS[activeScene];
  const selectedAtlasNode: AtlasNode = WORLD_ATLAS.find((node) => node.id === selectedAtlasId) ?? WORLD_ATLAS[0];
  const selectedIsCurrent = selectedAtlasNode.id === playerAtlasId;
  const selectedRequiredDistrict: WorldDistrict | null = selectedAtlasNode.availability === 'PLANNED'
    ? null
    : selectedAtlasNode.id === 'starter'
      ? 'STARTER_ARCOLOGY'
      : 'CBD';
  const selectedRequiresTravel = selectedRequiredDistrict !== null && selectedRequiredDistrict !== currentDistrict;
  const selectedAtlasStatus = selectedIsCurrent
    ? 'YOU ARE HERE'
    : selectedAtlasNode.availability === 'PLANNED'
      ? 'PLANNED · NOT PLAYABLE YET'
      : selectedAtlasNode.availability === 'GATED' && netWorth < 1_000_000
        ? '$1M VIRTUAL NET WORTH GATE'
        : selectedRequiresTravel
          ? 'PAID ROUTE · METRO $5 / TAXI $45'
          : selectedAtlasNode.scene
            ? 'LIVE · INDEPENDENT WALKABLE 3D SCENE'
            : 'INTERACTIVE NODE IN THE CURRENT ECONOMIC DISTRICT';
  const activeMarinaNode = selectedAtlasNode.place === 'marina'
    ? selectedAtlasNode
    : WORLD_ATLAS.find((node) => node.id === 'public-marina')!;
  const activeResidenceNode = selectedAtlasNode.place === 'residences'
    ? selectedAtlasNode
    : WORLD_ATLAS.find((node) => node.id === 'crown-residences')!;
  const pendingAtlasNode = pendingAtlasId ? WORLD_ATLAS.find((node) => node.id === pendingAtlasId) : undefined;
  const transitTargetLabel = pendingAtlasNode?.name ?? transitDestinationLabel;

  const selectAtlasNode = (nodeId: string) => {
    setSelectedAtlasId(nodeId);
    setPendingDestination(null);
    setPendingAtlasId(null);
  };

  const openSelectedAtlasNode = () => {
    if (selectedAtlasNode.availability === 'PLANNED' || !selectedAtlasNode.place) {
      setNotice(`${selectedAtlasNode.name.toUpperCase()} · PLANNED AREA · NO FALSE ENTRY POINT`);
      return;
    }
    if (selectedAtlasNode.availability === 'GATED' && netWorth < 1_000_000) {
      setNotice('MILLIONAIRE RIDGE REQUIRES $1,000,000 VIRTUAL NET WORTH');
      return;
    }
    if (selectedRequiresTravel) {
      setPendingDestination(selectedAtlasNode.place);
      setPendingAtlasId(selectedAtlasNode.id);
      setNotice(`${selectedAtlasNode.name.toUpperCase()} REQUIRES PAID TRANSIT · CHOOSE METRO $5 OR TAXI $45`);
      return;
    }
    if (selectedAtlasNode.scene) {
      setActiveScene(selectedAtlasNode.scene);
      setPlace(null);
      setPendingDestination(null);
      setPendingAtlasId(null);
      setNotice(`${selectedAtlasNode.name.toUpperCase()} · LIVE 3D SCENE ENTERED`);
      return;
    }
    openPlace(selectedAtlasNode.place, selectedAtlasNode.id);
  };

  return (
    <main className="game">
      <header><div className="logo">A</div><div><b>AMPLIWORLD</b><small>THE LIVING MARKET</small></div><div className="day">DAY {String(day).padStart(3, '0')} · 20:42 · {locationLabel}</div><div className="player"><span>{playerName}</span>{signedIn ? <i>CLOUD SAVE</i> : <a href={signInPath} target="_top">SIGN IN TO SAVE</a>}</div></header>
      <section className="playfield">
        <Canvas aria-label="Playable AmpliWorld city" tabIndex={0} shadows dpr={[1, 1.5]} camera={{ position: [0, 3.5, 6.4], fov: 48 }}><World key={activeScene} onEnter={openPlace} onNotice={setNotice} onPositionChange={setLocalPosition} scene={activeScene} residenceBlock={residenceBlock} place={place} /></Canvas>
        {!place && <MiniMap scene={activeScene} residenceBlock={residenceBlock} location={localPosition} onOpen={() => openPlace('map')} />}
        <div className={`mission ${activeScene === 'STARTER_ARCOLOGY' ? 'arcology-mission' : ''}`}><small>{activeScene === 'STARTER_ARCOLOGY' ? `BLOCK ${residenceBlock} · FLOOR ${starterFloor} · UNIT ${starterUnit}` : locationLabel}</small><b>{activeScene === 'STARTER_ARCOLOGY' ? 'Turn $10,000 into a way out' : activeScene === 'CBD' ? 'Make every paid trip count' : 'Walk the district · learn the living market'}</b><span aria-live="polite">{notice}</span><div className="mission-track"><i className={missions.firstTrade ? 'done' : ''}>TRADE</i><i className={missions.firstJob ? 'done' : ''}>JOB</i><i className={missions.firstPurchase ? 'done' : ''}>MOVE UP</i></div></div>
        <div className="controls"><kbd>W</kbd>/<kbd>S</kbd> WALK · <kbd>A</kbd>/<kbd>D</kbd> TURN · CAMERA FOLLOWS FROM BEHIND · <kbd>M</kbd> MAP</div><TouchControls />
        <aside className="hud"><div><WalletCards /><span>CASH<big>${cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}</big></span></div><div><Banknote /><span>MARKET EQUITY<big>${portfolioEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</big></span></div><div><Smile /><span>HAPPINESS<big>{happiness}%</big></span></div><div><Leaf /><span>NUTRITION · FEE<big>{nutrition}% · {tradingFeeBps} bps</big></span></div><div><Trophy /><span>CITY STATUS<big>{netWorth >= 1_000_000 ? 'VIRTUAL RIDGE' : netWorth >= 100_000 ? 'ISLAND ELIGIBLE' : 'ARCOLOGY RESIDENT'}</big></span></div></aside>
        <nav><button onClick={() => openPlace('studio')}><Home />HOME</button><button onClick={() => openPlace('map')}><MapIcon />MAP</button><button onClick={() => openPlace('market')}><Banknote />TRADE</button><button onClick={() => openPlace('news')}><Newspaper />WORLD</button><button onClick={() => openPlace('wellness')}><Heart />LIFE</button><button onClick={() => openPlace('career')}><BriefcaseBusiness />WORK</button><button onClick={() => openPlace('social')}><Users />SOCIAL</button><button onClick={() => openPlace('inventory')}><ShoppingBag />ITEMS <em>{inventory.length}</em></button><button disabled={pendingAction !== null} onClick={() => void closeDay()}><Clock3 />{pendingAction === 'end-day' ? 'CLOSING…' : 'END DAY'}</button><button onClick={() => openPlace('menu')}><Menu />MENU</button></nav>

        {journey && <output className="journey-overlay" aria-live="assertive"><div className="journey-card">{journey.mode === 'METRO' ? <TrainFront /> : <Car />}<small>PAID TRANSIT IN PROGRESS</small><h2>{journey.mode === 'METRO' ? 'Metro' : 'Taxi'} to {journey.targetLabel}</h2><p>${journey.fare.toFixed(2)} virtual fare charged · {journey.durationGameMinutes} game minutes</p><div className={`journey-progress ${journey.mode.toLowerCase()}`}><i /></div><span>{journey.mode === 'METRO' ? '≈ 2 seconds of real time' : '≈ 1 second of real time'}</span></div></output>}

        {place && <dialog id="city-map-dialog" open className={`modal ${place === 'studio' ? 'studio-modal' : ''} ${place === 'map' ? 'map-modal' : ''}`} aria-label="AmpliWorld location panel"><button className="close" onClick={() => openPlace(null)} aria-label="Close"><X /></button>
          {place === 'market' && <><small>CYBER CITY EXCHANGE · EXECUTABLE VIRTUAL QUOTES</small><VisionPanel image="/visuals/ampliworld-trading-terminal.jpg" label="PRODUCT VISION · PLAYABLE VIRTUAL TRADING LOOP" alt="Concept visualization of the AmpliWorld trading terminal" /><h1>Trade the living world</h1><p>Every order is virtual. Allocate $500 of margin, choose 1×–5× exposure, and manage the risk of server-enforced liquidation.</p><div className="fee-banner"><Heart /><span><b>{tradingFeeBps} BPS CURRENT TRADING FEE</b>Today&apos;s lifestyle settles only at END DAY. City trading tax remains 5 bps; forced liquidation remains 10 bps.</span><button onClick={() => setPlace('wellness')}>IMPROVE NEXT DAY</button></div><div className="leverage-desk"><span><b>LEVERAGE</b>{([1, 2, 3, 5] as const).map((level) => <button key={level} className={leverage === level ? 'active' : ''} onClick={() => setLeverage(level)}>{level}×</button>)}</span><i>$500 margin → ${(500 * leverage).toLocaleString()} gross exposure</i></div><div className="market-table"><div className="market-row header"><span>Asset</span><span>Price</span><span>Day</span><span>Position</span><span>Order</span></div>{stocks.map((stock) => { const move = marketMove(stock); const holding = holdings.find((item) => item.symbol === stock.symbol); const buyPending = pendingAction === `buy:${stock.symbol}`; const sellPending = pendingAction === `sell:${stock.symbol}`; return <div className="market-row" key={stock.symbol}><span><b>{stock.symbol}</b><small>{stock.name}</small></span><span>${stock.price.toFixed(2)}</span><span className={move >= 0 ? 'gain' : 'loss'}>{move >= 0 ? '+' : ''}{move.toFixed(2)}%</span><span>{holding ? `${holding.quantity.toFixed(2)} sh · ${holding.leverage}×` : '—'}</span><span className="order-buttons"><button disabled={pendingAction !== null} onClick={() => void order(stock.symbol, 'buy')}>{buyPending ? '…' : `BUY ${leverage}×`}</button><button disabled={pendingAction !== null || !holding} onClick={() => void order(stock.symbol, 'sell')}>{sellPending ? '…' : 'SELL ALL'}</button></span></div>; })}</div><div className="portfolio-summary risk"><span>Gross exposure <b>${portfolio.toFixed(2)}</b></span><span>Account equity <b>${portfolioEquity.toFixed(2)}</b></span><span>Borrowed <b>${borrowedExposure.toFixed(2)}</b></span><span>Margin excess <b className={marginExcess >= 0 ? 'gain' : 'loss'}>${marginExcess.toFixed(2)}</b><small>Maintenance ${maintenanceMargin.toFixed(2)}</small></span></div>{canClaimRelief && <div className="relief-panel"><span><b>Paper-account relief available</b>Up to $1,000 virtual cash · {reliefClaimsRemaining} lifetime claim{reliefClaimsRemaining === 1 ? '' : 's'} remaining</span><button disabled={pendingAction !== null} onClick={() => void claimRelief()}>{pendingAction === 'relief' ? 'ISSUING…' : 'CLAIM VIRTUAL RELIEF'}</button></div>}</>}
          {place === 'news' && <><small>AMPLIWORLD NEWSWIRE · DAY {String(day).padStart(3, '0')}</small><VisionPanel image="/visuals/ampliworld-population-simulation.jpg" label="WORLD ENGINE · POPULATION TO SIGNAL" alt="Concept visualization of the AmpliWorld population simulation engine" /><h1>Today&apos;s world state</h1><p>The lead event is part of the active simulation state: close the day and its asset impacts settle into tomorrow&apos;s prices.</p><div className="population-strip"><span><b>8.3B</b>upstream population frame</span><span><b>1M</b>target weighted core</span><span><b>4,096</b>planned active cohorts</span><span><b>32</b>visible representative NPCs</span></div><div className="news-list">{visibleNews.map((event, index) => <article className={index === 0 ? 'lead' : ''} key={event.id}><i>{index === 0 ? `ACTIVE SIMULATION · ${event.domain}` : event.domain}</i><b>{event.headline}</b><span>{event.impacts.join(' · ')}</span></article>)}</div></>}
          {place === 'map' && <>
            <small>LIVE CITY ATLAS · PRESS M ANYWHERE · 20 × 30 KM</small>
            <h1>Your position inside the city plan.</h1>
            <p>The 20 × 30 km atlas links five independent playable 3D scenes. The pulsing marker identifies the scene you occupy, while the corner minimap tracks your actual walking position inside it. Select a live destination to enter its world, or open a city-service panel.</p>
            <div className="atlas-layout">
              <CityAtlas selectedId={selectedAtlasId} playerNodeId={playerAtlasId} onSelect={selectAtlasNode} />
              <aside className="atlas-inspector">
                <span className={`atlas-kind ${selectedAtlasNode.kind.toLowerCase()}`}>
                  {selectedAtlasNode.kind === 'HOSPITAL' ? <Hospital /> : selectedAtlasNode.kind === 'POLICE' ? <Shield /> : selectedAtlasNode.kind === 'SCHOOL' ? <GraduationCap /> : selectedAtlasNode.kind === 'AUTO' ? <Car /> : selectedAtlasNode.kind === 'MARINA' || selectedAtlasNode.kind === 'PORT' ? <Ship /> : selectedAtlasNode.kind === 'GROCER' ? <Store /> : selectedAtlasNode.kind === 'RESIDENTIAL' || selectedAtlasNode.kind === 'VILLAS' ? <Building2 /> : <MapPin />}
                </span>
                <small>{selectedAtlasNode.zone}</small>
                <h2>{selectedAtlasNode.name}</h2>
                <p>{selectedAtlasNode.detail}</p>
                <dl><div><dt>WORLD GRID</dt><dd>{selectedAtlasNode.x.toFixed(1)}E · {selectedAtlasNode.y.toFixed(1)}N</dd></div><div><dt>STATUS</dt><dd>{selectedAtlasStatus}</dd></div><div><dt>YOUR LOCAL POSITION</dt><dd>X {localPosition.x.toFixed(1)} · Z {localPosition.z.toFixed(1)}</dd></div></dl>
                <button disabled={selectedAtlasNode.availability === 'PLANNED' || (selectedAtlasNode.availability === 'GATED' && netWorth < 1_000_000)} onClick={openSelectedAtlasNode}>{selectedAtlasNode.availability === 'PLANNED' ? 'AREA NOT PLAYABLE YET' : selectedAtlasNode.availability === 'GATED' && netWorth < 1_000_000 ? 'VIRTUAL NET WORTH REQUIRED' : selectedRequiresTravel ? `TRAVEL TO ${selectedRequiredDistrict === 'CBD' ? 'CBD' : 'HOME'} + ${selectedAtlasNode.scene ? 'ENTER 3D SCENE' : 'OPEN LOCATION'}` : selectedAtlasNode.scene ? `ENTER ${selectedAtlasNode.name.toUpperCase()} · 3D` : `OPEN ${selectedAtlasNode.name.toUpperCase()}`}</button>
              </aside>
            </div>
            <div className="atlas-legend"><span><i className="you" />YOU</span><span><i className="open" />INTERACTIVE NODE</span><span><i className="route" />TRANSIT LINE</span><span><i className="gated" />GATED</span><span><i className="planned" />PLANNED</span></div>
            <div className="city-layer-grid">
              <article><Hospital /><b>PUBLIC CITY</b><span>Hospital · police · academy</span></article>
              <article><Store /><b>DAILY CITY</b><span>Fresh market · dining · park</span></article>
              <article><Building2 /><b>RESIDENTIAL CITY</b><span>Studio · 1B · 2B · full-floor homes</span></article>
              <article><Car /><b>MOBILITY CITY</b><span>Metro · taxi · 4S auto district</span></article>
              <article><Ship /><b>WATERFRONT CITY</b><span>Public boats · yachts · cargo · liners</span></article>
            </div>
            <div className="population-strip"><span><b>{WORLD_ASSET_COUNTS.buildings}</b>numbered buildings</span><span><b>{WORLD_ASSET_COUNTS.watercraft}</b>numbered watercraft</span><span><b>{WORLD_ASSET_COUNTS.vehicles}</b>numbered vehicles</span><span><b>5</b>walkable 3D scenes</span></div>
            <section className="transit-desk">
              <div className="transit-route"><span>CURRENT <b>{locationLabel}</b></span><i>18.4 KM</i><span>DESTINATION <b>{transitTargetLabel.toUpperCase()}</b></span></div>
              <div className="transit-options">
                <button disabled={pendingAction !== null || cash < 0} onClick={() => void commute('METRO')}><TrainFront /><span><small>PUBLIC TRANSIT</small><b>{pendingAction === 'commute:METRO' ? 'BOARDING…' : `METRO TO ${transitTargetLabel.toUpperCase()}`}</b><i>$5 virtual · 28 game min · ≈ 2 sec</i></span><em>{cash < 0 ? 'UNAVAILABLE' : 'PAY $5'}</em></button>
                <button disabled={pendingAction !== null || cash < 45} onClick={() => void commute('TAXI')}><Car /><span><small>EXPRESS TRANSIT</small><b>{pendingAction === 'commute:TAXI' ? 'DEPARTING…' : `TAXI TO ${transitTargetLabel.toUpperCase()}`}</b><i>$45 virtual · 11 game min · ≈ 1 sec</i></span><em>{cash < 45 ? 'NEED $45' : 'PAY $45'}</em></button>
              </div>
              <div className="transit-ledger"><span>TRIPS <b>{transitTrips}</b></span><span>METRO <b>{metroRides}</b></span><span>TAXI <b>{taxiRides}</b></span><span>LIFETIME FARES <b>${transitSpend.toFixed(2)}</b></span></div>
            </section>
            <VisionPanel image="/visuals/ampliworld-world-asset-master-v1.png" label="CLOUD-RENDERED WORLD ASSET DIRECTION · MARINA / CITY CORE / VILLA RIDGE" alt="Original AmpliWorld environment direction showing its marina, residential skyline, villa ridge and correctly separated traffic" />
          </>}
          {place === 'hospital' && <>
            <small>MERIDIAN GENERAL HOSPITAL · PUBLIC CITY SYSTEM</small>
            <h1>A real city needs somewhere to recover.</h1>
            <p>The hospital anchors the eastern civic corridor with an emergency entrance, inpatient wings, a rooftop helipad and a public healing garden. It is a physical landmark now; clinical gameplay and appointments remain a future system.</p>
            <div className="facility-hero hospital-facility"><Hospital /><span><small>OPEN 24 / 7</small><b>Emergency · inpatient · community wellness</b><em>3D LANDMARK LIVE</em></span></div>
            <div className="facility-grid"><article><b>EMERGENCY</b><span>Arrival lobby and rooftop transfer point</span></article><article><b>CARE TOWER</b><span>Two inpatient wings around a central core</span></article><article><b>WELLNESS LINK</b><span>Daily-care actions connect health to trader discipline</span></article></div>
            <button className="facility-action" onClick={() => setPlace('wellness')}>OPEN DAILY WELLNESS</button>
          </>}
          {place === 'police' && <>
            <small>CIVIC SAFETY HEADQUARTERS · EAST CIVIC</small>
            <h1>Public safety is part of the city, not a decoration.</h1>
            <p>The headquarters includes a walk-in public lobby, emergency coordination wing, vehicle court and rooftop communications mast. The building is playable as a landmark; reporting, response and public-service missions are not yet connected.</p>
            <div className="facility-hero police-facility"><Shield /><span><small>CIVIC NETWORK</small><b>Public lobby · emergency coordination · city response</b><em>3D LANDMARK LIVE</em></span></div>
            <div className="facility-grid"><article><b>PUBLIC DESK</b><span>Future help, permits and lost-property services</span></article><article><b>RESPONSE</b><span>Future dispatch and city event missions</span></article><article><b>TRUST</b><span>No crime or enforcement system is simulated yet</span></article></div>
          </>}
          {place === 'academy' && <>
            <small>AMPLIWORLD ACADEMY · EDUCATION BELT</small>
            <h1>Before a city creates wealth, it creates capability.</h1>
            <p>The southern campus combines two teaching wings, a learning commons and a compact sports court. It will eventually host finance, world-model and city-systems learning; today it is an explorable civic landmark.</p>
            <div className="facility-hero school-facility"><GraduationCap /><span><small>LEARNING COMMONS</small><b>Markets · simulation · civic systems</b><em>CURRICULUM PLANNED</em></span></div>
            <div className="facility-grid"><article><b>MARKET LAB</b><span>Planned paper-trading and risk tutorials</span></article><article><b>WORLD LAB</b><span>Planned event-to-behavior simulation lessons</span></article><article><b>SPORTS COURT</b><span>A visible public space inside the live 3D campus</span></article></div>
          </>}
          {place === 'dealership' && <>
            <small>APEX MOTORS 4S · EAST AUTO DISTRICT</small>
            <h1>Sales, service, spares and support—under one roof.</h1>
            <p>The glass showroom displays a city sedan, luxury SUV and future racer beside a full service hall. Vehicles will turn wealth into mobility and identity; checkout, ownership and drivable-car systems are not live in this build.</p>
            <div className="vehicle-lineup"><article><Car /><small>CITY SERIES</small><b>Apex Sedan</b><span>Efficient everyday mobility</span></article><article><Car /><small>EXECUTIVE SERIES</small><b>Apex Luxury SUV</b><span>Comfort for coast and ridge</span></article><article><Car /><small>FUTURE SERIES</small><b>Apex Ion R</b><span>Concept performance platform</span></article></div>
            <div className="facility-grid compact"><article><b>SALES</b><span>Showroom</span></article><article><b>SERVICE</b><span>Workshop</span></article><article><b>SPARES</b><span>Parts center</span></article><article><b>SUPPORT</b><span>Owner desk</span></article></div>
            <button className="facility-action" disabled>VEHICLE OWNERSHIP NOT CONNECTED</button>
          </>}
          {place === 'grocer' && <>
            <small>VERDANT FRESH MARKET · CENTRAL MARKET</small>
            <h1>Fruit and vegetables now have a real address.</h1>
            <p>Verdant turns an abstract wellness action into a place in the city. A fresh box improves today&apos;s produce and nutrition record; the resulting fee change is still calculated only when the day closes.</p>
            <div className="fresh-counter"><Store /><span><small>TODAY&apos;S PRODUCE</small><b>{fruitBoxOption.name}</b><em>${fruitBoxOption.price} virtual · universal daily item · no CBD tax</em></span><strong>+{fruitBoxOption.produce} PRODUCE · +{fruitBoxOption.nutrition} NUTRITION<br />+{fruitBoxOption.protein} PROTEIN · +{fruitBoxOption.happiness} HAPPINESS · +{fruitBoxOption.carePoints} CARE</strong></div>
            <button className="facility-action" disabled={pendingAction !== null || wellnessComplete || cash < careCost(fruitBoxOption)} onClick={() => void performCare(fruitBoxOption)}>{wellnessComplete ? 'WELLNESS COMPLETE TODAY' : pendingAction === `care:${fruitBoxOption.code}` ? 'PACKING…' : `BUY TODAY’S FRESH BOX · $${careCost(fruitBoxOption).toFixed(2)}`}</button>
          </>}
          {place === 'marina' && <>
            <small>{activeMarinaNode.name.toUpperCase()} · {activeMarinaNode.zone}</small>
            <h1>{activeMarinaNode.id === 'deepwater' ? 'The city trades through the waterline.' : activeMarinaNode.id === 'yacht-marina' ? 'The skyline opens onto the sea.' : 'The city meets the world at the waterline.'}</h1>
            <p>{activeMarinaNode.detail}. Fishing boats, speedboats, sailboats, tugs, cargo ships and ocean liners now occupy the western coast without pretending that every vessel is already drivable.</p>
            <div className="marina-fleet"><article><Ship /><small>PUBLIC HARBOR</small><b>Fishing · sailing · speedboats</b><span>Live 3D fleet</span></article><article><Ship /><small>YACHT BASIN</small><b>Private slips &amp; coastal leisure</b><span>Ownership planned</span></article><article><Ship /><small>DEEPWATER</small><b>Cargo · tugs · ocean liners</b><span>World-trade layer</span></article></div>
            <p className="choice-note">Choose one leisure activity per game day. Coast trip: +{coastDayTripOption.happiness} happiness, +{coastDayTripOption.carePoints} care. Island weekend: +{islandWeekendOption.happiness} happiness, +{islandWeekendOption.carePoints} care.</p>
            <div className="marina-actions"><button disabled={pendingAction !== null || leisureComplete || cash < careCost(coastDayTripOption)} onClick={() => void performCare(coastDayTripOption)}>{leisureComplete ? 'LEISURE COMPLETE TODAY' : pendingAction === `care:${coastDayTripOption.code}` ? 'DEPARTING…' : `COAST DAY TRIP · $${careCost(coastDayTripOption).toFixed(2)}`}</button><button disabled={pendingAction !== null || leisureComplete || cash < careCost(islandWeekendOption)} onClick={() => void performCare(islandWeekendOption)}>{leisureComplete ? 'LEISURE COMPLETE TODAY' : pendingAction === `care:${islandWeekendOption.code}` ? 'DEPARTING…' : `ISLAND WEEKEND · $${careCost(islandWeekendOption).toFixed(2)}`}</button></div>
          </>}
          {place === 'residences' && <>
            <small>{activeResidenceNode.name.toUpperCase()} · {activeResidenceNode.zone}</small>
            <h1>The center of the skyline belongs to people.</h1>
            <p>Three architecturally distinct science-fiction residential towers define the city core. Each premium level is conceived as one large full-floor home—not a stack of anonymous boxes. Around them, five- and six-floor pool communities provide the attainable next step from Starter Arcology.</p>
            <div className="housing-ladder">
              <article><small>ATTAINABLE MIDRISE</small><b>Canopy Studio</b><span>5 floors · shared pool · compact first upgrade</span><em>RESERVATIONS PLANNED</em></article>
              <article><small>ATTAINABLE MIDRISE</small><b>Canopy 1B / 2B</b><span>5–6 floors · more space · central neighborhood</span><em>RESERVATIONS PLANNED</em></article>
              <article className="helix-home"><small>CITY-CORE SIGNATURE</small><b>Helix One</b><span>Rotating floor plates · one panoramic home per level</span><em>FULL-FLOOR RESIDENCE</em></article>
              <article className="prism-home"><small>CITY-CORE SIGNATURE</small><b>Prism House</b><span>Faceted terraces · private sky garden levels</span><em>FULL-FLOOR RESIDENCE</em></article>
              <article className="bridge-home"><small>CITY-CORE SIGNATURE</small><b>Skybridge Residences</b><span>Twin towers · private bridge salons above the CBD</span><em>FULL-FLOOR RESIDENCE</em></article>
            </div>
            <p className="truth-note">The buildings are live in the 3D city. Apartment interiors, reservations, prices and ownership are deliberately marked as planned until those systems are implemented.</p>
            <button className="facility-action" onClick={() => setPlace('map')}>RETURN TO CITY HOUSING MAP</button>
          </>}
          {place === 'studio' && <>
            <small>STARTER ARCOLOGY · BLOCK {residenceBlock} · FLOOR {starterFloor} · UNIT {starterUnit}</small>
            <h1>Your first ten square meters</h1>
            <p>Every player starts here: one room, one terminal and a one-year right to stay. The legal footprint remains 10 m², while the interior uses a 2.1× navigation scale so it feels comfortable to explore—compact outside, spacious inside, like a game world rather than a floor-plan simulator.</p>
            <div className="studio-plan"><div className="studio-room"><span>FOLDING BED</span><span>MARKET TERMINAL</span><span>LOCKER</span><b>10 m²</b></div><div className="studio-facts"><span><b>50</b>floors</span><span><b>10,000</b>residents per tower</span><span><b>1,000</b>towers in the district</span><span><b>{leaseDays}</b>lease days remaining</span></div></div>
            <section className="home-terminal"><header><span><small>HOME MARKET TERMINAL</small><b>Quotes are visible. Orders execute in the CBD.</b></span><i>VIEW ONLY</i></header>{stocks.slice(0, 3).map((stock) => { const move = marketMove(stock); return <div key={stock.symbol}><span><b>{stock.symbol}</b><small>{stock.name}</small></span><b>${stock.price.toFixed(2)}</b><i className={move >= 0 ? 'gain' : 'loss'}>{move >= 0 ? '+' : ''}{move.toFixed(2)}%</i></div>; })}<button onClick={() => openPlace('market')}><TrainFront />COMMUTE TO CYBER CBD TO TRADE</button></section>
            <div className="residence-note"><Home /><span><b>No shortcut is hidden here.</b>Your portfolio is the route from this room to the skyline.</span></div>
          </>}
          {place === 'wellness' && <>
            <small>DAILY LIFE · NEXT-DAY TRADING DISCIPLINE</small>
            <VisionPanel image="/visuals/ampliworld-lifestyle-economy.jpg" label="CARE FOR THE CHARACTER · LOWER TOMORROW'S FRICTION" alt="Concept visualization of an AmpliWorld home and lifestyle economy" />
            <h1>Your trader is part of the system.</h1>
            <p>Delivery can keep a character alive; it cannot make the character well. Build nutrition, produce, protein and recovery over consecutive days. Today&apos;s choices settle into tomorrow&apos;s trading fee only when you end the day.</p>
            <div className="wellbeing-ledger"><span><Heart /><b>{happiness}%</b><small>HAPPINESS</small></span><span><Leaf /><b>{nutrition}%</b><small>NUTRITION</small></span><span><Utensils /><b>{dailyProtein}%</b><small>PROTEIN TODAY</small></span><span><ShoppingBag /><b>{dailyProduce}%</b><small>PRODUCE TODAY</small></span><span><Footprints /><b>{careStreak}</b><small>CARE STREAK</small></span><span className="fee"><Coins /><b>{tradingFeeBps} bps</b><small>CURRENT FEE</small></span></div>
            <div className="care-rule"><b>ZERO-FEE PATH</b><span>Reach 95 happiness, 90 nutrition and at least seven consecutive complete-care days. Clothing, property and future paid social items cannot buy a fee advantage.</span></div>
            <div className="life-grid">{LIFE_OPTIONS.map((option) => { const complete = categoryComplete(option.category); const travel = option.district === 'CBD' && !atCbd; const cost = option.price + (option.district === 'CBD' && option.price > 0 ? option.price * 0.02 : 0); return <article className={complete ? 'complete' : ''} key={option.code}><span className="life-icon">{option.category === 'MEAL' ? <Utensils /> : option.category === 'WELLNESS' ? <Leaf /> : <Footprints />}</span><small>{option.category} · {option.district === 'CBD' ? 'CBD' : 'ANYWHERE'}</small><h2>{option.name}</h2><p>{option.description}</p><div><span>+{option.happiness} HAP · +{option.nutrition} NUT</span><b>{option.price ? `$${option.price}${option.district === 'CBD' ? ' + tax' : ''}` : 'FREE'}</b></div><button disabled={pendingAction !== null || complete || cash < cost} onClick={() => void performCare(option)}>{complete ? `${option.category} COMPLETE` : pendingAction === `care:${option.code}` ? 'RECORDING…' : travel ? 'TRAVEL TO CBD' : 'CHOOSE TODAY'}</button></article>; })}</div>
          </>}
          {place === 'social' && <>
            <small>SOCIAL PLAZA · CONSENT-FIRST PREVIEW</small>
            <h1>A living city, private by default.</h1>
            <p>This build contains 32 representative NPCs. Real-player encounters, Contact Coin checkout, world visits, cyber dates and parties are not live yet.</p>
            <div className="social-status"><span><b>NPC ONLY</b><small>CURRENT SCENE</small></span><span><b>OFFLINE</b><small>REAL-PLAYER DISCOVERY</small></span><span><b>{contactCoins} · NOT FOR SALE</b><small>CONTACT COINS</small></span><span><b>DESIGN TARGET · 100 MAX</b><small>PARTIES</small></span></div>
            <section className="privacy-setting"><div><Users /><span><small>FUTURE DISCOVERY PREFERENCE</small><b>{socialMode === 'PRIVATE' ? 'Private' : 'Approachable · preference only'}</b><p>{socialMode === 'PRIVATE' ? 'No other player can discover you.' : 'Your choice is saved for a future opt-in test. You are not visible in this build.'}</p></span></div><div><button className={socialMode === 'PRIVATE' ? 'active' : ''} disabled={pendingAction !== null} onClick={() => void changeSocialMode('PRIVATE')}>PRIVATE</button><button className={socialMode === 'APPROACHABLE' ? 'active' : ''} disabled={pendingAction !== null} onClick={() => void changeSocialMode('APPROACHABLE')}>APPROACHABLE · PREFERENCE ONLY</button></div></section>
            <div className="social-grid"><article><small>NPC</small><h2>Representative citizens</h2><p>Client-generated characters make streets feel alive without pretending to be real people.</p><i>AVAILABLE NOW</i></article><article><small>PLAYER SNAPSHOT</small><h2>World visits &amp; cyber dates</h2><p>Planned visits require mutual invitation and load only a published, privacy-safe world snapshot.</p><i>NOT LIVE</i></article><article><small>LIVE PLAYER</small><h2>Opt-in encounters</h2><p>Future real players will be clearly labeled. Exact location and real financial information will never be displayed.</p><i>DISCOVERY OFFLINE</i></article><article><small>CONTACT COINS</small><h2>One introduction request</h2><p>A future coin cannot buy consent, a reply or personal contact details. Rejected or expired requests return the coin.</p><button disabled>NO CHECKOUT IN THIS BUILD</button></article><article><small>PRIVATE PARTY</small><h2>20 → 50 → 100</h2><p>Temporary party instances will scale only after load, safety and moderation testing.</p><button disabled>PARTIES NOT LIVE</button></article></div>
            <p className="truth-note">No payment is collected, no real player is exposed, and no message is sent in this build.</p>
          </>}
          {place === 'inventory' && <><small>OWNED GOODS</small><h1>Your life, made visible</h1><p>Trading performance becomes clothing, experiences and property designed for future opt-in world visits.</p><div className="inventory-grid">{inventory.length ? inventory.map((item, index) => <article key={`${item}-${index}`}><ShoppingBag /><span><b>{item}</b><small>Owned · future player marketplace support is planned</small></span></article>) : <article className="empty"><ShoppingBag /><span><b>No items yet</b><small>Visit Neon Atelier or Nova Dining after your first trade.</small></span></article>}</div></>}
          {place === 'menu' && <><small>HOW TO PLAY</small><h1>Trade your way out.</h1><p>Everybody begins with $10,000 and a 10 m² studio in a remote high-density district. Study the world, protect your capital and decide when a paid metro or taxi trip into the CBD is worthwhile.</p><div className="menu-list"><span><kbd>1</kbd><b>Read</b> world news and company events</span><span><kbd>2</kbd><b>Travel</b> to the CBD by paid metro or taxi</span><span><kbd>3</kbd><b>Trade</b> a virtual position and manage risk</span><span><kbd>4</kbd><b>Move up</b> through property, goods and status</span></div><p className="save-state">{signedIn ? 'Cloud save is connected for this player.' : 'Guest mode is playable now. Sign in to retain progress across sessions.'}<small>CC0 3D assets by Kenney and Quaternius.</small></p></>}
          {place === 'villa' && <><small>MILLIONAIRE RIDGE · OPEN VISITATION · OWNERSHIP BY VIRTUAL WEALTH</small><VisionPanel image="/visuals/ampliworld-millionaire-ridge.jpg" label="MILLIONAIRE RIDGE · CONCEPT ENVIRONMENT" alt="Concept visualization of the AmpliWorld detached-villa community" /><h1>Visit freely. Earn the right to own.</h1><p>Every player may walk the district and inspect its architecture. Most residences are bought with virtual dollars earned in the market. The final estate offers either an extreme virtual-money path or a future premium cosmetic edition—never a trading advantage.</p><div className="villa-ledger"><span><b>Your virtual net worth</b>${netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span><span><b>Ownership tier begins</b>$1,000,000</span><span><b>Future premium exchange</b>$1 = 100 Credits</span></div><div className="real-estate-grid"><article><small>GARDEN SERIES</small><h2>Parkside Villa</h2><p>Detached home, private garden and two-car garage.</p><b>$1,200,000 virtual</b><button disabled={pendingAction !== null} onClick={() => void spend(1_200_000, 'Parkside Villa', 20)}>BUY WITH VIRTUAL CASH</button></article><article><small>COURTYARD SERIES</small><h2>Glass Courtyard Villa</h2><p>Pool courtyard, gallery wing and city membership.</p><b>$4,800,000 virtual</b><button disabled={pendingAction !== null} onClick={() => void spend(4_800_000, 'Glass Courtyard Villa', 30)}>BUY WITH VIRTUAL CASH</button></article><article><small>ESTATE SERIES</small><h2>Helix Estate</h2><p>Hilltop grounds, guest house and private showroom.</p><b>$25,000,000 virtual</b><button disabled={pendingAction !== null} onClick={() => void spend(25_000_000, 'Helix Estate', 40)}>BUY WITH VIRTUAL CASH</button></article><article className="premium-estate"><small>FOUNDERS&apos; EDITION</small><h2>Sky Estate</h2><p>The same status is designed to be earned through extraordinary play or purchased later as a cosmetic world edition.</p><b>$250,000,000 virtual <em>or</em> 49,900 Credits</b><div><button disabled={pendingAction !== null} onClick={() => void spend(250_000_000, 'Founders Sky Estate', 50)}>EARN IN GAME</button><button disabled>PREMIUM CHECKOUT NOT CONNECTED</button></div></article></div></>}
          {place === 'fashion' && <><small>NEON ATELIER</small><h1>Wear your success</h1><p>Skins are designed for future social spaces. Cosmetic purchases cannot reduce trading fees.</p><div className="goods"><button disabled={pendingAction !== null} onClick={() => void spend(180, 'Midnight Trader Jacket', 8)}><Shirt /><span><b>Midnight Trader Jacket</b><small>$180 + 2% tax</small></span></button><button disabled={pendingAction !== null} onClick={() => void spend(480, 'Founder Skin', 15)}><Shirt /><span><b>Founder Skin</b><small>$480 + 2% tax</small></span></button></div></>}
          {place === 'restaurant' && <><small>NOVA DINING</small><h1>Tonight&apos;s table</h1><p>A complete meal contributes to today&apos;s care record. Celebration goods remain cosmetic and cannot buy a trading-fee advantage.</p><div className="goods"><button disabled={pendingAction !== null || mealComplete} onClick={() => void performCare(LIFE_OPTIONS.find((option) => option.code === 'PROTEIN_PLATE')!)}><Utensils /><span><b>Protein Plate</b><small>$22 + 2% tax · complete daily meal</small></span></button><button disabled={pendingAction !== null} aria-label="Buy Skyline Dinner" onClick={() => void spend(42, 'Skyline Dinner', 6)}><span><b>Skyline Dinner Collectible</b><small>$42 + 2% tax · cosmetic memory</small></span></button></div></>}
          {place === 'property' && <><small>SKYLINE REALTY</small><h1>Turn returns into a skyline</h1><p>Your 10 m² Starter Arcology studio has {leaseDays} days left. Every better address makes progress visible.</p><div className="property"><Home /><div><b>Cloudline Penthouse</b><span>$2,500,000 · Requires City Rank 100</span></div><i>LOCKED</i></div><div className="property"><Car /><div><b>Ion GT</b><span>$180,000 · Includes island access</span></div><i>LOCKED</i></div></>}
          {place === 'career' && <><small>ACTIVE WORK · VIRTUAL WAGES</small><h1>Earn enough to keep moving.</h1><p>Work pays immediately when you complete a short prototype task. It can fund food and transit after a bad trading day, but it cannot build a fortune: one shift per game day, two shifts and $40 maximum per real UTC day.</p><div className="work-ledger"><span><b>{shiftsToday} / 2</b>shifts today</span><span><b>${wagesToday.toFixed(2)} / $40</b>today&apos;s wages</span><span><b>${lifetimeWages.toFixed(2)}</b>lifetime wages</span><span><b>{lastWorkTurn === day ? 'COMPLETE' : 'OPEN'}</b>game-day shift</span></div><div className="interview"><BriefcaseBusiness /><div><b>{career === 'UNEMPLOYED' ? 'Market assistant interview' : career}</b><span>Unlock the Market Brief Review role-play shift in the CBD.</span></div>{career === 'UNEMPLOYED' ? <button disabled={pendingAction !== null} onClick={() => void acceptJob()}>{pendingAction === 'hire' ? 'INTERVIEWING…' : atCbd ? 'INTERVIEW' : 'TRAVEL TO INTERVIEW'}</button> : <i>HIRED</i>}</div><div className="job-grid">{JOB_OPTIONS.map((job) => { const travel = job.district === 'CBD' && !atCbd; const locked = Boolean(job.requiresCareer && career === 'UNEMPLOYED'); const complete = lastWorkTurn === day || shiftsToday >= 2 || wagesToday >= 40; return <article key={job.code}><BriefcaseBusiness /><small>{job.district === 'CBD' ? 'CYBER CBD' : 'ANYWHERE'} · PROTOTYPE TASK</small><h2>{job.name}</h2><p>{job.description}</p><div><span>{job.durationMinutes} game min</span><b>${Math.min(job.pay, Math.max(0, 40 - wagesToday))} virtual pay</b></div><button disabled={pendingAction !== null || locked || complete} onClick={() => void completeShift(job)}>{locked ? 'INTERVIEW REQUIRED' : complete ? 'SHIFT LIMIT REACHED' : pendingAction === `work:${job.code}` ? 'WORKING…' : travel ? 'TRAVEL TO CBD' : 'COMPLETE DEMO SHIFT'}</button></article>; })}</div><p className="truth-note">Prototype shifts currently resolve through a server-validated one-click action; skill challenges and timed tasks are planned.</p></>}
        </dialog>}
      </section>
      <footer><span>NET WORTH <b>${netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b></span><span>TOTAL PROGRESS <b className={netWorth >= 10000 ? 'gain' : 'loss'}>{netWorth >= 10000 ? '+' : ''}${(netWorth - 10000).toFixed(2)}</b></span><span>TRADING FEE <b>{tradingFeeBps} BPS</b></span><span>LOCATION <b>{activeScene === 'STARTER_ARCOLOGY' ? `BLOCK ${residenceBlock}` : SCENE_LABELS[activeScene]}</b></span><span>TRANSIT SPEND <b>${transitSpend.toFixed(2)}</b></span><span>CITY TAX <b>${tax.toFixed(2)}</b></span><span>WORLD <b>20 × 30 KM</b></span><span>STUDIO <b>10 m² · {leaseDays} DAYS</b></span></footer>
    </main>
  );
}
