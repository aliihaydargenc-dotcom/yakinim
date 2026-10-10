'use strict';
const BASE='https://service.kentkart.com/rl1/';

const cache=new Map();
async function request(path){const r=await fetch(BASE+path,{signal:AbortSignal.timeout(7000),headers:{Accept:'application/json'}});if(!r.ok)throw new Error('transit_upstream');const d=await r.json();if(Number(d.result?.code)!==0)throw new Error('transit_response');return d;}
function distance(a,b){const rad=Math.PI/180,h=Math.sin((b.lat-a.lat)*rad/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;return Math.round(12742000*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)));}
function point(p){const lat=Number(p.lat),lng=Number(p.lng);return p.lat!=null&&p.lng!=null&&Number.isFinite(lat)&&Number.isFinite(lng)&&lat>35.5&&lat<38&&lng>29&&lng<33?{lat,lng}:null;}
function normalizePath(data,code,direction){const path=data.pathList?.[0];if(!path)throw new Error('route_unavailable');return {code,direction,name:String(path.headSign||path.direction_name||code),stops:(path.busStopList||[]).flatMap(s=>{const c=point(s);return c&&/^\d+$/.test(String(s.stopId))?[{id:String(s.stopId),name:String(s.stopName||s.stopId),...c,routes:String(s.routes||code).split(',').filter(Boolean)}]:[]}),points:(path.pointList||[]).flatMap(s=>{const c=point(s);return c?[c]:[]})};}
async function route(code,direction){const key=`${code}:${direction}`,old=cache.get(key);if(old&&Date.now()-old.time<3600000)return old.data;const data=normalizePath(await request(`web/pathInfo?region=026&lang=tr&direction=${direction}&displayRouteCode=${encodeURIComponent(code)}&resultType=101000`),code,direction);cache.set(key,{time:Date.now(),data});return data;}
async function catalog(){const data=require('./antalya-stops.json');if(!data.stops?.length)throw new Error('stops_unavailable');return data;}
function sourceTime(value){if(!/^\d{14}$/.test(String(value)))return null;const s=String(value);const t=Date.parse(`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}T${s.slice(8,10)}:${s.slice(10,12)}:${s.slice(12,14)}+03:00`);return Number.isFinite(t)?t:null;}
function normalizeArrivals(data,now=Date.now()){const time=sourceTime(data.result?.dateTime),fresh=time!==null&&now-time>=-60000&&now-time<=180000;return {fresh,sourceAt:time===null?null:new Date(time).toISOString(),buses:(data.busList||[]).flatMap(b=>{const c=point(b),minutes=Number(b.timeDiff),stops=Number(b.stopDiff);return c&&b.timeDiff!=null&&String(b.timeDiff).trim()!==''&&Number.isFinite(minutes)&&minutes>=0?[{id:String(b.busId),code:String(b.displayRouteCode),name:String(b.headSign||b.displayName||''),direction:Number(b.direction)===1?1:0,minutes,stops:Number.isFinite(stops)?stops:null,...c}]:[]}).sort((a,b)=>a.minutes-b.minutes)};}
async function query(action,params){
 const lat=Number(params.get('lat')),lng=Number(params.get('lng'));
 const location=params.has('lat')&&params.has('lng')?point({lat,lng}):null;
 if(action==='stops'){
  const data=await catalog();
  const term=(params.get('q')||'').trim().toLocaleLowerCase('tr');
  if(term.length>80)throw new Error('invalid_query');
  const bbox=params.get('bounds');
  let bounds=null;
  if(bbox!==null){
   const values=bbox.split(',').map(Number);
   if(values.length!==4||values.some(v=>!Number.isFinite(v)))throw new Error('invalid_bounds');
   const [south,west,north,east]=values;
   if(south>=north||west>=east||south< -90||north>90||west< -180||east>180)throw new Error('invalid_bounds');
   bounds={south,west,north,east};
  }
  const fallback={lat:36.8948,lng:30.7056};
  const origin=location||fallback;
  const candidates=data.stops.filter(s=>(!bounds||(s.lat>=bounds.south&&s.lat<=bounds.north&&s.lng>=bounds.west&&s.lng<=bounds.east))&&(!term||`${s.name} ${s.id} ${s.routes.join(' ')}`.toLocaleLowerCase('tr').includes(term))).map(s=>({...s,distanceM:distance(origin,s)}));
  const globalSearch=!!term&&!bounds;
  const within=globalSearch||bounds?candidates:candidates.filter(s=>s.distanceM<=2000);
  const ordered=within.sort((a,b)=>a.distanceM-b.distanceM||a.id.localeCompare(b.id));
  const limit=globalSearch?300:bounds?5000:300;
  return {source:'Kentkart / Antalyakart',coverage:data.coverage,partial:data.partial,catalogAt:data.updatedAt,catalogSize:data.stops.length,stale:Date.now()-Date.parse(data.updatedAt)>30*86400000,stops:ordered.slice(0,limit),truncated:ordered.length>limit,scope:bounds?'viewport':globalSearch?'search':'nearby'};
 }
 if(!location)throw new Error('invalid_location');
 if(action==='arrivals'){
  const id=params.get('stop');
  if(!/^\d{1,8}$/.test(id||''))throw new Error('invalid_stop');
  const data=await request(`web/nearest/bus?region=026&lang=tr&lat=${location.lat}&lng=${location.lng}&busStopId=${id}`);
  if(String(data.stopInfo?.busStopid)!==id)throw new Error('stop_mismatch');
  return {...normalizeArrivals(data),source:'Kentkart / Antalyakart'};
 }
 if(action==='route'){
  const code=params.get('code')||'',direction=params.get('direction');
  if(!/^[\p{L}\d]{1,12}$/u.test(code)||!['0','1'].includes(direction))throw new Error('invalid_route');
  return {...await route(code,Number(direction)),source:'Kentkart / Antalyakart'};
 }
 throw new Error('invalid_action');
}
module.exports={query,normalizePath,normalizeArrivals,distance};
