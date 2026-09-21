import assert from 'node:assert/strict';
import {createLifeWorld,moneyTotal,upgradeLifeWorld} from '../app/life-sim/engine';
import {settleHousingThrough} from '../app/life-sim/housing-payments';

const world=createLifeWorld(),openingMoney=moneyTotal(world);
const homes=Object.values(world.housing!);
const owner=homes.find(h=>h.tenure==='owner'&&h.loanBalanceCents>0)!;
const renter=homes.find(h=>h.tenure==='renter'&&h.monthlyRentCents>0)!;
assert(owner&&renter,'fixture needs owner and renter homes');
const ownerPayer=world.residents.find(r=>r.id===owner.ownerResidentId)!;
ownerPayer.cash+=owner.monthlyMortgageCents;world.treasury-=owner.monthlyMortgageCents;
const ownerBalance=owner.loanBalanceCents;
world.minute=30*1440;
settleHousingThrough(world,1);
assert.equal(world.housingPaidThroughMonth,1);
assert(owner.payment!.lastPaymentCents>0&&owner.loanBalanceCents<ownerBalance);
assert(renter.payment!.lastPaymentCents>0);
assert.equal(moneyTotal(world),openingMoney,'housing transfers conserve simulated money');
const once=JSON.stringify(world.housing);
settleHousingThrough(world,1);
assert.equal(JSON.stringify(world.housing),once,'same month is idempotent');

for(const id of renter.residentIds){const resident=world.residents.find(r=>r.id===id)!;resident.cash=0;resident.savings=0;}
world.minute=60*1440;
settleHousingThrough(world,2);
assert(renter.payment!.rentArrearsCents>=renter.monthlyRentCents,'unpaid rent becomes arrears');

const legacy=createLifeWorld();delete legacy.housingFinanceVersion;delete legacy.housingPaidThroughMonth;
for(const home of Object.values(legacy.housing!))delete home.payment;
legacy.minute=75*1440;
const upgraded=upgradeLifeWorld(legacy);
assert.equal(upgraded.housingPaidThroughMonth,2,'migration starts at current month without retroactive debits');
assert(Object.values(upgraded.housing!).every(h=>h.payment?.lastSettledMonth===2));
console.log('PASS: monthly mortgage/rent, principal, arrears, idempotency, conservation and migration');
