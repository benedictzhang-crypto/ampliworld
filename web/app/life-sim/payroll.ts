import type { Business } from './commerce';
import type { LifeWorld, Resident } from './engine';

export type PayrollLedger = {
  earnedCents: number;
  paidCents: number;
  outstandingCents: number;
  arrearsRepaidCents: number;
  arrearsByPayerCents: Record<string, number>;
  lastPaymentMinute?: number;
};

export function payrollFor(resident: Resident): PayrollLedger {
  return (resident.payroll ??= {
    earnedCents: 0,
    paidCents: 0,
    outstandingCents: 0,
    arrearsRepaidCents: 0,
    arrearsByPayerCents: {},
  });
}

const PUBLIC_EMPLOYERS = new Set([
  'hospital',
  'police',
  'school',
  'fire',
  'community',
  'water',
  'wastewater',
  'city-hall',
  'court',
  'ems',
  'transport-authority',
]);

function payrollSource(
  world: LifeWorld,
  resident: Resident,
): Business | undefined {
  return resident.employment && world.businesses?.[resident.employment.placeId];
}

function transferWages(
  world: LifeWorld,
  resident: Resident,
  employer: Business | undefined,
  due: number,
  allowBackstop = false,
): number {
  const publicEmployer = !employer || PUBLIC_EMPLOYERS.has(employer.type);
  const available = publicEmployer ? world.treasury : employer.cash;
  let paid = Math.min(Math.max(0, available), due);
  if (publicEmployer) world.treasury -= paid;
  else employer.cash -= paid;
  if (
    !publicEmployer &&
    allowBackstop &&
    world.payrollPolicy === 'public-backstop' &&
    paid < due
  ) {
    const support = Math.min(Math.max(0, world.treasury), due - paid);
    world.treasury -= support;
    world.publicPayrollSupportCents =
      (world.publicPayrollSupportCents || 0) + support;
    paid += support;
  }
  resident.cash += paid;
  world.daily.at(-1)!.wages += paid;
  return paid;
}

/** Contracted wages accrue even when the payer has no cash. No money is minted. */
export function recordPayrollHour(
  world: LifeWorld,
  resident: Resident,
): { due: number; paid: number; outstanding: number } {
  const employer = payrollSource(world, resident);
  const due = Math.max(0, resident.wage);
  const paid = transferWages(world, resident, employer, due, true);
  const ledger = payrollFor(resident);
  ledger.earnedCents += due;
  ledger.paidCents += paid;
  ledger.outstandingCents += due - paid;
  if (due > paid) {
    const payerId = employer?.id || 'PUBLIC';
    ledger.arrearsByPayerCents[payerId] =
      (ledger.arrearsByPayerCents[payerId] || 0) + due - paid;
  }
  if (paid) ledger.lastPaymentMinute = world.minute;
  if (employer) {
    employer.workedHours++;
    employer.unpaidWages += due - paid;
  }
  return { due, paid, outstanding: due - paid };
}

/** Daily settlement rotates the first claimant so one early resident cannot always win. */
export function settlePayrollArrears(world: LifeWorld): number {
  const people = world.residents;
  const offset = Math.floor(world.minute / 1440) % people.length;
  let repaid = 0;
  for (let index = 0; index < people.length; index++) {
    const resident = people[(index + offset) % people.length];
    const ledger = resident.payroll;
    if (!ledger?.outstandingCents) continue;
    const claims = ledger.arrearsByPayerCents || {};
    for (const [payerId, owed] of Object.entries(claims)) {
      const employer =
        payerId === 'PUBLIC' ? undefined : world.businesses?.[payerId];
      if (payerId !== 'PUBLIC' && !employer) continue;
      const paid = transferWages(world, resident, employer, owed);
      if (!paid) continue;
      ledger.paidCents += paid;
      ledger.outstandingCents -= paid;
      ledger.arrearsRepaidCents += paid;
      ledger.lastPaymentMinute = world.minute;
      claims[payerId] -= paid;
      if (!claims[payerId]) delete claims[payerId];
      if (employer)
        employer.unpaidWages = Math.max(0, employer.unpaidWages - paid);
      resident.memory.push({
        minute: world.minute,
        text: '补发之前拖欠的工资',
        cashDelta: paid,
      });
      if (resident.memory.length > 32) resident.memory.shift();
      repaid += paid;
    }
  }
  return repaid;
}
