import {useRef} from 'react';
import {useQuery} from '@tanstack/react-query';
import type {Coordinates} from '../types';
export type ForecastHour={time:number;wind:number|null;gust:number|null;rain:number|null;wave:number|null;period:number|null;temperature:number|null;windDirection:number|null;waveDirection:number|null;pressure:number|null;airTemperature:number|null;feelsLike:number|null;visibility:number|null;cloud:number|null;precipitation:number|null;windWave:number|null;windWavePeriod:number|null;swell:number|null;swellPeriod:number|null;current:number|null;currentDirection:number|null;seaLevel:number|null};
export type Forecast={hourly:ForecastHour[];daily:{time:number;sunrise:number|null;sunset:number|null;moonPhase:number|null;uv:number|null;sunshine:number|null}[];partial:boolean;sourceAvailability?:{weather:boolean;marine:boolean};coastal?:boolean|null;modelDistanceM?:number|null;modelLocations?:{marine:Coordinates|null};fetchedAt:string;expiresAt:string};
export const dayKey=(t:number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t*1000));
export const clock=(t:number|null|undefined)=>t==null?'Veri yok':new Date(t*1000).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Istanbul'});
export const measure=(n:number|null|undefined,unit:string,precision=1)=>n==null||!Number.isFinite(n)?'Veri yok':`${n.toLocaleString('tr-TR',{maximumFractionDigits:precision})} ${unit}`;
export function useForecast(location:Coordinates|null,mode:'weather'|'fishing'){
 const force=useRef(false);
 const result=useQuery({queryKey:[mode,location?.lat,location?.lng],queryFn:async({signal}):Promise<Forecast>=>{const refresh=force.current;force.current=false;const r=await fetch(`/api/fishing?${new URLSearchParams({lat:String(location!.lat),lng:String(location!.lng),mode,refresh:refresh?'1':'0'})}`,{signal});if(!r.ok)throw Error('forecast');return r.json();},enabled:!!location,staleTime:q=>q.state.data?.partial?60000:900000,refetchInterval:q=>q.state.data?.partial?60000:900000,retry:1});
 return {...result,refresh:()=>{force.current=true;void result.refetch();}};
}
