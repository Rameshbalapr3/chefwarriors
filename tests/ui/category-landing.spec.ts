import {test,expect} from '@playwright/test';

test('billing starts on category cards and keeps the cart when returning',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await page.goto('/');
 await expect(page.getByRole('heading',{name:'Add items to bill'})).toBeVisible();
 await expect(page.getByText(/\d+ categories$/)).toBeVisible();
 await expect(page.getByRole('button',{name:/^All items, 76 items/})).toBeVisible();
 await expect(page.locator('.product-grid')).toHaveCount(0);
 await expect(page.getByRole('button',{name:/^Add Fried Chicken Burger$/})).toHaveCount(0);

 const categoryGrid=page.locator('.category-card-grid');
 expect(await categoryGrid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(4);
 const burger=page.getByRole('button',{name:/^Burger, \d+ items/});await burger.focus();await burger.press('Enter');
 await expect(page.getByRole('heading',{name:'Burger',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Back to categories',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Add Fried Chicken Burger',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Add Fried Chicken Burger',exact:true}).click();
 await expect(page.locator('.cart-item')).toHaveCount(1);
 await page.getByRole('button',{name:'Back to categories',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Add items to bill'})).toBeVisible();
 await expect(page.locator('.product-grid')).toHaveCount(0);
 await expect(page.locator('.cart-item')).toHaveCount(1);
});

test('search opens all matching products and clearing returns to categories',async({page})=>{
 await page.goto('/');await page.getByLabel('Search menu items').fill('Students Combo');
 await expect(page.getByRole('heading',{name:'All items',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:/Choose Students Combo/})).toBeVisible();
 await page.getByLabel('Search menu items').fill('');
 await expect(page.getByRole('heading',{name:'Add items to bill'})).toBeVisible();
 await expect(page.locator('.product-grid')).toHaveCount(0);
});

test('desktop navigation stays fixed in a compact rail and expands on request',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await page.goto('/');
 const rail=page.locator('.sidebar');
 expect(await rail.evaluate(el=>getComputedStyle(el).position)).toBe('fixed');
 expect(await rail.evaluate(el=>getComputedStyle(el).overflowY)).toBe('hidden');
 expect((await rail.boundingBox())!.width).toBe(78);
 await page.getByRole('button',{name:'Expand navigation'}).click();
 await expect(page.getByRole('button',{name:'Collapse navigation'})).toHaveAttribute('aria-expanded','true');
 await expect(rail.getByText('Billing',{exact:true})).toBeVisible();
 expect(await page.locator('.topbar').evaluate(el=>getComputedStyle(el).marginLeft)).toBe('194px');
 await page.getByRole('button',{name:'Collapse navigation'}).click();
 await expect(page.getByRole('button',{name:'Expand navigation'})).toHaveAttribute('aria-expanded','false');
});

for(const viewport of [{width:1000,height:768,columns:3},{width:390,height:844,columns:2}]){
 test(`category cards use ${viewport.columns} columns at ${viewport.width}px`,async({page})=>{
  await page.setViewportSize({width:viewport.width,height:viewport.height});await page.goto('/');
  const grid=page.locator('.category-card-grid');await expect(grid).toBeVisible();
  expect(await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(viewport.columns);
  expect((await page.locator('.category-card').first().boundingBox())!.height).toBeGreaterThanOrEqual(120);
 });
}
