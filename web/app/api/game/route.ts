import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';

const prices: Record<string, number> = { NVDA: 184.26, AAPL: 238.41, LVMUY: 134.08, UUP: 27.16 };

async function prepareDatabase() {
  await env.DB.batch([
    env.DB.prepare('CREATE TABLE IF NOT EXISTS players (user_id TEXT PRIMARY KEY, cash REAL NOT NULL DEFAULT 10000, portfolio_value REAL NOT NULL DEFAULT 0, apartment_lease_days INTEGER NOT NULL DEFAULT 365, career_status TEXT NOT NULL DEFAULT \'UNEMPLOYED\', turn INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS trades (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, symbol TEXT NOT NULL, side TEXT NOT NULL, notional REAL NOT NULL, price REAL NOT NULL, created_at TEXT NOT NULL)'),
  ]);
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });
  await prepareDatabase();
  const now = new Date().toISOString();
  await env.DB.prepare('INSERT OR IGNORE INTO players (user_id, cash, portfolio_value, apartment_lease_days, career_status, turn, updated_at) VALUES (?, 10000, 0, 365, \'UNEMPLOYED\', 1, ?)').bind(user.userId, now).run();
  const player = await env.DB.prepare('SELECT cash, portfolio_value AS portfolioValue, apartment_lease_days AS apartmentLeaseDays, career_status AS careerStatus, turn FROM players WHERE user_id = ?').bind(user.userId).first();
  return Response.json(player);
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });
  const payload = await request.json() as { action?: string; symbol?: string; notional?: number };
  const symbol = String(payload.symbol ?? '').toUpperCase();
  const notional = Number(payload.notional ?? 0);
  if (payload.action !== 'buy' || !prices[symbol] || notional !== 500) return Response.json({ error: 'Invalid virtual order' }, { status: 400 });
  await prepareDatabase();
  const current = await env.DB.prepare('SELECT cash FROM players WHERE user_id = ?').bind(user.userId).first<{ cash: number }>();
  if (!current || current.cash < notional) return Response.json({ error: 'Insufficient virtual cash' }, { status: 400 });
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare('UPDATE players SET cash = cash - ?, portfolio_value = portfolio_value + ?, updated_at = ? WHERE user_id = ? AND cash >= ?').bind(notional, notional, now, user.userId, notional),
    env.DB.prepare('INSERT INTO trades (user_id, symbol, side, notional, price, created_at) VALUES (?, ?, \'BUY\', ?, ?, ?)').bind(user.userId, symbol, notional, prices[symbol], now),
  ]);
  const player = await env.DB.prepare('SELECT cash, portfolio_value AS portfolioValue FROM players WHERE user_id = ?').bind(user.userId).first();
  return Response.json(player);
}
