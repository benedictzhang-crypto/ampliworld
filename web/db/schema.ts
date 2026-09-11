import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const players = sqliteTable('players', {
  userId: text('user_id').primaryKey(),
  cash: real('cash').notNull().default(10000),
  portfolioValue: real('portfolio_value').notNull().default(0),
  realizedPnl: real('realized_pnl').notNull().default(0),
  unrealizedPnl: real('unrealized_pnl').notNull().default(0),
  happiness: integer('happiness').notNull().default(52),
  nutrition: integer('nutrition').notNull().default(50),
  careStreak: integer('care_streak').notNull().default(0),
  dailyCarePoints: integer('daily_care_points').notNull().default(0),
  dailyProtein: integer('daily_protein').notNull().default(0),
  dailyProduce: integer('daily_produce').notNull().default(0),
  lastMealTurn: integer('last_meal_turn').notNull().default(0),
  lastWellnessTurn: integer('last_wellness_turn').notNull().default(0),
  lastLeisureTurn: integer('last_leisure_turn').notNull().default(0),
  tradingFeeBps: integer('trading_fee_bps').notNull().default(10),
  cityTaxPaid: real('city_tax_paid').notNull().default(0),
  marginUsed: real('margin_used').notNull().default(0),
  grossExposure: real('gross_exposure').notNull().default(0),
  borrowedExposure: real('borrowed_exposure').notNull().default(0),
  maintenanceMarginRequired: real('maintenance_margin_required')
    .notNull()
    .default(0),
  liquidationCount: integer('liquidation_count').notNull().default(0),
  accountStatus: text('account_status').notNull().default('ACTIVE'),
  reliefClaims: integer('relief_claims').notNull().default(0),
  lastReliefTurn: integer('last_relief_turn').notNull().default(-100000),
  lastSettlementTurn: integer('last_settlement_turn').notNull().default(1),
  apartmentLeaseDays: integer('apartment_lease_days').notNull().default(365),
  currentDistrict: text('current_district')
    .notNull()
    .default('STARTER_ARCOLOGY'),
  starterTower: integer('starter_tower').notNull().default(1),
  starterFloor: integer('starter_floor').notNull().default(1),
  starterUnit: integer('starter_unit').notNull().default(1),
  transitSpend: real('transit_spend').notNull().default(0),
  transitTrips: integer('transit_trips').notNull().default(0),
  metroRides: integer('metro_rides').notNull().default(0),
  taxiRides: integer('taxi_rides').notNull().default(0),
  lastTransitMode: text('last_transit_mode').notNull().default(''),
  lastTransitFare: real('last_transit_fare').notNull().default(0),
  lastTransitAt: text('last_transit_at').notNull().default(''),
  careerStatus: text('career_status').notNull().default('UNEMPLOYED'),
  lastWorkTurn: integer('last_work_turn').notNull().default(0),
  workStreak: integer('work_streak').notNull().default(0),
  lifetimeWages: real('lifetime_wages').notNull().default(0),
  workDate: text('work_date').notNull().default(''),
  shiftsToday: integer('shifts_today').notNull().default(0),
  wagesToday: real('wages_today').notNull().default(0),
  socialMode: text('social_mode').notNull().default('PRIVATE'),
  contactCoins: integer('contact_coins').notNull().default(0),
  turn: integer('turn').notNull().default(1),
  marketSeed: text('market_seed').notNull().default(''),
  lastOperationId: text('last_operation_id').notNull().default(''),
  createdAt: text('created_at').notNull().default(''),
  updatedAt: text('updated_at').notNull(),
});

export const gameWorld = sqliteTable('game_world', {
  id: text('id').primaryKey(),
  marketSeed: text('market_seed').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const holdings = sqliteTable(
  'holdings',
  {
    userId: text('user_id')
      .notNull()
      .references(() => players.userId, { onDelete: 'cascade' }),
    symbol: text('symbol').notNull(),
    quantity: real('quantity').notNull().default(0),
    averagePrice: real('average_price').notNull(),
    leverage: integer('leverage').notNull().default(1),
    marginPosted: real('margin_posted').notNull().default(0),
    borrowedAmount: real('borrowed_amount').notNull().default(0),
    lastMarkPrice: real('last_mark_price').notNull().default(0),
    maintenanceMarginRate: real('maintenance_margin_rate').notNull().default(0),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.symbol] }),
    index('holdings_user_idx').on(table.userId),
  ],
);

export const inventory = sqliteTable(
  'inventory',
  {
    userId: text('user_id')
      .notNull()
      .references(() => players.userId, { onDelete: 'cascade' }),
    itemCode: text('item_code').notNull(),
    displayName: text('display_name').notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: real('unit_price').notNull(),
    taxPaid: real('tax_paid').notNull().default(0),
    acquiredAt: text('acquired_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.itemCode] }),
    index('inventory_user_idx').on(table.userId),
  ],
);

export const trades = sqliteTable(
  'trades',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => players.userId, { onDelete: 'cascade' }),
    symbol: text('symbol').notNull(),
    side: text('side').$type<'BUY' | 'SELL' | 'LIQUIDATION'>().notNull(),
    quantity: real('quantity').notNull().default(0),
    notional: real('notional').notNull(),
    price: real('price').notNull(),
    fee: real('fee').notNull().default(0),
    tax: real('tax').notNull().default(0),
    realizedPnl: real('realized_pnl').notNull().default(0),
    leverage: integer('leverage').notNull().default(1),
    marginRequired: real('margin_required').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('trades_user_created_idx').on(table.userId, table.createdAt),
  ],
);

export const marginEvents = sqliteTable(
  'margin_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => players.userId, { onDelete: 'cascade' }),
    turn: integer('turn').notNull(),
    eventType: text('event_type')
      .$type<'DAILY_SETTLEMENT' | 'LIQUIDATION' | 'RELIEF'>()
      .notNull(),
    symbol: text('symbol'),
    dailyPnl: real('daily_pnl').notNull().default(0),
    accountEquity: real('account_equity').notNull().default(0),
    maintenanceRequired: real('maintenance_required').notNull().default(0),
    details: text('details').notNull().default(''),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('margin_events_user_turn_idx').on(table.userId, table.turn),
  ],
);

export const gameIdempotency = sqliteTable(
  'game_idempotency',
  {
    userId: text('user_id')
      .notNull()
      .references(() => players.userId, { onDelete: 'cascade' }),
    requestId: text('request_id').notNull(),
    action: text('action').notNull(),
    completed: integer('completed', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: text('created_at').notNull(),
    completedAt: text('completed_at'),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.requestId] }),
    index('game_idempotency_user_created_idx').on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const transitTrips = sqliteTable(
  'transit_trips',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => players.userId, { onDelete: 'cascade' }),
    turn: integer('turn').notNull(),
    fromDistrict: text('from_district').notNull(),
    toDistrict: text('to_district').notNull(),
    mode: text('mode').$type<'METRO' | 'TAXI'>().notNull(),
    fare: real('fare').notNull(),
    durationGameMinutes: integer('duration_game_minutes').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('transit_trips_user_created_idx').on(table.userId, table.createdAt),
  ],
);

export const lifeEvents = sqliteTable(
  'life_events',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => players.userId, { onDelete: 'cascade' }),
    turn: integer('turn').notNull(),
    activityCode: text('activity_code').notNull(),
    category: text('category').$type<'MEAL' | 'WELLNESS' | 'LEISURE'>().notNull(),
    price: real('price').notNull(),
    tax: real('tax').notNull().default(0),
    happinessDelta: integer('happiness_delta').notNull().default(0),
    nutritionDelta: integer('nutrition_delta').notNull().default(0),
    carePoints: integer('care_points').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('life_events_user_turn_category_unique').on(
      table.userId,
      table.turn,
      table.category,
    ),
  ],
);

export const workShifts = sqliteTable(
  'work_shifts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => players.userId, { onDelete: 'cascade' }),
    turn: integer('turn').notNull(),
    jobCode: text('job_code').notNull(),
    pay: real('pay').notNull(),
    happinessDelta: integer('happiness_delta').notNull().default(0),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('work_shifts_user_turn_unique').on(table.userId, table.turn),
  ],
);
