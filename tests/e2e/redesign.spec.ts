import {test,expect} from '@playwright/test';
test('services contain pharmacy and preserve the existing game flow',async({page})=>{
 await page.goto('/?preview');
 await expect(page.locator('.map-canvas')).toBeVisible();
 await page.locator('.shell-nav--mobile').getByRole('button',{name:'Hizmetler'}).click();
 await page.locator('.service-category-grid').getByRole('button',{name:'Eczane',exact:true}).click();
 await expect(page.getByRole('button',{name:'Nöbetçi',exact:true})).toBeVisible();
 await expect(page.locator('.category-rail').getByText('Nöbetçi')).toHaveCount(0);
 await page.getByRole('button',{name:'Nöbetçi',exact:true}).click();
 await expect(page.locator('.place-row')).toContainText('Örnek Nöbetçi Eczane');
 await page.locator('.place-row').click();
 await expect(page.getByRole('dialog',{name:'Örnek Nöbetçi Eczane',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Kapat',exact:true}).click();
 await page.locator('.shell-nav--mobile').getByRole('button',{name:'Diğer',exact:true}).click();await page.getByRole('button',{name:/^Oyunlar/}).click();
 await page.getByRole('button',{name:'2048 Sayı oyunu'}).click();
 await expect(page.frameLocator('iframe').locator('.tile').first()).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('first place source renders without waiting for the other source',async({page})=>{
 let finish: (()=>void)|undefined;
 await page.route('**/api/viewport?**',r=>r.fulfill({json:{elements:[{type:'node',id:1,lat:36.884,lon:30.704,tags:{name:'Hızlı Market',shop:'supermarket'}}]}}));
 await page.route('**/api/overture?**',async r=>{await new Promise<void>(resolve=>{finish=resolve});await r.fulfill({json:{places:[]}});});
 await page.addInitScript(()=>localStorage.setItem('yakinim:v2:last-location',JSON.stringify({lat:36.884,lng:30.704,savedAt:Date.now()})));
 await page.goto('/');
 try{await expect(page.locator('.map-stage')).toHaveAttribute('data-place-count','1');}finally{finish?.();}
});
