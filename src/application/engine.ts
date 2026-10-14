import {checkoutSchema,itemSchema,settingsSchema,calculate,type State,type Session,type Checkout,type Order,type Item,type Settings,type Job} from '../domain/model';
export function requireAdmin(session:Session){if(session.role!=='admin')throw Error('Administrator permission required');}
export function audit(s:State,actor:Session,action:string,record:string,reason=''){s.audit.push({at:new Date().toISOString(),actor:actor.username,action,record,reason});}
export function checkout(s:State,session:Session,raw:Checkout,demo:boolean):Order{
 const input=checkoutSchema.parse(raw),existing=s.orders.find(o=>o.key===input.key);if(existing)return existing;
 const variants=input.lines.map(l=>l.id+JSON.stringify(Object.entries(l.choices||{}).sort()));
 if(new Set(variants).size!==input.lines.length)throw Error('Duplicate cart lines');
 const lines=input.lines.map(l=>{const item=s.items.find(p=>p.id===l.id);if(!item?.available)throw Error('An item is no longer available');const options=item.options||[],choices=l.choices||{};if(Object.keys(choices).length!==options.length||options.some(o=>!o.values.includes(choices[o.name])))throw Error(`Choose all options for ${item.name}`);const selection=options.map(o=>`${o.name}: ${choices[o.name]}`).join('; ');return {...structuredClone(item),qty:l.qty,notes:[selection,l.notes].filter(Boolean).join(' · ')};});
 const totals=calculate(lines,input.discount,s.settings.taxRate,s.settings.rounding);if(input.payment==='Cash'&&input.tendered<totals.total)throw Error('Cash received must cover the total');
 const order:Order={id:crypto.randomUUID(),reference:`CW-${++s.sequence}`,key:input.key,created:new Date().toISOString(),state:'paid',type:input.type,token:input.token,payment:input.payment,tendered:input.payment==='Cash'?input.tendered:totals.total,change:input.payment==='Cash'?input.tendered-totals.total:0,lines,totals,settings:structuredClone(s.settings)};
 s.orders.unshift(order);
 // Two separate printers: 1 bill + 1 KOT. Shared/single printer: 2 bills + 1 KOT on that device.
 const billCopies=s.settings.sharedPrinter?2:1;
 const enqueue=(kind:'counter'|'kitchen')=>{let state:Job['state']=demo?'preview':'queued';if(demo&&input.simulation==='unknown')state='unknown';else if(demo&&(input.simulation==='both-fail'||(input.simulation==='kitchen-failure'&&kind==='kitchen')))state='failed';s.jobs.push({id:crypto.randomUUID(),orderId:order.id,kind,state,printer:s.settings[kind],copy:false,reason:'',attempts:[]});};
 for(let i=0;i<billCopies;i++)enqueue('counter');
 enqueue('kitchen');
 audit(s,session,'checkout',order.id);return order;
}
export function saveItem(s:State,session:Session,input:Item){requireAdmin(session);const item=itemSchema.parse(input);if(!s.categories.includes(item.category))throw Error('Choose a valid category');const i=s.items.findIndex(p=>p.id===item.id);if(i<0)s.items.push(item);else s.items[i]=item;audit(s,session,'menu',item.id);}
export function saveSettings(s:State,session:Session,input:Settings){requireAdmin(session);const settings=settingsSchema.parse(input);if(settings.counter&&settings.counter===settings.kitchen&&!settings.sharedPrinter)throw Error('Assign different printers or explicitly allow sharing');s.settings=settings;audit(s,session,'settings','shop');}
export function cancel(s:State,session:Session,id:string,reason:string){requireAdmin(session);if(!reason.trim()||reason.length>300)throw Error('Enter a cancellation reason (1–300 characters)');const order=s.orders.find(o=>o.id===id);if(!order||order.state!=='paid')throw Error('Order cannot be cancelled');order.state='cancelled';order.reason=reason;audit(s,session,'cancel',id,reason);}
export function preparePrint(s:State,session:Session,id:string,reason=''):Job{
 const job=s.jobs.find(j=>j.id===id);if(!job)throw Error('Print job not found');if(job.state==='submitting')throw Error('Print submission is in progress');
 if(job.state==='queued'||job.state==='failed')return job;
 requireAdmin(session);if(!reason.trim()||reason.length>300)throw Error('Confirm printer review and provide a reprint reason');
 const copy:Job={...structuredClone(job),id:crypto.randomUUID(),state:'queued',copy:true,reason,attempts:[]};s.jobs.push(copy);audit(s,session,'reprint',copy.id,reason);return copy;
}
