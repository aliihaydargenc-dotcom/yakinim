import {test,expect} from '@playwright/test';

test.beforeEach(async({page})=>{
 await page.route('https://tiles.openfreemap.org/styles/liberty',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#eef5e7'}}]}}));
 await page.route('**/api/traffic?**',r=>r.fulfill({json:{available:false,index:null,observedAt:null,fresh:false}}));
 await page.route('**/api/location?**',r=>r.fulfill({json:{label:'Antalya'}}));
 await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements:[{type:'node',id:1,lat:36.884,lon:30.704,tags:{shop:'supermarket',name:'Kaydedilen Market'}}]}}));
 await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
 await page.route('**/api/nearby?**',r=>r.fulfill({json:{elements:[],places:[]}}));
 await page.route('**/api/fishing?**',r=>r.fulfill({json:{hourly:[],daily:[]}}));
});
const mobileNav=(page:any)=>page.locator('.shell-nav--mobile');

test('five tabs, services, more and a single traffic map without third-party embeds',async({page})=>{
 await page.goto('/?preview');
 await expect(mobileNav(page).getByRole('button')).toHaveCount(5);
 await mobileNav(page).getByRole('button',{name:'Hizmetler',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Şehir hizmetleri'})).toBeVisible();
 await expect(page.locator('.shell-service-grid>button')).toHaveCount(6);
 await page.getByRole('button',{name:/^Trafik Haritadaki/}).click();
 await expect(page.getByRole('heading',{name:'Yol ve trafik'})).toBeVisible();
 await expect(page.locator('iframe[title="Canlı trafik haritası"]')).toHaveCount(0);
 await expect(page.getByText('Bu görünüm yol haritasıdır.',{exact:false})).toBeVisible();
 await mobileNav(page).getByRole('button',{name:'Diğer',exact:true}).click();
 await expect(page.locator('.shell-service-grid>button')).toHaveCount(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('saved place survives reload and can be removed',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('yakinim:v2:last-location'))localStorage.setItem('yakinim:v2:last-location',JSON.stringify({lat:36.884,lng:30.704,mode:'manual',savedAt:Date.now()}));});
 await page.goto('/');
 await expect(page.locator('.place-row')).toContainText('Kaydedilen Market');
 await page.locator('.place-row').click();
 await page.getByRole('button',{name:'Yeri kaydet',exact:true}).click();
 await page.getByRole('button',{name:'Kapat',exact:true}).click();
 await mobileNav(page).getByRole('button',{name:'Kaydedilen',exact:true}).click();
 await expect(page.locator('.shell-saved-place')).toContainText('Kaydedilen Market');
 await page.reload();
 await mobileNav(page).getByRole('button',{name:'Kaydedilen',exact:true}).click();
 await expect(page.locator('.shell-saved-place')).toContainText('Kaydedilen Market');
 await page.getByRole('button',{name:'Kaydedilen Market kaydını kaldır'}).click();
 await expect(page.getByText('Henüz kaydedilen yer yok')).toBeVisible();
});

test('desktop has sidebar and adjacent map while mobile retains all five tabs',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});
 await page.goto('/?preview');
 await expect(page.locator('.shell-sidebar')).toBeVisible();
 await expect(page.locator('.discovery-map-panel .maplibregl-canvas')).toBeVisible();
 await expect(page.locator('.place-row')).toHaveCount(7);
 const list=await page.locator('.split-list-workspace').boundingBox();const map=await page.locator('.discovery-map-panel').boundingBox();
 expect(map!.x).toBeGreaterThanOrEqual(list!.x+list!.width);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.setViewportSize({width:360,height:800});
 await expect(page.locator('.discovery-map-panel')).toHaveCount(0);
 await expect(mobileNav(page)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});


test('Istanbul traffic shows real index scope, zero, stale and failed-source states',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('yakinim:v2:last-location',JSON.stringify({lat:41.01,lng:28.98,mode:'manual',savedAt:Date.now()})));
 let state='fresh';
 await page.route('**/api/traffic?**',r=>r.fulfill(state==='error'?{status:503,json:{error:'traffic_unavailable'}}:{json:{available:true,index:state==='fresh'?0:null,observedAt:new Date().toISOString(),fresh:state==='fresh',source:'İBB Ulaşım Yönetim Merkezi',sourceUrl:'https://api.ibb.gov.tr/tkmservices/api/TrafficData/v1/TrafficIndexHistory/1/5M',licenseUrl:'https://data.ibb.gov.tr/license'}}));
 await page.goto('/');
 await mobileNav(page).getByRole('button',{name:'Hizmetler',exact:true}).click();await page.getByRole('button',{name:/^Trafik Haritadaki/}).click();
 await expect(page.locator('.traffic-index-value')).toHaveText('0/ 100');
 await expect(page.locator('.traffic-index-card')).toContainText('Şehir geneli ölçümdür');
 state='stale';await page.getByRole('button',{name:'Trafik verisini yenile'}).click();await expect(page.locator('.traffic-index-value')).toHaveCount(0);await expect(page.getByText('Kaynak güncel değil; canlı endeks gösterilmiyor.')).toBeVisible();
 state='error';await page.getByRole('button',{name:'Trafik verisini yenile'}).click();await expect(page.getByRole('alert')).toContainText('Trafik kaynağına ulaşılamadı');await expect(page.locator('.traffic-index-card')).toHaveCount(0);await expect(page.locator('.traffic-map canvas')).toBeVisible();
});

test('road traffic loads native tiles in Antalya and removes the layer on service failure',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('yakinim:v2:last-location',JSON.stringify({lat:36.88,lng:30.70,mode:'manual',savedAt:Date.now()})));
 let tiles=0,fail=false;
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
 await page.route('**/api/traffic?**',r=>{
  if(new URL(r.request().url()).searchParams.get('action')==='tile'){tiles++;return r.fulfill({contentType:'image/png',body:png});}
  return r.fulfill(fail?{status:503,json:{error:'traffic_unavailable'}}:{json:{available:true,scope:'road',tiles:'/api/traffic?action=tile&z={z}&x={x}&y={y}',source:'TomTom Traffic'}});
 });
 await page.goto('/');await mobileNav(page).getByRole('button',{name:'Hizmetler',exact:true}).click();await page.getByRole('button',{name:/^Trafik Haritadaki/}).click();
 await expect(page.getByText('TomTom yol trafiği · 2 dakikada bir yenilenir.')).toBeVisible();expect(tiles).toBeGreaterThan(0);
 await expect(page.locator('.traffic-map iframe')).toHaveCount(0);await expect(page.locator('.traffic-index-card')).toHaveCount(0);
 fail=true;await page.getByRole('button',{name:'Trafik verisini yenile'}).click();await expect(page.getByRole('alert')).toContainText('Trafik kaynağına ulaşılamadı');await expect(page.getByText('Bu görünüm yol haritasıdır.',{exact:false})).toBeVisible();
 await expect(page.locator('.traffic-map canvas')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('events switch cities and never turn an unverified date into a show time',async({page})=>{
 await page.route('**/api/location?**',r=>r.fulfill({json:{province:'Antalya',label:'Antalya'}}));
 const cities:string[]=[];
 await page.route('**/api/events?**',r=>{const city=new URL(r.request().url()).searchParams.get('city')!;cities.push(city);return r.fulfill({json:{items:[{id:city,title:city==='7'?'Ankara etkinliği':'Antalya etkinliği',startsAt:null,endsAt:null,venue:null,source:'Etkinlik.io',url:'https://etkinlik.io/etkinlik/123/test'}],coverage:city==='7'?'Ankara':'Antalya',fetchedAt:new Date().toISOString(),partial:false}});});
 await page.goto('/?preview');await page.getByRole('button',{name:'Etkinlik',exact:true}).click();await expect(page.locator('.event-card')).toContainText('Antalya etkinliği');
 await page.getByLabel('Etkinlik şehri').selectOption('7');await expect(page.locator('.event-card')).toContainText('Ankara etkinliği');await expect(page.locator('.event-card')).toContainText('Tarih için kaynağa bak');await expect(page.getByRole('link',{name:'Yol tarifi',exact:true})).toHaveCount(0);expect(cities).toContain('8');expect(cities).toContain('7');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.setViewportSize({width:1440,height:1000});await expect(page.locator('.event-card')).toContainText('Ankara etkinliği');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('failed road traffic tiles show an error while the base map remains usable',async({page})=>{
 await page.route('**/api/traffic?**',r=>new URL(r.request().url()).searchParams.get('action')==='tile'?r.fulfill({status:502,json:{error:'traffic_unavailable'}}):r.fulfill({json:{available:true,scope:'road',tiles:'/api/traffic?action=tile&z={z}&x={x}&y={y}'}}));
 await page.goto('/?preview');await mobileNav(page).getByRole('button',{name:'Hizmetler',exact:true}).click();await page.getByRole('button',{name:/^Trafik Haritadaki/}).click();
 await expect(page.getByText('Trafik katmanı alınamadı. Yol haritası kullanılabilir.')).toBeVisible();await expect(page.getByText('TomTom yol trafiği · 2 dakikada bir yenilenir.')).toHaveCount(0);await expect(page.locator('.traffic-map canvas')).toBeVisible();
});
