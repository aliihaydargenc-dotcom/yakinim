'use strict';
const {distance}=require('./transit.cjs');
const BASE='https://api.marketfiyati.org.tr/api/v2/';
const cache=new Map();
async function request(path,body){const r=await fetch(BASE+path,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error('prices_upstream');return r.json();}
function normalizeDepots(rows,location,radius){return (Array.isArray(rows)?rows:[]).flatMap(d=>{const lat=Number(d.location?.lat),lng=Number(d.location?.lon),distanceM=distance(location,{lat,lng});return d.id&&Number.isFinite(lat)&&Number.isFinite(lng)&&distanceM<=radius*1000?[{id:String(d.id),name:String(d.sellerName||''),market:String(d.marketName||''),lat,lng,distanceM}]:[];}).sort((a,b)=>a.distanceM-b.distanceM);}
function sourceTime(value){const m=String(value||'').match(/^(\d{2})\.(\d{2})\.(\d{4}) (\d{2}):(\d{2})$/);return m?`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00+03:00`:null;}
function normalizeProducts(data,depots,now=Date.now()){
 const allowed=new Map(depots.map(d=>[d.id,d]));
 return (data.content||[]).flatMap(p=>{const offers=(p.productDepotInfoList||[]).flatMap(o=>{const depot=allowed.get(String(o.depotId)),price=Number(o.price),updatedAt=sourceTime(o.indexTime),age=now-Date.parse(updatedAt);return depot&&o.price!=null&&Number.isFinite(price)&&price>0&&Number.isFinite(age)&&age>=-60000&&age<=48*3600000?[{...depot,price,unitPrice:String(o.unitPrice||''),updatedAt,promotion:o.promotionText?String(o.promotionText):null}]:[];}).sort((a,b)=>a.price-b.price||a.distanceM-b.distanceM);return offers.length?[{id:String(p.id),title:String(p.title||''),brand:String(p.brand||''),quantity:String(p.refinedVolumeOrWeight||''),imageUrl:/^https:\/\/cdn\.marketfiyati\.org\.tr\//.test(p.imageUrl||'')?p.imageUrl:undefined,offers}]:[];});
}
function selectSharedProducts(products){return products.filter(p=>p.marketCount>=2).sort((a,b)=>b.marketCount-a.marketCount||b.offers.length-a.offers.length||a.title.localeCompare(b.title,'tr')).slice(0,20);}
async function query(params){
 const lat=Number(params.get('lat')),lng=Number(params.get('lng')),radius=Number(params.get('radius')||3),keywords=(params.get('q')||'').trim(),page=Number(params.get('page')||0);
 if(!params.has('lat')||!params.has('lng')||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<36.7||lat>37.2||lng<30.3||lng>31.1)throw new Error('invalid_location');
 if(!Number.isInteger(radius)||radius<1||radius>5||!Number.isInteger(page)||page<0||page>100||keywords.length===1||keywords.length>80)throw new Error('invalid_query');
 const key=JSON.stringify([lat,lng,radius,keywords,page]),old=cache.get(key);if(old&&Date.now()-old.time<300000)return old.data;
 const depots=normalizeDepots(await request('nearest',{latitude:lat,longitude:lng,distance:radius}),{lat,lng},radius);
 // An empty depot list makes the upstream fall back to Istanbul. Never send it.
 const search=term=>request('search',{keywords:term,latitude:lat,longitude:lng,distance:radius,pages:page,size:20,depots:depots.map(d=>d.id)});
 const basics=depots.length&&!keywords?await Promise.allSettled(['süt','yumurta','ayçiçek yağı','makarna','toz şeker','çay','coca cola','pepsi','nescafe','ülker','eti','dardanel'].map(search)):null;
 if(basics&&basics.every(r=>r.status==='rejected'))throw new Error('prices_upstream');
 const raw=depots.length&&keywords?await search(keywords):{content:[],numberOfFound:0};
 const products=basics?basics.flatMap(r=>r.status==='fulfilled'?normalizeProducts(r.value,depots):[]):normalizeProducts(raw,depots);
 const merged=new Map();for(const p of products){const old=merged.get(p.id);if(old){old.offers=[...new Map([...old.offers,...p.offers].map(o=>[o.id,o])).values()].sort((a,b)=>a.price-b.price||a.distanceM-b.distanceM);}else merged.set(p.id,p);}
 const compared=[...merged.values()].map(p=>({...p,marketCount:new Set(p.offers.map(o=>o.market)).size}));
 const featured=selectSharedProducts(compared);
 const data={products:keywords?compared:featured,depotCount:depots.length,total:Number(raw.numberOfFound)||0,page,hasMore:page<100&&(page+1)*20<(Number(raw.numberOfFound)||0),radius,source:'TÜBİTAK Market Fiyatı',fetchedAt:new Date().toISOString()};
 if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{time:Date.now(),data});return data;
}
module.exports={query,normalizeDepots,normalizeProducts,selectSharedProducts};
