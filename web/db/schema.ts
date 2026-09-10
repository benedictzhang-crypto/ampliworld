import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

export const players = sqliteTable('players', {
  userId: text('user_id').primaryKey(),
  cash: real('cash').notNull().default(10000),
  portfolioValue: real('portfolio_value').notNull().default(0),
  realizedPnl: real('realized_pnl').notNull().default(0),
  unrealizedPnl: real('unrealized_pnl').notNull().default(0),
  happiness: integer('happiness').notNull().default(52),
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
  careerStatus: text('career_status').notNull().default('UNEMPLOYED'),
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
