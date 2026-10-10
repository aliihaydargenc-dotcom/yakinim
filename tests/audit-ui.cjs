const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
let category='transit',picking=false,stateIndex=0,query;
const store={section:'nearby',category,search:'',location:{lat:36.884,lng:30.704},locationError:'',savedIds:[],locationMode:'manual'};
for(const name of ['setSection','setCategory','setSearch','setLocation','setLocationError','toggleSaved'])store[name]=()=>{};
const useAppStore=()=>({...store,category});useAppStore.getState=()=>store;
function load(path){
 const module={exports:{}};
 const requireMock=name=>{
  if(name==='react')return {...React,useState:initial=>{const i=stateIndex++;return React.useState(path.endsWith('App.tsx')&&picking&&(i===5||i===7)?true:initial)},lazy:loader=>props=>React.createElement('div',{'data-lazy':loader.toString().includes('MapView')?'map':'pilot','data-picking':String(props.picking)})};
  if(name==='@tanstack/react-query')return {useQuery:()=>query};
  if(name==='lucide-react')return new Proxy({},{get:()=>()=>null});
  if(name.includes('/store'))return {useAppStore};
  if(name.includes('useBackLayer'))return {useBackLayer:()=>{}};
  if(name.includes('useRetainedPlaces'))return {useRetainedPlaces:()=>[{id:'obsolete',category:'duty',name:'Eski nöbetçi',lat:36.884,lng:30.704,address:'Eski adres'}]};
  if(name.includes('services/api'))return {combinePlaceSources:()=>[],fetchArea:()=>{},fetchDuty:()=>{},fetchOvertureSupplement:()=>{},fetchRadio:()=>{}};
  if(name.includes('FeatureSheet'))return {FeatureSheet:({open,children})=>open?children:null};
  if(name.includes('PlaceFacts'))return {PlaceFacts:()=>null};
  if(name.includes('discovery-categories'))return {default:require('../lib/discovery-categories.json')};
  if(name.includes('event-cities'))return {default:require('../lib/event-cities.json')};
  if(name.includes('LocationStatus'))return {LocationStatus:()=>null};
  if(name.includes('CategoryRail'))return {CategoryRail:()=>null};
  if(name.includes('RadioPlayer'))return {RadioPlayer:()=>null};
  return require(name);
 };
 const window={location:{search:''},matchMedia:()=>({matches:false})};
 const context={module,exports:module.exports,require:requireMock,window,navigator:{},URLSearchParams,Intl,Date,console,setTimeout,clearTimeout};
 vm.createContext(context);
 vm.runInContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 return module.exports;
}
query={data:[],isPending:false,isError:false,isFetching:false,isPlaceholderData:false};
const App=load('src/App.tsx').default;
for(const c of ['transit','market','outages','events']){
 category=c;picking=true;stateIndex=0;
 const html=renderToStaticMarkup(React.createElement(App));
 assert.match(html,/data-lazy="map" data-picking="true"/);
 assert.doesNotMatch(html,/data-lazy="pilot"/);
}
category='duty';picking=false;stateIndex=0;
const duty=renderToStaticMarkup(React.createElement(App));
assert.doesNotMatch(duty,/Eski nöbetçi/);
assert.match(duty,/Bu çevre için nöbetçi kaydı alınamadı/);
query={data:{items:[],partial:true},isPending:false,isError:false,isFetching:false};
stateIndex=0;
const {OutagesView}=load('src/components/CityServices.tsx');
const partial=renderToStaticMarkup(React.createElement(OutagesView,{location:store.location,search:'Lara'}));
assert.match(partial,/Bazı kesinti bilgileri alınamadı/);
assert.match(partial,/Eksik veride eşleşme bulunamadı/);
assert.doesNotMatch(partial,/Kayıt yok/);
query={data:undefined,isPending:true,isError:false,isFetching:true};stateIndex=0;
const {TransitView}=load('src/components/PilotViews.tsx');
const stops=renderToStaticMarkup(React.createElement(TransitView,{location:store.location,search:'',mode:'stops',setMode:()=>{}}));
assert.match(stops,/Duraklar yükleniyor/);assert.doesNotMatch(stops,/stop-row/);
console.log('Audit UI PASS: manual picker on service tabs, empty duty replaces obsolete cache, partial outages and loading stops.');
const PlaceFacts=load('src/components/PlaceFacts.tsx').PlaceFacts;
const parking={id:'parking:test',name:'Otopark',category:'parking',lat:41,lng:29,address:'İstanbul'};
for(const fetchedAt of ['not-a-date',new Date(Date.now()+60000).toISOString(),new Date(Date.now()-600000).toISOString()]){
 const html=renderToStaticMarkup(React.createElement(PlaceFacts,{place:{...parking,availability:{free:0,total:100,open:true,fetchedAt}}}));
 assert.match(html,/Eski ölçüm/);assert.doesNotMatch(html,/Invalid Date/);
}
const freshParking=renderToStaticMarkup(React.createElement(PlaceFacts,{place:{...parking,availability:{free:0,total:100,open:true,fetchedAt:new Date().toISOString()}}}));
assert.match(freshParking,/0 boş/);assert.doesNotMatch(freshParking,/Eski ölçüm/);
console.log('Data clarity PASS: zero availability, expired/invalid/future timestamps and honest stale labeling.');
