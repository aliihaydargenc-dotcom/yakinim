import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ids=['2048','blocks','memory','snake','mines','sudoku','words','breaker','runner'];
const source=fs.readFileSync('src/components/GamesView.tsx','utf8');
for(const id of ids){
 assert.ok(source.includes("id:'"+id+"'"),'Missing library item: '+id);
 assert.ok(fs.existsSync('public/games/'+id+'/index.html'),'Missing game file: '+id);
}
const shell=fs.readFileSync('src/AppShell.tsx','utf8');
assert.ok(shell.includes('other-category-grid'),'Other should use square service cards');
const style=fs.readFileSync('src/shell.css','utf8');
assert.ok(style.includes('aspect-ratio:1'),'Game cards must be square');
for(const id of ['sudoku','words','breaker','runner']){
 const html=fs.readFileSync('public/games/'+id+'/index.html','utf8');
 assert.match(html,/<html lang="tr">/);
 assert.match(html,/<meta name="viewport"/);
 assert.match(html,/href="\.\.\/common\.css"/);
 assert.ok(!/<script\s+src=["']https?:\/\//i.test(html),'External game scripts disallowed');
 const script=html.match(/<script>([\s\S]*?)<\/script>/i);
 assert.ok(script,'Game needs local JavaScript: '+id);
 new vm.Script(script[1],{filename:id+'.js'});
}
const sudoku=fs.readFileSync('public/games/sudoku/index.html','utf8');
for(const value of [...sudoku.matchAll(/(?:kolay|orta|zor):'([0-9]+)'/g)])assert.equal(value[1].length,81);
const actuator=fs.readFileSync('public/games/2048/js/html_actuator.js','utf8');
const tile=fs.readFileSync('public/games/2048/js/tile.js','utf8');
assert.ok(actuator.includes('self.nodes = current'),'2048 must reuse existing DOM tiles');
assert.ok(tile.includes('Tile.nextId'),'2048 needs persistent tile ids');
const keyboard=fs.readFileSync('public/games/2048/js/keyboard_input_manager.js','utf8');
assert.ok(!keyboard.includes('button.addEventListener(this.eventTouchend'),'No double touch action');
const app=fs.readFileSync('src/App.tsx','utf8');
assert.ok(app.includes('pausedLocationForGame'),'Pause GPS during gameplay');
console.log('Games package PASS: nine linked games, 4 local JS scripts compile, square navigation, 2048 optimization and GPS pause.');
