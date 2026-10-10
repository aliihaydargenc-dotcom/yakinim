import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const base='public/games';
const games=['2048','blocks','memory','snake','mines','words'];
const removed=['sudoku','puzzle','breaker','runner'];
const catalog=fs.readFileSync('src/components/GamesView.tsx','utf8');
const shell=fs.readFileSync('src/AppShell.tsx','utf8');
assert.equal(games.length,6);
for(const id of removed){
 assert.ok(!catalog.includes("id:'"+id+"'"),'Removed game still shown: '+id);
 assert.ok(!fs.existsSync(path.join(base,id)),'Removed game folder still exists: '+id);
}
assert.ok(shell.includes('other-category-grid'),'Other hub should remain square');
assert.ok(fs.readFileSync('src/shell.css','utf8').includes('aspect-ratio:1'),'Game cards should stay square');
for(const id of games){
 assert.ok(catalog.includes("id:'"+id+"'"),'Missing game in library: '+id);
 const html=fs.readFileSync(path.join(base,id,'index.html'),'utf8');
 assert.ok(html.includes('name="viewport"'),'Game should scale on mobile: '+id);
}
const wordHtml=fs.readFileSync(path.join(base,'words/index.html'),'utf8');
assert.ok(wordHtml.includes('İpucuna göre harfleri tamamla.'),'Restore hint-based word game');
assert.ok(wordHtml.includes('const entries='),'Original Turkish word list required');
assert.ok(wordHtml.includes('const alphabet='),'Original Turkish alphabet required');
assert.ok(wordHtml.includes('Türkçe kelimeler'),'Offline Turkish word game');
assert.ok(!wordHtml.includes('turkcewordle'),'Third-party word game must be removed');
const inline=wordHtml.split('<script>')[1]?.split('</script>')[0];
assert.ok(inline,'Original word game needs inline JavaScript');
new vm.Script(inline,{filename:'words/index.html'});
assert.ok(catalog.includes('game.legacy&&<a'),'Custom word game should not show an imported-game license');
const credits=fs.readFileSync(path.join(base,'THIRD_PARTY.md'),'utf8');
for(const name of ['Tuğla Kırma','Engel Atlama','Türkçe Kelime Tahmini'])assert.ok(!credits.includes(name),'Obsolete attribution: '+name);
assert.ok(fs.readFileSync('src/App.tsx','utf8').includes('pausedLocationForGame'),'Pause GPS during gameplay');
console.log('Games package PASS: 6 games, restored Turkish word game, no removed assets, square navigation and GPS pause.');
