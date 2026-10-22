import { z } from 'zod';
export const itemSchema=z.object({id:z.string().min(1),name:z.string().trim().min(1).max(100),category:z.string().trim().min(1).max(40),price:z.number().int().min(0).max(10000000),available:z.boolean(),image:z.number().int().min(0).max(15),photo:z.string().regex(/^product-photos\/[a-zA-Z0-9_.-]+\.jpg$/).max(120).optional(),description:z.string().max(800).optional(),options:z.array(z.object({name:z.string().min(1).max(60),values:z.array(z.string().min(1).max(60)).min(1).max(10)})).max(8).optional()});
export type Item=z.infer<typeof itemSchema>;
export const settingsSchema=z.object({shop:z.string().trim().min(1).max(80),address:z.string().max(200),phone:z.string().max(30),taxRate:z.number().min(0).max(100),rounding:z.enum(['paise','rupee']),width:z.enum(['58','80']),counter:z.string().max(200),kitchen:z.string().max(200),sharedPrinter:z.boolean()});
export type Settings=z.infer<typeof settingsSchema>;
export const checkoutSchema=z.object({key:z.string().min(8).max(100),lines:z.array(z.object({id:z.string(),lineId:z.string().max(100).optional(),choices:z.record(z.string().max(60),z.string().max(60)).optional(),qty:z.number().int().min(1).max(999),notes:z.string().max(300)})).min(1).max(100),discount:z.number().int().min(0).max(100000000),type:z.enum(['Dine-in','Takeaway']),token:z.string().trim().min(1).max(40),payment:z.enum(['Cash','UPI','Card']),tendered:z.number().int().min(0).max(100000000),simulation:z.enum(['preview','kitchen-failure','both-fail','unknown']).optional()});
export type Checkout=z.infer<typeof checkoutSchema>;
export type Money={subtotal:number;discount:number;tax:number;rounding:number;total:number};
export type Order={id:string;reference:string;key:string;created:string;state:'paid'|'cancelled';reason?:string;type:Checkout['type'];token:string;dailyToken?:number;payment:Checkout['payment'];tendered:number;change:number;lines:(Item & {qty:number;notes:string})[];totals:Money;settings:Settings};
export type Job={id:string;orderId:string;kind:'counter'|'kitchen';state:'queued'|'submitting'|'submitted'|'failed'|'unknown'|'preview';printer:string;copy:boolean;reason:string;attempts:{at:string;outcome:string}[]};
export type Role='admin'|'cashier';
export type State={version:1;catalogVersion?:string;items:Item[];categories:string[];orders:Order[];jobs:Job[];settings:Settings;sequence:number;audit:{at:string;actor:string;action:string;record:string;reason:string}[]};
export type Session={role:Role;username:string};
export const money=(paise:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:paise%100?2:0}).format(paise/100);
export function calculate(lines:{price:number;qty:number}[],discount:number,taxRate:number,rounding:Settings['rounding']):Money {
 if(!Number.isSafeInteger(discount)||discount<0||!Number.isFinite(taxRate)||taxRate<0||taxRate>100)throw Error('Invalid discount or tax');
 for(const l of lines)if(!Number.isSafeInteger(l.price)||l.price<0||!Number.isInteger(l.qty)||l.qty<1||l.qty>999)throw Error('Invalid price or quantity');
 const subtotal=lines.reduce((s,l)=>s+l.price*l.qty,0);if(!Number.isSafeInteger(subtotal)||discount>subtotal)throw Error('Discount exceeds subtotal');
 const tax=Math.round((subtotal-discount)*taxRate/100),raw=subtotal-discount+tax,total=rounding==='rupee'?Math.round(raw/100)*100:raw;
 return {subtotal,discount,tax,rounding:total-raw,total};
}
export function kitchenTicket(order:Order){return {reference:order.reference,created:order.created,type:order.type,token:order.token,items:order.lines.map(l=>({name:l.name,qty:l.qty,contents:l.description||'',notes:l.notes}))};}
export function report(orders:Order[]){const paid=orders.filter(o=>o.state==='paid');return {sales:paid.reduce((s,o)=>s+o.totals.total,0),count:paid.length,cancelled:orders.filter(o=>o.state==='cancelled').reduce((s,o)=>s+o.totals.total,0),payments:['Cash','UPI','Card'].map(method=>({method,total:paid.filter(o=>o.payment===method).reduce((s,o)=>s+o.totals.total,0)})),items:paid.flatMap(o=>o.lines).reduce<Record<string,number>>((r,l)=>{r[l.name]=(r[l.name]||0)+l.qty;return r;},{})};}
export function csvCell(value:unknown){let s=String(value);if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function localDate(value:string){const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function localMonth(value:string){return localDate(value).slice(0,7);}
function assignedDailyToken(value:unknown):value is number{return Number.isInteger(value)&&Number(value)>=1;}
export function nextDailyToken(orders:Pick<Order,'created'|'dailyToken'>[],at=new Date().toISOString()){
 const day=localDate(at);let max=0;
 for(const order of orders){if(localDate(order.created)!==day||!assignedDailyToken(order.dailyToken))continue;if(order.dailyToken>max)max=order.dailyToken;}
 return max+1;
}
export function dailyTokenTaken(orders:Pick<Order,'created'|'dailyToken'>[],day:string,token:number){
 return orders.some(order=>localDate(order.created)===day&&order.dailyToken===token);
}
export function tokenHistoryByDay(orders:Pick<Order,'created'|'dailyToken'|'state'>[]){
 const map=new Map<string,{day:string;count:number;cancelled:number;tokens:number[]}>();
 for(const order of orders){
  const day=localDate(order.created),row=map.get(day)||{day,count:0,cancelled:0,tokens:[]};
  row.count++;if(order.state==='cancelled')row.cancelled++;if(assignedDailyToken(order.dailyToken))row.tokens.push(order.dailyToken);map.set(day,row);
 }
 return [...map.values()].map(row=>{const tokens=[...row.tokens].sort((a,b)=>a-b);return {day:row.day,count:row.count,cancelled:row.cancelled,tokens,first:tokens[0],last:tokens[tokens.length-1]};}).sort((a,b)=>b.day.localeCompare(a.day));
}
export function monthlyOrderTotals(orders:Pick<Order,'created'>[]){
 const map=new Map<string,{month:string;count:number}>();
 for(const order of orders){const month=localMonth(order.created),row=map.get(month)||{month,count:0};row.count++;map.set(month,row);}
 return [...map.values()].sort((a,b)=>b.month.localeCompare(a.month));
}
