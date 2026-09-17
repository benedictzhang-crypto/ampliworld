import type {LifeWorld, Resident} from './engine';
/** Fictional opening liquidity policy, not a calibrated savings distribution. */
export function openingLiquidity(r: Resident) {
  const i = Number(r.id.slice(1)) - 1, age = r.identity?.age ?? 30;
  const monthly = r.employment?.monthlyGrossCents ?? 0;
  const months = [.01, .03, .08, .15, .3, .6, 1.2, 2.4][(i * 23 + 7) % 8];
  const cash = age < 18 ? 500 + i % 2000 : Math.round(Math.min(14000, Math.max(2000, monthly / 40)));
  const savings = age < 18 ? (i * 313) % 8000 : Math.round((monthly || (age >= 65 ? 120000 : 15000)) * months);
  return {cash, savings};
}
/** Correct only the old opening allowance; preserve subsequent earnings and net wealth. */
export function correctOpeningLiquidity(w: LifeWorld) {
  if (w.liquidityVersion === 1) return;
  for (const r of w.residents) {
    const i = Number(r.id.slice(1)) - 1, next = openingLiquidity(r);
    const cashReduction = Math.min(r.cash, Math.max(0, 12000 + (i * 913) % 54000 - next.cash));
    const savingsReduction = Math.min(r.savings, Math.max(0, 10000 + (i * 1771) % 85000 - next.savings));
    r.cash -= cashReduction; r.savings -= savingsReduction;
    const moved = cashReduction + savingsReduction;
    if (r.profile) r.profile.nonCashAssets += moved;
    w.treasury += moved;
    if (moved) r.memory.push({minute:w.minute, text:'Opening liquidity correction: transferred to non-cash assets; net worth unchanged.', cashDelta:-cashReduction});
    r.memory = r.memory.slice(-32);
  }
  w.liquidityVersion = 1;
}
