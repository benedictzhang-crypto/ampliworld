/** Seed identities materialized into the same persisted Resident objects used by the simulation. */
export const CENSUS_SIZE=30000;
export const CENSUS_TARGET=30000;
export const CENSUS_VERSION='ampliworld-residents-30000-1';
export const SOCIAL_JOBS=['酒店前台','销售顾问','客户经理','行政助理','软件工程师','产品经理','设计师','会计','审计员','律师','银行柜员','研究员','医生','护士','药剂师','康复师','教师','幼教老师','图书管理员','实验室技术员','厨师','服务员','咖啡师','烘焙师','超市理货员','收银员','店长','理发师','健身教练','保洁员','园林养护员','电工','水管工','维修技师','公交司机','出租车司机','网约车司机','货车司机','配送员','仓库管理员','机场地勤','机场安检员','地铁安检员','地铁运营员','物业管家','保安','警员','消防员','社工','照护员','摄影师','音乐教师','创业者','自由职业者','全职家庭照护者','求职者'];
const surnames=['林','陈','周','王','张','李','赵','吴','郑','许','黄','徐','刘','杨','何','宋'];
const names=['晨','宁','安','远','悦','然','清','宇','禾','辰','语','新','明','思','文','嘉'];
export function citizen(index:number){
  if(!Number.isInteger(index)||index<0||index>=CENSUS_SIZE)throw new Error('Identity outside registry');
  const family=Math.floor(index/3),slot=index%3,kind=family%4;
  const ages=kind===0?[32+family%10,31+family%10,3+family%12]:kind===1?[42+family%10,40+family%10,18+family%6]:kind===2?[68+family%15,65+family%15,36+family%15]:[25+family%20,24+family%20,23+family%20];
  const age=ages[slot],child=age<18,occupation=child?(age<6?'学龄前儿童':'在校学生'):age>=65?'退休居民':kind===1&&slot===2?'大学生':SOCIAL_JOBS[(family*7+slot*13)%SOCIAL_JOBS.length];
  const id=`R${String(index+1).padStart(3,'0')}`,familyId=`H${String(family+1).padStart(5,'0')}`;
  const relations=[0,1,2].filter(s=>s!==slot).map(s=>({index:family*3+s,type:kind===0?(slot===2?'监护人':s===2?'子女':'伴侣'):kind===1?(slot===2?'父母':s===2?'成年子女':'伴侣'):kind===2?(slot===2?'父母':s===2?'成年子女':'伴侣'):'室友'}));
  const adjacent=(family%2===0?family+1:family-1)*3+slot;
  relations.push({index:adjacent,type:'邻居'});
  const employed=!child&&age<65&&!['大学生','全职家庭照护者','求职者'].includes(occupation),peerFamily=family%1200<600?family+600:family-600;
  if(employed&&peerFamily<CENSUS_SIZE/3)relations.push({index:peerFamily*3+slot,type:'同事'});
  return {index,id,name:surnames[family%surnames.length]+names[(index*7)%names.length]+names[Math.floor(index/16)%names.length],age,occupation,familyId,home:`CBD 家庭单元 ${familyId}`,homeStatus:'逻辑住址 · 待绑定具体建筑房号',relations,guardianIds:child?[family*3,family*3+1].map(i=>`R${String(i+1).padStart(3,'0')}`):[],caregiverIds:(child?[family*3]:kind===2&&slot<2&&age>=80?[family*3+2]:[]).map(i=>`R${String(i+1).padStart(3,'0')}`),workplace:employed?`${occupation}工作组 ${family%3+1}`:null,personality:{openness:(index*37+19)%101,conscientiousness:(index*53+71)%101,extraversion:(index*31+13)%101,agreeableness:(index*43+61)%101,emotionalStability:(index*17+47)%101},preference:['园艺','音乐','阅读','运动','烹饪','旅行','摄影','科技'][index%8]};
}
