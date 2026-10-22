import {test,expect} from '@playwright/test';
test('branded client menu and separately configurable combo variants',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await page.goto('/');
 await expect(page.getByRole('img',{name:'The Chef Warriors logo'}).first()).toBeVisible();
 await expect(page.getByText('76 items',{exact:true})).toBeVisible();
 await page.getByLabel('Search menu items').fill('Students Combo');
 for(const value of ['Mini Rice','Mini Noodles']){
  await page.getByRole('button',{name:'Choose Students Combo',exact:true}).click();
  await page.getByLabel('Mini rice or noodles',{exact:true}).selectOption(value);
  await page.getByRole('button',{name:'Add to order · ₹120',exact:true}).click();
 }
 await expect(page.locator('.cart-item')).toHaveCount(2);
 await page.screenshot({path:'test-results/client-combo.png'});
 await page.getByRole('button',{name:'Save & Print Bill',exact:true}).click();
 const paper=page.getByRole('document',{name:'Customer receipt preview'});
 await expect(paper).toContainText('The Chef Warriors');await expect(paper).toContainText('8754090104');
 await expect(paper).toContainText('Mini Rice');await expect(paper).toContainText('Mini Noodles');await expect(paper).toContainText('Mini Shawarma');
 await expect(page.getByRole('button',{name:'Kitchen ticket',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Close dialog'}).click();await page.getByLabel('Search menu items').fill('');await page.screenshot({path:'test-results/client-billing.png'});
});
