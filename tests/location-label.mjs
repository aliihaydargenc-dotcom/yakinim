import assert from 'node:assert/strict';
import {query} from '../lib/location.cjs';
let calls=0;const params=new URLSearchParams({lat:'36.861',lng:'30.641'});const data=await query(params,{fetchImpl:async(url,options)=>{calls++;assert.equal(new URL(url).searchParams.get('lat'),'36.8610');assert.equal(new URL(url).searchParams.get('zoom'),'12');assert.ok(options.headers['User-Agent'].includes('yakinim.vercel.app'));return {ok:true,json:async()=>({address:{town:'Konyaaltı',province:'Antalya'}})};}});assert.equal(data.label,'Konyaaltı, Antalya');await query(params,{fetchImpl:async()=>{throw Error('cache expected');}});assert.equal(calls,1);
await assert.rejects(query(new URLSearchParams({lat:'NaN',lng:'29'})),/invalid_location/);await assert.rejects(query(new URLSearchParams({lat:'',lng:'29'})),/invalid_location/);await assert.rejects(query(new URLSearchParams({lat:'40',lng:'29'}),{fetchImpl:async()=>({ok:true,json:async()=>({address:{}})})}),/location_unavailable/);
console.log('Location PASS: rounded coordinates, source identification, cached city label and invalid/unresolved locations.');

// Nearby coordinates must not share the kilometre-wide city cache cell.
let preciseCalls=0;
for(const [lat,district] of [['36.8615','Konyaaltı'],['36.8645','Diğer ilçe']]){
 const result=await query(new URLSearchParams({lat,lng:'30.6377'}),{fetchImpl:async(url)=>{preciseCalls++;assert.equal(new URL(url).searchParams.get('lat'),lat);assert.equal(new URL(url).searchParams.get('lon'),'30.6377');return {ok:true,json:async()=>({address:{town:district,province:'Antalya'}})};}});assert.equal(result.district,district);
}
assert.equal(preciseCalls,2);
console.log('District precision PASS: 4-decimal request coordinates, district-level zoom and separate nearby cache cells.');
