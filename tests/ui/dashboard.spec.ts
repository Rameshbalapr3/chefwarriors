import {test,expect} from '@playwright/test';
import {initialState} from '../../src/domain/seed';
import {checkout} from '../../src/application/engine';
test('dashboard uses saved sales and recent-order navigation',async({page})=>{
 const state=initialState();
 for(let i=0;i<3;i++)checkout(state,{role:'admin',username:'test'},{key:`dashboard-order-${i}`,lines:[{id:state.items[0].id,qty:1,notes:''}],discount:0,type:'Takeaway',token:'01',payment:'Cash',tendered:6000},false);
 state.orders[1].state='cancelled';state.orders[2].created='2020-01-01T00:00:00Z';
 await page.setViewportSize({width:1366,height:768});
 await page.addInitScript(state=>{window.pos={mode:'browser',authStatus:async()=>({ok:true,data:{setup:false,session:{username:'Test',role:'admin'}}}),state:async()=>({ok:true,data:state})} as typeof window.pos;},state);
 await page.goto('/');
 const summary=page.locator('.dashboard-stats');
 await expect(summary.locator('strong')).toHaveText(['₹60','1','₹60']);
 await expect(page.getByText('Frequently sold',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'View all',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Order history',exact:true})).toBeVisible();
});
