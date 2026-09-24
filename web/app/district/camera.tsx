'use client';

import {useEffect,useRef} from 'react';
import {useThree} from '@react-three/fiber';
import {Vector3} from 'three';
import type {OrbitControls as OrbitControlsImpl} from 'three-stdlib';

type SavedCamera={position:Vector3;target:Vector3};

/** The only active camera modes: street, district and metropolitan overview. */
export function SetupCamera({walking,wide,controls}:{
  walking:boolean;
  wide:boolean;
  controls:React.RefObject<OrbitControlsImpl|null>;
}){
  const {camera,invalidate}=useThree();
  const savedWalkCamera=useRef<SavedCamera|null>(null);
  const lastWalking=useRef(true);
  useEffect(()=>{
    camera.near=walking?0.1:wide?3500:8;
    camera.far=wide?100000:18000;
    camera.updateProjectionMatrix();
    if(!walking&&lastWalking.current&&controls.current){
      savedWalkCamera.current={position:camera.position.clone(),target:controls.current.target.clone()};
    }
    lastWalking.current=walking;
    if(walking&&savedWalkCamera.current){
      camera.position.copy(savedWalkCamera.current.position);
      controls.current?.target.copy(savedWalkCamera.current.target);
    }else if(walking){
      camera.position.set(0,4,-59);
      controls.current?.target.set(0,1.5,-68);
    }else if(wide){
      camera.position.set(17000,23000,26000);
      controls.current?.target.set(0,0,0);
    }else{
      camera.position.set(430,660,740);
      controls.current?.target.set(0,190,-500);
    }
    controls.current?.update();
    invalidate();
  },[walking,wide,controls,camera,invalidate]);
  return null;
}
