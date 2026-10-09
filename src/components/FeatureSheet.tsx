import {useEffect,useRef,type ReactNode} from 'react';
import {X} from 'lucide-react';
import {useBackLayer} from '../hooks/useBackLayer';
export function FeatureSheet({open,title,onClose,children}:{open:boolean;title:string;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useBackLayer(open,onClose);
 useEffect(()=>{const dialog=ref.current;if(!dialog)return;if(open&&!dialog.open)dialog.showModal();if(!open&&dialog.open)dialog.close();if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;if(dialog.open)dialog.close();};},[open]);
 return <dialog ref={ref} className="feature-dialog" aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><section><div className="feature-sheet-header"><h2>{title}</h2><button autoFocus onClick={onClose} aria-label={`${title} kapat`}><X size={20}/></button></div>{children}</section></dialog>;
}
