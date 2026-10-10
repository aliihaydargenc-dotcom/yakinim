import {test,expect,type Page} from '@playwright/test';
test.use({permissions:[]});
const nav=(p:Page)=>p.locator('.shell-nav--mobile');
const origin={lat:36.884,lng:30.704};
const storeLocation=async(p:Page)=>p.addInitScript(c=>localStorage.setItem('yakinim:v2:last-location',JSON.stringify({...c,mode:'manual',savedAt:Date.now()})),origin);
const openPlaces=async(p:Page)=>{await nav(p).getByRole('button',{name:'Hizmetler'}).click();await p.locator('.service-category-grid').getByRole('button',{name:'Marketler',exact:true}).click();};
test.beforeEach(async({page})=>{
 await page.route('https://tiles.openfreemap.org/styles/liberty',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#e8f4ee'}}]}}));
 await page.route('**/api/location?**',r=>r.fulfill({json:{label:'Muratpaşa, Antalya',province:'Antalya'}}));
 await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements:Array.from({length:12},(_,i)=>({type:'node',id:i+1,lat:origin.lat+i*.0001,lon:origin.lng+i*.0001,tags:{shop:'supermarket',name:`Mahalle Marketi ${i+1}`}}))}}));
 await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
 await page.route('**/api/nearby?**',r=>r.fulfill({json:{elements:[],places:[]}}));
 await page.route('**/api/transit?**',r=>{const action=new URL(r.request().url()).searchParams.get('action');return r.fulfill({json:action==='arrivals'?{fresh:true,sourceAt:new Date().toISOString(),buses:[{id:'one',code:'511',name:'Sahil',direction:0,minutes:4,stops:2}]}:action==='route'?{name:'Sahil',stops:[{id:'11265',name:'ANTALYA DURAK',lat:origin.lat,lng:origin.lng,routes:['511'],distanceM:0}]}:{stops:[{id:'11265',name:'ANTALYA DURAK',lat:origin.lat,lng:origin.lng,routes:['511'],distanceM:0}],coverage:['Antalya'],partial:false}});});
 await page.route('**/api/events?**',r=>r.fulfill({json:{items:[{id:'one',title:'Tarihi doğrulanmamış etkinlik',startsAt:null,endsAt:null,venue:null,source:'Etkinlik.io',url:'https://etkinlik.io/etkinlik/123/test'}],coverage:'Antalya',fetchedAt:new Date().toISOString(),partial:true}}));
});
test('Keşfet is a full map with no search, weather, category rail or nearby list',async({page})=>{
 let calls=0;page.on('request',r=>{if(/\/api\/(viewport|overture|transit|weather)\?/.test(r.url()))calls++;});
 await page.goto('/');await expect(page.locator('.map-stage')).toBeVisible();await expect(page.locator('.location-label')).toHaveText('Konum seç');
 await expect(page.locator('.place-row,.category-navigation,.weather-summary,.unified-search')).toHaveCount(0);
 const map=await page.locator('.map-canvas').boundingBox(),bottom=await nav(page).boundingBox();
 expect(map!.width).toBe(await page.evaluate(()=>innerWidth));expect(map!.height).toBeGreaterThan(600);expect(map!.y+map!.height).toBeLessThanOrEqual(bottom!.y+1);expect(calls).toBe(0);
});
test('home shows at most two nearby places per category and has a small location dot',async({page})=>{
 await storeLocation(page);await page.goto('/');await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count','2');
 await expect.poll(async()=>Number(await page.locator('.map-canvas').getAttribute('data-map-zoom'))).toBeGreaterThanOrEqual(15);
 const marker=await page.locator('.user-marker').boundingBox();expect(marker!.width).toBeLessThanOrEqual(18);
 await expect(page.locator('.user-marker img,.map-unified-sheet')).toHaveCount(0);await expect(page.locator('.location-label')).toHaveText('Muratpaşa, Antalya');
});
test('location control opens one sheet; manual choice returns to the home map',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Konum',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Konum',exact:true});await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'Haritadan seç',exact:true}).click();await expect(dialog).not.toBeVisible();
 const canvas=page.locator('.maplibregl-canvas');await expect(page.getByText('Haritada istediğin noktaya dokun')).toBeVisible();await canvas.click({position:{x:180,y:180}});
 await expect(page.getByText('Haritada istediğin noktaya dokun')).toHaveCount(0);await expect(page.locator('.map-stage')).toBeVisible();await expect(page.locator('.user-marker')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('yakinim:v2:last-location')!).mode)).toBe('manual');
 await page.getByRole('button',{name:'Konum',exact:true}).click();await dialog.getByRole('button',{name:'Konumu sil'}).click();await expect(page.locator('.user-marker')).toHaveCount(0);await expect(page.locator('.location-label')).toHaveText('Konum seç');
});
test('place search lives in services, preserves all results and supports save and back',async({page})=>{
 await storeLocation(page);await page.goto('/');await openPlaces(page);await expect(page.locator('.place-row')).toHaveCount(12);
 await page.locator('.place-row').last().scrollIntoViewIfNeeded();const last=await page.locator('.place-row').last().boundingBox(),bottom=await nav(page).boundingBox();expect(last!.y+last!.height).toBeLessThanOrEqual(bottom!.y+1);
 await page.locator('.place-row').last().click();const dialog=page.getByRole('dialog',{name:'Mahalle Marketi 12'});await expect(dialog).toBeVisible();await expect(dialog).not.toContainText('kuş uçuşu');
 await dialog.getByRole('button',{name:'Yeri kaydet'}).click();await page.goBack();await expect(dialog).not.toBeVisible();await expect(page.locator('.place-row')).toHaveCount(12);
 await nav(page).getByRole('button',{name:'Kaydedilen'}).click();await expect(page.locator('.shell-saved-place')).toContainText('Mahalle Marketi 12');
});
test('services search submits the typed term and back restores services',async({page})=>{
 await storeLocation(page);await page.goto('/');await nav(page).getByRole('button',{name:'Hizmetler'}).click();await page.getByRole('textbox',{name:'Yer ara'}).fill('Mahalle Marketi 12');await page.getByRole('button',{name:'Ara',exact:true}).click();await expect(page.locator('.place-row')).toHaveCount(1);
 await page.getByRole('button',{name:'Hizmetlere dön'}).click();await expect(page.getByRole('heading',{name:'Hizmetler',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Trafik',exact:true})).toHaveCount(0);
});
test('events keep city choice and unknown dates without coverage prose',async({page})=>{
 await storeLocation(page);await page.goto('/');await nav(page).getByRole('button',{name:'Hizmetler'}).click();await page.getByRole('button',{name:'Etkinlikler',exact:true}).click();
 await expect(page.locator('.event-card')).toContainText('Tarih yok');await expect(page.locator('.category-navigation')).toHaveCount(0);await expect(page.locator('.pilot-panel')).not.toContainText(/Kapsam:|Bazı etkinlik|doğrulanmadı/);
 await page.getByRole('textbox',{name:'Etkinlik ara'}).fill('bulunmayan');await expect(page.locator('.event-card')).toHaveCount(0);await page.goBack();await expect(page.locator('.shell-service-grid')).toBeVisible();
 await page.getByRole('button',{name:'Etkinlikler',exact:true}).click();await expect(page.getByRole('textbox',{name:'Etkinlik ara'})).toHaveValue('');
 await nav(page).getByRole('button',{name:'Keşfet'}).click();await expect(page.locator('.map-stage')).toBeVisible();await expect(page.getByRole('textbox')).toHaveCount(0);
});
test('stop opens compact arrivals and route sheets, with one back step per sheet',async({page})=>{
 await page.goto('/');await nav(page).getByRole('button',{name:'Hizmetler'}).click();await page.getByRole('button',{name:'Toplu ulaşım',exact:true}).click();await expect(page.locator('.service-region')).toHaveText('Antalya');
 await expect(page.getByRole('button',{name:'Trafik',exact:true})).toHaveCount(0);await page.locator('.stop-row').click();const stop=page.getByRole('dialog',{name:'ANTALYA DURAK',exact:true});await expect(stop).toBeVisible();await expect(stop.locator('.map-bus-item')).toContainText('4 dk');
 await stop.locator('.map-bus-item').click();const route=page.getByRole('dialog',{name:'511',exact:true});await expect(route).toBeVisible();await expect(route.locator('.route-stops')).toContainText('ANTALYA DURAK');await page.goBack();await expect(route).not.toBeVisible();await expect(stop).toBeVisible();await page.goBack();await expect(stop).not.toBeVisible();await expect(page.locator('.stop-row')).toBeVisible();
});
test('transit map does not refetch on resize jitter and selects stop without duplicate bus symbols',async({page})=>{
 await storeLocation(page);let calls=0;page.on('request',r=>{if(/\/api\/transit\?/.test(r.url()))calls++;});await page.goto('/');expect(calls).toBe(0);
 await nav(page).getByRole('button',{name:'Hizmetler'}).click();await page.getByRole('button',{name:'Toplu ulaşım',exact:true}).click();await page.getByRole('button',{name:'Harita',exact:true}).click();await expect(page.locator('.map-canvas')).toBeVisible();await page.waitForTimeout(1600);const initial=calls;
 const size=page.viewportSize()!;await page.setViewportSize({width:size.width,height:size.height-2});await page.setViewportSize(size);await page.waitForTimeout(1100);expect(calls).toBe(initial);
 await expect(page.locator('.map-unified-sheet')).toHaveCount(0);const marker=await page.locator('.user-marker').boundingBox();await page.mouse.click(marker!.x+marker!.width/2,marker!.y+marker!.height/2);await expect(page.getByRole('dialog',{name:'ANTALYA DURAK',exact:true})).toBeVisible();
});
test('map count in services never falls back to offscreen results',async({page})=>{
 await storeLocation(page);await page.goto('/');await openPlaces(page);await page.getByRole('button',{name:'Harita',exact:true}).click();await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count','12');await page.locator('.map-sheet-toggle').click();await expect(page.locator('.map-place-chip')).toHaveCount(12);
 await page.locator('.maplibregl-canvas').focus();for(let i=0;i<8;i++){await page.keyboard.press('ArrowRight');await page.waitForTimeout(350);}
 await expect(page.locator('.map-place-chip')).toHaveCount(0);await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count','12');
});
test('failed sources show a short retry state instead of a false empty result',async({page})=>{
 await storeLocation(page);await page.route('**/api/viewport?**',r=>r.fulfill({status:503,json:{error:'unavailable'}}));await page.route('**/api/overture?**',r=>r.fulfill({status:503,json:{error:'unavailable'}}));await page.goto('/');await expect(page.locator('.map-source-state')).toContainText('Veri alınamadı');await openPlaces(page);await expect(page.getByRole('alert')).toContainText('Yerler alınamadı');await expect(page.getByText('Eşleşme bulunamadı')).toHaveCount(0);await expect(page.getByRole('button',{name:'Tekrar dene'})).toBeVisible();
});
test('products use one compact view, preserve single-market items and open exact offer details',async({page})=>{
 const cities:string[]=[];
 await page.route('**/api/prices?**',r=>{const city=new URL(r.request().url()).searchParams.get('lat')!;cities.push(city);return r.fulfill({json:{products:[{id:'milk',title:'Süt 1 L',quantity:'1 L',offers:[{id:'one',market:'migros',name:'Merkez şubesi',lat:36.8948,lng:30.7056,price:40,unitPrice:'40 TL/L',updatedAt:'2026-10-10T12:00:00Z',promotion:null},{id:'two',market:'bim',name:'BİM şubesi',lat:36.8948,lng:30.7056,price:45,unitPrice:'45 TL/L',updatedAt:'2026-10-10T12:00:00Z',promotion:null}]},{id:'single',title:'Tek market ürünü',quantity:'1 kg',offers:[{id:'single-offer',market:'sok',name:'ŞOK şubesi',lat:36.8948,lng:30.7056,price:30,unitPrice:'30 TL/kg',updatedAt:'2026-10-10T12:00:00Z',promotion:null}]}],depotCount:3,total:2,hasMore:false,partial:true}});});
 await page.goto('/');await nav(page).getByRole('button',{name:'Hizmetler'}).click();await page.getByRole('button',{name:'Market',exact:true}).click();await expect(page.getByRole('heading',{name:'Ürünler',exact:true})).toBeVisible();await expect(page.locator('.product-price-card')).toHaveCount(2);
 await expect(page.locator('.prices-panel')).not.toContainText(/Ortak ürünler|Bulunan ürünler|garantisi|Telefon konumu|Kaynakta bildirilen/);
 const first=page.locator('.product-price-card').first();expect((await first.boundingBox())!.height).toBeLessThan(230);
 await first.locator('.product-offer').first().click();const offer=page.getByRole('dialog',{name:'Migros',exact:true});await expect(offer).toContainText('₺40,00');await expect(offer).toContainText('Merkez şubesi');await expect(offer).toContainText('40 TL/L');await expect(offer.getByRole('link',{name:'Yol tarifi'})).toHaveAttribute('href',/36.8948,30.7056/);await page.goBack();await expect(offer).not.toBeVisible();
 await page.getByLabel('Karşılaştırma ili').selectOption('istanbul');await expect.poll(()=>cities.includes('41.0082')).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('device movement tracks continuously and manual selection stops the watch',async({page,context})=>{
 await context.grantPermissions(['geolocation']);await context.setGeolocation({latitude:origin.lat,longitude:origin.lng,accuracy:15});await page.goto('/');await page.getByRole('button',{name:'Konum',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Konum',exact:true});await dialog.getByRole('button',{name:'Konumumu kullan'}).click();await expect(dialog).not.toBeVisible();await expect(page.locator('.user-marker')).toBeVisible();
 await context.setGeolocation({latitude:36.886,longitude:30.706,accuracy:20});await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('yakinim:v2:last-location')!).lat)).toBe(36.886);
 await page.getByRole('button',{name:'Konum',exact:true}).click();await dialog.getByRole('button',{name:'Haritadan seç'}).click();await page.locator('.maplibregl-canvas').click({position:{x:140,y:180}});await expect(page.getByText('Haritada istediğin noktaya dokun')).toHaveCount(0);
 const manual=await page.evaluate(()=>JSON.parse(localStorage.getItem('yakinim:v2:last-location')!));await context.setGeolocation({latitude:36.888,longitude:30.709,accuracy:10});await page.waitForTimeout(300);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('yakinim:v2:last-location')!).lat)).toBe(manual.lat);
});
