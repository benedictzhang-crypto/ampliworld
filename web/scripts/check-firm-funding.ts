import assert from 'node:assert/strict';
import {
  advanceLifeWorld,
  createLifeWorld,
  moneyTotal,
} from '../app/life-sim/engine';

let world = createLifeWorld();
const openingMoney = moneyTotal(world);
for (let day = 0; day < 7; day++) {
  world = advanceLifeWorld(world, 1440);
  assert.equal(moneyTotal(world), openingMoney, `money changed on day ${day + 1}`);
}

const payroll = world.residents.reduce(
  (total, resident) => {
    total.earned += resident.payroll?.earnedCents || 0;
    total.paid += resident.payroll?.paidCents || 0;
    total.underemployedResidentDays += resident.underemployedDays || 0;
    return total;
  },
  { earned: 0, paid: 0, underemployedResidentDays: 0 },
);
const merchants = Object.values(world.businesses || {});
const sector = (type: string) => {
  const firms = merchants.filter((business) => business.type === type);
  return {
    firms: firms.length,
    revenueCents: firms.reduce((sum, firm) => sum + firm.revenue, 0),
    outstandingWagesCents: firms.reduce(
      (sum, firm) => sum + firm.unpaidWages,
      0,
    ),
  };
};
assert(payroll.earned >= payroll.paid);
assert(payroll.underemployedResidentDays > 0, 'unfunded shifts must be visible');
assert(sector('convenience').revenueCents > 0, 'grocery demand must reach stores');
assert(merchants.every((firm) => firm.cash >= 0));
console.log(JSON.stringify({
  passed: true,
  days: 7,
  residents: world.residents.length,
  payroll,
  payrollFulfillmentPct: Number((payroll.paid / payroll.earned * 100).toFixed(2)),
  sectors: Object.fromEntries(
    ['supermarket', 'convenience', 'bakery', 'restaurant', 'office']
      .map((type) => [type, sector(type)]),
  ),
  conservedCents: openingMoney,
}));
