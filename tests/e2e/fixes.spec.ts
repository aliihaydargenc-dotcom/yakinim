import {test,expect} from '@playwright/test';
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
