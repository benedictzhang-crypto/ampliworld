/** Fictional scenario policy, NOT observed wages, lending advice or real transactions.
 * Every public money value is integer cents. Housing is a separate opening-position
 * ledger: never rewrite cash/savings/profile.nonCashAssets/profile.debt from it.
 */
export const HOUSING_POLICY = 'fictional-opening-housing-v1' as const;
const money = (value: number) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Expected nonnegative integer cents');
  return value;
};
export function monthlySalaryCents(job: string, age: number, employed: boolean): number {
  if (!employed || age < 18 || age >= 65) return 0;
  // Hypothetical monthly gross salaries in fictional currency, not market estimates.
  if (/医生|律师|软件工程师|研究员|创业者/.test(job)) return 1_200_000;
  if (/产品经理|客户经理|审计|药剂师|工程师/.test(job)) return 900_000;
  if (/教师|会计|设计师|护士|警员|消防员|技师|电工|水管工/.test(job)) return 650_000;
  if (/店长|销售|行政|图书|实验室|司机|健身|摄影|自由职业/.test(job)) return 500_000;
  return 380_000;
}
export function monthlyMortgagePaymentCents(principalCents: number, annualRateBps = 360, months = 360): number {
  money(principalCents);
  if (!Number.isSafeInteger(months) || months < 1 || !Number.isSafeInteger(annualRateBps) || annualRateBps < 0) throw new Error('Invalid loan terms');
  if (!principalCents) return 0;
  const rate = annualRateBps / 120_000;
  return Math.ceil(rate ? principalCents * rate / -Math.expm1(-months * Math.log1p(rate)) : principalCents / months);
}
export function mortgageMonth(balanceCents: number, paymentCents: number, annualRateBps = 360) {
  money(balanceCents); money(paymentCents);
  if (!Number.isSafeInteger(annualRateBps) || annualRateBps < 0) throw new Error('Invalid interest rate');
  const interestCents = Math.round(balanceCents * annualRateBps / 120_000);
  const paidCents = Math.min(paymentCents, balanceCents + interestCents);
  const principalPaidCents = Math.min(balanceCents, Math.max(0, paidCents - interestCents));
  return { interestCents, paidCents, principalPaidCents, balanceCents: balanceCents - principalPaidCents,
    unpaidInterestCents: Math.max(0, interestCents - paidCents) };
}
export type HousingMember = { id: string; age: number; monthlyGrossIncomeCents: number };
export type HousingLedger = {
  version: 1; policy: typeof HOUSING_POLICY; familyId: string; unitId: string;
  residentIds: string[]; tenure: 'owner' | 'renter'; ownerResidentId: string | null;
  householdMonthlyGrossIncomeCents: number; affordabilityLimitCents: number;
  propertyValueCents: number; openingHousingWealthCents: number;
  downPaymentCents: number; originalLoanCents: number; loanBalanceCents: number;
  annualRateBps: number; remainingLoanMonths: number; monthlyMortgageCents: number;
  monthlyRentCents: number; openingScenario: true;
};
export type OpeningHousingInput = {
  familyId: string; unitId: string; members: readonly HousingMember[];
  propertyValueCents: number;
  // Separate hypothetical housing endowment. Do not pass cash/savings then count it twice.
  startingHousingWealthCents: number;
  annualRateBps?: number; loanMonths?: number; offeredMonthlyRentCents?: number;
};
export function createOpeningHousing(input: OpeningHousingInput): HousingLedger {
  const { familyId, unitId, members } = input;
  if (!familyId || !unitId || members.length === 0 || new Set(members.map(m => m.id)).size !== members.length) throw new Error('Invalid household');
  const value = money(input.propertyValueCents), wealth = money(input.startingHousingWealthCents);
  const income = money(members.reduce((sum, m) => sum + money(m.monthlyGrossIncomeCents), 0));
  const limit = Math.floor(income * 35 / 100);
  const adult = members.filter(m => m.age >= 18).sort((a, b) => b.monthlyGrossIncomeCents - a.monthlyGrossIncomeCents || a.id.localeCompare(b.id))[0];
  const down = Math.min(wealth, value), principal = value - down;
  const rate = input.annualRateBps ?? 360, months = input.loanMonths ?? 360;
  const monthly = monthlyMortgagePaymentCents(principal, rate, months);
  const owns = !!adult && value > 0 && down >= Math.ceil(value / 5) && monthly <= limit;
  const offeredRent = money(input.offeredMonthlyRentCents ?? Math.round(value * 0.003));
  return {
    version: 1, policy: HOUSING_POLICY, familyId, unitId, residentIds: members.map(m => m.id),
    tenure: owns ? 'owner' : 'renter', ownerResidentId: owns ? adult.id : null,
    householdMonthlyGrossIncomeCents: income, affordabilityLimitCents: limit,
    propertyValueCents: value, openingHousingWealthCents: wealth,
    downPaymentCents: owns ? down : 0, originalLoanCents: owns ? principal : 0,
    loanBalanceCents: owns ? principal : 0, annualRateBps: rate,
    remainingLoanMonths: owns && principal ? months : 0,
    monthlyMortgageCents: owns ? monthly : 0,
    // Model subsidized/capped opening rent when market offer exceeds affordability.
    monthlyRentCents: owns ? 0 : Math.min(offeredRent, limit), openingScenario: true,
  };
}
/** Idempotent migration: existing records/balances are authoritative and untouched. */
export function preserveOrCreateHousing(existing: HousingLedger | undefined, input: OpeningHousingInput): HousingLedger {
  return existing ?? createOpeningHousing(input);
}
/** Display-only housing equity for the sole owner. Do not add to legacy profile NW. */
export function residentHousingEquityCents(ledger: HousingLedger, residentId: string): number {
  return ledger.ownerResidentId === residentId ? Math.max(0, ledger.propertyValueCents - ledger.loanBalanceCents) : 0;
}
