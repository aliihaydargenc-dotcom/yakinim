'use strict';
const cities=require('./event-cities.json');
const cache=new Map(),pending=new Map();
const BASE='https://etkinlik.io',TTL=15*60*1000;
function clean(value=''){return String(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,250);}
function field(block,name){return clean(block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`,'i'))?.[1]);}
function eventUrl(value){try{const u=new URL(value);return u.origin===BASE&&!u.username&&!u.password&&/^\/etkinlik\/\d+\/[^?#]+$/.test(u.pathname)?u.href:null;}catch{return null;}}
function parseRss(xml){
 if(xml.length>2000000||!/<rss\b/i.test(xml)||!/<channel\b/i.test(xml))throw Error('events_invalid_feed');
 const found=new Map();
 for(const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
  const block=match[1],url=eventUrl(field(block,'link')),title=field(block,'title');if(!url||!title)continue;
  // RSS pubDate is not assumed to be an event start time. Dates/venues are
  // accepted only from the public detail page's matching Event JSON-LD.
  found.set(url,{id:'etkinlik:'+url.split('/')[4],title,url,source:'Etkinlik.io',startsAt:null,endsAt:null,hours:null,venue:null,price:null});
 }
 return [...found.values()].slice(0,50);
}
function parseDetail(html,item,city){
 for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  let raw;try{raw=JSON.parse(m[1]);}catch{continue;}
  const rows=Array.isArray(raw)?raw:raw['@graph']||[raw];
  for(const e of rows){
   if(e?.['@type']!=='Event'||eventUrl(e.url)!==item.url)continue;
   if(e.eventStatus?.endsWith('EventCancelled'))return null;
   const valid=v=>{
    if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))return false;
    const [year,month,day]=v.slice(0,10).split('-').map(Number);return month>=1&&month<=12&&day>=1&&day<=new Date(Date.UTC(year,month,0)).getUTCDate()&&Number(v.slice(11,13))<24;
   };
   if(!valid(e.startDate))continue;
   const province=clean(e.location?.address?.addressRegion);
   if(city&&province&&province.toLocaleLowerCase('tr')!==city.name.toLocaleLowerCase('tr'))continue;
   const localDay=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(e.startDate));
   const endsAt=valid(e.endDate)&&Date.parse(e.endDate)>=Date.parse(e.startDate)?e.endDate:localDay+'T23:59:59+03:00';
   return {...item,startsAt:e.startDate,endsAt,venue:clean(e.location?.name)||null,city:province||city?.name||null,hours:new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit'}).format(new Date(e.startDate))};
  }
 }
 return item;
}
async function read(url,fetchImpl){const r=await fetchImpl(url,{headers:{Accept:'application/rss+xml,text/html','User-Agent':'Yakinim/5.0 (+https://yakinim.vercel.app)'},signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('events_upstream');const text=await r.text();if(text.length>2000000)throw Error('events_invalid_feed');return text;}
async function query(cityId='all',{fetchImpl=fetch,now=Date.now()}={}){
 const city=cities.find(c=>c.id===cityId);if(cityId!=='all'&&!city)throw Error('invalid_city');
 const old=cache.get(cityId);if(old&&now-old.at<TTL)return {...old.data,items:old.data.items.filter(i=>!i.endsAt||Date.parse(i.endsAt)>=now)};
 if(pending.has(cityId))return pending.get(cityId);
 const job=(async()=>{
  const url=BASE+'/rss/sorgu'+(city?'?sehirIds='+city.id:'');const candidates=parseRss(await read(url,fetchImpl));
  let next=0,failed=0;const items=[...candidates];
  // Bounded enrichment: eight public pages, at most four simultaneous calls.
  async function worker(){while(next<Math.min(8,items.length)){const i=next++;try{items[i]=parseDetail(await read(items[i].url,fetchImpl),items[i],city);}catch{failed++;}}}
  await Promise.all(Array.from({length:Math.min(4,items.length)},worker));
  const data={items:items.filter(i=>i&&(!i.endsAt||Date.parse(i.endsAt)>=now)),coverage:city?city.name+' · Etkinlik.io şehir seçkisi':'Türkiye · Etkinlik.io seçkisi',city:city?.name||null,sourceUrl:url,fetchedAt:new Date(now).toISOString(),partial:failed>0,datesVerified:items.filter(i=>i?.startsAt).length};
  if(cache.size>=85)cache.delete(cache.keys().next().value);cache.set(cityId,{at:now,data});return data;
 })();pending.set(cityId,job);try{return await job;}finally{pending.delete(cityId);}
}
module.exports={query,parseRss,parseDetail,cities};
