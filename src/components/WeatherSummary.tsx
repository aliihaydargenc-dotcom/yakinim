import type {Coordinates} from '../types';
import {useWeather} from '../services/weather';

const format=(value:number,unit:string)=>`${Math.round(value).toLocaleString('tr-TR')} ${unit}`;

export default function WeatherSummary({location}:{location:Coordinates}){
  const weather=useWeather(location);
  const data=weather.data;
  return <section className="weather-summary" aria-label="Konuma göre hava durumu">
    {weather.isPending&&!data?<small>Hava durumu yükleniyor…</small>:!data?<div><strong>Hava durumu alınamadı</strong><button onClick={()=>void weather.refetch()}>Yenile</button></div>:<>
      <div><strong>{format(data.temperature,'°C')}</strong><small>{data.condition}</small></div>
      <div><span>Rüzgâr {format(data.windSpeed*3.6,'km/sa')}</span><small>{data.precipitation!==null?`Yağış ${data.precipitation.toLocaleString('tr-TR',{maximumFractionDigits:1})} mm`:''}</small></div>
      <small className="weather-attribution"><a href="https://api.met.no/doc/License" target="_blank" rel="noreferrer">MET Norway</a></small>
    </>}
  </section>;
}
