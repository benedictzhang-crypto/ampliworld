export const VIRTUAL_MARKET = {
  NVDA: { name: 'NVIDIA', price: 184.26, pulse: 0.0062, seed: 1 },
  AAPL: { name: 'Apple', price: 238.41, pulse: 0.0038, seed: 2 },
  LVMUY: { name: 'LVMH', price: 134.08, pulse: 0.0046, seed: 3 },
  UUP: { name: 'US Dollar Index Fund', price: 27.16, pulse: 0.0018, seed: 4 },
  JETS: { name: 'Airline ETF', price: 24.63, pulse: 0.0054, seed: 5 },
  ITA: {
    name: 'Aerospace & Defense ETF',
    price: 203.52,
    pulse: 0.0042,
    seed: 6,
  },
} as const;

export type VirtualSymbol = keyof typeof VIRTUAL_MARKET;

export const GAME_ITEMS = {
  MIDNIGHT_TRADER_JACKET: {
    name: 'Midnight Trader Jacket',
    price: 180,
    happiness: 8,
  },
  FOUNDER_SKIN: { name: 'Founder Skin', price: 480, happiness: 15 },
  SKYLINE_DINNER: { name: 'Skyline Dinner', price: 42, happiness: 6 },
  INVESTOR_TASTING_MENU: {
    name: 'Investor Tasting Menu',
    price: 160,
    happiness: 12,
  },
  PARKSIDE_VILLA: { name: 'Parkside Villa', price: 1_200_000, happiness: 20 },
  GLASS_COURTYARD_VILLA: {
    name: 'Glass Courtyard Villa',
    price: 4_800_000,
    happiness: 30,
  },
  HELIX_ESTATE: { name: 'Helix Estate', price: 25_000_000, happiness: 40 },
  FOUNDERS_SKY_ESTATE: {
    name: "Founder's Sky Estate",
    price: 250_000_000,
    happiness: 50,
  },
} as const;

export type GameItemCode = keyof typeof GAME_ITEMS;

export const LIFE_ACTIVITIES = {
  DELIVERY_BOWL: {
    name: 'Basic Delivery Bowl',
    price: 12,
    happiness: 2,
    nutrition: 6,
    protein: 15,
    produce: 5,
    carePoints: 0,
    category: 'MEAL',
    district: 'ANY',
    description: 'Keeps the character going, but does not improve long-term care.',
  },
  PROTEIN_PLATE: {
    name: 'Protein Plate',
    price: 22,
    happiness: 5,
    nutrition: 18,
    protein: 100,
    produce: 25,
    carePoints: 3,
    category: 'MEAL',
    district: 'CBD',
    description: 'A complete meal that materially improves recovery.',
  },
  FRESH_FRUIT_BOX: {
    name: 'Fresh Fruit Box',
    price: 8,
    happiness: 3,
    nutrition: 10,
    protein: 10,
    produce: 100,
    carePoints: 2,
    category: 'WELLNESS',
    district: 'ANY',
    description: 'A low-cost daily wellness choice available to every player.',
  },
  PARK_WALK: {
    name: 'Waterfront Park Walk',
    price: 0,
    happiness: 4,
    nutrition: 0,
    protein: 0,
    produce: 0,
    carePoints: 1,
    category: 'LEISURE',
    district: 'CBD',
    description: 'Free recovery after the market closes.',
  },
  COAST_DAY_TRIP: {
    name: 'Coast Day Trip',
    price: 80,
    happiness: 14,
    nutrition: 2,
    protein: 0,
    produce: 0,
    carePoints: 4,
    category: 'LEISURE',
    district: 'CBD',
    description: 'A compressed trip to the coast, park and mountain overlook.',
  },
  ISLAND_WEEKEND: {
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
} as const;

export type LifeActivityCode = keyof typeof LIFE_ACTIVITIES;
export type LifeActivityCategory =
  (typeof LIFE_ACTIVITIES)[LifeActivityCode]['category'];

export const DAILY_JOBS = {
  REMOTE_NEWS_TAGGER: {
    name: 'Remote News Tagger',
    pay: 12,
    happiness: -1,
    district: 'ANY',
    durationMinutes: 3,
    description: 'Classify world events from the home terminal.',
  },
  PARK_STEWARD: {
    name: 'Waterfront Park Steward',
    pay: 18,
    happiness: 2,
    district: 'CBD',
    durationMinutes: 4,
    description: 'Help visitors and keep the promenade relaxed.',
  },
  CAFE_CLOSING_SHIFT: {
    name: 'Nova Café Closing Shift',
    pay: 24,
    happiness: -3,
    district: 'CBD',
    durationMinutes: 5,
    description: 'A reliable shift that pays for several city visits.',
  },
  MARKET_BRIEF_REVIEW: {
    name: 'Market Brief Review',
    pay: 30,
    happiness: -4,
    district: 'CBD',
    durationMinutes: 6,
    description: 'A focused research task for hired market assistants.',
  },
} as const;

export type DailyJobCode = keyof typeof DAILY_JOBS;

export const VIRTUAL_PROPERTY_CODES: readonly GameItemCode[] = [
  'PARKSIDE_VILLA',
  'GLASS_COURTYARD_VILLA',
  'HELIX_ESTATE',
  'FOUNDERS_SKY_ESTATE',
];

export const TRADING_FEE_RATE = 0.001;
export const TRADING_TAX_RATE = 0.0005;
export const SHOPPING_TAX_RATE = 0.02;

export const LEVERAGE_LEVELS = [1, 2, 3, 5] as const;
export type LeverageLevel = (typeof LEVERAGE_LEVELS)[number];

export const MAINTENANCE_MARGIN_RATES: Record<LeverageLevel, number> = {
  1: 0,
  2: 0.3,
  3: 0.22,
  5: 0.15,
};

type WorldEventDefinition = {
  id: string;
  domain: string;
  headline: string;
  impacts: string[];
  marketImpacts: Partial<Record<VirtualSymbol, number>>;
};

const WORLD_EVENT_CYCLE: WorldEventDefinition[] = [
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

const WORLD_EVENT_WEIGHTS = [0.23, 0.11, 0.18, 0.11, 0.08, 0.18, 0.08, 0.03];
const DEFAULT_DEMO_SEED = 'AMPLIWORLD_DETERMINISTIC_DEMO';
export const MAX_SIMULATION_TURN = 3_650;

function normalizedTurn(turn: number) {
  if (!Number.isFinite(turn)) return 1;
  return Math.min(MAX_SIMULATION_TURN, Math.max(1, Math.floor(turn)));
}

function seededUnit(seed: string, turn: number, salt: string) {
  const input = `${seed}:${turn}:${salt}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) / 0x1_0000_0000;
}

function eventIndexAtTurn(turn: number, scenarioSeed: string) {
  const draw = seededUnit(scenarioSeed, normalizedTurn(turn), 'WORLD_EVENT');
  let cumulative = 0;
  for (let index = 0; index < WORLD_EVENT_WEIGHTS.length; index += 1) {
    cumulative += WORLD_EVENT_WEIGHTS[index];
    if (draw < cumulative) return index;
  }
  return WORLD_EVENT_WEIGHTS.length - 1;
}

function eventReturn(
  symbol: VirtualSymbol,
  eventIndex: number,
  turn: number,
  scenarioSeed: string,
) {
  const asset = VIRTUAL_MARKET[symbol];
  const event = WORLD_EVENT_CYCLE[eventIndex];
  const idiosyncraticPulse =
    (seededUnit(scenarioSeed, turn, `${symbol}:ASSET`) - 0.5) * 2 * asset.pulse;
  const commonPulse =
    (seededUnit(scenarioSeed, turn, 'COMMON_MARKET') - 0.5) * 0.004;
  return Math.max(
    -0.12,
    Math.min(
      0.12,
      (event.marketImpacts[symbol] ?? 0) + idiosyncraticPulse + commonPulse,
    ),
  );
}

export function worldEventAtTurn(
  turn: number,
  scenarioSeed = DEFAULT_DEMO_SEED,
) {
  const day = normalizedTurn(turn);
  const index = eventIndexAtTurn(day, scenarioSeed);
  const event = WORLD_EVENT_CYCLE[index];
  return {
    id: event.id,
    domain: event.domain,
    headline: event.headline,
    impacts: event.impacts,
    turn: day,
    scenarioMode: 'SEEDED_SHARED_SIMULATION' as const,
  };
}

export function virtualQuoteAtTurn(
  symbol: VirtualSymbol,
  turn: number,
  scenarioSeed = DEFAULT_DEMO_SEED,
) {
  const day = normalizedTurn(turn);
  let logGrowth = 0;

  for (let priorTurn = 1; priorTurn < day; priorTurn += 1) {
    const priorEventIndex = eventIndexAtTurn(priorTurn, scenarioSeed);
    logGrowth += Math.log1p(
      eventReturn(symbol, priorEventIndex, priorTurn, scenarioSeed),
    );
  }

  // Keep even extremely long-running paper worlds numerically stable.
  const boundedGrowth = Math.exp(Math.max(-12, Math.min(12, logGrowth)));
  const open = Math.max(0.01, VIRTUAL_MARKET[symbol].price * boundedGrowth);
  const eventIndex = eventIndexAtTurn(day, scenarioSeed);
  const dailyReturn = eventReturn(symbol, eventIndex, day, scenarioSeed);
  const price = Math.max(0.01, open * (1 + dailyReturn));
  const roundPrice = (value: number) => Math.round(value * 100) / 100;

  return {
    symbol,
    name: VIRTUAL_MARKET[symbol].name,
    open: roundPrice(open),
    price: roundPrice(price),
    changePct: Math.round(dailyReturn * 10_000) / 100,
    turn: day,
    quoteSource: 'AMPLIWORLD_SEEDED_VIRTUAL_MARKET' as const,
  };
}

export function isVirtualSymbol(value: string): value is VirtualSymbol {
  return Object.prototype.hasOwnProperty.call(VIRTUAL_MARKET, value);
}

export function isGameItemCode(value: string): value is GameItemCode {
  return Object.prototype.hasOwnProperty.call(GAME_ITEMS, value);
}

export function isLifeActivityCode(value: string): value is LifeActivityCode {
  return Object.prototype.hasOwnProperty.call(LIFE_ACTIVITIES, value);
}

export function isDailyJobCode(value: string): value is DailyJobCode {
  return Object.prototype.hasOwnProperty.call(DAILY_JOBS, value);
}

export function isVirtualPropertyCode(value: GameItemCode) {
  return VIRTUAL_PROPERTY_CODES.includes(value);
}

export function isLeverageLevel(value: number): value is LeverageLevel {
  return LEVERAGE_LEVELS.some((level) => level === value);
}
