import assert from 'node:assert/strict';
import {
  advanceLifeWorld,
  createLifeWorld,
  moneyTotal,
} from '../app/life-sim/engine';
import { BASE_FOOD_PRICES, planFoodBasket } from '../app/life-sim/food-choice';
import {
  recordPayrollHour,
  settlePayrollArrears,
} from '../app/life-sim/payroll';
import { applyWorldEvent } from '../app/life-sim/world-events';

const sweetPreference = { sweetTooth: 1, freshFood: 0 };
const stapleBefore = planFoodBasket(1_200, BASE_FOOD_PRICES, sweetPreference);
const stapleAfter = planFoodBasket(
  1_200,
  { ...BASE_FOOD_PRICES, bread: 240 },
  sweetPreference,
);
assert.equal(stapleBefore.bread, 2);
assert.equal(stapleBefore.protein, 1);
assert.equal(stapleAfter.bread, 3);
assert.equal(stapleAfter.protein, 0);
assert(stapleAfter.costCents <= 1_200);

const smallTransferBefore = planFoodBasket(
  800,
  BASE_FOOD_PRICES,
  sweetPreference,
);
const smallTransferAfter = planFoodBasket(
  900,
  BASE_FOOD_PRICES,
  sweetPreference,
);
assert(smallTransferAfter.sugar > smallTransferBefore.sugar);
const biggerTransfer = planFoodBasket(1_600, BASE_FOOD_PRICES, {
  sweetTooth: 0,
  freshFood: 1,
});
assert(
  biggerTransfer.protein > 0 && biggerTransfer.fruit > 0,
  'more resources can support protein and produce; poverty does not imply one food preference',
);

const world = createLifeWorld();
const openingMoney = moneyTotal(world);
const breadNews = applyWorldEvent(world, 'Bread prices rise 20%');
assert.equal(breadNews.foodPrices?.bread, 240);
assert((breadNews.worldEvents?.at(-1)?.foodForecast?.bread.increase || 0) > 0);
assert((breadNews.worldEvents?.at(-1)?.foodForecast?.bread.maintain || 0) > 0);
assert((breadNews.worldEvents?.at(-1)?.foodForecast?.bread.reduce || 0) > 0);
assert.equal(
  moneyTotal(breadNews),
  openingMoney,
  'a price headline does not create cash',
);
const transferred = applyWorldEvent(
  world,
  'Cash transfer $10 to low-income residents',
);
const transferEvent = transferred.worldEvents?.at(-1);
assert.equal(transferEvent?.transferredCents, 15_000_000);
assert.equal(moneyTotal(transferred), openingMoney);
assert((transferEvent?.foodForecast?.sugar.increase || 0) > 0);
assert((transferEvent?.foodForecast?.protein.increase || 0) > 0);
assert((transferEvent?.foodForecast?.fruit.increase || 0) > 0);
assert.throws(
  () => applyWorldEvent(world, 'Cash transfer $10 to everyone'),
  /Specify low-income/,
);

const worker = world.residents.find(
  (r) =>
    r.employment &&
    world.businesses?.[r.employment.placeId]?.type === 'restaurant',
)!;
const employer = world.businesses![worker.employment!.placeId];
world.treasury += employer.cash;
employer.cash = 0;
const unpaid = recordPayrollHour(world, worker);
assert.equal(unpaid.paid, 0);
assert.equal(unpaid.outstanding, worker.wage);
assert.equal(worker.payroll?.earnedCents, worker.wage);
assert.equal(worker.payroll?.outstandingCents, worker.wage);
assert.equal(employer.unpaidWages, worker.wage);
const originalEmployment = worker.employment!;
const otherEmployer = Object.values(world.businesses!).find(
  (b) => b.id !== employer.id && b.type === 'restaurant',
)!;
const otherCash = otherEmployer.cash;
worker.employment = { ...originalEmployment, placeId: otherEmployer.id };
world.treasury -= worker.wage;
employer.cash += worker.wage;
world.minute += 1440;
assert.equal(settlePayrollArrears(world), worker.wage);
assert.equal(
  otherEmployer.cash,
  otherCash,
  'the new employer must not inherit old wage debt',
);
worker.employment = originalEmployment;
assert.equal(worker.payroll?.outstandingCents, 0);
assert.equal(worker.payroll?.paidCents, worker.wage);
assert.equal(worker.payroll?.arrearsRepaidCents, worker.wage);
assert.equal(employer.unpaidWages, 0);
assert.equal(moneyTotal(world), openingMoney);

const groceryId = world.residents.find(
  (r) => r.profile && r.id !== worker.id,
)!.id;
function prepareGroceryScenario(input: typeof world) {
  const scenario = structuredClone(input);
  const resident = scenario.residents.find((r) => r.id === groceryId)!;
  const priorLiquid = resident.cash + resident.savings;
  resident.cash = 1_200;
  resident.savings = 10_800;
  scenario.treasury += priorLiquid - resident.cash - resident.savings;
  resident.frugality = 1;
  resident.x = -10;
  resident.z = 16;
  resident.water = resident.nutrition = resident.energy = resident.health = 95;
  resident.profile!.pantry = 0;
  resident.plannedDecision = {
    action: 'shop',
    reason: 'grocery regression',
    validUntil: scenario.minute + 60,
  };
  assert.equal(moneyTotal(scenario), openingMoney);
  return scenario;
}
const regularPurchase = advanceLifeWorld(prepareGroceryScenario(world), 60);
const dearBreadPurchase = advanceLifeWorld(
  applyWorldEvent(prepareGroceryScenario(world), 'Bread prices rise 20%'),
  60,
);
const regularBasket = regularPurchase.residents.find((r) => r.id === groceryId)!
  .profile?.lastFoodBasket;
const dearBreadBasket = dearBreadPurchase.residents.find(
  (r) => r.id === groceryId,
)!.profile?.lastFoodBasket;
assert.equal(regularBasket?.bread, 2);
assert.equal(regularBasket?.protein, 1);
assert.equal(dearBreadBasket?.bread, 3);
assert.equal(dearBreadBasket?.protein, 0);
assert.equal(moneyTotal(regularPurchase), openingMoney);
assert.equal(moneyTotal(dearBreadPurchase), openingMoney);

console.log(
  JSON.stringify({
    passed: true,
    residents: world.residents.length,
    stapleBefore,
    stapleAfter,
    smallTransferBefore,
    smallTransferAfter,
    transferCents: transferEvent?.transferredCents,
    foodForecast: transferEvent?.foodForecast,
    payroll: worker.payroll,
    regularBasket,
    dearBreadBasket,
    conservedCents: moneyTotal(dearBreadPurchase),
  }),
);
