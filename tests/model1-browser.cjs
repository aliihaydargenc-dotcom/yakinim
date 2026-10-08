const {chromium:pw}=require('playwright');

const assert=require('node:assert/strict');
(async()=>{
 const server=require('node:child_process').spawn('node',['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4173'],{stdio:'ignore'});
 process.on('exit',()=>server.kill());
 await new Promise(r=>setTimeout(r,1000));
 require('node:fs').mkdirSync('test-results',{recursive:true});
 const browser=await pw.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],headless:true});
 for(const width of [360,390]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/news?*',r=>r.fulfill({json:{items:[{id:'n1',title:'Kontrol haberi',source:'Kaynak',url:'https://example.com',publishedAt:new Date().toISOString()}]}}));
  await page.route('**/api/radio?*',r=>r.fulfill({json:{stations:[{id:'r1',name:'Test Radyo',streamUrl:'https://example.com/audio.mp3',codec:'MP3'}]}}));
  await page.goto('http://127.0.0.1:4173/?preview');await page.getByRole('button',{name:'Market',exact:true}).waitFor();
  assert.equal(await page.locator('.map-canvas').count(),0,'List first; map not loaded');
  assert.ok(await page.locator('.place-row').count());
  await page.getByRole('button',{name:'Eczane',exact:true}).click();await page.getByRole('button',{name:'Nöbetçi',exact:true}).waitFor();
  assert.equal(await page.locator('.category-rail').getByText('Nöbetçi').count(),0,'Duty only as subfilter');
  await page.screenshot({path:`test-results/model1-${width}-discover.png`});
  await page.getByRole('button',{name:'Haber',exact:true}).click();await page.getByText('Kontrol haberi').waitFor();
  await page.getByRole('button',{name:'Radyo',exact:true}).click();await page.getByText('Test Radyo',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Oyun',exact:true}).click();
  for(const title of ['2048','Hafıza','Düşen Bloklar']){
   await page.getByRole('button',{name:new RegExp(title)}).click();const frame=page.frameLocator('iframe');await frame.locator('body').waitFor();await page.waitForTimeout(300);
   if(title==='2048'){await frame.locator('.tile').first().waitFor();assert.ok(await frame.locator('.tile').count()>=2);await frame.locator('body').click({position:{x:10,y:10}});await page.keyboard.press('ArrowRight');}
   if(title==='Hafıza'){await frame.getByRole('button',{name:'Bölüm 1',exact:true}).click();await frame.locator('#game-container').waitFor();}
   if(title==='Düşen Bloklar'){await frame.locator('#game-canvas').waitFor();await frame.getByRole('button',{name:'Başla',exact:true}).click();await frame.locator('.vpad').waitFor({state:'visible'});const rect=await frame.locator('.vpad').boundingBox();assert.ok(rect.height>0);const board=await frame.locator('#game-canvas').boundingBox();assert.ok(board.height>300&&board.width>140,'Board uses the available screen');assert.ok(board.y+board.height<=rect.y,'Touch pad must be below the entire board');assert.ok(rect.y+rect.height<=844,'Pad fits viewport');assert.equal(await page.locator('.model-nav').count(),0,'Navigation hidden during game');}
   await page.screenshot({path:`test-results/model1-${width}-${title==='2048'?'2048':title==='Hafıza'?'memory':'blocks'}.png`});
   await page.getByRole('button',{name:'Oyunlara dön'}).click();
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');
  assert.deepEqual(errors,[],'No browser runtime errors');await context.close();console.log(width,'PASS');
 }
 await browser.close();server.kill();
})().catch(e=>{console.error(e);process.exit(1)});
