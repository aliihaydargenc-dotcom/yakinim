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
test('home place selection and save keep the map uncluttered on return',async({page})=>{
 await page.goto('/');await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count','1');await expect.poll(async()=>Number(await page.locator('.map-canvas').getAttribute('data-map-zoom'))).toBeGreaterThanOrEqual(15);const dot=await page.locator('.user-marker').boundingBox();const zoom=Number(await page.locator('.map-canvas').getAttribute('data-map-zoom')),scale=512*2**zoom;const mercator=(lat:number)=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));await page.mouse.click(dot!.x+dot!.width/2+(30.6369-loc.lng)*scale/360,dot!.y+dot!.height/2+(mercator(loc.lat)-mercator(36.862))*scale/(2*Math.PI));await expect(page.locator('.map-place-sheet')).toContainText('Mobil Market');await page.getByRole('button',{name:'Yeri kaydet'}).click();await nav(page).getByRole('button',{name:'Kaydedilen'}).click();await expect(page.locator('.shell-saved-place')).toContainText('Mobil Market');await nav(page).getByRole('button',{name:'Keşfet'}).click();await expect(page.locator('.map-stage')).toBeVisible();await expect(page.locator('.map-place-sheet,.map-unified-sheet')).toHaveCount(0);
});
test('transit map selection uses the same compact arrival card as the stop list',async({page})=>{
 await page.goto('/');await nav(page).getByRole('button',{name:'Hizmetler'}).click();await page.getByRole('button',{name:'Toplu ulaşım',exact:true}).click();await page.getByRole('button',{name:'Harita',exact:true}).click();await expect.poll(async()=>Number(await page.locator('.map-canvas').getAttribute('data-map-zoom'))).toBeGreaterThanOrEqual(15);const dot=await page.locator('.user-marker').boundingBox();await page.mouse.click(dot!.x+dot!.width/2,dot!.y+dot!.height/2);const stop=page.getByRole('dialog',{name:'KONYAALTI DURAK',exact:true});await expect(stop).toBeVisible();await expect(stop.locator('.map-bus-item')).toContainText('4 dk');await page.goBack();await expect(stop).not.toBeVisible();await expect(page.locator('.map-stage')).toBeVisible();await page.getByRole('button',{name:'Liste',exact:true}).click();await expect(page.locator('.stop-row')).toBeVisible();
});
