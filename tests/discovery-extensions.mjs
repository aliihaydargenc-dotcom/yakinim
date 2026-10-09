import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const {parksFromRows,toiletsFromGeojson,airFromData,municipal,air,_cache}=require('../lib/local-context.cjs');
const {buildNearbyQuery}=require('../lib/nearby.cjs');
const {buildViewportQuery}=require('../lib/viewport.cjs');
const {categoryFromOvertureProperties}=require('../api/overture.js');
assert.equal(categoryFromOvertureProperties({basic_category:'electric_vehicle_charging_station'}),'charging');
assert.equal(categoryFromOvertureProperties({basic_category:'veterinarian'}),'veterinary');
assert.equal(categoryFromOvertureProperties({basic_category:'playground',categories:'park'}),'playground');
assert.equal(categoryFromOvertureProperties({basic_category:'gas_station'}),'fuel');
for(const cat of require('../lib/discovery-categories.json')){
 assert.ok(buildNearbyQuery({lat:36,lng:30},5000,true).includes(cat.value));
 assert.ok(buildViewportQuery({south:36,north:36.01,west:30,east:30.01}).includes(cat.value));
}
const stamp=new Date().toISOString(),row={parkID:1,parkName:'Otopark',lat:'41.01',lng:'28.97',capacity:10,emptyCapacity:0,isOpen:1};
assert.equal(parksFromRows([row],stamp)[0].availability.free,0);
assert.equal(parksFromRows([{...row,emptyCapacity:11}],stamp)[0].availability.free,null);
assert.equal(parksFromRows([{...row,emptyCapacity:null}],stamp)[0].availability.free,null);
assert.equal(parksFromRows([{...row,capacity:false}],stamp)[0].availability.total,null);
assert.equal(parksFromRows([{...row,isOpen:0}],stamp)[0].availability.open,false);
assert.equal(parksFromRows([{...row,lat:36.88}],stamp).length,0);
const toilet={type:'Feature',geometry:{type:'Point',coordinates:[28.97,41.01]},properties:{MAHAL_ADI:'Tuvalet',TUVALET_DURUM:'Aktif',BAKIM_ODASI:'Var'}};
const active=toiletsFromGeojson({features:[toilet,{...toilet,properties:{...toilet.properties,TUVALET_DURUM:'Pasif'}}]});
assert.equal(active.length,1);assert.ok(active[0].facts.includes('Bebek bakım odası'));
assert.equal(toiletsFromGeojson({features:[{...toilet,properties:{MAHAL_ADI:'Başka tuvalet',TUVALET_DURUM:'Aktif'}}]})[0].id,active[0].id);
const hour=Math.floor(Date.now()/3600000)*3600,fixture={hourly_units:{time:'unixtime',pm2_5:'μg/m³',pm10:'μg/m³',european_aqi:'EAQI'},hourly:{time:[hour],pm2_5:[0],pm10:[15],european_aqi:[20]}};
assert.equal(airFromData(fixture).pm2_5,0);assert.equal(airFromData({...fixture,hourly:{...fixture.hourly,pm2_5:[null]}}).pm2_5,null);
assert.equal(airFromData({...fixture,hourly_units:{...fixture.hourly_units,pm2_5:'mg/m³'}}).pm2_5,null);
assert.throws(()=>airFromData({...fixture,hourly:{...fixture.hourly,time:[hour-7200]}}),/missing/);
_cache.clear();let calls=0;const fake=async url=>{calls++;if(url.includes('ispark'))return {ok:true,json:async()=>[row]};return {ok:true,json:async()=>({features:[toilet]})};};
const data=await municipal({lat:41.01,lng:28.97},'all',fake);assert.equal(data.places.length,2);assert.equal(data.partial,false);assert.equal(calls,2);
await municipal({lat:41.02,lng:28.98},'all',fake);assert.equal(calls,2);
assert.equal((await municipal({lat:36.88,lng:30.7},'all',fake)).places.length,0);assert.equal(calls,2);
_cache.clear();const partial=await municipal({lat:41.01,lng:28.97},'all',async url=>url.includes('ispark')?{ok:false,status:503}:{ok:true,json:async()=>({features:[toilet]})});assert.equal(partial.partial,true);assert.equal(partial.places.length,1);
_cache.clear();let airCalls=0;const airFake=async()=>{airCalls++;return {ok:true,json:async()=>fixture};};await Promise.all([air({lat:36.881,lng:30.701},airFake),air({lat:36.882,lng:30.702},airFake)]);assert.equal(airCalls,1);
const filename=new URL('../src/services/api.ts',import.meta.url).pathname,compiled=new Module(filename);compiled.filename=filename;compiled.paths=Module._nodeModulePaths(new URL('../src/services/',import.meta.url).pathname);compiled._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);
const originalFetch=globalThis.fetch;
try{
 const tags=[{amenity:'toilets',fee:'no',changing_table:'yes'},{amenity:'drinking_water'},{amenity:'charging_station','socket:type2':'2','socket:type2:output':'22 kW'},{leisure:'playground'},{amenity:'toilets',access:'private'},{amenity:'drinking_water',drinking_water:'no'},{amenity:'charging_station','socket:type2':'unknown'}];
 globalThis.fetch=async url=>{assert.match(String(url),/kind=discovery/);return {ok:true,json:async()=>({elements:tags.map((tags,i)=>({type:'node',id:i,lat:36.88,lon:30.7,tags}))})};};
 const places=await compiled.exports.fetchDiscoveryPlaces({lat:36.88,lng:30.7});assert.equal(places.length,5);assert.equal(places[0].name,'Tuvalet');assert.ok(places[0].facts.includes('Ücretsiz'));assert.ok(places[2].facts.includes('22 kW'));assert.equal(places[4].facts.length,0);
 const handler=require('../api/nearby.js'),response=()=>({setHeader(){},status(n){this.code=n;return this;},json(data){this.data=data;return this;}});
 for(const url of ['/api/overture?lat=36&lng=30&category=bad','/api/overture?lat=&lng=30&category=charging']){const res=response();await require('../api/overture.js')({method:'GET',url},res);assert.equal(res.code,400);}
 for(const url of ['/api/nearby?layer=air&lat=&lng=30','/api/nearby?layer=bad&lat=36&lng=30','/api/nearby?layer=municipal&kind=bad&lat=41&lng=29']){const res=response();await handler({method:'GET',url},res);assert.equal(res.code,400);}
 _cache.clear();globalThis.fetch=async()=>{throw Error('offline');};const res=response();await handler({method:'GET',url:'/api/nearby?layer=air&lat=36&lng=30'},res);assert.equal(res.code,503);assert.equal(res.data.error,'air_unavailable');
}finally{globalThis.fetch=originalFetch;}
console.log('Discovery PASS: new tags, unnamed infrastructure, restricted access, zero/missing availability, municipal scope/cache/partial failure, air units/hour and endpoint errors.');
