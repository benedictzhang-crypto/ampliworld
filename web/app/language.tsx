'use client';
import {Children,cloneElement,isValidElement,useSyncExternalStore,type ReactNode,type ReactElement,useEffect} from 'react';
import {Button} from '@/components/ui/button';
type Language='en'|'zh';
let language:Language='en';
const listeners=new Set<()=>void>();
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
function change(next:Language){language=next;try{localStorage.setItem('ampliworld-language',next);}catch{}document.documentElement.lang=next==='en'?'en':'zh-CN';listeners.forEach(fn=>fn());}
const dictionary:Record<string,string>={
 '净财富后 50%':'Bottom 50% by net worth','第 50–90 百分位':'50th–90th wealth percentiles','第 90–99 百分位':'90th–99th wealth percentiles','净财富前 1%':'Top 1% by net worth',
 ' 户自有住房':' owner-occupied households',' 人口占比':' population share','财富份额':'Share of total net worth','初始家庭统计参考':'Initial household benchmark',
 '当前按个人净财富重新排序分组；人数占比和财富份额是不同指标。参考数据按家庭统计，仅作情景对照。':'Groups are ranked by current individual net worth. Population share and wealth share are different measures. The reference uses households, not individuals, and is a scenario comparison only.',
 '存款是可用资金，非现金资产不是存款。开局流动资金按年龄和工资分层；旧存档仅调整原开局额度，后续收入保留。完整税费、生活账单尚未校准。':'Deposits are liquid funds; non-cash assets are not bank deposits. Opening liquidity varies by age and pay. Existing saves retain subsequent earnings. Taxes and living expenses are not fully calibrated.',
 '职业比例是测试覆盖，并非真实就业结构；职业不用于推断性格或能力。净财富包括非现金资产，不等于购物预算。':'Occupational shares are synthetic test coverage, not census estimates. Occupation does not determine personality or ability. Net worth includes non-cash assets and is not a spending budget.',
 '医院行政主管':'Hospital administrator','医院前台':'Hospital receptionist','警务主管':'Police supervisor','警务文员':'Police clerk','餐厅经营者':'Restaurateur','酒店经理':'Hotel manager','客房保洁员':'Housekeeper','礼宾员':'Concierge','汽车中心经理':'Dealership manager','汽车销售顾问':'Automotive sales adviser','零售顾问':'Retail adviser','物业经理':'Property manager','超市店长':'Supermarket manager',
 '酒店前台':'Hotel receptionist','销售顾问':'Sales adviser','客户经理':'Account manager','行政助理':'Administrative assistant','软件工程师':'Software engineer','产品经理':'Product manager','设计师':'Designer','会计':'Accountant','审计员':'Auditor','律师':'Lawyer','银行柜员':'Bank teller','研究员':'Researcher','医生':'Doctor','护士':'Nurse','药剂师':'Pharmacist','康复师':'Physical therapist','教师':'Teacher','幼教老师':'Preschool teacher','图书管理员':'Librarian','实验室技术员':'Lab technician','厨师':'Chef','服务员':'Server','咖啡师':'Barista','烘焙师':'Baker','超市理货员':'Stock clerk','收银员':'Cashier','店长':'Store manager','理发师':'Hairdresser','健身教练':'Fitness trainer','保洁员':'Cleaner','园林养护员':'Groundskeeper','电工':'Electrician','水管工':'Plumber','维修技师':'Technician','公交司机':'Bus driver','出租车司机':'Taxi driver','配送员':'Courier','仓库管理员':'Warehouse clerk','物业管家':'Property concierge','保安':'Security guard','警员':'Police officer','消防员':'Firefighter','社工':'Social worker','照护员':'Caregiver','摄影师':'Photographer','音乐教师':'Music teacher','创业者':'Entrepreneur','自由职业者':'Freelancer','全职家庭照护者':'Family caregiver','求职者':'Job seeker','退休居民':'Retired resident','大学生':'University student','在校学生':'School student','学龄前儿童':'Preschool child',
 '监护人':'Guardian','成年子女':'Adult child','子女':'Child','父母':'Parent','伴侣':'Partner','室友':'Housemate','邻居':'Neighbor','模拟银行账户：':'Simulated bank account: ',' 岁':' years old','虚拟持仓':'Simulated holdings',
 '真实场景坐标：小区边界、大门、主路、河道与桥梁。拖动平移，滚轮缩放；地图不会传送人物。':'World coordinates show communities, gates, roads, rivers and bridges. Drag to pan and scroll to zoom. The map does not teleport your avatar.',
 '金色虚线表示三中心布局关系，不是道路；浅金色标识高价值地段，尚未设置售价。':'Dashed gold lines connect the three urban centers. Pale gold marks high-value districts; prices have not been assigned.',
 '点击彩色小区查看边界、大门及建设状态。':'Select a colored community to inspect its boundary, gate and development status.',
 'km。显示的是已生成布局，不表示园区室内及生活功能全部完成。':'km. The plan shows generated layouts; interiors and activities remain under development.',
 '当前窗口南北跨度':'Visible north–south span','三中心布局':'Three urban centers','全城':'Entire city','核心城区':'City core',
 '青庭花园':'Qingting Gardens','澜岸别墅':'River Villas','我的位置':'My position','放大平面图':'Zoom in','缩小平面图':'Zoom out',
 '小区分区':'Communities','用地与社区':'Land use & communities','道路':'Roads','办公园区':'Office campus','医院园区':'Hospital campus','学校园区':'School campus',
 '赛博教堂':'Cyber cathedral','游艇酒店':'Marina hotel','核电站':'Nuclear power station','发电站':'Power station','赛车场':'Racing circuit',
 '职业筛选':'Filter occupation','全部职业':'All occupations','追踪对象':'Track resident','非现金资产（情景值）':'Non-cash assets · Scenario value','贷款余额':'Debt balance','个人净资产':'Individual net worth','家庭食品库存':'Household food inventory',
 '账户为模拟居民账户。跨区通勤目前按距离估时，不代表已完成全城道路寻路。':'These are simulated resident accounts. Interdistrict commuting uses distance-based estimates; citywide route finding is not yet complete.',
 '房价、工资与租金均为可调整的模拟假设。贷款按年利率3.6%、最长30年估算；住房支出不超过家庭税前收入35%，不足部分属于开局住房补助。自有房净值已包含在原非现金资产中，不重复加总。本轮记录期初余额与月供，还款扣账尚未启用；房号为逻辑单元。':'Property prices, wages and rents are adjustable simulation assumptions. Mortgage estimates use 3.6% annual interest and up to 30 years. Housing costs are capped at 35% of gross household income with initial support. Home equity is already included in non-cash assets. Repayment debits are not yet enabled; unit numbers are logical identifiers.',
 '覆盖 CBD 与周边社区，并非全部住在 CBD 核心地块。':'Coverage includes the CBD and surrounding communities.',
 '公共停车':'Public parking','食集':'Food hall','活动':'Events','城市生活':'City lifestyle','珠宝腕表':'Jewelry & watches','户外旅行':'Outdoor & travel','时装':'Fashion','数码生活':'Digital lifestyle','茶楼':'Tea lounges','高端餐饮':'Fine dining','影院':'Cinema','电玩城':'Arcade','观景步道':'Scenic promenade',
 '服务点':'Service point','小时':'hours',' 分钟':' minutes',' 份':' portions',' 次':' visits',
 '企业世界实验室':'Observable World Lab',
 '社会结构 · 消费行为 · 城市服务 ｜ 保留真实尺度的步行与驾驶':'Society · Consumer behavior · City services | Explore on foot or by car',
 '保留原昼夜节奏 · 完整循环 55 分钟':'Day–night cycle · 55 minutes',
 '居民档案':'Resident profiles','东湾游艇港 · 150 泊位':'East Bay Marina · 150 berths',
 '实验室 · 街区观察':'Lab · Observe district','进入现场 · 步行 / 驾驶':'Explore · Walk / Drive',
 '商场楼层览景':'Mall · Explore floors','商场电梯楼层':'Mall elevator floors','呼梯到本层':'Call elevator to this floor',
 '城市平面图':'City map','全城总览':'City overview','体育场俯瞰':'Stadium','日料街景':'Restaurant quarter',
 '汽车中心览景':'Automotive center','地库览景':'Underground parking','下车（E）':'Exit vehicle (E)',
 '上车驾驶（E）':'Drive vehicle (E)','靠近前街汽车上车':'Approach a car to drive',
 '青庭花园 · 15 栋':'Qingting Gardens · 15 buildings','澜岸别墅 · 60 栋':'River Villas · 60 homes',
 '俯瞰街区':'Observe district','控制小人':'Walk as avatar','住宅细节':'Residential architecture',
 '关闭小区门禁':'Close community gate','请先离开门口再关闭':'Step clear of the gate first','打开小区门禁（试玩）':'Open community gate',
 '东曜副中心':'East Financial Center','南辰副中心':'South Cultural Center','河口景观':'River estuary',
 '抬头 ↑（R）':'Look up ↑ (R)','低头 ↓（F）':'Look down ↓ (F)','视角归正':'Reset view',
 '拖动俯瞰 · 滚轮缩放 · 点击「控制小人」回到街道':'Drag to orbit · Scroll to zoom · Select Walk as avatar to explore',
 '俯瞰不会改变角色位置 · 返回继续原地行走':'Observation preserves your position. Return to continue exploring.',
 'WASD 行走 · 空格跳跃 · 鼠标拖动看四周':'WASD to walk · Space to jump · Drag to look around',
 '驾驶':'Driving','空格刹车':'Space to brake','E 下车':'E to exit','已停入':'Parked in',
 '加载实验存档':'Loading simulation','企业观察实验室 · 同一居民身份、生活与财务存档 · 合成规则模型':'Enterprise observation lab · Persistent resident identities and accounts · Synthetic rule-based simulation',
 '刷新存档':'Reload simulation','暂停':'Pause','运行':'Run','＋1 小时':'+1 hour','＋1 天':'+1 day',
 '正在推进并保存…':'Advancing and saving…','每 5 秒推进 15 分钟；隐藏页面自动停止推进':'Advance 15 simulated minutes every 5 seconds; pauses when hidden',
 '暂停中 · 刷新后可继续；暂不离线推进':'Paused · Progress is saved; offline advancement is not enabled',
 '今日消费':'Spending today','今日工资':'Wages today','就诊 / 成交':'Clinic visits / Trades','观察维度':'Observation view',
 '社会结构':'Society','商业与服务':'Commerce & services','个体追踪':'Resident detail','家庭财富与职业结构':'Household wealth and occupations',
 '居民财富分布':'Resident wealth distribution','实验情景':'Simulation scenario','职业覆盖':'Occupations',
 '消费去向与服务活动':'Spending and service activity','公共服务累计工时':'Public service hours',
 '为此居民请求一次大模型决策':'Request one AI decision for this resident',
 '单人验证模式：需要配置推理服务；每次只请求一个决定，服务器检查后执行。未配置时会明确报错，不把规则结果冒充大模型。':'Single-resident evaluation requires a configured inference service. Each decision is validated before execution. Rule-based behavior is not presented as model inference.',
 '每名居民是独立个体，同一家人各有个人账户。初始财富差异借用美国家庭统计作为情景参考，并非已校准的个人财富分布；旧存档保留既有财产。CBD 数万人是扩容目标，不是当前已运行人数。':'Each resident has an individual account. Initial wealth scenarios use US household statistics as a reference, not a calibrated individual distribution. Existing accounts retain their assets. A population of tens of thousands is an expansion target.',
 '家庭、邻居与同事':'Family, neighbors & colleagues','人格参数（合成，非大模型）':'Personality traits · Synthetic profiles',
 '开放性':'Openness','尽责性':'Conscientiousness','外向性':'Extraversion','亲和性':'Agreeableness','情绪稳定性':'Emotional stability',
 '最近记忆与收支':'Recent memories & transactions','住房产权与就业':'Housing & employment','家庭自有住房':'Owner-occupied home','租住房屋':'Rented home',
 '本人估算税前月薪':'Estimated gross monthly pay','房屋情景估值':'Scenario property value','家庭剩余房贷':'Household mortgage balance','估算月供':'Estimated monthly mortgage','估算月租':'Estimated monthly rent',
 '老城里':'Old Town','宜居家园':'Urban Commons','锦庭府':'Garden Residences','云境天邸':'Sky Residences','城市御墅':'Urban Villas','山麓庄园':'Hillside Estates',
 '云庭曲廊 · 五栋露台公馆':'Cloud Terrace · Five residences','云庭':'Cloud Terrace','金庭':'Golden Gardens',
 '天阙之环':'Celestial Ring','双曜之门':'Twin Halo Gate','星环中心':'Stellar Center','森间寿司':'Morima Sushi','晖环体育场':'Halo Stadium',
 '东湾游艇港酒店':'East Bay Marina Hotel','地中海餐厅':'Mediterranean restaurant','花园中餐':'Chinese garden restaurant','炭烤餐厅':'Ember grill',
 '五星酒店':'Five-star hotel','四星酒店':'Four-star hotel','汽车中心':'Automotive center','日式庭院与停车场':'Japanese garden & parking',
 '城市住房信托':'City housing trust','家庭 / 学校 / 社区':'Family / School / Community','待招聘':'Vacant','非就业居民':'Not employed',
 '经营余额':'Business balance','未付工资':'Unpaid wages','经营者':'Owner','负责人':'Manager','工作单位':'Workplace','兴趣':'Interests',
 '同事':'Colleague','产权人':'Owner','住户':'Residents','已入住':'Occupied','名就业居民':'employed residents','户自有住房':'owner-occupied households',
 '个住宅片区':'residential districts','初始参考':'Initial reference','累计工时':'Cumulative work hours','今日':'Today',
 '电梯':'Elevator','览景':' view','车位':'parking spaces','泊位':'berths','名居民':'residents',' 人':' people',' 户':' households',' 单':' orders',
 '健康':'Health','幸福':'Happiness','饮水':'Hydration','营养':'Nutrition','精力':'Energy','现金':'Cash','银行存款':'Bank balance','资产':'Assets','贷款':'Loans',
 '关闭':'Close','搜索':'Search','姓名':'Name','年龄':'Age','职业':'Occupation','位置':'Location','选择居民':'Select resident','选择职业':'Filter occupation',
 '全部':'All','地图':'Map','缩放':'Zoom','图例':'Legend','当前位置':'Your location','主中心':'Main center','副中心':'Secondary center',
 '地铁':'Metro','住宅':'Housing','医院':'Hospital','学校':'School','警察局':'Police station','商业':'Commerce','公园':'Park','滨海':'Waterfront',
 '商场':'Mall','屋顶':'Rooftop','观景台':'Observation deck','奢侈品':'Luxury','科技':'Technology','餐饮':'Dining','停车':'Parking',
};
const phrases=Object.keys(dictionary).sort((a,b)=>b.length-a.length);
const pattern=new RegExp(phrases.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
export function translate(text:string,locale:Language){return locale==='zh'?text:text.replace(pattern,s=>dictionary[s]);}
function localize(node:ReactNode,locale:Language):ReactNode{
 if(typeof node==='string')return translate(node,locale);
 if(Array.isArray(node))return Children.map(node,n=>localize(n,locale));
 if(!isValidElement(node))return node;
 const el=node as ReactElement<Record<string,unknown>>;
 const props:Record<string,unknown>={};
 for(const key of ['title','aria-label','placeholder','alt'])if(typeof el.props[key]==='string')props[key]=translate(el.props[key] as string,locale);
 if(el.props.children!==undefined)props.children=localize(el.props.children as ReactNode,locale);
 return cloneElement(el,props);
}
export function Localized({children}:{children:ReactNode}){
 const locale=useSyncExternalStore(subscribe,()=>language,()=>'en' as Language);
 return localize(children,locale);
}
export function useLanguage(){return useSyncExternalStore(subscribe,()=>language,()=>'en' as Language);}
export function LanguageSwitch(){
 const locale=useSyncExternalStore(subscribe,()=>language,()=>'en' as Language);
 useEffect(()=>{try{const q=new URLSearchParams(location.search).get('lang');const saved=q||localStorage.getItem('ampliworld-language');if(saved==='zh'||saved==='en')change(saved);}catch{}},[]);
 return <span style={{display:'inline-flex',gap:4}} aria-label="Interface language"><Button aria-pressed={locale==='en'} onClick={()=>change('en')}>English</Button><Button aria-pressed={locale==='zh'} onClick={()=>change('zh')}>中文</Button></span>;
}
