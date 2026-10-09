import type { CategoryId } from "../types";
const CATEGORIES: [CategoryId,string][] = [['all','Tümü'],['market','Market'],['transit','Ulaşım'],['events','Etkinlik'],['outages','Kesintiler'],['fishing','Balıkçılık'],['food','Yemek'],['pharmacy','Eczane'],['cafe','Kafe'],['bakery','Fırın'],['atm','ATM'],['park','Park'],['hospital','Sağlık'],['fuel','Akaryakıt'],['parking','Otopark'],['greengrocer','Manav'],['shopping','Alışveriş']];
export function CategoryRail({value,onChange}: {value:CategoryId;onChange:(c:CategoryId)=>void;variant?:string}) {
 return <div className="category-rail" aria-label="Yer kategorileri">{CATEGORIES.map(([id,label])=><button key={id} aria-pressed={value===id||(id==='pharmacy'&&value==='duty')} onClick={()=>onChange(id)}>{label}</button>)}</div>;
}
