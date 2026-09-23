import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const {queryNearby,buildNearbyQuery,PROVIDER_TIMEOUT_MS}=require('../lib/nearby.cjs');
const handler=require('../api/nearby.js');
let replies=[],calls=[];
const fake=async(url,opts)=>{calls.push({url,opts});let r=replies.shift();if(r instanceof Error)throw r;return r;};
const ok=elements=>({ok:true,json:async()=>({elements})});
replies=[{ok:false,status:503},ok([{id:1}])];
assert.equal((await queryNearby({lat:36.89,lng:30.70},1000,fake)).elements.length,1);assert.equal(calls.length,2);assert.ok(calls[0].url.includes('private.coffee'));assert.equal(calls[0].opts.method,'POST');assert.equal(PROVIDER_TIMEOUT_MS,3200);
replies=[{ok:true,json:async()=>({elements:[],remark:'timeout'})},ok([]),ok([{id:2}])];calls=[];assert.equal((await queryNearby({lat:36.89,lng:30.70},1000,fake)).elements[0].id,2);assert.equal(calls.length,3);
replies=[new Error('offline'),new Error('offline'),new Error('offline')];await assert.rejects(queryNearby({lat:36.89,lng:30.70},1000,fake));
assert.equal((buildNearbyQuery({lat:36.89,lng:30.70},1000).match(/around:1000,/g)||[]).length,3);assert.match(buildNearbyQuery({lat:36.89,lng:30.70},1000),/\[timeout:6\]/);
const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(b){this.body=b;return this;}});
for(const url of ['/api/nearby','/api/nearby?lat=NaN&lng=30&radius=1000','/api/nearby?lat=36&lng=30&radius=999999','/api/nearby?lat=91&lng=30&radius=1000']){let r=res();await handler({url,method:'GET'},r);assert.equal(r.code,400);}
let r=res();await handler({url:'/api/nearby',method:'POST'},r);assert.equal(r.code,405);
const orig=globalThis.fetch;let serverFetchCalls=0;
try{globalThis.fetch=async()=>{serverFetchCalls+=1;return ok([{id:9}]);};r=res();await handler({url:'/api/nearby?lat=36.891&lng=30.701&radius=1000',method:'GET'},r);assert.equal(r.code,200);assert.equal(r.body.elements[0].id,9);assert.match(r.headers['Cache-Control'],/s-maxage=120/);assert.equal(r.headers['X-Yakinim-Cache'],'MISS');const cached=res();await handler({url:'/api/nearby?lat=36.891&lng=30.701&radius=1000',method:'GET'},cached);assert.equal(cached.headers['X-Yakinim-Cache'],'HIT');assert.equal(serverFetchCalls,1);}finally{globalThis.fetch=orig;}
const app=readFileSync('app.js','utf8');let requested;
const ctx=vm.createContext({URLSearchParams,AbortController,setTimeout,clearTimeout,NEARBY_REQUEST_TIMEOUT:11000,NEARBY_FALLBACK_TIMEOUT:6500,QUERY_LOCATION_PRECISION:3,statusText:{textContent:''},fetch:async(url)=>{requested=url;return ok([]);}});
vm.runInContext(app.slice(app.indexOf('async function fetchNearbyPayload(')),ctx);await vm.runInContext('fetchNearbyPayload({lat:36.89049,lng:30.70049},1000)',ctx);assert.ok(requested.startsWith('/api/nearby?'));assert.ok(requested.includes('lat=36.890'));assert.ok(requested.includes('lng=30.700'));assert.ok(requested.includes('radius=1000'));
let fallbackUrl;const fallbackCtx=vm.createContext({URLSearchParams,AbortController,setTimeout,clearTimeout,NEARBY_REQUEST_TIMEOUT:11000,NEARBY_FALLBACK_TIMEOUT:6500,QUERY_LOCATION_PRECISION:3,console:{warn(){}},statusText:{textContent:''},fetch:async url=>{if(url.startsWith('/api/'))return {ok:false,status:503};fallbackUrl=url;return ok([{id:17}]);}});
vm.runInContext(app.slice(app.indexOf('async function fetchNearbyPayload(')),fallbackCtx);assert.equal((await vm.runInContext('fetchNearbyPayload({lat:36.89,lng:30.70},1000)',fallbackCtx)).elements[0].id,17);assert.ok(fallbackUrl.includes('/api/interpreter?data='));
console.log('Network tests PASS: short failover, rounded cell requests, server/CDN cache and browser fallback.');
