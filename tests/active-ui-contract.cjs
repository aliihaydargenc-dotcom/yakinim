'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');

function clientFile(path){
 const source=fs.readFileSync(path,'utf8');
 const result=ts.transpileModule(source,{fileName:path,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
 const errors=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,path+': '+errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')).join('; '));
 return source;
}
const map=clientFile('src/components/MapView.tsx');
const app=clientFile('src/App.tsx');
const stop=clientFile('src/components/PilotViews.tsx');
const sheet=clientFile('src/components/FeatureSheet.tsx');

// These structural checks cover the active MapLibre/React implementation.
// Browser-level pointer behavior is tested separately in mobile-foundation.spec.ts.
assert.match(map,/const closeSelectedPlace=\(\)=>\{setSelectedPlace\(null\);setSheetLevel\(["']peek["']\);\}/,'Closing a place must also collapse the drawer');
assert.match(map,/useBackLayer\(!!selectedPlace,closeSelectedPlace\)/,'Android/iOS back must use the same close action');
assert.match(map,/className=["']map-sheet-close["'][^>]*onClick=\{closeSelectedPlace\}/,'Close icon must collapse the drawer');
assert.match(map,/onClose=\{closeSelectedPlace\}/,'Place sheet action must collapse the drawer');
assert.match(map,/if\(!f\)\{closeSelectedPlace\(\);return;\}/,'Empty map clicks must collapse the drawer');
assert.match(map,/className=["']map-canvas["'] onPointerUpCapture=\{event=>/,'Map surface should handle touch events independently');
assert.match(map,/onPointerUpCapture=\{event=>\{[\s\S]*?closeSelectedPlace\(\);/,'Map touch should collapse drawer when safe');
assert.match(map,/setSheetLevel\(["']half["']\)/,'Choosing a place must open its details');
assert.match(app,/enableList=\{!picking&&!homeMap\}/,'Discovery map should keep list drawer outside location picking');
assert.match(stop,/onBack=\{\(\)=>setRoute\(null\)\}/,'Transit route back must retain the selected stop');
assert.match(stop,/vehicleId=\{route\.vehicleId\}/,'Bus identity should not change during route details');
assert.match(sheet,/back\?:boolean/,'FeatureSheet must expose nested back navigation');
console.log('Active UI contract PASS: selected-place dismissal, tap/back, location picking and route return.');
