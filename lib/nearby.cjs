const {discoveryQuery}=require('./discovery-query.cjs');
const ENDPOINTS=["https://overpass.private.coffee/api/interpreter","https://overpass-api.de/api/interpreter","https://overpass.maprva.org/api/interpreter"];const PROVIDER_TIMEOUT_MS=3200;
function buildNearbyQuery(location,radius,discoveryOnly=false){const area=`around:${radius},${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;if(discoveryOnly)return `[out:json][timeout:6];(${discoveryQuery(area)});out center tags;`;return `[out:json][timeout:6];(nwr(${area})[amenity~"^(cafe|restaurant|fast_food|pharmacy|atm|hospital|clinic|doctors|fuel|parking)$"];nwr(${area})[shop~"^(supermarket|convenience|greengrocer|bakery|mall|department_store|clothes)$"];nwr(${area})[leisure=park];${discoveryQuery(area)});out center tags;`;}
const PROVIDER_HEDGE_MS=250;
async function queryNearby(location,radius,fetcher=fetch,discoveryOnly=false){
 const query=buildNearbyQuery(location,radius,discoveryOnly),failures=[],empty=[],shared=new AbortController();
 const attempts=ENDPOINTS.map((endpoint,index)=>new Promise((resolve,reject)=>{
  let started=false;
  const cancel=()=>{if(!started){clearTimeout(delay);reject(Error('cancelled'));}};
  shared.signal.addEventListener('abort',cancel,{once:true});
  const delay=setTimeout(async()=>{
   started=true;shared.signal.removeEventListener('abort',cancel);
   const controller=new AbortController(),abort=()=>controller.abort();shared.signal.addEventListener('abort',abort,{once:true});
   const timer=setTimeout(abort,PROVIDER_TIMEOUT_MS);
   try{
    const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json','User-Agent':'Yakinim/5.0 (+https://yakinim.vercel.app)'},body:new URLSearchParams({data:query}),signal:controller.signal});
    if(!response.ok)throw Error(`HTTP ${response.status}`);
    const payload=await response.json();if(!Array.isArray(payload.elements)||payload.remark)throw Error('Incomplete response');
    const result={elements:payload.elements,source:'OpenStreetMap',provider:new URL(endpoint).hostname};
    if(!payload.elements.length){empty.push(result);reject(Error('empty'));}else resolve(result);
   }catch(error){if(!shared.signal.aborted)failures.push(`${new URL(endpoint).hostname}: ${error.name==='AbortError'?'timeout':error.message}`);reject(error);}
   finally{clearTimeout(timer);shared.signal.removeEventListener('abort',abort);}
  },index*PROVIDER_HEDGE_MS);
 }));
 try{return await Promise.any(attempts);}
 catch{if(empty.length===ENDPOINTS.length)return empty[0];throw Error(failures.join('; ')||'No complete provider response');}
 finally{shared.abort();}
}
module.exports={ENDPOINTS,PROVIDER_TIMEOUT_MS,PROVIDER_HEDGE_MS,buildNearbyQuery,queryNearby};
