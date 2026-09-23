import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const app=readFileSync('app.js','utf8');
function extract(name){const start=app.indexOf(`function ${name}(`);const end=app.indexOf('\nfunction ',start+1);return app.slice(start,end<0?app.length:end);}
let selected=null;
const marker={bindTooltip(){return this;},addTo(){return this;},on(event,callback){this.click=callback;},getElement(){return {id:'pin'};}};
const ctx=vm.createContext({L:{marker:()=>marker,divIcon:o=>o},map:{},markers:[],categorySvg:()=>'<svg/>',escapeHtml:s=>s,openPlaceDetails:p=>{selected=p;},setView:()=>{throw Error('Unexpected view switch');}});
vm.runInContext(extract('addPlaceMarker'),ctx);
ctx.place={id:'one',name:'Test cafe',category:'cafe',lat:36,lng:30};
vm.runInContext('addPlaceMarker(place,"",false)',ctx);marker.click();assert.equal(selected.id,'one');
let created=0;const buttons=[];
const strip={children:buttons,append:b=>buttons.push(b),querySelectorAll:()=>buttons};
const ctx2=vm.createContext({categoryStrip:strip,categories:[{id:'cafe',label:'Kafe'},{id:'market',label:'Market'}],activeCategory:{id:'cafe'},categorySvg:()=>'<svg/>',escapeHtml:s=>s,selectCategory:()=>{},document:{createElement(){created++;return{dataset:{},attrs:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(){}};}}});
vm.runInContext(extract('renderCategoryButtons'),ctx2);vm.runInContext('renderCategoryButtons()',ctx2);const first=buttons[0];ctx2.activeCategory={id:'market'};vm.runInContext('renderCategoryButtons()',ctx2);assert.equal(created,2);assert.equal(buttons[0],first);assert.equal(buttons[1].attrs['aria-pressed'],'true');
console.log('Interaction tests PASS: pin opens details without navigation; category controls retain identity.');
