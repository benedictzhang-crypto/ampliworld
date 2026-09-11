'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  Clone,
  Environment,
  Html,
  useAnimations,
  useGLTF,
  useTexture,
} from '@react-three/drei';
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
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import {
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import * as THREE from 'three';
import {
  DynamicAtmosphere,
  formatWorldTime,
  getDayPhase,
  getWorldMinutesAtCycleTime,
} from './dynamic-atmosphere';
import { MetropolitanExpansion } from './metropolitan-expansion';
import {
  CONTINUOUS_WORLD_BOUNDS,
  ContinuousWorldBase,
  LEGACY_DISTRICT_WORLD_ORIGINS,
  SectorLodMassing,
  canStepBetweenContinuousWorldPoints,
  canTraverseContinuousWorld,
  getContinuousWorldMetroArrival,
  getContinuousWorldMetroEntrancePosition,
  getContinuousWorldSectorAt,
  getNearestContinuousWorldMetro,
  getWorldSurfaceElevationXZ,
  isWorldCameraPointOccluded,
} from './continuous-world';
import {
  isStudioCameraPointOccluded,
  resolveCameraOcclusion,
} from './camera-safety';
import {
  GrandRiverSystem,
  MarinaHotelDistrict,
  MetroEntrance,
  ResidentialQuarter,
} from './urban-expansion';
import { WORLD_ASSET_COUNTS } from './world-asset-catalog';
import {
  NAMED_WORLD_SOLIDS,
  STARTER_TOWER_SPECS,
  WORLD_SITE_RESERVATIONS,
  getWorldFootprintElevationRange,
  type StarterTowerSpec,
} from './world-spatial-registry';
import {
  WORLD_NEIGHBORHOODS,
  WORLD_NEIGHBORHOOD_STATS,
  type NeighborhoodStatus,
  type ResidentialTier as CatalogResidentialTier,
  type ResidentialTypology as CatalogResidentialTypology,
} from './world-neighborhoods';
import {
  GRAND_RIVER_CORRIDOR,
  METRO_STATION_REGISTRY,
  PLAYABLE_CORE_KM,
  REPRESENTED_REGION_HEIGHT_KM,
  REPRESENTED_REGION_KM,
  metroHubById,
  type WorldSector,
  type WorldSectorId,
} from './world-topology';

type Place =
  | 'market'
  | 'fashion'
  | 'restaurant'
  | 'property'
  | 'career'
  | 'news'
  | 'map'
  | 'inventory'
  | 'menu'
  | 'villa'
  | 'studio'
  | 'wellness'
  | 'social'
  | 'hospital'
  | 'police'
  | 'academy'
  | 'dealership'
  | 'grocer'
  | 'marina'
  | 'residences'
  | null;
type EnterPlace = (place: Place, atlasId?: string) => void;
type WorldDistrict = 'STARTER_ARCOLOGY' | 'CBD';
type WorldSceneId =
  | WorldDistrict
  | 'AZURE_YACHT_MARINA'
  | 'CROWN_RESIDENTIAL_TOWERS'
  | 'MILLIONAIRE_RIDGE';
type SceneProfileId = WorldSceneId | 'CONTINUOUS_WORLD' | 'STUDIO_INTERIOR';
type PlayerLocation = { scene: SceneProfileId; x: number; z: number };
type OutdoorPlayerEntry = {
  id: number;
  spawn: [number, number, number];
  heading: number;
};
type MetroStation = {
  id: string;
  topologyId: string;
  name: string;
  x: number;
  y: number;
  nodeId: string;
  scene: WorldSceneId;
  entrance: [number, number, number];
  spawn: [number, number, number];
  heading: number;
};
type AtlasKind =
  | 'HOME'
  | 'PARK'
  | 'MARKET'
  | 'SEA'
  | 'VILLAS'
  | 'MOUNTAINS'
  | 'HOSPITAL'
  | 'POLICE'
  | 'SCHOOL'
  | 'AUTO'
  | 'MARINA'
  | 'PORT'
  | 'GROCER'
  | 'RESIDENTIAL'
  | 'DINING'
  | 'ENERGY'
  | 'CIVIC'
  | 'CASINO'
  | 'RACING';
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
  residentialTier?: CatalogResidentialTier;
  residentialTypology?: CatalogResidentialTypology;
  developmentStatus?: NeighborhoodStatus;
  households?: number;
  floors?: number;
  heightMeters?: number;
  inspiration?: string;
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
  currentStationId?: unknown;
  worldX?: unknown;
  worldZ?: unknown;
  worldHeading?: unknown;
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

const CBD_ONLY_PLACES: Place[] = [
  'market',
  'fashion',
  'restaurant',
  'property',
  'villa',
  'hospital',
  'police',
  'academy',
  'dealership',
  'grocer',
  'marina',
  'residences',
];
const CBD_ARRIVAL_PLACES: Place[] = [
  ...CBD_ONLY_PLACES,
  'career',
  'wellness',
  'social',
];
const TRANSIT = {
  METRO: { fare: 5, durationGameMinutes: 28, realDurationMs: 1700 },
  TAXI: { fare: 45, durationGameMinutes: 11, realDurationMs: 900 },
} as const;

// Begin at 08:00 so every visit opens into the full twenty-minute daylight stage.
// One complete world day is 55 real minutes: dawn 10, day 20, dusk 10, night 15.
const WORLD_CLOCK_START_OFFSET_MS = 10 * 60 * 1000;
const ATMOSPHERE_FOG_RANGES: Record<
  WorldSceneId,
  { near: number; far: number }
> = {
  STARTER_ARCOLOGY: { near: 62, far: 360 },
  CBD: { near: 72, far: 225 },
  AZURE_YACHT_MARINA: { near: 76, far: 230 },
  CROWN_RESIDENTIAL_TOWERS: { near: 72, far: 220 },
  MILLIONAIRE_RIDGE: { near: 76, far: 235 },
};

const LIFE_OPTIONS: LifeOption[] = [
  {
    code: 'DELIVERY_BOWL',
    name: 'Basic Delivery Bowl',
    price: 12,
    happiness: 2,
    nutrition: 6,
    protein: 15,
    produce: 5,
    carePoints: 0,
    category: 'MEAL',
    district: 'ANY',
    description:
      'Keeps you going, but delivery alone will not improve long-term care.',
  },
  {
    code: 'PROTEIN_PLATE',
    name: 'Protein Plate',
    price: 22,
    happiness: 5,
    nutrition: 18,
    protein: 100,
    produce: 25,
    carePoints: 3,
    category: 'MEAL',
    district: 'CBD',
    description:
      'A complete CBD meal with enough protein to materially improve recovery.',
  },
  {
    code: 'FRESH_FRUIT_BOX',
    name: 'Fresh Fruit Box',
    price: 8,
    happiness: 3,
    nutrition: 10,
    protein: 10,
    produce: 100,
    carePoints: 2,
    category: 'WELLNESS',
    district: 'ANY',
    description: 'A low-cost daily choice available at home or in the city.',
  },
  {
    code: 'PARK_WALK',
    name: 'Waterfront Park Walk',
    price: 0,
    happiness: 4,
    nutrition: 0,
    protein: 0,
    produce: 0,
    carePoints: 1,
    category: 'LEISURE',
    district: 'CBD',
    description: 'Free recovery on the CBD promenade after the market closes.',
  },
  {
    code: 'COAST_DAY_TRIP',
    name: 'Coast Day Trip',
    price: 80,
    happiness: 14,
    nutrition: 2,
    protein: 0,
    produce: 0,
    carePoints: 4,
    category: 'LEISURE',
    district: 'CBD',
    description: 'A compressed trip through coast, park and mountain overlook.',
  },
  {
    code: 'ISLAND_WEEKEND',
    name: 'Island Weekend',
    price: 320,
    happiness: 24,
    nutrition: 4,
    protein: 0,
    produce: 0,
    carePoints: 6,
    category: 'LEISURE',
    district: 'CBD',
    description: 'Premium leisure paid entirely with earned virtual dollars.',
  },
];

const JOB_OPTIONS: JobOption[] = [
  {
    code: 'REMOTE_NEWS_TAGGER',
    name: 'Remote News Tagger',
    pay: 12,
    happiness: -1,
    district: 'ANY',
    durationMinutes: 3,
    description: 'Classify world events from the home terminal.',
  },
  {
    code: 'PARK_STEWARD',
    name: 'Waterfront Park Steward',
    pay: 18,
    happiness: 2,
    district: 'CBD',
    durationMinutes: 4,
    description: 'Help visitors and keep the broad promenade relaxed.',
  },
  {
    code: 'CAFE_CLOSING_SHIFT',
    name: 'Nova Cafe Closing Shift',
    pay: 24,
    happiness: -3,
    district: 'CBD',
    durationMinutes: 5,
    description: 'A reliable shift that pays for several city visits.',
  },
  {
    code: 'MARKET_BRIEF_REVIEW',
    name: 'Market Brief Review',
    pay: 30,
    happiness: -4,
    district: 'CBD',
    durationMinutes: 6,
    description:
      'A focused research task unlocked by the Career Tower interview.',
    requiresCareer: true,
  },
];

const LANDMARK_ATLAS = [
  {
    id: 'starter',
    name: 'Starter Arcology',
    x: 2,
    y: 4,
    kind: 'HOME',
    zone: 'SOUTH RESIDENTIAL',
    detail: 'Solid registered tower blocks · your 10 m² studio portal',
    place: 'studio',
    scene: 'STARTER_ARCOLOGY',
    availability: 'PLAYABLE',
  },
  {
    id: 'academy',
    name: 'AmpliWorld Academy',
    x: 5.5,
    y: 8,
    kind: 'SCHOOL',
    zone: 'EDUCATION BELT',
    detail: 'School campus, learning commons and sports court',
    place: 'academy',
    availability: 'PLAYABLE',
  },
  {
    id: 'deepwater',
    name: 'South Deepwater Port',
    x: 1,
    y: 10,
    kind: 'PORT',
    zone: 'INDUSTRIAL COAST',
    detail: 'Cargo handling, ocean liners, tugs and port employment',
    place: 'marina',
    availability: 'PLAYABLE',
  },
  {
    id: 'hospital',
    name: 'Meridian General Hospital',
    x: 8,
    y: 11,
    kind: 'HOSPITAL',
    zone: 'PUBLIC SERVICES',
    detail: 'Emergency department, inpatient towers and healing garden',
    place: 'hospital',
    availability: 'PLAYABLE',
  },
  {
    id: 'midrise',
    name: 'Canopy Pool Residences',
    x: 11.5,
    y: 12.5,
    kind: 'RESIDENTIAL',
    zone: 'MIDTOWN',
    detail: 'Five- and six-floor studios, 1B and 2B homes around a shared pool',
    place: 'residences',
    availability: 'PLAYABLE',
  },
  {
    id: 'police',
    name: 'Civic Safety Headquarters',
    x: 16.5,
    y: 14,
    kind: 'POLICE',
    zone: 'EAST CIVIC',
    detail: 'Police services, public lobby and emergency coordination',
    place: 'police',
    availability: 'PLAYABLE',
  },
  {
    id: 'public-marina',
    name: 'Harbor Steps Marina',
    x: 2,
    y: 15,
    kind: 'MARINA',
    zone: 'PUBLIC WATERFRONT',
    detail: 'Public slips, fishing boats, speedboats and city ferries',
    place: 'marina',
    availability: 'PLAYABLE',
  },
  {
    id: 'fresh-market',
    name: 'Verdant Fresh Market',
    x: 12.5,
    y: 15,
    kind: 'GROCER',
    zone: 'CENTRAL MARKET',
    detail: 'Fruit, vegetables and everyday nutrition for the daily-care loop',
    place: 'grocer',
    availability: 'PLAYABLE',
  },
  {
    id: 'park',
    name: 'Central Park',
    x: 11,
    y: 16,
    kind: 'PARK',
    zone: 'CENTRAL GREEN AXIS',
    detail: 'Lakes, trails and free daily recovery',
    place: 'wellness',
    availability: 'PLAYABLE',
  },
  {
    id: 'dining-campus',
    name: 'Nova Dining Campus',
    x: 12.8,
    y: 17.1,
    kind: 'DINING',
    zone: 'CENTRAL DINING DISTRICT',
    detail:
      'Cafe pavilion, grill court, night kitchen and landscaped outdoor tables',
    place: 'restaurant',
    availability: 'PLAYABLE',
  },
  {
    id: 'cbd',
    name: 'Cyber CBD',
    x: 14,
    y: 18,
    kind: 'MARKET',
    zone: 'CITY CORE',
    detail: 'Exchange, work, dining, social plaza and luxury residences',
    place: 'market',
    scene: 'CBD',
    availability: 'PLAYABLE',
  },
  {
    id: 'grid-energy',
    name: 'Grid Systems Research Campus',
    x: 18.2,
    y: 16.7,
    kind: 'ENERGY',
    zone: 'EAST UTILITY CAMPUS',
    detail:
      'Grid control, storage, clean generation research and nuclear-operations simulation',
    place: 'career',
    availability: 'PLAYABLE',
  },
  {
    id: 'crown-residences',
    name: 'Crown Residential Towers',
    x: 15,
    y: 20.5,
    kind: 'RESIDENTIAL',
    zone: 'CITY CORE',
    detail:
      'Distinctive sci-fi towers with one luxury full-floor home per level',
    place: 'residences',
    scene: 'CROWN_RESIDENTIAL_TOWERS',
    availability: 'PLAYABLE',
  },
  {
    id: 'auto-4s',
    name: 'Apex Motors Flagship 4S',
    x: 14.8,
    y: 6.6,
    kind: 'AUTO',
    zone: 'EAST MOBILITY DISTRICT',
    detail:
      'Large showroom, service hall, customer parking, charging and test loop',
    place: 'dealership',
    availability: 'PLAYABLE',
  },
  {
    id: 'yacht-marina',
    name: 'Azure Yacht Marina',
    x: 2.8,
    y: 21,
    kind: 'MARINA',
    zone: 'NORTH WATERFRONT',
    detail: 'Sailing boats, private yachts and large passenger vessels',
    place: 'marina',
    scene: 'AZURE_YACHT_MARINA',
    availability: 'PLAYABLE',
  },
  {
    id: 'ridge',
    name: 'Millionaire Ridge',
    x: 16.5,
    y: 24.5,
    kind: 'VILLAS',
    zone: 'NORTHEAST RIDGE',
    detail:
      'Visit seven detached-home styles; ownership remains net-worth gated',
    place: 'villa',
    scene: 'MILLIONAIRE_RIDGE',
    availability: 'PLAYABLE',
  },
  {
    id: 'nuclear-district',
    name: 'North Highlands Power District',
    x: 7.2,
    y: 27.3,
    kind: 'ENERGY',
    zone: 'NORTH HIGHLANDS',
    detail:
      'Off-core generation campus, nuclear plant, reservoirs and regional transmission grid',
    availability: 'PLANNED',
  },
  {
    id: 'highlands',
    name: 'North Highlands',
    x: 9.5,
    y: 28.5,
    kind: 'MOUNTAINS',
    zone: 'NORTH HIGHLANDS',
    detail: 'Mountain trails, overlooks and research stations',
    availability: 'PLANNED',
  },
  {
    id: 'cyber-sanctuary',
    name: 'Aurelian Cyber Sanctuary',
    x: 11.6,
    y: 24,
    kind: 'CIVIC',
    zone: 'NORTH CIVIC RIDGE',
    detail: 'Concrete grey, white and gold sanctuary precinct',
    place: 'social',
    availability: 'PLAYABLE',
  },
  {
    id: 'summit-estates',
    name: 'Victoria–Bel Air Summit Estates',
    x: 16,
    y: 16.4,
    kind: 'VILLAS',
    zone: 'EASTERN SUMMIT',
    detail: 'Individually designed Hong Kong and Los Angeles hillside homes',
    place: 'villa',
    availability: 'PLAYABLE',
  },
  {
    id: 'ocean-crown',
    name: 'Ocean Crown Offshore City',
    x: 2.2,
    y: 5.6,
    kind: 'CASINO',
    zone: 'WESTERN SEA',
    detail: 'Offshore casino, hotel and marine theatre reached by Line M7',
    place: 'social',
    availability: 'PLAYABLE',
  },
  {
    id: 'ampli-grand-prix',
    name: 'Ampli Grand Prix Circuit',
    x: 18.2,
    y: 6.4,
    kind: 'RACING',
    zone: 'EAST MOBILITY PARK',
    detail: 'Purpose-designed circuit, pit complex and main grandstand',
    place: 'dealership',
    availability: 'PLAYABLE',
  },
] as const satisfies readonly AtlasNode[];

const NEIGHBORHOOD_ATLAS: readonly AtlasNode[] = WORLD_NEIGHBORHOODS.map(
  (neighborhood) => ({
    id: neighborhood.id,
    name: neighborhood.name,
    x: neighborhood.coordinates[0],
    y: neighborhood.coordinates[1],
    kind: 'RESIDENTIAL',
    zone: neighborhood.district.replaceAll('_', ' '),
    detail: neighborhood.shortDescription,
    place: 'residences',
    availability: neighborhood.status === 'PLANNED' ? 'PLANNED' : 'ACTIVITY',
    residentialTier: neighborhood.tier,
    residentialTypology: neighborhood.typology,
    developmentStatus: neighborhood.status,
    households: neighborhood.households,
    floors: neighborhood.floors,
    heightMeters: neighborhood.heightMeters,
    inspiration: neighborhood.inspiration,
  }),
);

const WORLD_ATLAS: readonly AtlasNode[] = [
  ...LANDMARK_ATLAS,
  ...NEIGHBORHOOD_ATLAS,
];

const METRO_NODE_BY_SECTOR: Record<WorldSectorId, string> = {
  STARTER_OUTER_RING: 'starter',
  CBD_CORE: 'cbd',
  GRAND_RIVER: 'park',
  NORTH_RIVER: 'N-RIV-03',
  SOUTH_RIVER: 'N-RIV-03',
  WATERFRONT_MARINA: 'yacht-marina',
  AZURE_RESORT_BELT: 'N-AZU-01',
  WEST_HARBOR: 'public-marina',
  CROWN_RESIDENTIAL: 'crown-residences',
  MIDSLOPE_VILLAS: 'ridge',
  EAST_GARDEN_CENTRES: 'N-EAS-01',
  CIVIC_MEDICAL: 'hospital',
  ENERGY_RESEARCH: 'grid-energy',
  NORTH_HIGHLANDS: 'highlands',
  FOOD_RETAIL: 'fresh-market',
  SUMMIT_ESTATES: 'summit-estates',
  OFFSHORE_CITY: 'ocean-crown',
  MOTORSPORT_PARK: 'ampli-grand-prix',
};

const sceneForSector = (sector: WorldSectorId): WorldSceneId => {
  if (sector === 'STARTER_OUTER_RING') return 'STARTER_ARCOLOGY';
  if (
    sector === 'WATERFRONT_MARINA' ||
    sector === 'AZURE_RESORT_BELT' ||
    sector === 'WEST_HARBOR'
  )
    return 'AZURE_YACHT_MARINA';
  if (sector === 'CROWN_RESIDENTIAL') return 'CROWN_RESIDENTIAL_TOWERS';
  if (sector === 'MIDSLOPE_VILLAS') return 'MILLIONAIRE_RIDGE';
  return 'CBD';
};

const LEGACY_SCENE_BY_SECTOR: Partial<Record<WorldSectorId, WorldSceneId>> = {
  STARTER_OUTER_RING: 'STARTER_ARCOLOGY',
  CBD_CORE: 'CBD',
  WATERFRONT_MARINA: 'AZURE_YACHT_MARINA',
  CROWN_RESIDENTIAL: 'CROWN_RESIDENTIAL_TOWERS',
  MIDSLOPE_VILLAS: 'MILLIONAIRE_RIDGE',
};

const worldToAtlasX = (x: number) =>
  ((x - CONTINUOUS_WORLD_BOUNDS.minX) /
    (CONTINUOUS_WORLD_BOUNDS.maxX - CONTINUOUS_WORLD_BOUNDS.minX)) *
  20;
const worldToAtlasY = (z: number) =>
  ((z - CONTINUOUS_WORLD_BOUNDS.minZ) /
    (CONTINUOUS_WORLD_BOUNDS.maxZ - CONTINUOUS_WORLD_BOUNDS.minZ)) *
  30;

const METRO_STATIONS: readonly MetroStation[] = METRO_STATION_REGISTRY.map(
  (registeredStation) => {
    const hub = metroHubById(registeredStation.topologyId);
    if (!hub)
      throw new Error(
        `Stable metro station ${registeredStation.id} references missing hub ${registeredStation.topologyId}`,
      );
    const arrival = getContinuousWorldMetroArrival(hub.id);
    if (!arrival)
      throw new Error(`Missing continuous-world arrival for ${hub.id}`);
    const entrance = getContinuousWorldMetroEntrancePosition(arrival);
    return {
      id: registeredStation.id,
      topologyId: hub.id,
      name: hub.name,
      x: worldToAtlasX(arrival.position[0]),
      y: worldToAtlasY(arrival.position[2]),
      nodeId: METRO_NODE_BY_SECTOR[hub.sector],
      scene: sceneForSector(hub.sector),
      entrance: [...entrance],
      spawn: [...arrival.position],
      heading: arrival.heading,
    };
  },
);

const INITIAL_OUTDOOR_ENTRY: OutdoorPlayerEntry = {
  id: 0,
  spawn: [...METRO_STATIONS[0].spawn],
  heading: METRO_STATIONS[0].heading,
};

const RESIDENTIAL_TIER_LABELS: Record<CatalogResidentialTier, string> = {
  VALUE: 'VALUE',
  MID_MARKET: 'MID-MARKET',
  MOVE_UP: 'IMPROVEMENT',
  PREMIUM: 'PREMIUM',
  TROPHY: 'TROPHY',
};

const sceneDistrict = (scene: WorldSceneId): WorldDistrict =>
  scene === 'STARTER_ARCOLOGY' ? 'STARTER_ARCOLOGY' : 'CBD';

const INITIAL_STOCKS: Stock[] = [
  {
    symbol: 'NVDA',
    name: 'Nvidia',
    price: 184.26,
    open: 179.17,
    volatility: 0.006,
    signal: 'AI infrastructure demand rising',
    sector: 'Technology',
  },
  {
    symbol: 'AAPL',
    name: 'Apple',
    price: 238.41,
    open: 235.77,
    volatility: 0.0035,
    signal: 'Device demand improving',
    sector: 'Consumer technology',
  },
  {
    symbol: 'LVMUY',
    name: 'LVMH',
    price: 134.08,
    open: 133.07,
    volatility: 0.0045,
    signal: 'Luxury traffic rising',
    sector: 'Luxury',
  },
  {
    symbol: 'UUP',
    name: 'Dollar Index ETF',
    price: 27.16,
    open: 27.26,
    volatility: 0.0018,
    signal: 'Dollar pressure increasing',
    sector: 'Currency',
  },
  {
    symbol: 'JETS',
    name: 'Airline ETF',
    price: 24.63,
    open: 24.28,
    volatility: 0.005,
    signal: 'Travel bookings expanding',
    sector: 'Travel',
  },
  {
    symbol: 'ITA',
    name: 'Aerospace ETF',
    price: 203.52,
    open: 205.11,
    volatility: 0.004,
    signal: 'Ceasefire risk repricing',
    sector: 'Defense',
  },
];

const WORLD_EVENTS: WorldEvent[] = [
  {
    id: 'ai-capex-wave',
    domain: 'TECHNOLOGY',
    headline: 'Global AI infrastructure orders accelerate',
    impacts: [
      'Semiconductor demand rises',
      'Consumer technology sentiment improves',
    ],
    marketImpacts: { NVDA: 0.027, AAPL: 0.006, UUP: -0.001 },
  },
  {
    id: 'ceasefire-talks',
    domain: 'GEOPOLITICS',
    headline: 'Ceasefire talks reduce immediate shipping risk',
    impacts: ['Air travel risk falls', 'Defense premium contracts'],
    marketImpacts: { JETS: 0.022, ITA: -0.019, UUP: -0.002 },
  },
  {
    id: 'luxury-traffic',
    domain: 'CONSUMER',
    headline: 'Luxury bookings and restaurant traffic rise',
    impacts: ['Premium consumption strengthens', 'Travel demand gains'],
    marketImpacts: { LVMUY: 0.024, JETS: 0.008, AAPL: 0.004 },
  },
  {
    id: 'rate-repricing',
    domain: 'MONETARY POLICY',
    headline: 'Rate expectations shift higher after inflation surprise',
    impacts: ['Dollar demand rises', 'Long-duration technology reprices'],
    marketImpacts: { UUP: 0.012, NVDA: -0.018, AAPL: -0.009 },
  },
  {
    id: 'shipping-disruption',
    domain: 'WAR & ENERGY',
    headline: 'Shipping disruption raises fuel and security costs',
    impacts: ['Airline margins compress', 'Defense demand increases'],
    marketImpacts: { JETS: -0.055, ITA: 0.023, UUP: 0.004 },
  },
  {
    id: 'travel-season',
    domain: 'TRAVEL',
    headline: 'International bookings exceed seasonal expectations',
    impacts: [
      'Airline utilization rises',
      'Luxury destination spending improves',
    ],
    marketImpacts: { JETS: 0.029, LVMUY: 0.008 },
  },
  {
    id: 'device-delay',
    domain: 'SUPPLY CHAIN',
    headline: 'Electronic component delays hit premium device production',
    impacts: ['Device shipments fall', 'Chip order timing becomes uncertain'],
    marketImpacts: { AAPL: -0.023, NVDA: -0.011, UUP: 0.002 },
  },
  {
    id: 'risk-off-session',
    domain: 'GLOBAL ECONOMY',
    headline: 'Growth concerns trigger a broad risk-off session',
    impacts: ['Equity risk appetite falls', 'Defensive dollar demand rises'],
    marketImpacts: {
      NVDA: -0.065,
      AAPL: -0.035,
      LVMUY: -0.05,
      JETS: -0.045,
      ITA: -0.006,
      UUP: 0.011,
    },
  },
];

const CBD_PLAYER_BLOCKERS = [
  [-27, -28, 4.6, 4.6],
  [28, -30, 5.8, 5.5],
  [-31, -42, 5.2, 4.8],
  [0, -35, 8, 8],
  [-18, -12, 3.2, 3.2],
  [18, -12, 3.2, 3.2],
  [-18, 0, 3.2, 3.2],
  [18, 0, 3.2, 3.2],
  [27, -14, 6.2, 5.2],
  [27, 3, 5.3, 4.4],
  [-25, 16, 8.3, 7.2],
  [-25, -3, 5.4, 4.5],
  [-26, 29, 11.5, 7.2],
  [0, 13, 3.4, 3.4],
  [45.5, 5, 6.9, 6.1],
  [-47, 1, 11, 45],
  [-33, -58, 0.8, 5.2],
  [63, 55, 0.8, 5.2],
  [-5, -69, 0.8, 0.8],
  [5, -69, 0.8, 0.8],
  [-7.4, -31, 1.2, 0.9],
  [7.4, -31, 1.2, 0.9],
  [-7.4, -20.56, 1.2, 0.9],
  [7.4, -20.56, 1.2, 0.9],
  [-7.4, -10.11, 1.2, 0.9],
  [7.4, -10.11, 1.2, 0.9],
  [-7.4, 0.33, 1.2, 0.9],
  [7.4, 0.33, 1.2, 0.9],
  [-7.4, 10.78, 1.2, 0.9],
  [7.4, 10.78, 1.2, 0.9],
  [-7.4, 21.22, 1.2, 0.9],
  [7.4, 21.22, 1.2, 0.9],
  [-7.4, 31.67, 1.2, 0.9],
  [7.4, 31.67, 1.2, 0.9],
  [-7.4, 42.11, 1.2, 0.9],
  [7.4, 42.11, 1.2, 0.9],
  [-7.4, 52.56, 1.2, 0.9],
  [7.4, 52.56, 1.2, 0.9],
  [-7.4, 63, 1.2, 0.9],
  [7.4, 63, 1.2, 0.9],
  [-20.7, 7, 1.15, 13],
  [20.7, 7, 1.15, 13],
  // Grand River waterline. Gaps align with the five modeled crossings at
  // x ≈ -58.5, -29.25, 0, 29.25 and 58.5, so water is never a shortcut.
  [-69.75, 38, 7.25, 8.5],
  [-44, 38, 10.5, 8.5],
  [-21, 38, 4.5, 8.5],
  [21, 38, 4.5, 8.5],
  [44, 38, 10.5, 8.5],
  [69.75, 38, 7.25, 8.5],
  // Residential superblocks are facade-and-landscape shells in this pass.
  // Broad collision keeps the player on their public perimeter streets.
  [-48, 58, 11, 10],
  [54, 68, 11, 9],
  [60, 7, 10, 9],
  [-53, -59, 11, 10],
  [51, -59, 10, 9],
] as const;

const STARTER_PLAYER_BLOCKERS = [] as const;

const STUDIO_PLAYER_BLOCKERS = [
  [-2.6, -0.8, 1.05, 2.1],
  [2.55, -1.4, 0.8, 1.2],
  [2.5, 2.2, 0.85, 0.85],
] as const;

const MARINA_PLAYER_BLOCKERS = [
  [23, -15, 3.8, 3.2],
  [25, 14, 4.2, 5.1],
  [-10, 0, 10.4, 48],
  [11.2, 15.5, 3.5, 3.6],
  [11.2, 6.8, 3.5, 3.6],
  [11.2, -1.9, 3.5, 3.6],
  [20.5, 13, 3.6, 3.7],
  [20.5, 4.3, 3.6, 3.7],
  [20.5, -4.3, 3.6, 3.7],
] as const;

const CROWN_PLAYER_BLOCKERS = [
  [-15, -10, 4.8, 4.8],
  [0, -15, 4.8, 4.8],
  [15, -10, 4.8, 4.8],
  [0, 7, 5.4, 5.4],
  [-7.65, -10, 1.2, 0.9],
  [7.65, -10, 1.2, 0.9],
  [-7.65, 2, 1.2, 0.9],
  [7.65, 2, 1.2, 0.9],
  [-7.65, 14, 1.2, 0.9],
  [7.65, 14, 1.2, 0.9],
  [-7.65, 26, 1.2, 0.9],
  [7.65, 26, 1.2, 0.9],
] as const;

const RIDGE_PLAYER_BLOCKERS = [
  [-15, 18, 4.4, 4.7],
  [15, 18, 4.4, 4.7],
  [-15, 2, 4.4, 4.7],
  [15, 2, 4.4, 4.7],
  [-15, -14, 4.4, 4.7],
  [15, -14, 4.4, 4.7],
  [0, -31, 5.2, 5.2],
  [-9.5, -14, 0.25, 6.2],
  [9.5, -14, 0.25, 6.2],
  [-9.5, 2, 0.25, 6.2],
  [9.5, 2, 0.25, 6.2],
  [-9.5, 18, 0.25, 6.2],
  [9.5, 18, 0.25, 6.2],
  [0, -34.8, 9, 1.1],
  [-30, 18, 5, 7.5],
  [30, 18, 5, 7.5],
] as const;

const ARCOLOGY_FLOORS = 50;

const SCENE_PROFILES: Record<
  SceneProfileId,
  {
    spawn: [number, number, number];
    bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
    cameraOffset: [number, number, number];
    heading: number;
    speed: number;
    blockers: readonly (readonly [number, number, number, number])[];
  }
> = {
  STARTER_ARCOLOGY: {
    spawn: [0, 0, 9],
    bounds: { minX: -26, maxX: 26, minZ: -25, maxZ: 26 },
    cameraOffset: [0, 3.2, 5.6],
    heading: Math.PI,
    speed: 5.2,
    blockers: STARTER_PLAYER_BLOCKERS,
  },
  CBD: {
    spawn: [0, 0, 62],
    bounds: { minX: -77, maxX: 77, minZ: -77, maxZ: 77 },
    cameraOffset: [0, 3.2, 5.6],
    heading: Math.PI,
    speed: 5.8,
    blockers: CBD_PLAYER_BLOCKERS,
  },
  AZURE_YACHT_MARINA: {
    spawn: [3, 0, 22],
    bounds: { minX: -9, maxX: 34, minZ: -34, maxZ: 34 },
    cameraOffset: [-1.8, 3.2, 5.6],
    heading: Math.PI,
    speed: 5.4,
    blockers: MARINA_PLAYER_BLOCKERS,
  },
  CROWN_RESIDENTIAL_TOWERS: {
    spawn: [0, 0, 27],
    bounds: { minX: -28, maxX: 28, minZ: -22, maxZ: 30 },
    cameraOffset: [0, 3.2, 5.6],
    heading: Math.PI,
    speed: 5.2,
    blockers: CROWN_PLAYER_BLOCKERS,
  },
  MILLIONAIRE_RIDGE: {
    spawn: [0, 0, 34],
    bounds: { minX: -38, maxX: 38, minZ: -39, maxZ: 37 },
    cameraOffset: [0, 3.2, 5.6],
    heading: Math.PI,
    speed: 5.2,
    blockers: RIDGE_PLAYER_BLOCKERS,
  },
  CONTINUOUS_WORLD: {
    spawn: [0, 0.12, 71],
    bounds: CONTINUOUS_WORLD_BOUNDS,
    cameraOffset: [0, 3.2, 5.6],
    heading: Math.PI,
    speed: 5.8,
    blockers: [],
  },
  STUDIO_INTERIOR: {
    spawn: [0, 0, 2.8],
    bounds: { minX: -3.8, maxX: 3.8, minZ: -3.7, maxZ: 4 },
    cameraOffset: [0, 2.65, 4.4],
    heading: Math.PI,
    speed: 3.8,
    blockers: STUDIO_PLAYER_BLOCKERS,
  },
};

function readableString(value: unknown, fallback = ''): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : fallback;
}

function readableNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeHoldings(value: unknown): Holding[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const symbol = readableString(record.symbol);
    const quantity = readableNumber(record.quantity);
    const avgPrice = readableNumber(
      record.avgPrice ?? record.averagePrice ?? record.avg_price,
    );
    const leverage = readableNumber(record.leverage, 1);
    const marketCost = quantity * avgPrice;
    const marginPosted = readableNumber(
      record.marginPosted,
      marketCost / Math.max(1, leverage),
    );
    const borrowedAmount = readableNumber(
      record.borrowedAmount,
      Math.max(0, marketCost - marginPosted),
    );
    const liquidationPrice = readableNumber(record.liquidationPrice, 0);
    return symbol && Number.isFinite(quantity) && Number.isFinite(avgPrice)
      ? [
          {
            symbol,
            quantity,
            avgPrice,
            leverage,
            marginPosted,
            borrowedAmount,
            ...(liquidationPrice > 0 ? { liquidationPrice } : {}),
          },
        ]
      : [];
  });
}

function normalizeInventory(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === 'string') return [item];
    if (!item || typeof item !== 'object') return [];
    const record = item as Record<string, unknown>;
    const name = readableString(
      record.name ?? record.displayName ?? record.itemName ?? record.item_name,
    );
    return name ? [name] : [];
  });
}

function normalizeWorldEvent(value: unknown, fallback: WorldEvent): WorldEvent {
  const event = recordOf(value);
  if (!event) return fallback;
  const impacts = Array.isArray(event.impacts)
    ? event.impacts.map((impact) => readableString(impact)).filter(Boolean)
    : fallback.impacts;
  return {
    id: readableString(event.id, fallback.id),
    domain: readableString(event.domain, fallback.domain),
    headline: readableString(event.headline, fallback.headline),
    impacts,
  };
}

function mergeMarket(stocks: Stock[], value: unknown): Stock[] {
  if (!Array.isArray(value)) return stocks;
  const quotes = new Map(
    value.flatMap((item) => {
      const quote = recordOf(item);
      const symbol = readableString(quote?.symbol).toUpperCase();
      const price = readableNumber(quote?.price);
      const open = readableNumber(quote?.open, price);
      return symbol && price > 0 ? [[symbol, { price, open }] as const] : [];
    }),
  );
  return stocks.map((stock) => {
    const quote = quotes.get(stock.symbol);
    return quote ? { ...stock, price: quote.price, open: quote.open } : stock;
  });
}

function Building({
  position,
  size,
  color,
  glow,
  label,
  place,
  onEnter,
  assetUrl,
  assetScale = 1,
  assetRotation = [0, 0, 0],
  labelHeight,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  glow: string;
  label: string;
  place?: Place;
  onEnter?: EnterPlace;
  assetUrl?: string;
  assetScale?: number;
  assetRotation?: [number, number, number];
  labelHeight?: number;
}) {
  const resolvedLabelHeight = labelHeight ?? size[1] + 0.45;
  const facadeCoverage = THREE.MathUtils.clamp(size[1] / 12, 0.32, 0.52);
  const labelAnchor = useRef<THREE.Group>(null);
  const labelWorldPosition = useRef(new THREE.Vector3());
  const labelVisibility = useRef(false);
  const [labelVisible, setLabelVisible] = useState(false);
  useFrame(() => {
    if (!labelAnchor.current) return;
    labelAnchor.current.getWorldPosition(labelWorldPosition.current);
    const dx = labelWorldPosition.current.x - ACTIVE_PLAYER_POSITION.x;
    const dz = labelWorldPosition.current.z - ACTIVE_PLAYER_POSITION.z;
    const nextVisible = dx * dx + dz * dz < 30 * 30;
    if (nextVisible !== labelVisibility.current) {
      labelVisibility.current = nextVisible;
      setLabelVisible(nextVisible);
    }
  });
  const proceduralBody = (
    <>
      <mesh castShadow receiveShadow position={[0, size[1] / 2, 0]}>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          metalness={0.55}
          roughness={0.3}
          emissive={glow}
          emissiveIntensity={0.22}
        />
      </mesh>
      {Array.from({ length: Math.max(2, Math.floor(size[1])) }).map(
        (_, index) => (
          <mesh
            key={index}
            position={[0, size[1] - 0.55 - index * 0.78, size[2] / 2 + 0.011]}
          >
            <planeGeometry args={[size[0] * 0.72, 0.18]} />
            <meshBasicMaterial color={index % 2 ? '#39f4ba' : '#79a8ff'} />
          </mesh>
        ),
      )}
    </>
  );
  return (
    <group position={position} onClick={() => place && onEnter?.(place)}>
      {assetUrl ? (
        <Suspense fallback={proceduralBody}>
          <StaticAsset
            url={assetUrl}
            scale={assetScale}
            rotation={assetRotation}
          />
        </Suspense>
      ) : (
        proceduralBody
      )}
      <Suspense fallback={null}>
        <FourSidedFacadeShell
          size={[size[0] + 0.12, size[1] + 0.18, size[2] + 0.12]}
          position={[0, 0.04, 0]}
          accent={glow}
          verticalCoverage={facadeCoverage}
        />
      </Suspense>
      {assetUrl && (
        <pointLight
          position={[0, Math.min(resolvedLabelHeight, 3), 1]}
          intensity={0.22}
          distance={5}
          color={glow}
        />
      )}
      <group ref={labelAnchor} position={[0, resolvedLabelHeight, 0]}>
        {labelVisible && (
          <Html center distanceFactor={13} zIndexRange={[3, 0]}>
            <button
              className={place ? 'world-label enterable' : 'world-label'}
              onClick={() => place && onEnter?.(place)}
            >
              {label}
            </button>
          </Html>
        )}
      </group>
    </group>
  );
}

const SUBURBAN_ASSET_ROOT = '/assets/3d/vendor/kenney/city-kit-suburban/models';
const COMMERCIAL_ASSET_ROOT =
  '/assets/3d/vendor/kenney/city-kit-commercial/models';
const INDUSTRIAL_ASSET_ROOT =
  '/assets/3d/vendor/kenney/city-kit-industrial/models';
const ROAD_ASSET_ROOT = '/assets/3d/vendor/kenney/city-kit-roads/models';
const CAR_ASSET_ROOT = '/assets/3d/vendor/kenney/car-kit/models';
const WATERCRAFT_ASSET_ROOT = '/assets/3d/vendor/kenney/watercraft-kit/models';
const HERO_CHARACTER_ASSET_ROOT =
  '/assets/3d/vendor/quaternius/ultimate-modular-citizens/models';
const NATURE_ASSET_ROOT = '/assets/3d/vendor/kenney/nature-kit/models';

function StaticAsset({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  shadows = true,
}: {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  shadows?: boolean;
}) {
  const { scene } = useGLTF(url);
  return (
    <Clone
      object={scene}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow={shadows}
      receiveShadow={shadows}
    />
  );
}

function CharacterAsset({
  url,
  animation,
  scale = 1,
  shadows = true,
}: {
  url: string;
  animation: string;
  scale?: number;
  shadows?: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, root);
  useEffect(() => {
    const action = actions[animation];
    action?.reset().fadeIn(0.18).play();
    return () => {
      action?.fadeOut(0.16);
    };
  }, [actions, animation]);
  return (
    <group ref={root} scale={scale}>
      <Clone object={scene} castShadow={shadows} receiveShadow={shadows} />
    </group>
  );
}

function Villa({
  position,
  accent,
  rotation = 0,
}: {
  position: [number, number, number];
  accent: string;
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh receiveShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[5.3, 0.16, 5.2]} />
        <meshStandardMaterial color="#718579" roughness={0.95} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 1.15, 0]}>
        <boxGeometry args={[4.1, 2.2, 3.6]} />
        <meshStandardMaterial color="#d8ded8" roughness={0.7} />
      </mesh>
      <mesh castShadow receiveShadow position={[-0.55, 2.55, -0.2]}>
        <boxGeometry args={[2.8, 1.2, 2.7]} />
        <meshStandardMaterial color="#f0eee7" roughness={0.62} />
      </mesh>
      <mesh
        castShadow
        position={[-0.55, 3.45, -0.2]}
        rotation={[0, Math.PI / 4, 0]}
      >
        <coneGeometry args={[2.35, 1.25, 4]} />
        <meshStandardMaterial color="#27322f" roughness={0.48} />
      </mesh>
      <mesh position={[1.12, 0.78, 1.82]}>
        <boxGeometry args={[1.42, 1.38, 0.05]} />
        <meshStandardMaterial color="#202b2a" metalness={0.5} />
      </mesh>
      <mesh position={[-0.55, 0.92, 1.83]}>
        <boxGeometry args={[0.72, 1.55, 0.06]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.18}
        />
      </mesh>
      {[-1.55, 0.2].map((x) => (
        <mesh key={x} position={[x, 2.52, 1.18]}>
          <boxGeometry args={[0.72, 0.58, 0.05]} />
          <meshStandardMaterial
            color="#8ee7e4"
            emissive="#237c78"
            emissiveIntensity={0.28}
            metalness={0.3}
          />
        </mesh>
      ))}
      <mesh position={[1.4, 0.12, -1.25]}>
        <boxGeometry args={[1.75, 0.18, 1.3]} />
        <meshStandardMaterial
          color="#54b8cb"
          transparent
          opacity={0.85}
          metalness={0.1}
        />
      </mesh>
      {[-2.2, 2.2].map((x) => (
        <group key={x} position={[x, 0, -1.7]}>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.16, 0.22, 0.8, 9]} />
            <meshStandardMaterial color="#594834" />
          </mesh>
          <mesh position={[0, 1.02, 0]}>
            <sphereGeometry args={[0.65, 12, 10]} />
            <meshStandardMaterial color="#1b5f3d" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function VillaDistrict({
  netWorth,
  onEnter,
}: {
  netWorth: number;
  onEnter: EnterPlace;
}) {
  const verified = netWorth >= 1_000_000;
  const approach = () => onEnter('villa');
  return (
    <group position={[13, 0, 13]}>
      <mesh receiveShadow position={[0, 0.04, 0]}>
        <boxGeometry args={[18, 0.08, 12]} />
        <meshStandardMaterial color="#40584b" roughness={0.94} />
      </mesh>
      <mesh receiveShadow position={[0, 0.09, 1]}>
        <boxGeometry args={[3.1, 0.1, 11.8]} />
        <meshStandardMaterial color="#b8b4a6" roughness={0.9} />
      </mesh>
      <Suspense
        fallback={
          <Villa position={[-5.4, 0, -2.5]} accent="#65d8ff" rotation={0.08} />
        }
      >
        <StaticAsset
          url={`${SUBURBAN_ASSET_ROOT}/building-type-b.glb`}
          position={[-5.4, 0.1, -2.5]}
          rotation={[0, 0.08, 0]}
          scale={3.35}
        />
      </Suspense>
      <Suspense
        fallback={
          <Villa position={[4.8, 0, -2.8]} accent="#ffbd64" rotation={-0.06} />
        }
      >
        <StaticAsset
          url={`${SUBURBAN_ASSET_ROOT}/building-type-p.glb`}
          position={[4.8, 0.1, -2.8]}
          rotation={[0, -0.06, 0]}
          scale={3.55}
        />
      </Suspense>
      <Suspense
        fallback={
          <Villa
            position={[-5.1, 0, 3.3]}
            accent="#c67cff"
            rotation={Math.PI - 0.05}
          />
        }
      >
        <StaticAsset
          url={`${SUBURBAN_ASSET_ROOT}/building-type-d.glb`}
          position={[-5.1, 0.1, 3.3]}
          rotation={[0, Math.PI - 0.05, 0]}
          scale={3.45}
        />
      </Suspense>
      <Suspense
        fallback={
          <Villa
            position={[5.1, 0, 3.1]}
            accent="#42f5af"
            rotation={Math.PI + 0.06}
          />
        }
      >
        <StaticAsset
          url={`${SUBURBAN_ASSET_ROOT}/building-type-t.glb`}
          position={[5.1, 0.1, 3.1]}
          rotation={[0, Math.PI + 0.06, 0]}
          scale={3.65}
        />
      </Suspense>
      {(
        [
          [-7.8, -4.8],
          [-2.8, -4.8],
          [2.7, -4.8],
          [7.7, -4.8],
          [-7.8, 0.6],
          [7.8, 0.6],
        ] as [number, number][]
      ).map(([x, z], index) => (
        <Suspense fallback={null} key={`${x}-${z}`}>
          <StaticAsset
            url={`${SUBURBAN_ASSET_ROOT}/${index % 2 ? 'tree-small' : 'tree-large'}.glb`}
            position={[x, 0.1, z]}
            scale={2.1 + (index % 3) * 0.18}
            shadows={index < 4}
          />
        </Suspense>
      ))}
      <mesh position={[4.8, 0.16, 0.5]}>
        <boxGeometry args={[3.8, 0.16, 1.55]} />
        <meshStandardMaterial
          color="#2a98ae"
          metalness={0.15}
          roughness={0.18}
          transparent
          opacity={0.9}
        />
      </mesh>
      {[-2.1, 2.1].map((x) => (
        <mesh key={x} castShadow position={[x, 1.2, -5.7]}>
          <boxGeometry args={[0.42, 2.4, 0.42]} />
          <meshStandardMaterial color="#2b3d35" metalness={0.65} />
        </mesh>
      ))}
      <mesh position={[0, 1.1, -5.7]}>
        <boxGeometry args={[3.8, 1.05, 0.16]} />
        <meshStandardMaterial
          color={verified ? '#174c37' : '#442523'}
          metalness={0.72}
          transparent
          opacity={0.94}
        />
      </mesh>
      <Html
        position={[0, 2.4, -5.7]}
        center
        distanceFactor={13}
        zIndexRange={[3, 0]}
      >
        <button className="world-label enterable prestige" onClick={approach}>
          MILLIONAIRE RIDGE ·{' '}
          {verified ? 'PURCHASE STATUS VERIFIED' : 'VISITOR ACCESS'}
        </button>
      </Html>
    </group>
  );
}

function Citizen({ seed }: { seed: number }) {
  const npc = useRef<THREE.Group>(null);
  const lane = (seed % 5) - 2;
  const offset = ((seed * 7) % 29) - 14;
  const vertical = seed % 2 === 0;
  const heroModels = [
    'male-suit',
    'female-suit',
    'male-casual-hoodie',
    'female-casual',
  ];
  const modelUrl = `${HERO_CHARACTER_ASSET_ROOT}/${heroModels[seed % heroModels.length]}.glb`;
  useFrame(({ clock }) => {
    if (!npc.current) return;
    const travel =
      Math.sin(clock.elapsedTime * (0.22 + (seed % 4) * 0.035) + seed) * 7;
    npc.current.position.x = vertical ? lane * 1.15 : travel + offset * 0.18;
    npc.current.position.z = vertical ? travel + offset * 0.22 : lane * 2.25;
    npc.current.rotation.y = vertical
      ? Math.cos(clock.elapsedTime * 0.25 + seed) >= 0
        ? 0
        : Math.PI
      : Math.cos(clock.elapsedTime * 0.25 + seed) >= 0
        ? Math.PI / 2
        : -Math.PI / 2;
  });
  return (
    <group ref={npc} position={[0, 0, 0]} scale={0.84 + (seed % 4) * 0.035}>
      <Suspense
        fallback={
          <mesh castShadow position={[0, 0.68, 0]}>
            <capsuleGeometry args={[0.18, 0.52, 4, 8]} />
            <meshStandardMaterial color="#55d8ac" roughness={0.75} />
          </mesh>
        }
      >
        <CharacterAsset
          url={modelUrl}
          animation="Walk"
          scale={0.9}
          shadows={false}
        />
      </Suspense>
    </group>
  );
}

function PopulationLayer({
  count = 32,
  position = [0, 0, 0],
}: {
  count?: number;
  position?: [number, number, number];
}) {
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, seed) => (
        <Citizen key={seed} seed={seed} />
      ))}
    </group>
  );
}

function TowerFloorBands({
  width,
  depth,
  height,
  floors = ARCOLOGY_FLOORS,
}: {
  width: number;
  depth: number;
  height: number;
  floors?: number;
}) {
  const frontAndBack = useRef<THREE.InstancedMesh>(null);
  const sides = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const matrix = new THREE.Matrix4();
    const floorHeight = height / floors;
    for (let floor = 0; floor < floors; floor += 1) {
      const y = floorHeight * 0.52 + floor * floorHeight;
      matrix.makeTranslation(0, y, depth / 2 + 0.012);
      frontAndBack.current?.setMatrixAt(floor * 2, matrix);
      matrix.makeRotationY(Math.PI);
      matrix.setPosition(0, y, -depth / 2 - 0.012);
      frontAndBack.current?.setMatrixAt(floor * 2 + 1, matrix);
      matrix.makeRotationY(Math.PI / 2);
      matrix.setPosition(width / 2 + 0.012, y, 0);
      sides.current?.setMatrixAt(floor * 2, matrix);
      matrix.makeRotationY(-Math.PI / 2);
      matrix.setPosition(-width / 2 - 0.012, y, 0);
      sides.current?.setMatrixAt(floor * 2 + 1, matrix);
    }
    if (frontAndBack.current)
      frontAndBack.current.instanceMatrix.needsUpdate = true;
    if (sides.current) sides.current.instanceMatrix.needsUpdate = true;
  }, [depth, floors, height, width]);
  return (
    <>
      <instancedMesh
        ref={frontAndBack}
        args={[undefined, undefined, floors * 2]}
        frustumCulled
      >
        <planeGeometry args={[width * 0.86, 0.055]} />
        <meshBasicMaterial
          color="#8aa9a4"
          toneMapped={false}
          transparent
          opacity={0.5}
        />
      </instancedMesh>
      <instancedMesh
        ref={sides}
        args={[undefined, undefined, floors * 2]}
        frustumCulled
      >
        <planeGeometry args={[depth * 0.86, 0.055]} />
        <meshBasicMaterial
          color="#5f7f7b"
          toneMapped={false}
          transparent
          opacity={0.4}
        />
      </instancedMesh>
    </>
  );
}

function ArcologyTower({
  tower,
  onEnter,
  onNotice,
  residenceBlock,
}: {
  tower: StarterTowerSpec;
  onEnter: EnterPlace;
  onNotice: (message: string) => void;
  residenceBlock: string;
}) {
  const { width, depth, height, home } = tower;
  const doorDirection = tower.center[0] < 0 ? 1 : -1;
  const block = home ? `BLOCK ${residenceBlock}` : tower.id;
  const portalAnchor = useRef<THREE.Group>(null);
  const portalWorldPosition = useRef(
    new THREE.Vector3(tower.door[0], 1.3, tower.door[1]),
  );
  const portalVisibility = useRef(false);
  const [portalVisible, setPortalVisible] = useState(false);
  useFrame(() => {
    portalAnchor.current?.getWorldPosition(portalWorldPosition.current);
    const visible =
      portalWorldPosition.current.distanceToSquared(ACTIVE_PLAYER_POSITION) <
      7.5 * 7.5;
    if (visible !== portalVisibility.current) {
      portalVisibility.current = visible;
      setPortalVisible(visible);
    }
  });
  const enterTower = () => {
    if (
      portalWorldPosition.current.distanceToSquared(ACTIVE_PLAYER_POSITION) >
      2.8 * 2.8
    ) {
      onNotice(`APPROACH ${tower.id} ENTRANCE TO OPEN ITS INTERIOR PORTAL`);
      return;
    }
    if (home) {
      onEnter('studio');
      return;
    }
    onNotice(`${tower.name.toUpperCase()} · INTERIOR INSTANCE RESERVED`);
  };
  return (
    <group
      position={[tower.center[0], 0, tower.center[1]]}
      name={`${tower.id} · solid exterior shell`}
      userData={{
        buildingId: tower.id,
        collision: 'SOLID',
        portal: tower.door,
      }}
    >
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={home ? '#b6b2aa' : '#999894'}
          roughness={0.82}
          metalness={0.12}
          emissive={home ? '#544a35' : '#303b39'}
          emissiveIntensity={0.12}
        />
      </mesh>
      <TowerFloorBands
        width={width}
        depth={depth}
        height={height}
        floors={Math.max(28, Math.round(height / 1.25))}
      />
      {[-0.34, -0.11, 0.11, 0.34].map((ratio, index) => (
        <mesh
          key={`front-window-${ratio}`}
          position={[ratio * width, height * 0.51, depth / 2 + 0.018]}
        >
          <planeGeometry args={[0.32, height * 0.92]} />
          <meshBasicMaterial
            color={index % 2 ? '#d6ad7c' : home ? '#70e6bf' : '#83b7af'}
            toneMapped={false}
            transparent
            opacity={home ? 0.24 : 0.14}
          />
        </mesh>
      ))}
      {[-0.28, 0, 0.28].map((ratio, index) => (
        <mesh
          key={`side-window-${ratio}`}
          position={[width / 2 + 0.018, height * 0.51, ratio * depth]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[0.3, height * 0.92]} />
          <meshBasicMaterial
            color={index === 1 ? '#d19d73' : '#6fa69d'}
            toneMapped={false}
            transparent
            opacity={0.13}
          />
        </mesh>
      ))}
      <mesh
        receiveShadow
        position={[doorDirection * (width / 2 + 0.42), 0.22, 0]}
      >
        <boxGeometry args={[1.15, 0.44, depth + 0.8]} />
        <meshStandardMaterial color="#5e605c" roughness={0.94} />
      </mesh>
      <group
        ref={portalAnchor}
        position={[doorDirection * (width / 2 + 0.04), 0, 0]}
      >
        <mesh
          position={[0, 1.36, 0]}
          rotation={[0, doorDirection > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          onClick={(event) => {
            event.stopPropagation();
            enterTower();
          }}
        >
          <planeGeometry args={[1.65, 1.95]} />
          <meshStandardMaterial
            color="#0c1111"
            metalness={0.72}
            roughness={0.3}
            emissive={home ? '#42f5af' : '#6b7f79'}
            emissiveIntensity={home ? 0.42 : 0.1}
          />
        </mesh>
      </group>
      <mesh castShadow position={[0, height + 0.5, 0]}>
        <boxGeometry args={[1.3, 1, 1.3]} />
        <meshStandardMaterial color="#262f2c" roughness={0.68} />
      </mesh>
      {portalVisible && (
        <Html
          position={[doorDirection * (width / 2 + 0.75), home ? 4.7 : 3.5, 0]}
          center
          distanceFactor={13}
          zIndexRange={[3, 0]}
        >
          {home ? (
            <button
              className="world-label enterable residence-label"
              onClick={(event) => {
                event.stopPropagation();
                enterTower();
              }}
            >{`YOUR 10 m² STUDIO · ${block}`}</button>
          ) : (
            <button
              className="world-label enterable arcology-label"
              onClick={(event) => {
                event.stopPropagation();
                enterTower();
              }}
            >{`${block} · SEPARATE INTERIOR`}</button>
          )}
        </Html>
      )}
    </group>
  );
}

function ArcologyTowerField() {
  return (
    <group name="Starter Arcology registered public realm">
      {[74, 82.4].map((z) => (
        <group key={z}>
          <mesh receiveShadow position={[0, 0.065, z]}>
            <boxGeometry args={[58, 0.13, 2.7]} />
            <meshStandardMaterial color="#555b5a" roughness={0.94} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              receiveShadow
              position={[0, 0.13, z + side * 2.05]}
            >
              <boxGeometry args={[58, 0.15, 1.2]} />
              <meshStandardMaterial color="#b8b4a8" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      {[-27.5, -7.6, 7.6, 27.5].map((x) => (
        <mesh key={x} receiveShadow position={[x, 0.09, 78]}>
          <boxGeometry args={[1.4, 0.16, 24]} />
          <meshStandardMaterial color="#c2bdb0" roughness={0.92} />
        </mesh>
      ))}
      {[-27.5, 27.5].flatMap((x) =>
        [69, 75.5, 81, 87.5].map((z) => (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            <mesh position={[0, 0.72, 0]} castShadow>
              <boxGeometry args={[0.17, 1.44, 0.17]} />
              <meshStandardMaterial color="#5c4938" roughness={0.94} />
            </mesh>
            <mesh position={[0, 1.95, 0]} castShadow>
              <dodecahedronGeometry args={[0.9, 0]} />
              <meshStandardMaterial color="#45634b" roughness={0.88} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

function StarterArcology({
  onEnter,
  onNotice,
  residenceBlock,
}: {
  onEnter: EnterPlace;
  onNotice: (message: string) => void;
  residenceBlock: string;
}) {
  return (
    <>
      <ArcologyTowerField />
      {STARTER_TOWER_SPECS.map((tower) => (
        <ArcologyTower
          key={tower.id}
          tower={tower}
          onEnter={onEnter}
          onNotice={onNotice}
          residenceBlock={residenceBlock}
        />
      ))}
      <ArrivalSpine
        tone="STARTER"
        position={[0, 0, 78]}
        length={25}
        width={12.4}
      />
      {[-3.2, 0, 3.2].map((x) => (
        <mesh key={x} position={[x, 0.14, 78]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.07, 24]} />
          <meshBasicMaterial color="#d6c476" transparent opacity={0.56} />
        </mesh>
      ))}
      <group position={[0, 0, 66.1]}>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[20, 0.3, 0.22]} />
          <meshStandardMaterial color="#414a45" metalness={0.56} />
        </mesh>
        {[-9.5, -6.3, -3.1, 0, 3.1, 6.3, 9.5].map((x) => (
          <mesh key={x} position={[x, 1.15, 0]}>
            <boxGeometry args={[0.12, 2.2, 0.12]} />
            <meshStandardMaterial color="#343e39" />
          </mesh>
        ))}
      </group>
      <Html
        position={[0, 10.8, 65.2]}
        center
        distanceFactor={17}
        zIndexRange={[3, 0]}
      >
        <span className="zone-label arcology-scale">
          STARTER ARCOLOGY · SOLID EXTERIORS · PORTAL-BASED INTERIORS
        </span>
      </Html>
    </>
  );
}

const ACTIVE_PLAYER_POSITION = new THREE.Vector3(9999, 0, 9999);
const ACTIVE_TRAFFIC_POSITIONS = Array.from(
  { length: 4 },
  () => new THREE.Vector3(9999, 0, 9999),
);
const CAMERA_LOOK_DISTANCE = 7.4;
const DEFAULT_CAMERA_PITCH = -0.06;
const MIN_CAMERA_PITCH = -0.44;
const MAX_CAMERA_PITCH = 0.7;
const INPUT_FORWARD = 1;
const INPUT_LEFT = 2;
const INPUT_BACKWARD = 4;
const INPUT_RIGHT = 8;

const inputBitForKey = (key: string) => {
  if (key === 'w') return INPUT_FORWARD;
  if (key === 'a') return INPUT_LEFT;
  if (key === 's') return INPUT_BACKWARD;
  if (key === 'd') return INPUT_RIGHT;
  return 0;
};

function clampPlayerPosition(
  position: THREE.Vector3,
  bounds: (typeof SCENE_PROFILES)[SceneProfileId]['bounds'],
) {
  position.x = THREE.MathUtils.clamp(position.x, bounds.minX, bounds.maxX);
  position.z = THREE.MathUtils.clamp(position.z, bounds.minZ, bounds.maxZ);
  return position;
}

function isPlayerPositionBlocked(
  position: THREE.Vector3,
  scene: SceneProfileId,
  profile: (typeof SCENE_PROFILES)[SceneProfileId],
  traversalPredicate?: (position: { x: number; z: number }) => boolean,
) {
  if (traversalPredicate && !traversalPredicate(position)) return true;
  for (const [x, z, halfX, halfZ] of profile.blockers) {
    if (
      Math.abs(position.x - x) < halfX + 0.38 &&
      Math.abs(position.z - z) < halfZ + 0.38
    )
      return true;
  }
  if (scene === 'CBD') {
    for (const vehicle of ACTIVE_TRAFFIC_POSITIONS) {
      if (position.distanceToSquared(vehicle) < 4) return true;
    }
  }
  return false;
}

function Player({
  scene,
  onPositionChange,
  enabled = true,
  spawnOverride,
  headingOverride,
  teleportKey = 0,
  traversalPredicate,
  stepTraversalPredicate,
  cameraOcclusionPredicate,
}: {
  scene: SceneProfileId;
  onPositionChange?: (location: PlayerLocation) => void;
  enabled?: boolean;
  spawnOverride?: [number, number, number];
  headingOverride?: number;
  teleportKey?: number;
  traversalPredicate?: (position: { x: number; z: number }) => boolean;
  stepTraversalPredicate?: (
    from: { x: number; z: number },
    to: { x: number; z: number },
  ) => boolean;
  cameraOcclusionPredicate?: (position: {
    x: number;
    y: number;
    z: number;
  }) => boolean;
}) {
  const body = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const queuedInputMask = useRef(0);
  const facingAngle = useRef(SCENE_PROFILES[scene].heading);
  const cameraPitch = useRef(DEFAULT_CAMERA_PITCH);
  const targetCameraPitch = useRef(DEFAULT_CAMERA_PITCH);
  const cameraYawOffset = useRef(0);
  const targetCameraYawOffset = useRef(0);
  const heldLookDirection = useRef(0);
  const lastPositionReport = useRef(0);
  const lastReportedPosition = useRef(
    new THREE.Vector2(Number.NaN, Number.NaN),
  );
  const cameraTarget = useRef(new THREE.Vector3());
  const frameScratch = useRef({
    direction: new THREE.Vector3(),
    movement: new THREE.Vector3(),
    step: new THREE.Vector3(),
    start: new THREE.Vector3(),
    candidate: new THREE.Vector3(),
    xCandidate: new THREE.Vector3(),
    zCandidate: new THREE.Vector3(),
    applied: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    cameraAnchor: new THREE.Vector3(),
    desiredCamera: new THREE.Vector3(),
    safeCamera: new THREE.Vector3(),
    cameraProbe: new THREE.Vector3(),
    desiredTarget: new THREE.Vector3(),
  });
  const [movementAction, setMovementAction] = useState<'idle' | 'walk'>('idle');
  const { camera, gl } = useThree();
  const profile = SCENE_PROFILES[scene];
  const spawn = spawnOverride ?? profile.spawn;
  const heading = headingOverride ?? profile.heading;
  const onPositionChangeRef = useRef(onPositionChange);
  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);
  useEffect(() => {
    body.current?.position.set(spawn[0], spawn[1], spawn[2]);
    lastReportedPosition.current.set(spawn[0], spawn[2]);
    facingAngle.current = heading;
    cameraPitch.current = DEFAULT_CAMERA_PITCH;
    targetCameraPitch.current = DEFAULT_CAMERA_PITCH;
    cameraYawOffset.current = 0;
    targetCameraYawOffset.current = 0;
    heldLookDirection.current = 0;
    const initialForward = new THREE.Vector3(
      Math.sin(heading),
      0,
      Math.cos(heading),
    );
    const initialRight = new THREE.Vector3(
      initialForward.z,
      0,
      -initialForward.x,
    );
    const initialLookSpan = CAMERA_LOOK_DISTANCE + profile.cameraOffset[2];
    cameraTarget.current
      .set(
        spawn[0],
        spawn[1] +
          profile.cameraOffset[1] +
          Math.tan(DEFAULT_CAMERA_PITCH) * initialLookSpan,
        spawn[2],
      )
      .addScaledVector(initialForward, CAMERA_LOOK_DISTANCE);
    camera.position
      .set(spawn[0], spawn[1], spawn[2])
      .addScaledVector(initialForward, -profile.cameraOffset[2])
      .addScaledVector(initialRight, profile.cameraOffset[0])
      .add(new THREE.Vector3(0, profile.cameraOffset[1], 0));
    camera.lookAt(cameraTarget.current);
    onPositionChangeRef.current?.({ scene, x: spawn[0], z: spawn[2] });
  }, [camera, heading, profile.cameraOffset, scene, spawn, teleportKey]);
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
      const key = normalizeControlKey(event.key);
      const pressed = event.type === 'keydown';
      const isTextEntry =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable);
      if (pressed && isTextEntry) return;
      const wasPressed = Boolean(keys.current[key]);
      keys.current[key] = pressed;
      if (pressed && !wasPressed)
        queuedInputMask.current |= inputBitForKey(key);
      if (['w', 'a', 's', 'd'].includes(key)) event.preventDefault();
    };
    const virtual = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; pressed: boolean }>)
        .detail;
      const wasPressed = Boolean(keys.current[detail.key]);
      keys.current[detail.key] = detail.pressed;
      if (detail.pressed && !wasPressed)
        queuedInputMask.current |= inputBitForKey(detail.key);
    };
    const virtualLook = (event: Event) => {
      const detail = (
        event as CustomEvent<{ direction: number; pressed: boolean }>
      ).detail;
      if (detail.pressed) {
        heldLookDirection.current = detail.direction;
        targetCameraPitch.current = THREE.MathUtils.clamp(
          targetCameraPitch.current + detail.direction * 0.13,
          MIN_CAMERA_PITCH,
          MAX_CAMERA_PITCH,
        );
      } else if (heldLookDirection.current === detail.direction) {
        heldLookDirection.current = 0;
      }
    };
    const trackpadLook = (event: WheelEvent) => {
      if (!enabled) return;
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 12
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? 120
            : 1;
      const deltaX = THREE.MathUtils.clamp(event.deltaX * unit, -90, 90);
      const deltaY = THREE.MathUtils.clamp(event.deltaY * unit, -90, 90);
      if (Math.abs(deltaX) < 0.01 && Math.abs(deltaY) < 0.01) return;
      event.preventDefault();
      targetCameraYawOffset.current = THREE.MathUtils.clamp(
        targetCameraYawOffset.current - deltaX * 0.0032,
        -Math.PI,
        Math.PI,
      );
      targetCameraPitch.current = THREE.MathUtils.clamp(
        targetCameraPitch.current - deltaY * 0.0027,
        MIN_CAMERA_PITCH,
        MAX_CAMERA_PITCH,
      );
    };
    window.addEventListener('keydown', update);
    window.addEventListener('keyup', update);
    window.addEventListener('ampliworld-move', virtual);
    window.addEventListener('ampliworld-look', virtualLook);
    gl.domElement.addEventListener('wheel', trackpadLook, { passive: false });
    const release = () => {
      keys.current = {};
      queuedInputMask.current = 0;
      heldLookDirection.current = 0;
    };
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', update);
      window.removeEventListener('keyup', update);
      window.removeEventListener('ampliworld-move', virtual);
      window.removeEventListener('ampliworld-look', virtualLook);
      gl.domElement.removeEventListener('wheel', trackpadLook);
      window.removeEventListener('blur', release);
    };
  }, [enabled, gl]);
  useEffect(() => {
    if (enabled) return;
    keys.current = {};
    queuedInputMask.current = 0;
  }, [enabled]);
  useFrame(({ clock }, delta) => {
    if (!body.current) return;
    const keysDown = keys.current;
    if (!enabled) {
      for (const key in keys.current) keys.current[key] = false;
      queuedInputMask.current = 0;
      heldLookDirection.current = 0;
    }
    if (enabled && heldLookDirection.current) {
      targetCameraPitch.current = THREE.MathUtils.clamp(
        targetCameraPitch.current +
          heldLookDirection.current * Math.min(delta, 1 / 30) * 0.9,
        MIN_CAMERA_PITCH,
        MAX_CAMERA_PITCH,
      );
    }
    const pitchAlpha = 1 - Math.exp(-delta * 8);
    cameraPitch.current = THREE.MathUtils.lerp(
      cameraPitch.current,
      targetCameraPitch.current,
      pitchAlpha,
    );
    const heldForward = enabled
      ? (keysDown.w ? 1 : 0) - (keysDown.s ? 1 : 0)
      : 0;
    const heldTurn = enabled ? (keysDown.a ? 1 : 0) - (keysDown.d ? 1 : 0) : 0;
    const pendingInputMask = queuedInputMask.current;
    queuedInputMask.current = 0;
    const forwardInput =
      (enabled && (keysDown.w || pendingInputMask & INPUT_FORWARD) ? 1 : 0) -
      (enabled && (keysDown.s || pendingInputMask & INPUT_BACKWARD) ? 1 : 0);
    const turnInput =
      (enabled && (keysDown.a || pendingInputMask & INPUT_LEFT) ? 1 : 0) -
      (enabled && (keysDown.d || pendingInputMask & INPUT_RIGHT) ? 1 : 0);
    const usingTap = !heldForward && !heldTurn && pendingInputMask !== 0;
    if (forwardInput || turnInput) {
      targetCameraYawOffset.current = THREE.MathUtils.lerp(
        targetCameraYawOffset.current,
        0,
        1 - Math.exp(-delta * 4.8),
      );
    }
    cameraYawOffset.current = THREE.MathUtils.lerp(
      cameraYawOffset.current,
      targetCameraYawOffset.current,
      1 - Math.exp(-delta * 8),
    );
    if (turnInput) {
      const turnStep = usingTap ? 0.14 : Math.min(delta, 1 / 30) * 2.45;
      facingAngle.current = THREE.MathUtils.euclideanModulo(
        facingAngle.current + turnInput * turnStep,
        Math.PI * 2,
      );
      body.current.rotation.y = facingAngle.current;
    }
    const scratch = frameScratch.current;
    scratch.applied.set(0, 0, 0);
    if (forwardInput) {
      scratch.direction.set(
        Math.sin(facingAngle.current),
        0,
        Math.cos(facingAngle.current),
      );
      scratch.movement
        .copy(scratch.direction)
        .multiplyScalar(
          (usingTap ? 0.42 : Math.min(delta, 1 / 30) * profile.speed) *
            (forwardInput > 0 ? 1 : -0.68),
        );
      scratch.start.copy(body.current.position);
      const substeps = Math.max(1, Math.ceil(scratch.movement.length() / 0.18));
      scratch.step.copy(scratch.movement).divideScalar(substeps);
      for (let index = 0; index < substeps; index += 1) {
        clampPlayerPosition(
          scratch.candidate.copy(body.current.position).add(scratch.step),
          profile.bounds,
        );
        if (
          !isPlayerPositionBlocked(
            scratch.candidate,
            scene,
            profile,
            traversalPredicate,
          ) &&
          (!stepTraversalPredicate ||
            stepTraversalPredicate(body.current.position, scratch.candidate))
        ) {
          body.current.position.copy(scratch.candidate);
        } else {
          scratch.xCandidate.copy(body.current.position);
          scratch.xCandidate.x += scratch.step.x;
          clampPlayerPosition(scratch.xCandidate, profile.bounds);
          if (
            scratch.step.x &&
            !isPlayerPositionBlocked(
              scratch.xCandidate,
              scene,
              profile,
              traversalPredicate,
            ) &&
            (!stepTraversalPredicate ||
              stepTraversalPredicate(body.current.position, scratch.xCandidate))
          )
            body.current.position.copy(scratch.xCandidate);
          scratch.zCandidate.copy(body.current.position);
          scratch.zCandidate.z += scratch.step.z;
          clampPlayerPosition(scratch.zCandidate, profile.bounds);
          if (
            scratch.step.z &&
            !isPlayerPositionBlocked(
              scratch.zCandidate,
              scene,
              profile,
              traversalPredicate,
            ) &&
            (!stepTraversalPredicate ||
              stepTraversalPredicate(body.current.position, scratch.zCandidate))
          )
            body.current.position.copy(scratch.zCandidate);
        }
      }
      scratch.applied.copy(body.current.position).sub(scratch.start);
      if (scratch.applied.lengthSq() > 0.000001) {
        if (movementAction !== 'walk') setMovementAction('walk');
      } else if (movementAction !== 'idle') {
        setMovementAction('idle');
      }
      const reportedDx =
        body.current.position.x - lastReportedPosition.current.x;
      const reportedDz =
        body.current.position.z - lastReportedPosition.current.y;
      const reportedDistance =
        reportedDx * reportedDx + reportedDz * reportedDz;
      if (
        (usingTap || clock.elapsedTime - lastPositionReport.current >= 0.1) &&
        reportedDistance >= 0.0025
      ) {
        lastPositionReport.current = clock.elapsedTime;
        lastReportedPosition.current.set(
          body.current.position.x,
          body.current.position.z,
        );
        onPositionChangeRef.current?.({
          scene,
          x: Math.round(body.current.position.x * 100) / 100,
          z: Math.round(body.current.position.z * 100) / 100,
        });
      }
    } else if (movementAction !== 'idle') {
      setMovementAction('idle');
    }
    if (scene === 'CONTINUOUS_WORLD') {
      body.current.position.y = getWorldSurfaceElevationXZ(
        body.current.position.x,
        body.current.position.z,
      );
    }
    ACTIVE_PLAYER_POSITION.copy(body.current.position);
    const viewHeading = facingAngle.current + cameraYawOffset.current;
    scratch.forward.set(Math.sin(viewHeading), 0, Math.cos(viewHeading));
    scratch.right.set(scratch.forward.z, 0, -scratch.forward.x);
    scratch.desiredCamera
      .copy(body.current.position)
      .addScaledVector(scratch.forward, -profile.cameraOffset[2])
      .addScaledVector(scratch.right, profile.cameraOffset[0]);
    scratch.desiredCamera.y += profile.cameraOffset[1];
    scratch.cameraAnchor.copy(body.current.position);
    scratch.cameraAnchor.y += 1.7;
    const cameraWasOccluded = resolveCameraOcclusion(
      scratch.cameraAnchor,
      scratch.desiredCamera,
      scratch.safeCamera,
      scratch.cameraProbe,
      cameraOcclusionPredicate,
    );
    if (scene === 'CONTINUOUS_WORLD') {
      scratch.safeCamera.y = Math.max(
        scratch.safeCamera.y,
        getWorldSurfaceElevationXZ(scratch.safeCamera.x, scratch.safeCamera.z) +
          0.35,
      );
    }
    const cameraAlpha = 1 - Math.exp(-delta * 5.4);
    const targetAlpha = 1 - Math.exp(-delta * 7);
    if (cameraWasOccluded) camera.position.copy(scratch.safeCamera);
    else camera.position.lerp(scratch.safeCamera, cameraAlpha);
    const lookDistance =
      scene === 'STUDIO_INTERIOR' ? 4.2 : CAMERA_LOOK_DISTANCE;
    const lookSpan = lookDistance + profile.cameraOffset[2];
    const lookHeight =
      profile.cameraOffset[1] + Math.tan(cameraPitch.current) * lookSpan;
    scratch.desiredTarget
      .copy(body.current.position)
      .addScaledVector(scratch.forward, lookDistance);
    scratch.desiredTarget.y += lookHeight;
    cameraTarget.current.lerp(scratch.desiredTarget, targetAlpha);
    camera.lookAt(cameraTarget.current);
  });
  return (
    <group ref={body} position={spawn} rotation={[0, heading, 0]}>
      <Suspense
        fallback={
          <mesh castShadow position={[0, 0.8, 0]}>
            <capsuleGeometry args={[0.38, 0.9, 6, 12]} />
            <meshStandardMaterial
              color="#e7fff5"
              metalness={0.65}
              roughness={0.22}
              emissive="#27e8a1"
              emissiveIntensity={0.25}
            />
          </mesh>
        }
      >
        <CharacterAsset
          url={`${HERO_CHARACTER_ASSET_ROOT}/male-casual-hoodie.glb`}
          animation={movementAction === 'walk' ? 'Walk' : 'Idle'}
          scale={0.98}
        />
      </Suspense>
      <pointLight
        position={[0, 1.45, 0.22]}
        intensity={0.32}
        distance={2.8}
        color="#42f5af"
      />
    </group>
  );
}

function ParkTree({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={position} scale={scale}>
      <mesh castShadow position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.11, 0.18, 1.3, 8]} />
        <meshStandardMaterial color="#73543b" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 1.65, 0]}>
        <dodecahedronGeometry args={[0.82, 0]} />
        <meshStandardMaterial color="#3d7654" roughness={0.88} />
      </mesh>
    </group>
  );
}

type ArrivalSpineTone = 'STARTER' | 'CBD' | 'MARINA' | 'CROWN' | 'RIDGE';

const MODULAR_FACADE_TEXTURE_URL = '/visuals/ampliworld-modular-facade-v1.jpg';
const MODULAR_FACADE_TEXTURE_ASPECT = 1774 / 887;
const MODULAR_FACADE_TEXTURE_CACHE = new WeakMap<
  THREE.Texture,
  THREE.Texture
>();

function configuredFacadeTexture(sourceTexture: THREE.Texture) {
  const cachedTexture = MODULAR_FACADE_TEXTURE_CACHE.get(sourceTexture);
  if (cachedTexture) return cachedTexture;
  const texture = sourceTexture.clone();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  MODULAR_FACADE_TEXTURE_CACHE.set(sourceTexture, texture);
  return texture;
}

function createFacadeBoxGeometry(
  width: number,
  height: number,
  depth: number,
  verticalCoverage: number,
) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  geometry.translate(0, height / 2, 0);
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  const faceDimensions: [number, number][] = [
    [depth, height],
    [depth, height],
    [width, depth],
    [width, depth],
    [width, height],
    [width, height],
  ];
  faceDimensions.forEach(([faceWidth, faceHeight], faceIndex) => {
    const faceAspect = faceWidth / Math.max(0.01, faceHeight);
    let scaleV = faceIndex === 2 || faceIndex === 3 ? 1 : verticalCoverage;
    let scaleU = (faceAspect / MODULAR_FACADE_TEXTURE_ASPECT) * scaleV;
    if (scaleU > 1) {
      scaleU = 1;
      scaleV = MODULAR_FACADE_TEXTURE_ASPECT / faceAspect;
    }
    const firstVertex = faceIndex * 4;
    for (let vertex = firstVertex; vertex < firstVertex + 4; vertex += 1) {
      uv.setXY(
        vertex,
        0.5 + (uv.getX(vertex) - 0.5) * scaleU,
        0.5 + (uv.getY(vertex) - 0.5) * scaleV,
      );
    }
  });
  uv.needsUpdate = true;
  return geometry;
}

function FourSidedFacadeShell({
  size,
  position = [0, 0, 0],
  accent = '#75e7dc',
  verticalCoverage = 1,
}: {
  size: [number, number, number];
  position?: [number, number, number];
  accent?: string;
  verticalCoverage?: number;
}) {
  const [width, height, depth] = size;
  const sourceTexture = useTexture(MODULAR_FACADE_TEXTURE_URL);
  const facadeTexture = useMemo(
    () => configuredFacadeTexture(sourceTexture),
    [sourceTexture],
  );
  const geometry = useMemo(
    () =>
      createFacadeBoxGeometry(
        width,
        height,
        depth,
        THREE.MathUtils.clamp(verticalCoverage, 0.22, 1),
      ),
    [depth, height, verticalCoverage, width],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group position={position}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshPhysicalMaterial
          map={facadeTexture}
          emissiveMap={facadeTexture}
          emissive="#30241b"
          emissiveIntensity={0.11}
          color="#f5f0e6"
          metalness={0.08}
          roughness={0.39}
          clearcoat={0.28}
          clearcoatRoughness={0.3}
          envMapIntensity={0.9}
        />
      </mesh>
      <mesh castShadow receiveShadow position={[0, height + 0.09, 0]}>
        <boxGeometry args={[width + 0.18, 0.18, depth + 0.18]} />
        <meshPhysicalMaterial
          color="#e5dfd2"
          emissive={accent}
          emissiveIntensity={0.045}
          metalness={0.14}
          roughness={0.34}
          clearcoat={0.32}
        />
      </mesh>
    </group>
  );
}

function useTiledTexture(
  src: string,
  repeatX: number,
  repeatY: number,
  isColorTexture = false,
) {
  const sourceTexture = useTexture(src);
  const texture = useMemo(() => {
    const clone = sourceTexture.clone();
    clone.wrapS = THREE.RepeatWrapping;
    clone.wrapT = THREE.RepeatWrapping;
    clone.repeat.set(repeatX, repeatY);
    clone.colorSpace = isColorTexture
      ? THREE.SRGBColorSpace
      : THREE.NoColorSpace;
    clone.anisotropy = 8;
    clone.needsUpdate = true;
    return clone;
  }, [isColorTexture, repeatX, repeatY, sourceTexture]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function PavedSurfaceMaterial({
  tone,
  width,
  length,
}: {
  tone: ArrivalSpineTone;
  width: number;
  length: number;
}) {
  const isStarter = tone === 'STARTER';
  const isMarina = tone === 'MARINA';
  const textureRoot = isStarter
    ? '/assets/pbr/polyhaven/cobblestone_floor_04/cobblestone_floor_04'
    : isMarina
      ? '/assets/pbr/polyhaven/wood_floor_deck/wood_floor_deck'
      : '/assets/pbr/polyhaven/marble_tiles/marble_tiles';
  const tileSize = isStarter ? 1.55 : isMarina ? 2.4 : 2;
  const colorMap = useTiledTexture(
    `${textureRoot}_diff_1k.jpg`,
    Math.max(1, width / tileSize),
    Math.max(1, length / tileSize),
    true,
  );
  const normalMap = useTiledTexture(
    `${textureRoot}_nor_gl_1k.jpg`,
    Math.max(1, width / tileSize),
    Math.max(1, length / tileSize),
  );
  const normalStrength = isStarter ? 0.5 : isMarina ? 0.34 : 0.28;
  const normalScale = useMemo(
    () => new THREE.Vector2(normalStrength, normalStrength),
    [normalStrength],
  );
  const tint = isStarter
    ? '#8e887d'
    : isMarina
      ? '#ddc99f'
      : tone === 'CROWN'
        ? '#d4dbd5'
        : tone === 'RIDGE'
          ? '#d9d0bd'
          : '#c4ccc7';
  return (
    <meshPhysicalMaterial
      map={colorMap}
      normalMap={normalMap}
      normalScale={normalScale}
      color={tint}
      metalness={isStarter ? 0.08 : isMarina ? 0.12 : 0.28}
      roughness={isStarter ? 0.7 : isMarina ? 0.5 : 0.28}
      clearcoat={isStarter ? 0.08 : isMarina ? 0.32 : 0.72}
      clearcoatRoughness={isStarter ? 0.5 : 0.2}
      envMapIntensity={isStarter ? 0.9 : 1.25}
    />
  );
}

function DeckSurfaceMaterial({
  width,
  length,
}: {
  width: number;
  length: number;
}) {
  const colorMap = useTiledTexture(
    '/assets/pbr/polyhaven/wood_floor_deck/wood_floor_deck_diff_1k.jpg',
    Math.max(1, width / 2.4),
    Math.max(1, length / 2.4),
    true,
  );
  const normalMap = useTiledTexture(
    '/assets/pbr/polyhaven/wood_floor_deck/wood_floor_deck_nor_gl_1k.jpg',
    Math.max(1, width / 2.4),
    Math.max(1, length / 2.4),
  );
  const normalScale = useMemo(() => new THREE.Vector2(0.38, 0.38), []);
  return (
    <meshPhysicalMaterial
      map={colorMap}
      normalMap={normalMap}
      normalScale={normalScale}
      color="#d6b98a"
      metalness={0.04}
      roughness={0.58}
      clearcoat={0.22}
      clearcoatRoughness={0.42}
    />
  );
}

function StoneQuayMaterial({
  width,
  length,
}: {
  width: number;
  length: number;
}) {
  const colorMap = useTiledTexture(
    '/assets/pbr/polyhaven/marble_tiles/marble_tiles_diff_1k.jpg',
    Math.max(1, width / 2),
    Math.max(1, length / 2),
    true,
  );
  const normalMap = useTiledTexture(
    '/assets/pbr/polyhaven/marble_tiles/marble_tiles_nor_gl_1k.jpg',
    Math.max(1, width / 2),
    Math.max(1, length / 2),
  );
  const normalScale = useMemo(() => new THREE.Vector2(0.24, 0.24), []);
  return (
    <meshPhysicalMaterial
      map={colorMap}
      normalMap={normalMap}
      normalScale={normalScale}
      color="#bfc4b9"
      metalness={0.16}
      roughness={0.4}
      clearcoat={0.32}
      clearcoatRoughness={0.3}
    />
  );
}

function AnimatedWaterSurface({
  position,
  size,
  tone = 'COAST',
}: {
  position: [number, number, number];
  size: [number, number];
  tone?: 'COAST' | 'POOL';
}) {
  const normalMap = useTiledTexture(
    '/assets/pbr/three-r180/waternormals.jpg',
    Math.max(2, size[0] / 7),
    Math.max(2, size[1] / 7),
  );
  const animatedNormalMap = useRef(normalMap);
  const normalStrength = tone === 'POOL' ? 0.22 : 0.46;
  const normalScale = useMemo(
    () => new THREE.Vector2(normalStrength, normalStrength),
    [normalStrength],
  );
  useEffect(() => {
    animatedNormalMap.current = normalMap;
  }, [normalMap]);
  useFrame((_, delta) => {
    const activeNormalMap = animatedNormalMap.current;
    activeNormalMap.offset.x = (activeNormalMap.offset.x + delta * 0.008) % 1;
    activeNormalMap.offset.y = (activeNormalMap.offset.y + delta * 0.016) % 1;
  });
  return (
    <mesh
      receiveShadow
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={1}
    >
      <planeGeometry args={size} />
      <meshPhysicalMaterial
        normalMap={normalMap}
        normalScale={normalScale}
        color={tone === 'POOL' ? '#50bfd0' : '#248ca6'}
        metalness={0.08}
        roughness={tone === 'POOL' ? 0.12 : 0.2}
        clearcoat={0.78}
        clearcoatRoughness={0.14}
        envMapIntensity={1.25}
      />
    </mesh>
  );
}

function LuxuryRetailArcades() {
  const arcades = [
    {
      position: [-20.7, 0, 7] as [number, number, number],
      rotation: Math.PI / 2,
    },
    {
      position: [20.7, 0, 7] as [number, number, number],
      rotation: -Math.PI / 2,
    },
  ];
  return (
    <group>
      {arcades.map((arcade, side) => (
        <group
          key={side}
          position={arcade.position}
          rotation={[0, arcade.rotation, 0]}
        >
          <FourSidedFacadeShell size={[26, 12.9, 1.45]} accent="#77f7e3" />
          <mesh position={[0, 12.78, 0.78]}>
            <boxGeometry args={[25.8, 0.09, 0.09]} />
            <meshBasicMaterial
              color="#77f7e3"
              toneMapped={false}
              transparent
              opacity={0.86}
            />
          </mesh>
          {[-10.5, -6.3, -2.1, 2.1, 6.3, 10.5].map((x, index) => (
            <group key={x} position={[x, 13.38, 0]}>
              <mesh position={[0, 0.15, 0]}>
                <boxGeometry args={[3.25, 0.3, 1.35]} />
                <meshStandardMaterial color="#e7e0cf" roughness={0.52} />
              </mesh>
              <mesh position={[0, 0.46, 0]}>
                <boxGeometry args={[2.75, 0.38, 1.05]} />
                <meshStandardMaterial
                  color={index % 2 ? '#3f694c' : '#527c56'}
                  roughness={0.92}
                />
              </mesh>
            </group>
          ))}
          <mesh receiveShadow position={[0, 0.08, 1.2]}>
            <boxGeometry args={[27.2, 0.16, 2.4]} />
            <meshPhysicalMaterial
              color="#908a7f"
              roughness={0.24}
              clearcoat={0.62}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function ArrivalSpine({
  tone,
  position,
  length = 48,
  width = 12,
}: {
  tone: ArrivalSpineTone;
  position: [number, number, number];
  length?: number;
  width?: number;
}) {
  const isStarter = tone === 'STARTER';
  const isRidge = tone === 'RIDGE';
  const isMarina = tone === 'MARINA';
  const hasWaterRills = tone === 'CBD' || tone === 'CROWN';
  const accent = isStarter
    ? '#c6764f'
    : isRidge
      ? '#ffd391'
      : isMarina
        ? '#74ddf2'
        : '#6ff5d4';
  const treeModel = isRidge
    ? 'tree_oak.glb'
    : isMarina || tone === 'CBD' || tone === 'CROWN'
      ? 'tree_palmDetailedTall.glb'
      : null;
  const stationCount = Math.max(4, Math.floor(length / 10));
  const stations = Array.from(
    { length: stationCount },
    (_, index) =>
      -length / 2 + 4 + index * ((length - 8) / Math.max(1, stationCount - 1)),
  );
  const planterSides = isMarina ? [1] : [-1, 1];
  const pavingSeams = Array.from(
    { length: Math.floor(length / 3.2) },
    (_, index) => -length / 2 + 1.6 + index * 3.2,
  );
  return (
    <group position={position}>
      <mesh receiveShadow position={[0, 0.075, 0]}>
        <boxGeometry args={[width, 0.15, length]} />
        <PavedSurfaceMaterial tone={tone} width={width} length={length} />
      </mesh>
      {[-width / 2 + 0.3, width / 2 - 0.3].map((x) => (
        <mesh key={`edge-${x}`} position={[x, 0.18, 0]}>
          <boxGeometry args={[0.11, 0.07, length - 0.8]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      ))}
      {!isStarter &&
        pavingSeams.map((z) => (
          <mesh key={`seam-${z}`} position={[0, 0.158, z]}>
            <boxGeometry args={[width - 0.55, 0.012, 0.025]} />
            <meshBasicMaterial
              color="#21312f"
              transparent
              opacity={isRidge ? 0.28 : 0.5}
            />
          </mesh>
        ))}
      {!isStarter &&
        [-0.26, 0, 0.26].map((ratio) => (
          <mesh key={`long-seam-${ratio}`} position={[width * ratio, 0.159, 0]}>
            <boxGeometry args={[0.025, 0.013, length - 0.55]} />
            <meshBasicMaterial color="#233331" transparent opacity={0.42} />
          </mesh>
        ))}
      {hasWaterRills &&
        [-1, 1].map((side) => (
          <group
            key={`rill-${side}`}
            position={[side * width * 0.34, 0.17, -2]}
          >
            <mesh receiveShadow>
              <boxGeometry args={[0.72, 0.035, length - 8]} />
              <meshPhysicalMaterial
                color="#4ac1d1"
                metalness={0.08}
                roughness={0.06}
                transmission={0.3}
                transparent
                opacity={0.72}
                clearcoat={0.85}
              />
            </mesh>
            {[-0.28, 0.28].map((edge) => (
              <mesh key={edge} position={[edge, 0.035, 0]}>
                <boxGeometry args={[0.035, 0.04, length - 7.7]} />
                <meshBasicMaterial
                  color="#b9fff4"
                  toneMapped={false}
                  transparent
                  opacity={0.72}
                />
              </mesh>
            ))}
            {[-12, -4, 4, 12]
              .filter((z) => Math.abs(z) < (length - 10) / 2)
              .map((z) => (
                <mesh key={z} position={[0, 0.12, z]}>
                  <cylinderGeometry args={[0.055, 0.09, 0.18, 10]} />
                  <meshBasicMaterial
                    color="#d8ffff"
                    toneMapped={false}
                    transparent
                    opacity={0.88}
                  />
                </mesh>
              ))}
          </group>
        ))}
      {!isStarter &&
        stations.flatMap((z, index) =>
          planterSides.map((side) => {
            const insetPlanters = tone === 'CBD' || tone === 'CROWN';
            const inset = tone === 'CROWN' ? 1.35 : 0.9;
            const x =
              side * (insetPlanters ? width / 2 - inset : width / 2 + 1.65);
            return (
              <group key={`${side}-${z}`} position={[x, 0, z]}>
                <mesh castShadow receiveShadow position={[0, 0.34, 0]}>
                  <boxGeometry args={[2.15, 0.68, 1.35]} />
                  <meshPhysicalMaterial
                    color={isRidge ? '#d8d0bd' : '#d9ddd5'}
                    roughness={0.42}
                    clearcoat={0.25}
                  />
                </mesh>
                <mesh position={[0, 0.7, 0]}>
                  <boxGeometry args={[1.7, 0.08, 0.92]} />
                  <meshStandardMaterial
                    color={index % 2 ? '#45664b' : '#587950'}
                    roughness={0.9}
                  />
                </mesh>
                <Suspense fallback={null}>
                  {treeModel && (
                    <StaticAsset
                      url={`${NATURE_ASSET_ROOT}/${treeModel}`}
                      position={[0, 0.7, 0]}
                      scale={isRidge ? 2.35 : 2.65}
                      shadows={index < 1}
                    />
                  )}
                </Suspense>
                {[-0.55, 0, 0.55].map((offset, flower) => (
                  <mesh
                    key={offset}
                    position={[offset, 0.8, 0.15 * (flower % 2 ? 1 : -1)]}
                  >
                    <sphereGeometry args={[0.11, 8, 6]} />
                    <meshStandardMaterial
                      color={
                        flower === 1
                          ? '#f8d48c'
                          : tone === 'CBD'
                            ? '#f5a9b8'
                            : '#d9edba'
                      }
                      emissive={flower === 1 ? '#6f4518' : '#3c4936'}
                      emissiveIntensity={0.16}
                      roughness={0.82}
                    />
                  </mesh>
                ))}
                <mesh position={[-side * 1.18, 0.48, 0]}>
                  <boxGeometry args={[0.12, 0.96, 0.12]} />
                  <meshStandardMaterial
                    color="#252d2c"
                    metalness={0.7}
                    roughness={0.32}
                  />
                </mesh>
                <mesh position={[-side * 1.18, 0.98, 0]}>
                  <sphereGeometry args={[0.12, 10, 8]} />
                  <meshBasicMaterial color="#ffd7a0" toneMapped={false} />
                </mesh>
              </group>
            );
          }),
        )}
      {!isStarter &&
        [-length * 0.24, length * 0.08, length * 0.34].map((z, index) => (
          <mesh
            key={`reflection-${z}`}
            position={[index % 2 ? -1.8 : 2.1, 0.158, z]}
            rotation={[-Math.PI / 2, 0, index * 0.18]}
          >
            <planeGeometry args={[2.7, 5.6]} />
            <meshPhysicalMaterial
              color="#b9d9d5"
              metalness={0.35}
              roughness={0.08}
              transparent
              opacity={0.18}
              depthWrite={false}
            />
          </mesh>
        ))}
      {isStarter && (
        <Suspense fallback={null}>
          {[-length * 0.32, -length * 0.04, length * 0.27].map((z, index) => (
            <StaticAsset
              key={`utility-${z}`}
              url={`${ROAD_ASSET_ROOT}/${index === 1 ? 'dumpster.glb' : 'electricity-pole-single.glb'}`}
              position={[
                index % 2 ? width / 2 + 1.5 : -width / 2 - 1.4,
                0.06,
                z,
              ]}
              scale={index === 1 ? 1.2 : 1.75}
              shadows={false}
            />
          ))}
          {[-length * 0.18, length * 0.18].map((z) => (
            <StaticAsset
              key={`barrier-${z}`}
              url={`${ROAD_ASSET_ROOT}/construction-barrier.glb`}
              position={[width / 2 + 0.9, 0.08, z]}
              rotation={[0, Math.PI / 2, 0]}
              scale={1.25}
              shadows={false}
            />
          ))}
        </Suspense>
      )}
    </group>
  );
}

function WaterfrontRailing({ x, length = 68 }: { x: number; length?: number }) {
  const posts = Array.from(
    { length: Math.floor(length / 5) + 1 },
    (_, index) => -length / 2 + index * 5,
  );
  return (
    <group>
      {posts.map((z) => (
        <group key={z} position={[x, 0, z]}>
          <mesh castShadow position={[0, 0.66, 0]}>
            <cylinderGeometry args={[0.055, 0.075, 1.32, 10]} />
            <meshStandardMaterial
              color="#d4e1df"
              metalness={0.84}
              roughness={0.22}
            />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <sphereGeometry args={[0.085, 10, 8]} />
            <meshBasicMaterial color="#ffd08c" toneMapped={false} />
          </mesh>
        </group>
      ))}
      {[0.48, 1.08].map((y) => (
        <mesh key={y} position={[x, y, 0]}>
          <boxGeometry args={[0.065, 0.065, length]} />
          <meshPhysicalMaterial
            color="#bdeaf0"
            metalness={0.65}
            roughness={0.12}
            transparent
            opacity={0.82}
          />
        </mesh>
      ))}
    </group>
  );
}

function WayfindingPylon({
  position,
  label,
  onEnter,
  accent = '#79f6da',
}: {
  position: [number, number, number];
  label: string;
  onEnter: EnterPlace;
  accent?: string;
}) {
  return (
    <group position={position} onClick={() => onEnter('map')}>
      <mesh castShadow position={[0, 1.08, 0]}>
        <boxGeometry args={[0.24, 2.16, 0.3]} />
        <meshStandardMaterial
          color="#26302f"
          metalness={0.72}
          roughness={0.27}
        />
      </mesh>
      <mesh castShadow position={[0.74, 1.95, 0]}>
        <boxGeometry args={[1.72, 0.78, 0.18]} />
        <meshPhysicalMaterial
          color="#17211f"
          metalness={0.58}
          roughness={0.22}
          clearcoat={0.64}
        />
      </mesh>
      <mesh position={[0.74, 1.95, 0.105]}>
        <planeGeometry args={[1.54, 0.58]} />
        <meshBasicMaterial
          color={accent}
          toneMapped={false}
          transparent
          opacity={0.38}
        />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <Html
        position={[0.74, 2.72, 0]}
        center
        distanceFactor={6.2}
        zIndexRange={[3, 0]}
      >
        <button
          className="world-label enterable transit-label"
          onClick={(event) => {
            event.stopPropagation();
            onEnter('map');
          }}
        >
          {label}
        </button>
      </Html>
    </group>
  );
}

function RidgeTerraces() {
  const lots = [-14, 2, 18];
  return (
    <group>
      {lots.flatMap((z, row) =>
        [-1, 1].map((side) => (
          <group key={`${side}-${z}`} position={[side * 15, 0, z]}>
            <mesh castShadow receiveShadow position={[-side * 5.5, 0.72, 0]}>
              <boxGeometry args={[0.42, 1.45 + row * 0.18, 12.4]} />
              <meshStandardMaterial
                color={row % 2 ? '#b8ae99' : '#d0c6b1'}
                roughness={0.72}
              />
            </mesh>
            <mesh position={[-side * 5.76, 1.48 + row * 0.09, 0]}>
              <boxGeometry args={[0.12, 0.18, 11.8]} />
              <meshBasicMaterial color="#ffcd86" toneMapped={false} />
            </mesh>
            {[-4.8, -1.6, 1.6, 4.8].map((offset) => (
              <mesh key={offset} position={[-side * 5.9, 1.72, offset]}>
                <sphereGeometry args={[0.48, 10, 8]} />
                <meshStandardMaterial
                  color={row === 1 ? '#48633e' : '#3d5a3c'}
                  roughness={0.96}
                />
              </mesh>
            ))}
          </group>
        )),
      )}
      <mesh receiveShadow position={[0, 0.18, -34.8]}>
        <boxGeometry args={[18, 0.36, 2.2]} />
        <meshStandardMaterial color="#777269" roughness={0.82} />
      </mesh>
    </group>
  );
}

function LandmarkLabel({
  position,
  label,
  place,
  atlasId,
  onEnter,
  tone = '',
}: {
  position: [number, number, number];
  label: string;
  place: Exclude<Place, null>;
  atlasId?: string;
  onEnter: EnterPlace;
  tone?: string;
}) {
  const anchor = useRef<THREE.Group>(null);
  const worldPosition = useRef(new THREE.Vector3());
  const visibility = useRef(false);
  const [visible, setVisible] = useState(false);
  useFrame(() => {
    if (!anchor.current) return;
    anchor.current.getWorldPosition(worldPosition.current);
    const dx = worldPosition.current.x - ACTIVE_PLAYER_POSITION.x;
    const dz = worldPosition.current.z - ACTIVE_PLAYER_POSITION.z;
    const nextVisible = dx * dx + dz * dz < 32 * 32;
    if (nextVisible !== visibility.current) {
      visibility.current = nextVisible;
      setVisible(nextVisible);
    }
  });
  return (
    <group ref={anchor} position={position}>
      {visible && (
        <Html center distanceFactor={13} zIndexRange={[3, 0]}>
          <button
            className={`world-label enterable ${tone}`}
            onClick={(event) => {
              event.stopPropagation();
              onEnter(place, atlasId);
            }}
          >
            {label}
          </button>
        </Html>
      )}
    </group>
  );
}

function StockExchangeRotunda({ onEnter }: { onEnter: EnterPlace }) {
  const columns = Array.from({ length: 14 }, (_, index) => {
    const angle = (index / 14) * Math.PI * 2;
    return { x: Math.sin(angle) * 5.25, z: Math.cos(angle) * 5.25, angle };
  });
  const bars = [1.1, 2.2, 1.7, 3.1, 2.65, 3.8, 3.3, 4.25, 4.8];
  return (
    <group position={[0, 0, -35]} onClick={() => onEnter('market')}>
      <mesh castShadow receiveShadow position={[0, 0.32, 0]}>
        <cylinderGeometry args={[7.2, 7.7, 0.64, 64]} />
        <meshPhysicalMaterial
          color="#e9e5da"
          roughness={0.3}
          clearcoat={0.45}
        />
      </mesh>
      <mesh receiveShadow position={[0, 0.68, 0]}>
        <cylinderGeometry args={[6.5, 6.8, 0.18, 64]} />
        <meshPhysicalMaterial
          color="#182c31"
          metalness={0.52}
          roughness={0.15}
          clearcoat={0.7}
        />
      </mesh>
      {columns.map((column, index) => (
        <mesh
          key={index}
          castShadow={index < 5}
          position={[column.x, 3.85, column.z]}
        >
          <cylinderGeometry args={[0.23, 0.3, 6.3, 18]} />
          <meshPhysicalMaterial
            color="#f1eee5"
            metalness={0.18}
            roughness={0.28}
            clearcoat={0.45}
          />
        </mesh>
      ))}
      <mesh castShadow position={[0, 7.15, 0]}>
        <cylinderGeometry args={[6.75, 6.2, 0.85, 64]} />
        <meshPhysicalMaterial
          color="#f4f0e6"
          metalness={0.2}
          roughness={0.24}
          clearcoat={0.6}
        />
      </mesh>
      <mesh position={[0, 5.25, 0]}>
        <cylinderGeometry args={[5.45, 5.45, 3.25, 64, 1, true]} />
        <meshPhysicalMaterial
          color="#5fc6d2"
          metalness={0.28}
          roughness={0.08}
          transmission={0.32}
          transparent
          opacity={0.58}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 8.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[6.25, 0.13, 12, 96]} />
        <meshBasicMaterial color="#83fff0" toneMapped={false} />
      </mesh>
      <mesh position={[0, 9.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.35, 0.08, 10, 96]} />
        <meshBasicMaterial
          color="#63cfee"
          toneMapped={false}
          transparent
          opacity={0.82}
        />
      </mesh>
      <mesh castShadow position={[0, 2.35, 0]} rotation={[0.15, 0.35, 0]}>
        <torusKnotGeometry args={[1.15, 0.28, 96, 14]} />
        <meshPhysicalMaterial
          color="#d6a74f"
          metalness={0.86}
          roughness={0.18}
          clearcoat={0.55}
        />
      </mesh>
      {bars.map((height, index) => (
        <mesh
          key={index}
          position={[-3.45 + index * 0.86, 5.4 + height * 0.22, 5.48]}
        >
          <boxGeometry args={[0.42, height * 0.44, 0.08]} />
          <meshBasicMaterial
            color={index % 3 === 0 ? '#ffd29a' : '#67f5d4'}
            toneMapped={false}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
      <LandmarkLabel
        position={[0, 11.2, 0]}
        label="AMPLIWORLD EXCHANGE · ENTER MARKET"
        place="market"
        onEnter={onEnter}
        tone="signal"
      />
    </group>
  );
}

function CivicHospital({ onEnter }: { onEnter: EnterPlace }) {
  const wardWindows = [-2.15, -0.7, 0.75, 2.2];
  const ambulanceBays = [-2.35, 0, 2.35];
  return (
    <group
      position={[27, 0, -14]}
      onClick={() => onEnter('hospital', 'hospital')}
    >
      <mesh receiveShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[12.2, 0.16, 10.2]} />
        <meshStandardMaterial color="#d8ddd8" roughness={0.88} />
      </mesh>
      <mesh receiveShadow position={[0, 0.17, 3.72]}>
        <boxGeometry args={[10.9, 0.11, 1.45]} />
        <meshStandardMaterial color="#596268" roughness={0.62} />
      </mesh>
      {ambulanceBays.map((x) => (
        <group key={`ambulance-${x}`} position={[x, 0, 3.72]}>
          <mesh position={[0, 0.235, 0]}>
            <boxGeometry args={[1.72, 0.025, 1.08]} />
            <meshBasicMaterial color="#cfd6d2" />
          </mesh>
          <mesh position={[0, 0.252, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.3, 18]} />
            <meshBasicMaterial color="#ef5650" />
          </mesh>
        </group>
      ))}
      <Suspense fallback={null}>
        <FourSidedFacadeShell
          size={[5.3, 7.2, 4.35]}
          position={[-2.85, 0.05, -1.55]}
          accent="#ef5650"
          verticalCoverage={0.72}
        />
        <FourSidedFacadeShell
          size={[4.45, 4.45, 4.1]}
          position={[3.55, 0.05, -1.45]}
          accent="#74d5df"
          verticalCoverage={0.54}
        />
        <FourSidedFacadeShell
          size={[8.8, 2.65, 2.35]}
          position={[0.2, 0.05, 1.92]}
          accent="#ef5650"
          verticalCoverage={0.34}
        />
      </Suspense>
      <mesh castShadow position={[0.25, 3.42, -1.5]}>
        <boxGeometry args={[1.3, 1.05, 1.3]} />
        <meshPhysicalMaterial
          color="#bcdde0"
          metalness={0.32}
          roughness={0.16}
          transmission={0.22}
          transparent
          opacity={0.86}
        />
      </mesh>
      {wardWindows.map((x) =>
        [1.35, 2.8, 4.25, 5.7].map((y) => (
          <mesh key={`${x}-${y}`} position={[-2.85 + x * 0.82, y, 0.66]}>
            <boxGeometry args={[0.72, 0.48, 0.055]} />
            <meshStandardMaterial
              color="#79bdc9"
              emissive="#255c68"
              emissiveIntensity={0.18}
              metalness={0.22}
              roughness={0.2}
            />
          </mesh>
        )),
      )}
      <mesh castShadow position={[0.2, 1.28, 3.38]}>
        <boxGeometry args={[4.7, 0.22, 1.12]} />
        <meshPhysicalMaterial
          color="#edf4f0"
          metalness={0.28}
          roughness={0.28}
          clearcoat={0.45}
        />
      </mesh>
      <mesh position={[0.2, 1.36, 3.12]}>
        <boxGeometry args={[1.45, 2.08, 0.08]} />
        <meshPhysicalMaterial
          color="#24454c"
          transmission={0.35}
          transparent
          opacity={0.82}
          metalness={0.4}
          roughness={0.15}
        />
      </mesh>
      <mesh position={[-2.85, 5.62, 0.7]}>
        <boxGeometry args={[0.35, 1.35, 0.09]} />
        <meshStandardMaterial
          color="#ff514c"
          emissive="#ff2d27"
          emissiveIntensity={0.7}
        />
      </mesh>
      <mesh position={[-2.85, 5.62, 0.71]}>
        <boxGeometry args={[1.35, 0.35, 0.09]} />
        <meshStandardMaterial
          color="#ff514c"
          emissive="#ff2d27"
          emissiveIntensity={0.7}
        />
      </mesh>
      <mesh position={[-2.85, 7.32, -1.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.32, 28]} />
        <meshStandardMaterial color="#e7e9e4" roughness={0.64} />
      </mesh>
      <mesh position={[-2.85, 7.34, -1.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.82, 1.04, 28]} />
        <meshBasicMaterial color="#ef5650" />
      </mesh>
      <group position={[4.5, 0, 3.25]}>
        <mesh receiveShadow position={[0, 0.2, 0]}>
          <boxGeometry args={[1.75, 0.35, 1.15]} />
          <meshStandardMaterial color="#d9ddd6" roughness={0.76} />
        </mesh>
        {[-0.55, 0, 0.55].map((x) => (
          <mesh key={x} position={[x, 0.62, 0]}>
            <sphereGeometry args={[0.34, 10, 8]} />
            <meshStandardMaterial color="#47704d" roughness={0.92} />
          </mesh>
        ))}
      </group>
      <LandmarkLabel
        position={[0, 9.1, 0]}
        label="MERIDIAN HEALTH CAMPUS · EMERGENCY / CLINICS"
        place="hospital"
        atlasId="hospital"
        onEnter={onEnter}
        tone="hospital-label"
      />
    </group>
  );
}

function CivicSafetyHQ({ onEnter }: { onEnter: EnterPlace }) {
  return (
    <group position={[27, 0, 3]} onClick={() => onEnter('police', 'police')}>
      <mesh receiveShadow position={[0, 0.08, 0]}>
        <boxGeometry args={[10.4, 0.16, 8.6]} />
        <meshStandardMaterial color="#4c565c" roughness={0.93} />
      </mesh>
      <Suspense fallback={null}>
        <StaticAsset
          url={`${INDUSTRIAL_ASSET_ROOT}/building-o.glb`}
          position={[0, 0.13, -0.4]}
          scale={5.8}
        />
      </Suspense>
      <Suspense fallback={null}>
        <FourSidedFacadeShell
          size={[3.8, 4, 5.4]}
          position={[-2.8, 0.05, 1.2]}
          accent="#4ebcff"
          verticalCoverage={0.36}
        />
        <FourSidedFacadeShell
          size={[4.1, 2.8, 5.9]}
          position={[3.1, 0.05, 0.8]}
          accent="#ff5e61"
          verticalCoverage={0.3}
        />
      </Suspense>
      <mesh position={[-2.8, 1.45, 3.94]}>
        <boxGeometry args={[1.55, 2.2, 0.08]} />
        <meshStandardMaterial
          color="#153144"
          emissive="#24669f"
          emissiveIntensity={0.34}
          metalness={0.42}
        />
      </mesh>
      <mesh position={[-3.25, 4.65, 1]}>
        <boxGeometry args={[1.2, 0.16, 0.25]} />
        <meshStandardMaterial
          color="#4ebcff"
          emissive="#2189da"
          emissiveIntensity={0.85}
        />
      </mesh>
      <mesh position={[-2.35, 4.65, 1]}>
        <boxGeometry args={[0.6, 0.16, 0.25]} />
        <meshStandardMaterial
          color="#ff5e61"
          emissive="#e52d35"
          emissiveIntensity={0.82}
        />
      </mesh>
      <mesh position={[2.8, 4.2, -1]}>
        <cylinderGeometry args={[0.06, 0.06, 4.2, 8]} />
        <meshStandardMaterial color="#293238" metalness={0.8} />
      </mesh>
      <LandmarkLabel
        position={[0, 6.5, 0]}
        label="CIVIC SAFETY · POLICE"
        place="police"
        atlasId="police"
        onEnter={onEnter}
        tone="police-label"
      />
    </group>
  );
}

function AcademyCampus({ onEnter }: { onEnter: EnterPlace }) {
  return (
    <group
      position={[-25, 0, 16]}
      onClick={() => onEnter('academy', 'academy')}
    >
      <mesh receiveShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[16.2, 0.12, 13.8]} />
        <meshStandardMaterial color="#708063" roughness={0.96} />
      </mesh>
      <Suspense fallback={null}>
        <StaticAsset
          url={`${COMMERCIAL_ASSET_ROOT}/building-k.glb`}
          position={[-3.6, 0.12, -2.7]}
          rotation={[0, Math.PI / 2, 0]}
          scale={3.25}
        />
        <StaticAsset
          url={`${COMMERCIAL_ASSET_ROOT}/building-k.glb`}
          position={[3.6, 0.12, -2.7]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={3.25}
        />
        <FourSidedFacadeShell
          size={[5, 4, 3.4]}
          position={[0, 0.05, -4.1]}
          accent="#65d8ff"
          verticalCoverage={0.36}
        />
      </Suspense>
      <mesh position={[0, 1.5, -2.36]}>
        <boxGeometry args={[1.7, 2.5, 0.08]} />
        <meshStandardMaterial
          color="#254352"
          emissive="#2c8292"
          emissiveIntensity={0.28}
        />
      </mesh>
      <mesh
        receiveShadow
        position={[3.3, 0.095, 3.5]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[7.2, 4.8]} />
        <meshStandardMaterial color="#435f7d" roughness={0.85} />
      </mesh>
      {[0, 1].map((line) => (
        <mesh
          key={line}
          position={[3.3, 0.105, 2.5 + line * 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[6.5, 0.06]} />
          <meshBasicMaterial color="#e8e0ba" />
        </mesh>
      ))}
      <mesh position={[-5.7, 3.35, -0.8]}>
        <cylinderGeometry args={[0.05, 0.05, 6.6, 8]} />
        <meshStandardMaterial color="#d7d9d2" metalness={0.65} />
      </mesh>
      <LandmarkLabel
        position={[0, 6.3, -1]}
        label="AMPLIWORLD ACADEMY"
        place="academy"
        atlasId="academy"
        onEnter={onEnter}
        tone="school-label"
      />
    </group>
  );
}

function FreshMarket({ onEnter }: { onEnter: EnterPlace }) {
  return (
    <group
      position={[-25, 0, -3]}
      onClick={() => onEnter('grocer', 'fresh-market')}
    >
      <mesh receiveShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[10.4, 0.12, 8.4]} />
        <meshStandardMaterial color="#9b927a" roughness={0.92} />
      </mesh>
      <Suspense fallback={null}>
        <StaticAsset
          url={`${COMMERCIAL_ASSET_ROOT}/building-g.glb`}
          position={[0, 0.12, -0.7]}
          scale={3.2}
        />
      </Suspense>
      <Suspense fallback={null}>
        <FourSidedFacadeShell
          size={[6.8, 2.8, 3.2]}
          position={[0, 0.05, 2.2]}
          accent="#72aa4f"
          verticalCoverage={0.3}
        />
      </Suspense>
      <mesh position={[0, 1.4, 3.84]}>
        <boxGeometry args={[6.8, 2, 0.08]} />
        <meshStandardMaterial
          color="#1e4e3d"
          emissive="#22895e"
          emissiveIntensity={0.3}
        />
      </mesh>
      {[-3, -1.5, 0, 1.5, 2.8].map((x, index) => (
        <group key={x} position={[x, 0.48, 4.2]}>
          <mesh castShadow>
            <boxGeometry args={[1.15, 0.65, 0.9]} />
            <meshStandardMaterial
              color={index % 2 ? '#b47742' : '#8b5d39'}
              roughness={0.9}
            />
          </mesh>
          {Array.from({ length: 4 }, (_, fruit) => (
            <mesh
              key={fruit}
              position={[
                -0.35 + (fruit % 2) * 0.7,
                0.45,
                -0.24 + Math.floor(fruit / 2) * 0.45,
              ]}
            >
              <sphereGeometry args={[0.18, 9, 7]} />
              <meshStandardMaterial
                color={
                  index % 3 === 0
                    ? '#e66b48'
                    : index % 3 === 1
                      ? '#72aa4f'
                      : '#e3bd4e'
                }
                roughness={0.84}
              />
            </mesh>
          ))}
        </group>
      ))}
      <LandmarkLabel
        position={[0, 5.5, 0]}
        label="VERDANT · FRESH FRUIT &amp; VEGETABLES"
        place="grocer"
        atlasId="fresh-market"
        onEnter={onEnter}
        tone="grocer-label"
      />
    </group>
  );
}

function Auto4SDealership({ onEnter }: { onEnter: EnterPlace }) {
  const campus = WORLD_SITE_RESERVATIONS.find(
    (site) => site.id === 'SITE-APEX-MOTORS',
  )!;
  const showroom = NAMED_WORLD_SOLIDS.find(
    (solid) => solid.id === 'AUTO-APEX-SHOWROOM',
  )!;
  const serviceHall = NAMED_WORLD_SOLIDS.find(
    (solid) => solid.id === 'AUTO-APEX-SERVICE',
  )!;
  const showroomLocalX = showroom.center[0] - campus.center[0];
  const showroomLocalZ = showroom.center[1] - campus.center[1];
  const serviceLocalX = serviceHall.center[0] - campus.center[0];
  const serviceLocalZ = serviceHall.center[1] - campus.center[1];
  const campusTerrain = getWorldFootprintElevationRange(
    campus.center,
    [14.2, 10.1],
  );
  const campusElevation = showroom.baseElevation!;
  const campusFoundationDepth = Math.max(
    0.8,
    campusElevation - campusTerrain.minimum + 0.35,
  );
  const displayCars = [
    {
      model: 'sedan.glb',
      position: [-10.2, 0.24, 3.2] as [number, number, number],
      rotation: 0,
    },
    {
      model: 'suv-luxury.glb',
      position: [-6.8, 0.24, 3.2] as [number, number, number],
      rotation: Math.PI,
    },
    {
      model: 'race-future.glb',
      position: [-3.4, 0.24, 3.2] as [number, number, number],
      rotation: 0,
    },
    {
      model: 'sedan.glb',
      position: [0, 0.24, 3.2] as [number, number, number],
      rotation: Math.PI,
    },
    {
      model: 'race-future.glb',
      position: [3.4, 0.24, 3.2] as [number, number, number],
      rotation: 0,
    },
    {
      model: 'suv-luxury.glb',
      position: [6.8, 0.24, 3.2] as [number, number, number],
      rotation: Math.PI,
    },
    {
      model: 'taxi.glb',
      position: [10.2, 0.24, 3.2] as [number, number, number],
      rotation: 0,
    },
  ];
  const perimeterLanes = [
    {
      position: [-13.2, 0.15, 0] as [number, number, number],
      size: [1.2, 0.04, 19.2] as [number, number, number],
    },
    {
      position: [13.2, 0.15, 0] as [number, number, number],
      size: [1.2, 0.04, 19.2] as [number, number, number],
    },
    {
      position: [0, 0.15, -9.2] as [number, number, number],
      size: [27.6, 0.04, 1.2] as [number, number, number],
    },
    {
      position: [0, 0.15, 9.2] as [number, number, number],
      size: [27.6, 0.04, 1.2] as [number, number, number],
    },
  ];
  return (
    <group
      position={[campus.center[0], campusElevation, campus.center[1]]}
      name="AUTO-APEX · 4S flagship campus"
    >
      <mesh
        castShadow
        receiveShadow
        position={[0, -campusFoundationDepth / 2, 0]}
      >
        <boxGeometry args={[28.4, campusFoundationDepth, 20.2]} />
        <meshStandardMaterial color="#737873" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[28.4, 0.12, 20.2]} />
        <meshStandardMaterial color="#545a57" roughness={0.94} />
      </mesh>
      {perimeterLanes.map((lane, index) => (
        <mesh key={`test-lane-${index}`} receiveShadow position={lane.position}>
          <boxGeometry args={lane.size} />
          <meshStandardMaterial color="#20282b" roughness={0.76} />
        </mesh>
      ))}
      {[-11.8, -8.4, -5, -1.7, 1.7, 5, 8.4, 11.8].map((x) => (
        <mesh key={`test-mark-${x}`} position={[x, 0.18, 5.05]}>
          <boxGeometry args={[0.07, 0.018, 4.2]} />
          <meshBasicMaterial color="#e8cf71" />
        </mesh>
      ))}
      <Suspense fallback={null}>
        <FourSidedFacadeShell
          size={[
            showroom.halfExtents[0] * 2,
            showroom.height,
            showroom.halfExtents[1] * 2,
          ]}
          position={[showroomLocalX, 0.05, showroomLocalZ]}
          accent="#65d8ff"
          verticalCoverage={0.48}
        />
        <FourSidedFacadeShell
          size={[
            serviceHall.halfExtents[0] * 2,
            serviceHall.height,
            serviceHall.halfExtents[1] * 2,
          ]}
          position={[serviceLocalX, 0.05, serviceLocalZ]}
          accent="#ffb45d"
          verticalCoverage={0.36}
        />
      </Suspense>
      <mesh
        castShadow
        position={[showroomLocalX, showroom.height + 0.12, showroomLocalZ]}
      >
        <boxGeometry args={[11.4, 0.26, 7.3]} />
        <meshStandardMaterial
          color="#202c30"
          metalness={0.68}
          roughness={0.22}
        />
      </mesh>
      <mesh
        position={[
          showroomLocalX,
          showroom.height * 0.48,
          showroomLocalZ + showroom.halfExtents[1] + 0.04,
        ]}
      >
        <boxGeometry args={[9.6, 4.7, 0.08]} />
        <meshPhysicalMaterial
          color="#77bdca"
          transmission={0.55}
          transparent
          opacity={0.65}
          roughness={0.12}
        />
      </mesh>
      {[-3.9, -1.3, 1.3, 3.9].map((offset, index) => (
        <group
          key={`service-bay-${offset}`}
          position={[
            serviceLocalX + offset,
            0,
            serviceLocalZ + serviceHall.halfExtents[1] + 0.04,
          ]}
        >
          <mesh position={[0, 1.7, 0]}>
            <boxGeometry args={[2.2, 3.2, 0.08]} />
            <meshStandardMaterial
              color="#26373b"
              emissive={index === 1 ? '#8b4d22' : '#244856'}
              emissiveIntensity={0.22}
              metalness={0.42}
              roughness={0.28}
            />
          </mesh>
          {[0.7, 1.35, 2, 2.65].map((y) => (
            <mesh key={y} position={[0, y, 0.05]}>
              <boxGeometry args={[2, 0.045, 0.03]} />
              <meshBasicMaterial color="#a9c4c5" transparent opacity={0.68} />
            </mesh>
          ))}
        </group>
      ))}
      <Suspense fallback={null}>
        {displayCars.map((car, index) => (
          <StaticAsset
            key={`${car.model}-${index}`}
            url={`${CAR_ASSET_ROOT}/${car.model}`}
            position={car.position}
            rotation={[0, car.rotation, 0]}
            scale={1.05}
          />
        ))}
      </Suspense>
      {displayCars.map((car, index) => (
        <mesh
          key={`${car.model}-${index}-pad`}
          position={[car.position[0], 0.13, car.position[2]]}
        >
          <cylinderGeometry args={[1.35, 1.35, 0.12, 28]} />
          <meshStandardMaterial
            color="#5f7f82"
            metalness={0.5}
            roughness={0.22}
          />
        </mesh>
      ))}
      {[5, 7.5, 10].map((x, index) => (
        <group key={`charger-${x}`} position={[x, 0, 6.9]}>
          <mesh castShadow position={[0, 0.75, 0]}>
            <boxGeometry args={[0.42, 1.5, 0.34]} />
            <meshPhysicalMaterial
              color="#e2e8e3"
              metalness={0.36}
              roughness={0.28}
              clearcoat={0.45}
            />
          </mesh>
          <mesh position={[0, 0.95, 0.18]}>
            <boxGeometry args={[0.24, 0.42, 0.025]} />
            <meshBasicMaterial
              color={index % 2 ? '#69f6bd' : '#65d8ff'}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, 1.55, 0]}>
            <boxGeometry args={[0.56, 0.09, 0.42]} />
            <meshStandardMaterial color="#293438" metalness={0.7} />
          </mesh>
        </group>
      ))}
      <LandmarkLabel
        position={[0, 9.25, -1]}
        label="APEX MOTORS FLAGSHIP 4S · SHOWROOM / SERVICE / TEST LOOP / 42 BAYS"
        place="dealership"
        atlasId="auto-4s"
        onEnter={onEnter}
        tone="auto-label"
      />
    </group>
  );
}

function EnergyResearchCampus({ onEnter }: { onEnter: EnterPlace }) {
  return (
    <group
      position={[45.5, 0, 5]}
      onClick={() => onEnter('career', 'grid-energy')}
    >
      <mesh receiveShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[13.4, 0.12, 11.8]} />
        <meshStandardMaterial color="#52615a" roughness={0.9} />
      </mesh>
      <mesh receiveShadow position={[0, 0.14, 0]}>
        <boxGeometry args={[11.7, 0.05, 10.2]} />
        <meshStandardMaterial color="#273236" roughness={0.72} />
      </mesh>
      <Suspense fallback={null}>
        <FourSidedFacadeShell
          size={[5.4, 4.15, 4.25]}
          position={[-3.25, 0.08, -2.15]}
          accent="#71f2c4"
          verticalCoverage={0.46}
        />
        <FourSidedFacadeShell
          size={[3.9, 2.75, 3.7]}
          position={[2.55, 0.08, -2.4]}
          accent="#65d8ff"
          verticalCoverage={0.34}
        />
      </Suspense>
      <mesh position={[-3.25, 2.12, 0.01]}>
        <boxGeometry args={[3.8, 2.45, 0.07]} />
        <meshPhysicalMaterial
          color="#5ea7ad"
          metalness={0.25}
          roughness={0.13}
          transmission={0.32}
          transparent
          opacity={0.76}
        />
      </mesh>
      {[-3.7, 0, 3.7].map((x) => (
        <group key={`utility-${x}`} position={[x, 0, 2.8]}>
          <mesh castShadow position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.58, 0.64, 1.36, 16]} />
            <meshStandardMaterial
              color="#708385"
              metalness={0.58}
              roughness={0.34}
            />
          </mesh>
          <mesh position={[0, 1.35, 0]}>
            <torusGeometry args={[0.42, 0.08, 8, 18]} />
            <meshStandardMaterial
              color="#bdc8c6"
              metalness={0.72}
              roughness={0.24}
            />
          </mesh>
          <mesh position={[0, 0.8, 0.61]}>
            <boxGeometry args={[0.48, 0.6, 0.08]} />
            <meshBasicMaterial
              color="#71f2c4"
              toneMapped={false}
              transparent
              opacity={0.66}
            />
          </mesh>
        </group>
      ))}
      {[-3.8, 0, 3.8].map((x) => (
        <group key={`canopy-${x}`} position={[x, 0, 4.75]}>
          <mesh castShadow position={[0, 1.62, 0]} rotation={[-0.17, 0, 0]}>
            <boxGeometry args={[3.15, 0.09, 1.55]} />
            <meshPhysicalMaterial
              color="#1c4b60"
              emissive="#163c50"
              emissiveIntensity={0.22}
              metalness={0.62}
              roughness={0.2}
              clearcoat={0.52}
            />
          </mesh>
          {[-1.25, 1.25].map((support) => (
            <mesh key={support} position={[support, 0.8, 0]}>
              <boxGeometry args={[0.08, 1.6, 0.08]} />
              <meshStandardMaterial color="#9ca9a5" metalness={0.72} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[5.3, 3.25, -2.9]}>
        <cylinderGeometry args={[0.07, 0.1, 6.5, 10]} />
        <meshStandardMaterial color="#abb7b3" metalness={0.72} />
      </mesh>
      {[1.25, 2.45, 3.65].map((y) => (
        <mesh key={`mast-ring-${y}`} position={[5.3, y, -2.9]}>
          <torusGeometry args={[0.22, 0.035, 7, 14]} />
          <meshBasicMaterial color="#71f2c4" toneMapped={false} />
        </mesh>
      ))}
      <group position={[3.65, 0, 0.85]}>
        <mesh castShadow position={[0, 0.72, 0]}>
          <cylinderGeometry args={[1.32, 1.55, 1.35, 28]} />
          <meshStandardMaterial
            color="#cbd2cc"
            metalness={0.28}
            roughness={0.42}
          />
        </mesh>
        <mesh castShadow position={[0, 1.42, 0]}>
          <sphereGeometry
            args={[1.32, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]}
          />
          <meshPhysicalMaterial
            color="#d9e1db"
            metalness={0.2}
            roughness={0.33}
            clearcoat={0.38}
          />
        </mesh>
        <mesh position={[0, 1.03, 1.34]}>
          <boxGeometry args={[0.9, 0.42, 0.05]} />
          <meshBasicMaterial color="#65d8ff" toneMapped={false} />
        </mesh>
      </group>
      <LandmarkLabel
        position={[0, 6.4, 0]}
        label="GRID LAB · POWER + NUCLEAR SYSTEMS CAMPUS"
        place="career"
        atlasId="grid-energy"
        onEnter={onEnter}
        tone="signal"
      />
    </group>
  );
}

function DiningPrecinct({ onEnter }: { onEnter: EnterPlace }) {
  const tables = [-1.25, 1.25];
  return (
    <group
      position={[-17.35, 0, 0]}
      onClick={() => onEnter('restaurant', 'dining-campus')}
    >
      <mesh receiveShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[4.75, 0.12, 6.2]} />
        <meshStandardMaterial color="#8e8171" roughness={0.84} />
      </mesh>
      <Suspense fallback={null}>
        <FourSidedFacadeShell
          size={[4.15, 2.35, 1.82]}
          position={[0, 0.07, -1.92]}
          accent="#ffb45d"
          verticalCoverage={0.29}
        />
        <FourSidedFacadeShell
          size={[1.85, 1.85, 1.7]}
          position={[-1.12, 0.07, 0.12]}
          accent="#f17367"
          verticalCoverage={0.25}
        />
        <FourSidedFacadeShell
          size={[1.85, 1.85, 1.7]}
          position={[1.12, 0.07, 0.12]}
          accent="#71f2c4"
          verticalCoverage={0.25}
        />
      </Suspense>
      {tables.map((x, index) => (
        <group key={`table-${x}`} position={[x, 0, 2.12]}>
          <mesh castShadow position={[0, 0.52, 0]}>
            <cylinderGeometry args={[0.46, 0.46, 0.08, 18]} />
            <meshStandardMaterial color="#72523d" roughness={0.65} />
          </mesh>
          <mesh position={[0, 0.27, 0]}>
            <cylinderGeometry args={[0.055, 0.065, 0.5, 10]} />
            <meshStandardMaterial color="#2f3533" metalness={0.48} />
          </mesh>
          <mesh
            castShadow
            position={[0, 1.6, 0]}
            rotation={[0, index * 0.45, 0]}
          >
            <coneGeometry args={[1.02, 0.34, 16, 1, true]} />
            <meshStandardMaterial
              color={index ? '#d86d61' : '#e0b15d'}
              roughness={0.72}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 2.52, -0.98]}>
        <boxGeometry args={[3.35, 0.22, 0.12]} />
        <meshStandardMaterial
          color="#1d2928"
          emissive="#d77c36"
          emissiveIntensity={0.35}
          metalness={0.55}
        />
      </mesh>
      <LandmarkLabel
        position={[0, 4.3, 0]}
        label="NOVA DINING CAMPUS · CAFE / GRILL / NIGHT KITCHEN"
        place="restaurant"
        atlasId="dining-campus"
        onEnter={onEnter}
        tone="signal"
      />
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
    <group
      position={[-26, 0, 29]}
      onClick={() => onEnter('residences', 'midrise')}
    >
      <mesh receiveShadow position={[0, 0.05, 0]}>
        <boxGeometry args={[22.5, 0.1, 14]} />
        <meshStandardMaterial color="#71816e" roughness={0.96} />
      </mesh>
      {buildings.map((building) => (
        <group key={building.label} position={[building.x, 0, building.z]}>
          <Suspense fallback={null}>
            <FourSidedFacadeShell
              size={[5.4, building.floors * 1.44, 5.2]}
              accent={building.label === '1B' ? '#65d8ff' : '#d8b275'}
            />
          </Suspense>
          <mesh position={[0, 0.95, 2.67]}>
            <boxGeometry args={[1.15, 1.65, 0.08]} />
            <meshStandardMaterial color="#394943" />
          </mesh>
          <Html
            position={[0, building.floors * 1.45 + 0.8, 0]}
            center
            distanceFactor={14}
            zIndexRange={[3, 0]}
          >
            <span className="zone-label residence-tier">
              {building.label} · {building.floors} FLOORS
            </span>
          </Html>
        </group>
      ))}
      <mesh receiveShadow position={[0, 0.12, 4.2]}>
        <boxGeometry args={[7.5, 0.18, 3.3]} />
        <meshPhysicalMaterial
          color="#4ea9bf"
          transmission={0.3}
          transparent
          opacity={0.82}
          roughness={0.12}
        />
      </mesh>
      <mesh position={[0, 0.24, 4.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.25, 1.38, 36]} />
        <meshBasicMaterial color="#d8f4ef" />
      </mesh>
      <LandmarkLabel
        position={[0, 10.3, 0]}
        label="CANOPY POOL RESIDENCES · STUDIO / 1B / 2B"
        place="residences"
        atlasId="midrise"
        onEnter={onEnter}
        tone="residential-label"
      />
    </group>
  );
}

function SciFiResidenceTower({
  position,
  variant,
  label,
  onEnter,
}: {
  position: [number, number, number];
  variant: 'HELIX' | 'BRIDGE' | 'PRISM';
  label: string;
  onEnter: EnterPlace;
}) {
  const labelHeight = variant === 'BRIDGE' ? 53 : variant === 'HELIX' ? 44 : 42;
  return (
    <group
      position={position}
      onClick={() => onEnter('residences', 'crown-residences')}
    >
      {variant === 'HELIX' &&
        Array.from({ length: 15 }, (_, floor) => (
          <group
            key={floor}
            position={[0, 1.55 + floor * 2.72, 0]}
            rotation={[0, floor * 0.105, 0]}
          >
            <mesh castShadow={floor < 6} receiveShadow>
              <boxGeometry args={[7.15, 2.38, 5.25]} />
              <meshPhysicalMaterial
                color={floor % 3 ? '#26383d' : '#dce2de'}
                metalness={0.48}
                roughness={0.22}
                clearcoat={0.42}
              />
            </mesh>
            <mesh position={[0, 0, 2.66]}>
              <boxGeometry args={[5.9, 1.32, 0.08]} />
              <meshStandardMaterial
                color={floor % 4 === 0 ? '#ffd095' : '#65dce9'}
                emissive={floor % 4 === 0 ? '#d78b43' : '#2d8e9c'}
                emissiveIntensity={0.42}
                metalness={0.25}
                roughness={0.18}
              />
            </mesh>
            <mesh position={[0, 1.24, 0]}>
              <boxGeometry args={[7.8, 0.12, 5.8]} />
              <meshStandardMaterial
                color="#eef3ef"
                metalness={0.4}
                roughness={0.28}
              />
            </mesh>
          </group>
        ))}
      {variant === 'BRIDGE' && (
        <>
          <mesh castShadow receiveShadow position={[-2.9, 21, 0]}>
            <boxGeometry args={[4.8, 42, 5.4]} />
            <meshPhysicalMaterial
              color="#e1e5e1"
              metalness={0.32}
              roughness={0.25}
              clearcoat={0.5}
            />
          </mesh>
          <mesh castShadow receiveShadow position={[2.9, 25, 0]}>
            <boxGeometry args={[4.8, 50, 5.4]} />
            <meshPhysicalMaterial
              color="#20313b"
              metalness={0.55}
              roughness={0.2}
              clearcoat={0.62}
            />
          </mesh>
          {Array.from({ length: 14 }, (_, floor) => 2.1 + floor * 3.15).map(
            (y, index) => (
              <mesh key={y} position={[0, y, 2.74]}>
                <boxGeometry args={[9.7, 0.48, 0.08]} />
                <meshStandardMaterial
                  color={index % 5 === 0 ? '#ffd39a' : '#7cf0c3'}
                  emissive={index % 5 === 0 ? '#d58e4e' : '#31b887'}
                  emissiveIntensity={0.46}
                />
              </mesh>
            ),
          )}
          <mesh castShadow position={[0, 31.5, 0]}>
            <boxGeometry args={[5.4, 2.15, 4.4]} />
            <meshPhysicalMaterial
              color="#b6cbd0"
              metalness={0.58}
              roughness={0.16}
              clearcoat={0.55}
            />
          </mesh>
          <mesh position={[0, 31.5, 2.24]}>
            <boxGeometry args={[4.45, 1.25, 0.08]} />
            <meshBasicMaterial color="#c8fff0" toneMapped={false} />
          </mesh>
        </>
      )}
      {variant === 'PRISM' &&
        Array.from({ length: 12 }, (_, tier) => (
          <group
            key={tier}
            position={[0, 1.7 + tier * 3.25, 0]}
            rotation={[0, tier * 0.075, 0]}
          >
            <mesh castShadow={tier < 5} receiveShadow>
              <cylinderGeometry
                args={[5.05 - tier * 0.16, 5.35 - tier * 0.16, 3, 8]}
              />
              <meshPhysicalMaterial
                color={tier % 3 ? '#203533' : '#d7e0da'}
                metalness={0.5}
                roughness={0.2}
                clearcoat={0.48}
              />
            </mesh>
            <mesh position={[0, 0, 4.52 - tier * 0.145]}>
              <boxGeometry args={[4.4, 1.45, 0.08]} />
              <meshStandardMaterial
                color={tier % 4 === 0 ? '#ffd19b' : '#d5a8ff'}
                emissive={tier % 4 === 0 ? '#c98447' : '#9454ce'}
                emissiveIntensity={0.42}
              />
            </mesh>
            <mesh position={[0, 1.55, 0]}>
              <cylinderGeometry
                args={[5.25 - tier * 0.16, 5.45 - tier * 0.16, 0.1, 8]}
              />
              <meshStandardMaterial
                color="#edf3ee"
                metalness={0.38}
                roughness={0.3}
              />
            </mesh>
          </group>
        ))}
      <mesh receiveShadow position={[0, 0.12, 0]}>
        <cylinderGeometry args={[5.6, 6.2, 0.24, 20]} />
        <meshPhysicalMaterial
          color="#777e78"
          roughness={0.5}
          clearcoat={0.28}
        />
      </mesh>
      <LandmarkLabel
        position={[0, labelHeight, 0]}
        label={`${label} · FULL-FLOOR HOMES`}
        place="residences"
        atlasId="crown-residences"
        onEnter={onEnter}
        tone="residential-label"
      />
    </group>
  );
}

function FloatingWatercraft({
  model,
  position,
  rotation = 0,
  scale = 1,
  phase = 0,
  shadows = true,
}: {
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
    craft.current.position.y =
      position[1] + Math.sin(clock.elapsedTime * 0.72 + phase) * 0.07;
    craft.current.rotation.z =
      Math.sin(clock.elapsedTime * 0.48 + phase) * 0.018;
  });
  return (
    <group ref={craft} position={position} rotation={[0, rotation, 0]}>
      <Suspense fallback={null}>
        <StaticAsset
          url={`${WATERCRAFT_ASSET_ROOT}/${model}.glb`}
          scale={scale}
          shadows={shadows}
        />
      </Suspense>
    </group>
  );
}

function WaterfrontMarina({
  onEnter,
  embedded = false,
}: {
  onEnter: EnterPlace;
  embedded?: boolean;
}) {
  const piers = [-18, -2, 14, 29];
  return (
    <group>
      {!embedded && (
        <mesh receiveShadow position={[-47, 0.025, 1]}>
          <boxGeometry args={[22, 0.08, 90]} />
          <meshPhysicalMaterial
            color="#267f9c"
            roughness={0.16}
            metalness={0.04}
            transmission={0.12}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
      {!embedded && (
        <AnimatedWaterSurface position={[-47, 0.075, 1]} size={[22, 90]} />
      )}
      <mesh receiveShadow position={[-36.5, 0.06, 1]}>
        <boxGeometry args={[1.4, 0.28, 90]} />
        <StoneQuayMaterial width={1.4} length={90} />
      </mesh>
      {piers.map((z, pier) => (
        <group key={z}>
          <mesh castShadow receiveShadow position={[-42, 0.18, z]}>
            <boxGeometry args={[11.2, 0.28, 1.15]} />
            <DeckSurfaceMaterial width={11.2} length={1.15} />
          </mesh>
          {[-47, -43, -39].map((x) => (
            <mesh key={x} position={[x, -0.15, z]}>
              <cylinderGeometry args={[0.12, 0.16, 1.2, 8]} />
              <meshStandardMaterial color="#493829" roughness={0.96} />
            </mesh>
          ))}
          {pier < 3 && (
            <Suspense fallback={null}>
              <StaticAsset
                url={`${WATERCRAFT_ASSET_ROOT}/buoy.glb`}
                position={[-46.5, 0.05, z + 2.8]}
                scale={1.5}
                shadows={false}
              />
            </Suspense>
          )}
        </group>
      ))}
      <FloatingWatercraft
        model="boat-fishing-small"
        position={[-42.5, 0.2, -14]}
        rotation={Math.PI / 2}
        scale={2.45}
        phase={1}
      />
      <FloatingWatercraft
        model="boat-speed-a"
        position={[-43.8, 0.2, -5]}
        rotation={Math.PI / 2}
        scale={2.7}
        phase={2}
      />
      <FloatingWatercraft
        model="boat-speed-f"
        position={[-43, 0.2, 7]}
        rotation={Math.PI / 2}
        scale={2.8}
        phase={3}
      />
      <FloatingWatercraft
        model="boat-sail-a"
        position={[-44.5, 0.2, 18]}
        rotation={Math.PI / 2}
        scale={2.7}
        phase={4}
      />
      <FloatingWatercraft
        model="ship-large"
        position={[-48, 0.3, 28]}
        rotation={Math.PI / 2}
        scale={2.25}
        phase={5}
      />
      <FloatingWatercraft
        model="boat-tug-a"
        position={[-50, 0.2, -28]}
        rotation={Math.PI / 2}
        scale={2.2}
        phase={6}
        shadows={false}
      />
      <FloatingWatercraft
        model="ship-cargo-a"
        position={[-54, 0.35, -17]}
        rotation={Math.PI / 2}
        scale={2.7}
        phase={7}
        shadows={false}
      />
      <FloatingWatercraft
        model="ship-ocean-liner"
        position={[-56, 0.4, 9]}
        rotation={Math.PI / 2}
        scale={2.5}
        phase={8}
        shadows={false}
      />
      <LandmarkLabel
        position={[-35.6, 4.1, 4]}
        label="HARBOR STEPS · BOATS / YACHTS / SHIPS"
        place="marina"
        atlasId="public-marina"
        onEnter={onEnter}
        tone="marina-label"
      />
    </group>
  );
}

const LEFT_CITY_TRAFFIC_CURVE = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-13.35, 0.08, -18),
    new THREE.Vector3(-10.65, 0.08, -18),
    new THREE.Vector3(-10.65, 0.08, 36),
    new THREE.Vector3(-13.35, 0.08, 36),
  ],
  true,
  'catmullrom',
  0.08,
);

const RIGHT_CITY_TRAFFIC_CURVE = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(10.65, 0.08, -18),
    new THREE.Vector3(13.35, 0.08, -18),
    new THREE.Vector3(13.35, 0.08, 36),
    new THREE.Vector3(10.65, 0.08, 36),
  ],
  true,
  'catmullrom',
  0.08,
);

function TrafficConvoy({
  curve,
  vehicles: specs,
  slotOffset,
  initialProgress = 0,
}: {
  curve: THREE.Curve<THREE.Vector3>;
  vehicles: readonly { model: string; phase: number }[];
  slotOffset: number;
  initialProgress?: number;
}) {
  const vehicles = useRef<Array<THREE.Group | null>>([]);
  const progress = useRef(initialProgress);
  useFrame((_, delta) => {
    const nextProgress = (progress.current + Math.min(delta, 0.05) * 0.025) % 1;
    const proposedPoints = specs.map((spec) =>
      curve.getPointAt((nextProgress + spec.phase) % 1),
    );
    const playerClear = proposedPoints.every(
      (point) => point.distanceToSquared(ACTIVE_PLAYER_POSITION) > 12.25,
    );
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
  return (
    <group>
      {specs.map((spec, index) => (
        <group
          ref={(node) => {
            vehicles.current[index] = node;
          }}
          key={`${spec.model}-${spec.phase}`}
        >
          <Suspense fallback={null}>
            <StaticAsset
              url={`${CAR_ASSET_ROOT}/${spec.model}.glb`}
              scale={0.85}
              shadows={false}
            />
          </Suspense>
        </group>
      ))}
    </group>
  );
}

function CityTraffic() {
  return (
    <group>
      <TrafficConvoy
        curve={LEFT_CITY_TRAFFIC_CURVE}
        slotOffset={0}
        vehicles={[
          { model: 'sedan', phase: 0 },
          { model: 'taxi', phase: 0.5 },
        ]}
      />
      <TrafficConvoy
        curve={RIGHT_CITY_TRAFFIC_CURVE}
        slotOffset={2}
        initialProgress={0.25}
        vehicles={[
          { model: 'delivery', phase: 0 },
          { model: 'race-future', phase: 0.5 },
        ]}
      />
    </group>
  );
}

type VillaStyle =
  | 'CHINESE'
  | 'ENGLISH'
  | 'AMERICAN'
  | 'CONCRETE'
  | 'WHITEWOOD'
  | 'PASTORAL'
  | 'CYBER';

const VILLA_STYLE_MODELS: Record<
  VillaStyle,
  { model: string; scale: number; accent: string }
> = {
  CHINESE: { model: 'building-type-p.glb', scale: 2.65, accent: '#d5aa72' },
  ENGLISH: { model: 'building-type-d.glb', scale: 2.55, accent: '#bba487' },
  AMERICAN: { model: 'building-type-b.glb', scale: 2.6, accent: '#63cbd1' },
  CONCRETE: { model: 'building-type-q.glb', scale: 2.7, accent: '#acb4ae' },
  WHITEWOOD: { model: 'building-type-t.glb', scale: 2.65, accent: '#dfb070' },
  PASTORAL: { model: 'building-type-e.glb', scale: 2.6, accent: '#b7cf83' },
  CYBER: { model: 'building-type-u.glb', scale: 2.8, accent: '#52f2dc' },
};

function CatalogVilla({
  id,
  name,
  style,
  position,
  rotation,
  onEnter,
}: {
  id: string;
  name: string;
  style: VillaStyle;
  position: [number, number, number];
  rotation: number;
  onEnter: EnterPlace;
}) {
  const asset = VILLA_STYLE_MODELS[style];
  const isCyber = style === 'CYBER';
  const hasPool = ['AMERICAN', 'CONCRETE', 'WHITEWOOD', 'CYBER'].includes(
    style,
  );
  return (
    <group
      position={position}
      rotation={[0, rotation, 0]}
      onClick={() => onEnter('villa', 'ridge')}
    >
      <mesh receiveShadow position={[0, 0.055, 0]}>
        <boxGeometry args={[11.8, 0.11, 11]} />
        <meshStandardMaterial
          color={style === 'PASTORAL' ? '#607354' : '#77786f'}
          roughness={0.96}
        />
      </mesh>
      <Suspense fallback={null}>
        <StaticAsset
          url={`${SUBURBAN_ASSET_ROOT}/${asset.model}`}
          position={[0, 0.11, -0.7]}
          scale={asset.scale}
        />
      </Suspense>
      {style === 'CHINESE' && (
        <>
          <mesh position={[0, 1.05, 3.7]}>
            <boxGeometry args={[8.6, 0.13, 0.18]} />
            <meshStandardMaterial color="#382a22" roughness={0.74} />
          </mesh>
          {[-4.2, 4.2].map((x) => (
            <mesh key={x} castShadow position={[x, 1.15, 1.2]}>
              <boxGeometry args={[0.22, 2.3, 5.3]} />
              <meshStandardMaterial color="#efe8da" roughness={0.82} />
            </mesh>
          ))}
          <mesh position={[0, 0.12, 2.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.7, 2.2]} />
            <meshPhysicalMaterial
              color="#315f68"
              transparent
              opacity={0.82}
              roughness={0.16}
            />
          </mesh>
        </>
      )}
      {style === 'ENGLISH' && (
        <>
          {[-2.3, 2.25].map((x) => (
            <mesh key={x} castShadow position={[x, 4.9, -1.4]}>
              <boxGeometry args={[0.6, 2.8, 0.6]} />
              <meshStandardMaterial color="#665247" roughness={0.9} />
            </mesh>
          ))}
        </>
      )}
      {style === 'CONCRETE' && (
        <mesh castShadow position={[0, 1.65, 2.9]}>
          <boxGeometry args={[7.7, 2.8, 0.4]} />
          <meshStandardMaterial color="#999e99" roughness={0.98} />
        </mesh>
      )}
      {(style === 'WHITEWOOD' || isCyber) && (
        <>
          {[-3.5, -2.3, -1.1, 1.1, 2.3, 3.5].map((x) => (
            <mesh key={x} position={[x, 2.25, 3.35]}>
              <boxGeometry args={[0.12, 4.4, 0.22]} />
              <meshStandardMaterial
                color={isCyber ? '#5ff4df' : '#9b6b3f'}
                emissive={isCyber ? '#2ddfca' : '#000000'}
                emissiveIntensity={isCyber ? 0.5 : 0}
              />
            </mesh>
          ))}
        </>
      )}
      {hasPool && (
        <mesh position={[3.5, 0.14, -3.7]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[3.6, 2.35]} />
          <meshPhysicalMaterial
            color="#57b9d0"
            transmission={0.28}
            transparent
            opacity={0.86}
            roughness={0.12}
          />
        </mesh>
      )}
      <pointLight
        position={[0, 2.8, 2.8]}
        intensity={isCyber ? 1.1 : 0.45}
        distance={8}
        color={asset.accent}
      />
      <Html
        position={[0, 7.4, 0]}
        center
        distanceFactor={14}
        zIndexRange={[3, 0]}
      >
        <button
          className={`world-label enterable residential-label ${isCyber ? 'prestige' : ''}`}
          onClick={(event) => {
            event.stopPropagation();
            onEnter('villa', 'ridge');
          }}
        >
          {id} · {name}
        </button>
      </Html>
    </group>
  );
}

function AzureYachtMarinaScene({
  onEnter,
  onPositionChange,
  playerEnabled = true,
  playerSpawn,
  playerHeading,
  embedded = false,
}: {
  onEnter: EnterPlace;
  onPositionChange?: (location: PlayerLocation) => void;
  playerEnabled?: boolean;
  playerSpawn?: [number, number, number];
  playerHeading?: number;
  embedded?: boolean;
}) {
  return (
    <>
      {!embedded && (
        <mesh receiveShadow position={[-28, -0.18, 0]}>
          <boxGeometry args={[56, 0.3, 96]} />
          <meshPhysicalMaterial
            color="#197d9e"
            roughness={0.09}
            metalness={0.08}
            transmission={0.16}
            transparent
            opacity={0.94}
            clearcoat={0.62}
          />
        </mesh>
      )}
      {!embedded && (
        <AnimatedWaterSurface position={[-28, -0.005, 0]} size={[56, 96]} />
      )}
      <mesh receiveShadow position={[-4.5, 0.015, 0]}>
        <boxGeometry args={[11, 0.08, 84]} />
        <DeckSurfaceMaterial width={11} length={84} />
      </mesh>
      <mesh receiveShadow position={[4, 0.035, 0]}>
        <boxGeometry args={[6, 0.1, 84]} />
        <meshStandardMaterial color="#c7c1b0" roughness={0.88} />
      </mesh>
      <mesh receiveShadow position={[21, 0.015, 0]}>
        <boxGeometry args={[28, 0.08, 84]} />
        <meshStandardMaterial color="#6d7868" roughness={0.96} />
      </mesh>
      {!embedded && (
        <ArrivalSpine
          tone="MARINA"
          position={[4, 0.02, 1]}
          length={66}
          width={5.8}
        />
      )}
      <WaterfrontRailing x={0.35} length={72} />
      <group scale={0.62}>
        <MarinaHotelDistrict
          id="AZURE-BAY-HOTEL-MARINA"
          rotationY={-Math.PI / 2}
          hotelCount={6}
          berthCount={18}
          seed={811}
          onEnter={() => onEnter('marina', 'yacht-marina')}
        />
      </group>
      {[-24, -8, 8, 24].map((z) => (
        <group key={z} position={[-4.5, 0.12, z]}>
          {[-8, -4, 0].map((x) => (
            <Suspense fallback={null} key={x}>
              <StaticAsset
                url={`${NATURE_ASSET_ROOT}/bridge_center_wood.glb`}
                position={[x, 0, 0]}
                rotation={[0, Math.PI / 2, 0]}
                scale={3.1}
                shadows={false}
              />
            </Suspense>
          ))}
        </group>
      ))}
      <FloatingWatercraft
        model="boat-sail-a"
        position={[-22, 0.08, -17]}
        rotation={Math.PI / 2}
        scale={3.4}
        phase={1}
      />
      <FloatingWatercraft
        model="boat-speed-a"
        position={[-22, 0.08, 5.5]}
        rotation={Math.PI / 2}
        scale={4.05}
        phase={2}
      />
      <FloatingWatercraft
        model="boat-speed-f"
        position={[-30, 0.08, -6]}
        rotation={Math.PI / 2}
        scale={5.85}
        phase={3}
      />
      <FloatingWatercraft
        model="boat-speed-f"
        position={[-29, 0.08, -29]}
        rotation={Math.PI / 2}
        scale={6.35}
        phase={3.6}
      />
      <FloatingWatercraft
        model="boat-fishing-small"
        position={[-28, 0.08, 13.5]}
        rotation={Math.PI / 2}
        scale={3}
        phase={4}
      />
      <FloatingWatercraft
        model="ship-large"
        position={[-40, 0.08, -42]}
        rotation={Math.PI / 2}
        scale={1.86}
        phase={5}
        shadows={false}
      />
      <FloatingWatercraft
        model="ship-ocean-liner-small"
        position={[-40.5, 0.06, 22.5]}
        rotation={Math.PI / 2}
        scale={2}
        phase={6}
        shadows={false}
      />
      <Suspense fallback={null}>
        <StaticAsset
          url={`${COMMERCIAL_ASSET_ROOT}/building-h.glb`}
          position={[23, 0.1, -15]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={3.4}
        />
        <StaticAsset
          url={`${COMMERCIAL_ASSET_ROOT}/building-j.glb`}
          position={[25, 0.1, 14]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={3.1}
        />
        {[-19, -16, -13].map((z) => (
          <StaticAsset
            key={z}
            url={`${COMMERCIAL_ASSET_ROOT}/detail-parasol-a.glb`}
            position={[15, 0.12, z]}
            scale={2.1}
            shadows={false}
          />
        ))}
      </Suspense>
      <LandmarkLabel
        position={[-10, 4.3, -17]}
        label="SAI-C42 · 42 FT SAILING YACHT"
        place="marina"
        atlasId="yacht-marina"
        onEnter={onEnter}
        tone="marina-label"
      />
      <LandmarkLabel
        position={[-10, 4.3, 5.5]}
        label="YHT-A45 · 45 FT SPORT CRUISER"
        place="marina"
        atlasId="yacht-marina"
        onEnter={onEnter}
        tone="marina-label"
      />
      <LandmarkLabel
        position={[-11, 5.1, -6]}
        label="YHT-A55 · 55 FT FLYBRIDGE"
        place="marina"
        atlasId="yacht-marina"
        onEnter={onEnter}
        tone="marina-label"
      />
      <LandmarkLabel
        position={[-11, 5.1, -29]}
        label="YHT-A60 · 60 FT OPEN YACHT"
        place="marina"
        atlasId="yacht-marina"
        onEnter={onEnter}
        tone="marina-label"
      />
      <LandmarkLabel
        position={[-11, 4.5, 13.5]}
        label="FSH-B38 · 38 FT SPORT FISHER"
        place="marina"
        atlasId="yacht-marina"
        onEnter={onEnter}
        tone="marina-label"
      />
      <LandmarkLabel
        position={[-19, 6.1, -32]}
        label="YHT-A80 · 80 FT SKYLOUNGE"
        place="marina"
        atlasId="yacht-marina"
        onEnter={onEnter}
        tone="marina-label"
      />
      <LandmarkLabel
        position={[-19, 6.1, 22.5]}
        label="YHT-A100 · 100+ FT FLAGSHIP"
        place="marina"
        atlasId="yacht-marina"
        onEnter={onEnter}
        tone="marina-label"
      />
      <LandmarkLabel
        position={[23, 7.2, -15]}
        label="AZURE YACHT CLUB"
        place="marina"
        atlasId="yacht-marina"
        onEnter={onEnter}
        tone="marina-label"
      />
      <LandmarkLabel
        position={[14, 8.8, 5]}
        label="AZURE BAY YACHT HOTEL · PUBLIC PROMENADE"
        place="marina"
        atlasId="N-AZU-01"
        onEnter={onEnter}
        tone="marina-label"
      />
      {!embedded && (
        <group position={[8, 0, 28]} rotation={[0, Math.PI, 0]} scale={0.52}>
          <MetroEntrance
            id="M2-A"
            name="Azure Harbor Entrance A"
            lineColor="#2381bd"
            onEnter={() => onEnter('map')}
          />
        </group>
      )}
      <WayfindingPylon
        position={[13, 0.08, 28]}
        label="MAP · CBD · RESIDENCES"
        onEnter={onEnter}
        accent="#8deaff"
      />
      {!embedded && <PopulationLayer count={22} position={[4, 0, 10]} />}
      {!embedded && (
        <Player
          scene="AZURE_YACHT_MARINA"
          onPositionChange={onPositionChange}
          enabled={playerEnabled}
          spawnOverride={playerSpawn}
          headingOverride={playerHeading}
        />
      )}
    </>
  );
}

function CrownResidentialScene({
  onEnter,
  onPositionChange,
  playerEnabled = true,
  playerSpawn,
  playerHeading,
  embedded = false,
}: {
  onEnter: EnterPlace;
  onPositionChange?: (location: PlayerLocation) => void;
  playerEnabled?: boolean;
  playerSpawn?: [number, number, number];
  playerHeading?: number;
  embedded?: boolean;
}) {
  return (
    <>
      {!embedded && (
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[72, 74]} />
          <meshStandardMaterial color="#7d8378" roughness={0.74} />
        </mesh>
      )}
      <mesh
        receiveShadow
        position={[0, 0.035, 5]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[25, 45]} />
        <meshPhysicalMaterial
          color="#c7c3b8"
          metalness={0.22}
          roughness={0.3}
          clearcoat={0.45}
        />
      </mesh>
      {!embedded && (
        <mesh
          receiveShadow
          position={[0, 0.02, -32]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[72, 18]} />
          <meshPhysicalMaterial
            color="#288ca7"
            roughness={0.12}
            transparent
            opacity={0.88}
          />
        </mesh>
      )}
      <SciFiResidenceTower
        position={[-15, 0, -10]}
        variant="HELIX"
        label="BLD-A01 · HELIX ONE"
        onEnter={onEnter}
      />
      <SciFiResidenceTower
        position={[0, 0, -15]}
        variant="PRISM"
        label="BLD-A02 · PRISM HOUSE"
        onEnter={onEnter}
      />
      <SciFiResidenceTower
        position={[15, 0, -10]}
        variant="BRIDGE"
        label="BLD-A03 · SKYBRIDGE"
        onEnter={onEnter}
      />
      {!embedded && (
        <ArrivalSpine
          tone="CROWN"
          position={[0, 0.02, 8]}
          length={44}
          width={18}
        />
      )}
      <mesh
        receiveShadow
        position={[0, 0.2, 7]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[5.2, 48]} />
        <meshPhysicalMaterial
          color="#50bfd0"
          transmission={0.32}
          transparent
          opacity={0.86}
          roughness={0.1}
        />
      </mesh>
      {[-5, -2.5, 2.5, 5].flatMap((x) =>
        [-1, 14].map((z) => (
          <ParkTree key={`${x}-${z}`} position={[x, 0.06, z]} scale={1.1} />
        )),
      )}
      <LandmarkLabel
        position={[0, 4.4, 7]}
        label="RESIDENT SKY POOL · SEA VIEW"
        place="residences"
        atlasId="crown-residences"
        onEnter={onEnter}
        tone="residential-label"
      />
      <WayfindingPylon
        position={[-11, 0.08, 24]}
        label="MAP · MARINA · RIDGE"
        onEnter={onEnter}
        accent="#ffd598"
      />
      {!embedded && <PopulationLayer count={24} position={[0, 0, 14]} />}
      {!embedded && (
        <Player
          scene="CROWN_RESIDENTIAL_TOWERS"
          onPositionChange={onPositionChange}
          enabled={playerEnabled}
          spawnOverride={playerSpawn}
          headingOverride={playerHeading}
        />
      )}
    </>
  );
}

function MillionaireRidgeScene({
  onEnter,
  onPositionChange,
  playerEnabled = true,
  playerSpawn,
  playerHeading,
  embedded = false,
}: {
  onEnter: EnterPlace;
  onPositionChange?: (location: PlayerLocation) => void;
  playerEnabled?: boolean;
  playerSpawn?: [number, number, number];
  playerHeading?: number;
  embedded?: boolean;
}) {
  const villas = [
    {
      id: 'BLD-B01',
      name: 'HUA COURT',
      style: 'CHINESE' as const,
      position: [-15, 0, 18] as [number, number, number],
      rotation: Math.PI / 2,
    },
    {
      id: 'BLD-B02',
      name: 'COTSWOLD HOUSE',
      style: 'ENGLISH' as const,
      position: [15, 0, 18] as [number, number, number],
      rotation: -Math.PI / 2,
    },
    {
      id: 'BLD-B03',
      name: 'PACIFIC TERRACE',
      style: 'AMERICAN' as const,
      position: [-15, 0, 2] as [number, number, number],
      rotation: Math.PI / 2,
    },
    {
      id: 'BLD-B04',
      name: 'ATLAS CONCRETE',
      style: 'CONCRETE' as const,
      position: [15, 0, 2] as [number, number, number],
      rotation: -Math.PI / 2,
    },
    {
      id: 'BLD-B05',
      name: 'WHITEWOOD HOUSE',
      style: 'WHITEWOOD' as const,
      position: [-15, 0, -14] as [number, number, number],
      rotation: Math.PI / 2,
    },
    {
      id: 'BLD-B06',
      name: 'MEADOW HOUSE',
      style: 'PASTORAL' as const,
      position: [15, 0, -14] as [number, number, number],
      rotation: -Math.PI / 2,
    },
    {
      id: 'BLD-B07',
      name: 'NEON CLIFF HOUSE',
      style: 'CYBER' as const,
      position: [0, 0, -31] as [number, number, number],
      rotation: 0,
    },
  ];
  return (
    <>
      {!embedded && (
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[84, 94]} />
          <meshStandardMaterial color="#687b60" roughness={0.76} />
        </mesh>
      )}
      {!embedded && (
        <>
          <mesh
            receiveShadow
            position={[0, 0.035, 8]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[9, 66]} />
            <meshPhysicalMaterial
              color="#343b3b"
              metalness={0.24}
              roughness={0.44}
              clearcoat={0.35}
            />
          </mesh>
          {[-6.1, 6.1].map((x) => (
            <mesh
              key={x}
              receiveShadow
              position={[x, 0.045, 8]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[2.1, 66]} />
              <meshStandardMaterial color="#bbb8aa" roughness={0.9} />
            </mesh>
          ))}
          {[-22, -6, 10, 26].map((z) => (
            <mesh
              key={z}
              receiveShadow
              position={[0, 0.04, z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[70, 5]} />
              <meshStandardMaterial color="#393f3e" roughness={0.94} />
            </mesh>
          ))}
          {[-22, -6, 10, 26].flatMap((z) =>
            [-20, -12, 12, 20].map((x) => (
              <mesh
                key={`${x}-${z}`}
                position={[x, 0.06, z]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[3.2, 0.08]} />
                <meshBasicMaterial color="#d8c979" />
              </mesh>
            )),
          )}
          <ArrivalSpine
            tone="RIDGE"
            position={[0, 0.02, 8]}
            length={66}
            width={8.5}
          />
        </>
      )}
      <RidgeTerraces />
      <group position={[-30, 0, 18]} scale={0.32}>
        <ResidentialQuarter
          id="N-RDG-01"
          tier="UPGRADE"
          typology="TOWNHOMES"
          count={6}
          footprint={[28, 44]}
          seed={607}
          onEnter={() => onEnter('residences', 'N-RDG-01')}
        />
      </group>
      <group position={[30, 0, 18]} scale={0.32}>
        <ResidentialQuarter
          id="N-RDG-02"
          tier="PREMIUM"
          typology="SEMI_DETACHED"
          count={5}
          footprint={[28, 44]}
          seed={709}
          onEnter={() => onEnter('residences', 'N-RDG-02')}
        />
      </group>
      <LandmarkLabel
        position={[-30, 5.2, 18]}
        label="N-RDG-01 · CEDAR GATE ROWS"
        place="residences"
        atlasId="N-RDG-01"
        onEnter={onEnter}
        tone="residential-label"
      />
      <LandmarkLabel
        position={[30, 5.5, 18]}
        label="N-RDG-02 · TWIN OAK COMMONS"
        place="residences"
        atlasId="N-RDG-02"
        onEnter={onEnter}
        tone="residential-label"
      />
      {villas.map((villa) => (
        <CatalogVilla key={villa.id} {...villa} onEnter={onEnter} />
      ))}
      <Suspense fallback={null}>
        {([-7.2, 7.2] as const).flatMap((x) =>
          [-24, -8, 8, 24, 34].map((z) => (
            <StaticAsset
              key={`${x}-${z}`}
              url={`${ROAD_ASSET_ROOT}/light-square.glb`}
              position={[x, 0.06, z]}
              scale={3.15}
              shadows={false}
            />
          )),
        )}
        {([-29, 29] as const).flatMap((x) =>
          [-20, 0, 20].map((z) => (
            <StaticAsset
              key={`${x}-${z}`}
              url={`${NATURE_ASSET_ROOT}/${z === 0 ? 'tree_oak.glb' : 'tree_detailed.glb'}`}
              position={[x, 0.05, z]}
              scale={3.1}
              shadows={false}
            />
          )),
        )}
        {!embedded && (
          <StaticAsset
            url={`${CAR_ASSET_ROOT}/sedan.glb`}
            position={[-2.1, 0.12, 18]}
            scale={0.88}
            shadows={false}
          />
        )}
        {!embedded && (
          <StaticAsset
            url={`${CAR_ASSET_ROOT}/suv-luxury.glb`}
            position={[2.1, 0.12, 5]}
            rotation={[0, Math.PI, 0]}
            scale={0.92}
            shadows={false}
          />
        )}
        {!embedded && (
          <StaticAsset
            url={`${CAR_ASSET_ROOT}/race-future.glb`}
            position={[-2.1, 0.12, -13]}
            scale={0.92}
            shadows={false}
          />
        )}
      </Suspense>
      <WayfindingPylon
        position={[-6.2, 0.08, 30]}
        label="VILLA DIRECTORY · MAP"
        onEnter={onEnter}
        accent="#ffd598"
      />
      {!embedded && <PopulationLayer count={14} position={[0, 0, 15]} />}
      {!embedded && (
        <Player
          scene="MILLIONAIRE_RIDGE"
          onPositionChange={onPositionChange}
          enabled={playerEnabled}
          spawnOverride={playerSpawn}
          headingOverride={playerHeading}
        />
      )}
    </>
  );
}

function StudioInterior({
  onEnter,
  onPositionChange,
  playerEnabled = true,
}: {
  onEnter: EnterPlace;
  onPositionChange?: (location: PlayerLocation) => void;
  playerEnabled?: boolean;
}) {
  return (
    <>
      <fog attach="fog" args={['#171816', 15, 36]} />
      <ambientLight intensity={0.72} color="#ffe2c1" />
      <directionalLight
        castShadow
        position={[-5, 9, 6]}
        intensity={1.8}
        color="#ffd19a"
      />
      <pointLight
        position={[2.3, 2.7, -1.4]}
        intensity={1.15}
        distance={9}
        color="#65d8ff"
      />
      <mesh receiveShadow position={[0, -0.04, 0]}>
        <boxGeometry args={[8.8, 0.08, 9.2]} />
        <meshStandardMaterial color="#655f55" roughness={0.92} />
      </mesh>
      <mesh receiveShadow position={[-4.25, 2.2, 0]}>
        <boxGeometry args={[0.18, 4.4, 9.2]} />
        <meshStandardMaterial color="#d9d0c1" roughness={0.84} />
      </mesh>
      <mesh receiveShadow position={[4.25, 2.2, 0]}>
        <boxGeometry args={[0.18, 4.4, 9.2]} />
        <meshStandardMaterial color="#d9d0c1" roughness={0.84} />
      </mesh>
      <mesh receiveShadow position={[0, 2.2, -4.45]}>
        <boxGeometry args={[8.7, 4.4, 0.18]} />
        <meshStandardMaterial color="#cfc6b6" roughness={0.82} />
      </mesh>
      <mesh position={[0, 2.5, -4.34]}>
        <planeGeometry args={[4.9, 2.5]} />
        <meshStandardMaterial
          color="#3f7894"
          emissive="#e78b55"
          emissiveIntensity={0.32}
          metalness={0.4}
          roughness={0.22}
        />
      </mesh>
      {[-1.8, -0.7, 0.45, 1.55].map((x, index) => (
        <mesh key={x} position={[x, 1.25 + index * 0.18, -4.18]}>
          <boxGeometry args={[0.62, 1.4 + index * 0.36, 0.16]} />
          <meshStandardMaterial
            color="#253237"
            emissive="#d56e49"
            emissiveIntensity={0.18}
          />
        </mesh>
      ))}
      <group position={[-2.65, 0, -0.8]}>
        <mesh castShadow position={[0, 0.32, 0]}>
          <boxGeometry args={[1.9, 0.5, 3.7]} />
          <meshStandardMaterial color="#3b3e3a" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.61, -0.5]}>
          <boxGeometry args={[1.75, 0.18, 2.45]} />
          <meshStandardMaterial color="#8f9b8c" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.72, 1.1]}>
          <boxGeometry args={[1.55, 0.28, 0.72]} />
          <meshStandardMaterial color="#c5b8a1" roughness={1} />
        </mesh>
      </group>
      <group position={[2.5, 0, -1.35]}>
        <mesh castShadow position={[0, 0.8, 0]}>
          <boxGeometry args={[2.15, 0.12, 1.15]} />
          <meshStandardMaterial color="#4a382b" roughness={0.72} />
        </mesh>
        {[-0.83, 0.83].map((x) => (
          <mesh key={x} position={[x, 0.4, 0]}>
            <boxGeometry args={[0.1, 0.8, 0.9]} />
            <meshStandardMaterial color="#332b26" />
          </mesh>
        ))}
        <mesh position={[0, 1.65, -0.35]} rotation={[-0.1, 0, 0]}>
          <boxGeometry args={[1.55, 1.05, 0.1]} />
          <meshStandardMaterial
            color="#071514"
            emissive="#42f5af"
            emissiveIntensity={0.38}
            metalness={0.65}
          />
        </mesh>
        <Html
          position={[0, 2.45, 0]}
          center
          distanceFactor={10}
          zIndexRange={[3, 0]}
        >
          <button
            className="world-label enterable"
            onClick={() => onEnter('wellness')}
          >
            HOME LIFE · FOOD &amp; CARE
          </button>
        </Html>
      </group>
      <group position={[2.65, 0, 2.3]}>
        <mesh castShadow position={[0, 1, 0]}>
          <boxGeometry args={[1.35, 2, 1.05]} />
          <meshStandardMaterial color="#817a6d" roughness={0.78} />
        </mesh>
        <mesh position={[-0.34, 1, 0.54]}>
          <boxGeometry args={[0.05, 1.68, 0.04]} />
          <meshStandardMaterial color="#b8ad9a" />
        </mesh>
      </group>
      <group position={[0, 0, 4.15]} onClick={() => onEnter(null)}>
        <mesh position={[0, 1.25, 0]}>
          <boxGeometry args={[1.55, 2.5, 0.16]} />
          <meshStandardMaterial color="#292b28" roughness={0.7} />
        </mesh>
        <Html
          position={[0, 3.05, 0]}
          center
          distanceFactor={10}
          zIndexRange={[3, 0]}
        >
          <button
            className="world-label enterable residence-label"
            onClick={() => onEnter(null)}
          >
            EXIT TO COURTYARD
          </button>
        </Html>
      </group>
      <Html
        position={[-2.8, 3.6, -4.05]}
        center
        distanceFactor={11}
        zIndexRange={[3, 0]}
      >
        <span className="zone-label">
          10 m² LEGAL FOOTPRINT · 2.1× NAVIGATION SCALE
        </span>
      </Html>
      <Player
        scene="STUDIO_INTERIOR"
        onPositionChange={onPositionChange}
        enabled={playerEnabled}
        cameraOcclusionPredicate={isStudioCameraPointOccluded}
      />
      <Environment preset="apartment" />
    </>
  );
}

function GroundRoadSegment({
  from,
  to,
  width = 7.2,
  accent = '#d8ca7c',
}: {
  from: [number, number];
  to: [number, number];
  width?: number;
  accent?: string;
}) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  const rotation = Math.atan2(dx, dz);
  return (
    <group
      position={[(from[0] + to[0]) / 2, 0, (from[1] + to[1]) / 2]}
      rotation={[0, rotation, 0]}
    >
      <mesh receiveShadow position={[0, 0.055, 0]}>
        <boxGeometry args={[width, 0.11, length]} />
        <meshStandardMaterial color="#293033" roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (width / 2 - 0.25), 0.125, 0]}>
          <boxGeometry args={[0.09, 0.025, Math.max(0.1, length - 0.7)]} />
          <meshBasicMaterial color={accent} />
        </mesh>
      ))}
    </group>
  );
}

function DistrictApproachGateway({
  position,
  rotation,
  label,
  accent,
  onEnter,
}: {
  position: [number, number, number];
  rotation: number;
  label: string;
  accent: string;
  onEnter: EnterPlace;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh receiveShadow position={[0, 0.07, 0]}>
        <boxGeometry args={[12.6, 0.14, 20]} />
        <meshStandardMaterial color="#323b3b" roughness={0.82} />
      </mesh>
      {[-5, 5].map((x) => (
        <group key={`gate-${x}`} position={[x, 0, 0]}>
          <mesh castShadow receiveShadow position={[0, 2.8, 0]}>
            <boxGeometry args={[0.72, 5.6, 0.92]} />
            <meshPhysicalMaterial
              color="#d9d9cf"
              metalness={0.26}
              roughness={0.3}
              clearcoat={0.38}
            />
          </mesh>
          <mesh position={[0, 4.42, 0.5]}>
            <boxGeometry args={[0.45, 1.25, 0.06]} />
            <meshBasicMaterial
              color={accent}
              toneMapped={false}
              transparent
              opacity={0.78}
            />
          </mesh>
        </group>
      ))}
      <mesh castShadow position={[0, 5.32, 0]}>
        <boxGeometry args={[10.7, 0.58, 1.05]} />
        <meshPhysicalMaterial
          color="#d9d9cf"
          metalness={0.28}
          roughness={0.28}
          clearcoat={0.42}
        />
      </mesh>
      <mesh position={[0, 5.34, 0.56]}>
        <boxGeometry args={[7.8, 0.18, 0.05]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      {[-1, 1].flatMap((side) =>
        [-7.4, -2.9, 3.2, 7.7].map((z, index) => (
          <group key={`${side}-${z}`} position={[side * 7.05, 0, z]}>
            <mesh receiveShadow position={[0, 0.28, 0]}>
              <boxGeometry args={[2, 0.56, 1.25]} />
              <meshStandardMaterial color="#d1d3ca" roughness={0.5} />
            </mesh>
            <ParkTree position={[0, 0.56, 0]} scale={0.78 + index * 0.04} />
          </group>
        )),
      )}
      <WayfindingPylon
        position={[-6.1, 0.1, -6.2]}
        label={label}
        onEnter={onEnter}
        accent={accent}
      />
    </group>
  );
}

function CBDEdgeApproaches({ onEnter }: { onEnter: EnterPlace }) {
  return (
    <group>
      <GroundRoadSegment
        from={[0, -58]}
        to={[-33, -58]}
        width={7.6}
        accent="#75e6f4"
      />
      <GroundRoadSegment
        from={[-33, -58]}
        to={[-34, -42]}
        width={6.4}
        accent="#75e6f4"
      />
      <DistrictApproachGateway
        position={[-33, 0, -58]}
        rotation={Math.PI / 2}
        label="AZURE WATERFRONT · DISTRICT MAP"
        accent="#75e6f4"
        onEnter={onEnter}
      />

      <GroundRoadSegment
        from={[0, 53]}
        to={[63, 55]}
        width={8.2}
        accent="#f2cf91"
      />
      <GroundRoadSegment
        from={[63, 55]}
        to={[69, 39]}
        width={7.2}
        accent="#f2cf91"
      />
      <DistrictApproachGateway
        position={[63, 0, 55]}
        rotation={Math.PI / 2}
        label="MILLIONAIRE RIDGE · DISTRICT MAP"
        accent="#f2cf91"
        onEnter={onEnter}
      />

      <DistrictApproachGateway
        position={[0, 0, -69]}
        rotation={0}
        label="CROWN TOWERS · NORTH CITY LINK"
        accent="#bba1ff"
        onEnter={onEnter}
      />

      <GroundRoadSegment
        from={[37, -8]}
        to={[37, 5]}
        width={5.4}
        accent="#71f2c4"
      />
    </group>
  );
}

function MetropolitanResidentialFabric({ onEnter }: { onEnter: EnterPlace }) {
  return (
    <group name="Metropolitan residential shell districts">
      <group position={[-48, 0, 58]} scale={0.48}>
        <ResidentialQuarter
          id="N-RIV-01"
          tier="MID_MARKET"
          typology="TOWERS"
          count={10}
          footprint={[44, 38]}
          seed={101}
          onEnter={() => onEnter('residences', 'N-RIV-01')}
        />
      </group>
      <LandmarkLabel
        position={[-48, 9.2, 58]}
        label="N-RIV-01 · NORTHBANK GLASSWORKS"
        place="residences"
        atlasId="N-RIV-01"
        onEnter={onEnter}
        tone="residential-label"
      />

      <group position={[54, 0, 68]} scale={0.46}>
        <ResidentialQuarter
          id="N-EAS-03"
          tier="UPGRADE"
          typology="TOWERS"
          count={9}
          footprint={[46, 40]}
          seed={203}
          onEnter={() => onEnter('residences', 'N-EAS-03')}
        />
      </group>
      <LandmarkLabel
        position={[54, 11.4, 68]}
        label="N-EAS-03 · MAGNOLIA PARK"
        place="residences"
        atlasId="N-EAS-03"
        onEnter={onEnter}
        tone="residential-label"
      />

      <group position={[60, 0, 7]} scale={0.43}>
        <ResidentialQuarter
          id="N-MER-01"
          tier="MID_MARKET"
          typology="MIXED"
          count={8}
          footprint={[42, 40]}
          seed={307}
          onEnter={() => onEnter('residences', 'N-MER-01')}
        />
      </group>
      <LandmarkLabel
        position={[60, 8.8, 7]}
        label="N-MER-01 · MERIDIAN QUARTER"
        place="residences"
        atlasId="N-MER-01"
        onEnter={onEnter}
        tone="residential-label"
      />

      <group position={[-53, 0, -59]} scale={0.45}>
        <ResidentialQuarter
          id="N-CAN-02"
          tier="AFFORDABLE"
          typology="TOWERS"
          count={11}
          footprint={[45, 40]}
          seed={409}
          onEnter={() => onEnter('residences', 'N-CAN-02')}
        />
      </group>
      <LandmarkLabel
        position={[-53, 8, -59]}
        label="N-CAN-02 · LANTERN LANE"
        place="residences"
        atlasId="N-CAN-02"
        onEnter={onEnter}
        tone="residential-label"
      />

      <group position={[51, 0, -59]} scale={0.44}>
        <ResidentialQuarter
          id="N-CBD-03"
          tier="PREMIUM"
          typology="TOWERS"
          count={7}
          footprint={[43, 39]}
          seed={503}
          onEnter={() => onEnter('residences', 'N-CBD-03')}
        />
      </group>
      <LandmarkLabel
        position={[51, 14.8, -59]}
        label="N-CBD-03 · FORUM SKY GARDENS"
        place="residences"
        atlasId="N-CBD-03"
        onEnter={onEnter}
        tone="residential-label"
      />
    </group>
  );
}

function CyberCBD({
  onEnter,
  onPositionChange,
  playerEnabled = true,
  playerSpawn,
  playerHeading,
  embedded = false,
}: {
  onEnter: EnterPlace;
  onPositionChange?: (location: PlayerLocation) => void;
  playerEnabled?: boolean;
  playerSpawn?: [number, number, number];
  playerHeading?: number;
  embedded?: boolean;
}) {
  const streetLights = [-68, -52, -36, -20, -4, 12, 28, 44, 60, 72];
  const crossStreets = [-58, -8, 19, 53];
  return (
    <>
      {!embedded && (
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[160, 160]} />
          <meshStandardMaterial color="#74796f" roughness={0.76} />
        </mesh>
      )}
      {!embedded && (
        <>
          <mesh
            receiveShadow
            position={[0, 0.018, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[18.8, 154]} />
            <meshPhysicalMaterial
              color="#aaa79e"
              metalness={0.26}
              roughness={0.28}
              clearcoat={0.48}
              clearcoatRoughness={0.24}
            />
          </mesh>
          {[-12.65, 12.65].map((x) => (
            <mesh
              key={x}
              receiveShadow
              position={[x, 0.025, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[7.4, 154]} />
              <meshStandardMaterial color="#272e30" roughness={0.78} />
            </mesh>
          ))}
          {[-9.75, 9.75].map((x) => (
            <mesh
              key={x}
              position={[x, 0.046, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[0.74, 152]} />
              <meshStandardMaterial
                color="#318e9b"
                metalness={0.18}
                roughness={0.22}
                transparent
                opacity={0.88}
              />
            </mesh>
          ))}
          {crossStreets.map((z) => (
            <group key={z}>
              <mesh
                receiveShadow
                position={[0, 0.031, z]}
                rotation={[-Math.PI / 2, 0, 0]}
              >
                <planeGeometry args={[150, 7.2]} />
                <meshStandardMaterial color="#2a3032" roughness={0.96} />
              </mesh>
              {streetLights.map((x) => (
                <mesh
                  key={x}
                  position={[x, 0.052, z]}
                  rotation={[-Math.PI / 2, 0, 0]}
                >
                  <planeGeometry args={[6.1, 0.09]} />
                  <meshBasicMaterial color="#ddc878" />
                </mesh>
              ))}
            </group>
          ))}
        </>
      )}

      {!embedded && (
        <GrandRiverSystem
          position={[0, 0.035, 38]}
          rotationY={Math.PI / 2}
          length={150}
          width={12}
          bridgeCount={5}
        />
      )}
      {!embedded && (
        <GroundRoadSegment
          from={[-29.25, -77]}
          to={[-29.25, 77]}
          width={6.8}
          accent="#8fdce5"
        />
      )}
      {!embedded && (
        <GroundRoadSegment
          from={[29.25, -77]}
          to={[29.25, 77]}
          width={6.8}
          accent="#8fdce5"
        />
      )}
      <LandmarkLabel
        position={[-20, 4.2, 38]}
        label="GRAND RIVER · CONTINUOUS PUBLIC WATERFRONT"
        place="map"
        onEnter={onEnter}
        tone="marina-label"
      />

      {!embedded && (
        <group position={[-7.5, 0, 56]} scale={0.52}>
          <MetroEntrance
            id="M4-A"
            name="Grand Exchange North Entrance A"
            lineColor="#2c76b8"
            onEnter={() => onEnter('map')}
          />
        </group>
      )}
      {!embedded && (
        <group position={[7.5, 0, 56]} rotation={[0, Math.PI, 0]} scale={0.52}>
          <MetroEntrance
            id="M4-B"
            name="Grand Exchange North Entrance B"
            lineColor="#2c76b8"
            onEnter={() => onEnter('map')}
          />
        </group>
      )}
      {!embedded && (
        <group
          position={[-30, 0, 28]}
          rotation={[0, Math.PI / 2, 0]}
          scale={0.48}
        >
          <MetroEntrance
            id="M1-A"
            name="South Quay Entrance A"
            lineColor="#2c76b8"
            onEnter={() => onEnter('map')}
          />
        </group>
      )}
      {!embedded && (
        <group
          position={[30, 0, 48]}
          rotation={[0, -Math.PI / 2, 0]}
          scale={0.48}
        >
          <MetroEntrance
            id="M8-A"
            name="Meridian Medical Entrance A"
            lineColor="#2c76b8"
            onEnter={() => onEnter('map')}
          />
        </group>
      )}
      {!embedded && (
        <>
          <LandmarkLabel
            position={[0, 4.4, 55]}
            label="M4 · GRAND EXCHANGE METRO · ENTRANCES A / B"
            place="map"
            onEnter={onEnter}
          />
          <LandmarkLabel
            position={[-30, 4, 28]}
            label="M1-A · SOUTH QUAY METRO"
            place="map"
            onEnter={onEnter}
          />
          <LandmarkLabel
            position={[30, 4, 48]}
            label="M8-A · MERIDIAN MEDICAL METRO"
            place="map"
            onEnter={onEnter}
          />
        </>
      )}

      <MetropolitanResidentialFabric onEnter={onEnter} />

      <Suspense fallback={null}>
        <LuxuryRetailArcades />
      </Suspense>
      <WaterfrontMarina onEnter={onEnter} embedded={embedded} />
      {!embedded && <CBDEdgeApproaches onEnter={onEnter} />}
      <SciFiResidenceTower
        position={[-27, 0, -28]}
        variant="HELIX"
        label="HELIX ONE"
        onEnter={onEnter}
      />
      <SciFiResidenceTower
        position={[28, 0, -30]}
        variant="PRISM"
        label="PRISM HOUSE"
        onEnter={onEnter}
      />
      <SciFiResidenceTower
        position={[-31, 0, -42]}
        variant="BRIDGE"
        label="SKYBRIDGE RESIDENCES"
        onEnter={onEnter}
      />
      <StockExchangeRotunda onEnter={onEnter} />
      <Building
        position={[-18, 0, -12]}
        size={[4.4, 5.1, 3.5]}
        color="#1d2434"
        glow="#718cff"
        label="CAREER TOWER"
        place="career"
        onEnter={onEnter}
        assetUrl={`${COMMERCIAL_ASSET_ROOT}/building-skyscraper-d.glb`}
        assetScale={1.12}
        labelHeight={5.7}
      />
      <Building
        position={[18, 0, -12]}
        size={[4.2, 3.3, 3.4]}
        color="#291b36"
        glow="#c366ff"
        label="NEON ATELIER"
        place="fashion"
        onEnter={onEnter}
        assetUrl={`${COMMERCIAL_ASSET_ROOT}/building-k.glb`}
        assetScale={2.05}
        labelHeight={3.8}
      />
      <DiningPrecinct onEnter={onEnter} />
      <Building
        position={[17.55, 0, 0]}
        size={[4.4, 5.3, 3.7]}
        color="#172b36"
        glow="#4dbdff"
        label="SKYLINE REALTY"
        place="property"
        onEnter={onEnter}
        assetUrl={`${COMMERCIAL_ASSET_ROOT}/building-skyscraper-a.glb`}
        assetScale={1.65}
        labelHeight={5.8}
      />

      <CivicHospital onEnter={onEnter} />
      <CivicSafetyHQ onEnter={onEnter} />
      <AcademyCampus onEnter={onEnter} />
      <FreshMarket onEnter={onEnter} />
      <EnergyResearchCampus onEnter={onEnter} />
      <MidriseCommunity onEnter={onEnter} />

      <group position={[0, 0, 13]}>
        <mesh receiveShadow position={[0, 0.04, 0]}>
          <boxGeometry args={[15, 0.08, 15]} />
          <meshStandardMaterial color="#657f5e" roughness={0.98} />
        </mesh>
        <mesh position={[0, 0.2, 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[3.25, 36]} />
          <meshStandardMaterial
            color="#4ca7b2"
            metalness={0.08}
            roughness={0.18}
            transparent
            opacity={0.91}
          />
        </mesh>
        {(
          [
            [-5, -5],
            [-2, -5],
            [3, -5.5],
            [5, -2.5],
            [-5, 3.5],
            [-2.5, 5],
            [3, 4.8],
            [5.2, 2.5],
          ] as [number, number][]
        ).map(([x, z], index) => (
          <ParkTree
            key={`${x}-${z}`}
            position={[x, 0.08, z]}
            scale={0.9 + (index % 3) * 0.12}
          />
        ))}
        <Html
          position={[-3.7, 2.8, -1]}
          center
          distanceFactor={13}
          zIndexRange={[3, 0]}
        >
          <button
            className="world-label enterable"
            onClick={() => onEnter('wellness')}
          >
            CENTRAL PARK · DAILY LIFE
          </button>
        </Html>
        <Html
          position={[3.9, 2.8, -1]}
          center
          distanceFactor={13}
          zIndexRange={[3, 0]}
        >
          <button
            className="world-label enterable"
            onClick={() => onEnter('social')}
          >
            SOCIAL PLAZA · PREVIEW
          </button>
        </Html>
      </group>

      {!embedded && (
        <ArrivalSpine
          tone="CBD"
          position={[0, 0.02, 16]}
          length={102}
          width={16.6}
        />
      )}

      <Suspense fallback={null}>
        {streetLights.flatMap((z) =>
          [-7.7, 7.7].map((x) => (
            <StaticAsset
              key={`${x}-${z}`}
              url={`${ROAD_ASSET_ROOT}/light-curved.glb`}
              position={[x, 0.05, z]}
              rotation={[0, x < 0 ? 0 : Math.PI, 0]}
              scale={1.3}
              shadows={false}
            />
          )),
        )}
        <StaticAsset
          url={`${ROAD_ASSET_ROOT}/traffic-light-object-vertical.glb`}
          position={[-8.4, 0.05, -8]}
          scale={1.4}
          shadows={false}
        />
        <StaticAsset
          url={`${ROAD_ASSET_ROOT}/traffic-light-object-vertical.glb`}
          position={[8.4, 0.05, 19]}
          rotation={[0, Math.PI, 0]}
          scale={1.4}
          shadows={false}
        />
      </Suspense>
      <WayfindingPylon
        position={[-8.15, 0.08, 63]}
        label="6.4 KM CITY CORE · DIRECTORY"
        onEnter={onEnter}
      />
      {!embedded && <CityTraffic />}
      {!embedded && <PopulationLayer count={36} position={[0, 0, 18]} />}
      {!embedded && (
        <Player
          scene="CBD"
          onPositionChange={onPositionChange}
          enabled={playerEnabled}
          spawnOverride={playerSpawn}
          headingOverride={playerHeading}
        />
      )}
    </>
  );
}

function LegacyDistrictChunk({
  sector,
  lod,
  onEnter,
  onNotice,
  residenceBlock,
}: {
  sector: WorldSector;
  lod: 'DETAIL' | 'SHELL';
  onEnter: EnterPlace;
  onNotice: (message: string) => void;
  residenceBlock: string;
}) {
  const legacyScene = LEGACY_SCENE_BY_SECTOR[sector.id];
  if (lod !== 'DETAIL') return <SectorLodMassing sector={sector} lod={lod} />;
  if (sector.id === 'STARTER_OUTER_RING') {
    return (
      <StarterArcology
        onEnter={onEnter}
        onNotice={onNotice}
        residenceBlock={residenceBlock}
      />
    );
  }
  if (!legacyScene) return <SectorLodMassing sector={sector} lod="DETAIL" />;
  if (sector.id === 'CBD_CORE') {
    return (
      <group position={LEGACY_DISTRICT_WORLD_ORIGINS.CBD}>
        <CyberCBD onEnter={onEnter} embedded />
      </group>
    );
  }
  if (sector.id === 'WATERFRONT_MARINA') {
    return (
      <group position={LEGACY_DISTRICT_WORLD_ORIGINS.AZURE_YACHT_MARINA}>
        <AzureYachtMarinaScene onEnter={onEnter} embedded />
      </group>
    );
  }
  if (sector.id === 'CROWN_RESIDENTIAL') {
    return (
      <group position={LEGACY_DISTRICT_WORLD_ORIGINS.CROWN_RESIDENTIAL_TOWERS}>
        <CrownResidentialScene onEnter={onEnter} embedded />
      </group>
    );
  }
  if (sector.id === 'MIDSLOPE_VILLAS') {
    return (
      <group position={LEGACY_DISTRICT_WORLD_ORIGINS.MILLIONAIRE_RIDGE}>
        <MillionaireRidgeScene onEnter={onEnter} embedded />
      </group>
    );
  }
  return <SectorLodMassing sector={sector} lod="DETAIL" />;
}

function ContinuousMetroEntrances({ onEnter }: { onEnter: EnterPlace }) {
  return (
    <group name="Continuous metro entrances">
      {METRO_STATIONS.map((station) => (
        <group
          key={station.topologyId}
          position={station.entrance}
          rotation={[0, station.heading, 0]}
          scale={0.46}
        >
          <MetroEntrance
            id={`${station.id}-A`}
            name={`${station.name} Entrance A`}
            lineColor={
              station.scene === 'STARTER_ARCOLOGY'
                ? '#35a77d'
                : station.scene === 'AZURE_YACHT_MARINA'
                  ? '#2381bd'
                  : station.scene === 'CROWN_RESIDENTIAL_TOWERS'
                    ? '#856bc0'
                    : '#2c76b8'
            }
            onEnter={() => onEnter('map')}
          />
        </group>
      ))}
    </group>
  );
}

const World = memo(function World({
  onEnter,
  onNotice,
  onPositionChange,
  residenceBlock = '071',
  place,
  controlsEnabled = true,
  playerEntry,
  playerPosition,
}: {
  onEnter: EnterPlace;
  onNotice: (message: string) => void;
  onPositionChange?: (location: PlayerLocation) => void;
  residenceBlock?: string;
  place?: Place;
  controlsEnabled?: boolean;
  playerEntry: OutdoorPlayerEntry;
  playerPosition: PlayerLocation;
}) {
  if (place === 'studio')
    return <StudioInterior onEnter={onEnter} playerEnabled={controlsEnabled} />;
  const showAuto4S =
    Math.hypot(playerPosition.x - 82, playerPosition.z + 55) < 110;
  return (
    <ContinuousWorldBase
      playerPosition={playerPosition}
      renderSector={(sector, lod) => (
        <LegacyDistrictChunk
          sector={sector}
          lod={lod}
          onEnter={onEnter}
          onNotice={onNotice}
          residenceBlock={residenceBlock}
        />
      )}
    >
      <ContinuousMetroEntrances onEnter={onEnter} />
      <MetropolitanExpansion
        playerPosition={[playerPosition.x, playerPosition.z]}
        onLandmarkSelect={(id) => {
          if (id.startsWith('VIL-')) {
            onEnter('villa', id);
            return;
          }
          if (id === 'ampli-grand-prix') {
            onEnter('dealership', id);
            return;
          }
          if (id === 'ocean-crown') {
            onEnter('social', id);
            return;
          }
          onNotice(
            'AURELIAN CYBER SANCTUARY · EXTERIOR COMPLETE · INTERIOR INSTANCE RESERVED',
          );
        }}
      />
      {showAuto4S && <Auto4SDealership onEnter={onEnter} />}
      <Player
        scene="CONTINUOUS_WORLD"
        onPositionChange={onPositionChange}
        enabled={controlsEnabled}
        spawnOverride={playerEntry.spawn}
        headingOverride={playerEntry.heading}
        teleportKey={playerEntry.id}
        traversalPredicate={canTraverseContinuousWorld}
        stepTraversalPredicate={canStepBetweenContinuousWorldPoints}
        cameraOcclusionPredicate={isWorldCameraPointOccluded}
      />
    </ContinuousWorldBase>
  );
});

function MiniMap({
  scene,
  residenceBlock,
  location,
  worldLocationLabel,
  onOpen,
}: {
  scene: WorldSceneId;
  residenceBlock: string;
  location: PlayerLocation;
  worldLocationLabel: string;
  onOpen: () => void;
}) {
  const effectiveLocation = location;
  const localRadius = 20;
  const label =
    scene === 'STARTER_ARCOLOGY'
      ? `BLOCK ${residenceBlock}`
      : worldLocationLabel;
  const nearbyLandmarks = METRO_STATIONS.flatMap((station) => {
    const offsetX = station.spawn[0] - effectiveLocation.x;
    const offsetZ = station.spawn[2] - effectiveLocation.z;
    if (Math.abs(offsetX) > localRadius || Math.abs(offsetZ) > localRadius)
      return [];
    return [
      {
        id: station.id,
        label: station.name,
        kind: 'market',
        screenX: THREE.MathUtils.clamp(
          50 + (offsetX / (localRadius * 2)) * 100,
          4,
          96,
        ),
        screenY: THREE.MathUtils.clamp(
          50 - (offsetZ / (localRadius * 2)) * 100,
          4,
          96,
        ),
      },
    ];
  });
  return (
    <button
      className={`mini-map ${scene === 'STARTER_ARCOLOGY' ? 'arcology' : 'city'}`}
      onClick={onOpen}
      aria-label={`Open city map. Current local position ${effectiveLocation.x.toFixed(1)} east, ${effectiveLocation.z.toFixed(1)} north in ${label}`}
      aria-controls="city-map-dialog"
      aria-expanded="false"
    >
      <span className="mini-map-header">
        <MapIcon />
        <b>{label}</b>
        <small>OPEN MAP</small>
      </span>
      <span className="mini-map-surface">
        <i className="mini-road vertical" />
        <i className="mini-road horizontal" />
        {nearbyLandmarks.map((node) => (
          <i
            className={`mini-landmark ${node.kind}`}
            style={{ left: `${node.screenX}%`, top: `${node.screenY}%` }}
            title={`${node.label} · nearby point of interest`}
            key={node.id}
          />
        ))}
        <span className="mini-player" style={{ left: '50%', top: '50%' }}>
          <MapPin />
        </span>
      </span>
      <span className="mini-coordinates">
        LOCAL WINDOW · X {effectiveLocation.x.toFixed(1)} · Z{' '}
        {effectiveLocation.z.toFixed(1)}
      </span>
    </button>
  );
}

function CityAtlas({
  selectedId,
  playerPosition,
  travelPending,
  onSelect,
  onTravelToStation,
}: {
  selectedId: string;
  playerPosition: PlayerLocation;
  travelPending: boolean;
  onSelect: (nodeId: string) => void;
  onTravelToStation: (stationId: string) => void;
}) {
  const atlasNodes: readonly AtlasNode[] = WORLD_ATLAS;
  const landmarkNodes = atlasNodes.filter((node) => !node.residentialTier);
  const currentStation = METRO_STATIONS.find(
    (station) =>
      Math.hypot(
        playerPosition.x - station.spawn[0],
        playerPosition.z - station.spawn[2],
      ) < 2.5,
  );
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
  } | null>(null);
  const clampPan = (next: { x: number; y: number }, nextZoom = zoom) => {
    const viewport = viewportRef.current;
    const width = viewport?.clientWidth ?? 600;
    const height = viewport?.clientHeight ?? 390;
    const maxX = (width * Math.max(0, nextZoom - 1)) / 2;
    const maxY = (height * Math.max(0, nextZoom - 1)) / 2;
    return {
      x: THREE.MathUtils.clamp(next.x, -maxX, maxX),
      y: THREE.MathUtils.clamp(next.y, -maxY, maxY),
    };
  };
  const changeZoom = (amount: number) => {
    const nextZoom = THREE.MathUtils.clamp(
      Number((zoom + amount).toFixed(2)),
      1,
      4,
    );
    setZoom(nextZoom);
    setPan((current) => clampPan(current, nextZoom));
  };
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPan(
      clampPan({
        x: drag.panX + event.clientX - drag.x,
        y: drag.panY + event.clientY - drag.y,
      }),
    );
  };
  const endPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="atlas-map-column">
      <div className="atlas-toolbar" aria-label="Map view controls">
        <span>
          <b>AMPLIWORLD CONTINENTAL ATLAS</b>
          <small>
            {PLAYABLE_CORE_KM} × {PLAYABLE_CORE_KM} KM LIVE CORE ·{' '}
            {REPRESENTED_REGION_KM} × {REPRESENTED_REGION_HEIGHT_KM} KM REGION
          </small>
        </span>
        <button
          type="button"
          onClick={() => changeZoom(-0.35)}
          disabled={zoom <= 1}
          aria-label="Zoom map out"
        >
          −
        </button>
        <output aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button
          type="button"
          onClick={() => changeZoom(0.35)}
          disabled={zoom >= 4}
          aria-label="Zoom map in"
        >
          +
        </button>
        <button type="button" className="atlas-reset" onClick={resetView}>
          RESET
        </button>
      </div>
      <div
        ref={viewportRef}
        className="world-atlas full"
        aria-label={`Interactive compressed AmpliWorld atlas representing a ${REPRESENTED_REGION_KM} by ${REPRESENTED_REGION_HEIGHT_KM} kilometer regional economy`}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onDoubleClick={resetView}
        onWheel={(event) => {
          event.preventDefault();
          changeZoom(event.deltaY < 0 ? 0.22 : -0.22);
        }}
      >
        <div
          className="atlas-camera"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          }}
        >
          <div className="atlas-terrain">
            <span className="atlas-region atlas-coast">
              <b>AZURE COAST</b>
              <i>MARINAS · PORT · ISLANDS</i>
            </span>
            <span className="atlas-region atlas-starter">
              <b>SOUTH ARCOLOGY</b>
              <i>1,000 TOWERS</i>
            </span>
            <span className="atlas-region atlas-civic">
              <b>MERIDIAN CIVIC CAMPUS</b>
              <i>HOSPITAL · SAFETY · ACADEMY</i>
            </span>
            <span className="atlas-region atlas-cbd">
              <b>GREATER CYBER CBD</b>
              <i>
                {PLAYABLE_CORE_KM} × {PLAYABLE_CORE_KM} KM LIVE CORE
              </i>
            </span>
            <span className="atlas-region atlas-river-district">
              <b>GRAND RIVER CORRIDOR</b>
              <i>BRIDGES · PARKS · RIVER ROOMS</i>
            </span>
            <span className="atlas-region atlas-east-suburbs">
              <b>EAST GARDEN CENTRES</b>
              <i>MALLS · SCHOOLS · MIXED HOUSING</i>
            </span>
            <span className="atlas-region atlas-bay-resorts">
              <b>AZURE BAY RESORT BELT</b>
              <i>HOTELS · MARINA · PUBLIC BEACH</i>
            </span>
            <span className="atlas-region atlas-ridge">
              <b>MILLIONAIRE RIDGE</b>
              <i>HILLSIDE ESTATES</i>
            </span>
            <span className="atlas-region atlas-highlands">
              <b>NORTH HIGHLANDS</b>
              <i>ENERGY · RESEARCH · RESERVOIRS</i>
            </span>
            <span className="atlas-sea">WESTERN OCEAN</span>
            <span className="atlas-mountains">NORTH HIGHLANDS</span>
            <span className="atlas-width">{REPRESENTED_REGION_KM} KM</span>
            <span className="atlas-height">
              {REPRESENTED_REGION_HEIGHT_KM} KM
            </span>
            <svg
              className="atlas-river"
              viewBox="0 0 20 30"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                className="river-water"
                d="M0 16 C3 14.2 5.2 16.4 8.2 14.8 S13.2 11.8 20 13.1"
              />
              <path
                className="river-tributary"
                d="M8.2 14.8 C8.8 18.2 7.3 21.2 6.5 24.5"
              />
              <g className="atlas-bridges">
                {[2.2, 5.2, 8.2, 10.8, 13.4, 16.3, 18.5].map((x, index) => (
                  <line
                    key={x}
                    x1={x}
                    y1={index < 3 ? 13.6 : 11.5}
                    x2={x}
                    y2={index < 3 ? 17.2 : 15.1}
                  />
                ))}
              </g>
            </svg>
            <svg
              className="atlas-roads"
              viewBox="0 0 20 30"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M2 26 C5 23 8 20 11 16 S14 13 14 12" />
              <path d="M1 20 C5 18 9 16 14 12 S17 10 18 8" />
              <path d="M5.5 22 C9 20 13 18 16.5 16 S17 12 18 9.5" />
            </svg>
            <svg
              className="atlas-routes"
              viewBox="0 0 20 30"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polyline
                className="green-line"
                points="2,26 5.5,22 8,19 11,14 14,12 15,9.5 16.5,5.5"
              />
              <polyline className="blue-line" points="1,20 2,15 11,14 14,12" />
              <polyline
                className="east-line"
                points="8,19 18,20.5 16.5,16 14,12"
              />
              <polyline className="ferry-line" points="2,15 2.8,9" />
            </svg>
            {METRO_STATIONS.map((station) => (
              <button
                type="button"
                className={`atlas-station ${currentStation?.id === station.id ? 'current' : ''}`}
                style={{
                  left: `${(station.x / 20) * 100}%`,
                  bottom: `${(station.y / 30) * 100}%`,
                }}
                onClick={() => onTravelToStation(station.id)}
                disabled={travelPending}
                aria-label={`${station.id} ${station.name} metro station. ${currentStation?.id === station.id ? 'Current station; return to street' : 'Travel directly to this station'}`}
                title={`${station.id} · ${station.name} · ${currentStation?.id === station.id ? 'YOU ARE HERE' : 'CLICK TO TRAVEL'}`}
                key={station.id}
              >
                <TrainFront />
                <b>{station.id}</b>
                <span>{station.name}</span>
              </button>
            ))}
            {atlasNodes.map((node) => (
              <button
                type="button"
                className={`atlas-node ${node.kind.toLowerCase()} ${node.scene ? 'hub' : 'poi'} ${node.residentialTier ? `neighborhood tier-${node.residentialTier.toLowerCase()} development-${node.developmentStatus?.toLowerCase()}` : ''} ${selectedId === node.id ? 'selected' : ''}`}
                style={{
                  left: `${(node.x / 20) * 100}%`,
                  bottom: `${(node.y / 30) * 100}%`,
                }}
                onClick={() => onSelect(node.id)}
                aria-label={`${node.name}, ${node.zone}, grid ${node.x} east ${node.y} north, ${node.residentialTier ? `${RESIDENTIAL_TIER_LABELS[node.residentialTier]} residential neighborhood` : node.scene ? 'transit district hub' : 'inspectable point of interest'}`}
                aria-pressed={selectedId === node.id}
                title={`${node.name} · ${node.residentialTier ? RESIDENTIAL_TIER_LABELS[node.residentialTier] : node.scene ? 'district hub' : 'inspect only'}`}
                key={node.id}
              >
                <i />
                <b>{node.name}</b>
              </button>
            ))}
            <span
              className="atlas-player"
              style={{
                left: `${(worldToAtlasX(playerPosition.x) / 20) * 100}%`,
                bottom: `${(worldToAtlasY(playerPosition.z) / 30) * 100}%`,
              }}
            >
              <MapPin />
              <b>YOU</b>
            </span>
          </div>
        </div>
        <span className="atlas-gesture-hint">
          CLICK ANY METRO STATION TO TRAVEL · DRAG TO PAN · SCROLL TO ZOOM
        </span>
      </div>
      <div
        className="atlas-node-list"
        aria-label="District hubs and city points of interest"
      >
        {landmarkNodes.map((node) => (
          <button
            type="button"
            className={`${selectedId === node.id ? 'selected' : ''} ${node.scene ? 'hub' : 'poi'}`}
            onClick={() => onSelect(node.id)}
            aria-pressed={selectedId === node.id}
            key={`${node.id}-list`}
          >
            <i>{node.scene ? 'HUB' : 'POI'}</i>
            {node.name}
          </button>
        ))}
      </div>
      <div
        className="atlas-neighborhood-summary"
        aria-label={`${WORLD_NEIGHBORHOOD_STATS.totalNeighborhoods} named residential neighborhoods`}
      >
        <span>
          <b>{WORLD_NEIGHBORHOOD_STATS.totalNeighborhoods}</b> NAMED COMMUNITIES
        </span>
        {(Object.keys(RESIDENTIAL_TIER_LABELS) as CatalogResidentialTier[]).map(
          (tier) => (
            <span className={`tier-${tier.toLowerCase()}`} key={tier}>
              <i />
              {RESIDENTIAL_TIER_LABELS[tier]}{' '}
              {WORLD_NEIGHBORHOOD_STATS.byTier[tier]}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function TouchControls() {
  const move = (key: string, pressed: boolean) =>
    window.dispatchEvent(
      new CustomEvent('ampliworld-move', { detail: { key, pressed } }),
    );
  const bind = (key: string) => ({
    onPointerDown: () => move(key, true),
    onPointerUp: () => move(key, false),
    onPointerCancel: () => move(key, false),
    onPointerLeave: () => move(key, false),
  });
  return (
    <div className="touch-controls">
      <button {...bind('w')} aria-label="Walk forward">
        <ChevronUp />
      </button>
      <button {...bind('a')} aria-label="Turn left">
        <ChevronLeft />
      </button>
      <button {...bind('s')} aria-label="Walk backward">
        <ChevronDown />
      </button>
      <button {...bind('d')} aria-label="Turn right">
        <ChevronRight />
      </button>
    </div>
  );
}

function CameraLookControls() {
  const look = (direction: number, pressed: boolean) =>
    window.dispatchEvent(
      new CustomEvent('ampliworld-look', { detail: { direction, pressed } }),
    );
  const startLook = (
    direction: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    look(direction, true);
  };
  const stopLook = (
    direction: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    look(direction, false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const bind = (direction: number) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) =>
      startLook(direction, event),
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) =>
      stopLook(direction, event),
    onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) =>
      stopLook(direction, event),
    onLostPointerCapture: () => look(direction, false),
  });
  const keyboardLook = (direction: number, clickDetail: number) => {
    if (clickDetail !== 0) return;
    look(direction, true);
    look(direction, false);
  };
  return (
    <div className="camera-look-controls" aria-label="Camera tilt controls">
      <small>CAMERA</small>
      <button
        type="button"
        {...bind(1)}
        onClick={(event) => keyboardLook(1, event.detail)}
        aria-label="Look up at the skyline and sky"
        title="Look up"
      >
        <ChevronUp />
        <span>SKY</span>
      </button>
      <i />
      <button
        type="button"
        {...bind(-1)}
        onClick={(event) => keyboardLook(-1, event.detail)}
        aria-label="Look down toward the street"
        title="Look down"
      >
        <ChevronDown />
        <span>GROUND</span>
      </button>
    </div>
  );
}

function VisionPanel({
  image,
  label,
  alt,
}: {
  image: string;
  label: string;
  alt: string;
}) {
  return (
    <figure className="vision-panel">
      <Image
        src={image}
        alt={alt}
        fill
        sizes="(max-width: 720px) 100vw, 650px"
      />
      <figcaption>{label}</figcaption>
    </figure>
  );
}

export function GameShell({
  playerName,
  signedIn,
  signInPath,
}: {
  playerName: string;
  signedIn: boolean;
  signInPath: string;
}) {
  const [cash, setCash] = useState(10000);
  const [propertyValue, setPropertyValue] = useState(0);
  const [happiness, setHappiness] = useState(52);
  const [worldEvent, setWorldEvent] = useState<WorldEvent>(WORLD_EVENTS[0]);
  const [place, setPlace] = useState<Place>(null);
  const [inventory, setInventory] = useState<string[]>([]);
  const [tax, setTax] = useState(0);
  const [notice, setNotice] = useState(
    'HOME: 10 m² STUDIO · CBD IS 18.4 KM AWAY · EVERY TRIP COSTS VIRTUAL CASH',
  );
  const [stocks, setStocks] = useState(INITIAL_STOCKS);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [day, setDay] = useState(1);
  const [leaseDays, setLeaseDays] = useState(365);
  const [career, setCareer] = useState('UNEMPLOYED');
  const [leverage, setLeverage] = useState<1 | 2 | 3 | 5>(1);
  const [reliefEligible, setReliefEligible] = useState(false);
  const [reliefClaimsRemaining, setReliefClaimsRemaining] = useState(2);
  const [currentDistrict, setCurrentDistrict] =
    useState<WorldDistrict>('STARTER_ARCOLOGY');
  const [activeScene, setActiveScene] =
    useState<WorldSceneId>('STARTER_ARCOLOGY');
  const [playerEntry, setPlayerEntry] = useState<OutdoorPlayerEntry>(
    INITIAL_OUTDOOR_ENTRY,
  );
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
  const guestWorkUtcDate = useRef(new Date().toISOString().slice(0, 10));
  const [lifetimeWages, setLifetimeWages] = useState(0);
  const [socialMode, setSocialMode] = useState<'PRIVATE' | 'APPROACHABLE'>(
    'PRIVATE',
  );
  const [contactCoins, setContactCoins] = useState(0);
  const [localPosition, setLocalPosition] = useState<PlayerLocation>({
    scene: 'CONTINUOUS_WORLD',
    x: INITIAL_OUTDOOR_ENTRY.spawn[0],
    z: INITIAL_OUTDOOR_ENTRY.spawn[2],
  });
  const [currentAtlasNodeId, setCurrentAtlasNodeId] = useState('starter');
  const [selectedAtlasId, setSelectedAtlasId] = useState('starter');
  const [pendingAtlasId, setPendingAtlasId] = useState<string | null>(null);
  const [pendingDestination, setPendingDestination] = useState<Place>(null);
  const [journey, setJourney] = useState<Journey | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [missions, setMissions] = useState({
    firstTrade: false,
    firstPurchase: false,
    firstJob: false,
  });
  const [worldMinutes, setWorldMinutes] = useState(() =>
    getWorldMinutesAtCycleTime(WORLD_CLOCK_START_OFFSET_MS),
  );
  const actionLock = useRef(false);

  useEffect(() => {
    const startedAt = performance.now() - WORLD_CLOCK_START_OFFSET_MS;
    const clock = window.setInterval(() => {
      setWorldMinutes(
        getWorldMinutesAtCycleTime(performance.now() - startedAt),
      );
    }, 1000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (signedIn) return;
    const resetGuestWorkAllowance = () => {
      const utcDate = new Date().toISOString().slice(0, 10);
      if (utcDate === guestWorkUtcDate.current) return;
      guestWorkUtcDate.current = utcDate;
      setShiftsToday(0);
      setWagesToday(0);
    };
    const timer = window.setInterval(resetGuestWorkAllowance, 60_000);
    window.addEventListener('focus', resetGuestWorkAllowance);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', resetGuestWorkAllowance);
    };
  }, [signedIn]);

  const handlePositionChange = useCallback((location: PlayerLocation) => {
    const positionStep = 2;
    const quantizedLocation: PlayerLocation = {
      ...location,
      x: Math.round(location.x / positionStep) * positionStep,
      z: Math.round(location.z / positionStep) * positionStep,
    };
    setLocalPosition((current) =>
      current.scene === quantizedLocation.scene &&
      current.x === quantizedLocation.x &&
      current.z === quantizedLocation.z
        ? current
        : quantizedLocation,
    );
    if (location.scene !== 'CONTINUOUS_WORLD') return;
    const sector = getContinuousWorldSectorAt(location);
    const nextScene = sceneForSector(sector.id);
    setActiveScene(nextScene);
    setCurrentDistrict(sceneDistrict(nextScene));
    const nearest = getNearestContinuousWorldMetro(location);
    const nearestStation = METRO_STATIONS.find(
      (station) => station.topologyId === nearest.stationId,
    );
    if (
      nearestStation &&
      Math.hypot(
        location.x - nearest.position[0],
        location.z - nearest.position[2],
      ) < 8
    ) {
      setCurrentAtlasNodeId(nearestStation.nodeId);
    }
  }, []);

  const portfolio = useMemo(
    () =>
      holdings.reduce((total, holding) => {
        const price =
          stocks.find((stock) => stock.symbol === holding.symbol)?.price ??
          holding.avgPrice;
        return total + holding.quantity * price;
      }, 0),
    [holdings, stocks],
  );
  const borrowedExposure = useMemo(
    () =>
      holdings.reduce((total, holding) => total + holding.borrowedAmount, 0),
    [holdings],
  );
  const portfolioEquity = portfolio - borrowedExposure;
  const netWorth = cash + portfolioEquity + propertyValue;
  const maintenanceMargin = holdings.reduce((total, holding) => {
    const price =
      stocks.find((stock) => stock.symbol === holding.symbol)?.price ??
      holding.avgPrice;
    const rate =
      holding.leverage === 2
        ? 0.3
        : holding.leverage === 3
          ? 0.22
          : holding.leverage === 5
            ? 0.15
            : 0;
    return total + holding.quantity * price * rate;
  }, 0);
  const marginExcess = cash + portfolioEquity - maintenanceMargin;
  const worldHour = worldMinutes / 60;
  const dayPhase = getDayPhase(worldHour);
  const atmosphereFog = ATMOSPHERE_FOG_RANGES[activeScene];

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
      if (syncActiveScene && currentDistrict !== district) {
        const savedStationId = readableString(player.currentStationId);
        const arrivalStation =
          METRO_STATIONS.find(
            (station) =>
              station.id === savedStationId &&
              sceneDistrict(station.scene) === district,
          ) ??
          METRO_STATIONS.find(
            (station) =>
              station.topologyId ===
              (district === 'CBD' ? 'MTR-C01' : 'MTR-S01'),
          ) ??
          METRO_STATIONS[0];
        const savedX = readableNumber(player.worldX, arrivalStation.spawn[0]);
        const savedZ = readableNumber(player.worldZ, arrivalStation.spawn[2]);
        const savedSpawn: [number, number, number] = [
          savedX,
          getWorldSurfaceElevationXZ(savedX, savedZ),
          savedZ,
        ];
        const spawn: [number, number, number] = canTraverseContinuousWorld([
          savedX,
          savedZ,
        ])
          ? savedSpawn
          : [...arrivalStation.spawn];
        setPlayerEntry((current) => ({
          id: current.id + 1,
          spawn,
          heading: readableNumber(player.worldHeading, arrivalStation.heading),
        }));
        setActiveScene(arrivalStation.scene);
        setCurrentAtlasNodeId(arrivalStation.nodeId);
      }
    }
    setStarterTower(
      readableNumber(residence?.tower ?? player.starterTower, 71),
    );
    setStarterFloor(
      readableNumber(residence?.floor ?? player.starterFloor, 38),
    );
    setStarterUnit(readableNumber(residence?.unit ?? player.starterUnit, 184));
    setTransitSpend(readableNumber(player.transitSpend));
    setTransitTrips(readableNumber(player.transitTrips));
    setMetroRides(readableNumber(player.metroRides));
    setTaxiRides(readableNumber(player.taxiRides));
    setNutrition(readableNumber(wellbeing?.nutrition ?? player.nutrition, 50));
    setCareStreak(readableNumber(wellbeing?.careStreak ?? player.careStreak));
    setDailyCarePoints(
      readableNumber(wellbeing?.dailyCarePoints ?? player.dailyCarePoints),
    );
    setDailyProtein(
      readableNumber(wellbeing?.dailyProtein ?? player.dailyProtein),
    );
    setDailyProduce(
      readableNumber(wellbeing?.dailyProduce ?? player.dailyProduce),
    );
    setMealComplete(
      Boolean(wellbeing?.mealComplete) ||
        readableNumber(player.lastMealTurn) === readableNumber(player.turn),
    );
    setWellnessComplete(
      Boolean(wellbeing?.wellnessComplete) ||
        readableNumber(player.lastWellnessTurn) === readableNumber(player.turn),
    );
    setLeisureComplete(
      Boolean(wellbeing?.leisureComplete) ||
        readableNumber(player.lastLeisureTurn) === readableNumber(player.turn),
    );
    setTradingFeeBps(
      readableNumber(wellbeing?.tradingFeeBps ?? player.tradingFeeBps, 10),
    );
    setLastWorkTurn(readableNumber(player.lastWorkTurn));
    setShiftsToday(
      readableNumber(employment?.shiftsToday ?? player.shiftsToday),
    );
    setWagesToday(readableNumber(employment?.wagesToday ?? player.wagesToday));
    setLifetimeWages(
      readableNumber(employment?.lifetimeWages ?? player.lifetimeWages),
    );
    const nextSocialMode = readableString(
      social?.mode ?? player.socialMode,
      'PRIVATE',
    );
    setSocialMode(
      nextSocialMode === 'APPROACHABLE' ? 'APPROACHABLE' : 'PRIVATE',
    );
    setContactCoins(
      readableNumber(social?.contactCoins ?? player.contactCoins),
    );
    if (data.holdings !== undefined)
      setHoldings(normalizeHoldings(data.holdings));
    if (data.inventory !== undefined)
      setInventory(normalizeInventory(data.inventory));
    if (data.market !== undefined)
      setStocks((current) => mergeMarket(current, data.market));
    if (data.worldEvent !== undefined)
      setWorldEvent((current) => normalizeWorldEvent(data.worldEvent, current));
  };

  const runCloudAction = async (
    payload: Record<string, unknown>,
    syncActiveScene = true,
  ) => {
    const response = await fetch('/api/game', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, requestId: crypto.randomUUID() }),
    });
    const data = (await response.json()) as GameApiResponse;
    if (!response.ok)
      throw new Error(readableString(data.error, 'ACTION REJECTED'));
    applySnapshot(data, syncActiveScene);
    return data;
  };

  const applySnapshotRef = useRef(applySnapshot);
  useEffect(() => {
    applySnapshotRef.current = applySnapshot;
  });

  useEffect(() => {
    if (!signedIn) return;
    void fetch('/api/game')
      .then(async (response) =>
        response.ok ? ((await response.json()) as GameApiResponse) : null,
      )
      .then((data) => {
        if (!data) return;
        applySnapshotRef.current(data);
      })
      .catch(() => setNotice('CLOUD SAVE UNAVAILABLE · LOCAL PLAY CONTINUES'));
  }, [signedIn]);

  useEffect(() => {
    if (signedIn) return;
    const timer = window.setInterval(
      () =>
        setStocks((current) =>
          current.map((stock, index) => {
            const phase = Date.now() / 7500 + index * 1.7;
            const movement =
              Math.sin(phase) * stock.volatility * 0.35 +
              Math.cos(phase * 0.43) * stock.volatility * 0.18;
            return {
              ...stock,
              price: Math.max(
                1,
                Number((stock.price * (1 + movement)).toFixed(2)),
              ),
            };
          }),
        ),
      2500,
    );
    return () => window.clearInterval(timer);
  }, [signedIn]);

  useEffect(() => {
    const handleMapKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && place) {
        setPlace(null);
        setPendingDestination(null);
        setPendingAtlasId(null);
      }
      if (
        event.key.toLowerCase() === 'm' &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        setPlace((current) => {
          if (current === 'map') {
            setPendingDestination(null);
            setPendingAtlasId(null);
            return null;
          }
          setSelectedAtlasId(currentAtlasNodeId);
          setPendingDestination(null);
          setPendingAtlasId(null);
          return 'map';
        });
      }
    };
    window.addEventListener('keydown', handleMapKeys);
    return () => window.removeEventListener('keydown', handleMapKeys);
  }, [currentAtlasNodeId, place]);

  const openPlace = useCallback<EnterPlace>(
    (target, atlasId) => {
      if (!target) {
        setPlace(null);
        setPendingDestination(null);
        setPendingAtlasId(null);
        return;
      }
      const atlasNode: AtlasNode | undefined = atlasId
        ? WORLD_ATLAS.find((node) => node.id === atlasId)
        : undefined;
      if (atlasNode) setSelectedAtlasId(atlasNode.id);
      if (target === 'map') {
        setSelectedAtlasId(currentAtlasNodeId);
        setPendingDestination(null);
        setPendingAtlasId(null);
      }
      const requiresCbd = CBD_ONLY_PLACES.includes(target);
      const requiresHome = target === 'studio';
      const homeTower = STARTER_TOWER_SPECS.find((tower) => tower.home)!;
      const isAtHomePortal =
        Math.hypot(
          localPosition.x - homeTower.door[0],
          localPosition.z - homeTower.door[1],
        ) <= 3.2;
      if (
        (requiresCbd && currentDistrict !== 'CBD') ||
        (requiresHome && !isAtHomePortal)
      ) {
        if (requiresHome) setSelectedAtlasId('starter');
        setPendingAtlasId(
          requiresCbd && atlasNode?.scene ? atlasNode.id : null,
        );
        setPendingDestination(target);
        setPlace('map');
        setNotice(
          requiresCbd
            ? 'PAID TRAVEL REQUIRED · CLICK THE METRO STATION YOU WANT TO ARRIVE AT'
            : currentDistrict === 'STARTER_ARCOLOGY'
              ? 'HOME INTERIORS ARE PORTAL-BASED · WALK TO THE ARC-A071 ENTRANCE'
              : 'HOME IS 18.4 KM AWAY · TAKE M0, THEN WALK TO THE ARC-A071 ENTRANCE',
        );
        return;
      }
      setPendingDestination(null);
      setPendingAtlasId(null);
      if (target === 'studio') {
        setPlayerEntry((current) => ({
          id: current.id + 1,
          spawn: [localPosition.x, 0.12, localPosition.z],
          heading: current.heading,
        }));
      }
      setPlace(target);
    },
    [currentAtlasNodeId, currentDistrict, localPosition.x, localPosition.z],
  );

  const commute = async (mode: TransitMode, targetStationId?: string) => {
    if (actionLock.current) return;
    const option = TRANSIT[mode];
    const targetStation = targetStationId
      ? METRO_STATIONS.find((station) => station.id === targetStationId)
      : undefined;
    if (targetStationId && !targetStation) {
      setNotice('METRO STATION NOT FOUND');
      return;
    }
    const destination: WorldDistrict = targetStation
      ? sceneDistrict(targetStation.scene)
      : currentDistrict === 'CBD'
        ? 'STARTER_ARCOLOGY'
        : 'CBD';
    const arrivalStation =
      targetStation ??
      METRO_STATIONS.find(
        (station) =>
          station.topologyId ===
          (destination === 'CBD' ? 'MTR-C01' : 'MTR-S01'),
      ) ??
      METRO_STATIONS[0];
    if (mode === 'METRO' && cash < 0) {
      setNotice(
        'METRO EMERGENCY CREDIT IS UNAVAILABLE ONCE CASH IS ALREADY NEGATIVE',
      );
      return;
    }
    if (mode === 'TAXI' && cash < option.fare) {
      setNotice('TAXI REQUIRES THE FULL $45 VIRTUAL FARE');
      return;
    }

    actionLock.current = true;
    setPendingAction(`commute:${mode}`);
    const targetAtlasId = targetStation?.nodeId ?? pendingAtlasId;
    const targetNode = targetAtlasId
      ? WORLD_ATLAS.find((node) => node.id === targetAtlasId)
      : undefined;
    setJourney({
      destination,
      targetLabel:
        targetStation?.name ??
        targetNode?.name ??
        (destination === 'CBD' ? 'Cyber CBD' : 'Starter Arcology'),
      mode,
      fare: option.fare,
      durationGameMinutes: option.durationGameMinutes,
    });
    try {
      let fare: number = option.fare;
      let gameMinutes: number = option.durationGameMinutes;
      let cashAfter = cash - fare;
      if (signedIn) {
        const data = await runCloudAction(
          {
            action: 'commute',
            destination,
            mode,
            stationId: targetStation?.id,
          },
          false,
        );
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

      await new Promise<void>((resolve) =>
        window.setTimeout(resolve, option.realDurationMs),
      );
      if (!signedIn) setCurrentDistrict(destination);
      const nextPlace = pendingDestination;
      const nextAtlasId = targetAtlasId;
      const nextAtlasNode: AtlasNode | undefined = nextAtlasId
        ? WORLD_ATLAS.find((node) => node.id === nextAtlasId)
        : undefined;
      const nextScene = arrivalStation.scene;
      setPendingDestination(null);
      setPendingAtlasId(null);
      const arrivalAtlasId =
        targetStation?.nodeId ?? nextAtlasId ?? arrivalStation.nodeId;
      setCurrentAtlasNodeId(arrivalAtlasId);
      setSelectedAtlasId(arrivalAtlasId);
      setPlayerEntry((current) => ({
        id: current.id + 1,
        spawn: [...arrivalStation.spawn],
        heading: arrivalStation.heading,
      }));
      setActiveScene(nextScene);
      setPlace(
        targetStation
          ? null
          : nextAtlasNode?.scene
            ? null
            : destination === 'CBD' &&
                nextPlace &&
                CBD_ARRIVAL_PLACES.includes(nextPlace)
              ? nextPlace
              : destination === 'STARTER_ARCOLOGY' && nextPlace === 'studio'
                ? 'studio'
                : null,
      );
      setNotice(
        `${mode} ARRIVED AT ${(targetStation?.name ?? targetNode?.name ?? transitDestinationLabel).toUpperCase()} · $${fare.toFixed(2)} VIRTUAL FARE PAID · ${gameMinutes} GAME MINUTES · CASH $${cashAfter.toFixed(2)}`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message.toUpperCase()
          : 'TRANSIT UNAVAILABLE',
      );
    } finally {
      setJourney(null);
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const addGuestHolding = (
    symbol: string,
    quantity: number,
    price: number,
    level: number,
    marginPosted: number,
    borrowedAmount: number,
  ) =>
    setHoldings((current) => {
      const existing = current.find((holding) => holding.symbol === symbol);
      if (!existing)
        return [
          ...current,
          {
            symbol,
            quantity,
            avgPrice: price,
            leverage: level,
            marginPosted,
            borrowedAmount,
          },
        ];
      const nextQuantity = existing.quantity + quantity;
      const avgPrice =
        (existing.avgPrice * existing.quantity + price * quantity) /
        nextQuantity;
      return current.map((holding) =>
        holding.symbol === symbol
          ? {
              ...holding,
              quantity: nextQuantity,
              avgPrice,
              marginPosted: holding.marginPosted + marginPosted,
              borrowedAmount: holding.borrowedAmount + borrowedAmount,
            }
          : holding,
      );
    });

  const order = async (symbol: string, side: 'buy' | 'sell') => {
    if (actionLock.current) return;
    if (currentDistrict !== 'CBD') {
      openPlace('market');
      return;
    }
    const stock = stocks.find((item) => item.symbol === symbol);
    if (!stock) return;
    const currentHolding = holdings.find(
      (holding) => holding.symbol === symbol,
    );
    const owned = currentHolding?.quantity ?? 0;
    if (side === 'sell' && owned <= 0)
      return setNotice(`NO ${symbol} POSITION TO SELL`);
    if (
      side === 'buy' &&
      currentHolding &&
      currentHolding.leverage !== leverage
    )
      return setNotice(
        `CLOSE THE EXISTING ${currentHolding.leverage}× ${symbol} POSITION BEFORE USING ${leverage}×`,
      );
    const marginAllocation = 500;
    const notional =
      side === 'buy' ? marginAllocation * leverage : owned * stock.price;
    const quantity = side === 'buy' ? notional / stock.price : owned;
    const fee =
      tradingFeeBps === 0
        ? 0
        : Math.max(
            0.01,
            Number(((notional * tradingFeeBps) / 10_000).toFixed(2)),
          );
    const tradingTax = Number((notional * 0.0005).toFixed(2));
    const requiredCash =
      side === 'buy' ? marginAllocation + fee + tradingTax : 0;
    if (side === 'buy' && cash < requiredCash)
      return setNotice('INSUFFICIENT VIRTUAL CASH FOR MARGIN AND COSTS');
    actionLock.current = true;
    setPendingAction(`${side}:${symbol}`);
    try {
      let executionPrice = stock.price;
      let executionNotional = notional;
      let executionFee = fee;
      let executionFeeBps = tradingFeeBps;
      let executionTax = tradingTax;
      let executionMargin =
        side === 'buy' ? marginAllocation : (currentHolding?.marginPosted ?? 0);
      let executionBorrowed =
        side === 'buy'
          ? notional - marginAllocation
          : (currentHolding?.borrowedAmount ?? 0);
      if (signedIn) {
        const data = await runCloudAction(
          side === 'buy'
            ? { action: side, symbol, notional, leverage }
            : { action: side, symbol, quantity },
        );
        const execution = recordOf(data.execution);
        executionPrice = readableNumber(execution?.price, executionPrice);
        executionNotional = readableNumber(
          execution?.notional,
          executionNotional,
        );
        executionFee = readableNumber(execution?.fee, executionFee);
        executionFeeBps = readableNumber(execution?.feeBps, executionFeeBps);
        executionTax = readableNumber(execution?.tax, executionTax);
        executionMargin = readableNumber(
          execution?.marginPosted ?? execution?.marginRequired,
          executionMargin,
        );
        executionBorrowed = readableNumber(
          execution?.borrowedAmount,
          executionBorrowed,
        );
      } else {
        if (side === 'buy') {
          setCash((value) => value - marginAllocation - fee - tradingTax);
          addGuestHolding(
            symbol,
            quantity,
            stock.price,
            leverage,
            marginAllocation,
            notional - marginAllocation,
          );
        } else {
          setCash(
            (value) =>
              value +
              notional -
              fee -
              tradingTax -
              (currentHolding?.borrowedAmount ?? 0),
          );
          setHoldings((current) =>
            current.filter((holding) => holding.symbol !== symbol),
          );
        }
        setTax((value) => Number((value + tradingTax).toFixed(2)));
      }
      setMissions((value) => ({ ...value, firstTrade: true }));
      setNotice(
        `${side === 'buy' ? `${leverage}× LONG` : 'SOLD ALL'} ${symbol} @ $${executionPrice.toFixed(2)} · $${executionNotional.toFixed(2)} EXPOSURE · $${executionMargin.toFixed(2)} MARGIN · $${executionBorrowed.toFixed(2)} BORROWED · $${executionFee.toFixed(2)} FEE (${executionFeeBps} BPS) + $${executionTax.toFixed(2)} TAX`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message.toUpperCase() : 'ORDER REJECTED',
      );
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
    if (cash < price + shoppingTax)
      return setNotice('YOU NEED MORE CASH · RETURN TO THE MARKET');
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
      setNotice(
        `${item.toUpperCase()} ACQUIRED · $${shoppingTax.toFixed(2)} CITY TAX PAID`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message.toUpperCase()
          : 'PURCHASE REJECTED',
      );
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
      setNotice(
        'THE MARKET ASSISTANT INTERVIEW IS IN THE CBD · CHOOSE PAID TRANSIT',
      );
      return;
    }
    actionLock.current = true;
    setPendingAction('hire');
    try {
      if (signedIn)
        await runCloudAction({ action: 'hire', job: 'MARKET_DATA_ASSISTANT' });
      else setCareer('MARKET DATA ASSISTANT');
      setMissions((value) => ({ ...value, firstJob: true }));
      setNotice('INTERVIEW PASSED · MARKET BRIEF REVIEW SHIFT UNLOCKED');
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message.toUpperCase()
          : 'INTERVIEW UNAVAILABLE',
      );
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const categoryComplete = (category: CareCategory) =>
    category === 'MEAL'
      ? mealComplete
      : category === 'WELLNESS'
        ? wellnessComplete
        : leisureComplete;

  const performCare = async (option: LifeOption) => {
    if (actionLock.current || categoryComplete(option.category)) return;
    if (option.district === 'CBD' && currentDistrict !== 'CBD') {
      setPendingDestination('wellness');
      setPlace('map');
      setNotice(
        `${option.name.toUpperCase()} IS IN THE CBD · CHOOSE PAID TRANSIT`,
      );
      return;
    }
    const activityTax =
      option.district === 'CBD' && option.price > 0
        ? Number((option.price * 0.02).toFixed(2))
        : 0;
    if (cash < option.price + activityTax)
      return setNotice('INSUFFICIENT VIRTUAL CASH FOR THIS DAILY CHOICE');
    actionLock.current = true;
    setPendingAction(`care:${option.code}`);
    try {
      if (signedIn) {
        await runCloudAction({ action: 'care', activityCode: option.code });
      } else {
        setCash((value) =>
          Number((value - option.price - activityTax).toFixed(2)),
        );
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
      setNotice(
        `${option.name.toUpperCase()} COMPLETE · TODAY'S CARE RECORDED · FEE CHANGES ONLY AFTER END DAY`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message.toUpperCase()
          : 'DAILY CARE UNAVAILABLE',
      );
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
      setNotice(
        `${job.name.toUpperCase()} IS IN THE CBD · CHOOSE PAID TRANSIT`,
      );
      return;
    }
    if (job.requiresCareer && career === 'UNEMPLOYED')
      return setNotice('COMPLETE THE CAREER TOWER INTERVIEW FIRST');
    if (lastWorkTurn === day)
      return setNotice('ONE ACTIVE PAID SHIFT IS ALLOWED PER GAME DAY');
    if (shiftsToday >= 2 || wagesToday >= 40)
      return setNotice('TODAY’S REAL-WORLD WORK ALLOWANCE IS COMPLETE');
    actionLock.current = true;
    setPendingAction(`work:${job.code}`);
    try {
      let pay = Math.min(job.pay, 40 - wagesToday);
      if (signedIn) {
        const data = await runCloudAction({
          action: 'work',
          jobCode: job.code,
        });
        pay = readableNumber(recordOf(data.work)?.pay, pay);
      } else {
        setCash((value) => Number((value + pay).toFixed(2)));
        setHappiness((value) =>
          Math.max(0, Math.min(100, value + job.happiness)),
        );
        setLastWorkTurn(day);
        setShiftsToday((value) => value + 1);
        setWagesToday((value) => Number((value + pay).toFixed(2)));
        setLifetimeWages((value) => Number((value + pay).toFixed(2)));
      }
      setMissions((value) => ({ ...value, firstJob: true }));
      setNotice(
        `${job.name.toUpperCase()} COMPLETE · $${pay.toFixed(2)} VIRTUAL PAY RECEIVED · NO PASSIVE WAGE`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message.toUpperCase()
          : 'WORK SHIFT UNAVAILABLE',
      );
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
      setNotice(
        `${mode} SOCIAL PREFERENCE SAVED · REAL-PLAYER DISCOVERY IS NOT LIVE YET`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message.toUpperCase()
          : 'SOCIAL PREFERENCE UNAVAILABLE',
      );
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
      let grant = Math.min(1000, Math.max(0, 1000 - cash));
      if (signedIn) {
        const data = await runCloudAction({ action: 'claim_relief' });
        grant = readableNumber(recordOf(data.relief)?.grant, grant);
      } else {
        setCash((value) => Number((value + grant).toFixed(2)));
        setReliefClaimsRemaining((value) => Math.max(0, value - 1));
      }
      setReliefEligible(false);
      setNotice(
        `$${grant.toFixed(2)} VIRTUAL RELIEF ISSUED · PAPER ACCOUNT ONLY`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message.toUpperCase()
          : 'RELIEF UNAVAILABLE',
      );
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
        if (
          readableNumber(dayClose?.liquidationCount) > 0 ||
          (Array.isArray(dayClose?.liquidations) &&
            dayClose.liquidations.length > 0)
        )
          outcome = ' · MARGIN CALL LIQUIDATED LEVERAGED POSITIONS';
      } else {
        const nextTurn = day + 1;
        const eventEntropy = crypto.getRandomValues(new Uint32Array(1))[0];
        const nextEvent = WORLD_EVENTS[eventEntropy % WORLD_EVENTS.length];
        const nextStocks = stocks.map((stock, index) => {
          const eventMove =
            nextEvent.marketImpacts?.[stock.symbol] ??
            Math.sin(nextTurn * 0.73 + index) * stock.volatility;
          return {
            ...stock,
            open: stock.price,
            price: Math.max(
              0.01,
              Number((stock.price * (1 + eventMove)).toFixed(2)),
            ),
          };
        });
        const nextValue = holdings.reduce(
          (total, holding) =>
            total +
            holding.quantity *
              (nextStocks.find((stock) => stock.symbol === holding.symbol)
                ?.price ?? holding.avgPrice),
          0,
        );
        const requiredMaintenance = holdings.reduce((total, holding) => {
          const marketValue =
            holding.quantity *
            (nextStocks.find((stock) => stock.symbol === holding.symbol)
              ?.price ?? holding.avgPrice);
          const rate =
            holding.leverage === 2
              ? 0.3
              : holding.leverage === 3
                ? 0.22
                : holding.leverage === 5
                  ? 0.15
                  : 0;
          return total + marketValue * rate;
        }, 0);
        const marginCall =
          holdings.some((holding) => holding.leverage > 1) &&
          cash + nextValue - borrowedExposure < requiredMaintenance;
        setStocks(nextStocks);
        setWorldEvent(nextEvent);
        setDay((value) => value + 1);
        setLeaseDays((value) => Math.max(0, value - 1));
        if (marginCall) {
          const liquidation = holdings.reduce(
            (result, holding) => {
              const marketValue =
                holding.quantity *
                (nextStocks.find((stock) => stock.symbol === holding.symbol)
                  ?.price ?? holding.avgPrice);
              return {
                cashReturn:
                  result.cashReturn +
                  marketValue -
                  holding.borrowedAmount -
                  marketValue * 0.0015,
                cityTax: result.cityTax + marketValue * 0.0005,
              };
            },
            { cashReturn: 0, cityTax: 0 },
          );
          setHoldings([]);
          setCash((value) => value + liquidation.cashReturn);
          setTax((value) => Number((value + liquidation.cityTax).toFixed(2)));
          outcome = ' · CROSS-MARGIN CALL LIQUIDATED ALL MARKET POSITIONS';
        }
        const nextHappiness = Math.max(0, Math.round(happiness - 2));
        const nextNutrition = Math.max(0, Math.round(nutrition - 6));
        const completeCareDay =
          dailyCarePoints >= 4 &&
          dailyProtein >= 70 &&
          dailyProduce >= 70 &&
          nextNutrition >= 55;
        const nextCareStreak = completeCareDay
          ? Math.min(30, careStreak + 1)
          : Math.max(0, careStreak - 1);
        const careScore = Math.min(
          100,
          Math.max(
            0,
            Math.round(
              nextHappiness * 0.6 +
                nextNutrition * 0.4 +
                Math.min(10, nextCareStreak),
            ),
          ),
        );
        const rawFeeBps = Math.min(
          10,
          Math.max(0, Math.ceil((100 - careScore) / 5)),
        );
        const nextFeeBps =
          rawFeeBps === 0 && nextCareStreak < 7 ? 1 : rawFeeBps;
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
        careOutcome = completeCareDay
          ? ` · CARE STREAK ${nextCareStreak}`
          : ' · CARE STREAK NOT ADVANCED';
      }
      setNotice(
        `DAY ${String(day).padStart(3, '0')} CLOSED · NO PASSIVE WAGE · ACTIVE SHIFTS PAY IMMEDIATELY${careOutcome}${outcome}`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message.toUpperCase()
          : 'DAY CLOSE FAILED',
      );
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  };

  const marketMove = (stock: Stock) => (stock.price / stock.open - 1) * 100;
  const visibleNews = [
    worldEvent,
    ...WORLD_EVENTS.filter((event) => event.id !== worldEvent.id),
  ].slice(0, 3);
  const fruitBoxOption = LIFE_OPTIONS.find(
    (option) => option.code === 'FRESH_FRUIT_BOX',
  )!;
  const coastDayTripOption = LIFE_OPTIONS.find(
    (option) => option.code === 'COAST_DAY_TRIP',
  )!;
  const islandWeekendOption = LIFE_OPTIONS.find(
    (option) => option.code === 'ISLAND_WEEKEND',
  )!;
  const careCost = (option: LifeOption) =>
    option.price +
    (option.district === 'CBD' && option.price > 0
      ? Number((option.price * 0.02).toFixed(2))
      : 0);
  const canClaimRelief = signedIn
    ? reliefEligible
    : netWorth < 500 && holdings.length === 0 && reliefClaimsRemaining > 0;
  const residenceBlock = String(starterTower).padStart(3, '0');
  const atCbd = currentDistrict === 'CBD';
  const transitDestinationLabel = atCbd ? 'Starter Arcology' : 'Cyber CBD';
  const currentWorldSector = getContinuousWorldSectorAt(localPosition);
  const [headwaterX, headwaterZ] = GRAND_RIVER_CORRIDOR.centerline[0];
  const locationLabel =
    Math.hypot(localPosition.x - headwaterX, localPosition.z - headwaterZ) < 22
      ? 'GRAND RIVER HEADWATER FALLS'
      : currentWorldSector.name.toUpperCase();
  const playerAtlasId = currentAtlasNodeId;
  const selectedAtlasNode: AtlasNode =
    WORLD_ATLAS.find((node) => node.id === selectedAtlasId) ?? WORLD_ATLAS[0];
  const selectedIsCurrent = selectedAtlasNode.id === playerAtlasId;
  const selectedRequiredDistrict: WorldDistrict | null =
    selectedAtlasNode.availability === 'PLANNED'
      ? null
      : selectedAtlasNode.id === 'starter'
        ? 'STARTER_ARCOLOGY'
        : 'CBD';
  const selectedRequiresTravel =
    selectedRequiredDistrict !== null &&
    selectedRequiredDistrict !== currentDistrict;
  const selectedAtlasStatus = (() => {
    if (selectedIsCurrent) return 'YOU ARE HERE';
    if (
      selectedAtlasNode.developmentStatus === 'PLANNED' ||
      selectedAtlasNode.availability === 'PLANNED'
    )
      return 'PLANNED · NOT PLAYABLE YET';
    if (selectedAtlasNode.developmentStatus === 'SHELL')
      return 'SITE / MASSING SHELL · GAMEPLAY AND INTERIORS IN DEVELOPMENT';
    if (selectedAtlasNode.developmentStatus === 'PLAYABLE')
      return 'REPRESENTED IN A LIVE 3D DISTRICT · USE THE NEAREST HUB';
    if (selectedAtlasNode.availability === 'GATED' && netWorth < 1_000_000)
      return '$1M VIRTUAL NET WORTH GATE';
    if (selectedRequiresTravel)
      return 'PAID ROUTE · CLICK A METRO STATION · $5';
    if (selectedAtlasNode.scene) return 'LIVE · WALKABLE 3D DISTRICT';
    return 'INTERACTIVE NODE IN THE CURRENT ECONOMIC DISTRICT';
  })();
  const activeMarinaNode =
    selectedAtlasNode.place === 'marina'
      ? selectedAtlasNode
      : WORLD_ATLAS.find((node) => node.id === 'public-marina')!;
  const activeResidenceNode =
    selectedAtlasNode.place === 'residences'
      ? selectedAtlasNode
      : WORLD_ATLAS.find((node) => node.id === 'crown-residences')!;
  const selectAtlasNode = (nodeId: string) => {
    setSelectedAtlasId(nodeId);
    setPendingDestination(null);
    setPendingAtlasId(null);
  };

  const travelToMetroStation = (stationId: string) => {
    const station = METRO_STATIONS.find(
      (candidate) => candidate.id === stationId,
    );
    if (!station) {
      setNotice('METRO STATION NOT FOUND');
      return;
    }
    setSelectedAtlasId(station.nodeId);
    setPendingDestination(null);
    setPendingAtlasId(null);
    if (
      Math.hypot(
        localPosition.x - station.spawn[0],
        localPosition.z - station.spawn[2],
      ) < 2.5
    ) {
      setPlace(null);
      setNotice(`${station.name.toUpperCase()} · YOU ARE ALREADY HERE`);
      return;
    }
    void commute('METRO', station.id);
  };

  const openSelectedAtlasNode = () => {
    if (selectedIsCurrent) {
      setPlace(null);
      setPendingDestination(null);
      setPendingAtlasId(null);
      setNotice(
        `${selectedAtlasNode.name.toUpperCase()} · RETURNED TO THE STREET`,
      );
      return;
    }
    if (
      selectedAtlasNode.availability === 'PLANNED' ||
      !selectedAtlasNode.place
    ) {
      setNotice(
        `${selectedAtlasNode.name.toUpperCase()} · PLANNED AREA · NO FALSE ENTRY POINT`,
      );
      return;
    }
    if (selectedAtlasNode.availability === 'GATED' && netWorth < 1_000_000) {
      setNotice('MILLIONAIRE RIDGE REQUIRES $1,000,000 VIRTUAL NET WORTH');
      return;
    }
    if (selectedRequiresTravel) {
      setPendingDestination(selectedAtlasNode.place);
      setPendingAtlasId(selectedAtlasNode.id);
      setNotice(
        `${selectedAtlasNode.name.toUpperCase()} REQUIRES PAID TRANSIT · CLICK ITS NEAREST METRO STATION ON THE MAP`,
      );
      return;
    }
    if (selectedAtlasNode.scene) {
      setNotice(
        `${selectedAtlasNode.name.toUpperCase()} IS PART OF THE SAME WALKABLE WORLD · CLICK ITS METRO STATION OR WALK THERE`,
      );
      return;
    }
    openPlace(selectedAtlasNode.place, selectedAtlasNode.id);
  };

  return (
    <main className="game">
      <header>
        <div className="logo">A</div>
        <div>
          <b>AMPLIWORLD</b>
          <small>THE LIVING MARKET</small>
        </div>
        <div className="day">
          DAY {String(day).padStart(3, '0')} · {formatWorldTime(worldMinutes)}{' '}
          {dayPhase} · {locationLabel}
        </div>
        <div className="player">
          <span>{playerName}</span>
          {signedIn ? (
            <i>CLOUD SAVE</i>
          ) : (
            <a href={signInPath} target="_top">
              SIGN IN TO SAVE
            </a>
          )}
        </div>
      </header>
      <section className="playfield">
        <Canvas
          aria-label="Playable AmpliWorld city"
          tabIndex={0}
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [0, 3.5, 6.4], fov: 48, near: 0.08, far: 620 }}
        >
          {place !== 'studio' && (
            <DynamicAtmosphere
              hour={worldHour}
              fogNear={atmosphereFog.near}
              fogFar={atmosphereFog.far}
            />
          )}
          <World
            onEnter={openPlace}
            onNotice={setNotice}
            onPositionChange={handlePositionChange}
            residenceBlock={residenceBlock}
            place={place}
            controlsEnabled={(!place || place === 'studio') && !journey}
            playerEntry={playerEntry}
            playerPosition={localPosition}
          />
        </Canvas>
        {!place && (
          <MiniMap
            scene={activeScene}
            residenceBlock={residenceBlock}
            location={localPosition}
            worldLocationLabel={locationLabel}
            onOpen={() => openPlace('map')}
          />
        )}
        <div
          className={`mission ${activeScene === 'STARTER_ARCOLOGY' ? 'arcology-mission' : ''}`}
        >
          <small>
            {activeScene === 'STARTER_ARCOLOGY'
              ? `BLOCK ${residenceBlock} · FLOOR ${starterFloor} · UNIT ${starterUnit}`
              : locationLabel}
          </small>
          <b>
            {activeScene === 'STARTER_ARCOLOGY'
              ? 'Turn $10,000 into a way out'
              : activeScene === 'CBD'
                ? 'Make every paid trip count'
                : 'Walk the district · learn the living market'}
          </b>
          <span aria-live="polite">{notice}</span>
          <div className="mission-track">
            <i className={missions.firstTrade ? 'done' : ''}>TRADE</i>
            <i className={missions.firstJob ? 'done' : ''}>JOB</i>
            <i className={missions.firstPurchase ? 'done' : ''}>MOVE UP</i>
          </div>
        </div>
        <div className="controls">
          <kbd>W</kbd>/<kbd>S</kbd> WALK · <kbd>A</kbd>/<kbd>D</kbd> TURN ·
          TWO-FINGER SWIPE LOOK · <kbd>M</kbd> MAP
        </div>
        <TouchControls />
        {(!place || place === 'studio') && !journey && <CameraLookControls />}
        <aside className="hud">
          <div>
            <WalletCards />
            <span>
              CASH
              <big>
                ${cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </big>
            </span>
          </div>
          <div>
            <Banknote />
            <span>
              MARKET EQUITY
              <big>
                $
                {portfolioEquity.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
              </big>
            </span>
          </div>
          <div>
            <Smile />
            <span>
              HAPPINESS<big>{happiness}%</big>
            </span>
          </div>
          <div>
            <Leaf />
            <span>
              NUTRITION · FEE
              <big>
                {nutrition}% · {tradingFeeBps} bps
              </big>
            </span>
          </div>
          <div>
            <Trophy />
            <span>
              CITY STATUS
              <big>
                {netWorth >= 1_000_000
                  ? 'VIRTUAL RIDGE'
                  : netWorth >= 100_000
                    ? 'ISLAND ELIGIBLE'
                    : 'ARCOLOGY RESIDENT'}
              </big>
            </span>
          </div>
        </aside>
        <nav>
          <button onClick={() => openPlace('studio')}>
            <Home />
            HOME
          </button>
          <button onClick={() => openPlace('map')}>
            <MapIcon />
            MAP
          </button>
          <button onClick={() => openPlace('market')}>
            <Banknote />
            TRADE
          </button>
          <button onClick={() => openPlace('news')}>
            <Newspaper />
            WORLD
          </button>
          <button onClick={() => openPlace('wellness')}>
            <Heart />
            LIFE
          </button>
          <button onClick={() => openPlace('career')}>
            <BriefcaseBusiness />
            WORK
          </button>
          <button onClick={() => openPlace('social')}>
            <Users />
            SOCIAL
          </button>
          <button onClick={() => openPlace('inventory')}>
            <ShoppingBag />
            ITEMS <em>{inventory.length}</em>
          </button>
          <button
            disabled={pendingAction !== null}
            onClick={() => void closeDay()}
          >
            <Clock3 />
            {pendingAction === 'end-day' ? 'CLOSING…' : 'END DAY'}
          </button>
          <button onClick={() => openPlace('menu')}>
            <Menu />
            MENU
          </button>
        </nav>

        {journey && (
          <output className="journey-overlay" aria-live="assertive">
            <div className="journey-card">
              {journey.mode === 'METRO' ? <TrainFront /> : <Car />}
              <small>PAID TRANSIT IN PROGRESS</small>
              <h2>
                {journey.mode === 'METRO' ? 'Metro' : 'Taxi'} to{' '}
                {journey.targetLabel}
              </h2>
              <p>
                ${journey.fare.toFixed(2)} virtual fare charged ·{' '}
                {journey.durationGameMinutes} game minutes
              </p>
              <div className={`journey-progress ${journey.mode.toLowerCase()}`}>
                <i />
              </div>
              <span>
                {journey.mode === 'METRO'
                  ? '≈ 2 seconds of real time'
                  : '≈ 1 second of real time'}
              </span>
            </div>
          </output>
        )}

        {place && (
          <dialog
            id="city-map-dialog"
            open
            className={`modal ${place === 'studio' ? 'studio-modal' : ''} ${place === 'map' ? 'map-modal' : ''}`}
            aria-label="AmpliWorld location panel"
          >
            <button
              className="close"
              onClick={() => openPlace(null)}
              aria-label="Close"
            >
              <X />
            </button>
            {place === 'market' && (
              <>
                <small>CYBER CITY EXCHANGE · EXECUTABLE VIRTUAL QUOTES</small>
                <VisionPanel
                  image="/visuals/ampliworld-trading-terminal.jpg"
                  label="PRODUCT VISION · PLAYABLE VIRTUAL TRADING LOOP"
                  alt="Concept visualization of the AmpliWorld trading terminal"
                />
                <h1>Trade the living world</h1>
                <p>
                  Every order is virtual. Allocate $500 of margin, choose 1×–5×
                  exposure, and manage the risk of server-enforced liquidation.
                </p>
                <div className="fee-banner">
                  <Heart />
                  <span>
                    <b>{tradingFeeBps} BPS CURRENT TRADING FEE</b>Today&apos;s
                    lifestyle settles only at END DAY. City trading tax remains
                    5 bps; forced liquidation remains 10 bps.
                  </span>
                  <button onClick={() => setPlace('wellness')}>
                    IMPROVE NEXT DAY
                  </button>
                </div>
                <div className="leverage-desk">
                  <span>
                    <b>LEVERAGE</b>
                    {([1, 2, 3, 5] as const).map((level) => (
                      <button
                        key={level}
                        className={leverage === level ? 'active' : ''}
                        onClick={() => setLeverage(level)}
                      >
                        {level}×
                      </button>
                    ))}
                  </span>
                  <i>
                    $500 margin → ${(500 * leverage).toLocaleString()} gross
                    exposure
                  </i>
                </div>
                <div className="market-table">
                  <div className="market-row header">
                    <span>Asset</span>
                    <span>Price</span>
                    <span>Day</span>
                    <span>Position</span>
                    <span>Order</span>
                  </div>
                  {stocks.map((stock) => {
                    const move = marketMove(stock);
                    const holding = holdings.find(
                      (item) => item.symbol === stock.symbol,
                    );
                    const buyPending = pendingAction === `buy:${stock.symbol}`;
                    const sellPending =
                      pendingAction === `sell:${stock.symbol}`;
                    return (
                      <div className="market-row" key={stock.symbol}>
                        <span>
                          <b>{stock.symbol}</b>
                          <small>{stock.name}</small>
                        </span>
                        <span>${stock.price.toFixed(2)}</span>
                        <span className={move >= 0 ? 'gain' : 'loss'}>
                          {move >= 0 ? '+' : ''}
                          {move.toFixed(2)}%
                        </span>
                        <span>
                          {holding
                            ? `${holding.quantity.toFixed(2)} sh · ${holding.leverage}×`
                            : '—'}
                        </span>
                        <span className="order-buttons">
                          <button
                            disabled={pendingAction !== null}
                            onClick={() => void order(stock.symbol, 'buy')}
                          >
                            {buyPending ? '…' : `BUY ${leverage}×`}
                          </button>
                          <button
                            disabled={pendingAction !== null || !holding}
                            onClick={() => void order(stock.symbol, 'sell')}
                          >
                            {sellPending ? '…' : 'SELL ALL'}
                          </button>
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="portfolio-summary risk">
                  <span>
                    Gross exposure <b>${portfolio.toFixed(2)}</b>
                  </span>
                  <span>
                    Account equity <b>${portfolioEquity.toFixed(2)}</b>
                  </span>
                  <span>
                    Borrowed <b>${borrowedExposure.toFixed(2)}</b>
                  </span>
                  <span>
                    Margin excess{' '}
                    <b className={marginExcess >= 0 ? 'gain' : 'loss'}>
                      ${marginExcess.toFixed(2)}
                    </b>
                    <small>Maintenance ${maintenanceMargin.toFixed(2)}</small>
                  </span>
                </div>
                {canClaimRelief && (
                  <div className="relief-panel">
                    <span>
                      <b>Paper-account relief available</b>Up to $1,000 virtual
                      cash · {reliefClaimsRemaining} lifetime claim
                      {reliefClaimsRemaining === 1 ? '' : 's'} remaining
                    </span>
                    <button
                      disabled={pendingAction !== null}
                      onClick={() => void claimRelief()}
                    >
                      {pendingAction === 'relief'
                        ? 'ISSUING…'
                        : 'CLAIM VIRTUAL RELIEF'}
                    </button>
                  </div>
                )}
              </>
            )}
            {place === 'news' && (
              <>
                <small>
                  AMPLIWORLD NEWSWIRE · DAY {String(day).padStart(3, '0')}
                </small>
                <VisionPanel
                  image="/visuals/ampliworld-population-simulation.jpg"
                  label="WORLD ENGINE · POPULATION TO SIGNAL"
                  alt="Concept visualization of the AmpliWorld population simulation engine"
                />
                <h1>Today&apos;s world state</h1>
                <p>
                  The lead event is part of the active simulation state: close
                  the day and its asset impacts settle into tomorrow&apos;s
                  prices.
                </p>
                <div className="population-strip">
                  <span>
                    <b>8.3B</b>upstream population frame
                  </span>
                  <span>
                    <b>1M</b>target weighted core
                  </span>
                  <span>
                    <b>4,096</b>planned active cohorts
                  </span>
                  <span>
                    <b>32</b>visible representative NPCs
                  </span>
                </div>
                <div className="news-list">
                  {visibleNews.map((event, index) => (
                    <article
                      className={index === 0 ? 'lead' : ''}
                      key={event.id}
                    >
                      <i>
                        {index === 0
                          ? `ACTIVE SIMULATION · ${event.domain}`
                          : event.domain}
                      </i>
                      <b>{event.headline}</b>
                      <span>{event.impacts.join(' · ')}</span>
                    </article>
                  ))}
                </div>
              </>
            )}
            {place === 'map' && (
              <>
                <small>
                  CONTINENTAL ATLAS · PRESS M ANYWHERE · {PLAYABLE_CORE_KM} ×{' '}
                  {PLAYABLE_CORE_KM} KM LIVE CORE / {REPRESENTED_REGION_KM} ×{' '}
                  {REPRESENTED_REGION_HEIGHT_KM} KM REGION
                </small>
                <h1>An entire metropolitan economy—not a single CBD.</h1>
                <p>
                  The atlas combines Beijing-scale axes and residential rings,
                  Los Angeles-style metropolitan centres, a New York-inspired
                  vertical core, a continuous metropolitan river and a resort
                  coast. It currently catalogs{' '}
                  {WORLD_NEIGHBORHOOD_STATS.totalNeighborhoods} original
                  communities across five housing tiers and seven typologies.
                  Click any metro icon to travel directly to that exact
                  station—there is no separate CBD or home destination step.
                  Drag to pan, scroll to zoom, and use the live YOU marker to
                  track your current station.
                </p>
                <div className="atlas-layout">
                  <CityAtlas
                    selectedId={selectedAtlasId}
                    playerPosition={localPosition}
                    travelPending={
                      pendingAction?.startsWith('commute:') ?? false
                    }
                    onSelect={selectAtlasNode}
                    onTravelToStation={travelToMetroStation}
                  />
                  <aside className="atlas-inspector">
                    <span
                      className={`atlas-kind ${selectedAtlasNode.kind.toLowerCase()}`}
                    >
                      {selectedAtlasNode.kind === 'HOSPITAL' ? (
                        <Hospital />
                      ) : selectedAtlasNode.kind === 'POLICE' ? (
                        <Shield />
                      ) : selectedAtlasNode.kind === 'SCHOOL' ? (
                        <GraduationCap />
                      ) : selectedAtlasNode.kind === 'AUTO' ? (
                        <Car />
                      ) : selectedAtlasNode.kind === 'MARINA' ||
                        selectedAtlasNode.kind === 'PORT' ? (
                        <Ship />
                      ) : selectedAtlasNode.kind === 'GROCER' ? (
                        <Store />
                      ) : selectedAtlasNode.kind === 'DINING' ? (
                        <Utensils />
                      ) : selectedAtlasNode.kind === 'ENERGY' ? (
                        <Zap />
                      ) : selectedAtlasNode.kind === 'RESIDENTIAL' ||
                        selectedAtlasNode.kind === 'VILLAS' ? (
                        <Building2 />
                      ) : (
                        <MapPin />
                      )}
                    </span>
                    <small>{selectedAtlasNode.zone}</small>
                    <h2>{selectedAtlasNode.name}</h2>
                    <p>{selectedAtlasNode.detail}</p>
                    <dl>
                      <div>
                        <dt>ATLAS SECTOR</dt>
                        <dd>
                          {selectedAtlasNode.x.toFixed(1)}E ·{' '}
                          {selectedAtlasNode.y.toFixed(1)}N
                        </dd>
                      </div>
                      <div>
                        <dt>MAP ROLE</dt>
                        <dd>
                          {selectedAtlasNode.residentialTier
                            ? 'NAMED RESIDENTIAL COMMUNITY'
                            : selectedAtlasNode.scene
                              ? 'METRO / DISTRICT HUB'
                              : 'INSPECTABLE POI'}
                        </dd>
                      </div>
                      <div>
                        <dt>STATUS</dt>
                        <dd>{selectedAtlasStatus}</dd>
                      </div>
                      <div>
                        <dt>YOUR LOCAL POSITION</dt>
                        <dd>
                          X {localPosition.x.toFixed(1)} · Z{' '}
                          {localPosition.z.toFixed(1)}
                        </dd>
                      </div>
                    </dl>
                    {selectedAtlasNode.residentialTier && (
                      <section className="atlas-neighborhood-card">
                        <header>
                          <span>
                            <small>HOUSING TIER</small>
                            <b>
                              {
                                RESIDENTIAL_TIER_LABELS[
                                  selectedAtlasNode.residentialTier
                                ]
                              }
                            </b>
                          </span>
                          <span>
                            <small>TYPOLOGY</small>
                            <b>
                              {selectedAtlasNode.residentialTypology?.replaceAll(
                                '_',
                                ' ',
                              )}
                            </b>
                          </span>
                        </header>
                        <div>
                          <span>
                            <b>
                              {selectedAtlasNode.households?.toLocaleString()}
                            </b>{' '}
                            households
                          </span>
                          <span>
                            <b>{selectedAtlasNode.floors}</b> floors
                          </span>
                          <span>
                            <b>{selectedAtlasNode.heightMeters} m</b> reference
                            height
                          </span>
                        </div>
                        {selectedAtlasNode.inspiration && (
                          <p>
                            <b>DESIGN VOCABULARY</b>
                            {selectedAtlasNode.inspiration}
                          </p>
                        )}
                        <small>
                          REAL-WORLD REFERENCES INFORM SCALE AND PROGRAM ONLY;
                          THE IN-WORLD NAME AND ARCHITECTURE ARE ORIGINAL.
                        </small>
                      </section>
                    )}
                    <button
                      disabled={
                        !selectedAtlasNode.scene ||
                        selectedAtlasNode.availability === 'PLANNED' ||
                        (selectedAtlasNode.availability === 'GATED' &&
                          netWorth < 1_000_000)
                      }
                      onClick={openSelectedAtlasNode}
                    >
                      {selectedAtlasNode.availability === 'PLANNED'
                        ? 'AREA NOT PLAYABLE YET'
                        : selectedAtlasNode.availability === 'GATED' &&
                            netWorth < 1_000_000
                          ? 'VIRTUAL NET WORTH REQUIRED'
                          : !selectedAtlasNode.scene
                            ? selectedAtlasNode.residentialTier
                              ? 'COMMUNITY MODEL · ENTER THROUGH THE NEAREST DISTRICT HUB'
                              : 'POI ONLY · USE NEAREST METRO, THEN WALK OR DRIVE'
                            : selectedIsCurrent
                              ? 'RETURN TO STREET'
                              : selectedRequiresTravel
                                ? 'CLICK ITS METRO STATION ON THE MAP · ONE STEP'
                                : `ENTER ${selectedAtlasNode.name.toUpperCase()} DISTRICT · 3D`}
                    </button>
                  </aside>
                </div>
                <div className="atlas-legend">
                  <span>
                    <i className="you" />
                    YOU
                  </span>
                  <span>
                    <i className="hub" />
                    CLICKABLE METRO STATION
                  </span>
                  <span>
                    <i className="poi" />
                    INSPECTABLE POI
                  </span>
                  <span>
                    <i className="route" />
                    TRANSIT LINE
                  </span>
                  <span>
                    <i className="shell" />
                    MASSING SHELL
                  </span>
                  <span>
                    <i className="planned" />
                    PLANNED
                  </span>
                </div>
                <div className="city-layer-grid">
                  <article>
                    <Hospital />
                    <b>PUBLIC CITY</b>
                    <span>Hospital · police · academy</span>
                  </article>
                  <article>
                    <Store />
                    <b>DAILY CITY</b>
                    <span>Fresh market · dining · park</span>
                  </article>
                  <article>
                    <Building2 />
                    <b>HOUSING LADDER</b>
                    <span>Value · mid-market · move-up · premium · trophy</span>
                  </article>
                  <article>
                    <Car />
                    <b>MOBILITY CITY</b>
                    <span>Metro hubs · continuous roads · 4S campus</span>
                  </article>
                  <article>
                    <Ship />
                    <b>WATERFRONT CITY</b>
                    <span>Public boats · yachts · cargo · liners</span>
                  </article>
                  <article>
                    <Building2 />
                    <b>UTILITY CITY</b>
                    <span>Power campus · grid · nuclear district</span>
                  </article>
                </div>
                <div className="population-strip">
                  <span>
                    <b>{WORLD_NEIGHBORHOOD_STATS.totalNeighborhoods}</b>named
                    communities
                  </span>
                  <span>
                    <b>
                      {WORLD_NEIGHBORHOOD_STATS.totalHouseholds.toLocaleString()}
                    </b>
                    cataloged households
                  </span>
                  <span>
                    <b>{WORLD_ASSET_COUNTS.watercraft}</b>numbered watercraft
                  </span>
                  <span>
                    <b>5</b>live 3D districts
                  </span>
                </div>
                <section className="transit-desk direct-metro-desk">
                  <div className="direct-metro-guide">
                    <TrainFront />
                    <span>
                      <small>DIRECT STATION TRAVEL</small>
                      <b>CLICK A STATION ON THE MAP</b>
                      <i>
                        One click boards the metro and arrives at that station ·
                        $5 virtual · 28 game min
                      </i>
                    </span>
                    <em>
                      {cash < 0
                        ? 'METRO UNAVAILABLE'
                        : `${METRO_STATIONS.length} STATIONS LIVE`}
                    </em>
                  </div>
                  <div className="transit-ledger">
                    <span>
                      TRIPS <b>{transitTrips}</b>
                    </span>
                    <span>
                      METRO <b>{metroRides}</b>
                    </span>
                    <span>
                      TAXI <b>{taxiRides}</b>
                    </span>
                    <span>
                      LIFETIME FARES <b>${transitSpend.toFixed(2)}</b>
                    </span>
                  </div>
                </section>
                <VisionPanel
                  image="/visuals/ampliworld-metropolitan-masterplan-v1.jpg"
                  label="AMPLIWORLD METROPOLITAN MASTERPLAN · RIVER / CENTRES / HOUSING / COAST"
                  alt="Original AmpliWorld metropolitan masterplan showing the continuous river, city core, residential belts, resort marina, coast and highlands"
                />
              </>
            )}
            {place === 'hospital' && (
              <>
                <small>MERIDIAN GENERAL HOSPITAL · PUBLIC CITY SYSTEM</small>
                <h1>A real city needs somewhere to recover.</h1>
                <p>
                  The hospital anchors the eastern civic corridor with an
                  emergency entrance, inpatient wings, a rooftop helipad and a
                  public healing garden. It is a physical landmark now; clinical
                  gameplay and appointments remain a future system.
                </p>
                <div className="facility-hero hospital-facility">
                  <Hospital />
                  <span>
                    <small>OPEN 24 / 7</small>
                    <b>Emergency · inpatient · community wellness</b>
                    <em>3D LANDMARK LIVE</em>
                  </span>
                </div>
                <div className="facility-grid">
                  <article>
                    <b>EMERGENCY</b>
                    <span>Arrival lobby and rooftop transfer point</span>
                  </article>
                  <article>
                    <b>CARE TOWER</b>
                    <span>Two inpatient wings around a central core</span>
                  </article>
                  <article>
                    <b>WELLNESS LINK</b>
                    <span>
                      Daily-care actions connect health to trader discipline
                    </span>
                  </article>
                </div>
                <button
                  className="facility-action"
                  onClick={() => setPlace('wellness')}
                >
                  OPEN DAILY WELLNESS
                </button>
              </>
            )}
            {place === 'police' && (
              <>
                <small>CIVIC SAFETY HEADQUARTERS · EAST CIVIC</small>
                <h1>Public safety is part of the city, not a decoration.</h1>
                <p>
                  The headquarters includes a walk-in public lobby, emergency
                  coordination wing, vehicle court and rooftop communications
                  mast. The building is playable as a landmark; reporting,
                  response and public-service missions are not yet connected.
                </p>
                <div className="facility-hero police-facility">
                  <Shield />
                  <span>
                    <small>CIVIC NETWORK</small>
                    <b>Public lobby · emergency coordination · city response</b>
                    <em>3D LANDMARK LIVE</em>
                  </span>
                </div>
                <div className="facility-grid">
                  <article>
                    <b>PUBLIC DESK</b>
                    <span>Future help, permits and lost-property services</span>
                  </article>
                  <article>
                    <b>RESPONSE</b>
                    <span>Future dispatch and city event missions</span>
                  </article>
                  <article>
                    <b>TRUST</b>
                    <span>No crime or enforcement system is simulated yet</span>
                  </article>
                </div>
              </>
            )}
            {place === 'academy' && (
              <>
                <small>AMPLIWORLD ACADEMY · EDUCATION BELT</small>
                <h1>Before a city creates wealth, it creates capability.</h1>
                <p>
                  The southern campus combines two teaching wings, a learning
                  commons and a compact sports court. It will eventually host
                  finance, world-model and city-systems learning; today it is an
                  explorable civic landmark.
                </p>
                <div className="facility-hero school-facility">
                  <GraduationCap />
                  <span>
                    <small>LEARNING COMMONS</small>
                    <b>Markets · simulation · civic systems</b>
                    <em>CURRICULUM PLANNED</em>
                  </span>
                </div>
                <div className="facility-grid">
                  <article>
                    <b>MARKET LAB</b>
                    <span>Planned paper-trading and risk tutorials</span>
                  </article>
                  <article>
                    <b>WORLD LAB</b>
                    <span>Planned event-to-behavior simulation lessons</span>
                  </article>
                  <article>
                    <b>SPORTS COURT</b>
                    <span>
                      A visible public space inside the live 3D campus
                    </span>
                  </article>
                </div>
              </>
            )}
            {place === 'dealership' && (
              <>
                <small>APEX MOTORS 4S · EAST AUTO DISTRICT</small>
                <h1>Sales, service, spares and support—under one roof.</h1>
                <p>
                  The glass showroom displays a city sedan, luxury SUV and
                  future racer beside a full service hall. Vehicles will turn
                  wealth into mobility and identity; checkout, ownership and
                  drivable-car systems are not live in this build.
                </p>
                <div className="vehicle-lineup">
                  <article>
                    <Car />
                    <small>CITY SERIES</small>
                    <b>Apex Sedan</b>
                    <span>Efficient everyday mobility</span>
                  </article>
                  <article>
                    <Car />
                    <small>EXECUTIVE SERIES</small>
                    <b>Apex Luxury SUV</b>
                    <span>Comfort for coast and ridge</span>
                  </article>
                  <article>
                    <Car />
                    <small>FUTURE SERIES</small>
                    <b>Apex Ion R</b>
                    <span>Concept performance platform</span>
                  </article>
                </div>
                <div className="facility-grid compact">
                  <article>
                    <b>SALES</b>
                    <span>Showroom</span>
                  </article>
                  <article>
                    <b>SERVICE</b>
                    <span>Workshop</span>
                  </article>
                  <article>
                    <b>SPARES</b>
                    <span>Parts center</span>
                  </article>
                  <article>
                    <b>SUPPORT</b>
                    <span>Owner desk</span>
                  </article>
                </div>
                <button className="facility-action" disabled>
                  VEHICLE OWNERSHIP NOT CONNECTED
                </button>
              </>
            )}
            {place === 'grocer' && (
              <>
                <small>VERDANT FRESH MARKET · CENTRAL MARKET</small>
                <h1>Fruit and vegetables now have a real address.</h1>
                <p>
                  Verdant turns an abstract wellness action into a place in the
                  city. A fresh box improves today&apos;s produce and nutrition
                  record; the resulting fee change is still calculated only when
                  the day closes.
                </p>
                <div className="fresh-counter">
                  <Store />
                  <span>
                    <small>TODAY&apos;S PRODUCE</small>
                    <b>{fruitBoxOption.name}</b>
                    <em>
                      ${fruitBoxOption.price} virtual · universal daily item ·
                      no CBD tax
                    </em>
                  </span>
                  <strong>
                    +{fruitBoxOption.produce} PRODUCE · +
                    {fruitBoxOption.nutrition} NUTRITION
                    <br />+{fruitBoxOption.protein} PROTEIN · +
                    {fruitBoxOption.happiness} HAPPINESS · +
                    {fruitBoxOption.carePoints} CARE
                  </strong>
                </div>
                <button
                  className="facility-action"
                  disabled={
                    pendingAction !== null ||
                    wellnessComplete ||
                    cash < careCost(fruitBoxOption)
                  }
                  onClick={() => void performCare(fruitBoxOption)}
                >
                  {wellnessComplete
                    ? 'WELLNESS COMPLETE TODAY'
                    : pendingAction === `care:${fruitBoxOption.code}`
                      ? 'PACKING…'
                      : `BUY TODAY’S FRESH BOX · $${careCost(fruitBoxOption).toFixed(2)}`}
                </button>
              </>
            )}
            {place === 'marina' && (
              <>
                <small>
                  {activeMarinaNode.name.toUpperCase()} ·{' '}
                  {activeMarinaNode.zone}
                </small>
                <h1>
                  {activeMarinaNode.id === 'deepwater'
                    ? 'The city trades through the waterline.'
                    : activeMarinaNode.id === 'yacht-marina'
                      ? 'The skyline opens onto the sea.'
                      : 'The city meets the world at the waterline.'}
                </h1>
                <p>
                  {activeMarinaNode.detail}. Fishing boats, speedboats,
                  sailboats, tugs, cargo ships and ocean liners now occupy the
                  western coast without pretending that every vessel is already
                  drivable.
                </p>
                <div className="marina-fleet">
                  <article>
                    <Ship />
                    <small>PUBLIC HARBOR</small>
                    <b>Fishing · sailing · speedboats</b>
                    <span>Live 3D fleet</span>
                  </article>
                  <article>
                    <Ship />
                    <small>YACHT BASIN</small>
                    <b>Private slips &amp; coastal leisure</b>
                    <span>Ownership planned</span>
                  </article>
                  <article>
                    <Ship />
                    <small>DEEPWATER</small>
                    <b>Cargo · tugs · ocean liners</b>
                    <span>World-trade layer</span>
                  </article>
                </div>
                <p className="choice-note">
                  Choose one leisure activity per game day. Coast trip: +
                  {coastDayTripOption.happiness} happiness, +
                  {coastDayTripOption.carePoints} care. Island weekend: +
                  {islandWeekendOption.happiness} happiness, +
                  {islandWeekendOption.carePoints} care.
                </p>
                <div className="marina-actions">
                  <button
                    disabled={
                      pendingAction !== null ||
                      leisureComplete ||
                      cash < careCost(coastDayTripOption)
                    }
                    onClick={() => void performCare(coastDayTripOption)}
                  >
                    {leisureComplete
                      ? 'LEISURE COMPLETE TODAY'
                      : pendingAction === `care:${coastDayTripOption.code}`
                        ? 'DEPARTING…'
                        : `COAST DAY TRIP · $${careCost(coastDayTripOption).toFixed(2)}`}
                  </button>
                  <button
                    disabled={
                      pendingAction !== null ||
                      leisureComplete ||
                      cash < careCost(islandWeekendOption)
                    }
                    onClick={() => void performCare(islandWeekendOption)}
                  >
                    {leisureComplete
                      ? 'LEISURE COMPLETE TODAY'
                      : pendingAction === `care:${islandWeekendOption.code}`
                        ? 'DEPARTING…'
                        : `ISLAND WEEKEND · $${careCost(islandWeekendOption).toFixed(2)}`}
                  </button>
                </div>
              </>
            )}
            {place === 'residences' && (
              <>
                <small>
                  {activeResidenceNode.name.toUpperCase()} ·{' '}
                  {activeResidenceNode.zone}
                </small>
                <h1>
                  {activeResidenceNode.residentialTier
                    ? `${activeResidenceNode.name} is one rung in a complete city.`
                    : 'The center of the skyline belongs to people.'}
                </h1>
                <p>
                  {activeResidenceNode.residentialTier
                    ? activeResidenceNode.detail
                    : 'Three architecturally distinct science-fiction residential towers define the city core. Each premium level is conceived as one large full-floor home—not a stack of anonymous boxes. Around them, five- and six-floor pool communities provide the attainable next step from Starter Arcology.'}
                </p>
                {activeResidenceNode.residentialTier ? (
                  <>
                    <div className="community-profile">
                      <article>
                        <small>HOUSING TIER</small>
                        <b>
                          {
                            RESIDENTIAL_TIER_LABELS[
                              activeResidenceNode.residentialTier
                            ]
                          }
                        </b>
                        <span>A distinct price and lifestyle rung</span>
                      </article>
                      <article>
                        <small>TYPOLOGY</small>
                        <b>
                          {activeResidenceNode.residentialTypology?.replaceAll(
                            '_',
                            ' ',
                          )}
                        </b>
                        <span>Original AmpliWorld residential form</span>
                      </article>
                      <article>
                        <small>PLANNING CAPACITY</small>
                        <b>
                          {activeResidenceNode.households?.toLocaleString()}{' '}
                          homes
                        </b>
                        <span>
                          {activeResidenceNode.floors} floors ·{' '}
                          {activeResidenceNode.heightMeters} m reference height
                        </span>
                      </article>
                      <article>
                        <small>DELIVERY STATUS</small>
                        <b>{activeResidenceNode.developmentStatus}</b>
                        <span>
                          {activeResidenceNode.developmentStatus === 'PLAYABLE'
                            ? 'Representative district space is live'
                            : activeResidenceNode.developmentStatus === 'SHELL'
                              ? 'Site or massing exists; gameplay is incomplete'
                              : 'Catalog and site planning only'}
                        </span>
                      </article>
                    </div>
                    <p className="truth-note">
                      {activeResidenceNode.inspiration} The reference informs
                      scale and program only; names, architecture and eventual
                      assets remain original.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="housing-ladder">
                      <article>
                        <small>ATTAINABLE MIDRISE</small>
                        <b>Canopy Studio</b>
                        <span>
                          5 floors · shared pool · compact first upgrade
                        </span>
                        <em>RESERVATIONS PLANNED</em>
                      </article>
                      <article>
                        <small>ATTAINABLE MIDRISE</small>
                        <b>Canopy 1B / 2B</b>
                        <span>
                          5–6 floors · more space · central neighborhood
                        </span>
                        <em>RESERVATIONS PLANNED</em>
                      </article>
                      <article className="helix-home">
                        <small>CITY-CORE SIGNATURE</small>
                        <b>Helix One</b>
                        <span>
                          Rotating floor plates · one panoramic home per level
                        </span>
                        <em>FULL-FLOOR RESIDENCE</em>
                      </article>
                      <article className="prism-home">
                        <small>CITY-CORE SIGNATURE</small>
                        <b>Prism House</b>
                        <span>
                          Faceted terraces · private sky garden levels
                        </span>
                        <em>FULL-FLOOR RESIDENCE</em>
                      </article>
                      <article className="bridge-home">
                        <small>CITY-CORE SIGNATURE</small>
                        <b>Skybridge Residences</b>
                        <span>
                          Twin towers · private bridge salons above the CBD
                        </span>
                        <em>FULL-FLOOR RESIDENCE</em>
                      </article>
                    </div>
                    <p className="truth-note">
                      The buildings are live in the 3D city. Apartment
                      interiors, reservations, prices and ownership are
                      deliberately marked as planned until those systems are
                      implemented.
                    </p>
                  </>
                )}
                <button
                  className="facility-action"
                  onClick={() => setPlace('map')}
                >
                  RETURN TO CITY HOUSING MAP
                </button>
              </>
            )}
            {place === 'studio' && (
              <>
                <small>
                  STARTER ARCOLOGY · BLOCK {residenceBlock} · FLOOR{' '}
                  {starterFloor} · UNIT {starterUnit}
                </small>
                <h1>Your first ten square meters</h1>
                <p>
                  Every player starts here: one room, one terminal and a
                  one-year right to stay. The legal footprint remains 10 m²,
                  while the interior uses a 2.1× navigation scale so it feels
                  comfortable to explore—compact outside, spacious inside, like
                  a game world rather than a floor-plan simulator.
                </p>
                <div className="studio-plan">
                  <div className="studio-room">
                    <span>FOLDING BED</span>
                    <span>MARKET TERMINAL</span>
                    <span>LOCKER</span>
                    <b>10 m²</b>
                  </div>
                  <div className="studio-facts">
                    <span>
                      <b>50</b>floors
                    </span>
                    <span>
                      <b>10,000</b>residents per tower
                    </span>
                    <span>
                      <b>1,000</b>towers in the district
                    </span>
                    <span>
                      <b>{leaseDays}</b>lease days remaining
                    </span>
                  </div>
                </div>
                <section className="home-terminal">
                  <header>
                    <span>
                      <small>HOME MARKET TERMINAL</small>
                      <b>Quotes are visible. Orders execute in the CBD.</b>
                    </span>
                    <i>VIEW ONLY</i>
                  </header>
                  {stocks.slice(0, 3).map((stock) => {
                    const move = marketMove(stock);
                    return (
                      <div key={stock.symbol}>
                        <span>
                          <b>{stock.symbol}</b>
                          <small>{stock.name}</small>
                        </span>
                        <b>${stock.price.toFixed(2)}</b>
                        <i className={move >= 0 ? 'gain' : 'loss'}>
                          {move >= 0 ? '+' : ''}
                          {move.toFixed(2)}%
                        </i>
                      </div>
                    );
                  })}
                  <button onClick={() => openPlace('market')}>
                    <TrainFront />
                    COMMUTE TO CYBER CBD TO TRADE
                  </button>
                </section>
                <div className="residence-note">
                  <Home />
                  <span>
                    <b>No shortcut is hidden here.</b>Your portfolio is the
                    route from this room to the skyline.
                  </span>
                </div>
              </>
            )}
            {place === 'wellness' && (
              <>
                <small>DAILY LIFE · NEXT-DAY TRADING DISCIPLINE</small>
                <VisionPanel
                  image="/visuals/ampliworld-lifestyle-economy.jpg"
                  label="CARE FOR THE CHARACTER · LOWER TOMORROW'S FRICTION"
                  alt="Concept visualization of an AmpliWorld home and lifestyle economy"
                />
                <h1>Your trader is part of the system.</h1>
                <p>
                  Delivery can keep a character alive; it cannot make the
                  character well. Build nutrition, produce, protein and recovery
                  over consecutive days. Today&apos;s choices settle into
                  tomorrow&apos;s trading fee only when you end the day.
                </p>
                <div className="wellbeing-ledger">
                  <span>
                    <Heart />
                    <b>{happiness}%</b>
                    <small>HAPPINESS</small>
                  </span>
                  <span>
                    <Leaf />
                    <b>{nutrition}%</b>
                    <small>NUTRITION</small>
                  </span>
                  <span>
                    <Utensils />
                    <b>{dailyProtein}%</b>
                    <small>PROTEIN TODAY</small>
                  </span>
                  <span>
                    <ShoppingBag />
                    <b>{dailyProduce}%</b>
                    <small>PRODUCE TODAY</small>
                  </span>
                  <span>
                    <Footprints />
                    <b>{careStreak}</b>
                    <small>CARE STREAK</small>
                  </span>
                  <span className="fee">
                    <Coins />
                    <b>{tradingFeeBps} bps</b>
                    <small>CURRENT FEE</small>
                  </span>
                </div>
                <div className="care-rule">
                  <b>ZERO-FEE PATH</b>
                  <span>
                    Reach 95 happiness, 90 nutrition and at least seven
                    consecutive complete-care days. Clothing, property and
                    future paid social items cannot buy a fee advantage.
                  </span>
                </div>
                <div className="life-grid">
                  {LIFE_OPTIONS.map((option) => {
                    const complete = categoryComplete(option.category);
                    const travel = option.district === 'CBD' && !atCbd;
                    const cost =
                      option.price +
                      (option.district === 'CBD' && option.price > 0
                        ? option.price * 0.02
                        : 0);
                    return (
                      <article
                        className={complete ? 'complete' : ''}
                        key={option.code}
                      >
                        <span className="life-icon">
                          {option.category === 'MEAL' ? (
                            <Utensils />
                          ) : option.category === 'WELLNESS' ? (
                            <Leaf />
                          ) : (
                            <Footprints />
                          )}
                        </span>
                        <small>
                          {option.category} ·{' '}
                          {option.district === 'CBD' ? 'CBD' : 'ANYWHERE'}
                        </small>
                        <h2>{option.name}</h2>
                        <p>{option.description}</p>
                        <div>
                          <span>
                            +{option.happiness} HAP · +{option.nutrition} NUT
                          </span>
                          <b>
                            {option.price
                              ? `$${option.price}${option.district === 'CBD' ? ' + tax' : ''}`
                              : 'FREE'}
                          </b>
                        </div>
                        <button
                          disabled={
                            pendingAction !== null || complete || cash < cost
                          }
                          onClick={() => void performCare(option)}
                        >
                          {complete
                            ? `${option.category} COMPLETE`
                            : pendingAction === `care:${option.code}`
                              ? 'RECORDING…'
                              : travel
                                ? 'TRAVEL TO CBD'
                                : 'CHOOSE TODAY'}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
            {place === 'social' && (
              <>
                <small>SOCIAL PLAZA · CONSENT-FIRST PREVIEW</small>
                <h1>A living city, private by default.</h1>
                <p>
                  This build contains 32 representative NPCs. Real-player
                  encounters, Contact Coin checkout, world visits, cyber dates
                  and parties are not live yet.
                </p>
                <div className="social-status">
                  <span>
                    <b>NPC ONLY</b>
                    <small>CURRENT SCENE</small>
                  </span>
                  <span>
                    <b>OFFLINE</b>
                    <small>REAL-PLAYER DISCOVERY</small>
                  </span>
                  <span>
                    <b>{contactCoins} · NOT FOR SALE</b>
                    <small>CONTACT COINS</small>
                  </span>
                  <span>
                    <b>DESIGN TARGET · 100 MAX</b>
                    <small>PARTIES</small>
                  </span>
                </div>
                <section className="privacy-setting">
                  <div>
                    <Users />
                    <span>
                      <small>FUTURE DISCOVERY PREFERENCE</small>
                      <b>
                        {socialMode === 'PRIVATE'
                          ? 'Private'
                          : 'Approachable · preference only'}
                      </b>
                      <p>
                        {socialMode === 'PRIVATE'
                          ? 'No other player can discover you.'
                          : 'Your choice is saved for a future opt-in test. You are not visible in this build.'}
                      </p>
                    </span>
                  </div>
                  <div>
                    <button
                      className={socialMode === 'PRIVATE' ? 'active' : ''}
                      disabled={pendingAction !== null}
                      onClick={() => void changeSocialMode('PRIVATE')}
                    >
                      PRIVATE
                    </button>
                    <button
                      className={socialMode === 'APPROACHABLE' ? 'active' : ''}
                      disabled={pendingAction !== null}
                      onClick={() => void changeSocialMode('APPROACHABLE')}
                    >
                      APPROACHABLE · PREFERENCE ONLY
                    </button>
                  </div>
                </section>
                <div className="social-grid">
                  <article>
                    <small>NPC</small>
                    <h2>Representative citizens</h2>
                    <p>
                      Client-generated characters make streets feel alive
                      without pretending to be real people.
                    </p>
                    <i>AVAILABLE NOW</i>
                  </article>
                  <article>
                    <small>PLAYER SNAPSHOT</small>
                    <h2>World visits &amp; cyber dates</h2>
                    <p>
                      Planned visits require mutual invitation and load only a
                      published, privacy-safe world snapshot.
                    </p>
                    <i>NOT LIVE</i>
                  </article>
                  <article>
                    <small>LIVE PLAYER</small>
                    <h2>Opt-in encounters</h2>
                    <p>
                      Future real players will be clearly labeled. Exact
                      location and real financial information will never be
                      displayed.
                    </p>
                    <i>DISCOVERY OFFLINE</i>
                  </article>
                  <article>
                    <small>CONTACT COINS</small>
                    <h2>One introduction request</h2>
                    <p>
                      A future coin cannot buy consent, a reply or personal
                      contact details. Rejected or expired requests return the
                      coin.
                    </p>
                    <button disabled>NO CHECKOUT IN THIS BUILD</button>
                  </article>
                  <article>
                    <small>PRIVATE PARTY</small>
                    <h2>20 → 50 → 100</h2>
                    <p>
                      Temporary party instances will scale only after load,
                      safety and moderation testing.
                    </p>
                    <button disabled>PARTIES NOT LIVE</button>
                  </article>
                </div>
                <p className="truth-note">
                  No payment is collected, no real player is exposed, and no
                  message is sent in this build.
                </p>
              </>
            )}
            {place === 'inventory' && (
              <>
                <small>OWNED GOODS</small>
                <h1>Your life, made visible</h1>
                <p>
                  Trading performance becomes clothing, experiences and property
                  designed for future opt-in world visits.
                </p>
                <div className="inventory-grid">
                  {inventory.length ? (
                    inventory.map((item, index) => (
                      <article key={`${item}-${index}`}>
                        <ShoppingBag />
                        <span>
                          <b>{item}</b>
                          <small>
                            Owned · future player marketplace support is planned
                          </small>
                        </span>
                      </article>
                    ))
                  ) : (
                    <article className="empty">
                      <ShoppingBag />
                      <span>
                        <b>No items yet</b>
                        <small>
                          Visit Neon Atelier or Nova Dining after your first
                          trade.
                        </small>
                      </span>
                    </article>
                  )}
                </div>
              </>
            )}
            {place === 'menu' && (
              <>
                <small>HOW TO PLAY</small>
                <h1>Trade your way out.</h1>
                <p>
                  Everybody begins with $10,000 and a 10 m² studio in a remote
                  high-density district. Study the world, protect your capital
                  and decide when a paid metro or taxi trip into the CBD is
                  worthwhile.
                </p>
                <div className="menu-list">
                  <span>
                    <kbd>1</kbd>
                    <b>Read</b> world news and company events
                  </span>
                  <span>
                    <kbd>2</kbd>
                    <b>Travel</b> to the CBD by paid metro or taxi
                  </span>
                  <span>
                    <kbd>3</kbd>
                    <b>Trade</b> a virtual position and manage risk
                  </span>
                  <span>
                    <kbd>4</kbd>
                    <b>Move up</b> through property, goods and status
                  </span>
                </div>
                <p className="save-state">
                  {signedIn
                    ? 'Cloud save is connected for this player.'
                    : 'Guest mode is playable now. Sign in to retain progress across sessions.'}
                  <small>CC0 3D assets by Kenney and Quaternius.</small>
                </p>
              </>
            )}
            {place === 'villa' && (
              <>
                <small>
                  MILLIONAIRE RIDGE · OPEN VISITATION · OWNERSHIP BY VIRTUAL
                  WEALTH
                </small>
                <VisionPanel
                  image="/visuals/ampliworld-millionaire-ridge.jpg"
                  label="MILLIONAIRE RIDGE · CONCEPT ENVIRONMENT"
                  alt="Concept visualization of the AmpliWorld detached-villa community"
                />
                <h1>Visit freely. Earn the right to own.</h1>
                <p>
                  Every player may walk the district and inspect its
                  architecture. Most residences are bought with virtual dollars
                  earned in the market. The final estate offers either an
                  extreme virtual-money path or a future premium cosmetic
                  edition—never a trading advantage.
                </p>
                <div className="villa-ledger">
                  <span>
                    <b>Your virtual net worth</b>$
                    {netWorth.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  <span>
                    <b>Ownership tier begins</b>$1,000,000
                  </span>
                  <span>
                    <b>Future premium exchange</b>$1 = 100 Credits
                  </span>
                </div>
                <div className="real-estate-grid">
                  <article>
                    <small>GARDEN SERIES</small>
                    <h2>Parkside Villa</h2>
                    <p>Detached home, private garden and two-car garage.</p>
                    <b>$1,200,000 virtual</b>
                    <button
                      disabled={pendingAction !== null}
                      onClick={() =>
                        void spend(1_200_000, 'Parkside Villa', 20)
                      }
                    >
                      BUY WITH VIRTUAL CASH
                    </button>
                  </article>
                  <article>
                    <small>COURTYARD SERIES</small>
                    <h2>Glass Courtyard Villa</h2>
                    <p>Pool courtyard, gallery wing and city membership.</p>
                    <b>$4,800,000 virtual</b>
                    <button
                      disabled={pendingAction !== null}
                      onClick={() =>
                        void spend(4_800_000, 'Glass Courtyard Villa', 30)
                      }
                    >
                      BUY WITH VIRTUAL CASH
                    </button>
                  </article>
                  <article>
                    <small>ESTATE SERIES</small>
                    <h2>Helix Estate</h2>
                    <p>Hilltop grounds, guest house and private showroom.</p>
                    <b>$25,000,000 virtual</b>
                    <button
                      disabled={pendingAction !== null}
                      onClick={() => void spend(25_000_000, 'Helix Estate', 40)}
                    >
                      BUY WITH VIRTUAL CASH
                    </button>
                  </article>
                  <article className="premium-estate">
                    <small>FOUNDERS&apos; EDITION</small>
                    <h2>Sky Estate</h2>
                    <p>
                      The same status is designed to be earned through
                      extraordinary play or purchased later as a cosmetic world
                      edition.
                    </p>
                    <b>
                      $250,000,000 virtual <em>or</em> 49,900 Credits
                    </b>
                    <div>
                      <button
                        disabled={pendingAction !== null}
                        onClick={() =>
                          void spend(250_000_000, 'Founders Sky Estate', 50)
                        }
                      >
                        EARN IN GAME
                      </button>
                      <button disabled>PREMIUM CHECKOUT NOT CONNECTED</button>
                    </div>
                  </article>
                </div>
              </>
            )}
            {place === 'fashion' && (
              <>
                <small>NEON ATELIER</small>
                <h1>Wear your success</h1>
                <p>
                  Skins are designed for future social spaces. Cosmetic
                  purchases cannot reduce trading fees.
                </p>
                <div className="goods">
                  <button
                    disabled={pendingAction !== null}
                    onClick={() => void spend(180, 'Midnight Trader Jacket', 8)}
                  >
                    <Shirt />
                    <span>
                      <b>Midnight Trader Jacket</b>
                      <small>$180 + 2% tax</small>
                    </span>
                  </button>
                  <button
                    disabled={pendingAction !== null}
                    onClick={() => void spend(480, 'Founder Skin', 15)}
                  >
                    <Shirt />
                    <span>
                      <b>Founder Skin</b>
                      <small>$480 + 2% tax</small>
                    </span>
                  </button>
                </div>
              </>
            )}
            {place === 'restaurant' && (
              <>
                <small>NOVA DINING</small>
                <h1>Tonight&apos;s table</h1>
                <p>
                  A complete meal contributes to today&apos;s care record.
                  Celebration goods remain cosmetic and cannot buy a trading-fee
                  advantage.
                </p>
                <div className="goods">
                  <button
                    disabled={pendingAction !== null || mealComplete}
                    onClick={() =>
                      void performCare(
                        LIFE_OPTIONS.find(
                          (option) => option.code === 'PROTEIN_PLATE',
                        )!,
                      )
                    }
                  >
                    <Utensils />
                    <span>
                      <b>Protein Plate</b>
                      <small>$22 + 2% tax · complete daily meal</small>
                    </span>
                  </button>
                  <button
                    disabled={pendingAction !== null}
                    aria-label="Buy Skyline Dinner"
                    onClick={() => void spend(42, 'Skyline Dinner', 6)}
                  >
                    <span>
                      <b>Skyline Dinner Collectible</b>
                      <small>$42 + 2% tax · cosmetic memory</small>
                    </span>
                  </button>
                </div>
              </>
            )}
            {place === 'property' && (
              <>
                <small>SKYLINE REALTY</small>
                <h1>Turn returns into a skyline</h1>
                <p>
                  Your 10 m² Starter Arcology studio has {leaseDays} days left.
                  Every better address makes progress visible.
                </p>
                <div className="property">
                  <Home />
                  <div>
                    <b>Cloudline Penthouse</b>
                    <span>$2,500,000 · Requires City Rank 100</span>
                  </div>
                  <i>LOCKED</i>
                </div>
                <div className="property">
                  <Car />
                  <div>
                    <b>Ion GT</b>
                    <span>$180,000 · Includes island access</span>
                  </div>
                  <i>LOCKED</i>
                </div>
              </>
            )}
            {place === 'career' && (
              <>
                <small>ACTIVE WORK · VIRTUAL WAGES</small>
                <h1>Earn enough to keep moving.</h1>
                <p>
                  Work pays immediately when you complete a short prototype
                  task. It can fund food and transit after a bad trading day,
                  but it cannot build a fortune: one shift per game day, two
                  shifts and $40 maximum per real UTC day.
                </p>
                <div className="work-ledger">
                  <span>
                    <b>{shiftsToday} / 2</b>shifts today
                  </span>
                  <span>
                    <b>${wagesToday.toFixed(2)} / $40</b>today&apos;s wages
                  </span>
                  <span>
                    <b>${lifetimeWages.toFixed(2)}</b>lifetime wages
                  </span>
                  <span>
                    <b>{lastWorkTurn === day ? 'COMPLETE' : 'OPEN'}</b>game-day
                    shift
                  </span>
                </div>
                <div className="interview">
                  <BriefcaseBusiness />
                  <div>
                    <b>
                      {career === 'UNEMPLOYED'
                        ? 'Market assistant interview'
                        : career}
                    </b>
                    <span>
                      Unlock the Market Brief Review role-play shift in the CBD.
                    </span>
                  </div>
                  {career === 'UNEMPLOYED' ? (
                    <button
                      disabled={pendingAction !== null}
                      onClick={() => void acceptJob()}
                    >
                      {pendingAction === 'hire'
                        ? 'INTERVIEWING…'
                        : atCbd
                          ? 'INTERVIEW'
                          : 'TRAVEL TO INTERVIEW'}
                    </button>
                  ) : (
                    <i>HIRED</i>
                  )}
                </div>
                <div className="job-grid">
                  {JOB_OPTIONS.map((job) => {
                    const travel = job.district === 'CBD' && !atCbd;
                    const locked = Boolean(
                      job.requiresCareer && career === 'UNEMPLOYED',
                    );
                    const complete =
                      lastWorkTurn === day ||
                      shiftsToday >= 2 ||
                      wagesToday >= 40;
                    return (
                      <article key={job.code}>
                        <BriefcaseBusiness />
                        <small>
                          {job.district === 'CBD' ? 'CYBER CBD' : 'ANYWHERE'} ·
                          PROTOTYPE TASK
                        </small>
                        <h2>{job.name}</h2>
                        <p>{job.description}</p>
                        <div>
                          <span>{job.durationMinutes} game min</span>
                          <b>
                            ${Math.min(job.pay, Math.max(0, 40 - wagesToday))}{' '}
                            virtual pay
                          </b>
                        </div>
                        <button
                          disabled={
                            pendingAction !== null || locked || complete
                          }
                          onClick={() => void completeShift(job)}
                        >
                          {locked
                            ? 'INTERVIEW REQUIRED'
                            : complete
                              ? 'SHIFT LIMIT REACHED'
                              : pendingAction === `work:${job.code}`
                                ? 'WORKING…'
                                : travel
                                  ? 'TRAVEL TO CBD'
                                  : 'COMPLETE DEMO SHIFT'}
                        </button>
                      </article>
                    );
                  })}
                </div>
                <p className="truth-note">
                  Prototype shifts currently resolve through a server-validated
                  one-click action; skill challenges and timed tasks are
                  planned.
                </p>
              </>
            )}
          </dialog>
        )}
      </section>
      <footer>
        <span>
          NET WORTH{' '}
          <b>
            ${netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </b>
        </span>
        <span>
          TOTAL PROGRESS{' '}
          <b className={netWorth >= 10000 ? 'gain' : 'loss'}>
            {netWorth >= 10000 ? '+' : ''}${(netWorth - 10000).toFixed(2)}
          </b>
        </span>
        <span>
          TRADING FEE <b>{tradingFeeBps} BPS</b>
        </span>
        <span>
          LOCATION{' '}
          <b>
            {activeScene === 'STARTER_ARCOLOGY'
              ? `BLOCK ${residenceBlock}`
              : locationLabel}
          </b>
        </span>
        <span>
          TRANSIT SPEND <b>${transitSpend.toFixed(2)}</b>
        </span>
        <span>
          CITY TAX <b>${tax.toFixed(2)}</b>
        </span>
        <span>
          WORLD{' '}
          <b>
            {REPRESENTED_REGION_KM} × {REPRESENTED_REGION_HEIGHT_KM} KM
          </b>
        </span>
        <span>
          STUDIO <b>10 m² · {leaseDays} DAYS</b>
        </span>
      </footer>
    </main>
  );
}
