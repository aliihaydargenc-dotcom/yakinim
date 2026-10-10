'use strict';
// MET Norway Locationforecast: https://api.met.no/weatherapi/locationforecast/2.0/documentation
// The service requires a recognizable User-Agent and cache-aware requests.
const cache=new Map();
const number=(v)=>typeof v==='number'&&Number.isFinite(v)?v:null;
function condition(symbol){
  const s=String(symbol||'').toLowerCase();
  if(s.includes('thunder'))return 'Gök gürültülü';
  if(s.includes('snow'))return 'Karlı';
  if(s.includes('sleet'))return 'Karla karışık yağmur';
  if(s.includes('rain'))return 'Yağmurlu';
  if(s.includes('fog'))return 'Sisli';
  if(s.includes('partlycloudy'))return 'Parçalı bulutlu';
  if(s.includes('cloudy'))return 'Bulutlu';
  if(s.includes('fair'))return 'Az bulutlu';
  if(s.includes('clearsky'))return 'Açık';
  return 'Hava durumu';
}
module.exports=async function handler(req,res){
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
  const params=new URL(req.url,'https://yakinim.vercel.app').searchParams;
  const lat=Number(params.get('lat')),lng=Number(params.get('lng'));
  if(!params.has('lat')||!params.has('lng')||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return res.status(400).json({error:'invalid_location'});
  const a=lat.toFixed(3),b=lng.toFixed(3),key=a+':'+b,now=Date.now(),previous=cache.get(key);
  const respond=(entry,stale=false)=>{
    const ttl=Math.max(0,Math.min(900,Math.floor((entry.expiresAtMs-Date.now())/1000)));
    res.setHeader('Cache-Control',stale?'private, no-store':`public, s-maxage=${ttl}, stale-while-revalidate=60`);
    return res.status(200).json(entry.value);
  };
  if(previous&&now<previous.expiresAtMs)return respond(previous);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8500);
  try{
    const url=`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${a}&lon=${b}`;
    const response=await fetch(url,{headers:{'User-Agent':'Yakinim/5.0 (+https://yakinim.vercel.app/; https://github.com/aliihaydargenc-dotcom/yakinim)','Accept':'application/json'},signal:controller.signal});
    if(!response.ok)throw new Error('source_unavailable');
    const json=await response.json();
    const slots=json?.properties?.timeseries;
    if(!Array.isArray(slots)||!slots.length)throw new Error('missing_data');
    const slot=slots.find(item=>Date.parse(item.time)>=now-1800000)||slots[0];
    const detail=slot.data?.instant?.details||{};
    const temperature=number(detail.air_temperature),windSpeed=number(detail.wind_speed);
    if(temperature===null||windSpeed===null)throw new Error('missing_weather');
    const next=slot.data?.next_1_hours||slot.data?.next_6_hours||{};
    const amount=number(next.details?.precipitation_amount);
    const fetchedAt=new Date().toISOString();
    const expiresHeader=Date.parse(response.headers.get('expires')||'');
    const expiresAtMs=Number.isFinite(expiresHeader)&&expiresHeader>now?expiresHeader:now+15*60000;
    const value={temperature,windSpeed,precipitation:amount,condition:condition(next.summary?.symbol_code),observedFor:slot.time,fetchedAt,expiresAt:new Date(expiresAtMs).toISOString()};
    const item={expiresAtMs,value};cache.set(key,item);
    if(cache.size>200)cache.delete(cache.keys().next().value);
    return respond(item);
  }catch(_error){
    if(previous&&now-previous.expiresAtMs<3600000)return respond(previous,true);
    res.setHeader('Cache-Control','no-store');
    return res.status(503).json({error:'weather_unavailable'});
  }finally{clearTimeout(timer);}
};
