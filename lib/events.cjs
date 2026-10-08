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
let cached;
async function query(){if(cached&&Date.now()-cached.time<3600000)return {...cached.data,items:cached.data.items.filter(i=>Date.parse(i.endsAt)>=Date.now())};const r=await fetch(SOURCE,{signal:AbortSignal.timeout(10000),headers:{Accept:'text/html'}});if(!r.ok)throw new Error('events_upstream');const data={items:parseBookFair(await r.text()),coverage:'Antalya Kitap Fuarı resmi programı',partial:true,sourceUrl:'https://www.antalya.bel.tr/tr/etkinlikler',fetchedAt:new Date().toISOString()};cached={time:Date.now(),data};return data;}
module.exports={parseBookFair,query};
