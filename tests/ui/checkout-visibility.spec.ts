import {test,expect} from '@playwright/test';

// Zoom/display scaling reduces the CSS viewport, even on a large physical monitor.
for(const viewport of [{width:1280,height:586},{width:1024,height:600},{width:1366,height:768}]){
 test(`checkout stays usable at ${viewport.width}x${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);
  await page.goto('/');
  await page.getByRole('button',{name:/^All items,/}).click();
  const save=page.getByRole('button',{name:'Save & Print Bill',exact:true});
  async function checkAction(){
   const box=await save.boundingBox();
   expect(box).not.toBeNull();
   expect(box!.y).toBeGreaterThanOrEqual(0);
   expect(box!.y+box!.height).toBeLessThanOrEqual(viewport.height);
   expect(await save.evaluate(el=>{
    const r=el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.x+r.width/2,r.bottom-2));
   })).toBe(true);
   await expect(page.getByText('Grand Total',{exact:true})).toBeInViewport();
  }
  await checkAction();
  for(const name of ['Fried Chicken Burger','Mini Fried Chicken Burger','Zinger Tandoori Fried Chicken Burger','Fried Chicken & Cheese Burger','Peri Peri French Fries']){
   await page.getByRole('button',{name:`Add ${name}`,exact:true}).click();
  }
  await checkAction();
  await page.locator('.order-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
  await checkAction();
  await page.screenshot({path:`test-results/checkout-${viewport.width}-${viewport.height}.png`});
  await save.click();
  await expect(page.getByRole('heading',{name:/CW-1001/})).toBeVisible();
 });
}
