import {BrowserWindow} from 'electron';
import type {Job,Order} from '../../src/domain/model';
import {receiptHtml} from '../../src/domain/receipt';
export async function dispatch(order:Order,job:Job):Promise<{state:'submitted'|'failed'|'unknown';detail:string}>{
 if(!job.printer)return {state:'failed',detail:'No printer assigned. Configure Settings before retrying.'};
 const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
 try{const printers=await win.webContents.getPrintersAsync();if(!printers.some(p=>p.name===job.printer))return {state:'failed',detail:'Assigned printer is not installed'};
 await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(receiptHtml(order,job.kind,job.copy)));
 return await new Promise(resolve=>{let done=false;const finish=(state:'submitted'|'failed'|'unknown',detail:string)=>{if(done)return;done=true;clearTimeout(timer);resolve({state,detail});};const timer=setTimeout(()=>finish('unknown','No print-system response. Check physical output before reprinting.'),30000);try{win.webContents.print({silent:true,deviceName:job.printer,printBackground:false,margins:{marginType:'none'},pageSize:{width:Number(order.settings.width)*1000,height:Math.max(120000,(order.lines.length*14+100)*1000)}},(success,reason)=>finish(success?'submitted':'unknown',success?'Print system accepted the document; physical output unverified':reason||'Print-system failure; output may be ambiguous'));}catch(e){finish('failed',e instanceof Error?e.message:'Dispatch rejected');}});
 }catch(e){return {state:'failed',detail:e instanceof Error?e.message:'Printer unavailable'};}finally{if(!win.isDestroyed())win.destroy();}
}
