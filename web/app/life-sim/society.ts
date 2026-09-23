import { citizen, CENSUS_SIZE } from './census';
import { monthlySalaryCents } from './housing-finance';
import { occupationFor } from './occupation-weights';

/** Published household shares, not individual income/cash or a global demographic model. */
export const WEALTH_REFERENCE = {
  region: '美国',
  period: '2026 Q1',
  released: '2026-06-18',
  // Synthetic city endowment chosen to be commensurate with the catalog's
  // $350k–$10m dwellings; the published references supply shares only.
  scenarioTotalCents: 3_000_000_000_000,
  groups: [
    {
      id: 'bottom50',
      label: '净财富后 50%',
      people: 50,
      share: 2.5,
      url: 'https://fred.stlouisfed.org/series/WFRBSB50215',
    },
    {
      id: 'next40',
      label: '第 50–90 百分位',
      people: 40,
      share: 29.6,
      url: 'https://fred.stlouisfed.org/series/WFRBSN40188',
    },
    {
      id: 'next9',
      label: '第 90–99 百分位',
      people: 9,
      share: 36.3,
      url: 'https://fred.stlouisfed.org/series/WFRBSN09161',
    },
    {
      id: 'top1',
      label: '净财富前 1%',
      people: 1,
      share: 31.6,
      url: 'https://fred.stlouisfed.org/series/WFRBST01134',
    },
  ],
} as const;
export const OCCUPATIONS = [
  { id: 'retail', label: '零售店员', sector: '消费服务', wage: 1800 },
  { id: 'chef', label: '厨师', sector: '餐饮', wage: 2400 },
  { id: 'gardener', label: '草坪与园林维护员', sector: '公共环境', wage: 2100 },
  { id: 'police', label: '警员', sector: '公共安全', wage: 3600 },
  { id: 'doctor', label: '医生', sector: '医疗', wage: 9500 },
  { id: 'nurse', label: '护士', sector: '医疗', wage: 4200 },
  { id: 'student', label: '大学生', sector: '教育', wage: 0 },
  { id: 'teacher', label: '教师', sector: '教育', wage: 3100 },
  { id: 'grocer', label: '超市员工', sector: '消费服务', wage: 1900 },
  { id: 'courier', label: '配送员', sector: '物流', wage: 2000 },
  { id: 'cleaner', label: '保洁员', sector: '公共环境', wage: 1800 },
  { id: 'engineer', label: '工程师', sector: '专业服务', wage: 5500 },
  { id: 'office', label: '办公室职员', sector: '专业服务', wage: 3000 },
  { id: 'owner', label: '小企业经营者', sector: '企业经营', wage: 4500 },
  { id: 'retired', label: '退休居民', sector: '非就业', wage: 0 },
  { id: 'jobseeker', label: '求职居民', sector: '非就业', wage: 0 },
] as const;
export const VENUES = [
  { id: 'canteen', name: '社区简餐', kind: '餐饮', price: 800, x: 0, z: -96 },
  { id: 'noodles', name: '中式面馆', kind: '餐饮', price: 1200, x: 0, z: -94 },
  { id: 'sushi', name: '日式料理', kind: '餐饮', price: 2600, x: 10, z: -88 },
  { id: 'bistro', name: '西式餐厅', kind: '餐饮', price: 3200, x: -10, z: -88 },
  {
    id: 'fine',
    name: '主厨品鉴餐厅',
    kind: '餐饮',
    price: 11000,
    x: 10,
    z: -92,
  },
  {
    id: 'market',
    name: '社区生鲜超市',
    kind: '超市',
    price: 2400,
    x: -10,
    z: 16,
  },
  {
    id: 'premium-market',
    name: '精品食品超市',
    kind: '超市',
    price: 4200,
    x: -10,
    z: 20,
  },
  {
    id: 'clothing',
    name: '服装与生活用品店',
    kind: '零售',
    price: 6000,
    x: 10,
    z: 18,
  },
  {
    id: 'electronics',
    name: '电子产品商店',
    kind: '零售',
    price: 15000,
    x: 10,
    z: 22,
  },
  {
    id: 'clinic',
    name: 'Meridian University Medical Center',
    kind: '医疗',
    price: 1800,
    x: 3000,
    z: 4446,
  },
  { id: 'school', name: 'AmpliWorld Academy Campus', kind: '教育', price: 0, x: 3570, z: 4678 },
  {
    id: 'precinct',
    name: '警务服务点',
    kind: '公共安全',
    price: 0,
    x: 10,
    z: 28,
  },
  {
    id: 'landscape',
    name: '园林维护站',
    kind: '公共环境',
    price: 0,
    x: 10,
    z: 32,
  },
] as const;
export type CitizenProfile = {
  occupation: string;
  sector: string;
  cohort: string;
  nonCashAssets: number;
  debt: number;
  pantry: number;
  lastShopDay: number;
  studyMinutes: number;
  venueId: string;
  foodStock?: { bread: number; protein: number; sugar: number; fruit: number };
  lastFoodBasket?: { bread: number; protein: number; sugar: number; fruit: number; costCents: number };
  lastFoodStoreId?: string;
};
// A synthetic, imperfect income–wealth association. Age and a stable residual
// preserve older asset-holders and inheritance; this is not an estimated joint
// distribution. Ranking (instead of modulo 100) avoids family-type aliasing.
let cachedCensusHouseholdOrdinal: Int32Array | undefined;
function censusHouseholdOrdinal(): Int32Array {
  if (cachedCensusHouseholdOrdinal) return cachedCensusHouseholdOrdinal;
  const count = CENSUS_SIZE / 3;
  const scores = Array.from({ length: count }, (_, household) => {
    const people = [0, 1, 2].map((slot) => {
      const index = household * 3 + slot;
      const identity = citizen(index);
      const job = occupationFor(index, identity.age, identity.occupation);
      return { age: identity.age, income: monthlySalaryCents(job, identity.age, !!identity.workplace) };
    });
    const income = people.reduce((sum, person) => sum + person.income, 0);
    const adults = people.filter((person) => person.age >= 18);
    const adultAge = adults.reduce((sum, person) => sum + person.age, 0) / adults.length;
    let hash = Math.imul(household + 1, 0x9e3779b1) >>> 0;
    hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b) >>> 0;
    const residual = (hash ^ (hash >>> 13)) >>> 0;
    const score = .4 * Math.min(1, income / 3_000_000) +
      .15 * Math.min(1, adultAge / 80) + .45 * residual / 0x1_0000_0000;
    return { household, score };
  });
  scores.sort((a, b) => a.score - b.score || a.household - b.household);
  const ordinal = new Int32Array(count);
  scores.forEach((entry, rank) => { ordinal[entry.household] = rank; });
  cachedCensusHouseholdOrdinal = ordinal;
  return ordinal;
}
export function profileAt(i: number, liquidCents: number, populationSize=100): CitizenProfile {
  // The 30k census is arranged in three-person households. Assign a wealth
  // cohort once per household, not independently to spouses and children.
  const householdSize = populationSize % 3 === 0 ? 3 : 1;
  const household = Math.floor(i / householdSize);
  const censusRank = householdSize === 3 && populationSize === CENSUS_SIZE
    ? censusHouseholdOrdinal()[household] : undefined;
  const rank = censusRank === undefined
    ? (household * 37) % 100
    : Math.floor(censusRank * 100 / (populationSize / householdSize));
  const group =
      rank < 50
        ? WEALTH_REFERENCE.groups[0]
        : rank < 90
          ? WEALTH_REFERENCE.groups[1]
          : rank < 99
            ? WEALTH_REFERENCE.groups[2]
            : WEALTH_REFERENCE.groups[3];
  const groupStart = rank < 50 ? 0 : rank < 90 ? 50 : rank < 99 ? 90 : 99,
    within = rank - groupStart;
  const budget = Math.round((WEALTH_REFERENCE.scenarioTotalCents * group.share) / 100),
    households=group.people*(populationSize/householdSize/100),
    ordinal=censusRank===undefined?within+Math.floor(household/100)*group.people:
      censusRank-groupStart*(populationSize/householdSize/100),
    // A bounded within-cohort gradient prevents every household in a class
    // from having exactly the same wealth. Cumulative BigInt allocation keeps
    // each cohort's published share exact to the cent after rounding.
    cumulative=(count:number)=>BigInt(4*households*count+6*count*(count-1)),
    weightTotal=cumulative(households),
    householdTarget=Number((BigInt(budget)*cumulative(ordinal+1))/weightTotal-(BigInt(budget)*cumulative(ordinal))/weightTotal),
    slot = i % householdSize,
    target = householdSize === 1 ? householdTarget
      : slot === 0 ? Math.floor(householdTarget * .55)
      : slot === 1 ? Math.floor(householdTarget * .4)
      : householdTarget - Math.floor(householdTarget * .55) - Math.floor(householdTarget * .4);
  const occupation = OCCUPATIONS[i % OCCUPATIONS.length];
  return {
    occupation: occupation.id,
    sector: occupation.sector,
    cohort: group.id,
    nonCashAssets: Math.max(0, target - liquidCents),
    debt: 0,
    pantry: 0,
    lastShopDay: -1,
    studyMinutes: 0,
    venueId: '',
  };
}
