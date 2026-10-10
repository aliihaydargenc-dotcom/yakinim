import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {RefreshCw} from 'lucide-react';
import type {Coordinates} from '../types';
import {FeatureSheet} from './FeatureSheet';
import categories from '../../lib/price-categories.json';
async function get<T>(url:string,signal?:AbortSignal):Promise<T>{const r=await fetch(url,{signal});if(!r.ok)throw new Error('source');return r.json();}
const routeLink=(p:Coordinates)=>`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
function Retry({onClick}:{onClick:()=>void}){return <div role="alert"><p>Kaynak şu an alınamıyor.</p><button onClick={onClick}>Tekrar dene</button></div>;}
type PriceOffer={id:string;name:string;market:string;lat:number;lng:number;distanceM:number;price:number;unitPrice:string;updatedAt:string;promotion:string|null};
type PriceProduct={id:string;title:string;quantity:string;imageUrl?:string;offers:PriceOffer[]};
const marketNames:Record<string,string>={a101:'A101',bim:'BİM',sok:'ŞOK',migros:'Migros',carrefour:'CarrefourSA',hakmar:'Hakmar',tarimkredi:'Tarım Kredi',tarim_kredi:'Tarım Kredi'};
const money=(value:number)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(value);
function PriceCard({product}:{product:PriceProduct}){
 const [expanded,setExpanded]=useState(false);const sorted=[...product.offers].sort((a,b)=>a.price-b.price);const summarized=[...new Map(sorted.map(o=>[o.market.toLocaleLowerCase('tr'),sorted.find(v=>v.market.toLocaleLowerCase('tr')===o.market.toLocaleLowerCase('tr'))!])).values()].slice(0,3);const chainPrices=[...new Set(product.offers.map(o=>o.market.toLocaleLowerCase('tr')))].map(m=>Math.min(...product.offers.filter(o=>o.market.toLocaleLowerCase('tr')===m).map(o=>o.price)));const low=Math.min(...chainPrices),high=Math.max(...chainPrices);const offers=expanded?sorted:summarized;
 return <article className="product-price-card"><div className="product-price-heading">{product.imageUrl&&<img src={product.imageUrl} alt="" loading="lazy" onError={e=>{e.currentTarget.hidden=true;}}/>}<div><h3>{product.title}</h3><small>{product.quantity}</small></div></div>{offers.map((offer,i)=><div className="product-offer" key={offer.id}><div><strong>{marketNames[offer.market]||offer.market}</strong><span>{offer.name}</span><small>Merkeze yaklaşık {offer.distanceM} m · {i===0&&chainPrices.length>1?'En düşük fiyat':''}</small><small>Güncelleme: {new Date(offer.updatedAt).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})}</small>{offer.promotion&&<small>{offer.promotion}</small>}<a href={routeLink(offer)} target="_blank" rel="noreferrer">Yol tarifi</a></div><div className="offer-price"><strong>{money(offer.price)}</strong><small>{offer.unitPrice}</small></div></div>)}{chainPrices.length>1&&<p className="price-difference">Marketler arası fark: {money(high-low)} · %{(low>0?(high-low)/low*100:0).toLocaleString('tr-TR',{maximumFractionDigits:1})}</p>}{product.offers.length>summarized.length&&<button className="plain-button" onClick={()=>setExpanded(!expanded)}>{expanded?'Daha az göster':`${product.offers.length} fiyat kaydının tamamı`}</button>}</article>;
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
 const [view,setView]=useState<'all'|'shared'>('all');
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
 const shared=all.filter(p=>new Set(p.offers.map(o=>o.market.toLocaleLowerCase('tr'))).size>=2);
 const displayed=(view==='shared'?shared:all).slice(0,visibleCount);
 const chooseRegion=(id:string)=>{setRegion(id);setPage(0);setVisibleCount(24);};
 const chooseCategory=(id:string)=>{setCategory(id);setPage(0);setVisibleCount(24);setCategoryOpen(false);};
 return <section className="pilot-panel prices-panel">
  <div className="pilot-title"><h2>Market fiyat karşılaştırması</h2><button aria-label="Fiyatları yenile" onClick={()=>void prices.refetch()} disabled={prices.isFetching}><RefreshCw size={18}/></button></div>
  <label className="price-region-label">İl seç
   <select aria-label="Karşılaştırma ili" value={choice.id} onChange={e=>chooseRegion(e.target.value)}>{REGIONS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select>
  </label>
  <small className="price-coverage">{choice.name} merkezinin 5 km çevresindeki kaynak şubeleri · Telefon konumu kullanılmaz.</small>
  <div className="pharmacy-filter" aria-label="Ürün görünümü"><button aria-pressed={view==='all'} onClick={()=>{setView('all');setVisibleCount(24);}}>Bulunan ürünler</button><button aria-pressed={view==='shared'} onClick={()=>{setView('shared');setVisibleCount(24);}}>Ortak ürünler</button></div>
  <div className="pharmacy-filter feature-categories" aria-label="Ürün kategorileri">{categories.filter(c=>['all','meat-fish','dairy',category].includes(c.id)).map(c=><button key={c.id} aria-label={c.label} aria-pressed={category===c.id} onClick={()=>chooseCategory(c.id)}>{c.id==='dairy'?'Süt ürünleri':c.label}</button>)}<button aria-label="Diğer kategoriler" onClick={()=>setCategoryOpen(true)}>•••</button></div>
  {search.length===1?<p>En az iki harf yaz.</p>:<>
   {prices.isPending&&<p role="status">Fiyatlar yükleniyor…</p>}
   {prices.isError&&<Retry onClick={()=>void prices.refetch()}/>}
   {prices.data&&!prices.isError&&<>
    {prices.data.partial&&<small>Bazı ürün sorguları alınamadı; sonuçlar eksik olabilir.</small>}
    {!prices.data.depotCount&&<p>Seçili il merkezinin çevresinde kaynakta kayıtlı şube bulunamadı.</p>}
    {!!prices.data.depotCount&&!all.length&&<p>Bu sorgu için kayıt bulunamadı. Farklı kategori veya ürün deneyebilirsin.</p>}
    {view==='shared'&&!shared.length&&all.length>0&&<p>Bu sonuçlarda birden fazla zincirde yer alan aynı ürün bulunamadı. Bulunan ürünlere geçebilirsin.</p>}
    {!!displayed.length&&<small>{view==='shared'?shared.length:all.length} ürün sonucu · {prices.data.depotCount} kaynak şubesi</small>}
    {displayed.map(product=><PriceCard key={product.id} product={product}/>)}
    {(view==='shared'?shared:all).length>visibleCount&&<button className="outline-button" onClick={()=>setVisibleCount(n=>n+24)}>Daha fazla ürün göster</button>}
    {search.length>=2&&(page>0||prices.data.hasMore)&&<div className="price-pagination"><button disabled={page===0} onClick={()=>{setPage(p=>p-1);setVisibleCount(24);}}>Önceki</button><span>{page+1}</span><button disabled={!prices.data.hasMore} onClick={()=>{setPage(p=>p+1);setVisibleCount(24);}}>Sonraki</button></div>}
    <details className="source-details"><summary>Veri kapsamı</summary><p>Son 48 saatte bildirilmiş, seçilen il merkezinden en fazla 5 km uzaklıktaki şube fiyatları kullanılır. Boş aramada temel ürün sorgularından dönen kayıtlar gösterilir; tüm şehir veya Türkiye'deki bütün ürünleri kapsamaz. Farklı ambalajlar ayrı ürün sayılır.</p><a href="https://www.marketfiyati.org.tr/" target="_blank" rel="noreferrer">TÜBİTAK Market Fiyatı</a></details>
   </>}
  </>}
  <FeatureSheet open={categoryOpen} title="Ürün kategorileri" onClose={()=>setCategoryOpen(false)}><div className="category-grid">{categories.map(c=><button key={c.id} aria-pressed={category===c.id} onClick={()=>chooseCategory(c.id)}>{c.label}</button>)}</div></FeatureSheet>
 </section>;
}
