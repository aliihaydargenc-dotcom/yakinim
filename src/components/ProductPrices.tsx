import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {RefreshCw} from 'lucide-react';
import type {Coordinates} from '../types';
import {FeatureSheet} from './FeatureSheet';
import categories from '../../lib/price-categories.json';
async function get<T>(url:string,signal?:AbortSignal):Promise<T>{const r=await fetch(url,{signal});if(!r.ok)throw new Error('source');return r.json();}
const routeLink=(p:Coordinates)=>`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
function Retry({onClick}:{onClick:()=>void}){return <div role="alert"><p>Veri alınamadı</p><button onClick={onClick}>Tekrar dene</button></div>;}
type PriceOffer={id:string;name:string;market:string;lat:number;lng:number;distanceM:number;price:number;unitPrice:string;updatedAt:string;promotion:string|null};
type PriceProduct={id:string;title:string;quantity:string;imageUrl?:string;offers:PriceOffer[]};
const marketNames:Record<string,string>={a101:'A101',bim:'BİM',sok:'ŞOK',migros:'Migros',carrefour:'CarrefourSA',hakmar:'Hakmar',tarimkredi:'Tarım Kredi',tarim_kredi:'Tarım Kredi'};
const money=(value:number)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(value);
function PriceCard({product}:{product:PriceProduct}){
 const [expanded,setExpanded]=useState(false),[selected,setSelected]=useState<PriceOffer|null>(null);
 const sorted=[...product.offers].sort((a,b)=>a.price-b.price);
 const markets=[...new Set(sorted.map(o=>o.market.toLocaleLowerCase('tr')))];
 const summarized=markets.map(m=>sorted.find(o=>o.market.toLocaleLowerCase('tr')===m)!).slice(0,3);
 const offers=expanded?sorted:summarized;
 return <article className="product-price-card"><div className="product-price-heading">{product.imageUrl&&<img src={product.imageUrl} alt="" loading="lazy" onError={e=>{e.currentTarget.hidden=true;}}/>}<div><h3>{product.title}</h3><small>{product.quantity}</small></div></div><div className="product-offers">{offers.map(offer=><button className="product-offer" key={offer.id} onClick={()=>setSelected(offer)}><span>{marketNames[offer.market]||offer.market}</span><strong>{money(offer.price)}</strong></button>)}</div>{product.offers.length>summarized.length&&<button className="plain-button offer-expand" onClick={()=>setExpanded(!expanded)}>{expanded?'Kapat':`Tüm fiyatlar (${product.offers.length})`}</button>}<FeatureSheet open={!!selected} title={selected?marketNames[selected.market]||selected.market:'Fiyat'} onClose={()=>setSelected(null)}>{selected&&<div className="offer-detail"><strong>{money(selected.price)}</strong><p>{selected.name}</p>{selected.unitPrice&&<small>{selected.unitPrice}</small>}<time dateTime={selected.updatedAt}>{new Date(selected.updatedAt).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})}</time>{selected.promotion&&<small>{selected.promotion}</small>}<a className="solid-button" href={routeLink(selected)} target="_blank" rel="noreferrer">Yol tarifi</a></div>}</FeatureSheet></article>;
}
const REGIONS=[
 {id:'antalya',name:'Antalya',lat:36.8948,lng:30.7056},
 {id:'istanbul',name:'İstanbul',lat:41.0082,lng:28.9784},
 {id:'ankara',name:'Ankara',lat:39.9255,lng:32.8663},
 {id:'izmir',name:'İzmir',lat:38.4237,lng:27.1428},
 {id:'bursa',name:'Bursa',lat:40.1885,lng:29.0610},
 {id:'adana',name:'Adana',lat:37.0000,lng:35.3213},
 {id:'trabzon',name:'Trabzon',lat:41.0027,lng:39.7168},
] as const;
export function ProductPrices({input}:{location:Coordinates|null;input:string}){
 const [search,setSearch]=useState('');
 const [region,setRegion]=useState<string>('antalya');
 const [page,setPage]=useState(0),[category,setCategory]=useState('all'),[categoryOpen,setCategoryOpen]=useState(false);
 const [visibleCount,setVisibleCount]=useState(24);
 useEffect(()=>{const t=setTimeout(()=>{setSearch(input.trim());setPage(0);setVisibleCount(24);},450);return ()=>clearTimeout(t);},[input]);
 const choice=REGIONS.find(r=>r.id===region)||REGIONS[0];
 const args=new URLSearchParams({lat:String(choice.lat),lng:String(choice.lng),radius:'5',q:search,page:String(page),category,view:'all'});
 const prices=useQuery({
   queryKey:['prices-reference-region',choice.id,search,page,category],
   queryFn:({signal})=>get<{products:PriceProduct[];partial?:boolean;depotCount:number;total:number;hasMore:boolean;radius:number}>(`/api/prices?${args.toString()}`,signal),
   enabled:search.length===0||search.length>=2,staleTime:300000,retry:1
 });
 const all=prices.data?.products||[];
 const displayed=all.slice(0,visibleCount);
 const chooseRegion=(id:string)=>{setRegion(id);setPage(0);setVisibleCount(24);};
 const chooseCategory=(id:string)=>{setCategory(id);setPage(0);setVisibleCount(24);setCategoryOpen(false);};
 return <section className="pilot-panel prices-panel">
  <div className="pilot-title price-controls"><label className="price-region-label"><select aria-label="Karşılaştırma ili" value={choice.id} onChange={e=>chooseRegion(e.target.value)}>{REGIONS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label><button aria-label="Fiyatları yenile" onClick={()=>void prices.refetch()} disabled={prices.isFetching}><RefreshCw size={18}/></button></div>
  <button className="product-category-select" aria-label="Ürün kategorileri" onClick={()=>setCategoryOpen(true)}>{category==='all'?'Tüm ürünler':categories.find(c=>c.id===category)?.label}<span aria-hidden="true">⌄</span></button>
  {search.length===1?<p>En az iki harf yaz.</p>:<>
   {prices.isPending&&<p role="status">Fiyatlar yükleniyor…</p>}
   {prices.isError&&<Retry onClick={()=>void prices.refetch()}/>}
   {prices.data&&!prices.isError&&<>
    {!prices.data.depotCount&&<p role={prices.data.partial?'status':undefined}>{prices.data.partial?'Veri eksik':'Şube bulunamadı'}</p>}
    {!!prices.data.depotCount&&!all.length&&<p role={prices.data.partial?'status':undefined}>{prices.data.partial?'Veri eksik':'Ürün bulunamadı'}</p>}
    {!!displayed.length&&<small>{all.length} ürün</small>}
    {displayed.map(product=><PriceCard key={product.id} product={product}/>)}
    {all.length>visibleCount&&<button className="outline-button" onClick={()=>setVisibleCount(n=>n+24)}>Daha fazla ürün göster</button>}
    {search.length>=2&&(page>0||prices.data.hasMore)&&<div className="price-pagination"><button disabled={page===0} onClick={()=>{setPage(p=>p-1);setVisibleCount(24);}}>Önceki</button><span>{page+1}</span><button disabled={!prices.data.hasMore} onClick={()=>{setPage(p=>p+1);setVisibleCount(24);}}>Sonraki</button></div>}

   </>}
  </>}
  <FeatureSheet open={categoryOpen} title="Ürün kategorileri" onClose={()=>setCategoryOpen(false)}><div className="category-grid">{categories.map(c=><button key={c.id} aria-pressed={category===c.id} onClick={()=>chooseCategory(c.id)}>{c.label}</button>)}</div></FeatureSheet>
 </section>;
}
