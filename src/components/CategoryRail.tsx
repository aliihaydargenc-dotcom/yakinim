import {useEffect,useRef,useState} from 'react';
import {Grid2X2} from 'lucide-react';
import type { CategoryId } from '../types';
import {FeatureSheet} from './FeatureSheet';
import discoveryCategories from '../../lib/discovery-categories.json';
const CATEGORIES:[CategoryId,string][]=[['all','Tümü'],['market','Market'],['fishing','Balıkçılık'],['transit','Ulaşım'],['events','Etkinlik'],['outages','Kesintiler'],['food','Yemek'],['pharmacy','Eczane'],['cafe','Kafe'],['bakery','Fırın'],['atm','ATM'],['park','Park'],['hospital','Sağlık'],['fuel','Akaryakıt'],['parking','Otopark'],['greengrocer','Manav'],['shopping','Alışveriş'],...discoveryCategories.map(c=>[c.id as CategoryId,c.label] as [CategoryId,string])];
export function CategoryRail({value,onChange,variant}:{value:CategoryId;onChange:(c:CategoryId)=>void;variant?:string}){
 const [open,setOpen]=useState(false);const selected=(id:CategoryId)=>value===id||id==='pharmacy'&&value==='duty';
 const rail=useRef<HTMLDivElement>(null);
 useEffect(()=>{const node=rail.current,button=node?.querySelector<HTMLElement>('[aria-pressed=true]');if(!node||!button)return;const left=button.getBoundingClientRect().left-node.getBoundingClientRect().left+node.scrollLeft;if(left<node.scrollLeft||left+button.offsetWidth>node.scrollLeft+node.clientWidth)node.scrollTo({left:left-(node.clientWidth-button.offsetWidth)/2,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});},[value,variant]);
 return <><div className="category-navigation"><div ref={rail} className="category-rail" aria-label="Yer kategorileri">{CATEGORIES.map(([id,label])=><button key={id} aria-pressed={selected(id)} onClick={()=>onChange(id)}>{label}</button>)}</div><button className="category-menu-button" aria-label="Tüm kategorileri aç" onClick={()=>setOpen(true)}><Grid2X2 size={19}/></button></div><FeatureSheet open={open} title="Tüm kategoriler" onClose={()=>setOpen(false)}><div className="category-grid">{CATEGORIES.map(([id,label])=><button key={id} aria-pressed={selected(id)} onClick={()=>{setOpen(false);onChange(id);}}>{label}</button>)}</div></FeatureSheet></>;
}
