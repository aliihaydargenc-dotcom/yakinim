import {test,expect,type Page} from '@playwright/test';
test.use({permissions:[]});
const nav=(p:Page)=>p.locator('.shell-nav--mobile');
const origin={lat:36.884,lng:30.704};
const storeLocation=async(p:Page)=>p.addInitScript(c=>localStorage.setItem('yakinim:v2:last-location',JSON.stringify({...c,mode:'manual',savedAt:Date.now()})),origin);
test.beforeEach(async({page})=>{
 await page.route('https://tiles.openfreemap.org/styles/liberty',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#e8f4ee'}}]}}));
 await page.route('**/api/location?**',r=>r.fulfill({json:{label:'Muratpaşa, Antalya',province:'Antalya'}}));
 await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements:Array.from({length:12},(_,i)=>({type:'node',id:i+1,lat:origin.lat+i*.0001,lon:origin.lng+i*.0001,tags:{shop:'supermarket',name:`Mahalle Marketi ${i+1}`}}))}}));
 await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
 await page.route('**/api/nearby?**',r=>r.fulfill({json:{elements:[],places:[]}}));
 await page.route('**/api/weather?**',r=>r.fulfill({status:503,json:{error:'unavailable'}}));
 await page.route('**/api/transit?**',r=>r.fulfill({json:{stops:[{id:'11265',name:'ANTALYA DURAK',lat:origin.lat,lng:origin.lng,routes:['511'],distanceM:0}],coverage:['Antalya'],partial:false}}));
 await page.route('**/api/events?**',r=>r.fulfill({json:{items:[{id:'one',title:'Tarihi doğrulanmamış etkinlik',startsAt:null,endsAt:null,venue:null,source:'Etkinlik.io',url:'https://etkinlik.io/etkinlik/123/test'}],coverage:'Antalya',fetchedAt:new Date().toISOString(),partial:false}}));
});
test('without a chosen location no city is silently presented as nearby',async({page})=>{
 let dataCalls=0;page.on('request',r=>{if(/\/api\/(viewport|overture|transit)\?/.test(r.url()))dataCalls++;});
 await page.goto('/');await expect(page.locator('.location-gate')).toBeVisible();
 await expect(page.locator('.location-gate').getByRole('button',{name:'Konumumu kullan'})).toBeInViewport();
 await expect(page.locator('.location-gate').getByRole('button',{name:'Haritadan seç'})).toBeInViewport();
 await expect(page.locator('.map-stage')).toHaveCount(0);await expect(page.locator('.place-row')).toHaveCount(0);
 expect(dataCalls).toBe(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('the list scrolls to its last record and details stay above navigation',async({page})=>{
 await storeLocation(page);await page.goto('/');await expect(page.locator('.place-row')).toHaveCount(12);
 await page.locator('.place-row').last().scrollIntoViewIfNeeded();await expect(page.locator('.place-row').last()).toBeInViewport();
 const last=await page.locator('.place-row').last().boundingBox(),bottom=await nav(page).boundingBox();expect(last!.y+last!.height).toBeLessThanOrEqual(bottom!.y+1);
 await page.locator('.place-row').last().click();const dialog=page.getByRole('dialog',{name:'Mahalle Marketi 12'});await expect(dialog).toBeVisible();
 await expect(dialog).toContainText('OpenStreetMap');await expect(dialog).toContainText('kuş uçuşu');
 await expect(dialog.getByRole('link',{name:'Yol tarifi'})).toBeVisible();await dialog.getByRole('button',{name:'Yeri kaydet'}).click();await expect(dialog).toContainText('Kaydedildi');
 await page.goBack();await expect(dialog).not.toBeVisible();await expect(page.locator('.place-row')).toHaveCount(12);
 await nav(page).getByRole('button',{name:'Kaydedilen'}).click();await expect(page.locator('.shell-saved-place')).toContainText('Mahalle Marketi 12');
});
test('map is explicit and both its back button and browser back return to list',async({page})=>{
 await storeLocation(page);await page.goto('/');await expect(page.locator('.place-row')).toHaveCount(12);
 await page.getByRole('button',{name:'Harita',exact:true}).click();await expect(page.locator('.map-stage')).toBeVisible();
 await expect(page.locator('.maplibregl-canvas')).toBeInViewport();await page.getByRole('button',{name:'Listeye dön'}).click();await expect(page.locator('.map-stage')).toHaveCount(0);
 await page.getByRole('button',{name:'Harita',exact:true}).click();await page.goBack();await expect(page.locator('.map-stage')).toHaveCount(0);await expect(page.locator('.place-row')).toHaveCount(12);
});
test('manual picking returns to the list and avoids background scrolling traps',async({page})=>{
 await page.goto('/');await page.locator('.location-gate').getByRole('button',{name:'Haritadan seç'}).click();
 await expect(page.getByText('Haritada istediğin noktaya dokun')).toBeVisible();const canvas=page.locator('.maplibregl-canvas');await expect(canvas).toBeVisible();await canvas.click({position:{x:180,y:180}});
 await expect(page.locator('.map-stage')).toHaveCount(0);await expect(page.locator('.location-status')).toContainText('Haritadan seçilen konum');await expect(page.locator('.place-row')).toHaveCount(0);await expect(page.getByText('Eşleşme bulunamadı')).toBeVisible();
});
test('services have independent search and back returns to their index',async({page})=>{
 await storeLocation(page);await page.goto('/');await nav(page).getByRole('button',{name:'Hizmetler'}).click();await page.getByRole('button',{name:/^Etkinlikler/}).click();
 await expect(page.locator('.event-card')).toContainText('Tarih için kaynağa bak');await expect(page.locator('.category-navigation')).not.toBeVisible();
 await page.getByRole('textbox',{name:'Etkinlik ara'}).fill('bulunmayan');await expect(page.locator('.event-card')).toHaveCount(0);
 await page.goBack();await expect(page.locator('.shell-service-grid')).toBeVisible();await page.getByRole('button',{name:/^Etkinlikler/}).click();await expect(page.getByRole('textbox',{name:'Etkinlik ara'})).toHaveValue('');
 await nav(page).getByRole('button',{name:'Keşfet'}).click();await expect(page.getByRole('textbox',{name:'Yer ara'})).toHaveValue('');await expect(page.locator('.place-row')).toHaveCount(12);
});
test('Antalya transit is labeled explicitly for people without GPS',async({page})=>{
 await page.goto('/');await nav(page).getByRole('button',{name:'Hizmetler'}).click();await page.getByRole('button',{name:/^Toplu ulaşım/}).click();
 await expect(page.getByText('Kapsam: Antalya.',{exact:false})).toContainText('Konumun kullanılmıyor');await expect(page.locator('.stop-row')).toContainText('ANTALYA DURAK');await expect(page.locator('.stop-row')).not.toContainText('Yaklaşık');
 await expect(nav(page).getByRole('button',{name:'Hizmetler'})).toHaveAttribute('aria-current','page');
});
test('failed data is an unavailable-source state rather than an empty surroundings claim',async({page})=>{
 await storeLocation(page);await page.route('**/api/viewport?**',r=>r.fulfill({status:503,json:{error:'unavailable'}}));await page.route('**/api/overture?**',r=>r.fulfill({status:503,json:{error:'unavailable'}}));
 await page.goto('/');await expect(page.getByRole('alert')).toContainText('Yerler alınamadı');await expect(page.getByText('Eşleşme bulunamadı')).toHaveCount(0);await expect(page.getByRole('button',{name:'Tekrar dene'})).toBeVisible();
});
test('map result count never falls back to places outside the visible area',async({page})=>{
 await storeLocation(page);await page.goto('/');await expect(page.locator('.place-row')).toHaveCount(12);await page.locator('.category-rail').getByRole('button',{name:'Market',exact:true}).click();await page.getByRole('button',{name:'Harita',exact:true}).click();
 await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count','12');await page.locator('.map-sheet-toggle').click();await expect(page.locator('.map-place-chip')).toHaveCount(12);
 const canvas=page.locator('.maplibregl-canvas'),box=await canvas.boundingBox();if(!box)throw Error('Map missing');
 await canvas.focus();for(let i=0;i<8;i++){await page.keyboard.press('ArrowRight');await page.waitForTimeout(350);}
 await expect(page.locator('.map-place-chip')).toHaveCount(0);await expect(page.locator('.map-sheet-summary')).toContainText('0 kayıt');await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count','12');
});
test('a successful empty source does not conceal a second failed source',async({page})=>{
 await storeLocation(page);await page.route('**/api/viewport?**',r=>r.fulfill({status:503,json:{error:'unavailable'}}));
 await page.goto('/');await expect(page.getByText('Kaynaklar eksik; sonuç doğrulanamadı')).toBeVisible();await expect(page.getByRole('button',{name:'Tekrar dene'})).toBeVisible();await expect(page.getByText('Eşleşme bulunamadı')).toHaveCount(0);
});
