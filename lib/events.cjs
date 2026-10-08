'use strict';
const SOURCE='https://kitapfuari.antalya.bel.tr/';
const MONTHS=['ocak','şubat','mart','nisan','mayıs','haziran','temmuz','ağustos','eylül','ekim','kasım','aralık'];
function decode(s){return String(s).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&nbsp;/g,' ');}
function safeUrl(value,base=SOURCE){try{const u=new URL(decode(value),base);return u.protocol==='https:'&&!u.username&&!u.password?u.href:undefined;}catch{return undefined;}}
function parseBookFair(html,now=Date.now()){
 const clean=decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ');
 const title=decode(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]||'').trim();
 const date=clean.match(/\b(\d{1,2})\s*[–—-]\s*(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})\b/i);
 if(!date||!title||!title.includes('Kitap Fuar'))throw new Error('event_unverified');
 const month=MONTHS.indexOf(date[3].toLocaleLowerCase('tr-TR'))+1,year=Number(date[4]),start=Number(date[1]),end=Number(date[2]);
 if(!month||start<1||end<start||end>new Date(year,month,0).getDate())throw new Error('event_date_invalid');
 const hours=clean.match(/\b(\d{1,2})[.:](\d{2})\s*[–—-]\s*(\d{1,2})[.:](\d{2})\b/);
 const dateStr=d=>`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 const startsAt=`${dateStr(start)}T${hours?`${hours[1].padStart(2,'0')}:${hours[2]}`:'00:00'}:00+03:00`,endsAt=`${dateStr(end)}T${hours?`${hours[3].padStart(2,'0')}:${hours[4]}`:'23:59'}:00+03:00`;
 if(!Number.isFinite(Date.parse(startsAt))||!Number.isFinite(Date.parse(endsAt)))throw new Error('event_date_invalid');
 if(Date.parse(endsAt)<now)return [];
 const images=[...html.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);const poster=images.find(s=>/alt=["'][^"']*Kitap Fuar/i.test(s)&&!/[\/]logo[.\/]/i.test(s));
 const imageUrl=safeUrl(poster?.match(/src=["']([^"']+)/i)?.[1]||'');
 const directionsUrl=[...html.matchAll(/href=["']([^"']+)["']/gi)].map(m=>safeUrl(m[1])).find(u=>u&&/^https:\/\/(www\.)?google\.com\/maps\/dir\//.test(u));
 return [{id:`bookfair:${year}`,title,startsAt,endsAt,hours:hours?`${hours[1]}:${hours[2]}–${hours[3]}:${hours[4]}`:null,venue:clean.includes('Cam Piramit Fuar ve Kongre Merkezi')?'Cam Piramit Fuar ve Kongre Merkezi':null,imageUrl:poster?imageUrl:undefined,directionsUrl,url:SOURCE,source:'Antalya Büyükşehir Belediyesi',price:null}];
}
function text(html){return decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();}
function dateTime(day,month,year,hour='00',minute='00'){
 const m=MONTHS.indexOf(month.toLocaleLowerCase('tr-TR'))+1;
 if(!m||Number(day)<1||Number(day)>new Date(Number(year),m,0).getDate()||Number(hour)>23||Number(minute)>59)return null;
 return `${year}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:${minute}:00+03:00`;
}
function makeEvent({title,startsAt,venue,url,source,kind,hours,endsAt,description},now){
 if(!startsAt||!title||!venue)return null;
 endsAt=endsAt||startsAt.slice(0,10)+'T23:59:59+03:00';
 if(Date.parse(endsAt)<now)return null;
 return {id:`${startsAt}:${title.toLocaleLowerCase('tr-TR')}:${venue.toLocaleLowerCase('tr-TR')}`,title,startsAt,endsAt,venue,url,source,kind,hours,description,price:null,directionsUrl:undefined};
}
function parseBubilet(html,url,kind,now=Date.now()){
 const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
 const sections=[...visible.matchAll(/<h2\b[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2\b|<\/article>|$)/gi)];
 const items=[];
 for(const [,anchor,heading,body] of sections){
  const clean=text(body),title=text(heading),date=clean.match(/Tarih\s*:\s*([\d,\s]+)\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})/i),venue=clean.match(/Yer\s*:\s*(.+?)\s+Saat\s*:/i)?.[1],time=clean.match(/Saat\s*:\s*(\d{1,2})[.:](\d{2})/i);
  if(!date||!venue||!time)continue;
  const description=undefined;
  for(const day of date[1].split(',').map(d=>d.trim()).filter(Boolean)){
   const event=makeEvent({title,startsAt:dateTime(day,date[2],date[3],time[1],time[2]),venue,url:`${url}#${anchor}`,source:'Bubilet',kind,hours:`${time[1]}:${time[2]}`,description},now);if(event)items.push(event);
  }
 }
 if(!sections.length)throw new Error('event_unverified');return items;
}
function parseSanat(html,url,now=Date.now()){
 const clean=text(html),title=text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||''),date=clean.match(/(\d{1,2})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})\s+\S+\s+(\d{1,2}):(\d{2})/i);
 if(!date||!title||!clean.includes('Aspendos Salonu'))throw new Error('event_unverified');
 const event=makeEvent({title,startsAt:dateTime(...date.slice(1)),venue:'Antalya AKM Aspendos Salonu',url,source:'Sanat Cepte / Kültür ve Turizm Bakanlığı',kind:'concert',hours:`${date[4]}:${date[5]}`},now);return event?[event]:[];
}
function parseBiletix(html,url,now=Date.now()){
 const clean=text(html),date=clean.match(/(\d{1,2}(?:\s*[-–]\s*\d{1,2}){1,3})\s+(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+(20\d{2})/i);
 const title=text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
 if(!date||!title||!clean.includes('Antalya Bahçe')||!clean.includes('15.00'))throw new Error('event_unverified');
 return date[1].split(/\s*[-–]\s*/).flatMap(day=>{const event=makeEvent({title,startsAt:dateTime(day,date[2],date[3],'15','00'),venue:'Antalya Bahçe',url,source:'Biletix',kind:'festival',hours:'15:00 kapı açılışı',description:'Konser başlangıç saati kaynakta belirtilmiyor.'},now);return event?[event]:[];});
}
function deduplicate(items){const found=new Map();for(const item of items){const key=[item.title,item.venue,item.startsAt].join('|').toLocaleLowerCase('tr-TR').replace(/\s+/g,' ');if(!found.has(key))found.set(key,item);}return [...found.values()].sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));}
// Coordinates published by the ticket provider's venue page, not a name search.
const VERIFIED_VENUES=[{names:['Antalya Bahçe','Antalya Açıkhava Bahçe'],lat:36.88178065,lng:30.66679438,source:'https://www.bubilet.com.tr/mekan/antalya-acikhava-bahce'}];
function locateEvents(items){return items.map(item=>{const venue=VERIFIED_VENUES.find(v=>v.names.includes(item.venue));return venue?{...item,directionsUrl:`https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`,locationSource:venue.source}:item;});}
let cached;
async function query(){
 const now=Date.now();if(cached&&now-cached.time<900000)return {...cached.data,items:cached.data.items.filter(i=>Date.parse(i.endsAt)>=now)};
 const local=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit'}).format(new Date(now));const [year,month]=local.split('-'),slug=MONTHS[Number(month)-1].replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c');
 const sources=[{url:SOURCE,parse:(html)=>parseBookFair(html,now).map(item=>({...item,kind:"fair"}))},...['konser','tiyatro','stand-up'].map((category,i)=>({url:`https://www.bubilet.com.tr/blog/antalya/antalya-${category}-takvimi-${slug}-${year}`,parse:(html,url)=>parseBubilet(html,url,['concert','theatre','standup'][i],now)})),{url:'https://sanatcepte.gov.tr/etkinlik/etkinlik-detay/denizbank-konserleri-9-ekim-adso',parse:parseSanat},{url:'https://www.biletix.com/performance/51932/001/ANTALYA/tr',parse:parseBiletix}];
 const results=await Promise.allSettled(sources.map(async s=>{const r=await fetch(s.url,{signal:AbortSignal.timeout(12000),headers:{Accept:'text/html'}});if(!r.ok)throw new Error('events_upstream');return s.parse(await r.text(),s.url);}));
 const success=results.filter(r=>r.status==='fulfilled');if(!success.length)throw new Error('events_upstream');
 const data={items:locateEvents(deduplicate(success.flatMap(r=>r.value))),coverage:'Antalya kültür ve sanat etkinlikleri',partial:success.length<sources.length,sourceCount:success.length,failedSources:sources.filter((s,i)=>results[i].status==='rejected').map(s=>new URL(s.url).hostname),fetchedAt:new Date(now).toISOString()};cached={time:now,data};return data;
}
module.exports={parseBookFair,parseBubilet,parseSanat,parseBiletix,deduplicate,locateEvents,query};
