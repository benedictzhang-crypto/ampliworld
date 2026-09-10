import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import {
  GAME_ITEMS,
  isGameItemCode,
  isLeverageLevel,
  isVirtualPropertyCode,
  isVirtualSymbol,
  LEVERAGE_LEVELS,
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

type JsonObject = Record<string, unknown>;

interface PlayerRow {
  cash: number;
  portfolioValue: number;
  realizedPnl: number;
  unrealizedPnl: number;
  happiness: number;
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
  careerStatus: string;
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

let databasePreparation: Promise<void> | undefined;

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 100_000_000) / 100_000_000;
}

function errorResponse(error: string, code: string, status = 400) {
  return Response.json({ error, code, virtualOnly: true }, { status });
}

async function prepareDatabaseInternal() {
  // Schema evolution is migration-only. Runtime DDL can race with a deployment
  // migration and leave D1 half-upgraded, so requests only verify readiness.
  try {
    await env.DB.batch([
      env.DB.prepare(
        'SELECT user_id, market_seed, last_operation_id FROM players LIMIT 0',
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
  await env.DB.prepare(
    `INSERT OR IGNORE INTO players (
      user_id, cash, portfolio_value, realized_pnl, unrealized_pnl, happiness,
      city_tax_paid, apartment_lease_days, career_status, turn, market_seed,
      last_operation_id, created_at, updated_at
    ) VALUES (?, ?, 0, 0, 0, 52, 0, 365, 'UNEMPLOYED', 1, ?, '', ?, ?)`,
  )
    .bind(userId, STARTING_CASH, marketSeed, now, now)
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
      unrealized_pnl AS unrealizedPnl, happiness, city_tax_paid AS cityTaxPaid,
      margin_used AS marginUsed, gross_exposure AS grossExposure,
      borrowed_exposure AS borrowedExposure,
      maintenance_margin_required AS maintenanceMarginRequired,
      liquidation_count AS liquidationCount, account_status AS accountStatus,
      relief_claims AS reliefClaims, last_relief_turn AS lastReliefTurn,
      last_settlement_turn AS lastSettlementTurn,
      last_operation_id AS lastOperationId,
      apartment_lease_days AS apartmentLeaseDays, career_status AS careerStatus,
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

  const [inventory, tradesResult, marginEventsResult] = await Promise.all([
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
    },
    access: {
      millionaireVillaDistrict: {
        eligible: mansionEligible,
        requiredNetWorth: MANSION_NET_WORTH_REQUIREMENT,
      },
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
  operation: () => Promise<Response>,
) {
  const requestId = readIdempotencyKey(payload);
  if (requestId === undefined) {
    return errorResponse(
      `requestId must be a non-empty string of at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
      'INVALID_IDEMPOTENCY_KEY',
    );
  }
  if (requestId === null) return operation();

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
    response = await operation();
  } catch (error) {
    await env.DB.prepare(
      'DELETE FROM game_idempotency WHERE user_id = ? AND request_id = ? AND completed = 0',
    )
      .bind(userId, requestId)
      .run();
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

  const completedAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE game_idempotency SET completed = 1, completed_at = ?
       WHERE user_id = ? AND request_id = ? AND completed = 0`,
    ).bind(completedAt, userId, requestId),
    env.DB.prepare(
      `DELETE FROM game_idempotency
       WHERE user_id = ? AND request_id NOT IN (
         SELECT request_id FROM game_idempotency
         WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
       )`,
    ).bind(userId, userId, IDEMPOTENCY_HISTORY_LIMIT),
  ]);
  response.headers.set('Idempotency-Key', requestId);
  return response;
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

  const fee = roundMoney(Math.max(0.01, order.notional * TRADING_FEE_RATE));
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
         WHERE user_id = ? AND cash >= ? AND turn = ? AND (
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
         WHERE user_id = ? AND EXISTS (
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
    ]);
  }

  const completed = await env.DB.prepare(
    'SELECT 1 AS completed FROM players WHERE user_id = ? AND last_operation_id = ?',
  )
    .bind(userId, operationId)
    .first<{ completed: number }>();
  if (!completed) {
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

async function purchaseItem(userId: string, payload: JsonObject) {
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
       SET cash = cash - ?, happiness = MIN(100, happiness + ?),
           city_tax_paid = city_tax_paid + ?, account_status = 'ACTIVE',
           last_operation_id = ?, updated_at = ?
       WHERE user_id = ? AND cash >= ? AND cash = ? AND turn = ?`,
    ).bind(
      totalDebit,
      item.happiness,
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
  ]);

  const completed = await env.DB.prepare(
    'SELECT 1 AS completed FROM players WHERE user_id = ? AND last_operation_id = ?',
  )
    .bind(userId, operationId)
    .first<{ completed: number }>();
  if (!completed) {
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

async function acceptJob(userId: string, payload: JsonObject) {
  const requestedJob = readString(payload, 'job', 'MARKET_DATA_ASSISTANT')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
  if (requestedJob !== 'MARKET_DATA_ASSISTANT') {
    return errorResponse('Unknown AmpliWorld career', 'UNKNOWN_CAREER');
  }

  const now = new Date().toISOString();
  await env.DB.prepare(
    `UPDATE players SET career_status = 'MARKET_DATA_ASSISTANT', updated_at = ?
     WHERE user_id = ?`,
  )
    .bind(now, userId)
    .run();
  return Response.json({
    ...(await getSnapshot(userId)),
    career: {
      status: 'MARKET_DATA_ASSISTANT',
      dailyPay: 0,
      virtualOnly: true,
    },
  });
}

async function endDay(userId: string) {
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

  // Careers are role-play only. CLAIM_RELIEF is the sole cash safety net.
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
             happiness = MAX(0, happiness - 2), last_operation_id = ?, updated_at = ?
         WHERE user_id = ? AND turn = ? AND cash = ?`,
      ).bind(
        cashAfterLiquidation,
        liquidationRealizedPnl,
        liquidationTax,
        statusAfterLiquidation,
        nextTurn,
        nextTurn,
        operationId,
        now,
        userId,
        player.turn,
        player.cash,
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
    await env.DB.batch(statements);
  } else {
    const statements = [
      env.DB.prepare(
        `UPDATE players
         SET cash = cash + ?, turn = ?, last_settlement_turn = ?,
             apartment_lease_days = MAX(0, apartment_lease_days - 1),
             happiness = MAX(0, happiness - 2), last_operation_id = ?, updated_at = ?
         WHERE user_id = ? AND turn = ? AND cash = ?`,
      ).bind(
        wage,
        nextTurn,
        nextTurn,
        operationId,
        now,
        userId,
        player.turn,
        player.cash,
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
    await env.DB.batch(statements);
  }

  const completed = await env.DB.prepare(
    'SELECT 1 AS completed FROM players WHERE user_id = ? AND last_operation_id = ?',
  )
    .bind(userId, operationId)
    .first<{ completed: number }>();
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
    },
  });
}

async function claimRelief(userId: string) {
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
  ]);

  const completed = await env.DB.prepare(
    'SELECT 1 AS completed FROM players WHERE user_id = ? AND last_operation_id = ?',
  )
    .bind(userId, operationId)
    .first<{ completed: number }>();
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
    return runIdempotent(user.userId, action, payload, () =>
      executeTrade(user.userId, action, payload),
    );
  }
  if (action === 'PURCHASE' || action === 'SPEND')
    return runIdempotent(user.userId, action, payload, () =>
      purchaseItem(user.userId, payload),
    );
  if (action === 'HIRE')
    return runIdempotent(user.userId, action, payload, () =>
      acceptJob(user.userId, payload),
    );
  if (action === 'END_DAY')
    return runIdempotent(user.userId, action, payload, () =>
      endDay(user.userId),
    );
  if (action === 'CLAIM_RELIEF')
    return runIdempotent(user.userId, action, payload, () =>
      claimRelief(user.userId),
    );
  return errorResponse(
    'Supported actions are BUY, SELL, PURCHASE, SPEND, HIRE, END_DAY, and CLAIM_RELIEF',
    'INVALID_ACTION',
  );
}
