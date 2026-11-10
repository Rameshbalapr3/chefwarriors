import {describe,it,expect} from 'vitest';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../desktop/database/store';
import {checkout} from '../src/application/engine';
import {readSupabaseSyncConfig} from '../desktop/sync/config';
import {createCloudSync,createNoopCloudSync} from '../desktop/sync/engine';
import type {SupabaseRestClient} from '../desktop/sync/client';

describe('optional supabase sync',()=>{
 it('stays disabled without credentials so local POS is unchanged',()=>{
  const previous={url:process.env.POS_SUPABASE_URL,key:process.env.POS_SUPABASE_SERVICE_KEY};
  delete process.env.POS_SUPABASE_URL;delete process.env.POS_SUPABASE_SERVICE_KEY;
  expect(readSupabaseSyncConfig()).toBeNull();
  const sync=createNoopCloudSync();
  expect(sync.enabled).toBe(false);
  sync.notifyLocalChange();
  if(previous.url)process.env.POS_SUPABASE_URL=previous.url;else delete process.env.POS_SUPABASE_URL;
  if(previous.key)process.env.POS_SUPABASE_SERVICE_KEY=previous.key;else delete process.env.POS_SUPABASE_SERVICE_KEY;
 });

 it('reads optional userData supabase.json without affecting missing installs',()=>{
  const dir=mkdtempSync(join(tmpdir(),'cw-sync-cfg-'));
  try{
   writeFileSync(join(dir,'supabase.json'),JSON.stringify({url:'https://example.supabase.co',serviceKey:'service-role-test-key',shopId:'shop-1'}));
   expect(readSupabaseSyncConfig(dir)).toEqual({url:'https://example.supabase.co',serviceKey:'service-role-test-key',shopId:'shop-1'});
  }finally{rmSync(dir,{recursive:true,force:true});}
 });

 function mockClient(overrides:Partial<SupabaseRestClient>={}){
  const calls:string[]=[];
  let orders:any[]=[],jobs:any[]=[],users:any[]=[],expenses:any[]=[],meta:any[]=[];
  const client={
   calls,
   async upsertMeta(payload:unknown,revision:number){calls.push('meta');meta=[{id:'default',payload,updated_at:new Date().toISOString(),revision}];},
   async upsertOrders(rows:any[]){calls.push(`orders:${rows.length}`);const map=new Map(orders.map(o=>[o.id,o]));for(const row of rows)map.set(row.id,row);orders=[...map.values()];},
   async upsertJobs(rows:any[]){calls.push(`jobs:${rows.length}`);const map=new Map(jobs.map(j=>[j.id,j]));for(const row of rows)map.set(row.id,row);jobs=[...map.values()];},
   async upsertUsers(rows:any[]){calls.push(`users:${rows.length}`);const map=new Map(users.map(u=>[u.username,u]));for(const row of rows)map.set(row.username,row);users=[...map.values()];},
   async upsertExpenses(rows:any[]){calls.push(`expenses:${rows.length}`);const map=new Map(expenses.map(e=>[e.id,e]));for(const row of rows)map.set(row.id,row);expenses=[...map.values()];},
   async upsertAudit(rows:unknown[]){calls.push(`audit:${(rows as unknown[]).length}`);},
   async deleteOrders(ids:string[]){calls.push(`deleteOrders:${ids.length}`);orders=orders.filter(o=>!ids.includes(o.id));},
   async deleteJobs(ids:string[]){calls.push(`deleteJobs:${ids.length}`);jobs=jobs.filter(j=>!ids.includes(j.id));},
   async deleteUsers(ids:string[]){calls.push(`deleteUsers:${ids.length}`);users=users.filter(u=>!ids.includes(u.username));},
   async deleteExpenses(ids:string[]){calls.push(`deleteExpenses:${ids.length}`);expenses=expenses.filter(e=>!ids.includes(e.id));},
   async getMeta(){return meta;},
   async listOrders(){return orders;},
   async listJobs(){return jobs;},
   async listUsers(){return users;},
   async listExpenses(){return expenses;},
   ...overrides
  } as unknown as SupabaseRestClient & {calls:string[]};
  return client;
 }

 const sampleOrder=(id:string,reference:string,key:string)=>({
  id,reference,key,created:'2026-03-10T12:00:00.000Z',state:'paid' as const,type:'Takeaway' as const,token:'09',dailyToken:9,payment:'Cash' as const,tendered:12000,change:0,lines:[],
  totals:{subtotal:12000,discount:0,tax:0,rounding:0,total:12000},
  settings:{shop:'The Chef Warriors',address:'',phone:'',taxRate:0,rounding:'paise' as const,width:'80' as const,counter:'',kitchen:'',sharedPrinter:false}
 });

 it('pushes local changes through the sync client without blocking store writes',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'cw-sync-'));
  let store:Store|undefined;
  const client=mockClient();
  try{
   store=new Store(join(dir,'db.sqlite'));
   store.addUser('manager','a-unique-long-password','admin');
   const actor=store.login('manager','a-unique-long-password');
   const sync=createCloudSync(store,{url:'https://example.supabase.co',serviceKey:'key',shopId:'default'},client);
   store.onCommitted=()=>sync.notifyLocalChange();
   store.transaction(s=>checkout(s,actor,{key:crypto.randomUUID(),lines:[{id:'cw-fried-chicken-wings-1-pc',qty:1,notes:''}],discount:0,type:'Takeaway',token:'01',payment:'Cash',tendered:12000},false));
   await sync.flushNow();
   expect(store.read().orders).toHaveLength(1);
   expect(client.calls.some(c=>c.startsWith('orders:'))).toBe(true);
   expect(client.calls).toContain('meta');
  }finally{
   store?.close();
   rmSync(dir,{recursive:true,force:true});
  }
 });

 it('pulls missing remote orders into local sqlite',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'cw-sync-pull-'));
  let store:Store|undefined;
  const remoteOrder=sampleOrder('remote-order-1','CW-2001','remote-key-1');
  let remoteRows=[{id:remoteOrder.id,reference:remoteOrder.reference,request_key:remoteOrder.key,payload:remoteOrder,updated_at:remoteOrder.created}];
  const client=mockClient({
   async listOrders(){return remoteRows;}
  });
  try{
   store=new Store(join(dir,'db.sqlite'));
   store.addUser('manager','a-unique-long-password','admin');
   const sync=createCloudSync(store,{url:'https://example.supabase.co',serviceKey:'key',shopId:'default'},client);
   store.onCommitted=()=>sync.notifyLocalChange();
   await sync.flushNow(); // initial push
   await sync.flushNow(); // pull
   expect(store.read().orders.some(o=>o.id==='remote-order-1')).toBe(true);
  }finally{
   store?.close();
   rmSync(dir,{recursive:true,force:true});
  }
 });

 it('deletes local rows when previously synced remote rows disappear',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'cw-sync-del-'));
  let store:Store|undefined;
  const remoteOrder=sampleOrder('remote-order-del','CW-3001','remote-key-del');
  let remoteRows=[{id:remoteOrder.id,reference:remoteOrder.reference,request_key:remoteOrder.key,payload:remoteOrder,updated_at:remoteOrder.created}];
  const client=mockClient({
   async listOrders(){return remoteRows;}
  });
  try{
   store=new Store(join(dir,'db.sqlite'));
   store.addUser('manager','a-unique-long-password','admin');
   const sync=createCloudSync(store,{url:'https://example.supabase.co',serviceKey:'key',shopId:'default'},client);
   store.onCommitted=()=>sync.notifyLocalChange();
   await sync.flushNow();
   await sync.flushNow();
   expect(store.read().orders.some(o=>o.id==='remote-order-del')).toBe(true);
   remoteRows=[];
   await sync.flushNow();
   expect(store.read().orders.some(o=>o.id==='remote-order-del')).toBe(false);
  }finally{
   store?.close();
   rmSync(dir,{recursive:true,force:true});
  }
 });

 it('pushes local deletions to supabase for previously synced ids',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'cw-sync-push-del-'));
  let store:Store|undefined;
  const client=mockClient();
  try{
   store=new Store(join(dir,'db.sqlite'));
   store.addUser('manager','a-unique-long-password','admin');
   const actor=store.login('manager','a-unique-long-password');
   const sync=createCloudSync(store,{url:'https://example.supabase.co',serviceKey:'key',shopId:'default'},client);
   store.onCommitted=()=>sync.notifyLocalChange();
   const order=store.transaction(s=>checkout(s,actor,{key:crypto.randomUUID(),lines:[{id:'cw-fried-chicken-wings-1-pc',qty:1,notes:''}],discount:0,type:'Takeaway',token:'01',payment:'Cash',tendered:12000},false));
   await sync.flushNow();
   store.transaction(s=>{s.orders=s.orders.filter(o=>o.id!==order.id);s.jobs=s.jobs.filter(j=>j.orderId!==order.id);});
   await sync.flushNow();
   expect(client.calls).toContain('deleteOrders:1');
   expect(client.calls.some(c=>c.startsWith('deleteJobs:')&&c!=='deleteJobs:0')).toBe(true);
  }finally{
   store?.close();
   rmSync(dir,{recursive:true,force:true});
  }
 });
});
