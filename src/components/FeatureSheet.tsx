import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
import {useBackLayer} from '../hooks/useBackLayer';
export function FeatureSheet({open,title,onClose,children,closeLabel}:{open:boolean;title:string;onClose:()=>void;children:ReactNode;closeLabel?:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useBackLayer(open,onClose);
 useEffect(()=>{
  const dialog=ref.current;if(!dialog)return;
  const previousFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  dialog.inert=!open;
  if(open&&!dialog.open)dialog.showModal();
  if(!open&&dialog.open)dialog.close();
  if(!open)return;
  // Safari can retain the previous dialog control on reopening. Set the
  // initial focus explicitly, then return it to the trigger on close.
  dialog.querySelector<HTMLElement>('[autofocus]')?.focus({preventScroll:true});
  const previous=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{
   document.body.style.overflow=previous;if(dialog.open)dialog.close();
   if(previousFocus?.isConnected&&!dialog.contains(previousFocus))previousFocus.focus({preventScroll:true});
  };
 },[open]);
 return <dialog ref={ref} className="feature-dialog" aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><section><div className="feature-sheet-header"><h2>{title}</h2><button autoFocus onClick={onClose} aria-label={closeLabel||`${title} kapat`}><X size={20}/></button></div>{children}</section></dialog>;
}
