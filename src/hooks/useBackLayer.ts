import {useEffect,useRef} from 'react';
// Each detail consumes one browser Back action; nested details keep the parent.
export function useBackLayer(open:boolean,onClose:()=>void){
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{if(!open)return;const previous=history.state;const token=crypto.randomUUID();history.pushState({...previous,yakinimLayer:token},'');
 const pop=(event:PopStateEvent)=>{if(event.state?.yakinimLayer===token)return;close.current();};
 window.addEventListener('popstate',pop);const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'&&history.state?.yakinimLayer===token)history.back();};window.addEventListener('keydown',escape);
 return ()=>{window.removeEventListener('popstate',pop);window.removeEventListener('keydown',escape);if(history.state?.yakinimLayer===token)history.replaceState(previous,'');};
 },[open]);
}
