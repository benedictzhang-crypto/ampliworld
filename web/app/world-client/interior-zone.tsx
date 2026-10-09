'use client';
import {useFrame} from '@react-three/fiber';
import {useRef,useState,type ReactNode} from 'react';

/** Interior-only streaming. Exterior shells and all collision data stay resident. */
export function InteriorZone({min,max,children}:{min:readonly number[];max:readonly number[];children:ReactNode}) {
  const [active,setActive]=useState(false),live=useRef(false),last=useRef(-Infinity);
  useFrame(({camera,clock})=>{
    if(clock.elapsedTime-last.current<.25)return;last.current=clock.elapsedTime;
    const p=camera.position,margin=live.current?25:12;
    const next=p.x>=min[0]-margin&&p.x<=max[0]+margin&&p.y>=min[1]-4&&p.y<=max[1]+4&&p.z>=min[2]-margin&&p.z<=max[2]+margin;
    if(next!==live.current){live.current=next;setActive(next);}
  });
  return active?children:null;
}
