import {useQuery} from '@tanstack/react-query';
import type {Coordinates} from '../types';
type Air={pm2_5:number|null;pm10:number|null;european_aqi:number|null;time:number;fetchedAt:string};
const value=(n:number|null)=>n==null?'Veri yok':n.toLocaleString('tr-TR',{maximumFractionDigits:1});
const quality=(n:number|null)=>n==null?'Veri yok':n<=20?'İyi':n<=40?'Makul':n<=60?'Orta':n<=80?'Kötü':n<=100?'Çok kötü':'Son derece kötü';
export default function AirQuality({location}:{location:Coordinates}){
 const lat=Math.round(location.lat*100)/100,lng=Math.round(location.lng*100)/100;
 const query=useQuery({queryKey:['air',lat,lng],queryFn:async({signal}):Promise<Air>=>{const r=await fetch(`/api/nearby?layer=air&lat=${lat}&lng=${lng}`,{signal});if(!r.ok)throw Error('air');return r.json();},staleTime:900000,refetchInterval:900000,retry:0});
 return <details className="air-quality"><summary>Hava kalitesi{query.data&&` · ${quality(query.data.european_aqi)} (model)`}</summary>{query.isPending?<small>Yükleniyor…</small>:query.isError&&!query.data?<><small>Veri alınamadı.</small><button onClick={()=>void query.refetch()}>Yenile</button></>:query.data&&<><div className="detail-metrics"><div><small>PM2.5 · µg/m³</small><strong>{value(query.data.pm2_5)}</strong></div><div><small>PM10 · µg/m³</small><strong>{value(query.data.pm10)}</strong></div><div><small>Avrupa AQI</small><strong>{value(query.data.european_aqi)}</strong></div></div><small>{query.isError?'Yenilenemedi · ':''}Model tahmini · {new Date(query.data.time*1000).toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'})} · <a href="https://open-meteo.com/en/docs/air-quality-api" target="_blank" rel="noreferrer">CAMS / Open-Meteo</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></small></>}</details>;
}
