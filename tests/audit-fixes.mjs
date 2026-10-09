import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync('src/hooks/useBackLayer.ts','utf8').replace(/^import[^\n]*\n/,'');
function harness(){
 const entries=[null],events=[],microtasks=[],listeners=new Map();let index=0,cleanup,token=0;
 const history={get state(){return entries[index]},pushState(s){entries.splice(index+1);entries.push(s);index++},back(){events.push(()=>{if(index===0)return;index--;for(const f of listeners.get('popstate')||[])f({state:entries[index]});})}};
 const context={exports:{},useRef:x=>({current:x}),useEffect:f=>{cleanup=f()},history,crypto:{randomUUID:()=>String(++token)},queueMicrotask:f=>microtasks.push(f),window:{addEventListener:(n,f)=>{if(!listeners.has(n))listeners.set(n,new Set());listeners.get(n).add(f)},removeEventListener:(n,f)=>listeners.get(n)?.delete(f)}};
 vm.createContext(context);vm.runInContext(ts.transpileModule(source,{compilerOptions:{target:99,module:ts.ModuleKind.CommonJS}}).outputText,context);
 return {open(close=()=>{}){context.exports.useBackLayer(true,close);return cleanup},flush(){while(microtasks.length||events.length){microtasks.splice(0).forEach(f=>f());events.splice(0).forEach(f=>f())}},back(){history.back()},get index(){return index},get state(){return history.state}};
}
// User closes the detail, then the next real Back must leave the base page.
let h=harness(),end=h.open();h.flush();assert.equal(h.index,1);end();h.flush();assert.equal(h.index,0);
// Nested details close one level at a time.
h=harness();let parentClosed=0,childClosed=0;const parent=h.open(()=>parentClosed++);h.flush();const child=h.open(()=>childClosed++);h.flush();h.back();h.flush();assert.equal(childClosed,1);assert.equal(parentClosed,0);assert.equal(h.index,1);parent();child();h.flush();assert.equal(h.index,0);
// A location refresh can dismiss both levels in the same render.
h=harness();const a=h.open();h.flush();const b=h.open();h.flush();a();b();h.flush();assert.equal(h.index,0);
// StrictMode's discarded setup must not push an entry.
h=harness();h.open()();const stable=h.open();h.flush();assert.equal(h.index,1);stable();h.flush();assert.equal(h.index,0);
// Reopening while a prior history.back is still pending must be serialized.
h=harness();const old=h.open();h.flush();old();const next=h.open();h.flush();assert.equal(h.index,1);next();h.flush();assert.equal(h.index,0);
console.log('Back navigation PASS: single, nested, simultaneous closes, StrictMode and rapid reopen.');
