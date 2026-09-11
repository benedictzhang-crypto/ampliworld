import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import {
  DEFAULT_METRO_STATION_BY_DISTRICT,
  headingAlongNearestRoad,
  metroHubById,
  metroStationByCode,
} from '../../world-topology';
import {
  DAILY_JOBS,
  GAME_ITEMS,
  isDailyJobCode,
  isGameItemCode,
  isLeverageLevel,
  isLifeActivityCode,
  isVirtualPropertyCode,
  isVirtualSymbol,
  LEVERAGE_LEVELS,
  LIFE_ACTIVITIES,
  type LeverageLevel,
  MAINTENANCE_MARGIN_RATES,
  MAX_SIMULATION_TURN,
  SHOPPING_TAX_RATE,
  TRADING_FEE_RATE,
  TRADING_TAX_RATE,
  VIRTUAL_MARKET,
  virtualQuoteAtTurn,
  worldEventAtTurn,
} from './market';

const STARTING_CASH = 10_000;
const MIN_ORDER_NOTIONAL = 1;
const MAX_ORDER_NOTIONAL = 1_000_000_000;
const QUANTITY_EPSILON = 0.00000001;
const MANSION_NET_WORTH_REQUIREMENT = 1_000_000;
const RELIEF_ELIGIBILITY_NET_WORTH = 500;
const RELIEF_TARGET_CASH = 1_000;
const MAX_RELIEF_CLAIMS = 2;
const RELIEF_COOLDOWN_TURNS = 30;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const IDEMPOTENCY_HISTORY_LIMIT = 200;
const MAX_DAILY_WORK_SHIFTS = 2;
const MAX_DAILY_WAGES = 40;
const DAILY_HAPPINESS_DECAY = 2;
const DAILY_NUTRITION_DECAY = 6;
const WELL_CARED_POINTS = 4;
const STARTER_TOWER_COUNT = 1_000;
const STARTER_TOWER_FLOORS = 50;
const STARTER_UNITS_PER_FLOOR = 200;
const STARTER_STUDIO_AREA_SQM = 10;
const STARTER_RESIDENTS_PER_TOWER =
  STARTER_TOWER_FLOORS * STARTER_UNITS_PER_FLOOR;
const STARTER_DISTRICT_CAPACITY =
  STARTER_TOWER_COUNT * STARTER_RESIDENTS_PER_TOWER;

const DISTRICTS = ['STARTER_ARCOLOGY', 'CBD'] as const;
type District = (typeof DISTRICTS)[number];

const TRANSIT_OPTIONS = {
  METRO: {
    fare: 5,
    durationGameMinutes: 28,
    minimumCashBeforeTrip: 0,
    minimumCashAfterTrip: -5,
  },
  TAXI: {
    fare: 45,
    durationGameMinutes: 11,
    minimumCashBeforeTrip: 45,
    minimumCashAfterTrip: 0,
  },
} as const;
type TransitMode = keyof typeof TRANSIT_OPTIONS;

type JsonObject = Record<string, unknown>;

interface PlayerRow {
  cash: number;
  portfolioValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  happiness: number;
  nutrition: number;
  careStreak: number;
  dailyCarePoints: number;
  dailyProtein: number;
  dailyProduce: number;
  lastMealTurn: number;
  lastWellnessTurn: number;
  lastLeisureTurn: number;
  tradingFeeBps: number;
  cityTaxPaid: number;
  marginUsed: number;
  grossExposure: number;
  borrowedExposure: number;
  maintenanceMarginRequired: number;
  liquidationCount: number;
  accountStatus: string;
  reliefClaims: number;
  lastReliefTurn: number;
  lastSettlementTurn: number;
  lastOperationId: string;
  apartmentLeaseDays: number;
  currentDistrict: string;
  currentStationId: string;
  worldX: number;
  worldZ: number;
  worldHeading: number;
  starterTower: number;
  starterFloor: number;
  starterUnit: number;
  transitSpend: number;
  transitTrips: number;
  metroRides: number;
  taxiRides: number;
  lastTransitMode: string;
  lastTransitFare: number;
  lastTransitAt: string;
  careerStatus: string;
  lastWorkTurn: number;
  workStreak: number;
  lifetimeWages: number;
  workDate: string;
  shiftsToday: number;
  wagesToday: number;
  socialMode: string;
  contactCoins: number;
  turn: number;
  marketSeed: string;
  updatedAt: string;
}

interface HoldingRow {
  symbol: string;
  quantity: number;
  averagePrice: number;
  leverage: number;
  marginPosted: number;
  borrowedAmount: number;
  lastMarkPrice: number;
  maintenanceMarginRate: number;
  updatedAt: string;
}

interface InventoryRow {
  itemCode: string;
  displayName: string;
  quantity: number;
  unitPrice: number;
  taxPaid: number;
  acquiredAt: string;
  updatedAt: string;
}

interface TradeRow {
  id: number;
  symbol: string;
  side: 'BUY' | 'SELL' | 'LIQUIDATION';
  quantity: number;
  notional: number;
  price: number;
  fee: number;
  tax: number;
  realizedPnl: number;
  leverage: number;
  marginRequired: number;
  createdAt: string;
}

interface MarginEventRow {
  id: number;
  turn: number;
  eventType: 'DAILY_SETTLEMENT' | 'LIQUIDATION' | 'RELIEF';
  symbol: string | null;
  dailyPnl: number;
  accountEquity: number;
  maintenanceRequired: number;
  details: string;
  createdAt: string;
}

interface TransitTripRow {
  id: number;
  turn: number;
  fromDistrict: string;
  toDistrict: string;
  stationId: string | null;
  mode: TransitMode;
  fare: number;
  durationGameMinutes: number;
  createdAt: string;
}

interface LifeEventRow {
  id: number;
  turn: number;
  activityCode: string;
  category: string;
  price: number;
  tax: number;
  happinessDelta: number;
  nutritionDelta: number;
  carePoints: number;
  createdAt: string;
}

interface WorkShiftRow {
  id: number;
  turn: number;
  jobCode: string;
  pay: number;
  happinessDelta: number;
  createdAt: string;
}

let databasePreparation: Promise<void> | undefined;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 100_000_000) / 100_000_000;
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizedFeeBps(value: number) {
  return Math.min(10, Math.max(0, Math.round(value)));
}

function careScore(happiness: number, nutrition: number, careStreak: number) {
  return clampScore(
    happiness * 0.6 + nutrition * 0.4 + Math.min(10, careStreak),
  );
}

function feeBpsForCare(
  happiness: number,
  nutrition: number,
  careStreak: number,
) {
  const score = careScore(happiness, nutrition, careStreak);
  const rawFeeBps = Math.min(10, Math.max(0, Math.ceil((100 - score) / 5)));
  return rawFeeBps === 0 && careStreak < 7 ? 1 : rawFeeBps;
}

function tradingFee(notional: number, feeBps: number) {
  const rate = normalizedFeeBps(feeBps) / 10_000;
  return rate === 0 ? 0 : roundMoney(Math.max(0.01, notional * rate));
}

function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function nextCareState(player: PlayerRow) {
  const happiness = clampScore(player.happiness - DAILY_HAPPINESS_DECAY);
  const nutrition = clampScore(player.nutrition - DAILY_NUTRITION_DECAY);
  const completeCareDay =
    player.dailyCarePoints >= WELL_CARED_POINTS &&
    player.dailyProtein >= 70 &&
    player.dailyProduce >= 70 &&
    nutrition >= 55;
  const careStreak = completeCareDay
    ? Math.min(30, player.careStreak + 1)
    : Math.max(0, player.careStreak - 1);
  return {
    happiness,
    nutrition,
    careStreak,
    completeCareDay,
    tradingFeeBps: feeBpsForCare(happiness, nutrition, careStreak),
  };
}

function playerDistrict(value: string): District {
  return DISTRICTS.includes(value as District)
    ? (value as District)
    : 'STARTER_ARCOLOGY';
}

function metroArrivalByCode(stationCode: string) {
  const station = metroStationByCode(stationCode);
  if (!station) return undefined;
  const hub = metroHubById(station.topologyId);
  if (!hub) return undefined;
  return {
    stationId: station.id,
    topologyId: station.topologyId,
    district: station.district,
    x: station.arrival[0],
    z: station.arrival[1],
    heading: headingAlongNearestRoad(station.arrival),
  };
}

function defaultMetroArrival(district: District) {
  const stationCode = DEFAULT_METRO_STATION_BY_DISTRICT[district];
  const arrival = metroArrivalByCode(stationCode);
  if (!arrival) {
    throw new Error(`Default metro station ${stationCode} is not configured`);
  }
  return arrival;
}

function starterResidenceAssignment() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  const residenceIndex = values[0]! % STARTER_DISTRICT_CAPACITY;
  const tower = Math.floor(residenceIndex / STARTER_RESIDENTS_PER_TOWER) + 1;
  const withinTower = residenceIndex % STARTER_RESIDENTS_PER_TOWER;
  const floor = Math.floor(withinTower / STARTER_UNITS_PER_FLOOR) + 1;
  const unit = (withinTower % STARTER_UNITS_PER_FLOOR) + 1;
  return { tower, floor, unit };
}

function errorResponse(error: string, code: string, status = 400) {
  return Response.json({ error, code, virtualOnly: true }, { status });
}

function cbdTravelRequiredResponse() {
  return errorResponse(
    'Travel to the CBD by metro or taxi before using this city service',
    'CBD_TRAVEL_REQUIRED',
    403,
  );
}

async function prepareDatabaseInternal() {
  // Schema evolution is migration-only. Runtime DDL can race with a deployment
  // migration and leave D1 half-upgraded, so requests only verify readiness.
  try {
    await env.DB.batch([
      env.DB.prepare(
        `SELECT user_id, market_seed, last_operation_id, current_district,
          current_station_id, world_x, world_z, world_heading,
          starter_tower, starter_floor, starter_unit, transit_spend,
          transit_trips, metro_rides, taxi_rides, last_transit_mode,
          last_transit_fare, last_transit_at, nutrition, care_streak,
          daily_care_points, daily_protein, daily_produce,
          last_meal_turn, last_wellness_turn, last_leisure_turn,
          trading_fee_bps, last_work_turn, work_streak, lifetime_wages,
          work_date, shifts_today, wages_today, social_mode, contact_coins
         FROM players LIMIT 0`,
      ),
      env.DB.prepare(
        'SELECT user_id, leverage, margin_posted FROM holdings LIMIT 0',
      ),
      env.DB.prepare('SELECT user_id, item_code FROM inventory LIMIT 0'),
      env.DB.prepare(
        'SELECT user_id, leverage, margin_required FROM trades LIMIT 0',
      ),
      env.DB.prepare('SELECT user_id, event_type FROM margin_events LIMIT 0'),
      env.DB.prepare(
        'SELECT user_id, request_id, completed FROM game_idempotency LIMIT 0',
      ),
      env.DB.prepare(
        `SELECT user_id, from_district, to_district, mode, fare,
          station_id, duration_game_minutes, created_at
         FROM transit_trips LIMIT 0`,
      ),
      env.DB.prepare(
        `SELECT user_id, turn, activity_code, category, price, tax,
          happiness_delta, nutrition_delta, care_points, created_at
         FROM life_events LIMIT 0`,
      ),
      env.DB.prepare(
        `SELECT user_id, turn, job_code, pay, happiness_delta, created_at
         FROM work_shifts LIMIT 0`,
      ),
      env.DB.prepare('SELECT id, market_seed FROM game_world LIMIT 0'),
    ]);
    const world = await env.DB.prepare(
      `SELECT market_seed AS marketSeed FROM game_world WHERE id = 'MAIN'`,
    ).first<{ marketSeed: string }>();
    if (!world?.marketSeed) throw new Error('MAIN world seed is missing');
  } catch (error) {
    throw new Error(`Game database migrations are required: ${String(error)}`);
  }
}

async function prepareDatabase() {
  if (!databasePreparation) {
    databasePreparation = prepareDatabaseInternal().catch((error) => {
      databasePreparation = undefined;
      throw error;
    });
  }
  await databasePreparation;
}

async function ensurePlayer(userId: string) {
  const now = new Date().toISOString();
  const marketSeed = crypto.randomUUID();
  const residence = starterResidenceAssignment();
  const arrival = defaultMetroArrival('STARTER_ARCOLOGY');
  await env.DB.prepare(
    `INSERT OR IGNORE INTO players (
      user_id, cash, portfolio_value, realized_pnl, unrealized_pnl, happiness,
      city_tax_paid, apartment_lease_days, career_status, turn, market_seed,
      current_district, current_station_id, world_x, world_z, world_heading,
      starter_tower, starter_floor, starter_unit,
      transit_spend, transit_trips, metro_rides, taxi_rides,
      last_transit_mode, last_transit_fare,
      last_transit_at, last_operation_id, created_at, updated_at
    ) VALUES (
      ?, ?, 0, 0, 0, 52, 0, 365, 'UNEMPLOYED', 1, ?,
      'STARTER_ARCOLOGY', ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, '', 0, '', '', ?, ?
    )`,
  )
    .bind(
      userId,
      STARTING_CASH,
      marketSeed,
      arrival.stationId,
      arrival.x,
      arrival.z,
      arrival.heading,
      residence.tower,
      residence.floor,
      residence.unit,
      now,
      now,
    )
    .run();
}

function holdingLeverage(value: number): LeverageLevel {
  return isLeverageLevel(value) ? value : 1;
}

function markHoldings(
  holdings: HoldingRow[],
  turn: number,
  marketSeed: string,
) {
  return holdings.map((holding) => {
    const leverage = holdingLeverage(holding.leverage);
    const quote = isVirtualSymbol(holding.symbol)
      ? virtualQuoteAtTurn(holding.symbol, turn, marketSeed)
      : {
          price: holding.averagePrice,
          open: holding.averagePrice,
          changePct: 0,
          quoteSource: 'AMPLIWORLD_VIRTUAL_MARKET' as const,
        };
    const quantity = roundQuantity(holding.quantity);
    const marketValue = roundMoney(quantity * quote.price);
    const borrowedAmount = roundMoney(Math.max(0, holding.borrowedAmount));
    const marginPosted = roundMoney(
      holding.marginPosted > 0
        ? holding.marginPosted
        : (quantity * holding.averagePrice) / leverage,
    );
    const lastMarkPrice =
      holding.lastMarkPrice > 0 ? holding.lastMarkPrice : holding.averagePrice;
    const positionEquity = roundMoney(marketValue - borrowedAmount);
    const unrealizedPnl = roundMoney(
      quantity * (quote.price - holding.averagePrice),
    );
    const maintenanceMarginRate = MAINTENANCE_MARGIN_RATES[leverage];
    const maintenanceMargin = roundMoney(marketValue * maintenanceMarginRate);
    return {
      ...holding,
      quantity,
      averagePrice: roundMoney(holding.averagePrice),
      avgPrice: roundMoney(holding.averagePrice),
      leverage,
      marginPosted,
      borrowedAmount,
      lastMarkPrice: roundMoney(lastMarkPrice),
      maintenanceMarginRate,
      marketPrice: quote.price,
      open: quote.open,
      changePct: quote.changePct,
      marketValue,
      positionEquity,
      unrealizedPnl,
      dailyPnl: roundMoney(quantity * (quote.price - lastMarkPrice)),
      maintenanceMargin,
      marginRatio:
        marketValue > 0
          ? Math.round((positionEquity / marketValue) * 10_000) / 10_000
          : 0,
      liquidationPrice: null,
      liquidationPriceType: 'CROSS_MARGIN_ACCOUNT_LEVEL' as const,
      quoteSource: quote.quoteSource,
    };
  });
}

function accountMetrics(
  cash: number,
  markedHoldings: ReturnType<typeof markHoldings>,
) {
  const grossExposure = roundMoney(
    markedHoldings.reduce((total, holding) => total + holding.marketValue, 0),
  );
  const borrowedExposure = roundMoney(
    markedHoldings.reduce(
      (total, holding) => total + holding.borrowedAmount,
      0,
    ),
  );
  const marginUsed = roundMoney(
    markedHoldings.reduce((total, holding) => total + holding.marginPosted, 0),
  );
  const maintenanceMarginRequired = roundMoney(
    markedHoldings.reduce(
      (total, holding) => total + holding.maintenanceMargin,
      0,
    ),
  );
  const portfolioValue = roundMoney(grossExposure - borrowedExposure);
  const unrealizedPnl = roundMoney(
    markedHoldings.reduce((total, holding) => total + holding.unrealizedPnl, 0),
  );
  const netWorth = roundMoney(cash + portfolioValue);
  return {
    portfolioValue,
    unrealizedPnl,
    grossExposure,
    borrowedExposure,
    marginUsed,
    maintenanceMarginRequired,
    marginExcess: roundMoney(netWorth - maintenanceMarginRequired),
    effectiveLeverage:
      grossExposure > 0 && netWorth > 0
        ? Math.round((grossExposure / netWorth) * 100) / 100
        : 0,
    netWorth,
    marginCall:
      maintenanceMarginRequired > 0 && netWorth < maintenanceMarginRequired,
  };
}

async function readPlayer(userId: string) {
  return env.DB.prepare(
    `SELECT cash, portfolio_value AS portfolioValue, realized_pnl AS realizedPnl,
      unrealized_pnl AS unrealizedPnl, happiness, nutrition,
      care_streak AS careStreak, daily_care_points AS dailyCarePoints,
      daily_protein AS dailyProtein, daily_produce AS dailyProduce,
      last_meal_turn AS lastMealTurn,
      last_wellness_turn AS lastWellnessTurn,
      last_leisure_turn AS lastLeisureTurn,
      trading_fee_bps AS tradingFeeBps, city_tax_paid AS cityTaxPaid,
      margin_used AS marginUsed, gross_exposure AS grossExposure,
      borrowed_exposure AS borrowedExposure,
      maintenance_margin_required AS maintenanceMarginRequired,
      liquidation_count AS liquidationCount, account_status AS accountStatus,
      relief_claims AS reliefClaims, last_relief_turn AS lastReliefTurn,
      last_settlement_turn AS lastSettlementTurn,
      last_operation_id AS lastOperationId,
      apartment_lease_days AS apartmentLeaseDays,
      current_district AS currentDistrict,
      current_station_id AS currentStationId,
      world_x AS worldX, world_z AS worldZ, world_heading AS worldHeading,
      starter_tower AS starterTower, starter_floor AS starterFloor,
      starter_unit AS starterUnit, transit_spend AS transitSpend,
      transit_trips AS transitTrips, metro_rides AS metroRides,
      taxi_rides AS taxiRides, last_transit_mode AS lastTransitMode,
      last_transit_fare AS lastTransitFare,
      last_transit_at AS lastTransitAt, career_status AS careerStatus,
      last_work_turn AS lastWorkTurn, work_streak AS workStreak,
      lifetime_wages AS lifetimeWages, work_date AS workDate,
      shifts_today AS shiftsToday, wages_today AS wagesToday,
      social_mode AS socialMode, contact_coins AS contactCoins,
      turn,
      (SELECT market_seed FROM game_world WHERE id = 'MAIN') AS marketSeed,
      updated_at AS updatedAt
     FROM players WHERE user_id = ?`,
  )
    .bind(userId)
    .first<PlayerRow>();
}

async function readHoldings(userId: string) {
  const result = await env.DB.prepare(
    `SELECT symbol, quantity, average_price AS averagePrice, leverage,
      margin_posted AS marginPosted, borrowed_amount AS borrowedAmount,
      last_mark_price AS lastMarkPrice,
      maintenance_margin_rate AS maintenanceMarginRate,
      updated_at AS updatedAt
     FROM holdings WHERE user_id = ? AND quantity > ? ORDER BY symbol`,
  )
    .bind(userId, QUANTITY_EPSILON)
    .all<HoldingRow>();
  return result.results;
}

async function readInventory(userId: string) {
  const result = await env.DB.prepare(
    `SELECT item_code AS itemCode, display_name AS displayName, quantity,
      unit_price AS unitPrice, tax_paid AS taxPaid,
      acquired_at AS acquiredAt, updated_at AS updatedAt
     FROM inventory WHERE user_id = ? ORDER BY acquired_at DESC`,
  )
    .bind(userId)
    .all<InventoryRow>();
  return result.results;
}

function propertyBookValue(inventory: InventoryRow[]) {
  return roundMoney(
    inventory.reduce((total, item) => {
      if (
        !isGameItemCode(item.itemCode) ||
        !isVirtualPropertyCode(item.itemCode)
      ) {
        return total;
      }
      return total + item.quantity * item.unitPrice;
    }, 0),
  );
}

async function getSnapshot(userId: string, retry = 0) {
  const player = await readPlayer(userId);
  if (!player) throw new Error('Player initialization failed');
  const markedHoldings = markHoldings(
    await readHoldings(userId),
    player.turn,
    player.marketSeed,
  );
  const metrics = accountMetrics(player.cash, markedHoldings);
  const now = new Date().toISOString();

  const [
    inventory,
    tradesResult,
    marginEventsResult,
    transitTripsResult,
    lifeEventsResult,
    workShiftsResult,
  ] = await Promise.all([
    readInventory(userId),
    env.DB.prepare(
      `SELECT id, symbol, side, quantity, notional, price, fee, tax,
        realized_pnl AS realizedPnl, leverage, margin_required AS marginRequired,
        created_at AS createdAt
       FROM trades WHERE user_id = ? ORDER BY id DESC`,
    )
      .bind(userId)
      .all<TradeRow>(),
    env.DB.prepare(
      `SELECT id, turn, event_type AS eventType, symbol, daily_pnl AS dailyPnl,
        account_equity AS accountEquity,
        maintenance_required AS maintenanceRequired, details,
        created_at AS createdAt
       FROM margin_events WHERE user_id = ? ORDER BY id DESC LIMIT 100`,
    )
      .bind(userId)
      .all<MarginEventRow>(),
    env.DB.prepare(
      `SELECT id, turn, from_district AS fromDistrict,
        to_district AS toDistrict, station_id AS stationId, mode, fare,
        duration_game_minutes AS durationGameMinutes, created_at AS createdAt
       FROM transit_trips WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
    )
      .bind(userId)
      .all<TransitTripRow>(),
    env.DB.prepare(
      `SELECT id, turn, activity_code AS activityCode, category, price, tax,
          happiness_delta AS happinessDelta,
          nutrition_delta AS nutritionDelta, care_points AS carePoints,
          created_at AS createdAt
         FROM life_events WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
    )
      .bind(userId)
      .all<LifeEventRow>(),
    env.DB.prepare(
      `SELECT id, turn, job_code AS jobCode, pay,
          happiness_delta AS happinessDelta, created_at AS createdAt
         FROM work_shifts WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
    )
      .bind(userId)
      .all<WorkShiftRow>(),
  ]);
  const latestPlayer = await readPlayer(userId);
  if (
    latestPlayer &&
    retry < 2 &&
    (latestPlayer.lastOperationId !== player.lastOperationId ||
      latestPlayer.turn !== player.turn ||
      latestPlayer.cash !== player.cash ||
      latestPlayer.updatedAt !== player.updatedAt)
  ) {
    return getSnapshot(userId, retry + 1);
  }

  const ownedPropertyValue = propertyBookValue(inventory);
  const totalNetWorth = roundMoney(metrics.netWorth + ownedPropertyValue);
  const accountStatus = totalNetWorth <= 0 ? 'BANKRUPT' : player.accountStatus;
  const mansionEligible = totalNetWorth >= MANSION_NET_WORTH_REQUIREMENT;
  const reliefCooldownRemaining = Math.max(
    0,
    RELIEF_COOLDOWN_TURNS - (player.turn - player.lastReliefTurn),
  );
  const reliefEligible =
    markedHoldings.length === 0 &&
    totalNetWorth < RELIEF_ELIGIBILITY_NET_WORTH &&
    ['BANKRUPT', 'MARGIN_LIQUIDATED'].includes(accountStatus) &&
    player.reliefClaims < MAX_RELIEF_CLAIMS &&
    reliefCooldownRemaining === 0;
  const { marketSeed: privateMarketSeed, ...publicPlayer } = player;
  void privateMarketSeed;
  const currentDistrict = playerDistrict(player.currentDistrict);
  const savedArrival = metroArrivalByCode(player.currentStationId);
  const metroLocation =
    savedArrival?.district === currentDistrict
      ? savedArrival
      : defaultMetroArrival(currentDistrict);
  const hasValidSavedLocation = savedArrival?.district === currentDistrict;
  const tradingFeeBps = normalizedFeeBps(player.tradingFeeBps);
  const today = utcDateKey();
  const shiftsToday = player.workDate === today ? player.shiftsToday : 0;
  const wagesToday =
    player.workDate === today ? roundMoney(player.wagesToday) : 0;
  const normalizedPlayer = {
    ...publicPlayer,
    ...metrics,
    liquidNetWorth: metrics.netWorth,
    propertyValue: ownedPropertyValue,
    netWorth: totalNetWorth,
    accountStatus,
    cash: roundMoney(player.cash),
    realizedPnl: roundMoney(player.realizedPnl),
    cityTaxPaid: roundMoney(player.cityTaxPaid),
    cityTax: roundMoney(player.cityTaxPaid),
    currentDistrict,
    currentStationId: metroLocation.stationId,
    worldX:
      hasValidSavedLocation && Number.isFinite(player.worldX)
        ? player.worldX
        : metroLocation.x,
    worldZ:
      hasValidSavedLocation && Number.isFinite(player.worldZ)
        ? player.worldZ
        : metroLocation.z,
    worldHeading:
      hasValidSavedLocation && Number.isFinite(player.worldHeading)
        ? player.worldHeading
        : metroLocation.heading,
    happiness: clampScore(player.happiness),
    nutrition: clampScore(player.nutrition),
    careStreak: Math.max(0, player.careStreak),
    tradingFeeBps,
    tradingFeeRate: tradingFeeBps / 10_000,
    shiftsToday,
    wagesToday,
    lifetimeWages: roundMoney(player.lifetimeWages),
    transitSpend: roundMoney(player.transitSpend),
    lastTransitFare: roundMoney(player.lastTransitFare),
    totalTradingPnl: roundMoney(player.realizedPnl + metrics.unrealizedPnl),
    updatedAt: player.updatedAt,
    mansionEligible,
    reliefEligible,
    reliefClaimsRemaining: Math.max(0, MAX_RELIEF_CLAIMS - player.reliefClaims),
    reliefCooldownRemaining,
  };

  return {
    player: normalizedPlayer,
    holdings: markedHoldings,
    inventory: inventory.map((item) => {
      const isProperty =
        isGameItemCode(item.itemCode) && isVirtualPropertyCode(item.itemCode);
      return {
        ...item,
        name: item.displayName,
        isProperty,
        assetValue: isProperty ? roundMoney(item.quantity * item.unitPrice) : 0,
      };
    }),
    trades: tradesResult.results,
    marginEvents: marginEventsResult.results,
    transitHistory: transitTripsResult.results,
    lifeHistory: lifeEventsResult.results,
    workHistory: workShiftsResult.results,
    market: Object.keys(VIRTUAL_MARKET).map((symbol) =>
      virtualQuoteAtTurn(
        symbol as keyof typeof VIRTUAL_MARKET,
        player.turn,
        player.marketSeed,
      ),
    ),
    worldEvent: worldEventAtTurn(player.turn, player.marketSeed),
    marketModel: {
      mode: 'SEEDED_SHARED_SIMULATION' as const,
      authority: 'SERVER' as const,
      stableWithinTurn: true,
      serverSeed: true,
      sharedAcrossPlayers: true,
      maxTurn: MAX_SIMULATION_TURN,
    },
    catalog: Object.entries(GAME_ITEMS).map(([itemCode, item]) => ({
      itemCode,
      ...item,
      isProperty: isGameItemCode(itemCode) && isVirtualPropertyCode(itemCode),
      currency: 'VIRTUAL_USD' as const,
    })),
    lifeCatalog: Object.entries(LIFE_ACTIVITIES).map(
      ([activityCode, activity]) => ({
        activityCode,
        ...activity,
        completedToday:
          activity.category === 'MEAL'
            ? player.lastMealTurn === player.turn
            : activity.category === 'WELLNESS'
              ? player.lastWellnessTurn === player.turn
              : player.lastLeisureTurn === player.turn,
        currency: 'VIRTUAL_USD' as const,
      }),
    ),
    jobs: Object.entries(DAILY_JOBS).map(([jobCode, job]) => ({
      jobCode,
      ...job,
      completedThisTurn: player.lastWorkTurn === player.turn,
      availableToday:
        shiftsToday < MAX_DAILY_WORK_SHIFTS && wagesToday < MAX_DAILY_WAGES,
      currency: 'VIRTUAL_USD' as const,
    })),
    wellbeing: {
      happiness: clampScore(player.happiness),
      nutrition: clampScore(player.nutrition),
      careScore: careScore(
        player.happiness,
        player.nutrition,
        player.careStreak,
      ),
      careStreak: Math.max(0, player.careStreak),
      dailyCarePoints: player.dailyCarePoints,
      dailyProtein: player.dailyProtein,
      dailyProduce: player.dailyProduce,
      mealComplete: player.lastMealTurn === player.turn,
      wellnessComplete: player.lastWellnessTurn === player.turn,
      leisureComplete: player.lastLeisureTurn === player.turn,
      tradingFeeBps,
      tradingFeeRate: tradingFeeBps / 10_000,
      zeroFeeRequirement: {
        minimumHappiness: 95,
        minimumNutrition: 90,
        minimumCareStreak: 7,
      },
      policy: 'CARE_SETTLES_AT_END_OF_DAY' as const,
    },
    employment: {
      shiftsToday,
      maxShiftsPerUtcDay: MAX_DAILY_WORK_SHIFTS,
      wagesToday,
      maxWagesPerUtcDay: MAX_DAILY_WAGES,
      lifetimeWages: roundMoney(player.lifetimeWages),
      paidOnCompletion: true,
      passiveWage: false,
    },
    social: {
      mode: player.socialMode === 'APPROACHABLE' ? 'APPROACHABLE' : 'PRIVATE',
      contactCoins: Math.max(0, player.contactCoins),
      realPlayerEncountersLive: false,
      worldVisitsLive: false,
      partyCapacityPlanned: 100,
      contactCoinCheckoutLive: false,
      humanLabelsRequired: true,
    },
    worldAtlas: {
      widthKm: 20,
      heightKm: 30,
      starter: { xKm: 2, yKm: 4 },
      cbd: { xKm: 14, yKm: 18 },
      coast: { xKm: 2.5, yKm: 18.5 },
      park: { xKm: 11, yKm: 16 },
      ridge: { xKm: 16.5, yKm: 24.5 },
      highlands: { xKm: 9, yKm: 28 },
    },
    marginPolicy: {
      levels: LEVERAGE_LEVELS.map((leverage) => ({
        leverage,
        initialMarginRate: 1 / leverage,
        maintenanceMarginRate: MAINTENANCE_MARGIN_RATES[leverage],
      })),
      settlement: 'END_DAY',
      liquidation: 'CROSS_MARGIN',
      positionLiquidationPrice: 'NOT_APPLICABLE',
      riskSource: 'SERVER_ACCOUNT_EQUITY',
      currency: 'VIRTUAL_USD',
      tradingFeeBps,
      tradingFeeRate: tradingFeeBps / 10_000,
      minimumTradingFeeBps: 0,
      tradingTaxBps: TRADING_TAX_RATE * 10_000,
      liquidationFeeBps: TRADING_FEE_RATE * 10_000,
      feeDiscountSource: 'SETTLED_CHARACTER_WELLBEING',
    },
    access: {
      cbd: {
        present: currentDistrict === 'CBD',
        travelRequired: currentDistrict !== 'CBD',
        requirement: 'PAID_TRANSIT' as const,
      },
      millionaireVillaDistrict: {
        eligible: mansionEligible,
        requiredNetWorth: MANSION_NET_WORTH_REQUIREMENT,
      },
    },
    residence: {
      district: 'STARTER_ARCOLOGY' as const,
      label: 'Outer Ring Starter Arcology',
      cityRelation: 'REMOTE_OUTSKIRTS' as const,
      studioAreaSqm: STARTER_STUDIO_AREA_SQM,
      tower: player.starterTower,
      floor: player.starterFloor,
      unit: player.starterUnit,
      leaseDaysRemaining: player.apartmentLeaseDays,
      towerFloors: STARTER_TOWER_FLOORS,
      unitsPerFloor: STARTER_UNITS_PER_FLOOR,
      residentsPerTower: STARTER_RESIDENTS_PER_TOWER,
      towerCount: STARTER_TOWER_COUNT,
      districtCapacity: STARTER_DISTRICT_CAPACITY,
    },
    mobility: {
      currentDistrict,
      currentStationId: metroLocation.stationId,
      faresAreServerAuthoritative: true,
      travelIsImmediateAfterPayment: true,
      options: Object.entries(TRANSIT_OPTIONS).map(([mode, option]) => ({
        mode: mode as TransitMode,
        fare: option.fare,
        durationGameMinutes: option.durationGameMinutes,
        minimumCashBeforeTrip: option.minimumCashBeforeTrip,
        minimumCashAfterTrip: option.minimumCashAfterTrip,
        currency: 'VIRTUAL_USD' as const,
      })),
      totalTrips: player.transitTrips,
      metroRides: player.metroRides,
      taxiRides: player.taxiRides,
      totalSpend: roundMoney(player.transitSpend),
      lastTrip:
        player.lastTransitMode && player.lastTransitAt
          ? {
              mode: player.lastTransitMode,
              fare: roundMoney(player.lastTransitFare),
              at: player.lastTransitAt,
            }
          : null,
    },
    virtualOnly: true as const,
    snapshotAt: now,
    ...normalizedPlayer,
  };
}

function readPositiveNumber(payload: JsonObject, key: string) {
  const value = payload[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    return undefined;
  return value;
}

function readString(payload: JsonObject, key: string, fallback = '') {
  const value = payload[key];
  return typeof value === 'string' ? value : fallback;
}

function readDistrict(payload: JsonObject, key: string) {
  const value = readString(payload, key).trim().toUpperCase();
  return DISTRICTS.includes(value as District)
    ? (value as District)
    : undefined;
}

function readTransitMode(payload: JsonObject) {
  const value = readString(payload, 'mode').trim().toUpperCase();
  return value in TRANSIT_OPTIONS ? (value as TransitMode) : undefined;
}

function readIdempotencyKey(payload: JsonObject) {
  const raw = payload.requestId ?? payload.idempotencyKey;
  if (raw === undefined) return null;
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim();
  if (!value || value.length > MAX_IDEMPOTENCY_KEY_LENGTH) return undefined;
  return value;
}

async function runIdempotent(
  userId: string,
  action: string,
  payload: JsonObject,
  operation: (requestId: string) => Promise<Response>,
) {
  const requestId = readIdempotencyKey(payload);
  if (requestId === undefined) {
    return errorResponse(
      `requestId must be a non-empty string of at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
      'INVALID_IDEMPOTENCY_KEY',
    );
  }
  if (requestId === null) {
    return errorResponse(
      'requestId is required for every state-changing game action',
      'IDEMPOTENCY_KEY_REQUIRED',
    );
  }

  const createdAt = new Date().toISOString();
  const reservation = await env.DB.prepare(
    `INSERT OR IGNORE INTO game_idempotency (
      user_id, request_id, action, completed, created_at, completed_at
    ) VALUES (?, ?, ?, 0, ?, NULL)`,
  )
    .bind(userId, requestId, action, createdAt)
    .run();

  if ((reservation.meta.changes ?? 0) === 0) {
    const existing = await env.DB.prepare(
      `SELECT action, completed FROM game_idempotency
       WHERE user_id = ? AND request_id = ?`,
    )
      .bind(userId, requestId)
      .first<{ action: string; completed: number }>();
    if (!existing || existing.action !== action) {
      return errorResponse(
        'requestId was already used for another action',
        'IDEMPOTENCY_KEY_REUSED',
        409,
      );
    }
    if (!existing.completed) {
      return errorResponse(
        'The matching virtual operation is still in progress',
        'IDEMPOTENT_OPERATION_IN_PROGRESS',
        409,
      );
    }
    return Response.json({
      ...(await getSnapshot(userId)),
      idempotency: { requestId, replayed: true },
    });
  }

  let response: Response;
  try {
    response = await operation(requestId);
  } catch (error) {
    const state = await env.DB.prepare(
      'SELECT completed FROM game_idempotency WHERE user_id = ? AND request_id = ? AND action = ?',
    )
      .bind(userId, requestId, action)
      .first<{ completed: number }>();
    if (state?.completed) {
      return Response.json(
        {
          ...(await getSnapshot(userId)),
          idempotency: { requestId, recovered: true },
        },
        { headers: { 'Idempotency-Key': requestId } },
      );
    }
    if (!state?.completed) {
      await env.DB.prepare(
        'DELETE FROM game_idempotency WHERE user_id = ? AND request_id = ? AND action = ? AND completed = 0',
      )
        .bind(userId, requestId, action)
        .run();
    }
    throw error;
  }

  if (!response.ok) {
    await env.DB.prepare(
      'DELETE FROM game_idempotency WHERE user_id = ? AND request_id = ? AND completed = 0',
    )
      .bind(userId, requestId)
      .run();
    return response;
  }

  const completion = await env.DB.prepare(
    `SELECT completed FROM game_idempotency
     WHERE user_id = ? AND request_id = ? AND action = ?`,
  )
    .bind(userId, requestId, action)
    .first<{ completed: number }>();
  if (!completion?.completed) {
    throw new Error(
      'Successful game operation did not commit its idempotency marker',
    );
  }
  await env.DB.prepare(
    `DELETE FROM game_idempotency
       WHERE user_id = ? AND completed = 1 AND request_id NOT IN (
         SELECT request_id FROM game_idempotency
         WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
       )`,
  )
    .bind(userId, userId, IDEMPOTENCY_HISTORY_LIMIT)
    .run();
  response.headers.set('Idempotency-Key', requestId);
  return response;
}

function completeIdempotencyStatement(
  userId: string,
  requestId: string,
  action: string,
  operationId: string,
  completedAt: string,
) {
  return env.DB.prepare(
    `UPDATE game_idempotency SET completed = 1, completed_at = ?
     WHERE user_id = ? AND request_id = ? AND action = ? AND completed = 0
       AND EXISTS (
         SELECT 1 FROM players
         WHERE user_id = ? AND last_operation_id = ?
       )`,
  ).bind(completedAt, userId, requestId, action, userId, operationId);
}

async function idempotencyWasCompleted(
  userId: string,
  requestId: string,
  action: string,
) {
  const completion = await env.DB.prepare(
    `SELECT 1 AS completed FROM game_idempotency
     WHERE user_id = ? AND request_id = ? AND action = ? AND completed = 1`,
  )
    .bind(userId, requestId, action)
    .first<{ completed: number }>();
  return Boolean(completion?.completed);
}

function parseVirtualOrder(payload: JsonObject, price: number) {
  const requestedQuantity = readPositiveNumber(payload, 'quantity');
  const requestedNotional = readPositiveNumber(payload, 'notional');
  if ((requestedQuantity === undefined) === (requestedNotional === undefined))
    return undefined;

  const quantity = roundQuantity(
    requestedQuantity ?? requestedNotional! / price,
  );
  const notional = roundMoney(quantity * price);
  if (
    quantity <= 0 ||
    notional < MIN_ORDER_NOTIONAL ||
    notional > MAX_ORDER_NOTIONAL
  ) {
    return undefined;
  }
  return { quantity, notional };
}

function parseLeverage(payload: JsonObject): LeverageLevel | undefined {
  if (payload.leverage === undefined) return 1;
  return typeof payload.leverage === 'number' &&
    Number.isInteger(payload.leverage) &&
    isLeverageLevel(payload.leverage)
    ? payload.leverage
    : undefined;
}

async function executeTrade(
  userId: string,
  side: 'BUY' | 'SELL',
  payload: JsonObject,
  requestId: string,
  idempotencyAction: string,
) {
  const symbol = readString(payload, 'symbol').trim().toUpperCase();
  if (!isVirtualSymbol(symbol)) {
    return errorResponse(
      'Unknown AmpliWorld virtual symbol',
      'UNKNOWN_VIRTUAL_SYMBOL',
    );
  }

  const player = await readPlayer(userId);
  if (!player) throw new Error('Player initialization failed');
  if (playerDistrict(player.currentDistrict) !== 'CBD') {
    return cbdTravelRequiredResponse();
  }
  const price = virtualQuoteAtTurn(
    symbol,
    player.turn,
    player.marketSeed,
  ).price;
  const order = parseVirtualOrder(payload, price);
  if (!order) {
    return errorResponse(
      'Provide exactly one positive quantity or notional between $1 and $1,000,000,000',
      'INVALID_ORDER_SIZE',
    );
  }

  const requestedLeverage = parseLeverage(payload);
  if (!requestedLeverage) {
    return errorResponse(
      'Leverage must be one of 1, 2, 3, or 5',
      'INVALID_LEVERAGE',
    );
  }

  const currentHoldings = await readHoldings(userId);
  const currentMarkedHoldings = markHoldings(
    currentHoldings,
    player.turn,
    player.marketSeed,
  );
  const currentMetrics = accountMetrics(player.cash, currentMarkedHoldings);
  const existingHolding = currentHoldings.find(
    (holding) => holding.symbol === symbol,
  );
  const leverage = existingHolding
    ? holdingLeverage(existingHolding.leverage)
    : requestedLeverage;
  if (side === 'BUY' && existingHolding && leverage !== requestedLeverage) {
    return errorResponse(
      'Close the existing symbol position before changing leverage',
      'LEVERAGE_MISMATCH',
      409,
    );
  }

  const feeBps = normalizedFeeBps(player.tradingFeeBps);
  const fee = tradingFee(order.notional, feeBps);
  const tax = roundMoney(Math.max(0.01, order.notional * TRADING_TAX_RATE));
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();

  if (side === 'BUY') {
    const entryCostPnl = roundMoney(-fee - tax);
    const marginRequired = roundMoney(order.notional / leverage);
    const borrowedAmount = roundMoney(order.notional - marginRequired);
    const totalDebit = roundMoney(marginRequired + fee + tax);
    const projectedEquity = roundMoney(currentMetrics.netWorth - fee - tax);
    const projectedMaintenance = roundMoney(
      currentMetrics.maintenanceMarginRequired +
        order.notional * MAINTENANCE_MARGIN_RATES[leverage],
    );
    const projectedGrossExposure = roundMoney(
      currentMetrics.grossExposure + order.notional,
    );
    if (
      projectedEquity <= 0 ||
      projectedEquity < projectedMaintenance ||
      projectedGrossExposure > projectedEquity * 5 + 0.01
    ) {
      return errorResponse(
        'Order exceeds available virtual margin',
        'INSUFFICIENT_INITIAL_MARGIN',
        409,
      );
    }

    await env.DB.batch([
      env.DB.prepare(
        `UPDATE players
         SET cash = cash - ?, realized_pnl = realized_pnl + ?,
             city_tax_paid = city_tax_paid + ?,
             account_status = 'ACTIVE', last_operation_id = ?, updated_at = ?
         WHERE user_id = ? AND cash >= ? AND turn = ?
           AND current_district = 'CBD' AND (
           NOT EXISTS (SELECT 1 FROM holdings WHERE user_id = ? AND symbol = ?)
           OR EXISTS (
             SELECT 1 FROM holdings
             WHERE user_id = ? AND symbol = ? AND leverage = ?
           )
         )`,
      ).bind(
        totalDebit,
        entryCostPnl,
        tax,
        operationId,
        now,
        userId,
        totalDebit,
        player.turn,
        userId,
        symbol,
        userId,
        symbol,
        leverage,
      ),
      env.DB.prepare(
        `INSERT INTO holdings (
          user_id, symbol, quantity, average_price, leverage, margin_posted,
          borrowed_amount, last_mark_price, maintenance_margin_rate, updated_at
        )
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         FROM players WHERE user_id = ? AND last_operation_id = ?
         ON CONFLICT(user_id, symbol) DO UPDATE SET
           average_price = ((holdings.quantity * holdings.average_price) +
             (excluded.quantity * excluded.average_price)) /
             (holdings.quantity + excluded.quantity),
           last_mark_price = ((holdings.quantity * holdings.last_mark_price) +
             (excluded.quantity * excluded.last_mark_price)) /
             (holdings.quantity + excluded.quantity),
           quantity = holdings.quantity + excluded.quantity,
           margin_posted = holdings.margin_posted + excluded.margin_posted,
           borrowed_amount = holdings.borrowed_amount + excluded.borrowed_amount,
           maintenance_margin_rate = excluded.maintenance_margin_rate,
           updated_at = excluded.updated_at`,
      ).bind(
        userId,
        symbol,
        order.quantity,
        price,
        leverage,
        marginRequired,
        borrowedAmount,
        price,
        MAINTENANCE_MARGIN_RATES[leverage],
        now,
        userId,
        operationId,
      ),
      env.DB.prepare(
        `INSERT INTO trades (
          user_id, symbol, side, quantity, notional, price, fee, tax,
          realized_pnl, leverage, margin_required, created_at
        )
        SELECT ?, ?, 'BUY', ?, ?, ?, ?, ?, ?, ?, ?, ?
        FROM players WHERE user_id = ? AND last_operation_id = ?`,
      ).bind(
        userId,
        symbol,
        order.quantity,
        order.notional,
        price,
        fee,
        tax,
        entryCostPnl,
        leverage,
        marginRequired,
        now,
        userId,
        operationId,
      ),
      completeIdempotencyStatement(
        userId,
        requestId,
        idempotencyAction,
        operationId,
        now,
      ),
    ]);
  } else {
    if (
      !existingHolding ||
      existingHolding.quantity + QUANTITY_EPSILON < order.quantity
    ) {
      return errorResponse(
        'Insufficient virtual shares',
        'INSUFFICIENT_VIRTUAL_SHARES',
      );
    }

    const positionFraction = Math.min(
      1,
      order.quantity / existingHolding.quantity,
    );
    const borrowedReleased = roundMoney(
      existingHolding.borrowedAmount * positionFraction,
    );
    const marginReleased = roundMoney(
      existingHolding.marginPosted * positionFraction,
    );
    const cashCredit = roundMoney(
      order.notional - borrowedReleased - fee - tax,
    );
    if (player.cash + cashCredit < 0) {
      return errorResponse(
        'Exit would create a virtual margin deficit; close the day for clearing liquidation',
        'MARGIN_DEFICIT_REQUIRES_SETTLEMENT',
        409,
      );
    }
    const realizedPnl = roundMoney(
      order.notional -
        order.quantity * existingHolding.averagePrice -
        fee -
        tax,
    );
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE players
         SET cash = cash + ?, realized_pnl = realized_pnl + ?,
             city_tax_paid = city_tax_paid + ?, last_operation_id = ?, updated_at = ?
         WHERE user_id = ? AND turn = ? AND current_district = 'CBD' AND EXISTS (
           SELECT 1 FROM holdings
           WHERE user_id = ? AND symbol = ? AND quantity >= ?
             AND ABS(average_price - ?) < 0.0000001
             AND ABS(borrowed_amount - ?) < 0.0000001
             AND ABS(margin_posted - ?) < 0.0000001
         )`,
      ).bind(
        cashCredit,
        realizedPnl,
        tax,
        operationId,
        now,
        userId,
        player.turn,
        userId,
        symbol,
        order.quantity,
        existingHolding.averagePrice,
        existingHolding.borrowedAmount,
        existingHolding.marginPosted,
      ),
      env.DB.prepare(
        `UPDATE holdings SET quantity = quantity - ?,
          borrowed_amount = MAX(0, borrowed_amount - ?),
          margin_posted = MAX(0, margin_posted - ?), updated_at = ?
         WHERE user_id = ? AND symbol = ? AND EXISTS (
           SELECT 1 FROM players WHERE user_id = ? AND last_operation_id = ?
         )`,
      ).bind(
        order.quantity,
        borrowedReleased,
        marginReleased,
        now,
        userId,
        symbol,
        userId,
        operationId,
      ),
      env.DB.prepare(
        `DELETE FROM holdings WHERE user_id = ? AND symbol = ? AND quantity <= ?
         AND EXISTS (
           SELECT 1 FROM players WHERE user_id = ? AND last_operation_id = ?
         )`,
      ).bind(userId, symbol, QUANTITY_EPSILON, userId, operationId),
      env.DB.prepare(
        `INSERT INTO trades (
          user_id, symbol, side, quantity, notional, price, fee, tax,
          realized_pnl, leverage, margin_required, created_at
        )
        SELECT ?, ?, 'SELL', ?, ?, ?, ?, ?, ?, ?, ?, ?
        FROM players WHERE user_id = ? AND last_operation_id = ?`,
      ).bind(
        userId,
        symbol,
        order.quantity,
        order.notional,
        price,
        fee,
        tax,
        realizedPnl,
        leverage,
        marginReleased,
        now,
        userId,
        operationId,
      ),
      completeIdempotencyStatement(
        userId,
        requestId,
        idempotencyAction,
        operationId,
        now,
      ),
    ]);
  }

  const completed = await idempotencyWasCompleted(
    userId,
    requestId,
    idempotencyAction,
  );
  if (!completed) {
    const latestPlayer = await readPlayer(userId);
    if (
      latestPlayer &&
      playerDistrict(latestPlayer.currentDistrict) !== 'CBD'
    ) {
      return cbdTravelRequiredResponse();
    }
    return errorResponse(
      side === 'BUY'
        ? 'Insufficient virtual cash'
        : 'Virtual position changed; retry the order',
      side === 'BUY'
        ? 'INSUFFICIENT_VIRTUAL_CASH'
        : 'VIRTUAL_POSITION_CONFLICT',
      409,
    );
  }

  const snapshot = await getSnapshot(userId);
  const executionMargin =
    side === 'BUY'
      ? roundMoney(order.notional / leverage)
      : existingHolding
        ? roundMoney(
            existingHolding.marginPosted *
              Math.min(1, order.quantity / existingHolding.quantity),
          )
        : 0;
  const executionBorrowedAmount =
    side === 'BUY'
      ? roundMoney(order.notional - executionMargin)
      : existingHolding
        ? roundMoney(
            existingHolding.borrowedAmount *
              Math.min(1, order.quantity / existingHolding.quantity),
          )
        : 0;
  return Response.json({
    ...snapshot,
    execution: {
      side,
      symbol,
      quantity: order.quantity,
      notional: order.notional,
      price,
      fee,
      feeBps,
      feePolicy: 'SETTLED_CHARACTER_WELLBEING',
      tax,
      leverage,
      marginRequired: executionMargin,
      marginPosted: executionMargin,
      borrowedAmount: executionBorrowedAmount,
      liquidationPrice: null,
      liquidationPriceType: 'CROSS_MARGIN_ACCOUNT_LEVEL',
      marginExcessAfter: snapshot.player.marginExcess,
      maintenanceRequiredAfter: snapshot.player.maintenanceMarginRequired,
      quoteSource: 'AMPLIWORLD_SEEDED_VIRTUAL_MARKET',
    },
  });
}

async function commute(
  userId: string,
  payload: JsonObject,
  idempotencyAction: string,
) {
  const requestId = readIdempotencyKey(payload);
  if (typeof requestId !== 'string') {
    return errorResponse(
      'COMMUTE requires a valid requestId',
      'IDEMPOTENCY_KEY_REQUIRED',
    );
  }
  const destination = readDistrict(payload, 'destination');
  if (!destination) {
    return errorResponse(
      'destination must be CBD or STARTER_ARCOLOGY',
      'INVALID_DESTINATION',
    );
  }

  const mode = readTransitMode(payload);
  if (!mode) {
    return errorResponse('mode must be METRO or TAXI', 'INVALID_TRANSIT_MODE');
  }
  const stationId = readString(payload, 'stationId').trim().toUpperCase();
  const requestedStation = stationId
    ? metroArrivalByCode(stationId)
    : undefined;
  if (stationId && (mode !== 'METRO' || !requestedStation)) {
    return errorResponse(
      'stationId must identify a valid metro station',
      'INVALID_METRO_STATION',
    );
  }
  const arrivalStation =
    requestedStation ?? defaultMetroArrival(destination);
  if (arrivalStation.district !== destination) {
    return errorResponse(
      `stationId ${arrivalStation.stationId} does not serve ${destination}`,
      'METRO_STATION_DESTINATION_MISMATCH',
    );
  }

  const player = await readPlayer(userId);
  if (!player) throw new Error('Player initialization failed');
  const fromDistrict = playerDistrict(player.currentDistrict);
  if (fromDistrict === destination && !stationId) {
    return errorResponse(
      `Player is already in ${destination}`,
      'ALREADY_AT_DESTINATION',
      409,
    );
  }

  const option = TRANSIT_OPTIONS[mode];
  if (player.cash < option.minimumCashBeforeTrip) {
    return errorResponse(
      mode === 'METRO'
        ? 'Metro costs $5 virtual cash; the emergency ride is unavailable once cash is already negative'
        : 'Taxi costs $45 virtual cash and requires full fare',
      'INSUFFICIENT_TRANSIT_FUNDS',
      409,
    );
  }

  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const results = await env.DB.batch([
    env.DB.prepare(
      `UPDATE players
       SET cash = cash - ?, current_district = ?,
           current_station_id = ?, world_x = ?, world_z = ?, world_heading = ?,
           transit_spend = transit_spend + ?, transit_trips = transit_trips + 1,
           metro_rides = metro_rides + CASE WHEN ? = 'METRO' THEN 1 ELSE 0 END,
           taxi_rides = taxi_rides + CASE WHEN ? = 'TAXI' THEN 1 ELSE 0 END,
           last_transit_mode = ?, last_transit_fare = ?, last_transit_at = ?,
           last_operation_id = ?, updated_at = ?
       WHERE user_id = ? AND cash >= ? AND cash = ?
         AND current_district = ? AND turn = ?
         AND EXISTS (
           SELECT 1 FROM game_idempotency
           WHERE user_id = ? AND request_id = ? AND action = ?
             AND completed = 0
         )`,
    ).bind(
      option.fare,
      destination,
      arrivalStation.stationId,
      arrivalStation.x,
      arrivalStation.z,
      arrivalStation.heading,
      option.fare,
      mode,
      mode,
      mode,
      option.fare,
      now,
      operationId,
      now,
      userId,
      option.minimumCashBeforeTrip,
      player.cash,
      fromDistrict,
      player.turn,
      userId,
      requestId,
      idempotencyAction,
    ),
    env.DB.prepare(
      `INSERT INTO transit_trips (
        user_id, turn, from_district, to_district, station_id, mode, fare,
        duration_game_minutes, created_at
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM players WHERE user_id = ? AND last_operation_id = ?`,
    ).bind(
      userId,
      player.turn,
      fromDistrict,
      destination,
      arrivalStation.stationId,
      mode,
      option.fare,
      option.durationGameMinutes,
      now,
      userId,
      operationId,
    ),
    env.DB.prepare(
      `UPDATE game_idempotency
       SET completed = 1, completed_at = ?
       WHERE user_id = ? AND request_id = ? AND action = ? AND completed = 0
         AND EXISTS (
           SELECT 1 FROM players
           WHERE user_id = ? AND last_operation_id = ?
         )`,
    ).bind(now, userId, requestId, idempotencyAction, userId, operationId),
  ]);

  if ((results[0]?.meta.changes ?? 0) !== 1) {
    const latestPlayer = await readPlayer(userId);
    if (latestPlayer && latestPlayer.cash < option.minimumCashBeforeTrip) {
      return errorResponse(
        'Insufficient virtual cash for this trip',
        'INSUFFICIENT_TRANSIT_FUNDS',
        409,
      );
    }
    return errorResponse(
      'Player state changed; transit fare was not charged',
      'PLAYER_STATE_CONFLICT',
      409,
    );
  }

  return Response.json({
    ...(await getSnapshot(userId)),
    commute: {
      fromDistrict,
      toDistrict: destination,
      mode,
      fare: option.fare,
      durationGameMinutes: option.durationGameMinutes,
      cashAfter: roundMoney(player.cash - option.fare),
      stationId: arrivalStation.stationId,
      topologyId: arrivalStation.topologyId,
      worldPosition: {
        x: arrivalStation.x,
        z: arrivalStation.z,
        heading: arrivalStation.heading,
      },
      currency: 'VIRTUAL_USD',
      chargedBy: 'SERVER',
      arrival: 'IMMEDIATE_AFTER_PAYMENT',
    },
  });
}

async function purchaseItem(
  userId: string,
  payload: JsonObject,
  requestId: string,
  idempotencyAction: string,
) {
  const requestedItem = readString(
    payload,
    'itemCode',
    readString(payload, 'item'),
  );
  const itemCode = requestedItem
    .trim()
    .toUpperCase()
    .replace(/['’]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!isGameItemCode(itemCode)) {
    return errorResponse('Unknown AmpliWorld item', 'UNKNOWN_ITEM');
  }
  const purchasePlayer = await readPlayer(userId);
  if (!purchasePlayer) throw new Error('Player initialization failed');
  if (playerDistrict(purchasePlayer.currentDistrict) !== 'CBD') {
    return cbdTravelRequiredResponse();
  }

  if (isVirtualPropertyCode(itemCode)) {
    const metrics = accountMetrics(
      purchasePlayer.cash,
      markHoldings(
        await readHoldings(userId),
        purchasePlayer.turn,
        purchasePlayer.marketSeed,
      ),
    );
    const totalNetWorth = roundMoney(
      metrics.netWorth + propertyBookValue(await readInventory(userId)),
    );
    if (totalNetWorth < MANSION_NET_WORTH_REQUIREMENT) {
      return errorResponse(
        'Millionaire Villa District requires $1,000,000 virtual net worth',
        'VILLA_DISTRICT_LOCKED',
        403,
      );
    }
  }

  const item = GAME_ITEMS[itemCode];
  const tax = roundMoney(item.price * SHOPPING_TAX_RATE);
  const totalDebit = roundMoney(item.price + tax);
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE players
       SET cash = cash - ?, city_tax_paid = city_tax_paid + ?,
           last_operation_id = ?, updated_at = ?
       WHERE user_id = ? AND cash >= ? AND cash = ? AND turn = ?
         AND current_district = 'CBD'`,
    ).bind(
      totalDebit,
      tax,
      operationId,
      now,
      userId,
      totalDebit,
      purchasePlayer.cash,
      purchasePlayer.turn,
    ),
    env.DB.prepare(
      `INSERT INTO inventory (
        user_id, item_code, display_name, quantity, unit_price, tax_paid, acquired_at, updated_at
      )
      SELECT ?, ?, ?, 1, ?, ?, ?, ?
      FROM players WHERE user_id = ? AND last_operation_id = ?
      ON CONFLICT(user_id, item_code) DO UPDATE SET
        quantity = inventory.quantity + 1,
        unit_price = excluded.unit_price,
        tax_paid = inventory.tax_paid + excluded.tax_paid,
        updated_at = excluded.updated_at`,
    ).bind(
      userId,
      itemCode,
      item.name,
      item.price,
      tax,
      now,
      now,
      userId,
      operationId,
    ),
    completeIdempotencyStatement(
      userId,
      requestId,
      idempotencyAction,
      operationId,
      now,
    ),
  ]);

  const completed = await idempotencyWasCompleted(
    userId,
    requestId,
    idempotencyAction,
  );
  if (!completed) {
    const latestPlayer = await readPlayer(userId);
    if (
      latestPlayer &&
      playerDistrict(latestPlayer.currentDistrict) !== 'CBD'
    ) {
      return cbdTravelRequiredResponse();
    }
    return errorResponse(
      'Insufficient virtual cash',
      'INSUFFICIENT_VIRTUAL_CASH',
      409,
    );
  }

  return Response.json({
    ...(await getSnapshot(userId)),
    purchase: { itemCode, displayName: item.name, price: item.price, tax },
  });
}

async function doLifeActivity(
  userId: string,
  payload: JsonObject,
  requestId: string,
  idempotencyAction: string,
) {
  const activityCode = readString(
    payload,
    'activityCode',
    readString(payload, 'activity'),
  )
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
  if (!isLifeActivityCode(activityCode)) {
    return errorResponse('Unknown wellbeing activity', 'UNKNOWN_ACTIVITY');
  }

  const activity = LIFE_ACTIVITIES[activityCode];
  const player = await readPlayer(userId);
  if (!player) throw new Error('Player initialization failed');
  if (
    activity.district === 'CBD' &&
    playerDistrict(player.currentDistrict) !== 'CBD'
  ) {
    return cbdTravelRequiredResponse();
  }

  const categoryTurn =
    activity.category === 'MEAL'
      ? player.lastMealTurn
      : activity.category === 'WELLNESS'
        ? player.lastWellnessTurn
        : player.lastLeisureTurn;
  if (categoryTurn === player.turn) {
    return errorResponse(
      `The ${activity.category.toLowerCase()} choice for this game day is already complete`,
      'DAILY_ACTIVITY_CATEGORY_COMPLETE',
      409,
    );
  }

  const categoryColumn = {
    MEAL: 'last_meal_turn',
    WELLNESS: 'last_wellness_turn',
    LEISURE: 'last_leisure_turn',
  }[activity.category];
  const taxable = activity.district === 'CBD' && activity.price > 0;
  const tax = taxable ? roundMoney(activity.price * SHOPPING_TAX_RATE) : 0;
  const totalDebit = roundMoney(activity.price + tax);
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const results = await env.DB.batch([
    env.DB.prepare(
      `UPDATE players
       SET cash = cash - ?, happiness = MIN(100, happiness + ?),
           nutrition = MIN(100, nutrition + ?),
           daily_care_points = MIN(20, daily_care_points + ?),
           daily_protein = MIN(100, daily_protein + ?),
           daily_produce = MIN(100, daily_produce + ?),
           city_tax_paid = city_tax_paid + ?, ${categoryColumn} = turn,
           account_status = CASE WHEN cash - ? > 0 THEN 'ACTIVE' ELSE account_status END,
           last_operation_id = ?, updated_at = ?
       WHERE user_id = ? AND cash >= ? AND cash = ? AND turn = ?
         AND ${categoryColumn} < turn
         ${activity.district === 'CBD' ? "AND current_district = 'CBD'" : ''}`,
    ).bind(
      totalDebit,
      activity.happiness,
      activity.nutrition,
      activity.carePoints,
      activity.protein,
      activity.produce,
      tax,
      totalDebit,
      operationId,
      now,
      userId,
      totalDebit,
      player.cash,
      player.turn,
    ),
    env.DB.prepare(
      `INSERT INTO life_events (
        user_id, turn, activity_code, category, price, tax,
        happiness_delta, nutrition_delta, care_points, created_at
      )
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      FROM players WHERE user_id = ? AND last_operation_id = ?`,
    ).bind(
      userId,
      player.turn,
      activityCode,
      activity.category,
      activity.price,
      tax,
      activity.happiness,
      activity.nutrition,
      activity.carePoints,
      now,
      userId,
      operationId,
    ),
    completeIdempotencyStatement(
      userId,
      requestId,
      idempotencyAction,
      operationId,
      now,
    ),
  ]);

  if ((results[0]?.meta.changes ?? 0) !== 1) {
    const latest = await readPlayer(userId);
    if (
      latest &&
      activity.district === 'CBD' &&
      playerDistrict(latest.currentDistrict) !== 'CBD'
    ) {
      return cbdTravelRequiredResponse();
    }
    if (latest && latest.cash < totalDebit) {
      return errorResponse(
        'Insufficient virtual cash',
        'INSUFFICIENT_VIRTUAL_CASH',
        409,
      );
    }
    return errorResponse(
      'Daily activity state changed; retry',
      'PLAYER_STATE_CONFLICT',
      409,
    );
  }

  return Response.json({
    ...(await getSnapshot(userId)),
    activity: {
      activityCode,
      displayName: activity.name,
      category: activity.category,
      price: activity.price,
      tax,
      happinessDelta: activity.happiness,
      nutritionDelta: activity.nutrition,
      appliesToTradingFee: 'NEXT_GAME_DAY',
    },
  });
}

async function completeWorkShift(
  userId: string,
  payload: JsonObject,
  requestId: string,
  idempotencyAction: string,
) {
  const jobCode = readString(payload, 'jobCode', readString(payload, 'job'))
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
  if (!isDailyJobCode(jobCode)) {
    return errorResponse('Unknown daily job', 'UNKNOWN_DAILY_JOB');
  }

  const job = DAILY_JOBS[jobCode];
  const player = await readPlayer(userId);
  if (!player) throw new Error('Player initialization failed');
  if (
    job.district === 'CBD' &&
    playerDistrict(player.currentDistrict) !== 'CBD'
  ) {
    return cbdTravelRequiredResponse();
  }
  if (
    jobCode === 'MARKET_BRIEF_REVIEW' &&
    player.careerStatus !== 'MARKET_DATA_ASSISTANT'
  ) {
    return errorResponse(
      'Complete the Career Tower interview first',
      'CAREER_REQUIRED',
      403,
    );
  }
  if (player.lastWorkTurn === player.turn) {
    return errorResponse(
      'One paid shift is allowed per game day',
      'GAME_DAY_SHIFT_COMPLETE',
      409,
    );
  }

  const today = utcDateKey();
  const sameUtcDay = player.workDate === today;
  const shiftsToday = sameUtcDay ? player.shiftsToday : 0;
  const wagesToday = sameUtcDay ? player.wagesToday : 0;
  if (shiftsToday >= MAX_DAILY_WORK_SHIFTS || wagesToday >= MAX_DAILY_WAGES) {
    return errorResponse(
      'The real-world daily work allowance is complete',
      'UTC_WORK_LIMIT_REACHED',
      409,
    );
  }
  const pay = roundMoney(Math.min(job.pay, MAX_DAILY_WAGES - wagesToday));
  if (pay <= 0) {
    return errorResponse(
      'No daily wage allowance remains',
      'UTC_WORK_LIMIT_REACHED',
      409,
    );
  }

  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const nextShiftsToday = shiftsToday + 1;
  const nextWagesToday = roundMoney(wagesToday + pay);
  const results = await env.DB.batch([
    env.DB.prepare(
      `UPDATE players
       SET cash = cash + ?, happiness = MIN(100, MAX(0, happiness + ?)),
           last_work_turn = turn, work_streak = work_streak + 1,
           lifetime_wages = lifetime_wages + ?, work_date = ?,
           shifts_today = ?, wages_today = ?,
           account_status = CASE WHEN cash + ? > 0 THEN 'ACTIVE' ELSE account_status END,
           last_operation_id = ?, updated_at = ?
       WHERE user_id = ? AND turn = ? AND last_work_turn < turn
         AND cash = ? AND work_date = ? AND shifts_today = ? AND wages_today = ?
         ${job.district === 'CBD' ? "AND current_district = 'CBD'" : ''}`,
    ).bind(
      pay,
      job.happiness,
      pay,
      today,
      nextShiftsToday,
      nextWagesToday,
      pay,
      operationId,
      now,
      userId,
      player.turn,
      player.cash,
      player.workDate,
      player.shiftsToday,
      player.wagesToday,
    ),
    env.DB.prepare(
      `INSERT INTO work_shifts (
        user_id, turn, job_code, pay, happiness_delta, created_at
      )
      SELECT ?, ?, ?, ?, ?, ?
      FROM players WHERE user_id = ? AND last_operation_id = ?`,
    ).bind(
      userId,
      player.turn,
      jobCode,
      pay,
      job.happiness,
      now,
      userId,
      operationId,
    ),
    completeIdempotencyStatement(
      userId,
      requestId,
      idempotencyAction,
      operationId,
      now,
    ),
  ]);

  if ((results[0]?.meta.changes ?? 0) !== 1) {
    const latest = await readPlayer(userId);
    if (
      latest &&
      job.district === 'CBD' &&
      playerDistrict(latest.currentDistrict) !== 'CBD'
    ) {
      return cbdTravelRequiredResponse();
    }
    return errorResponse(
      'Work state changed; retry the shift',
      'PLAYER_STATE_CONFLICT',
      409,
    );
  }

  return Response.json({
    ...(await getSnapshot(userId)),
    work: {
      jobCode,
      displayName: job.name,
      pay,
      happinessDelta: job.happiness,
      virtualOnly: true,
      passive: false,
    },
  });
}

async function setSocialMode(
  userId: string,
  payload: JsonObject,
  requestId: string,
  idempotencyAction: string,
) {
  const mode = readString(payload, 'mode').trim().toUpperCase();
  if (mode !== 'PRIVATE' && mode !== 'APPROACHABLE') {
    return errorResponse(
      'mode must be PRIVATE or APPROACHABLE',
      'INVALID_SOCIAL_MODE',
    );
  }
  const player = await readPlayer(userId);
  if (!player) throw new Error('Player initialization failed');
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const results = await env.DB.batch([
    env.DB.prepare(
      `UPDATE players SET social_mode = ?, last_operation_id = ?, updated_at = ?
       WHERE user_id = ? AND turn = ? AND social_mode = ?`,
    ).bind(mode, operationId, now, userId, player.turn, player.socialMode),
    completeIdempotencyStatement(
      userId,
      requestId,
      idempotencyAction,
      operationId,
      now,
    ),
  ]);
  if ((results[0]?.meta.changes ?? 0) !== 1) {
    return errorResponse(
      'Social preference changed; retry',
      'PLAYER_STATE_CONFLICT',
      409,
    );
  }
  return Response.json({
    ...(await getSnapshot(userId)),
    socialUpdate: { mode, realPlayerEncountersLive: false },
  });
}

async function acceptJob(
  userId: string,
  payload: JsonObject,
  requestId: string,
  idempotencyAction: string,
) {
  const requestedJob = readString(payload, 'job', 'MARKET_DATA_ASSISTANT')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
  if (requestedJob !== 'MARKET_DATA_ASSISTANT') {
    return errorResponse('Unknown AmpliWorld career', 'UNKNOWN_CAREER');
  }

  const player = await readPlayer(userId);
  if (!player) throw new Error('Player initialization failed');
  if (playerDistrict(player.currentDistrict) !== 'CBD') {
    return cbdTravelRequiredResponse();
  }

  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  const results = await env.DB.batch([
    env.DB.prepare(
      `UPDATE players
       SET career_status = 'MARKET_DATA_ASSISTANT', last_operation_id = ?,
           updated_at = ?
       WHERE user_id = ? AND current_district = 'CBD' AND turn = ?`,
    ).bind(operationId, now, userId, player.turn),
    completeIdempotencyStatement(
      userId,
      requestId,
      idempotencyAction,
      operationId,
      now,
    ),
  ]);
  if ((results[0]?.meta.changes ?? 0) === 0) {
    const latestPlayer = await readPlayer(userId);
    if (
      latestPlayer &&
      playerDistrict(latestPlayer.currentDistrict) !== 'CBD'
    ) {
      return cbdTravelRequiredResponse();
    }
    return errorResponse(
      'Player state changed; interview was not recorded',
      'PLAYER_STATE_CONFLICT',
      409,
    );
  }
  return Response.json({
    ...(await getSnapshot(userId)),
    career: {
      status: 'MARKET_DATA_ASSISTANT',
      passiveDailyPay: 0,
      eligibleShift: 'MARKET_BRIEF_REVIEW',
      maxShiftPay: DAILY_JOBS.MARKET_BRIEF_REVIEW.pay,
      virtualOnly: true,
    },
  });
}

async function endDay(
  userId: string,
  requestId: string,
  idempotencyAction: string,
) {
  const player = await readPlayer(userId);
  if (!player) throw new Error('Player initialization failed');
  if (player.turn >= MAX_SIMULATION_TURN) {
    return errorResponse(
      'This ten-year virtual scenario is complete',
      'SIMULATION_COMPLETE',
      409,
    );
  }
  const holdings = await readHoldings(userId);
  const inventory = await readInventory(userId);
  const nextTurn = player.turn + 1;
  const nextMarkedHoldings = markHoldings(
    holdings,
    nextTurn,
    player.marketSeed,
  );
  const nextCare = nextCareState(player);

  // Work is paid only when a player actively completes a shift.
  const wage = 0;
  const dailyPnl = roundMoney(
    nextMarkedHoldings.reduce((total, holding) => total + holding.dailyPnl, 0),
  );
  const settlementMetrics = accountMetrics(
    player.cash + wage,
    nextMarkedHoldings,
  );
  const leveragedPositions = nextMarkedHoldings.filter(
    (holding) => holding.leverage > 1,
  );
  const mustLiquidate =
    leveragedPositions.length > 0 && settlementMetrics.marginCall;
  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();

  if (mustLiquidate) {
    // Cross-margin liquidation consumes every marketable holding. This prevents
    // debt from being forgiven while unlevered stock remains sheltered.
    const liquidations = nextMarkedHoldings.map((holding) => {
      const fee = roundMoney(
        Math.max(0.01, holding.marketValue * TRADING_FEE_RATE),
      );
      const tax = roundMoney(
        Math.max(0.01, holding.marketValue * TRADING_TAX_RATE),
      );
      return {
        ...holding,
        fee,
        tax,
        cashReturn: roundMoney(
          holding.marketValue - holding.borrowedAmount - fee - tax,
        ),
        realizedPnl: roundMoney(
          holding.marketValue -
            holding.quantity * holding.averagePrice -
            fee -
            tax,
        ),
      };
    });
    const liquidationCashReturn = roundMoney(
      liquidations.reduce(
        (total, liquidation) => total + liquidation.cashReturn,
        0,
      ),
    );
    const liquidationRealizedPnl = roundMoney(
      liquidations.reduce(
        (total, liquidation) => total + liquidation.realizedPnl,
        0,
      ),
    );
    const liquidationTax = roundMoney(
      liquidations.reduce((total, liquidation) => total + liquidation.tax, 0),
    );
    const rawCashAfterLiquidation = roundMoney(
      player.cash + wage + liquidationCashReturn,
    );
    const clearingDeficit = roundMoney(Math.max(0, -rawCashAfterLiquidation));
    const cashAfterLiquidation = rawCashAfterLiquidation;
    const fullNetWorthAfterLiquidation = roundMoney(
      cashAfterLiquidation + propertyBookValue(inventory),
    );
    const statusAfterLiquidation =
      fullNetWorthAfterLiquidation <= 0 ? 'BANKRUPT' : 'MARGIN_LIQUIDATED';
    const statements = [
      env.DB.prepare(
        `UPDATE players
         SET cash = ?, realized_pnl = realized_pnl + ?,
             city_tax_paid = city_tax_paid + ?, liquidation_count = liquidation_count + 1,
             account_status = ?, turn = ?, last_settlement_turn = ?,
             apartment_lease_days = MAX(0, apartment_lease_days - 1),
             happiness = ?, nutrition = ?, care_streak = ?, trading_fee_bps = ?,
             daily_care_points = 0, daily_protein = 0, daily_produce = 0,
             last_operation_id = ?, updated_at = ?
         WHERE user_id = ? AND turn = ? AND cash = ? AND last_operation_id = ?`,
      ).bind(
        cashAfterLiquidation,
        liquidationRealizedPnl,
        liquidationTax,
        statusAfterLiquidation,
        nextTurn,
        nextTurn,
        nextCare.happiness,
        nextCare.nutrition,
        nextCare.careStreak,
        nextCare.tradingFeeBps,
        operationId,
        now,
        userId,
        player.turn,
        player.cash,
        player.lastOperationId,
      ),
    ];

    for (const liquidation of liquidations) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO trades (
            user_id, symbol, side, quantity, notional, price, fee, tax,
            realized_pnl, leverage, margin_required, created_at
          )
          SELECT ?, ?, 'LIQUIDATION', ?, ?, ?, ?, ?, ?, ?, ?, ?
          FROM players WHERE user_id = ? AND last_operation_id = ?`,
        ).bind(
          userId,
          liquidation.symbol,
          liquidation.quantity,
          liquidation.marketValue,
          liquidation.marketPrice,
          liquidation.fee,
          liquidation.tax,
          liquidation.realizedPnl,
          liquidation.leverage,
          liquidation.marginPosted,
          now,
          userId,
          operationId,
        ),
      );
    }
    statements.push(
      env.DB.prepare(
        `DELETE FROM holdings WHERE user_id = ? AND EXISTS (
          SELECT 1 FROM players WHERE user_id = ? AND last_operation_id = ?
        )`,
      ).bind(userId, userId, operationId),
    );
    statements.push(
      env.DB.prepare(
        `INSERT INTO margin_events (
          user_id, turn, event_type, symbol, daily_pnl, account_equity,
          maintenance_required, details, created_at
        )
        SELECT ?, ?, 'LIQUIDATION', NULL, ?, ?, ?, ?, ?
        FROM players WHERE user_id = ? AND last_operation_id = ?`,
      ).bind(
        userId,
        nextTurn,
        dailyPnl,
        settlementMetrics.netWorth,
        settlementMetrics.maintenanceMarginRequired,
        JSON.stringify({
          symbols: liquidations.map((liquidation) => liquidation.symbol),
          clearingDeficit,
          debtRetained: clearingDeficit > 0,
          fullNetWorthAfterLiquidation,
        }),
        now,
        userId,
        operationId,
      ),
    );
    statements.push(
      completeIdempotencyStatement(
        userId,
        requestId,
        idempotencyAction,
        operationId,
        now,
      ),
    );
    await env.DB.batch(statements);
  } else {
    const statements = [
      env.DB.prepare(
        `UPDATE players
         SET cash = cash + ?, turn = ?, last_settlement_turn = ?,
             apartment_lease_days = MAX(0, apartment_lease_days - 1),
             happiness = ?, nutrition = ?, care_streak = ?, trading_fee_bps = ?,
             daily_care_points = 0, daily_protein = 0, daily_produce = 0,
             last_operation_id = ?, updated_at = ?
         WHERE user_id = ? AND turn = ? AND cash = ? AND last_operation_id = ?`,
      ).bind(
        wage,
        nextTurn,
        nextTurn,
        nextCare.happiness,
        nextCare.nutrition,
        nextCare.careStreak,
        nextCare.tradingFeeBps,
        operationId,
        now,
        userId,
        player.turn,
        player.cash,
        player.lastOperationId,
      ),
    ];
    for (const holding of nextMarkedHoldings) {
      statements.push(
        env.DB.prepare(
          `UPDATE holdings SET last_mark_price = ?, updated_at = ?
           WHERE user_id = ? AND symbol = ? AND EXISTS (
             SELECT 1 FROM players WHERE user_id = ? AND last_operation_id = ?
           )`,
        ).bind(
          holding.marketPrice,
          now,
          userId,
          holding.symbol,
          userId,
          operationId,
        ),
      );
    }
    statements.push(
      env.DB.prepare(
        `INSERT INTO margin_events (
          user_id, turn, event_type, symbol, daily_pnl, account_equity,
          maintenance_required, details, created_at
        )
        SELECT ?, ?, 'DAILY_SETTLEMENT', NULL, ?, ?, ?, ?, ?
        FROM players WHERE user_id = ? AND last_operation_id = ?`,
      ).bind(
        userId,
        nextTurn,
        dailyPnl,
        settlementMetrics.netWorth,
        settlementMetrics.maintenanceMarginRequired,
        JSON.stringify({
          worldEvent: worldEventAtTurn(nextTurn, player.marketSeed).id,
        }),
        now,
        userId,
        operationId,
      ),
    );
    statements.push(
      completeIdempotencyStatement(
        userId,
        requestId,
        idempotencyAction,
        operationId,
        now,
      ),
    );
    await env.DB.batch(statements);
  }

  const completed = await idempotencyWasCompleted(
    userId,
    requestId,
    idempotencyAction,
  );
  if (!completed) {
    return errorResponse(
      'Player state changed; retry day close',
      'PLAYER_STATE_CONFLICT',
      409,
    );
  }

  return Response.json({
    ...(await getSnapshot(userId)),
    dayClose: {
      closedTurn: player.turn,
      settledTurn: nextTurn,
      wage,
      dailyPnl,
      liquidated: mustLiquidate,
      maintenanceRequired: settlementMetrics.maintenanceMarginRequired,
      accountEquityBeforeLiquidation: settlementMetrics.netWorth,
      worldEvent: worldEventAtTurn(nextTurn, player.marketSeed),
      wellbeing: {
        happiness: nextCare.happiness,
        nutrition: nextCare.nutrition,
        careStreak: nextCare.careStreak,
        completeCareDay: nextCare.completeCareDay,
        tradingFeeBps: nextCare.tradingFeeBps,
      },
    },
  });
}

async function claimRelief(
  userId: string,
  requestId: string,
  idempotencyAction: string,
) {
  const player = await readPlayer(userId);
  if (!player) throw new Error('Player initialization failed');
  const holdings = await readHoldings(userId);
  const metrics = accountMetrics(
    player.cash,
    markHoldings(holdings, player.turn, player.marketSeed),
  );
  const ownedPropertyValue = propertyBookValue(await readInventory(userId));
  const totalNetWorth = roundMoney(metrics.netWorth + ownedPropertyValue);
  const cooldownRemaining = Math.max(
    0,
    RELIEF_COOLDOWN_TURNS - (player.turn - player.lastReliefTurn),
  );
  if (
    holdings.length > 0 ||
    totalNetWorth >= RELIEF_ELIGIBILITY_NET_WORTH ||
    !['BANKRUPT', 'MARGIN_LIQUIDATED'].includes(player.accountStatus) ||
    player.reliefClaims >= MAX_RELIEF_CLAIMS ||
    cooldownRemaining > 0
  ) {
    return errorResponse(
      'Relief requires bankruptcy or low-balance liquidation, no open positions, net worth below $500, an available claim, and completed cooldown',
      'RELIEF_NOT_ELIGIBLE',
      403,
    );
  }

  const grant = roundMoney(
    Math.min(RELIEF_TARGET_CASH, Math.max(0, RELIEF_TARGET_CASH - player.cash)),
  );
  if (grant <= 0) {
    return errorResponse('No virtual relief is currently due', 'NO_RELIEF_DUE');
  }

  const now = new Date().toISOString();
  const operationId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE players
       SET cash = cash + ?, relief_claims = relief_claims + 1,
           last_relief_turn = turn,
           account_status = CASE
             WHEN cash + ? <= 0 THEN 'BANKRUPT' ELSE 'ACTIVE'
           END,
           last_operation_id = ?, updated_at = ?
       WHERE user_id = ? AND relief_claims < ?
         AND turn - last_relief_turn >= ?
         AND account_status IN ('BANKRUPT', 'MARGIN_LIQUIDATED')
         AND NOT EXISTS (SELECT 1 FROM holdings WHERE user_id = ?)
         AND NOT EXISTS (
           SELECT 1 FROM inventory WHERE user_id = ? AND item_code IN (
             'PARKSIDE_VILLA', 'GLASS_COURTYARD_VILLA',
             'HELIX_ESTATE', 'FOUNDERS_SKY_ESTATE'
           )
         )
         AND cash < ?`,
    ).bind(
      grant,
      grant,
      operationId,
      now,
      userId,
      MAX_RELIEF_CLAIMS,
      RELIEF_COOLDOWN_TURNS,
      userId,
      userId,
      RELIEF_ELIGIBILITY_NET_WORTH,
    ),
    env.DB.prepare(
      `INSERT INTO margin_events (
        user_id, turn, event_type, symbol, daily_pnl, account_equity,
        maintenance_required, details, created_at
      )
      SELECT ?, ?, 'RELIEF', NULL, 0, ?, 0, ?, ?
      FROM players WHERE user_id = ? AND last_operation_id = ?`,
    ).bind(
      userId,
      player.turn,
      metrics.netWorth,
      JSON.stringify({ grant, lifetimeLimit: MAX_RELIEF_CLAIMS }),
      now,
      userId,
      operationId,
    ),
    completeIdempotencyStatement(
      userId,
      requestId,
      idempotencyAction,
      operationId,
      now,
    ),
  ]);

  const completed = await idempotencyWasCompleted(
    userId,
    requestId,
    idempotencyAction,
  );
  if (!completed) {
    return errorResponse(
      'Player state changed; relief was not issued',
      'PLAYER_STATE_CONFLICT',
      409,
    );
  }

  return Response.json({
    ...(await getSnapshot(userId)),
    relief: {
      grant,
      claimsRemaining: MAX_RELIEF_CLAIMS - player.reliefClaims - 1,
      cooldownTurns: RELIEF_COOLDOWN_TURNS,
    },
  });
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return errorResponse('Sign in required', 'SIGN_IN_REQUIRED', 401);

  await prepareDatabase();
  await ensurePlayer(user.userId);
  return Response.json(await getSnapshot(user.userId));
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return errorResponse('Sign in required', 'SIGN_IN_REQUIRED', 401);

  let payload: JsonObject;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error();
    payload = parsed as JsonObject;
  } catch {
    return errorResponse('Request body must be a JSON object', 'INVALID_JSON');
  }

  await prepareDatabase();
  await ensurePlayer(user.userId);
  const action = readString(payload, 'action').trim().toUpperCase();
  if (action === 'BUY' || action === 'SELL') {
    return runIdempotent(user.userId, action, payload, (requestId) =>
      executeTrade(user.userId, action, payload, requestId, action),
    );
  }
  if (action === 'PURCHASE' || action === 'SPEND')
    return runIdempotent(user.userId, action, payload, (requestId) =>
      purchaseItem(user.userId, payload, requestId, action),
    );
  if (action === 'HIRE')
    return runIdempotent(user.userId, action, payload, (requestId) =>
      acceptJob(user.userId, payload, requestId, action),
    );
  if (action === 'CARE' || action === 'DO_ACTIVITY')
    return runIdempotent(user.userId, action, payload, (requestId) =>
      doLifeActivity(user.userId, payload, requestId, action),
    );
  if (action === 'WORK' || action === 'COMPLETE_SHIFT')
    return runIdempotent(user.userId, action, payload, (requestId) =>
      completeWorkShift(user.userId, payload, requestId, action),
    );
  if (action === 'SET_SOCIAL_MODE')
    return runIdempotent(user.userId, action, payload, (requestId) =>
      setSocialMode(user.userId, payload, requestId, action),
    );
  if (action === 'END_DAY')
    return runIdempotent(user.userId, action, payload, (requestId) =>
      endDay(user.userId, requestId, action),
    );
  if (action === 'CLAIM_RELIEF')
    return runIdempotent(user.userId, action, payload, (requestId) =>
      claimRelief(user.userId, requestId, action),
    );
  if (action === 'COMMUTE') {
    if (readIdempotencyKey(payload) === null) {
      return errorResponse(
        'COMMUTE requires requestId so a retry cannot charge the fare twice',
        'IDEMPOTENCY_KEY_REQUIRED',
      );
    }
    const destination = readDistrict(payload, 'destination');
    const mode = readTransitMode(payload);
    const stationId = readString(payload, 'stationId').trim().toUpperCase();
    const idempotencyAction =
      destination && mode
        ? `${action}:${destination}:${mode}:${stationId || 'DEFAULT'}`
        : `${action}:INVALID`;
    return runIdempotent(user.userId, idempotencyAction, payload, () =>
      commute(user.userId, payload, idempotencyAction),
    );
  }
  return errorResponse(
    'Supported actions are BUY, SELL, PURCHASE, SPEND, HIRE, CARE, WORK, SET_SOCIAL_MODE, END_DAY, CLAIM_RELIEF, and COMMUTE',
    'INVALID_ACTION',
  );
}
