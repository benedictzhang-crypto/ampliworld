import assert from 'node:assert/strict';
import { createLifeWorld } from '../app/life-sim/engine';
import { WEALTH_REFERENCE } from '../app/life-sim/society';
import { SOCIAL_JOBS } from '../app/life-sim/census';

const world = createLifeWorld();
const households = new Map<string, typeof world.residents>();
for (const resident of world.residents) {
  const id = resident.identity!.familyId;
  const members = households.get(id) || [];
  members.push(resident);
  households.set(id, members);
}

const jobs = new Map<string, number>();
const workplaces = new Map<string, { staff: number; titles: Map<string, number> }>();
let lowWageHighSavings = 0;
let mixedWealthHouseholds = 0;
let wealthyInLowHomes = 0;
let lowWealthInLuxuryHomes = 0;
let unaffordableHomes = 0;
let subsidizedRentHomes = 0;
let employedWithoutFirm = 0;
const tierCounts: Record<string, number> = {};
const crossTier: Record<string, number> = {};
const cohortWages: Record<string, { residents: number; wageCents: number; netWorthCents: number }> = {};
for (const resident of world.residents) {
  jobs.set(resident.job, (jobs.get(resident.job) || 0) + 1);
  if (resident.wage > 0 && resident.wage <= 2_400 && resident.savings > resident.wage * 2_000)
    lowWageHighSavings++;
  if (resident.employment && !world.businesses?.[resident.employment.placeId])
    employedWithoutFirm++;
  const cohort = resident.profile!.cohort;
  const wageGroup = cohortWages[cohort] ||= { residents: 0, wageCents: 0, netWorthCents: 0 };
  wageGroup.residents++;
  wageGroup.wageCents += resident.wage;
  wageGroup.netWorthCents += resident.cash + resident.savings + resident.profile!.nonCashAssets - resident.profile!.debt;
  if (resident.employment) {
    const type = world.businesses?.[resident.employment.placeId]?.type || 'missing';
    const group = workplaces.get(type) || { staff: 0, titles: new Map() };
    group.staff++;
    group.titles.set(resident.job, (group.titles.get(resident.job) || 0) + 1);
    workplaces.set(type, group);
  }
}
for (const members of households.values()) {
  const home = world.housing![members[0].dwellingId!];
  const cohorts = new Set(members.map((r) => r.profile?.cohort));
  if (cohorts.size > 1) mixedWealthHouseholds++;
  tierCounts[home.tier] = (tierCounts[home.tier] || 0) + 1;
  const householdCohort = members.map((r) => r.profile?.cohort).join('+');
  crossTier[`${householdCohort}|${home.tier}`] =
    (crossTier[`${householdCohort}|${home.tier}`] || 0) + 1;
  if (members.some((r) => r.profile?.cohort === 'top1') && home.tier === 'low') wealthyInLowHomes++;
  if (members.every((r) => r.profile?.cohort === 'bottom50') && ['ultra', 'cbd', 'villa', 'largeDetached'].includes(home.tier)) lowWealthInLuxuryHomes++;
  if (home.tenure === 'renter') {
    const offeredRent = Math.round(home.propertyValueCents * .003);
    if (offeredRent > home.affordabilityLimitCents) {
      unaffordableHomes++;
      if (home.monthlyRentCents < offeredRent) subsidizedRentHomes++;
    }
  }
}
assert.equal(households.size, 10_000);
assert.equal(mixedWealthHouseholds, 0, 'household members should share a socioeconomic cohort');
assert.equal(wealthyInLowHomes, 0, 'top-wealth households should not be seeded in low-tier homes');
assert.equal(lowWealthInLuxuryHomes, 0, 'bottom-wealth households should not be seeded in luxury homes');
assert(unaffordableHomes < households.size * .01, 'opening rent subsidy should be exceptional and visible');
assert.equal(employedWithoutFirm, 0);
assert.equal(lowWageHighSavings, 0);
assert(cohortWages.top1.wageCents / cohortWages.top1.residents >
  cohortWages.bottom50.wageCents / cohortWages.bottom50.residents,
  'synthetic wealth and earning capacity should have positive, imperfect association');
for (const group of WEALTH_REFERENCE.groups) {
  assert.equal(cohortWages[group.id].residents, group.people * world.residents.length / 100);
  assert.equal(cohortWages[group.id].netWorthCents,
    Math.round(WEALTH_REFERENCE.scenarioTotalCents * group.share / 100));
}
for (const [type, forbidden] of [
  ['office', '服务员'], ['clinic', '货车司机'], ['maintenance', '销售顾问'],
  ['daycare', '建筑工人'], ['retail', '自由职业者'],
] as const) {
  assert.equal(workplaces.get(type)?.titles.get(forbidden) || 0, 0,
    `${forbidden} should not be auto-assigned to ${type}`);
}
console.log(JSON.stringify({
  passed: true,
  people: world.residents.length,
  households: households.size,
  tierCounts,
  mixedWealthHouseholds,
  wealthyInLowHomes,
  lowWealthInLuxuryHomes,
  unaffordableHomes,
  subsidizedRentHomes,
  lowWageHighSavings,
  employedWithoutFirm,
  jobTitleCount: jobs.size,
  missingSeedJobs: SOCIAL_JOBS.filter((job) => !jobs.has(job)),
  cohortWages,
  jobs: [...jobs].sort((a, b) => b[1] - a[1]).slice(0, 30),
  workplaceTypes: [...workplaces].map(([type, group]) => ({
    type,
    staff: group.staff,
    topTitles: [...group.titles].sort((a, b) => b[1] - a[1]).slice(0, 5),
  })).sort((a, b) => b.staff - a.staff),
  crossTier: Object.entries(crossTier).sort((a, b) => b[1] - a[1]).slice(0, 20),
}));
