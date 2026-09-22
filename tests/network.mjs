import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const require=createRequire(import.meta.url);
const {queryNearby,buildNearbyQuery}=require('../lib/nearby.cjs');
const handler=require('../api/nearby.js');
let replies=[], calls=[];
const fake=async(url,opts)=>{calls.push({url,opts});let r=replies.shift();if(r instanceof Error)throw r;return r;};
const ok=elements=>({ok:true,json:async()=>({elements})});
replies=[{ok:false,status:503},ok([{id:1}])];
assert.equal((await queryNearby({lat:36.89,lng:30.70},1000,fake)).elements.length,1);
assert.equal(calls.length,2);assert.ok(calls[0].url.includes('private.coffee'));assert.equal(calls[0].opts.method,'POST');
replies=[{ok:true,json:async()=>({elements:[],remark:'timeout'})},ok([])];calls=[];
await queryNearby({lat:36.89,lng:30.70},1000,fake);assert.equal(calls.length,2);
replies=[new Error('offline'),new Error('offline')];
await assert.rejects(queryNearby({lat:36.89,lng:30.70},1000,fake));
assert.equal((buildNearbyQuery({lat:36.89,lng:30.70},1000).match(/around:1000,/g)||[]).length,3);
const res=()=>({headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(b){this.body=b;return this;}});
for(const url of ['/api/nearby','/api/nearby?lat=NaN&lng=30&radius=1000','/api/nearby?lat=36&lng=30&radius=999999','/api/nearby?lat=91&lng=30&radius=1000']) {let r=res();await handler({url,method:'GET'},r);assert.equal(r.code,400);}
let r=res();await handler({url:'/api/nearby',method:'POST'},r);assert.equal(r.code,405);
const orig=globalThis.fetch;
try{globalThis.fetch=async()=>ok([{id:9}]);r=res();await handler({url:'/api/nearby?lat=36.89&lng=30.70&radius=1000',method:'GET'},r);assert.equal(r.code,200);assert.equal(r.body.elements[0].id,9);}finally{globalThis.fetch=orig;}
const app=readFileSync('app.js','utf8');let requested;
const ctx=vm.createContext({URLSearchParams,AbortController,setTimeout,clearTimeout,fetch:async(url)=>{requested=url;return ok([]);}});
vm.runInContext(app.slice(app.indexOf('async function fetchNearbyPayload(')),ctx);
await vm.runInContext('fetchNearbyPayload({lat:36.89,lng:30.70},1000)',ctx);
assert.ok(requested.startsWith('/api/nearby?'));assert.ok(requested.includes('radius=1000'));
console.log('Network tests PASS: proxy routing, validation, provider failover, incomplete responses, API success.');
