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
  if(name.startsWith('Hafıza'))await frame.getByRole('button',{name:'Orta',exact:true}).click();
  const box=await frame.locator(selector).boundingBox();expect(box?.width).toBeGreaterThan(page.viewportSize()!.width-40);expect(box!.y+box!.height).toBeLessThan(page.viewportSize()!.height);
  if(name.startsWith('2048')){await frame.locator('.game-container').click();await page.keyboard.press('ArrowLeft');await expect(frame.locator('.tile').first()).toBeVisible();}
  await page.goBack();
 }
 await page.getByRole('button',{name:'Yılan Kaydırarak oyna'}).click();const snake=page.frameLocator('iframe');
 await snake.getByRole('button',{name:'Başla',exact:true}).click();await expect(snake.locator('#status')).toContainText('Kaydır');await snake.getByRole('button',{name:'Yukarı',exact:true}).click();
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
