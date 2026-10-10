import {test,expect,type Page} from '@playwright/test';
const loc={lat:36.8615,lng:30.6377};
test.beforeEach(async({page})=>{
 await page.route('https://tiles.openfreemap.org/styles/liberty',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#e9eff3'}}]}}));
 await page.route('**/api/location?**',r=>r.fulfill({json:{label:'Antalya'}}));
 await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements:[{type:'node',id:1,lat:36.862,lon:30.6369,tags:{shop:'supermarket',name:'Mobil Market'}}]}}));
 await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
 await page.route('**/api/nearby?**',r=>r.fulfill({json:{elements:[],places:[]}}));
 await page.route('**/api/transit?**',r=>{const params=new URL(r.request().url()).searchParams;return r.fulfill({json:params.get('action')==='arrivals'?{fresh:true,sourceAt:new Date().toISOString(),buses:[{id:'bus1',code:'511',name:'Sahil',direction:0,minutes:4,stops:2}]}:{stops:[{id:'11265',name:'KONYAALTI DURAK',lat:36.8615,lng:30.6377,routes:['511'],distanceM:0}],coverage:['511'],partial:false}})});
 await page.addInitScript(c=>localStorage.setItem('yakinim:v2:last-location',JSON.stringify({...c,mode:'manual',savedAt:Date.now()})),loc);
});
const nav=(page:Page)=>page.locator('.shell-nav--mobile');
test('mobile opens a readable list and offers an explicit map sheet',async({page})=>{
 await page.goto('/');
 await expect(nav(page).getByRole('button')).toHaveCount(4);
 await expect(page.locator('.place-row')).toContainText('Mobil Market');
 await page.getByRole('button',{name:'Harita',exact:true}).click();
 await expect(page.locator('.map-stage')).toBeVisible();
 await expect(page.locator('.map-unified-sheet')).toHaveAttribute('data-level','peek');
 await expect(page.getByRole('textbox',{name:'Yer ara'})).toBeVisible();
 await page.locator('.map-sheet-toggle').click();
 await expect(page.locator('.map-unified-sheet')).toHaveAttribute('data-level','half');
 const market=page.locator('.map-place-chip').filter({hasText:'Mobil Market'});
 await expect(market).toBeVisible();await market.click();
 await expect(page.locator('.map-place-sheet')).toContainText('Mobil Market');
 await expect(page.getByRole('button',{name:'Yeri kaydet'})).toBeVisible();
 await page.getByRole('button',{name:'Yeri kaydet'}).click();
 await nav(page).getByRole('button',{name:'Kaydedilen'}).click();
 await expect(page.locator('.shell-saved-place')).toContainText('Mobil Market');
 await nav(page).getByRole('button',{name:'Keşfet'}).click();
 await expect(page.locator('.place-row')).toContainText('Mobil Market');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('transit stays in services and exposes list, map and arrivals',async({page})=>{
 await page.goto('/');await nav(page).getByRole('button',{name:'Hizmetler'}).click();await page.getByRole('button',{name:/Toplu ulaşım/}).click();
 await expect(nav(page).getByRole('button',{name:'Hizmetler'})).toHaveAttribute('aria-current','page');await expect(page.locator('.stop-row')).toContainText('KONYAALTI DURAK');
 await page.getByRole('button',{name:'Harita',exact:true}).click();await expect(page.locator('.map-stage')).toBeVisible();await page.locator('.map-sheet-toggle').click();await page.locator('.map-place-chip').filter({hasText:'KONYAALTI DURAK'}).click();
 await expect(page.locator('.map-place-sheet')).toContainText('KONYAALTI DURAK');await expect(page.locator('.map-bus-item')).toContainText('4 dk');await page.locator('.map-sheet-close').click();await expect(page.locator('.map-unified-sheet')).toHaveAttribute('data-selected','false');
});
