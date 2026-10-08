import {test,expect,type Route} from '@playwright/test';
const origin={lat:36.884,lng:30.704};
const elements=[1,2].map(id=>({type:'node',id,lat:origin.lat+.0002*id,lon:origin.lng,tags:{name:`Market ${id}`,shop:'supermarket'}}));
for(const outcome of ['success','error'] as const){
 test(`map keeps its places while panning and after ${outcome}`,async({page})=>{
  let requests=0,hold=false,release:()=>void=()=>{};
  const gate=new Promise<void>(resolve=>release=resolve);
  await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
  await page.route('**/api/viewport?**',async r=>{
   if(!hold)return r.fulfill({json:{elements}});
   requests++;
   await gate;
   return outcome==='error'?r.fulfill({status:503,json:{error:'test'}}):r.fulfill({json:{elements:[...elements,{...elements[0],id:3,tags:{name:'Market 3',shop:'supermarket'}}]}});
  });
  await page.route('https://tiles.openfreemap.org/styles/positron',r=>r.fulfill({json:{version:8,glyphs:'https://fonts.example/{fontstack}/{range}.pbf',sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#f7f5f1'}}]}}));
  await page.route('https://fonts.example/**',r=>r.fulfill({body:Buffer.alloc(0)}));
  await page.addInitScript(value=>localStorage.setItem('yakinim:v2:last-location',JSON.stringify({...value,savedAt:Date.now()})),origin);
  await page.goto('/');await expect(page.locator('.place-row')).toHaveCount(2);
  await page.getByRole('button',{name:'Harita',exact:true}).click();
  await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count','2');
  await page.locator('.maplibregl-canvas').waitFor();await page.waitForTimeout(400);
  const box=await page.locator('.maplibregl-canvas').boundingBox();if(!box)throw Error('Map missing');hold=true;
  await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.55,{steps:12});await page.mouse.up();
  try{
   await expect.poll(()=>requests).toBeGreaterThan(0);
   await page.waitForTimeout(700);
   await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count','2');
  }finally{release();}
  await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count',outcome==='success'?'3':'2');
 });
}
test('contradictory grocery source cannot put a hospital in the market list',async({page})=>{
 await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements:[elements[0],{...elements[0],id:10,tags:{name:'Medstar Antalya Hastanesi',amenity:'hospital'}}]}}));
 await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[{id:'wrong',name:'Medstar Muratpaşa Antalya',category:'market',...origin,address:'Test'}]}}));
 await page.addInitScript(value=>localStorage.setItem('yakinim:v2:last-location',JSON.stringify({...value,savedAt:Date.now()})),origin);
 await page.goto('/');await expect(page.locator('.place-row')).toHaveCount(1);await expect(page.locator('.place-row')).toContainText('Market 1');
 await page.getByRole('button',{name:'Tümü',exact:true}).click();await expect(page.locator('.place-row')).toHaveCount(2);await expect(page.getByText('Medstar Muratpaşa Antalya',{exact:true})).toHaveCount(0);
});
test('news images load and long titles cannot shrink the link icon',async({page})=>{
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#79576d"/></svg>';
 await page.route('https://cdn.example/photo.jpg',r=>r.fulfill({contentType:'image/svg+xml',body:svg}));
 await page.route('https://cdn.example/broken.jpg',r=>r.fulfill({status:404}));
 await page.route('**/api/news?**',r=>r.fulfill({json:{items:[
  {id:'a',title:'Uzun haber başlığı '.repeat(12),imageUrl:'https://cdn.example/photo.jpg'},
  {id:'b',title:'Kısa başlık'},
  {id:'c',title:'Bozuk görsel',imageUrl:'https://cdn.example/broken.jpg'}
 ].map((item,i)=>({...item,url:`https://publisher.example/${i}`,source:'Kaynak',publishedAt:new Date().toISOString()}))}}));
 await page.goto('/?preview');await page.getByRole('button',{name:'Haber',exact:true}).click();await expect(page.locator('.news-card')).toHaveCount(3);
 await expect.poll(()=>page.locator('.news-thumbnail img').first().evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBe(80);
 await expect(page.locator('.news-card').nth(2).locator('.news-thumbnail img')).toHaveCount(0);
 for(const icon of await page.locator('.news-link-icon').all()){const r=await icon.boundingBox();expect(r?.width).toBe(18);expect(r?.height).toBe(18);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('short phone has a full board above controls and Android back exits the game',async({page})=>{
 await page.setViewportSize({width:360,height:640});await page.goto('/?preview');await page.getByRole('button',{name:'Oyun',exact:true}).click();await page.getByRole('button',{name:'Düşen Bloklar Bulmaca'}).click();
 await expect(page.locator('.model-nav')).toHaveCount(0);
 const frame=page.frameLocator('iframe');await frame.getByRole('button',{name:'Başla',exact:true}).click();await expect(frame.locator('.vpad')).toBeVisible();
 await expect.poll(async()=>{const b=await frame.locator('#game-canvas').boundingBox();return b?.height||0;}).toBeGreaterThan(300);
 const board=await frame.locator('#game-canvas').boundingBox(),pad=await frame.locator('.vpad').boundingBox();if(!board||!pad)throw Error('Missing game layout');
 expect(board.y+board.height).toBeLessThanOrEqual(pad.y);expect(pad.y+pad.height).toBeLessThanOrEqual(640);expect(board.height/board.width).toBe(2);
 await frame.getByRole('button',{name:'Hızlı indir',exact:true}).click();await expect(frame.locator('#mb-score')).not.toHaveText('0');
 await page.goBack();await expect(page.locator('iframe')).toHaveCount(0);await expect(page.locator('.model-nav')).toBeVisible();
});

for (const kind of ['pharmacy','duty'] as const) {
 test(`${kind} marker stays clickable through zoom, pan and partial or empty refresh`,async({page})=>{
  let hold=false,requests=0,phase='partial',release:()=>void=()=>{};
  const gate=new Promise<void>(resolve=>release=resolve);
  const a={type:'node',id:101,lat:origin.lat+.0002,lon:origin.lng,tags:{name:'A Eczanesi',amenity:'pharmacy'}};
  const b={...a,id:102,lat:origin.lat+.0008,lon:origin.lng+.001,tags:{name:'B Eczanesi',amenity:'pharmacy'}};
  const respond=async(route:Route,isDuty:boolean)=>{
   const delayed=hold;
   if(delayed){requests++;await gate;}
   const rows=!delayed?[a]:phase==='empty'?[]:phase==='tomorrow'?[{...b,id:103,tags:{name:'Yeni Gün Eczanesi',amenity:'pharmacy'}}]:[b];
   await route.fulfill({json:isDuty?{queryDate:'08/10/2026',source:'Test',pharmacies:rows.map(row=>({id:String(row.id),name:row.tags.name,latitude:row.lat,longitude:row.lon,address:'Test adresi'}))}:{elements:rows}});
  };
  await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
  await page.route('**/api/viewport?**',r=>respond(r,false));
  await page.route('**/api/duty?**',r=>respond(r,true));
  await page.route('https://tiles.openfreemap.org/styles/positron',r=>r.fulfill({json:{version:8,glyphs:'https://fonts.example/{fontstack}/{range}.pbf',sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#f7f5f1'}}]}}));
  await page.route('https://fonts.example/**',r=>r.fulfill({body:Buffer.alloc(0)}));
  await page.addInitScript(value=>localStorage.setItem('yakinim:v2:last-location',JSON.stringify({...value,savedAt:Date.now()})),origin);
  await page.goto('/');await page.getByRole('button',{name:'Eczane',exact:true}).click();
  if(kind==='duty')await page.getByRole('button',{name:'Nöbetçi',exact:true}).click();
  await expect(page.locator('.place-row')).toHaveCount(1);
  await page.getByRole('button',{name:'Harita',exact:true}).click();
  const marker=page.getByRole('button',{name:'A Eczanesi',exact:true});
  await expect(marker).toBeVisible();
  await expect(page.getByRole('img',{name:'Konumun'}).locator('img')).toHaveAttribute('src','/icons/icon.svg');
  expect((await page.getByRole('img',{name:'Konumun'}).boundingBox())?.width).toBe(40);
  await page.waitForTimeout(800);
  await marker.evaluate(element=>{
   element.setAttribute('data-proof','original');
   (window as any).markerGaps=[];
   const sample=()=>{
    if(!element.isConnected||element.getBoundingClientRect().width===0)(window as any).markerGaps.push(performance.now());
    (window as any).markerMonitor=requestAnimationFrame(sample);
   };sample();
  });
  hold=true;
  // A real zoom gesture plus a slight drag; inspect the actual touch target,
  // not merely the number of records React passed to the map component.
  await page.locator('.maplibregl-ctrl-zoom-in').click();
  if(kind==='pharmacy')await expect.poll(()=>requests).toBeGreaterThan(0);
  const box=await page.locator('.maplibregl-canvas').boundingBox();if(!box)throw Error('Map missing');
  await page.mouse.move(box.x+box.width*.6,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.6+(kind==='duty'?60:12),box.y+box.height*.4+8,{steps:6});await page.mouse.up();
  await expect.poll(()=>requests).toBeGreaterThan(0);
  await expect(marker).toHaveAttribute('data-proof','original');
  await marker.click();await expect(page.getByRole('complementary',{name:'A Eczanesi detayları'})).toBeVisible();
  const destination=new URL(await page.getByRole('link',{name:'Yol tarifi',exact:true}).getAttribute('href')||'').searchParams.get('destination');
  expect(destination).toBe(`${a.lat},${a.lon}`);
  release();
  await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count','2');
  await expect(marker).toHaveAttribute('data-proof','original');
  await expect(page.getByRole('complementary',{name:'A Eczanesi detayları'})).toBeVisible();
  await page.getByRole('button',{name:'Yer kartını kapat'}).click();
  phase='empty';const before=requests;
  await page.locator('.maplibregl-ctrl-zoom-in').click();
  if(kind==='duty'){await page.mouse.move(box.x+box.width*.6,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.4+100,{steps:10});await page.mouse.up();}
  await expect.poll(()=>requests).toBeGreaterThan(before);
  await page.waitForTimeout(600);
  await expect(marker).toHaveAttribute('data-proof','original');await marker.click();
  await expect(page.getByRole('complementary',{name:'A Eczanesi detayları'})).toBeVisible();
  expect(await page.evaluate(()=>{cancelAnimationFrame((window as any).markerMonitor);return (window as any).markerGaps;})).toEqual([]);
  if(kind==='duty'){
   phase='tomorrow';
   await page.getByRole('button',{name:'Yer kartını kapat'}).click();
   await page.clock.setFixedTime(new Date(Date.now()+86400000));
   await page.locator('.maplibregl-ctrl-zoom-in').click();
   await expect(page.getByRole('button',{name:'Yeni Gün Eczanesi',exact:true})).toBeVisible();
   await expect(marker).toHaveCount(0);
  }
 });
}

test('ATM is not labeled as a branch and its route follows a corrected coordinate',async({page})=>{
 let hold=false,release:()=>void=()=>{};const gate=new Promise<void>(resolve=>release=resolve);
 const first={type:'node',id:201,lat:origin.lat+.0003,lon:origin.lng,tags:{amenity:'atm',name:'Ziraat Bankası'}};
 const corrected={...first,lat:first.lat+.0001};let updates=0;
 await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
 await page.route('**/api/viewport?**',async r=>{if(hold){updates++;await gate;}await r.fulfill({json:{elements:[hold?corrected:first]}});});
 await page.route('https://tiles.openfreemap.org/styles/positron',r=>r.fulfill({json:{version:8,glyphs:'https://fonts.example/{fontstack}/{range}.pbf',sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#f7f5f1'}}]}}));
 await page.route('https://fonts.example/**',r=>r.fulfill({body:Buffer.alloc(0)}));
 await page.addInitScript(value=>localStorage.setItem('yakinim:v2:last-location',JSON.stringify({...value,savedAt:Date.now()})),origin);
 await page.goto('/');await page.getByRole('button',{name:'ATM',exact:true}).click();
 await expect(page.locator('.place-row')).toContainText('Ziraat Bankası ATM');
 await page.getByRole('button',{name:'Harita',exact:true}).click();const marker=page.getByRole('button',{name:'Ziraat Bankası ATM',exact:true});await expect(marker).toBeVisible();await page.waitForTimeout(800);
 hold=true;await page.locator('.maplibregl-ctrl-zoom-in').click();await expect.poll(()=>updates).toBeGreaterThan(0);
 await marker.click();await expect(page.getByRole('complementary',{name:'Ziraat Bankası ATM detayları'})).toContainText('OpenStreetMap');
 const destination=async()=>new URL(await page.getByRole('link',{name:'Yol tarifi',exact:true}).getAttribute('href')||'').searchParams.get('destination');
 expect(await destination()).toBe(`${first.lat},${first.lon}`);release();
 await expect.poll(destination).toBe(`${corrected.lat},${corrected.lon}`);
});

for(const mode of ['device','manual'] as const){
 test(`${mode} location handles saved coordinates correctly on reopening`,async({page})=>{
  const saved={lat:origin.lat+.01,lng:origin.lng};
  await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements}}));await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
  await page.addInitScript(value=>localStorage.setItem('yakinim:v2:last-location',JSON.stringify({...value,savedAt:Date.now()})),{...saved,mode});
  await page.goto('/');await expect(page.locator('.place-row')).toHaveCount(2);
  const latitude=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yakinim:v2:last-location')||'{}').lat);
  if(mode==='device')await expect.poll(latitude).toBe(origin.lat);
  else{await page.waitForTimeout(600);expect(await latitude()).toBe(saved.lat);}
 });
}

test('reported absent Akbank ATM is excluded even from a cached provider response',async({page})=>{
 await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements:[]}}));
 await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[
  {id:'overture:73208e05-796d-44c1-acce-814c39c0ba06',name:'Akbank ATM',category:'atm',lat:36.89544412961155,lng:30.685742497444153,address:'Yıldız Mahallesi Hamidiye Caddesi No:53, Antalya'},
  {id:'another-akbank',name:'Akbank ATM',category:'atm',...origin,address:'Başka adres'}
 ]}}));
 await page.addInitScript(value=>localStorage.setItem('yakinim:v2:last-location',JSON.stringify({...value,savedAt:Date.now()})),origin);
 await page.goto('/');await page.getByRole('button',{name:'ATM',exact:true}).click();await expect(page.locator('.place-row')).toHaveCount(1);await expect(page.locator('.place-row')).toContainText('Başka adres');
});

test('games fit the mobile width, blocks start full height and new games respond',async({page})=>{
 await page.goto('/?preview');await page.getByRole('button',{name:'Oyun',exact:true}).click();
 await page.getByRole('button',{name:'Düşen Bloklar Bulmaca'}).click();
 const blocks=page.frameLocator('iframe');
 await expect.poll(async()=> (await blocks.locator('.board-frame').boundingBox())?.height||0).toBeGreaterThan(300);
 await expect(blocks.getByRole('button',{name:'Başla',exact:true})).toBeVisible();
 await page.goBack();
 for(const [name,selector] of [['2048 Sayı oyunu','.game-container'],['Hafıza Desen eşleştirme','#game-container']] as const){
  await page.getByRole('button',{name}).click();const frame=page.frameLocator('iframe');
  if(name.startsWith('Hafıza'))await frame.getByRole('button',{name:'Bölüm 1',exact:true}).click();
  const box=await frame.locator(selector).boundingBox();expect(box?.width).toBeGreaterThan(page.viewportSize()!.width-40);expect(box!.y+box!.height).toBeLessThan(page.viewportSize()!.height);
  if(name.startsWith('2048')){await frame.locator('.game-container').click();await page.keyboard.press('ArrowLeft');await expect(frame.locator('.tile').first()).toBeVisible();}
  await page.goBack();
 }
 await page.getByRole('button',{name:'Yılan Kaydırarak oyna'}).click();const snake=page.frameLocator('iframe');
 await snake.getByRole('button',{name:'Başla',exact:true}).click();await expect(snake.locator('#score')).toContainText('elma');await snake.getByRole('button',{name:'Yukarı',exact:true}).click();
 await page.goBack();await page.getByRole('button',{name:'Mayın Tarlası Mantık oyunu'}).click();const mines=page.frameLocator('iframe');
 await expect(mines.locator('.cell')).toHaveCount(64);await mines.locator('.cell').first().click();await expect(mines.locator('.cell.bomb')).toHaveCount(0);await expect(mines.locator('.cell.open').first()).toBeVisible();
 await mines.getByRole('button',{name:'Bayrak koy'}).click();await mines.locator('.cell:not(.open)').first().click();await expect(mines.locator('#score')).toHaveText('9 mayın');
});

test('radio media actions publish metadata, disconnect on pause and stop without closing app',async({page})=>{
 await page.addInitScript(()=>{
  const actions:Record<string,MediaSessionActionHandler|null>={};
  navigator.mediaSession.setActionHandler=(action,handler)=>{actions[action]=handler;};
  (window as any).mediaActions=actions;
  HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('playing'));return Promise.resolve();};
  HTMLMediaElement.prototype.pause=function(){this.dispatchEvent(new Event('pause'));};
  HTMLMediaElement.prototype.load=function(){};
 });
 await page.route('**/api/radio?**',r=>r.fulfill({json:{stations:[{id:'test',name:'Test FM',streamUrl:'https://radio.example/live',codec:'MP3'}]}}));
 await page.goto('/?preview');await page.getByRole('button',{name:'Radyo',exact:true}).click();await page.locator('.station-card').first().click();
 await expect.poll(()=>page.evaluate(()=>navigator.mediaSession.metadata?.title)).toBe('Test FM');
 await page.evaluate(()=>(window as any).mediaActions.pause());await expect(page.locator('audio')).not.toHaveAttribute('src');
 await expect(page.locator('.player-copy')).toContainText('Duraklatıldı');
 await page.evaluate(()=>(window as any).mediaActions.play());await expect(page.locator('audio')).toHaveAttribute('src','https://radio.example/live');
 await page.evaluate(()=>(window as any).mediaActions.stop());await expect(page.locator('.global-radio-player')).toHaveCount(0);await expect(page.locator('.model-nav')).toBeVisible();
 expect(await page.evaluate(()=>navigator.mediaSession.metadata)).toBeNull();
});

test('notification switches stations in both directions and the radio map stays within viewport',async({page})=>{
 await page.setViewportSize({width:360,height:640});
 await page.addInitScript(()=>{
  const actions:Record<string,MediaSessionActionHandler|null>={};navigator.mediaSession.setActionHandler=(a,h)=>{actions[a]=h;};(window as any).mediaActions=actions;
  HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('playing'));return Promise.resolve();};HTMLMediaElement.prototype.pause=function(){this.dispatchEvent(new Event('pause'));};HTMLMediaElement.prototype.load=function(){};
 });
 await page.route('**/api/radio?**',r=>r.fulfill({json:{stations:[1,2,3].map(n=>({id:String(n),name:`Radyo ${n}`,streamUrl:`https://radio.example/${n}`,codec:'MP3'}))}}));
 await page.route('https://tiles.openfreemap.org/styles/positron',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'bg',type:'background',paint:{'background-color':'#f7f5f1'}}]}}));
 await page.goto('/?preview');await page.getByRole('button',{name:'Radyo',exact:true}).click();await page.locator('.station-card').first().click();
 await expect.poll(()=>page.evaluate(()=>navigator.mediaSession.metadata?.title)).toBe('Radyo 1');
 await page.evaluate(()=>(window as any).mediaActions.nexttrack());await expect.poll(()=>page.evaluate(()=>navigator.mediaSession.metadata?.title)).toBe('Radyo 2');
 await page.evaluate(()=>(window as any).mediaActions.previoustrack());await expect.poll(()=>page.evaluate(()=>navigator.mediaSession.metadata?.title)).toBe('Radyo 1');
 await page.evaluate(()=>(window as any).mediaActions.previoustrack());await expect.poll(()=>page.evaluate(()=>navigator.mediaSession.metadata?.title)).toBe('Radyo 3');
 await page.getByRole('button',{name:'Keşfet',exact:true}).click();await page.getByRole('button',{name:'Eczane',exact:true}).click();await page.getByRole('button',{name:'Harita',exact:true}).click();
 await expect(page.getByRole('button',{name:'Örnek Eczane',exact:true})).toBeVisible();await page.getByRole('button',{name:'Örnek Eczane',exact:true}).click();
 const sheet=await page.locator('.map-place-sheet').boundingBox(),player=await page.locator('.global-radio-player').boundingBox(),nav=await page.locator('.model-nav').boundingBox();
 expect(sheet!.y+sheet!.height).toBeLessThanOrEqual(player!.y+1);expect(player!.y+player!.height).toBeLessThanOrEqual(nav!.y+1);
 expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(640);
 await page.getByRole('button',{name:'Sonraki radyo',exact:true}).click();await expect(page.locator('.player-copy')).toContainText('Radyo 1');
 await page.getByRole('button',{name:'Radyo oynatıcıyı kapat',exact:true}).click();
 await expect.poll(async()=>{
  const canvas=await page.locator('.maplibregl-canvas').boundingBox(),container=await page.locator('.map-canvas').boundingBox();
  return Math.abs(canvas!.height-container!.height);
 }).toBeLessThan(1);
 await expect(page.locator('.map-place-sheet')).toContainText('Örnek Eczane');
});

test('blocks settings save inside the sandbox and survive re-opening the game',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().includes('Blocked form'))errors.push(m.text());});
 await page.goto('/?preview');await page.getByRole('button',{name:'Oyun',exact:true}).click();await page.getByRole('button',{name:'Düşen Bloklar Bulmaca'}).click();const f=page.frameLocator('iframe');
 await f.getByRole('button',{name:'Başla',exact:true}).click();await f.locator('#btn-settings-mobile').click();
 await f.getByLabel('Modern',{exact:true}).check();await f.getByLabel('Koyu',{exact:true}).check();await f.getByLabel('Oyun sesleri',{exact:true}).check();await f.getByRole('button',{name:'Kaydet',exact:true}).click();
 await expect(f.locator('#settings-dialog')).not.toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('tetris:settings')||'{}'))).toMatchObject({theme:'modern',mode:'dark',sfx:true});
 await page.goBack();await page.getByRole('button',{name:'Düşen Bloklar Bulmaca'}).click();await f.getByRole('button',{name:'Başla',exact:true}).click();await f.locator('#btn-settings-mobile').click();
 await expect(f.getByLabel('Modern',{exact:true})).toBeChecked();await expect(f.getByLabel('Koyu',{exact:true})).toBeChecked();await expect(f.getByLabel('Oyun sesleri',{exact:true})).toBeChecked();
 const dialog=await f.locator('#settings-dialog').boundingBox();expect(dialog!.y).toBeGreaterThanOrEqual(0);expect(dialog!.y+dialog!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
 expect(errors).toEqual([]);
});

test('memory advances chapters, keeps progress after reload and has equal cells after returning',async({page})=>{
 await page.goto('/?preview');await page.getByRole('button',{name:'Oyun',exact:true}).click();await page.getByRole('button',{name:'Hafıza Desen eşleştirme'}).click();const f=page.frameLocator('iframe');
 await expect(f.locator('.level')).toHaveCount(30);await expect(f.getByRole('button',{name:'Bölüm 2',exact:true})).toHaveCount(0);
 await f.getByRole('button',{name:'Bölüm 1',exact:true}).click();await expect(f.locator('.field.lit')).toHaveCount(3);
 const targets=await f.locator('.field').evaluateAll(cells=>cells.map((c,i)=>c.classList.contains('lit')?i:-1).filter(i=>i>=0));
 await expect(f.locator('.field').first()).toBeEnabled();for(const index of targets)await f.locator('.field').nth(index).click();
 await expect(f.locator('#result-title')).toHaveText('Bölüm 1 tamam!');await f.getByRole('button',{name:'Sonraki bölüm',exact:true}).click();await expect(f.locator('#level-label')).toHaveText('Bölüm 2');
 await f.getByRole('button',{name:'Bölümler',exact:true}).click();const top=await f.locator('.level').first().boundingBox(),below=await f.locator('.level').nth(5).boundingBox();expect(below!.y-top!.y-top!.height).toBeGreaterThanOrEqual(9);
 await page.locator('iframe').evaluate((iframe:HTMLIFrameElement)=>iframe.contentWindow!.location.reload());await expect(f.getByRole('button',{name:'Bölüm 2',exact:true})).toBeEnabled();
 await f.getByRole('button',{name:'Bölüm 2',exact:true}).click();const rects=await f.locator('.field').evaluateAll(cells=>cells.map(c=>({w:c.getBoundingClientRect().width,h:c.getBoundingClientRect().height})));expect(Math.max(...rects.map(r=>r.h))-Math.min(...rects.map(r=>r.h))).toBeLessThan(1);expect(rects[0].h).toBeGreaterThan(40);
});

test('mines retain square, equal rows after opening numbers on a short phone',async({page})=>{
 await page.setViewportSize({width:360,height:640});await page.goto('/?preview');await page.getByRole('button',{name:'Oyun',exact:true}).click();await page.getByRole('button',{name:'Mayın Tarlası Mantık oyunu'}).click();const f=page.frameLocator('iframe');await f.locator('.cell').first().click();await expect(f.locator('.cell.open').first()).toBeVisible();
 const rects=await f.locator('.cell').evaluateAll(cells=>cells.map(c=>{const r=c.getBoundingClientRect();return{w:r.width,h:r.height,bottom:r.bottom};}));expect(Math.max(...rects.map(r=>r.h))-Math.min(...rects.map(r=>r.h))).toBeLessThan(1);expect(Math.abs(rects[0].h-rects[0].w)).toBeLessThan(1);expect(rects.at(-1)!.h).toBeGreaterThan(30);
 const board=await f.locator('#board').boundingBox();expect(board!.y+board!.height).toBeLessThan(640);
});

test('snake earns a chapter, unlocks the next and pauses without resetting the board',async({page})=>{
 await page.addInitScript(()=>{Math.random=()=>0;});await page.clock.install();await page.goto('/games/snake/index.html');await page.clock.pauseAt(new Date(Date.now()+1000));
 await page.getByRole('button',{name:'Başla',exact:true}).click();
 const turn=async(name:string,ticks:number)=>{await page.getByRole('button',{name,exact:true}).click();await page.clock.runFor(220*ticks+17);};
 await turn('Yukarı',9);await turn('Sola',8);await expect(page.locator('#score')).toContainText('1 / 5');
 await turn('Aşağı',1);await turn('Sağa',4);await turn('Yukarı',1);await expect(page.locator('#score')).toContainText('2 / 5');
 await turn('Sola',4);await expect(page.locator('#score')).toContainText('3 / 5');
 await turn('Aşağı',1);await turn('Sağa',5);await turn('Yukarı',1);await expect(page.locator('#score')).toContainText('4 / 5');
 await turn('Sola',5);await expect(page.locator('#title')).toHaveText('Bölüm 1 tamam!');await page.getByRole('button',{name:'Sonraki bölüm',exact:true}).click();await expect(page.locator('#level')).toHaveText('Bölüm 2');
 await page.getByRole('button',{name:'Oyunu duraklat',exact:true}).click();const before=await page.locator('#board').evaluate((c:HTMLCanvasElement)=>c.toDataURL());await page.clock.runFor(5000);expect(await page.locator('#board').evaluate((c:HTMLCanvasElement)=>c.toDataURL())).toBe(before);
 await page.getByRole('button',{name:'Devam et',exact:true}).click();await expect(page.locator('#overlay')).not.toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('yakinim:snake:v2')||'{}').unlocked)).toBe(2);
});

for(const permissionMode of ['prompt','unsupported'] as const){
 test(`Safari ${permissionMode} permission state does not block saved GPS refresh`,async({page})=>{
  await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements}}));await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
  await page.addInitScript(mode=>{
   localStorage.setItem('yakinim:v2:last-location',JSON.stringify({lat:36.8,lng:30.7,mode:'device',savedAt:Date.now()}));
   Object.defineProperty(navigator,'permissions',{value:mode==='unsupported'?undefined:{query:async()=>({state:'prompt'})},configurable:true});
   Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(success:PositionCallback)=>success({coords:{latitude:36.884,longitude:30.704}} as GeolocationPosition)},configurable:true});
  },permissionMode);
  await page.goto('/');await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yakinim:v2:last-location')||'{}').lat)).toBe(36.884);
 });
}
test('denied location stays visible with cached coordinates and does not retry permission',async({page})=>{
 await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements}}));await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
 await page.addInitScript(()=>{
  localStorage.setItem('yakinim:v2:last-location',JSON.stringify({lat:36.884,lng:30.704,mode:'manual',savedAt:Date.now()}));
  (window as any).gpsCalls=0;
  Object.defineProperty(navigator,'permissions',{value:{query:async()=>({state:'prompt'})},configurable:true});
  Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(_:PositionCallback,error:PositionErrorCallback)=>{(window as any).gpsCalls++;error({code:1} as GeolocationPositionError);}},configurable:true});
 });
 await page.goto('/');await page.getByRole('button',{name:'Konumumu bul'}).click();
 await expect(page.getByRole('alert')).toContainText('Konum Servisleri');expect(await page.evaluate(()=>(window as any).gpsCalls)).toBe(1);
 await expect(page.getByRole('button',{name:'Konumumu bul'})).toBeEnabled();await page.getByRole('button',{name:'Haritadan seç',exact:true}).click();await expect(page.getByRole('alert')).toHaveCount(0);
});
test('unavailable high accuracy GPS falls back to a fresh normal accuracy request',async({page})=>{
 await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements}}));await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
 await page.addInitScript(()=>{
  (window as any).gpsOptions=[];
  Object.defineProperty(navigator,'permissions',{value:undefined,configurable:true});
  Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(success:PositionCallback,error:PositionErrorCallback,options:PositionOptions)=>{(window as any).gpsOptions.push(options);if(options.enableHighAccuracy)error({code:3} as GeolocationPositionError);else success({coords:{latitude:36.884,longitude:30.704}} as GeolocationPosition);}},configurable:true});
 });
 await page.goto('/');await page.getByRole('button',{name:'Konumumu bul'}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yakinim:v2:last-location')||'{}').lat)).toBe(36.884);
 expect(await page.evaluate(()=>(window as any).gpsOptions.map((o:PositionOptions)=>[o.enableHighAccuracy,o.maximumAge]))).toEqual([[true,0],[false,0]]);
});

test('Antalya transit pilot retains source direction and opens route stops',async({page})=>{
 const stop={id:'10027',name:'Gazi Lisesi',lat:36.8888,lng:30.6841,routes:['AC03','KL08'],distanceM:620};
 const requests:string[]=[];
 await page.route('**/api/transit?**',async r=>{const u=new URL(r.request().url());requests.push(u.search);if(u.searchParams.get('action')==='arrivals')return r.fulfill({json:{fresh:true,sourceAt:new Date().toISOString(),buses:[{id:'75805',code:'AC03',name:'MINICITY - AKSU',direction:1,minutes:4,stops:3}]}});if(u.searchParams.get('action')==='route')return r.fulfill({json:{name:'MINICITY - AKSU',stops:[stop,{...stop,id:'10028',name:'Sonraki Durak'}]}});return r.fulfill({json:{stops:[stop],coverage:['AC03','KL08'],partial:false}});});
 await page.goto('/?preview');await page.getByRole('button',{name:'Ulaşım',exact:true}).click();await page.getByRole('button',{name:/Gazi Lisesi/}).click();await expect(page.locator('.stop-route-list')).not.toHaveAttribute('open','');await expect(page.getByRole('button',{name:'Otobüsleri yenile'})).toBeVisible();await expect(page.locator('.bus-row')).toContainText('4 dk');await expect(page.locator('.bus-row')).toContainText('Tahmini');await page.locator('.bus-row').click();await expect(page.locator('.route-stops li')).toHaveCount(2);expect(requests.some(q=>q.includes('direction=1'))).toBe(true);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false);
 await page.getByRole('button',{name:'Durağa dön'}).click();await expect(page.getByRole('link',{name:'Durağa yol tarifi'})).toHaveAttribute('href',/destination=36.8888,30.6841/);
});
test('stale transit data never advertises an arrival countdown',async({page})=>{
 await page.route('**/api/transit?**',r=>{const a=new URL(r.request().url()).searchParams.get('action');return r.fulfill({json:a==='arrivals'?{fresh:false,sourceAt:'2026-01-01T00:00:00Z',buses:[{id:'1',code:'KL08',direction:0,minutes:2,stops:2}]}:{stops:[{id:'10027',name:'Gazi Lisesi',lat:36.88,lng:30.68,routes:['KL08'],distanceM:120}],coverage:['KL08']}});});
 await page.goto('/?preview');await page.getByRole('button',{name:'Ulaşım',exact:true}).click();await page.getByRole('button',{name:/Gazi Lisesi/}).click();await expect(page.getByRole('alert')).toContainText('Kaynak güncel değil');await expect(page.locator('.bus-row')).toHaveCount(0);
});
test('events show verified dates and hide expired records without requiring GPS',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'permissions',{value:{query:async()=>({state:'prompt'})},configurable:true}));
 const now=new Date(),date=new Date(now.getTime()+2*86400000).toISOString(),end=new Date(now.getTime()+3*86400000).toISOString();
 await page.route('**/api/events',r=>r.fulfill({json:{items:[{id:'current',title:'Pilot Etkinliği',startsAt:date,endsAt:end,venue:'Cam Piramit',hours:'10:00–20:00',url:'https://kitapfuari.antalya.bel.tr/',directionsUrl:'https://www.google.com/maps/dir/?api=1&destination=Cam+Piramit',source:'Antalya Büyükşehir Belediyesi',price:null},{id:'expired',title:'Geçmiş Etkinlik',startsAt:'2025-01-01T00:00:00+03:00',endsAt:'2025-01-02T00:00:00+03:00',url:'https://kitapfuari.antalya.bel.tr/'}],coverage:'Kitap Fuarı'}}));
 await page.goto('/');await page.getByRole('button',{name:'Etkinlik',exact:true}).click();await expect(page.getByRole('heading',{name:'Pilot Etkinliği'})).toBeVisible();await expect(page.getByText('Geçmiş Etkinlik')).toHaveCount(0);await expect(page.getByRole('link',{name:'Kaynak / bilet'})).toHaveAttribute('href','https://kitapfuari.antalya.bel.tr/');await page.getByRole('button',{name:'Bugün',exact:true}).click();await expect(page.locator('.event-card')).toHaveCount(0);await page.getByRole('button',{name:'7 gün',exact:true}).click();await expect(page.locator('.event-card')).toHaveCount(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('market prices compare exact products in nearby branches inside the app',async({page})=>{
 await page.route('**/api/prices?**',r=>r.fulfill({json:{products:[{id:'milk',title:'İçim Süt 1 Lt',quantity:'1 LT',offers:[{id:'carrefour-3287',name:'Antalya Muratpaşa Çağlayan Süp',market:'carrefour',lat:36.857597,lng:30.77149,distanceM:1242,price:65.95,unitPrice:'65,95 ₺/Lt',updatedAt:new Date().toISOString(),promotion:null},{id:'migros-4945',name:'Mjet Lara Fener Antalya',market:'migros',lat:36.85415,lng:30.755404,distanceM:285,price:69.5,unitPrice:'69,50 ₺/Lt',updatedAt:new Date().toISOString(),promotion:null}]}],depotCount:25,total:1,hasMore:false,radius:3}}));
 await page.goto('/?preview');await page.getByRole('button',{name:'Ürün fiyatları',exact:true}).click();await page.getByRole('textbox',{name:'Ürün ara',exact:true}).fill('süt');
 await expect(page.getByRole('heading',{name:'İçim Süt 1 Lt'})).toBeVisible();await expect(page.locator('.product-offer')).toHaveCount(2);await expect(page.locator('.offer-price').first()).toContainText('65,95');await expect(page.locator('.product-offer').first()).toContainText('Antalya Muratpaşa Çağlayan');await expect(page.getByRole('link',{name:'Market Fiyatı’nda ara'})).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Marketler',exact:true}).click();await expect(page.locator('.place-row')).toHaveCount(1);
});

test('transit map opens arrivals and section search stays above categories',async({page})=>{
 const stop={id:'11265',name:'TONGUÇ CD-6',lat:36.8615,lng:30.6377,routes:['511'],distanceM:0};
 await page.route('https://tiles.openfreemap.org/styles/positron',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#f7f5f1'}}]}}));
 await page.route('**/api/transit?**',r=>r.fulfill({json:new URL(r.request().url()).searchParams.get('action')==='arrivals'?{fresh:true,sourceAt:new Date().toISOString(),buses:[{id:'bus',code:'511',name:'Test güzergahı',direction:0,minutes:3,stops:2}]}:{stops:[stop],coverage:['511'],partial:false}}));
 await page.goto('/?preview');await page.getByRole('button',{name:'Ulaşım',exact:true}).click();
 const search=page.getByRole('textbox',{name:'Durak veya hat ara'});await expect(search).toBeVisible();
 expect(await search.evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(await page.locator('.category-rail').evaluate(el=>el.getBoundingClientRect().top));
 await page.getByRole('button',{name:'Harita',exact:true}).click();await page.locator('.stable-place-marker button').click();await expect(page.locator('.stop-row')).toHaveCount(0);await expect(page.locator('.map-stop-details')).not.toHaveAttribute('open','');await expect.poll(async()=>{const pin=await page.locator('.stable-place-marker button').boundingBox();const sheet=await page.locator('.map-place-sheet').boundingBox();return !!pin&&!!sheet&&pin.y+pin.height<sheet.y;}).toBe(true);await page.getByRole('button',{name:'Yaklaşan otobüsler',exact:true}).click();await expect(page.locator('.bus-row')).toContainText('3 dk');
 await page.goBack();await expect(page.locator('.pilot-map')).toBeVisible();await expect(page.locator('.map-place-sheet')).toContainText('TONGUÇ CD-6');
});

test('prices open with basics and search remains sticky while scrolling',async({page})=>{
 const queries:string[]=[];
 await page.route('**/api/prices?**',r=>{queries.push(new URL(r.request().url()).searchParams.get('q')||'');return r.fulfill({json:{products:Array.from({length:12},(_,i)=>({id:String(i),title:'Temel ürün '+i,quantity:'1 LT',offers:[{id:'migros-1',name:'Antalya Şube',market:'migros',lat:36.85,lng:30.75,distanceM:200,price:50,unitPrice:'50 ₺/Lt',updatedAt:new Date().toISOString()}]})),depotCount:1,total:12,hasMore:false,radius:3}});});
 await page.goto('/?preview');await page.getByRole('button',{name:'Ürün fiyatları',exact:true}).click();await expect(page.locator('.product-price-card')).toHaveCount(12);expect(queries[0]).toBe('');await page.evaluate(()=>window.scrollTo(0,800));
 const search=page.getByRole('textbox',{name:'Ürün ara'});expect(await search.evaluate(el=>el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(74);expect(await search.evaluate(el=>el.getBoundingClientRect().top)).toBeLessThan(140);await search.fill('kahve');await expect.poll(()=>queries.includes('kahve')).toBe(true);
});
