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
try{globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>[]};};const data=await prices.query(new URLSearchParams({lat:'36.8535',lng:'30.7585',q:'milk'}));assert.equal(calls,1,'No product query may be sent with an empty depot list');assert.equal(data.depotCount,0);assert.deepEqual(data.products,[]);await assert.rejects(()=>prices.query(new URLSearchParams({lat:'91',lng:'29.02',q:'milk'})),/invalid_location/);}finally{globalThis.fetch=originalFetch;}
console.log('Prices PASS: Nearby-only offers, valid prices, freshness, empty-depot regression and location validation.');

try{const terms=[];globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);if(url.endsWith('/nearest'))return {ok:true,json:async()=>[{id:'antalya',sellerName:'Lara',marketName:'migros',location:{lat:36.85415,lon:30.755404}}]};terms.push(body.keywords);assert.deepEqual(body.depots,['antalya']);const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Istanbul',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date()).replaceAll('/','.');return {ok:true,json:async()=>({content:[{id:body.keywords,title:body.keywords,productDepotInfoList:[{depotId:'antalya',price:50,indexTime:date+' 08:17'}]}]})};};const basics=await prices.query(new URLSearchParams({lat:'36.85351',lng:'30.7585'}));assert.equal(basics.products.length,0,'Single-chain products excluded');assert.deepEqual(terms,['süt','yumurta','ayçiçek yağı','makarna','toz şeker','çay','coca cola','pepsi','nescafe','ülker','eti','dardanel']);assert.equal(basics.hasMore,false);}finally{globalThis.fetch=originalFetch;}

assert.deepEqual(prices.selectSharedProducts([{id:'one',title:'one',marketCount:1,offers:[{},{}]},{id:'two',title:'two',marketCount:2,offers:[{},{}]},{id:'five',title:'five',marketCount:5,offers:[{},{},{},{},{}]}]).map(p=>p.id),['five','two']);

try{
 const terms=[];globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);if(url.endsWith('/nearest'))return {ok:true,json:async()=>[{id:'m',sellerName:'Lara',marketName:'migros',location:{lat:36.85415,lon:30.755404}},{id:'b',sellerName:'Lara',marketName:'bim',location:{lat:36.85415,lon:30.755404}}]};terms.push(body.keywords);const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Istanbul',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date()).replaceAll('/','.');const offer=(depotId,price)=>({depotId,price,indexTime:date+' 08:17'});return {ok:true,json:async()=>({content:[{id:'exact-1l',title:'Pınar Süt 1 L',refinedVolumeOrWeight:'1 L',productDepotInfoList:[offer('m',50),offer('b',60)]},{id:'different-pack',title:'Pınar Süt 200 ML',refinedVolumeOrWeight:'200 ML',productDepotInfoList:[offer('m',15)]},{id:'snack',title:'Sütlü çikolata',productDepotInfoList:[offer('m',20),offer('b',30)]}]})};};
 const data=await prices.query(new URLSearchParams({lat:'36.85359',lng:'30.7585',category:'dairy'}));assert.deepEqual(terms,['süt','yoğurt','peynir','tereyağı']);assert.deepEqual(data.products.map(p=>p.id),['exact-1l']);assert.equal(data.products[0].offers.length,2);assert.deepEqual(data.alternatives.map(p=>p.id),['different-pack']);await assert.rejects(prices.query(new URLSearchParams({lat:'36.85359',lng:'30.7585',category:'invented'})),/invalid_query/);
}finally{globalThis.fetch=originalFetch;}
console.log('Price categories PASS: category terms, identical identity merge, different package separation, flavoured snack exclusion and invalid category.');

// Each city must query and retain only its own nearby depot IDs, even if the
// provider returns other cities or the same product ID appears in both cities.
try{
 const cities=[{lat:41.0082,lng:28.9784,name:'Istanbul',price:50},{lat:38.5012,lng:43.3729,name:'Van',price:75}];
 const searches=[];
 globalThis.fetch=async(url,options)=>{
  const body=JSON.parse(options.body),city=cities.find(c=>c.lat===body.latitude&&c.lng===body.longitude);assert.ok(city,'Selected coordinates forwarded to provider');assert.equal(body.distance,3);
  if(url.endsWith('/nearest'))return {ok:true,json:async()=>[...cities.flatMap(c=>['migros','bim'].map(m=>({id:c.name+m,sellerName:c.name,marketName:m,location:{lat:c.lat,lon:c.lng}})))]};
  searches.push(body);assert.deepEqual(body.depots,[city.name+'migros',city.name+'bim']);
  const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Istanbul',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date()).replaceAll('/','.');
  return {ok:true,json:async()=>({content:[{id:'national-product',title:'Pınar Süt 1 L',productDepotInfoList:cities.flatMap(c=>['migros','bim'].map((m,i)=>({depotId:c.name+m,price:c.price+i*10,indexTime:date+' 08:17'})))}]})};
 };
 for(const city of cities){const d=await prices.query(new URLSearchParams({lat:String(city.lat),lng:String(city.lng),q:'süt',category:'dairy'}));assert.equal(d.depotCount,2);assert.equal(d.products.length,1);assert.equal(d.products[0].offers[0].price,city.price);assert.ok(d.products[0].offers.every(o=>o.name===city.name&&o.distanceM<=3000));}
 assert.equal(searches.length,2,'Coordinates have separate cache entries');
 for(const values of [{lat:'',lng:'29'},{lat:'41',lng:'181'},{lat:'NaN',lng:'29'},{}])await assert.rejects(prices.query(new URLSearchParams(values)),/invalid_location/);
 let calls=0;globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>[]};};const d=await prices.query(new URLSearchParams({lat:'39.92',lng:'32.85',category:'dairy'}));assert.equal(calls,1);assert.equal(d.depotCount,0);assert.deepEqual(d.products,[]);assert.deepEqual(d.alternatives,[]);
}finally{globalThis.fetch=originalFetch;}
const nowPricing=()=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Istanbul',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date()).replaceAll('/','.');
try {
 globalThis.fetch=async (url,options)=>{
  if(url.endsWith('/nearest'))return {ok:true,json:async()=>[{id:'region1',sellerName:'Merkez',marketName:'migros',location:{lat:36.8948,lon:30.7056}}]};
  const date=nowPricing();return {ok:true,json:async()=>({content:[{id:'sole-market',title:'Temel makarna',productDepotInfoList:[{depotId:'region1',price:30,indexTime:date+' 08:17'}]}]})};
 };
 const all=await prices.query(new URLSearchParams({lat:'36.8948',lng:'30.7056',q:'makarna',view:'all'}));
 assert.equal(all.view,'all');assert.equal(all.products.length,1);
 assert.equal(all.products[0].id,'sole-market');
 assert.deepEqual(all.alternatives,[]);
} finally{globalThis.fetch=originalFetch;}
console.log('All product view PASS: single-chain products remain visible.');
console.log('Nationwide prices PASS: western/eastern coordinates, nearby-only depots/offers, location-specific cache, invalid coordinates and no fallback for empty coverage.');
