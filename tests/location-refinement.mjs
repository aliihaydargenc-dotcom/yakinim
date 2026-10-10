import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const app=fs.readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
const source=app.slice(app.indexOf('  function requestLocation()'),app.indexOf('  function chooseOnMap()'));
let first,update,options,watchOptions,location,cleared=[];
const watch={current:null},watchTimer={current:null};
const context={DEMO:false,window:{isSecureContext:true},navigator:{geolocation:{
 getCurrentPosition:(success,error,opts)=>{first=success;options=opts;},
 watchPosition:(success,error,opts)=>{update=success;watchOptions=opts;return 42;},
 clearWatch:id=>cleared.push(id)
}},locationRequest:{current:0},mounted:{current:true},locationWatch:watch,locationWatchTimer:watchTimer,
 manualViewport:{current:false},moveTimer:{current:null},setLocating:()=>{},setLocationError:()=>{},setPicking:()=>{},setLocationPanel:()=>{},setRecenter:()=>{},distance:(a,b)=>Math.abs(a.lat-b.lat)*111000,setLocation:c=>{location=c;},
 clearTimeout:()=>{},setTimeout:()=>1,stopLocationWatch:()=>{if(watch.current!==null)cleared.push(watch.current);watch.current=null;}};
vm.createContext(context);
vm.runInContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
context.requestLocation();assert.equal(options.maximumAge,0);assert.equal(options.enableHighAccuracy,true);
const fix=(lat,accuracy)=>({coords:{latitude:lat,longitude:30.704,accuracy}});
first(fix(36.8,1200));assert.equal(location.lat,36.8);assert.equal(watchOptions.maximumAge,0);
update(fix(36.88,100));assert.equal(location.lat,36.88);
update(fix(36.7,2000));assert.equal(location.lat,36.88);
update(fix(36.884,15));assert.equal(location.lat,36.884);assert.deepEqual(cleared,[]);
update(fix(36.885,20));assert.equal(location.lat,36.885);
update(fix(36.88501,20));assert.equal(location.lat,36.885);
update(fix(36.886,80));assert.equal(location.lat,36.886);
update(fix(36.887,150));assert.equal(location.lat,36.886);
context.requestLocation();first(fix(36.8,900));assert.deepEqual(cleared,[42]);assert.equal(watch.current,42);
context.locationRequest.current++;update(fix(36.7,5));assert.equal(location.lat,36.8);
console.log('Location refinement PASS: fresh fix, continuous tracking, jitter and worse-fix rejection, cleanup and cancelled request.');
