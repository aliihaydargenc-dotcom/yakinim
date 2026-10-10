import {test,expect,type Page} from '@playwright/test';

const coords={lat:36.884,lng:30.704};
const nav=(page:Page)=>page.locator('.shell-nav--mobile');
const stop={id:'10149',name:'ANTALYA TEST DURAK',lat:coords.lat,lng:coords.lng,routes:['KL08'],distanceM:0};
const currentIso=new Date().toISOString();
const route=[{lat:36.884,lng:30.700},{lat:36.884,lng:30.702},{lat:36.884,lng:30.704}];

test.beforeEach(async({page})=>{
 await page.addInitScript(value=>{
  localStorage.setItem('yakinim:v2:last-location',JSON.stringify({...value,savedAt:Date.now(),mode:'manual'}));
 },coords);
 await page.route('https://tiles.openfreemap.org/styles/liberty',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#f0f3f7'}}]}}));
 await page.route('**/api/location?**',r=>r.fulfill({json:{label:'Muratpaşa, Antalya',province:'Antalya'}}));
 await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements:[{type:'node',id:1,lat:36.8842,lon:30.7042,tags:{shop:'supermarket',name:'Deneme Marketi'}}]}}));
 await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
 await page.route('**/api/nearby?**',r=>r.fulfill({json:{elements:[],places:[]}}));
 await page.route('**/api/duty?**',r=>r.fulfill({json:{pharmacies:[],partial:false}}));
 await page.route('**/api/transit?**',r=>{
  const action=new URL(r.request().url()).searchParams.get('action');
  if(action==='arrivals')return r.fulfill({json:{fresh:true,sourceAt:currentIso,buses:[{id:'vehicle-101',code:'KL08',name:'Antalya',direction:0,minutes:4,stops:2,lat:36.884,lng:30.700}]}});
  if(action==='route')return r.fulfill({json:{name:'KL08',code:'KL08',direction:0,points:route,stops:[stop]}});
  return r.fulfill({json:{stops:[stop],partial:false,coverage:['Antalya']}});
 });
 await page.route('**/api/events?**',r=>r.fulfill({json:{items:[
  {id:'session-13',title:'Antalya gösterisi',startsAt:'2030-10-11T13:00:00+03:00',endsAt:'2030-10-11T23:59:59+03:00',hours:'13:00',venue:'Test Salonu',source:'Etkinlik.io',url:'https://etkinlik.io/etkinlik/123/test'},
  {id:'session-15',title:'Antalya gösterisi',startsAt:'2030-10-11T15:00:00+03:00',endsAt:'2030-10-11T23:59:59+03:00',hours:'15:00',venue:'Test Salonu',source:'Etkinlik.io',url:'https://etkinlik.io/etkinlik/123/test'}],
  partial:false,coverage:'Antalya',city:'Antalya',fetchedAt:currentIso
 }}));
});

test('four mobile tabs remain accessible and location options open',async({page})=>{
 await page.goto('/');
 const navigation=nav(page);
 await expect(navigation.getByRole('button')).toHaveCount(4);
 await expect(page.locator('.map-stage')).toBeVisible();
 await page.getByRole('button',{name:'Konum',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'Konum',exact:true})).toBeVisible();
 await page.getByRole('dialog',{name:'Konum',exact:true}).getByRole('button',{name:'Konum kapat'}).click();
 for(const label of ['Hizmetler','Kaydedilen','Diğer','Keşfet']){
  await navigation.getByRole('button',{name:label,exact:true}).click();
  await expect(navigation.getByRole('button',{name:label,exact:true})).toHaveAttribute('aria-current','page');
 }
});

test('closing a place and touching the map collapses its drawer',async({page})=>{
 await page.goto('/');
 await nav(page).getByRole('button',{name:'Hizmetler'}).click();
 await page.locator('.service-category-grid').getByRole('button',{name:'Marketler',exact:true}).click();
 await expect(page.locator('.place-row')).toContainText('Deneme Marketi');
 await page.getByRole('button',{name:'Harita',exact:true}).click();
 const drawer=page.locator('.map-unified-sheet');
 await expect(drawer).toHaveAttribute('data-level','peek');
 await drawer.locator('.map-sheet-toggle').click();
 await expect(drawer).toHaveAttribute('data-level','half');
 await drawer.locator('.map-place-chip').first().click();
 await expect(drawer).toHaveAttribute('data-selected','true');
 await drawer.locator('.map-sheet-close').click();
 await expect(drawer).toHaveAttribute('data-level','peek');
 await drawer.locator('.map-sheet-toggle').click();
 await page.locator('.maplibregl-canvas').click({position:{x:30,y:130}});
 await expect(drawer).toHaveAttribute('data-level','peek');
});

test('selected bus keeps its route, stop and back navigation',async({page})=>{
 await page.goto('/');
 await nav(page).getByRole('button',{name:'Hizmetler'}).click();
 await page.getByRole('button',{name:'Toplu ulaşım',exact:true}).click();
 await expect(page.locator('.stop-row').first()).toBeVisible();
 await page.locator('.stop-row').first().click();
 const sheet=page.getByRole('dialog',{name:'ANTALYA TEST DURAK',exact:true});
 await expect(sheet).toBeVisible();
 await expect(sheet.locator('.map-bus-item')).toContainText('4 dk');
 await sheet.locator('.map-bus-item').click();
 const routeSheet=page.getByRole('dialog',{name:'KL08',exact:true});
 await expect(routeSheet).toBeVisible();
 await expect(routeSheet.locator('.transit-selected-stop-card')).toContainText('ANTALYA TEST DURAK');
 await expect(routeSheet.locator('.transit-selected-stop-card')).toContainText('kaldı');
 await expect(routeSheet.getByRole('button',{name:/yenile/i})).toBeVisible();
 await expect(routeSheet.getByRole('button',{name:'Gidiş'})).toHaveCount(0);
 await routeSheet.getByRole('button',{name:'Otobüs listesine dön'}).click();
 await expect(sheet.locator('.map-bus-item')).toBeVisible();
});

test('event sessions retain two distinct verified showtimes',async({page})=>{
 await page.goto('/');
 await nav(page).getByRole('button',{name:'Hizmetler'}).click();
 await page.getByRole('button',{name:'Etkinlikler',exact:true}).click();
 const cards=page.locator('.event-card');
 await expect(cards).toHaveCount(2);
 await expect(cards.nth(0)).toContainText('13:00');
 await expect(cards.nth(1)).toContainText('15:00');
 await expect(cards.first()).toContainText('Etkinlik.io');
});
