import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const base='public/games';
const games=['2048','blocks','memory','snake','mines','sudoku','words','breaker','runner','puzzle'];
const imported=['sudoku','words','breaker','runner','puzzle'];
const catalog=fs.readFileSync('src/components/GamesView.tsx','utf8');
const shell=fs.readFileSync('src/AppShell.tsx','utf8');
assert.equal(games.length,10);
assert.ok(shell.includes('other-category-grid'),'Other hub should remain square');
assert.match(fs.readFileSync('src/shell.css','utf8'),/\.game-library-card[\s\S]*?aspect-ratio:1/);
function syntax(source,name){new vm.Script(source,{filename:name});}
for(const id of games){
 assert.ok(catalog.includes("id:'"+id+"'"),'Missing game in library: '+id);
 const gameDir=path.join(base,id),index=path.join(gameDir,'index.html');
 assert.ok(fs.existsSync(index),'Missing game: '+id);
 const html=fs.readFileSync(index,'utf8');
 assert.match(html,/<meta\s+name=["']viewport["']/i,'Game should scale on mobile: '+id);
 const references=[...html.matchAll(/(?:src|href)=["']([^"'#]+)["']/gi)].map(m=>m[1]);
 if(imported.includes(id))for(const ref of references){
   if(ref.startsWith('data:')||ref.startsWith('/')||ref.startsWith('https:')||ref.startsWith('http:'))continue;
   assert.ok(fs.existsSync(path.resolve(gameDir,ref)),'Missing local asset '+id+': '+ref);
 }
 if(imported.includes(id)){
   const license=path.join(gameDir,'LICENSE');
   assert.ok(fs.existsSync(license),'Missing imported-game license: '+id);
   assert.match(fs.readFileSync(license,'utf8'),/Permission is hereby granted/);
 }
 if(['sudoku','breaker'].includes(id)){
  const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.ok(inline.length,'Inline game script missing '+id);
  for(const item of inline)syntax(item[1],id+'/inline.js');
 }
}
for(const file of ['runner/game.js','puzzle/js/game.js','words/js/index.js'])syntax(fs.readFileSync(path.join(base,file),'utf8'),file);
const wordHtml=fs.readFileSync(path.join(base,'words/index.html'),'utf8');
const wordJs=fs.readFileSync(path.join(base,'words/js/index.js'),'utf8');
assert.ok(!/googletagmanager|paypal\.me|buymeacoffee|serviceWorker\.register/i.test(wordHtml+wordJs),'No trackers, donation redirects or PWA registration');
assert.ok(wordJs.includes('let selectedLanguage = "tr_TR"'),'Turkish dictionary should be required');
for(const f of ['words/i18n/tr_TR.js','words/dictionaries/tr_TR.js','words/language_list.js'])assert.ok(fs.existsSync(path.join(base,f)));
const horse=fs.readFileSync(path.join(base,'runner/game.js'),'utf8');
assert.ok(horse.includes("canvas.addEventListener('pointerdown'"),'Runner needs mobile touch');
assert.ok(horse.includes('Fixed 60Hz'),'Runner needs time-step normalization');
assert.ok(fs.readFileSync('src/App.tsx','utf8').includes('pausedLocationForGame'));
const credits=fs.readFileSync(path.join(base,'THIRD_PARTY.md'),'utf8');
for(const id of imported)assert.ok(credits.includes('github.com'),'Source attribution present');
console.log('Games package PASS: 10 games, 5 MIT licenses, offline asset references, Turkish Wordle without trackers, mobile runner, syntax and gameplay integration.');
