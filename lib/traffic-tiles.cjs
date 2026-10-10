'use strict';
const SOURCE='https://developer.tomtom.com/traffic-api/documentation/traffic-flow/raster-flow-tiles';
function configured(){return Boolean(process.env.TOMTOM_API_KEY?.trim());}
function metadata(){return {available:true,scope:'road',coverage:'turkey',source:'TomTom Traffic',sourceUrl:SOURCE,licenseUrl:'https://www.tomtom.com/legal/',index:null,fresh:false,observedAt:null,tiles:'/api/traffic?action=tile&z={z}&x={x}&y={y}',attribution:'© TomTom',refreshSeconds:120};}
async function tile(params,{fetchImpl=fetch}={}){
 const values=['z','x','y'].map(k=>params.get(k));
 if(values.some(v=>!/^\d{1,8}$/.test(v||'')))throw Error('invalid_tile');
 const [z,x,y]=values.map(Number);
 if(z>18||x>=2**z||y>=2**z)throw Error('invalid_tile');
 if(!configured())throw Error('traffic_not_configured');
 const url=new URL(`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/${z}/${x}/${y}.png`);
 url.searchParams.set('key',process.env.TOMTOM_API_KEY.trim());url.searchParams.set('tileSize','256');
 const r=await fetchImpl(url,{signal:AbortSignal.timeout(6000),headers:{Accept:'image/png'}});
 if(!r.ok)throw Error('traffic_unavailable');
 const buffer=Buffer.from(await r.arrayBuffer());
 if(buffer.length>2000000||buffer.length<8||!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('traffic_invalid_tile');
 return buffer;
}
module.exports={configured,metadata,tile};
