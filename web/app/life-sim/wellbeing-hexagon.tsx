import type {Resident} from './engine';
import {residentWellbeingScores,type WellbeingScores} from './wellbeing';

const bound=(value:number)=>Math.max(0,Math.min(100,value));
const point=(index:number,radius:number)=>{
  const angle=-Math.PI/2+index*Math.PI/3;
  return [160+Math.cos(angle)*radius,155+Math.sin(angle)*radius] as const;
};
const corners=(radius:number)=>Array.from({length:6},(_,index)=>point(index,radius).join(',')).join(' ');

/** Six distinct, inspectable dimensions. Every spoke points outward for a better condition. */
export function WellbeingHexagon({resident,scores:inputScores}:{resident?:Resident;scores?:WellbeingScores}){
  const scores=inputScores||(resident?residentWellbeingScores(resident):undefined);
  if(!scores)return null;
  const axes=[
    {label:'幸福',value:scores.happiness},
    {label:'开心',value:scores.mood},
    {label:'压力管理',value:scores.stressManagement},
    {label:'心理健康',value:scores.mentalHealth},
    {label:'身体健康',value:scores.physicalHealth},
    {label:'经济安全',value:scores.financialSecurity},
  ];
  const data=axes.map((axis,index)=>point(index,92*bound(axis.value)/100).join(',')).join(' ');
  return <figure className="wellbeing-hexagon">
    <svg viewBox="0 0 320 310" aria-label={axes.map(axis=>`${axis.label} ${Math.round(bound(axis.value))}`).join('，')}>
      <title>居民六维生活状态；图上越靠外表示状态越好，压力轴显示的是压力管理能力</title>
      {[25,50,75,100].map(level=><polygon key={level} points={corners(92*level/100)} className="wellbeing-grid" />)}
      {axes.map((axis,index)=>{const [x,y]=point(index,92);return <line key={axis.label} x1="160" y1="155" x2={x} y2={y} className="wellbeing-axis" />;})}
      <polygon points={data} className="wellbeing-shape" />
      {axes.map((axis,index)=>{const [x,y]=point(index,92*bound(axis.value)/100);return <circle key={axis.label} cx={x} cy={y} r="3.5" className="wellbeing-point"><title>{`${axis.label}: ${Math.round(bound(axis.value))}${index===2?`；实际压力 ${Math.round(100-scores.stressManagement)}，越低越好`:''}`}</title></circle>;})}
      {axes.map((axis,index)=>{const [x,y]=point(index,122);return <text key={axis.label} x={x} y={y-5} textAnchor="middle" className="wellbeing-label"><tspan x={x}>{axis.label}</tspan><tspan x={x} dy="15" className="wellbeing-number">{Math.round(bound(axis.value))}</tspan></text>;})}
    </svg>
    <figcaption>{resident?'个人':'全城'}六维状态；压力轴＝100 − 实际压力（当前 {Math.round(100-scores.stressManagement)}）。心理健康为模拟分数，非医学诊断；经济安全按流动资金、收入和债务估算。</figcaption>
  </figure>;
}
