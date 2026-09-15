'use client';
import {signalAt} from '../life-sim/traffic';
import {useEffect,useState} from 'react';
export function CoreSignals(){
 const [second,setSecond]=useState(0);
 useEffect(()=>{setSecond(Date.now()/1000);const timer=setInterval(()=>{if(!document.hidden)setSecond(Date.now()/1000);},250);return()=>clearInterval(timer);},[]);
 const s=signalAt(second);
 // Paint belongs to the street asset. Each head faces its approaching lane.
 return <group>{[0,Math.PI,Math.PI/2,-Math.PI/2].map((angle,i)=><group key={i} rotation={[0,angle,0]}>
 <mesh position={[9.8,3.5,16.8]}><cylinderGeometry args={[.15,.2,7,12]}/><meshStandardMaterial color="#35434c" metalness={.6}/></mesh>
 <mesh position={[6.7,6.8,16.8]}><boxGeometry args={[6.4,.2,.24]}/><meshStandardMaterial color="#35434c"/></mesh>
 <mesh position={[3.6,6.05,16.8]}><boxGeometry args={[.9,1.95,.42]}/><meshStandardMaterial color="#16212b"/></mesh>
 {(['red','amber','green'] as const).map((color,j)=>{const active=(i<2?s.northSouth:s.eastWest)===color;return <group key={color} position={[3.6,6.64-j*.59,17.06]}><mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.24,.24,.18,16]}/><meshStandardMaterial color={active?{red:'#ff493e',amber:'#ffd15c',green:'#6ae7a1'}[color]:'#243038'} emissive={active?{red:'#ff493e',amber:'#ffd15c',green:'#6ae7a1'}[color]:'#000'} emissiveIntensity={active?2:0}/></mesh><mesh position={[0,.25,.1]}><boxGeometry args={[.58,.07,.5]}/><meshStandardMaterial color="#16212b"/></mesh></group>})}
 <mesh position={[9.8,2.6,17.03]}><boxGeometry args={[.4,.6,.16]}/><meshStandardMaterial color={s.pedestrian?'#6ae7a1':'#ff493e'}/></mesh>
 </group>)}</group>;
}
