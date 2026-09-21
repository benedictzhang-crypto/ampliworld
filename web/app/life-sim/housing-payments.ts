import {mortgageMonth} from './housing-finance';
import type {LifeWorld,Resident} from './engine';
import type {Dwelling} from './residency';

export const HOUSING_FINANCE_VERSION=1;
const MONTH_MINUTES=30*1440;

export type HousingPaymentState={
  accountingVersion:1;
  lastSettledMonth:number;
  lastPaymentCents:number;
  lastPaymentMinute:number|null;
  totalPaidCents:number;
  mortgageInterestPaidCents:number;
  rentArrearsCents:number;
  mortgageArrearsCents:number;
};

function state(home:Dwelling):HousingPaymentState{
  return home.payment??={accountingVersion:1,lastSettledMonth:0,lastPaymentCents:0,lastPaymentMinute:null,totalPaidCents:0,mortgageInterestPaidCents:0,rentArrearsCents:0,mortgageArrearsCents:0};
}

function remember(world:LifeWorld,resident:Resident,text:string,cashDelta:number){
  resident.memory.push({minute:world.minute,text,cashDelta});
  if(resident.memory.length>32)resident.memory.shift();
}

function collect(world:LifeWorld,home:Dwelling,due:number){
  const members=home.residentIds.map(id=>world.residents.find(r=>r.id===id)).filter((r):r is Resident=>!!r&&!!r.identity&&r.identity.age>=18).sort((a,b)=>Number(b.id===home.ownerResidentId)-Number(a.id===home.ownerResidentId)||(b.employment?.monthlyGrossCents||0)-(a.employment?.monthlyGrossCents||0)||a.id.localeCompare(b.id));
  let remaining=due,paid=0;
  for(const resident of members){
    const fromCash=Math.min(remaining,resident.cash);resident.cash-=fromCash;remaining-=fromCash;paid+=fromCash;
    const fromSavings=Math.min(remaining,resident.savings);resident.savings-=fromSavings;remaining-=fromSavings;paid+=fromSavings;
    const debit=fromCash+fromSavings;if(debit)remember(world,resident,home.tenure==='owner'?'家庭房贷月供':'家庭月租',-debit);
    if(!remaining)break;
  }
  return paid;
}

export function initializeHousingPayments(world:LifeWorld){
  if(world.housingFinanceVersion===HOUSING_FINANCE_VERSION&&world.housingPaidThroughMonth!==undefined){for(const home of Object.values(world.housing||{}))state(home);return;}
  const currentMonth=Math.floor(world.minute/MONTH_MINUTES);
  for(const home of Object.values(world.housing||{})){const account=state(home);account.lastSettledMonth=Math.max(account.lastSettledMonth,currentMonth);}
  world.housingPaidThroughMonth??=currentMonth;
  world.housingFinanceVersion=HOUSING_FINANCE_VERSION;
}

export function settleHousingThrough(world:LifeWorld,targetMonth:number){
  if(!Number.isSafeInteger(targetMonth)||targetMonth<0)throw Error('Invalid housing month');
  initializeHousingPayments(world);
  for(let month=(world.housingPaidThroughMonth||0)+1;month<=targetMonth;month++){
    for(const home of Object.values(world.housing||{})){
      const account=state(home);if(account.lastSettledMonth>=month)continue;
      const due=home.tenure==='owner'&&home.loanBalanceCents>0?home.monthlyMortgageCents:home.tenure==='renter'?home.monthlyRentCents:0;
      const paid=collect(world,home,due);
      if(home.tenure==='owner'&&home.loanBalanceCents>0){
        const result=mortgageMonth(home.loanBalanceCents,paid,home.annualRateBps);
        home.loanBalanceCents=result.balanceCents;
        home.remainingLoanMonths=Math.max(0,home.remainingLoanMonths-1);
        account.mortgageInterestPaidCents+=Math.min(result.interestCents,paid);
        account.mortgageArrearsCents+=Math.max(0,due-paid);
        const owner=world.residents.find(r=>r.id===home.ownerResidentId);
        if(owner?.profile)owner.profile.nonCashAssets+=result.principalPaidCents;
        world.treasury+=paid;
      }else if(home.tenure==='renter'){
        account.rentArrearsCents+=Math.max(0,due-paid);
        const landlord=world.residents.find(r=>r.id===home.landlordId);
        if(landlord)landlord.cash+=paid;else world.treasury+=paid;
      }
      account.lastPaymentCents=paid;account.lastPaymentMinute=world.minute;account.totalPaidCents+=paid;account.lastSettledMonth=month;
    }
    world.housingPaidThroughMonth=month;
  }
}
