import {test,expect,_electron as electron} from '@playwright/test';
import {mkdtempSync,cpSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('saved receipt renders while both printer callbacks are still pending',async()=>{
 test.setTimeout(90000);
 const dir=mkdtempSync(join(tmpdir(),'cw-instant-')),stage=join(dir,'app');mkdirSync(stage);
 for(const name of ['dist','dist-desktop','package.json'])cpSync(join(process.cwd(),name),join(stage,name),{recursive:true});
 const app=await electron.launch({args:[stage],env:{...process.env,POS_TEST_DATA:join(dir,'data'),POS_TEST_BROWSER_PORT:'18379'},timeout:60000});
 try{
  const page=await app.firstWindow();
  await page.getByLabel('Username',{exact:true}).fill('manager');
  await page.getByLabel('Password',{exact:true}).fill('isolated-test-password');
  await page.getByRole('button',{name:'Create admin account'}).click();
  await expect(page.getByRole('heading',{name:'Add items to bill'})).toBeVisible();
  await app.evaluate(({app})=>{
   (globalThis as any).pendingTestPrints=[];
   app.on('browser-window-created',(_event,win)=>{
    win.loadURL=async()=>{};
    win.webContents.getPrintersAsync=async()=>[{name:'Test printer'}] as any;
    win.webContents.print=(_options,callback)=>{(globalThis as any).pendingTestPrints.push(callback);};
   });
  });
  await page.evaluate(async()=>{
   const r=await window.pos!.state();if(!r.ok)throw Error(r.error);
   const saved=await window.pos!.saveSettings({...r.data.settings,counter:'Test printer',kitchen:'Test printer',sharedPrinter:true});
   if(!saved.ok)throw Error(saved.error);
  });
  await page.locator('.menu-product').first().click();
  await page.getByRole('button',{name:'Save & Print Bill',exact:true}).click();
  const paper=page.getByRole('document',{name:'Customer receipt preview'});
  await expect(paper).toContainText('CW-1001',{timeout:3000});
  await expect(paper).toContainText('Fried Chicken Wings');
  await expect.poll(()=>app.evaluate(()=>(globalThis as any).pendingTestPrints.length)).toBe(2);
  const state=await page.evaluate(()=>window.pos!.state());
  expect(state.ok&&state.data.orders.length).toBe(1);
  expect(state.ok&&state.data.jobs.every(j=>j.state==='submitting')).toBe(true);
  await page.getByRole('button',{name:'Kitchen ticket',exact:true}).click();
  const kitchen=page.getByRole('document',{name:'Price-free kitchen ticket preview'});
  await expect(kitchen).toContainText('KITCHEN ORDER');await expect(kitchen).not.toContainText('₹');
  await page.getByRole('button',{name:'Zoom in receipt'}).click();await expect(kitchen).toContainText('CW-1001');
  await app.evaluate(()=>{for(const cb of (globalThis as any).pendingTestPrints)cb(true);});
  await expect(page.getByText('Submitted to printer',{exact:true})).toHaveCount(2,{timeout:5000});
  await page.screenshot({path:'test-results/instant-receipt.png'});
 }finally{
  await app.evaluate(()=>{for(const cb of (globalThis as any).pendingTestPrints||[])cb(true);}).catch(()=>{});
  await app.close();
 }
});
