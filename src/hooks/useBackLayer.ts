import {useEffect,useRef} from 'react';

type Layer = {token:string; active:boolean; close:()=>void};
const layers:Layer[]=[];
const waiting:Array<()=>void>=[];
let installed=false;
let goingBack=false;
let nextLayerId=0;
function drain(){
 const top=layers.at(-1);
 if(!goingBack&&top&&!top.active&&history.state?.yakinimLayer===top.token){
  goingBack=true;history.back();
 }
}
function install(){
 if(installed)return;
 installed=true;
 window.addEventListener('popstate',event=>{
  goingBack=false;
  const index=layers.findIndex(layer=>layer.token===event.state?.yakinimLayer);
  const removed=layers.splice(index+1);
  for(const layer of removed.reverse())if(layer.active){layer.active=false;layer.close();}
  drain();
  if(!goingBack)waiting.splice(0).forEach(push=>push());
 });
}
// Closing a detail consumes its history entry; nested and simultaneous closes
// are unwound in order, including when React StrictMode restarts an effect.
export function useBackLayer(open:boolean,onClose:()=>void){
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  if(!open)return;
  // History identifiers are not credentials. HTTP device-test origins do not
  // expose randomUUID, so retain uniqueness without requiring a secure context.
  const token=globalThis.crypto?.randomUUID?.() ?? `layer-${Date.now().toString(36)}-${++nextLayerId}`;
  const layer:Layer={token,active:true,close:()=>close.current()};
  let attached=false;
  const push=()=>{
   if(!layer.active)return;
   if(goingBack){waiting.push(push);return;}
   install();layers.push(layer);attached=true;
   history.pushState({...history.state,yakinimLayer:layer.token},'');
  };
  // Skip the discarded StrictMode setup before touching browser history.
  queueMicrotask(push);
  const escape=(event:KeyboardEvent)=>{
   if(event.key==='Escape'&&history.state?.yakinimLayer===layer.token&&!goingBack){goingBack=true;history.back();}
  };
  window.addEventListener('keydown',escape);
  return ()=>{
   layer.active=false;window.removeEventListener('keydown',escape);
   if(attached)drain();
  };
 },[open]);
}
