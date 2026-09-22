/** Original fictional city mix, NOT calibrated census, BLS shares, or hiring rules.
 * BLS sector totals are useful context, but industries are not occupations and
 * U.S. national shares do not describe this fictional CBD resident population.
 * Apply only at initial seeding (or an explicit versioned migration), never ticks.
 */
export const OCCUPATION_POLICY = 'synthetic-nonuniform-age-compatible-v1' as const;
export const OCCUPATION_POLICY_LABEL = '原创合成职业分布 · 非真实人口比例；年龄门槛仅为情景设定';

// [existing label, relative selection weight, fictional minimum starting age].
// Protected nonemployment labels retain their existing residents; weight 0 keeps
// a worker reassignment from silently changing employment participation.
export const OCCUPATION_WEIGHTS: ReadonlyArray<readonly [string, number, number]> = [
  ['酒店前台',32,18],['销售顾问',65,18],['客户经理',30,22],['行政助理',62,18],
  ['软件工程师',37,22],['产品经理',16,24],['设计师',28,20],['会计',43,22],
  ['审计员',13,22],['律师',9,25],['银行柜员',22,20],['研究员',9,25],
  ['医生',17,26],['护士',59,21],['药剂师',14,24],['康复师',18,22],
  ['教师',51,22],['幼教老师',27,20],['图书管理员',11,20],['实验室技术员',15,22],
  ['厨师',51,18],['服务员',75,18],['咖啡师',30,18],['烘焙师',24,18],
  ['超市理货员',50,18],['收银员',54,18],['店长',22,24],['理发师',26,18],
  ['健身教练',16,20],['保洁员',66,18],['园林养护员',24,18],['电工',23,20],
  ['水管工',20,20],['维修技师',39,20],['公交司机',26,23],['出租车司机',28,21],
  ['网约车司机',34,21],['货车司机',32,21],['配送员',61,18],['仓库管理员',39,18],
  ['外卖员',44,18],['调饮师',14,18],['手机销售顾问',10,18],['电子产品维修技师',13,20],['汽车维修技师',18,20],
  ['电动车销售顾问',9,20],['电动车维修技师',8,20],['摩托车销售顾问',6,20],['摩托车维修技师',7,20],['充电运维技师',10,20],['加油站服务员',13,18],
  ['博物馆馆长',2,30],['策展人',6,24],['藏品维护员',5,22],['博物馆讲解员',8,20],['美术馆讲解员',6,20],
  ['建筑工人',44,18],['塔吊司机',7,23],['水泥搅拌车司机',9,23],['环卫工人',24,18],['垃圾车司机',10,21],['焚烧炉操作员',8,21],['电力运行员',12,22],['电网调度员',7,22],['税务审查员',12,22],['纳税服务专员',18,20],
  ['机场地勤',18,18],['机场安检员',9,21],['地铁安检员',12,21],['地铁运营员',18,21],['物业管家',29,20],['保安',47,18],
  ['警员',17,22],['消防员',11,21],['社工',21,22],['照护员',47,18],
  ['摄影师',14,18],['音乐教师',10,20],['创业者',13,23],['自由职业者',42,18],
  ['全职家庭照护者',0,18],['求职者',0,18],
];

const protectedOccupations = new Set([
  '学龄前儿童','在校学生','大学生','退休居民','全职家庭照护者','求职者',
]);

// Index-only hash avoids coupling household slots, names, wealth or personality
// to occupation. No random global state: stable on reload and registry growth.
function identityFraction(index: number): number {
  let hash = (index + 1) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 0x100000000;
}

/** Changes only the returned occupation; never mutates IDs, family or links. */
export function occupationFor(index: number, currentAge: number, currentOccupation: string): string {
  if (!Number.isSafeInteger(index) || index < 0 || index > 0xfffffffe)
    throw new Error('Expected a stable nonnegative resident index');
  if (!Number.isFinite(currentAge) || currentAge < 0)
    throw new Error('Expected a nonnegative current age');
  if (currentAge < 18) return currentAge < 6 ? '学龄前儿童' : '在校学生';
  if (currentAge >= 65) return '退休居民';
  if (protectedOccupations.has(currentOccupation)) return currentOccupation;
  const eligible = OCCUPATION_WEIGHTS.filter(([, weight, minimumAge]) => weight > 0 && currentAge >= minimumAge);
  let draw = identityFraction(index) * eligible.reduce((total, [, weight]) => total + weight, 0);
  for (const [label, weight] of eligible) {
    draw -= weight;
    if (draw < 0) return label;
  }
  return eligible[eligible.length - 1][0];
}
