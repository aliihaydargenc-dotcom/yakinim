'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function transpile(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const result = ts.transpileModule(source, { fileName: file, reportDiagnostics: true, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `Syntax error in ${file}: ${errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`);
  return result.outputText;
}

function loadApi(fetchImpl) {
  const module = {exports:{}};
  const ctx = { module, exports:module.exports, fetch:fetchImpl, setTimeout, clearTimeout, AbortController, URLSearchParams,
    require(name) { return require(require.resolve(name, {paths:[path.join(root, 'src/services')]})); },
  };
  vm.runInNewContext(transpile('src/services/api.ts'), ctx, {filename:'src/services/api.ts'});
  return module.exports;
}

function loadStore(initial) {
  const items = new Map();
  if (initial !== undefined) items.set('yakinim:v2:last-location', JSON.stringify(initial));
  const localStorage = {
    getItem(key) {return items.get(key) ?? null;}, setItem(key,value) {items.set(key, String(value));}, removeItem(key) {items.delete(key);},
  };
  const module = {exports:{}};
  const ctx = {module, exports:module.exports, localStorage,
    require(name) {
      if (name !== 'zustand') throw new Error('Unexpected dependency: '+name);
      return {create(init) {
        let state;
        const set = change => Object.assign(state, change);
        state = init(set, () => state);
        const useStore = () => state;
        useStore.getState = () => state;
        return useStore;
      }};
    },
  };
  vm.runInNewContext(transpile('src/store.ts'), ctx, {filename:'src/store.ts'});
  return {state:module.exports.useAppStore.getState(),localStorage};
}

async function checkApi() {
  let payload;
  const api = loadApi(async () => ({ok:true, json:async()=>payload}));
  const loc = {lat:36.884,lng:30.704};
  const a = {id:'a',name:'Migros',category:'market',lat:36.884,lng:30.704,address:'Adres bilgisi yok'};
  const b = {...a,id:'b',lat:36.8841,lng:30.7041,address:'Tam adres',phone:'02420000000'};
  const c = {...a,id:'c',lat:36.89,lng:30.705};
  const merged = api.combinePlaceSources([a,b,c]);
  assert.equal(merged.length, 2, 'Same-name records within 90 m must coalesce');
  assert.equal(merged[0].id, 'b', 'Higher-quality duplicate must win');
  const large = Array.from({length:1800},(_,i)=>({...a,id:'id-'+i,name:'Firma '+i,lat:36.8+i*.00001}));
  assert.equal(api.combinePlaceSources(large).length, 1800, 'Distinct names must not get lost');
  payload={};
  await assert.rejects(api.fetchArea({south:36.87,north:36.9,west:30.69,east:30.72},loc),/invalid_viewport_payload/);
  await assert.rejects(api.fetchOvertureSupplement(loc),/invalid_overture_payload/);
  await assert.rejects(api.fetchDuty(loc),/invalid_duty_payload/);
  payload={places:[{id:'valid',name:'Valid',lat:36.8,lng:30.7}, {id:'bad',name:'Bad',lat:999,lng:30.7}]};
  assert.equal((await api.fetchOvertureSupplement(loc)).length,1,'Invalid supplemental coordinates must be excluded');
}

function checkLocationStore() {
  const now=Date.now();
  assert.equal(loadStore({lat:999,lng:30,savedAt:now}).state.location,null,'Invalid saved GPS must be discarded');
  assert.equal(loadStore({lat:36.8,lng:30.7,savedAt:now+60000}).state.location,null,'Future-dated GPS must be discarded');
  assert.equal(loadStore({lat:'36.8',lng:30.7,savedAt:now}).state.location,null,'Untrusted non-numeric GPS must be discarded');
  const {state,localStorage}=loadStore({lat:36.8,lng:30.7,savedAt:now-1000,mode:'device'});
  assert.equal(state.restoredLocation,true);
  state.setLocation({lat:36.81,lng:30.7});
  assert.equal(state.restoredLocation,false);
  state.clearLocation();
  assert.equal(state.location,null);
  assert.equal(localStorage.getItem('yakinim:v2:last-location'),null,'Clear action must remove persisted GPS');
}

async function checkDutyInput() {
  const handler = require('../api/duty.js');
  async function call(url) {
    const response = {code:null,body:null,headers:{}, setHeader(key,value){this.headers[key]=value;},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};
    await handler({method:'GET',url},response);
    return response;
  }
  assert.equal((await call('/api/duty?radius=20000')).code,400,'Absent latitude/longitude must not resolve to (0,0)');
  assert.equal((await call('/api/duty?lat=36.8&lng=30.7&radius=invalid')).code,400);
  assert.equal((await call('/api/duty?lat=36.8&lng=30.7&radius=Infinity')).code,400);
  assert.equal((await call('/api/duty?lat=36.8&lng=30.7&limit=Infinity')).code,400);
  assert.equal((await call('/api/duty?lat=36.8&lng=30.7&limit=2.4')).code,400);
}

function checkPwaPrivacy() {
  const sw = fs.readFileSync(path.join(root,'public/sw.js'),'utf8');
  const listeners = {};
  vm.runInNewContext(sw,{self:{location:{origin:'https://preview.example'},addEventListener(event,fn){listeners[event]=fn;}}, URL, caches:{}, fetch(){throw Error('SW unexpectedly fetched');}});
  assert.equal(typeof listeners.fetch,'function');
  for(const url of ['https://preview.example/api/duty?lat=36.8&lng=30.7','https://tiles.openfreemap.org/abc']) {
    let intercepted=false;
    listeners.fetch({request:{method:'GET',mode:'cors',url},respondWith(){intercepted=true;}});
    assert.equal(intercepted,false,'API and external tile data may not be cached');
  }
  const vercel=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
  const policy=vercel.headers.flatMap(h=>h.headers).find(h=>h.key==='Permissions-Policy');
  assert.equal(policy?.value,'geolocation=(self)','Third-party traffic iframe must not inherit geolocation permission');
  const app=fs.readFileSync(path.join(root,'src/App.tsx'),'utf8');
  assert.match(app,/`area:\$\{locationScope\}`/);
  assert.match(app,/area\.owner === locationScope/);
  assert.match(app,/if \(!areaReady\) return \[\]/);
  for (const key of ['fuel-area','discovery','discovery-supplement','municipal']) {
    assert.match(app, new RegExp("queryKey:\\[\\'"+key+"\\'[^\\]\\n]*locationScope"), `Location-bound ${key} query needs an exact origin key`);
  }
  assert.doesNotMatch(app,/permission\.state==="prompt"\) refresh\(/);
}

(async()=>{
  // Syntax check the complete active TypeScript client without downloading packages.
  const files = fs.readdirSync(path.join(root,'src'),{recursive:true}).filter(f=>/\.(ts|tsx)$/.test(f));
  for(const f of files) transpile('src/'+f);
  checkLocationStore();await checkDutyInput();await checkApi();checkPwaPrivacy();
  console.log(`Hardening PASS: ${files.length} TS/TSX parses, source shape, dedupe, GPS scope/expiry/clear, duty input and PWA privacy.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
