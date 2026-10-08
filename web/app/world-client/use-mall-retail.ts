'use client';
import {useEffect,useRef,useState,useCallback} from 'react';
import {initialRetailState,parseRetailSave,RETAIL_STORAGE_KEY,transact,type RetailAction} from './mall-retail-state';
export function useMallRetail(){
  const [state,setState]=useState(initialRetailState),[ready,setReady]=useState(false),[notice,setNotice]=useState('');
  const current=useRef(state);
  useEffect(()=>{
    try{current.current=parseRetailSave(localStorage.getItem(RETAIL_STORAGE_KEY));setState(current.current);}catch{setNotice('Local storage unavailable. Progress lasts for this session only.');}
    setReady(true);
  },[]);
  const dispatch=useCallback((action:RetailAction)=>{
    if(!ready)return;
    const result=transact(current.current,action);current.current=result.state;setState(result.state);setNotice(result.message);
    try{localStorage.setItem(RETAIL_STORAGE_KEY,JSON.stringify(result.state));}catch{setNotice(result.message+' Storage unavailable; not saved after closing.');}
  },[ready]);
  return {state,ready,notice,dispatch};
}
