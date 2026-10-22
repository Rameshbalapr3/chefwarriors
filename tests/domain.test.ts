import {describe,it,expect} from 'vitest';
import {calculate,kitchenTicket,csvCell,report,localDate,localMonth,nextDailyToken,dailyTokenTaken,tokenHistoryByDay,monthlyOrderTotals,servedContents} from '../src/domain/model';
import {initialState} from '../src/domain/seed';
import {checkout,cancel,saveItem,saveSettings,preparePrint} from '../src/application/engine';
import {receiptHtml} from '../src/domain/receipt';
const admin={username:'admin',role:'admin' as const},cashier={username:'cashier',role:'cashier' as const};
const input=()=>({key:crypto.randomUUID(),lines:[{id:'cw-fried-chicken-wings-1-pc',qty:2,notes:'No onions'}],discount:0,type:'Takeaway' as const,token:'01',payment:'Cash' as const,tendered:30000});
describe('billing rules',()=>{
 it('calculates integer paise, discount, exclusive tax and rounding',()=>{expect(calculate([{price:12000,qty:2}],4000,5,'paise')).toEqual({subtotal:24000,discount:4000,tax:1000,rounding:0,total:21000});expect(calculate([{price:1055,qty:1}],0,0,'rupee')).toMatchObject({total:1100,rounding:45});});
 it('rejects invalid quantities, prices and excessive discounts',()=>{for(const qty of [0,-1,1.1,1000,NaN])expect(()=>calculate([{price:10,qty}],0,0,'paise')).toThrow();expect(()=>calculate([{price:-1,qty:1}],0,0,'paise')).toThrow();expect(()=>calculate([{price:10,qty:1}],11,0,'paise')).toThrow();});
 it('saves exactly one order and two jobs for duplicate request keys',()=>{const s=initialState(),i=input();const first=checkout(s,admin,i,true),second=checkout(s,admin,i,true);expect(first.id).toBe(second.id);expect(s.orders).toHaveLength(1);expect(s.jobs).toHaveLength(2);expect(first.change).toBe(18000);});
 it('queues two identical customer bills and no kitchen ticket',()=>{const s=initialState();checkout(s,admin,input(),true);expect(s.jobs).toHaveLength(2);expect(s.jobs.map(j=>j.kind)).toEqual(['counter','counter']);expect(s.jobs.every(j=>!j.copy)).toBe(true);s.settings.sharedPrinter=true;s.settings.counter='Counter';s.settings.kitchen='Counter';checkout(s,admin,{...input(),key:crypto.randomUUID()},true);expect(s.jobs.filter(j=>j.orderId===s.orders[0].id).map(j=>j.kind)).toEqual(['counter','counter']);});
 it('rejects empty carts and underpaid cash',()=>{const s=initialState();expect(()=>checkout(s,admin,{...input(),lines:[]},true)).toThrow();expect(()=>checkout(s,admin,{...input(),tendered:0},true)).toThrow();expect(s.orders).toHaveLength(0);});
 it('keeps historical price and shop snapshots',()=>{const s=initialState(),o=checkout(s,admin,input(),true);saveItem(s,admin,{...s.items[0],price:90000});saveSettings(s,admin,{...s.settings,shop:'New name'});expect(o.lines[0].price).toBe(6000);expect(o.settings.shop).toBe('The Chef Warriors');});
 it('produces price-free kitchen payload and escapes receipt content',()=>{const s=initialState();s.items[0].name='<script>Bad</script>';const o=checkout(s,admin,input(),true),kot=JSON.stringify(kitchenTicket(o));for(const word of ['price','tax','total','discount','payment','tendered'])expect(kot).not.toContain(word);const html=receiptHtml(o,'kitchen');expect(html).not.toContain('<script>');expect(html).not.toContain('₹');expect(html).toContain(o.reference);expect(html).toContain('No onions');});
 it('prints a customer bill with shop header, order number and no zero clutter',()=>{const s=initialState();const o=checkout(s,admin,input(),true);const html=receiptHtml(o,'counter');expect(html).toContain('THE CHEF WARRIORS');expect(html).toContain(`ORDER NO : ${o.reference}`);expect(html).toContain('>ITEM<');expect(html).toContain('>QTY<');expect(html).toContain('class="qty">2<');expect(html).toContain('SUBTOTAL');expect(html).toContain('TOTAL');expect(html).toContain('Thank you. Visit us again!');expect(html).not.toContain('Discount');expect(html).not.toContain('Tax (');expect(html).not.toContain('Cash recorded');expect(html).not.toContain('<script>');});
 it('keeps discount and tax on the customer bill when they apply',()=>{const s=initialState();s.settings.taxRate=5;const o=checkout(s,admin,{...input(),discount:4000},true);const html=receiptHtml(o,'counter');expect(html).toContain('Discount');expect(html).toContain('Tax (5%)');expect(html).toContain('TOTAL');});
 it('excludes cancellations and reconciles payments',()=>{const s=initialState();const a=checkout(s,admin,input(),true);checkout(s,admin,{...input(),payment:'UPI'},true);cancel(s,admin,a.id,'Customer changed mind');const r=report(s.orders);expect(r.sales).toBe(12000);expect(r.cancelled).toBe(12000);expect(r.payments.reduce((sum,p)=>sum+p.total,0)).toBe(r.sales);});
 it('enforces service permissions and required reasons',()=>{const s=initialState(),o=checkout(s,cashier,input(),true);expect(()=>cancel(s,cashier,o.id,'Reason')).toThrow();expect(()=>cancel(s,admin,o.id,'')).toThrow();expect(()=>saveItem(s,cashier,s.items[0])).toThrow();expect(()=>saveSettings(s,cashier,s.settings)).toThrow();});
 it('retries only failed job; unknown needs reviewed copy',()=>{const s=initialState();checkout(s,admin,{...input(),simulation:'kitchen-failure'},true);expect(s.jobs[0].state).toBe('preview');const j=preparePrint(s,cashier,s.jobs[1].id);expect(j.id).toBe(s.jobs[1].id);expect(s.jobs).toHaveLength(2);s.jobs[1].state='unknown';expect(()=>preparePrint(s,admin,j.id)).toThrow();const copy=preparePrint(s,admin,j.id,'Checked printer; no ticket');expect(copy.copy).toBe(true);expect(s.orders).toHaveLength(1);expect(s.jobs).toHaveLength(3);});
 it('escapes spreadsheet formulas',()=>{expect(csvCell('=CMD()')).toBe('"\'=CMD()"');expect(csvCell(' hello')).toBe('" hello"');expect(csvCell('a"b')).toBe('"a""b"');});
 it('prints chosen combo items and omits unused alternatives',()=>{
  const s=initialState(),item=s.items.find(i=>i.name==='Birthday Combo — Medium Load')!;
  const o=checkout(s,admin,{...input(),lines:[{id:item.id,qty:1,notes:'',choices:{'Grill or BBQ':'Grill','Rice or noodles':'Noodles'}}],tendered:54000},true);
  const html=receiptHtml(o,'counter'),served=servedContents(o.lines[0]);
  expect(o.reference).toBe('CW-1001');expect(o.totals.total).toBe(54000);
  expect(served.contents).toEqual(['Half Grill (1)','Fried Chicken Shawarma (1)','Fried Chicken Burger (1)','Fried Chicken Sandwich (1)','Noodles (1)']);
  expect(html).toContain('Half Grill (1)');expect(html).toContain('Fried Chicken Shawarma (1)');expect(html).toContain('Noodles (1)');
  expect(html).not.toContain('(or)');expect(html).not.toContain('Grill or BBQ:');expect(html).not.toContain('BBQ (1)');
  const kot=kitchenTicket(o);expect(kot.items[0].contents).toContain('Half Grill (1)');expect(kot.items[0].contents).not.toContain('(or)');
 });
 it('splits two rice/noodles picks on a top-load combo',()=>{
  const s=initialState(),item=s.items.find(i=>i.name==='Birthday Combo — Top Load')!;
  const o=checkout(s,admin,{...input(),lines:[{id:item.id,qty:1,notes:'',choices:{'Grill or BBQ':'BBQ','First rice/noodles':'Rice','Second rice/noodles':'Noodles'}}],tendered:100000},true);
  expect(servedContents(o.lines[0]).contents).toEqual(['Full BBQ (1)','Fried Chicken Shawarma (2)','Fried Chicken Burger (2)','Fried Chicken Sandwich (2)','Rice (1)','Noodles (1)']);
 });
 it('assigns a daily token from 1 without changing invoice numbers or typed token',()=>{
  const s=initialState(),first=checkout(s,admin,input(),true),second=checkout(s,admin,{...input(),key:crypto.randomUUID()},true);
  expect(first.reference).toBe('CW-1001');expect(second.reference).toBe('CW-1002');
  expect(first.token).toBe('01');expect(second.token).toBe('01');
  expect(first.dailyToken).toBe(1);expect(second.dailyToken).toBe(2);
  expect(s.sequence).toBe(1002);
 });
 it('resets the daily token each local day and keeps the monthly order total',()=>{
  const s=initialState(),first=checkout(s,admin,input(),true);
  const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
  first.created=yesterday.toISOString();
  const second=checkout(s,admin,{...input(),key:crypto.randomUUID()},true);
  expect(second.dailyToken).toBe(1);expect(second.reference).toBe('CW-1002');
  const lastMonth=new Date();lastMonth.setMonth(lastMonth.getMonth()-1);
  first.created=lastMonth.toISOString();
  const days=tokenHistoryByDay(s.orders),months=monthlyOrderTotals(s.orders);
  expect(days).toHaveLength(2);expect(days.every(row=>row.first===1&&row.count===1)).toBe(true);
  expect(months.reduce((sum,row)=>sum+row.count,0)).toBe(2);
  expect(months.find(row=>row.month===localMonth(second.created))?.count).toBe(1);
  expect(months.find(row=>row.month===localMonth(first.created))?.count).toBe(1);
 });
 it('blocks a duplicate daily token on the same day',()=>{
  const now=new Date().toISOString(),day=localDate(now);
  expect(nextDailyToken([])).toBe(1);
  expect(nextDailyToken([{created:now,dailyToken:1},{created:now,dailyToken:2}])).toBe(3);
  expect(nextDailyToken([{created:now,dailyToken:50},{created:'2000-01-01T12:00:00',dailyToken:9}])).toBe(51);
  expect(dailyTokenTaken([{created:now,dailyToken:1}],day,1)).toBe(true);
  expect(dailyTokenTaken([{created:now,dailyToken:1}],day,2)).toBe(false);
  expect(dailyTokenTaken([{created:'2000-01-01T12:00:00',dailyToken:1}],day,1)).toBe(false);
 });
});
