import {test,expect} from '@playwright/test';
import {initialState} from '../../src/domain/seed';

for(const size of [{width:1920,height:1080},{width:1920,height:650},{width:1366,height:768},{width:1280,height:586},{width:1024,height:600}]){
 test(`home menu scroll stays contained ${size.width}x${size.height}`,async({page})=>{
  await page.setViewportSize(size);
  await page.addInitScript(state=>{
   window.pos={mode:'desktop',authStatus:async()=>({ok:true,data:{setup:false,session:{username:'Layout test',role:'admin'}}}),state:async()=>({ok:true,data:state})} as typeof window.pos;
  },initialState());
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Add items to bill'})).toBeVisible();
  const fixed=page.locator('.topbar,.billing-categories,.checkout-actions');
  const before=await fixed.evaluateAll(els=>els.map(el=>el.getBoundingClientRect().y));
  const menu=page.locator('.menu-products-scroll');
  await menu.hover();await page.mouse.wheel(0,700);
  await expect.poll(()=>menu.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  expect(await fixed.evaluateAll(els=>els.map(el=>el.getBoundingClientRect().y))).toEqual(before);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const save=page.getByRole('button',{name:'Save & Print Bill',exact:true});
  const box=await save.boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(size.height);
  await menu.evaluate(el=>el.scrollTop=0);
  for(let i=0;i<5;i++)await page.locator('.menu-product').nth(i).click();
  await page.getByText('Discount and tax details',{exact:true}).click();
  const after=await save.boundingBox();expect(after!.y+after!.height).toBeLessThanOrEqual(size.height);
  await page.screenshot({path:`test-results/fixed-home-${size.width}-${size.height}.png`});
 });
}
