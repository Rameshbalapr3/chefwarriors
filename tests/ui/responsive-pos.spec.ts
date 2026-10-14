import {test,expect} from '@playwright/test';
import {initialState} from '../../src/domain/seed';
for(const size of [{width:2560,height:2194},{width:1920,height:1080},{width:1280,height:1024},{width:1024,height:768},{width:1024,height:600},{width:800,height:1280},{width:768,height:1024},{width:390,height:844},{width:360,height:640}])test(`responsive counter ${size.width}x${size.height}`,async({page})=>{
 await page.setViewportSize(size);
 await page.addInitScript(state=>{window.pos={mode:'desktop',authStatus:async()=>({ok:true,data:{setup:false,session:{username:'Counter',role:'admin'}}}),state:async()=>({ok:true,data:state})} as typeof window.pos;},initialState());
 await page.goto('/');
 const item=page.locator('.menu-product').first();await expect(item).toBeVisible();
 expect(await item.evaluate(el=>parseFloat(getComputedStyle(el.querySelector('h3')!).fontSize))).toBeGreaterThanOrEqual(14);
 const category=page.getByRole('button',{name:'All items',exact:true});expect((await category.boundingBox())!.height).toBeGreaterThanOrEqual(44);
 await item.click();
 if(size.width<=800)await page.getByRole('button',{name:/^Order \(1\)/}).click();
 await expect(page.locator('.cart-item')).toHaveCount(1);
 const qty=page.getByRole('button',{name:/^Increase /}).first();
 expect((await qty.boundingBox())!.width).toBeGreaterThanOrEqual(44);await qty.click();
 const save=page.getByRole('button',{name:'Save & Print Bill',exact:true});await expect(save).toBeEnabled();
 const bounds=await save.boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(size.height);expect(bounds!.height).toBeGreaterThanOrEqual(44);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 const cart=await page.locator('.cart-items').boundingBox();expect(cart!.height).toBeGreaterThanOrEqual(44);
 await page.screenshot({path:`test-results/responsive-${size.width}-${size.height}.png`});
 if(size.width<=800){await page.getByRole('button',{name:'Menu',exact:true}).click();await expect(item).toBeVisible();}
});
