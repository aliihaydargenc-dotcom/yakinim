'use strict';
const cache=new Map();
const weatherFields={wind:['wind_speed_10m','m/s'],gust:['wind_gusts_10m','m/s'],windDirection:['wind_direction_10m','°'],rain:['precipitation_probability','%'],pressure:['pressure_msl','hPa']};
const marineFields={wave:['wave_height','m'],period:['wave_period','s'],waveDirection:['wave_direction','°'],temperature:['sea_surface_temperature','°C']};
function rows(data,fields){const result=new Map();if(!Array.isArray(data?.hourly?.time))return result;data.hourly.time.forEach((t,i)=>{if(!Number.isFinite(t))return;const row={time:t};for(const [key,[field,unit]] of Object.entries(fields)){const v=data.hourly[field]?.[i];row[key]=data.hourly_units?.[field]===unit&&Number.isFinite(v)?v:null;}result.set(t,row);});return result;}
function normalize(weather,marine,now=Date.now()){
 const a=rows(weather,weatherFields),b=rows(marine,marineFields);const times=[...new Set([...a.keys(),...b.keys()])].filter(t=>t>=Math.floor(now/3600000)*3600&&t<now/1000+48*3600).sort((x,y)=>x-y);
 const hourly=times.map(time=>Object.assign(Object.fromEntries([...Object.keys(weatherFields),...Object.keys(marineFields)].map(k=>[k,null])),a.get(time),b.get(time),{time}));
 const daily=(weather?.daily?.time||[]).map((time,i)=>({time,sunrise:weather.daily.sunrise?.[i]??null,sunset:weather.daily.sunset?.[i]??null,moonPhase:weather.daily.moon_phase?.[i]??null}));
 return {hourly,daily,partial:!a.size||!b.size||hourly.some(r=>Object.values(r).some(v=>v===null)),fetchedAt:new Date(now).toISOString(),expiresAt:new Date(now+900000).toISOString(),source:'Open-Meteo',modelLocations:{weather:weather?{lat:weather.latitude,lng:weather.longitude}:null,marine:marine?{lat:marine.latitude,lng:marine.longitude}:null}};
}
async function query(params,{fetchImpl=fetch,now=Date.now()}={}){
 const lat=Number(params.get('lat')),lng=Number(params.get('lng'));if(!params.has('lat')||!params.has('lng')||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<35.7||lat>37.2||lng<28.9||lng>32.7)throw new Error('invalid_location');
 const key=`${lat.toFixed(3)},${lng.toFixed(3)}`;const saved=cache.get(key);if(saved&&saved.until>now)return saved.data;
 const common={latitude:String(lat),longitude:String(lng),forecast_days:'2',timezone:'Europe/Istanbul',timeformat:'unixtime',wind_speed_unit:'ms'};
 const urls=[`https://api.open-meteo.com/v1/forecast?${new URLSearchParams({...common,hourly:Object.values(weatherFields).map(v=>v[0]).join(','),daily:'sunrise,sunset,moon_phase'})}`,`https://marine-api.open-meteo.com/v1/marine?${new URLSearchParams({...common,hourly:Object.values(marineFields).map(v=>v[0]).join(',')})}`];
 const results=await Promise.allSettled(urls.map(async url=>{const r=await fetchImpl(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('source_unavailable');return r.json();}));
 const data=normalize(...results.map(r=>r.status==='fulfilled'?r.value:null),now);if(!data.hourly.length)throw new Error('fishing_unavailable');data.location={lat,lng};if(cache.size>=80)cache.delete(cache.keys().next().value);cache.set(key,{until:now+900000,data});return data;
}
module.exports={query,normalize};
