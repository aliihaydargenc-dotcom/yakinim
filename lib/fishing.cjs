'use strict';
const {distance}=require('./transit.cjs');
const cache=new Map(),providers=new Map(),pending=new Map();
const weatherFields={wind:['wind_speed_10m','m/s'],gust:['wind_gusts_10m','m/s'],windDirection:['wind_direction_10m','°'],rain:['precipitation_probability','%'],pressure:['pressure_msl','hPa'],airTemperature:['temperature_2m','°C'],feelsLike:['apparent_temperature','°C'],visibility:['visibility','m'],cloud:['cloud_cover','%'],precipitation:['precipitation','mm']};
const marineFields={wave:['wave_height','m'],period:['wave_period','s'],waveDirection:['wave_direction','°'],temperature:['sea_surface_temperature','°C'],windWave:['wind_wave_height','m'],windWavePeriod:['wind_wave_period','s'],swell:['swell_wave_height','m'],swellPeriod:['swell_wave_period','s'],current:['ocean_current_velocity','m/s'],currentDirection:['ocean_current_direction','°'],seaLevel:['sea_level_height_msl','m']};
function bounded(map,key,value){if(map.size>=100&&!map.has(key))map.delete(map.keys().next().value);map.set(key,value);}
function rows(data,fields){const result=new Map();if(!Array.isArray(data?.hourly?.time))return result;data.hourly.time.forEach((t,i)=>{if(!Number.isFinite(t))return;const row={time:t};for(const [key,[field,unit]] of Object.entries(fields)){const v=data.hourly[field]?.[i];const actual=data.hourly_units?.[field],valid=key==='current'?['m/s','km/h'].includes(actual):actual===unit;row[key]=valid&&Number.isFinite(v)?(key==='current'&&actual==='km/h'?v/3.6:v):null;}result.set(t,row);});return result;}
function normalize(weather,marine,now=Date.now(),requested=null,mode='fishing'){
 const marinePoint=marine&&Number.isFinite(marine.latitude)&&Number.isFinite(marine.longitude)?{lat:marine.latitude,lng:marine.longitude}:null;
 const modelDistanceM=requested&&marinePoint?distance(requested,marinePoint):null;
 const offshore=modelDistanceM!==null&&modelDistanceM>50000;
 const a=rows(weather,weatherFields),b=rows(offshore?null:marine,marineFields);
 const active=mode==='weather'?weatherFields:{...weatherFields,...marineFields};
 const times=[...new Set([...a.keys(),...(mode==='weather'?[]:b.keys())])].filter(t=>t>=Math.floor(now/3600000)*3600&&t<now/1000+48*3600).sort((x,y)=>x-y);
 const hourly=times.map(time=>Object.assign(Object.fromEntries(Object.keys(active).map(k=>[k,null])),a.get(time),mode==='weather'?null:b.get(time),{time}));
 const n=(v,min=-Infinity,max=Infinity)=>Number.isFinite(v)&&v>=min&&v<=max?v:null;
 const daily=(weather?.daily?.time||[]).flatMap((time,i)=>Number.isFinite(time)?[{time,sunrise:n(weather.daily.sunrise?.[i],1),sunset:n(weather.daily.sunset?.[i],1),moonPhase:n(weather.daily.moon_phase?.[i],0,1),uv:n(weather.daily.uv_index_max?.[i],0,30),sunshine:n(weather.daily.sunshine_duration?.[i],0,86400)}]:[]);
 const available=fields=>hourly.some(r=>Object.keys(fields).some(k=>r[k]!==null&&r[k]!==undefined));
 const sourceAvailability={weather:available(weatherFields),marine:mode==='fishing'&&available(marineFields)};
 const partial=!sourceAvailability.weather||(mode==='fishing'&&!sourceAvailability.marine)||hourly.some(r=>Object.values(r).some(v=>v===null));
 return {hourly,daily,partial,mode,sourceAvailability,coastal:offshore?false:marinePoint?true:null,modelDistanceM,fetchedAt:new Date(now).toISOString(),expiresAt:new Date(now+(partial?60000:900000)).toISOString(),source:'Open-Meteo',modelLocations:{weather:weather&&Number.isFinite(weather.latitude)&&Number.isFinite(weather.longitude)?{lat:weather.latitude,lng:weather.longitude}:null,marine:marinePoint}};
}
function coordinates(params,mode){const lat=Number(params.get('lat')),lng=Number(params.get('lng'));if(!params.get('lat')?.trim()||!params.get('lng')?.trim()||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||mode==='fishing'&&(lat<35.5||lat>42.5||lng<25.5||lng>45))throw new Error('invalid_location');return {lat,lng};}
async function source(kind,location,{fetchImpl,now,refresh}){
 const key=`${kind}:${location.lat.toFixed(3)},${location.lng.toFixed(3)}`,old=providers.get(key);if(!refresh&&old&&old.until>now)return old.data;if(pending.has(key))return pending.get(key);
 const fields=kind==='weather'?weatherFields:marineFields;
 const params={latitude:String(location.lat),longitude:String(location.lng),forecast_days:'2',timezone:'Europe/Istanbul',timeformat:'unixtime',wind_speed_unit:'ms',hourly:Object.values(fields).map(v=>v[0]).join(',')};
 if(kind==='weather')params.daily='sunrise,sunset,moon_phase,uv_index_max,sunshine_duration';
 const url=`https://${kind==='weather'?'api':'marine-api'}.open-meteo.com/v1/${kind==='weather'?'forecast':'marine'}?${new URLSearchParams(params)}`;
 const job=(async()=>{const r=await fetchImpl(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('source_unavailable');const data=await r.json();if(!Array.isArray(data.hourly?.time))throw new Error('source_unavailable');bounded(providers,key,{until:now+900000,data});return data;})();
 pending.set(key,job);try{return await job;}finally{pending.delete(key);}
}
async function query(params,{fetchImpl=fetch,now=Date.now()}={}){
 const mode=params.get('mode')||'fishing';if(!['weather','fishing'].includes(mode))throw new Error('invalid_mode');const location=coordinates(params,mode),refresh=params.get('refresh')==='1';
 const key=`${mode}:${location.lat.toFixed(3)},${location.lng.toFixed(3)}`,old=cache.get(key);if(!refresh&&old&&old.until>now)return old.data;
 const results=await Promise.allSettled((mode==='weather'?['weather']:['weather','marine']).map(kind=>source(kind,location,{fetchImpl,now,refresh})));
 const data=normalize(results[0].status==='fulfilled'?results[0].value:null,results[1]?.status==='fulfilled'?results[1].value:null,now,location,mode);
 if(!data.hourly.some(h=>Object.entries(h).some(([k,v])=>k!=='time'&&v!==null)))throw new Error('fishing_unavailable');data.location=location;bounded(cache,key,{until:Date.parse(data.expiresAt),data});return data;
}
module.exports={query,normalize};
