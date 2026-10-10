import {useQuery} from '@tanstack/react-query';
import {RefreshCw,Navigation} from 'lucide-react';
import type {Place} from '../types';

type Bus={id:string;code:string;name:string;direction:number;minutes:number;stops:number|null};
type Arrivals={fresh:boolean;sourceAt:string|null;buses:Bus[]};
const origin='https://www.google.com/maps/dir/?api=1&destination=';

export function TransitArrivals({stop}:{stop:Place}){
 const id=stop.id.startsWith('transit:')?stop.id.slice(8):'';
 const valid=/^\d{1,8}$/.test(id);
 const params=new URLSearchParams({action:'arrivals',stop:id,lat:String(stop.lat),lng:String(stop.lng)});
 const arrivals=useQuery({
   queryKey:['map-arrivals',id,stop.lat,stop.lng],
   queryFn:async({signal}):Promise<Arrivals>=>{
     const response=await fetch('/api/transit?'+params.toString(),{signal});
     if(!response.ok)throw new Error('arrival_unavailable');
     return response.json() as Promise<Arrivals>;
   },
   enabled:valid,staleTime:15000,refetchInterval:20000,retry:1
 });
 const buses=arrivals.data?.fresh?arrivals.data.buses.slice(0,8):[];
 const routes=(stop.address.split('·')[1]||'').split(',').map(v=>v.trim()).filter(Boolean);
 const time=arrivals.data?.sourceAt?new Date(arrivals.data.sourceAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'}):'';
 return <section className="map-transit-arrivals" aria-label="Yaklaşan otobüsler">
   <div className="map-arrivals-heading"><strong>Yaklaşan otobüsler</strong><button type="button" aria-label="Otobüsleri yenile" disabled={!valid||arrivals.isFetching} onClick={()=>void arrivals.refetch()}><RefreshCw size={18}/></button></div>
   {!valid?<p>Durak numarası alınamadı.</p>:arrivals.isPending?<p role="status">Otobüsler yükleniyor…</p>:arrivals.isError?<p role="alert">Geliş bilgisi alınamadı. Yenile düğmesini deneyebilirsin.</p>:!arrivals.data?.fresh?<p role="status">Kaynak güncel geliş bilgisi bildirmiyor.</p>:buses.length===0?<p>Şu anda yaklaşan otobüs bildirilmedi.</p>:<div className="map-bus-list">{buses.map(bus=><div className="map-bus-item" key={bus.id}><strong>{bus.code}</strong><span>{bus.name||'Otobüs'}{bus.stops!==null&&<small>{bus.stops} durak uzakta</small>}</span><b>{bus.minutes===0?'Yaklaşıyor':bus.minutes+' dk'}</b></div>)}</div>}
   {time&&<small className="map-arrivals-time">Kaynak {time}</small>}
   <div className="map-transit-footer">{routes.length>0&&<span className="map-transit-routes">Hatlar: {routes.slice(0,10).join(' · ')}{routes.length>10?'…':''}</span>}<a href={origin+stop.lat+','+stop.lng} target="_blank" rel="noreferrer"><Navigation size={15}/> Yol tarifi</a></div>
 </section>;
}
