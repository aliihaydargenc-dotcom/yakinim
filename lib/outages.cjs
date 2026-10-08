'use strict';
const WATER='https://www.sukesintileri.com.tr/antalya-su-kesintisi-sorgulama';
const ELECTRIC='https://kesintiapi.ckenerji.com.tr/AEDAS/';
const clean=s=>String(s??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/\s+/g,' ').trim();
function parseWater(html){
 const items=[];let district='';
 for(const match of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)){
  const body=match[1],s=clean(body);
  if(/^\s*<strong>[^<]+<\/strong>\s*$/.test(body)){district=s;continue;}
  const m=s.match(/(\d{1,2})\.(\d{1,2})\.(20\d{2}) tarihinde (\d{2}):(\d{2}).*Kesintinin Yeri\s*:\s*(.+)$/i);
  if(!m||!district)continue;
  const [day,month,year,hour,minute]=m.slice(1,6).map(Number);
  if(month<1||month>12||day<1||day>new Date(year,month,0).getDate()||hour>23||minute>59)continue;
  const startsAt=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${m[4]}:${m[5]}:00+03:00`;
  items.push({id:`water:${district}:${startsAt}:${m[6]}`,district,neighborhood:m[6],startsAt,endsAt:null,status:'reported',source:'SuKesintileri.com.tr',sourceUrl:WATER});
 }
 if(!items.length&&!/Kesintinin Yeri/i.test(html))throw new Error('water_format_unverified');
 return [...new Map(items.map(i=>[i.id,i])).values()].sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt));
}
function normalizeElectric(outages,transformers){
 if(!Array.isArray(outages.Outage)||!Array.isArray(transformers.OutageTransformersList?.OutageTransformers))throw new Error('electric_format_unverified');
 const found=new Map(),groups=new Map();
 for(const row of outages.Outage){const id=String(row.OUTAGE_NO||'');if(!id||!Number.isFinite(Date.parse(row.RPTD_DATE)))continue;
  if(!found.has(id))found.set(id,{id:`electric:${id}`,outageNo:id,startsAt:row.RPTD_DATE,endsAt:Number.isFinite(Date.parse(row.EST_REPAIR_TIME))?row.EST_REPAIR_TIME:null,message:clean(row.MESSAGE),notification:clean(row.BILDIRIM_TURU),status:'reported',source:'AEDAŞ / CK Enerji',sourceUrl:'https://kesinti.akdenizedas.com.tr/',locations:[],transformers:[],geometry:{type:'MultiPolygon',coordinates:[]}});
  const item=found.get(id),tm=String(row.CBS_TM_NO||'');if(tm&&!item.transformers.includes(tm))item.transformers.push(tm);
 }
 for(const row of transformers.OutageTransformersList.OutageTransformers){
  const lat=Number(row.LAT),lng=Number(row.LON);if(!found.has(String(row.OUTAGE_NO))||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<35||lat>39||lng<28||lng>33)continue;
  const key=[row.OUTAGE_NO,row.TM_NO,row.PARTNO].join(':');if(!groups.has(key))groups.set(key,{outage:String(row.OUTAGE_NO),rings:new Map()});
  const group=groups.get(key),type=String(row.POLIGON_TIPI||'');if(!group.rings.has(type))group.rings.set(type,[]);
  group.rings.get(type).push({order:Number(row.KOORD_SIRA),point:[lng,lat]});
 }
 for(const group of groups.values()){
  const ring=(points)=>{const coords=points.sort((a,b)=>a.order-b.order).map(p=>p.point);if(coords.length<3)return null;if(coords[0][0]!==coords.at(-1)[0]||coords[0][1]!==coords.at(-1)[1])coords.push([...coords[0]]);return coords;};
  const outer=ring(group.rings.get('DIS POLIGON')||[]);if(!outer)continue;
  const holes=[...group.rings].filter(([type])=>type!=='DIS POLIGON').map(([,points])=>ring(points)).filter(Boolean);
  found.get(group.outage).geometry.coordinates.push([outer,...holes]);
 }
 return [...found.values()];
}
async function upstream(url,json=true){const r=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{Accept:json?'application/json':'text/html'}});if(!r.ok)throw new Error('outages_upstream');return json?r.json():r.text();}
let waterCache,electricCache;
async function query(kind){
 const now=Date.now(),cached=kind==='water'?waterCache:electricCache;if(cached&&now-cached.at<300000)return cached.data;
 let items,partial=false;
 if(kind==='water')items=parseWater(await upstream(WATER,false));
 else{
  const [rows,polygons]=await Promise.all([upstream(ELECTRIC+'RetrieveOutages'),upstream(ELECTRIC+'RetrieveOutageTransformersList')]);items=normalizeElectric(rows,polygons);
  // The same outage may affect several neighborhoods. Resolve every transformer, with bounded concurrency.
  const ids=[...new Set(items.flatMap(i=>i.transformers))];const locations=new Map(),deadline=Date.now()+20000;
  for(let start=0;start<ids.length;start+=8){if(Date.now()>deadline){partial=true;break;}const batch=ids.slice(start,start+8);const results=await Promise.allSettled(batch.map(id=>upstream(ELECTRIC+'GetLocation?tmno='+encodeURIComponent(id))));results.forEach((r,index)=>{if(r.status==='fulfilled'&&Array.isArray(r.value.results))locations.set(batch[index],r.value.results);else partial=true;});}
  items=items.map(item=>{const names=[...new Map(item.transformers.flatMap(tm=>locations.get(tm)||[]).map(r=>[{district:clean(r.ilce),neighborhood:clean(r.mahalle)}]).flat().map(l=>[l.district+'|'+l.neighborhood,l])).values()];const {transformers,...result}=item;return {...result,locations:names};});
 }
 const data={items,fetchedAt:new Date().toISOString(),partial,source:kind==='water'?'SuKesintileri.com.tr':'AEDAŞ / CK Enerji'};
 if(kind==='water')waterCache={at:now,data};else electricCache={at:now,data};return data;
}
module.exports={parseWater,normalizeElectric,query};
