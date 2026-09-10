import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const players = sqliteTable('players', {
  userId: text('user_id').primaryKey(),
  cash: real('cash').notNull().default(10000),
  portfolioValue: real('portfolio_value').notNull().default(0),
  apartmentLeaseDays: integer('apartment_lease_days').notNull().default(365),
  careerStatus: text('career_status').notNull().default('UNEMPLOYED'),
  turn: integer('turn').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});

export const trades = sqliteTable('trades', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull(),
  symbol: text('symbol').notNull(),
  side: text('side').notNull(),
  notional: real('notional').notNull(),
  price: real('price').notNull(),
  createdAt: text('created_at').notNull(),
});
