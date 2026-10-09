import assert from 'node:assert/strict';
import {normalize,query} from '../lib/fishing.cjs';
import {inCategory} from '../lib/prices.cjs';
const now=Date.parse('2026-10-09T09:00:00Z'),t=now/1000;
const weather={hourly:{time:[t-3600,t,t+3600],wind_speed_10m:[1,0,null],wind_gusts_10m:[3,5,8]},hourly_units:{wind_speed_10m:'m/s',wind_gusts_10m:'m/s'},daily:{time:[t],sunrise:[t-10800],sunset:[t+32400],moon_phase:[.5]}};
const marine={hourly:{time:[t],wave_height:[.6],wave_period:[4]},hourly_units:{wave_height:'m',wave_period:'s'}};
let data=normalize(weather,marine,now);assert.equal(data.hourly.length,2);assert.equal(data.hourly[0].wind,0);assert.equal(data.hourly[0].wave,.6);assert.equal(data.hourly[1].wave,null);assert.equal(data.hourly[1].wind,null);assert.equal(data.partial,true);assert.equal(data.daily[0].moonPhase,.5);
assert.equal(normalize(null,marine,now).hourly[0].wind,null);assert.equal(normalize({...weather,hourly_units:{wind_speed_10m:'km/h'}},marine,now).hourly[0].wind,null);
assert.equal(inCategory({title:'Sütlü çikolata'},'dairy'),false);assert.equal(inCategory({title:'Pınar Süt 1 L'},'dairy'),true);assert.equal(inCategory({title:'Ton balığı 160 G'},'meat-fish'),true);assert.equal(inCategory({title:'Dana kıyma'},'dairy'),false);
await assert.rejects(query(new URLSearchParams({lat:'91',lng:'29'})),/invalid_location/);
let calls=0;data=await query(new URLSearchParams({lat:'36.862',lng:'30.641'}),{now,fetchImpl:async url=>{calls++;if(url.includes('marine-api'))throw Error('offline');return {ok:true,json:async()=>weather};}});assert.equal(data.partial,true);assert.equal(data.hourly[0].wave,null);await query(new URLSearchParams({lat:'36.862',lng:'30.641'}),{now,fetchImpl:async()=>{throw Error('cache expected');}});assert.equal(calls,2);
await assert.rejects(query(new URLSearchParams({lat:'36.863',lng:'30.642'}),{now,fetchImpl:async()=>({ok:false})}),/fishing_unavailable/);
console.log('Fishing PASS: time alignment, zero vs missing, units, partial sources, nationwide coastal bounds, cache and source failures; price category exclusion.');

const richWeather={...weather,latitude:41.02,longitude:39.72,hourly:{...weather.hourly,temperature_2m:[20,21,22],apparent_temperature:[21,22,23],visibility:[20000,10000,5000]},hourly_units:{...weather.hourly_units,temperature_2m:'°C',apparent_temperature:'°C',visibility:'m'},daily:{...weather.daily,uv_index_max:[5.4],sunshine_duration:[30000]}};
const richMarine={latitude:41.2083,longitude:39.7083,hourly:{...marine.hourly,ocean_current_velocity:[3.6],wind_wave_height:[.1],swell_wave_height:[.5],sea_level_height_msl:[-.3]},hourly_units:{...marine.hourly_units,ocean_current_velocity:'km/h',wind_wave_height:'m',swell_wave_height:'m',sea_level_height_msl:'m'}};
data=normalize(richWeather,richMarine,now,{lat:41.02,lng:39.72});assert.equal(data.hourly[0].current,1,'Current converted from km/h to m/s');assert.equal(data.hourly[0].seaLevel,-.3);assert.equal(data.daily[0].uv,5.4);assert.equal(data.coastal,true);assert.ok(data.modelDistanceM>20000&&data.modelDistanceM<22000);assert.equal(data.sourceAvailability.marine,true);
data=normalize(richWeather,richMarine,now,{lat:39.92,lng:32.85});assert.equal(data.coastal,false);assert.equal(data.hourly[0].wave,null,'Remote sea grid cannot be reported as local inland conditions');assert.equal(data.sourceAvailability.marine,false);
let weatherCalls=0,marineCalls=0;const fetchImpl=async url=>{if(url.includes('marine-api')){marineCalls++;return {ok:true,json:async()=>richMarine};}weatherCalls++;assert.ok(url.includes('uv_index_max'));assert.ok(url.includes('visibility'));return {ok:true,json:async()=>richWeather};};
const point={lat:'41.021',lng:'39.721'};data=await query(new URLSearchParams({...point,mode:'weather'}),{now,fetchImpl});assert.equal(weatherCalls,1);assert.equal(marineCalls,0);assert.equal(data.hourly[0].airTemperature,21);
data=await query(new URLSearchParams(point),{now,fetchImpl});assert.equal(weatherCalls,1,'Weather shared between weather and fishing');assert.equal(marineCalls,1);assert.equal(data.hourly[0].current,1);
await query(new URLSearchParams({...point,refresh:'1'}),{now,fetchImpl});assert.equal(weatherCalls,2);assert.equal(marineCalls,2,'Manual refresh bypasses cache');
await assert.rejects(query(new URLSearchParams({...point,mode:'unsupported'})),/invalid_mode/);await assert.rejects(query(new URLSearchParams({lat:'',lng:'29'})),/invalid_location/);
console.log('Fishing extension PASS: currents, swell, UV, model offset, inland sea rejection, shared weather cache and manual refresh.');

assert.equal(normalize(richWeather,{...richMarine,hourly:{...richMarine.hourly,ocean_current_velocity:[.07]},hourly_units:{...richMarine.hourly_units,ocean_current_velocity:'m/s'}},now).hourly[0].current,.07,'Native m/s current is not converted twice');
