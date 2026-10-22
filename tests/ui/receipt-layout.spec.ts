import {test,expect} from '@playwright/test';
import {initialState} from '../../src/domain/seed';
import {checkout} from '../../src/application/engine';
for(const size of [{width:1920,height:1080},{width:1366,height:768},{width:1280,height:650}])test(`receipt fits ${size.width}x${size.height}`,async({page})=>{
 const state=initialState();
 checkout(state,{role:'admin',username:'test'},{key:'layout-test-receipt',lines:state.items.slice(0,6).map(i=>({id:i.id,qty:1,notes:''})),discount:0,type:'Takeaway',token:'01',payment:'Cash',tendered:100000},false);
 state.jobs.forEach(j=>{j.state='failed';j.attempts=[{at:new Date().toISOString(),outcome:'No printer assigned'}];});
 await page.setViewportSize(size);
 await page.addInitScript(state=>{window.pos={mode:'desktop',authStatus:async()=>({ok:true,data:{setup:false,session:{username:'Test',role:'admin'}}}),state:async()=>({ok:true,data:state})} as typeof window.pos;},state);
 await page.goto('/');await page.getByRole('button',{name:'View / retry',exact:true}).click();
 const dialog=page.locator('dialog');
 await expect(page.getByRole('document',{name:'Customer receipt preview'})).toContainText('CW-1001');
 await expect.poll(()=>page.locator('.document-paper-scroll').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 expect(await dialog.evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 for(const button of await page.getByRole('button',{name:'Retry document',exact:true}).all()){
  const box=await button.boundingBox();expect(box!.y+box!.height).toBeLessThan(size.height);
 }
 await page.screenshot({path:`test-results/receipt-layout-${size.width}.png`});
 const paper=page.getByRole('document',{name:'Customer receipt preview'});
 await expect(paper).toContainText('CW-1001');
 await expect(page.getByRole('button',{name:'Kitchen ticket',exact:true})).toHaveCount(0);
 async function stable(){
  const samples=await paper.evaluate(async el=>{
   const samples:number[]=[];
   for(let i=0;i<45;i++){await new Promise(requestAnimationFrame);samples.push(el.getBoundingClientRect().width);}
   return samples.slice(5);
  });
  expect(Math.max(...samples)-Math.min(...samples)).toBeLessThan(.1);
 }
 await stable();
 await page.getByRole('button',{name:'Zoom in receipt'}).click();await stable();
 await page.getByTitle('Fit the whole receipt').click();await stable();
 await page.setViewportSize({width:size.width-100,height:size.height-60});await stable();
});
