'use strict';
const cache=new Map();let queue=Promise.resolve(),lastStarted=0;
async function query(params,{fetchImpl=fetch,now=Date.now()}={}){
 const lat=Number(params.get('lat')),lng=Number(params.get('lng'));if(!params.get('lat')?.trim()||!params.get('lng')?.trim()||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw new Error('invalid_location');
 const key=`${lat.toFixed(4)},${lng.toFixed(4)}`,old=cache.get(key);if(old&&old.until>now)return old.data;
 const job=queue.catch(()=>{}).then(async()=>{const fresh=cache.get(key);if(fresh&&fresh.until>now)return fresh.data;const wait=1000-(Date.now()-lastStarted);if(wait>0)await new Promise(r=>setTimeout(r,wait));lastStarted=Date.now();
  const url=new URL('https://nominatim.openstreetmap.org/reverse');url.search=new URLSearchParams({lat:lat.toFixed(4),lon:lng.toFixed(4),format:'jsonv2',zoom:'12',addressdetails:'1'}).toString();
  const r=await fetchImpl(url,{signal:AbortSignal.timeout(4500),headers:{'User-Agent':'Yakinim/1.0 (https://yakinim.vercel.app/)','Accept-Language':'tr-TR,tr;q=0.9',Accept:'application/json'}});if(!r.ok)throw new Error('location_unavailable');const raw=await r.json(),a=raw.address||{};
  const text=v=>typeof v==='string'?v.slice(0,120):'';const province=text(a.province||a.state||a.region||a.city),district=text(a.town||a.county||a.city_district||a.municipality),label=[district,province].filter((v,i,a)=>v&&a.indexOf(v)===i).join(', ');
  if(!label)throw new Error('location_unavailable');const data={label,province,district,source:'OpenStreetMap',resolvedAt:new Date(now).toISOString()};if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{until:now+86400000,data});return data;
 });queue=job;return job;
}
module.exports={query};
