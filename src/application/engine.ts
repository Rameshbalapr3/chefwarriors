import {amendOrderSchema,checkoutSchema,expenseSchema,itemSchema,settingsSchema,calculate,dailyTokenTaken,localDate,nextBillReference,nextDailyToken,normalizeExpenses,type AmendOrder,type State,type Session,type Checkout,type Order,type Item,type Settings,type Job,type Expense} from '../domain/model';
export function requireAdmin(session:Session){if(session.role!=='admin')throw Error('Administrator permission required');}
export function audit(s:State,actor:Session,action:string,record:string,reason=''){s.audit.push({at:new Date().toISOString(),actor:actor.username,action,record,reason});}
function expensesOf(s:State){s.expenses=normalizeExpenses(s.expenses);return s.expenses;}
export function checkout(s:State,session:Session,raw:Checkout,demo:boolean):Order{
 const input=checkoutSchema.parse(raw),existing=s.orders.find(o=>o.key===input.key);if(existing)return existing;
 const variants=input.lines.map(l=>l.id+JSON.stringify(Object.entries(l.choices||{}).sort()));
 if(new Set(variants).size!==input.lines.length)throw Error('Duplicate cart lines');
 const lines=input.lines.map(l=>{const item=s.items.find(p=>p.id===l.id);if(!item?.available)throw Error('An item is no longer available');const options=item.options||[],choices=l.choices||{};if(Object.keys(choices).length!==options.length||options.some(o=>!o.values.includes(choices[o.name])))throw Error(`Choose all options for ${item.name}`);const selection=options.map(o=>`${o.name}: ${choices[o.name]}`).join('; ');const snap=structuredClone(item);delete snap.photo;return {...snap,qty:l.qty,notes:[selection,l.notes].filter(Boolean).join(' · ')};});
 const totals=calculate(lines,input.discount,s.settings.taxRate,s.settings.rounding);if(input.payment==='Cash'&&input.tendered<totals.total)throw Error('Cash received must cover the total');
 const created=new Date().toISOString(),dailyToken=nextDailyToken(s.orders,created);
 if(dailyTokenTaken(s.orders,localDate(created),dailyToken))throw Error('Daily token already used');
 const order:Order={id:crypto.randomUUID(),reference:nextBillReference(s),key:input.key,created,state:'paid',type:input.type,token:input.token,dailyToken,payment:input.payment,tendered:input.payment==='Cash'?input.tendered:totals.total,change:input.payment==='Cash'?input.tendered-totals.total:0,lines,totals,settings:structuredClone(s.settings),...(session.role==='admin'?{adminSale:true}:{})};
 s.orders.unshift(order);
 // Two identical customer bills. Kitchen tickets are not created for new sales.
 const enqueue=(kind:'counter'|'kitchen',index=0)=>{let state:Job['state']=demo?'preview':'queued';if(demo&&input.simulation==='unknown')state='unknown';else if(demo&&(input.simulation==='both-fail'||(input.simulation==='kitchen-failure'&&index===1)))state='failed';s.jobs.push({id:crypto.randomUUID(),orderId:order.id,kind,state,printer:s.settings[kind],copy:false,reason:'',attempts:[]});};
 for(let i=0;i<2;i++)enqueue('counter',i);
 audit(s,session,'checkout',order.id);return order;
}
export function saveItem(s:State,session:Session,input:Item){
 const item=itemSchema.parse(input);if(!s.categories.includes(item.category))throw Error('Choose a valid category');
 const i=s.items.findIndex(p=>p.id===item.id);
 if(i<0){s.items.push(item);audit(s,session,'menu',item.id);return;}
 requireAdmin(session);s.items[i]=item;audit(s,session,'menu',item.id);
}
export function saveSettings(s:State,session:Session,input:Settings){requireAdmin(session);s.settings=settingsSchema.parse(input);audit(s,session,'settings','shop');}
export function saveExpense(s:State,session:Session,input:Expense){
 requireAdmin(session);
 const expense=expenseSchema.parse(input);
 const list=expensesOf(s);
 const i=list.findIndex(row=>row.id===expense.id);
 if(i<0)list.unshift(expense);else list[i]=expense;
 s.expenses=list;
 audit(s,session,'expense',expense.id,expense.category);
}
export function deleteExpense(s:State,session:Session,id:string){
 requireAdmin(session);
 if(!id.trim())throw Error('Expense not found');
 const list=expensesOf(s);
 const next=list.filter(row=>row.id!==id);
 if(next.length===list.length)throw Error('Expense not found');
 s.expenses=next;
 audit(s,session,'expense-delete',id);
}
export function cancel(s:State,session:Session,id:string,reason:string){requireAdmin(session);if(!reason.trim()||reason.length>300)throw Error('Enter a cancellation reason (1–300 characters)');const order=s.orders.find(o=>o.id===id);if(!order||order.state!=='paid')throw Error('Order cannot be cancelled');order.state='cancelled';order.reason=reason;audit(s,session,'cancel',id,reason);}
function snapMenuLine(s:State,line:{id:string;qty:number;choices?:Record<string,string>;notes?:string}):Order['lines'][number]{
 const item=s.items.find(p=>p.id===line.id);if(!item?.available)throw Error('An item is no longer available');
 const options=item.options||[],choices=line.choices||{};
 if(Object.keys(choices).length!==options.length||options.some(o=>!o.values.includes(choices[o.name])))throw Error(`Choose all options for ${item.name}`);
 const selection=options.map(o=>`${o.name}: ${choices[o.name]}`).join('; ');
 const snap=structuredClone(item);delete snap.photo;
 return {...snap,qty:line.qty,notes:[selection,line.notes].filter(Boolean).join(' · ')};
}
function lineFingerprint(line:Pick<Order['lines'][number],'id'|'qty'|'price'|'notes'>){return `${line.id}|${line.qty}|${line.price}|${line.notes||''}`;}
/** Admin-only correction of a paid bill: qty, replace/add items, payment — same CW number, then print corrected copies. */
export function amendOrder(s:State,session:Session,raw:AmendOrder,demo:boolean):Order{
 requireAdmin(session);
 const input=amendOrderSchema.parse(raw);
 const order=s.orders.find(o=>o.id===input.id);
 if(!order||order.state!=='paid')throw Error('Only a paid bill can be edited');
 const nextLines:Order['lines']=[];
 for(const row of input.lines){
  if(row.keepIndex!==undefined){
   const current=order.lines[row.keepIndex];
   if(!current)throw Error('Invalid bill line');
   nextLines.push(row.qty===current.qty?current:{...current,qty:row.qty});
   continue;
  }
  nextLines.push(snapMenuLine(s,{id:row.id!,qty:row.qty,choices:row.choices,notes:row.notes}));
 }
 const variants=nextLines.map(l=>l.id+JSON.stringify((l.notes||'')));
 if(new Set(variants).size!==nextLines.length)throw Error('Duplicate cart lines');
 const payment=input.payment||order.payment;
 const beforeSig=order.lines.map(lineFingerprint).join(';')+`|${order.payment}`;
 const afterSig=nextLines.map(lineFingerprint).join(';')+`|${payment}`;
 if(beforeSig===afterSig)throw Error('Change an item, quantity, or payment before saving');
 const discount=Math.min(order.totals.discount,nextLines.reduce((sum,line)=>sum+line.price*line.qty,0));
 const totals=calculate(nextLines,discount,order.settings.taxRate,order.settings.rounding);
 let tendered=order.tendered;
 if(payment==='Cash'){
  tendered=input.tendered??Math.max(order.tendered,totals.total);
  if(tendered<totals.total)throw Error('Cash received must cover the new total');
 }else tendered=totals.total;
 order.lines=nextLines;
 order.totals=totals;
 order.payment=payment;
 order.tendered=tendered;
 order.change=payment==='Cash'?tendered-totals.total:0;
 order.amendedAt=new Date().toISOString();
 order.amendReason=input.reason.trim();
 for(let i=0;i<2;i++){
  const state:Job['state']=demo?'preview':'queued';
  s.jobs.push({id:crypto.randomUUID(),orderId:order.id,kind:'counter',state,printer:s.settings.counter,copy:true,reason:order.amendReason,attempts:[]});
 }
 audit(s,session,'amend',order.id,order.amendReason);
 return order;
}
export function preparePrint(s:State,session:Session,id:string,reason=''):Job{
 const job=s.jobs.find(j=>j.id===id);if(!job)throw Error('Print job not found');if(job.state==='submitting')throw Error('Print submission is in progress');
 if(job.state==='queued'||job.state==='failed')return job;
 requireAdmin(session);if(!reason.trim()||reason.length>300)throw Error('Confirm printer review and provide a reprint reason');
 const copy:Job={...structuredClone(job),id:crypto.randomUUID(),state:'queued',copy:true,reason,attempts:[]};s.jobs.push(copy);audit(s,session,'reprint',copy.id,reason);return copy;
}
