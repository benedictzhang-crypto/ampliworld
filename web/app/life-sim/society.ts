/** Published household shares, not individual income/cash or a global demographic model. */
export const WEALTH_REFERENCE = {
  region: '美国',
  period: '2026 Q1',
  released: '2026-06-18',
  scenarioTotalCents: 10_000_000_000,
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
  { id: 'cleaner', label: '保洁员', sector: '公共环境', wage: 1700 },
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
    name: '社区诊疗中心',
    kind: '医疗',
    price: 1800,
    x: -10,
    z: -16,
  },
  { id: 'school', name: '学院服务点', kind: '教育', price: 0, x: -10, z: 26 },
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
};
export function profileAt(i: number, liquidCents: number): CitizenProfile {
  const rank = (i * 37) % 100,
    group =
      rank < 50
        ? WEALTH_REFERENCE.groups[0]
        : rank < 90
          ? WEALTH_REFERENCE.groups[1]
          : rank < 99
            ? WEALTH_REFERENCE.groups[2]
            : WEALTH_REFERENCE.groups[3];
  const groupStart = rank < 50 ? 0 : rank < 90 ? 50 : rank < 99 ? 90 : 99,
    within = rank - groupStart;
  const budget = (WEALTH_REFERENCE.scenarioTotalCents * group.share) / 100,
    base = Math.floor(budget / group.people),
    target = base + (within < budget - base * group.people ? 1 : 0);
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
