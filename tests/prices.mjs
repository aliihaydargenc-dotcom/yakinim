import assert from 'node:assert/strict';
import prices from '../lib/prices.cjs';
const location={lat:36.8535,lng:30.7585};
const depots=prices.normalizeDepots([{id:'antalya',sellerName:'Lara',marketName:'migros',location:{lat:36.85415,lon:30.755404}},{id:'istanbul',location:{lat:40.98,lon:29.02}}],location,3);
assert.equal(depots.length,1);
const now=Date.parse('2026-10-08T23:00:00+03:00');
const response={content:[{id:'milk',title:'Süt 1 L',productDepotInfoList:[{depotId:'antalya',price:69.5,indexTime:'08.10.2026 08:17'},{depotId:'istanbul',price:1,indexTime:'08.10.2026 08:17'},{depotId:'antalya',price:null,indexTime:'08.10.2026 08:17'}]}]};
assert.equal(prices.normalizeProducts(response,depots,now)[0].offers.length,1);
assert.equal(prices.normalizeProducts(response,depots,now)[0].offers[0].price,69.5);
assert.deepEqual(prices.normalizeProducts(response,depots,now+49*3600000),[]);
assert.deepEqual(prices.normalizeProducts(response,[],now),[]);
const originalFetch=globalThis.fetch;let calls=0;
try{globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>[]};};const data=await prices.query(new URLSearchParams({lat:'36.8535',lng:'30.7585',q:'milk'}));assert.equal(calls,1,'No product query may be sent with an empty depot list');assert.equal(data.depotCount,0);assert.deepEqual(data.products,[]);await assert.rejects(()=>prices.query(new URLSearchParams({lat:'40.98',lng:'29.02',q:'milk'})),/invalid_location/);}finally{globalThis.fetch=originalFetch;}
console.log('Prices PASS: Antalya-only offers, valid prices, freshness, empty-depot regression and location validation.');
