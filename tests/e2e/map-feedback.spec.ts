import {test,expect,type Page} from '@playwright/test';
const origin={lat:36.884,lng:30.704};
const elements=Array.from({length:7},(_,i)=>({type:'node',id:i+1,lat:origin.lat+.00015*i,lon:origin.lng+.0005*i,tags:{amenity:'veterinary',name:`Veteriner Kliniği ${i+1}`}}));
async function setup(page:Page){
 await page.addInitScript(c=>localStorage.setItem('yakinim:v2:last-location',JSON.stringify({...c,mode:'manual',savedAt:Date.now()})),origin);
 await page.route('**/api/location?**',r=>r.fulfill({json:{label:'Antalya'}}));
 await page.route('**/api/nearby?**',r=>r.fulfill({json:{elements:[],places:[]}}));
 await page.route('**/api/fishing?**',r=>r.fulfill({json:{hourly:[],daily:[]}}));
 await page.route('https://tiles.openfreemap.org/styles/liberty',r=>r.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#f7f5f1'}}]}}));
 await page.goto('/');
 await page.getByRole('button',{name:'Tüm kategorileri aç',exact:true}).click();
 await page.getByRole('dialog',{name:'Tüm kategoriler',exact:true}).getByRole('button',{name:'Veteriner',exact:true}).click();
 await expect(page.locator('.place-row')).toHaveCount(elements.length);
 await page.getByRole('button',{name:'Harita',exact:true}).click();
 await expect(page.locator('.map-stage')).toHaveAttribute('data-map-renderer','maplibre-layered-discovery');
  await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count',String(elements.length));
  await expect(page.locator('.stable-place-marker')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/Haritadaki yerler/})).toBeVisible();
 await expect(page.locator('.map-loading-indicator')).toHaveCount(0);
 await expect.poll(()=>page.locator('.category-rail').evaluate(rail=>{const b=rail.querySelector('[aria-pressed=true]')!.getBoundingClientRect(),r=rail.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1;})).toBe(true);
}

for(const outcome of ['success','error'] as const){
 test(`veterinary map shows refresh with retained markers until both sources settle: ${outcome}`,async({page})=>{
  let hold=false,areaRequests=0,supplementRequests=0,releaseArea=()=>{},releaseSupplement=()=>{};
  const areaGate=new Promise<void>(r=>releaseArea=r),supplementGate=new Promise<void>(r=>releaseSupplement=r);
  await page.route('**/api/viewport?**',async r=>{if(hold){areaRequests++;await areaGate;}return outcome==='error'&&hold?r.fulfill({status:503,json:{error:'Unavailable'}}):r.fulfill({json:{elements}});});
  await page.route('**/api/overture?**',async r=>{if(hold&&!new URL(r.request().url()).searchParams.has('category')){supplementRequests++;await supplementGate;}return outcome==='error'&&hold?r.fulfill({status:503,json:{error:'Unavailable'}}):r.fulfill({json:{places:[]}});});
  await setup(page);hold=true;
  const canvas=page.locator('.maplibregl-canvas'),box=await canvas.boundingBox();if(!box)throw Error('Map missing');
  await page.mouse.move(box.x+box.width*.85,box.y+box.height*.4);await page.mouse.down();await page.mouse.move(box.x+box.width*.15,box.y+box.height*.4,{steps:16});await page.mouse.up();
  try{
   await expect(page.getByRole('status')).toHaveText('Güncelleniyor…');
   await expect(page.locator('.map-stage')).toHaveAttribute('aria-busy','true');
   await expect.poll(()=>areaRequests).toBeGreaterThan(0);
   await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count',String(elements.length));
   const ring=await page.locator('.map-loader-ring').evaluate(el=>{const s=getComputedStyle(el);return{width:el.getBoundingClientRect().width,animation:s.animationName};});
   expect(ring.width).toBeGreaterThanOrEqual(16);expect(ring.animation).toBe('map-refresh-spin');
   await expect.poll(()=>supplementRequests).toBeGreaterThan(0);
   await page.emulateMedia({reducedMotion:'reduce'});
   expect(await page.locator('.map-loader-ring').evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
   releaseArea();await page.waitForTimeout(150);
   await expect(page.getByRole('status')).toHaveText('Güncelleniyor…');
   await page.screenshot({path:test.info().outputPath('map-refresh.png')});
  }finally{releaseArea();releaseSupplement();}
  await expect(page.locator('.map-loading-indicator')).toHaveCount(0);
  await expect(page.locator('.map-stage')).toHaveAttribute('aria-busy','false');
  await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count',String(elements.length));
 });
}
test('dense places use native map layers and accessible viewport list',async({page})=>{
 await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements}}));
 await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
 await setup(page);
 await page.getByRole('button',{name:/Haritadaki yerler/}).click();
 const rows=page.locator('.map-visible-row');
 await expect(rows).toHaveCount(elements.length);
 const targets=await rows.evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height));
 expect(targets.every(height=>height>=44)).toBe(true);
 await rows.filter({hasText:'Veteriner Kliniği 1'}).click();
 await expect(page.locator('.map-place-sheet')).toContainText('Veteriner Kliniği 1');
 await expect(page.locator('.map-visible-list')).toHaveCount(0);
 await page.screenshot({path:test.info().outputPath('map-layered-list.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('category sheets and map details work without secure-context randomUUID',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(crypto,'randomUUID',{value:undefined,configurable:true}));
 await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements}}));
 await page.route('**/api/overture?**',r=>r.fulfill({json:{places:[]}}));
 await setup(page);
 await page.getByRole('button',{name:/Haritadaki yerler/}).click();
  await page.locator('.map-visible-row').filter({hasText:'Veteriner Kliniği 1'}).click();
 await expect(page.locator('.map-place-sheet')).toContainText('Veteriner Kliniği 1');
 await page.goBack();await expect(page.locator('.map-place-sheet')).toHaveCount(0);
 await expect(page.locator('.map-stage')).toBeVisible();
 await page.goBack();await expect(page.locator('.map-stage')).toHaveCount(0);
 await expect(page.locator('.place-row')).toHaveCount(elements.length);
});
