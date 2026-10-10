const SOURCE_URL='https://api.ibb.gov.tr/tkmservices/api/TrafficData/v1/TrafficIndexHistory/1/5M';
const LICENSE_URL='https://data.ibb.gov.tr/license';
const MAX_AGE_MS=15*60*1000;
let cache=null;
function inCoverage(lat,lng){return lat>=40.7&&lat<=41.6&&lng>=27.9&&lng<=30;}
function parseTrafficHistory(xml,now=Date.now()){
 const rows=[];
 for(const match of xml.matchAll(/<ResponseTrafficIndexHistory\b[^>]*>([\s\S]*?)<\/ResponseTrafficIndexHistory>/g)){
  const value=match[1].match(/<TrafficIndex>(\d+(?:\.\d+)?)<\/TrafficIndex>/)?.[1];
  const date=match[1].match(/<TrafficIndexDate>([^<]+)<\/TrafficIndexDate>/)?.[1];
  if(value===undefined||!date||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/.test(date))continue;
  const index=Number(value),time=Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/.test(date)?date:date+'+03:00');
  if(!Number.isFinite(time)||index<0||index>100||time>now+60000)continue;
  rows.push({index,time});
 }
 rows.sort((a,b)=>b.time-a.time);
 if(!rows.length)throw Error('traffic_invalid_source');
 const latest=rows[0],fresh=now-latest.time<=MAX_AGE_MS;
 return {index:fresh?latest.index:null,reportedIndex:latest.index,observedAt:new Date(latest.time).toISOString(),fresh};
}
async function query(lat,lng){
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw Error('invalid_location');
 const metadata={coverage:'istanbul',scope:'citywide',source:'İBB Ulaşım Yönetim Merkezi',sourceUrl:SOURCE_URL,licenseUrl:LICENSE_URL};
 if(!inCoverage(lat,lng))return {...metadata,available:false,reason:'outside_coverage',index:null,observedAt:null,fresh:false};
 if(cache&&Date.now()-cache.fetchedAt<60000)return {...metadata,...cache.data,available:true,fetchedAt:new Date(cache.fetchedAt).toISOString()};
 const response=await fetch(SOURCE_URL,{headers:{Accept:'application/xml'},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('traffic_unavailable');
 const data=parseTrafficHistory(await response.text());
 cache={data,fetchedAt:Date.now()};
 return {...metadata,...data,available:true,fetchedAt:new Date(cache.fetchedAt).toISOString()};
}
module.exports={query,parseTrafficHistory,inCoverage};
