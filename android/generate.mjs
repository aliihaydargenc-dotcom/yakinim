import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {TwaManifest,TwaGenerator,ConsoleLog}=require('@bubblewrap/core');
const {fetchUtils}=require('@bubblewrap/core/dist/lib/FetchUtils');
const directory=path.dirname(fileURLToPath(import.meta.url));
const root=path.dirname(directory);
const config=JSON.parse(fs.readFileSync(path.join(directory,'twa-config.json'),'utf8'));
const origin=`https://${config.host}`;
// The source icons and manifest are the exact assets published with this repo.
// No new network version can appear halfway through generation.
fetchUtils.fetch=async url=>{
 const u=new URL(url);
 if(u.origin!==origin||!['/icons/icon-512.png','/manifest.webmanifest'].includes(u.pathname))throw new Error('Unexpected TWA asset');
 return new Response(fs.readFileSync(root+'/public'+u.pathname),{status:200,headers:{'content-type':u.pathname.endsWith('.png')?'image/png':'application/manifest+json'}});
};
const target=path.join(directory,'twa');
await new TwaGenerator().createTwaProject(target,new TwaManifest(config),new ConsoleLog('Yakınım'));
const gradle=path.join(target,'build.gradle');
fs.writeFileSync(gradle,fs.readFileSync(gradle,'utf8').replaceAll('jcenter()','mavenCentral()'));
fs.writeFileSync(path.join(target,'twa-manifest.json'),JSON.stringify(config,null,2)+'\n');
console.log('Yakınım TWA project generated. Release keys are supplied separately.');
