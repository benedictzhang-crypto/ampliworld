'use client';
import {signalAt} from '../life-sim/traffic';
import {useEffect,useState} from 'react';
export function CoreSignals(){
 const [second,setSecond]=useState(0);
 useEffect(()=>{setSecond(Date.now()/1000);const timer=setInterval(()=>{if(!document.hidden)setSecond(Date.now()/1000);},250);return()=>clearInterval(timer);},[]);
 const s=signalAt(second);
 return <group>{[[-12,17],[12,-17],[-17,-12],[17,12]].map(([x,z],i)=><group key={i} position={[x,0,z]} rotation={[0,i<2?0:Math.PI/2,0]}><mesh position={[0,2.2,0]}><cylinderGeometry args={[.08,.1,4.4,8]}/><meshStandardMaterial color="#35434c"/></mesh><mesh position={[0,4,0]}><boxGeometry args={[.48,1.4,.28]}/><meshStandardMaterial color="#16212b"/></mesh>{['red','amber','green'].map((color,j)=>{const active=(i<2?s.northSouth:s.eastWest)===color;return <mesh key={color} position={[0,4.45-j*.42,.16]}><sphereGeometry args={[.15,10,8]}/><meshStandardMaterial color={active?{red:'#ff493e',amber:'#ffd15c',green:'#6ae7a1'}[color]:'#243038'} emissive={active?{red:'#ff493e',amber:'#ffd15c',green:'#6ae7a1'}[color]:'#000'} emissiveIntensity={active?2:0}/></mesh>})}<mesh position={[0,2.6,.17]}><boxGeometry args={[.3,.3,.1]}/><meshStandardMaterial color={s.pedestrian?'#6ae7a1':'#ff493e'}/></mesh></group>)}{Array.from({length:12},(_,i)=><mesh key={i} position={[-9.5+i*1.7,.052,0]}><boxGeometry args={[.9,.025,3.6]}/><meshStandardMaterial color="#e5e6d9"/></mesh>)}</group>;
}
