import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import * as engine from '../../src/application/engine';
import {checkoutSchema,expenseSchema,itemSchema,normalizeExpenses,settingsSchema,type Session,type State} from '../../src/domain/model';
import {initialState} from '../../src/domain/seed';
import {readSupabaseEnv,sb,type SupabaseEnv} from './supabase';

type UserRow={username:string;salt:string;hash:string;role:'admin'|'cashier';active:boolean};
type MetaRow={id:string;payload:unknown;revision:number;updated_at:string};
type OrderRow={id:string;reference:string;request_key:string;payload:unknown};
type JobRow={id:string;order_id:string;kind:string;state:string;payload:unknown};
type ExpenseRow={id:string;shop_id:string;payload:unknown;updated_at:string};

function hashPassword(password:string,salt:string){
 return scryptSync(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString('hex');
}

async function loadState(env:SupabaseEnv):Promise<State>{
 const metaRows=await sb<MetaRow[]>(env,`pos_meta?id=eq.${encodeURIComponent(env.shopId)}&select=id,payload,revision,updated_at`);
 let meta=metaRows[0];
 if(!meta){
  const seed=initialState();
  await sb(env,'pos_meta?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({id:env.shopId,payload:{version:seed.version,catalogVersion:seed.catalogVersion,items:seed.items,categories:seed.categories,settings:seed.settings,sequence:seed.sequence},revision:1,updated_at:new Date().toISOString()})});
  meta=(await sb<MetaRow[]>(env,`pos_meta?id=eq.${encodeURIComponent(env.shopId)}&select=id,payload,revision,updated_at`))[0];
 }
 const payload=meta.payload as Partial<State>;
 const orders=await sb<OrderRow[]>(env,'pos_orders?select=id,reference,request_key,payload&order=updated_at.desc');
 const jobs=await sb<JobRow[]>(env,'pos_print_jobs?select=id,order_id,kind,state,payload&order=updated_at.asc');
 const expenseRows=await sb<ExpenseRow[]>(env,`pos_expenses?shop_id=eq.${encodeURIComponent(env.shopId)}&select=id,shop_id,payload,updated_at&order=updated_at.desc`);
 let expenses=normalizeExpenses(expenseRows.map(row=>row.payload));
 // One-time move of legacy expenses that lived inside pos_meta.payload.
 if(!expenses.length){
  const legacy=normalizeExpenses(payload.expenses);
  if(legacy.length){
   await upsertExpenses(env,legacy);
   expenses=legacy;
  }
 }
 const state:State={
  version:1,
  catalogVersion:typeof payload.catalogVersion==='string'?payload.catalogVersion:initialState().catalogVersion,
  items:Array.isArray(payload.items)?payload.items as State['items']:initialState().items,
  categories:Array.isArray(payload.categories)?payload.categories as string[]:initialState().categories,
  settings:payload.settings?settingsSchema.parse(payload.settings):initialState().settings,
  sequence:Number.isInteger(payload.sequence)?Number(payload.sequence):1000,
  expenses,
  orders:orders.map(row=>row.payload as State['orders'][number]).filter(Boolean),
  jobs:jobs.map(row=>row.payload as State['jobs'][number]).filter(Boolean),
  audit:[]
 };
 return state;
}

async function saveMeta(env:SupabaseEnv,state:State,revision:number){
 const payload={version:state.version,catalogVersion:state.catalogVersion,items:state.items,categories:state.categories,settings:state.settings,sequence:state.sequence};
 await sb(env,'pos_meta?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:env.shopId,payload,revision,updated_at:new Date().toISOString()})});
}

async function upsertExpenses(env:SupabaseEnv,expenses:State['expenses']){
 if(!expenses.length)return;
 const now=new Date().toISOString();
 await sb(env,'pos_expenses?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(expenses.map(e=>({id:e.id,shop_id:env.shopId,payload:e,updated_at:now})))});
}

async function deleteExpenseRow(env:SupabaseEnv,id:string){
 await sb(env,`pos_expenses?id=eq.${encodeURIComponent(id)}&shop_id=eq.${encodeURIComponent(env.shopId)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});
}

async function upsertOrder(env:SupabaseEnv,order:State['orders'][number]){
 await sb(env,'pos_orders?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:order.id,reference:order.reference,request_key:order.key,payload:order,updated_at:order.created||new Date().toISOString()})});
}

async function upsertJobs(env:SupabaseEnv,jobs:State['jobs']){
 if(!jobs.length)return;
 await sb(env,'pos_print_jobs?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(jobs.map(j=>({id:j.id,order_id:j.orderId,kind:j.kind,state:j.state,payload:j,updated_at:new Date().toISOString()})))});
}

async function listUsers(env:SupabaseEnv){
 return sb<UserRow[]>(env,'pos_users?select=username,salt,hash,role,active');
}

async function upsertUser(env:SupabaseEnv,user:UserRow){
 await sb(env,'pos_users?on_conflict=username',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({...user,updated_at:new Date().toISOString()})});
}

export async function invokeCloudPos(method:string,args:unknown[],session:Session|null):Promise<{result:unknown;session:Session|null;clearSession?:boolean}>{
 const env=readSupabaseEnv();
 const authed=()=>{if(!session)throw Error('Sign in required');return session;};
 const admin=()=>engine.requireAdmin(authed());

 switch(method){
  case 'authStatus':{
   const users=await listUsers(env);
   return {result:{setup:users.length===0,session},session};
  }
  case 'login':{
   const username=z.string().min(3).max(40).parse(args[0]);
   const password=z.string().min(12).max(128).parse(args[1]);
   const setup=Boolean(args[2]);
   const users=await listUsers(env);
   if(setup){
    if(users.length)throw Error('Administrator already configured');
    if(!/^[a-zA-Z0-9_.-]{3,40}$/.test(username))throw Error('Use a 3–40 character username and a 12–128 character password');
    const salt=randomBytes(16).toString('hex');
    await upsertUser(env,{username,salt,hash:hashPassword(password,salt),role:'admin',active:true});
   }
   const row=(await listUsers(env)).find(u=>u.username===username&&u.active);
   const computed=Buffer.from(hashPassword(password,String(row?.salt||'dummy-salt')),'hex');
   if(!row||!timingSafeEqual(computed,Buffer.from(String(row.hash),'hex')))throw Error('Invalid credentials');
   const next={username:row.username,role:row.role};
   return {result:next,session:next};
  }
  case 'logout':
   return {result:undefined,session:null,clearSession:true};
  case 'state':{
   const actor=authed();
   const state=await loadState(env);
   if(actor.role==='cashier')state.audit=[];
   return {result:state,session};
  }
  case 'checkout':{
   const actor=authed();
   const input=checkoutSchema.parse(args[0]);
   const state=await loadState(env);
   const existing=state.orders.find(o=>o.key===input.key);
   if(existing)return {result:existing,session};
   // Cloud mode uses preview print jobs (no local printer spooler).
   const order=engine.checkout(state,actor,input,true);
   const metaRows=await sb<MetaRow[]>(env,`pos_meta?id=eq.${encodeURIComponent(env.shopId)}&select=revision`);
   const revision=Number(metaRows[0]?.revision||1)+1;
   await saveMeta(env,state,revision);
   await upsertOrder(env,order);
   await upsertJobs(env,state.jobs.filter(j=>j.orderId===order.id));
   return {result:order,session};
  }
  case 'cancel':{
   const actor=authed();
   const id=z.string().parse(args[0]);
   const reason=z.string().max(300).parse(args[1]);
   const state=await loadState(env);
   engine.cancel(state,actor,id,reason);
   const order=state.orders.find(o=>o.id===id)!;
   const metaRows=await sb<MetaRow[]>(env,`pos_meta?id=eq.${encodeURIComponent(env.shopId)}&select=revision`);
   await saveMeta(env,state,Number(metaRows[0]?.revision||1)+1);
   await upsertOrder(env,order);
   return {result:undefined,session};
  }
  case 'saveItem':{
   const actor=authed();
   const item=itemSchema.parse(args[0]);
   const state=await loadState(env);
   engine.saveItem(state,actor,item);
   const metaRows=await sb<MetaRow[]>(env,`pos_meta?id=eq.${encodeURIComponent(env.shopId)}&select=revision`);
   await saveMeta(env,state,Number(metaRows[0]?.revision||1)+1);
   return {result:undefined,session};
  }
  case 'saveCategory':{
   admin();
   const name=z.string().trim().min(1).max(40).parse(args[0]);
   const previous=z.string().max(40).optional().parse(args[1]);
   const state=await loadState(env);
   if(state.categories.includes(name))throw Error('Category name already exists');
   if(previous){
    if(!state.categories.includes(previous))throw Error('Category not found');
    state.categories=state.categories.map(c=>c===previous?name:c);
    state.items.forEach(i=>{if(i.category===previous)i.category=name;});
   }else state.categories.push(name);
   engine.audit(state,authed(),'category',name);
   const metaRows=await sb<MetaRow[]>(env,`pos_meta?id=eq.${encodeURIComponent(env.shopId)}&select=revision`);
   await saveMeta(env,state,Number(metaRows[0]?.revision||1)+1);
   return {result:undefined,session};
  }
  case 'saveSettings':{
   const actor=authed();
   const state=await loadState(env);
   engine.saveSettings(state,actor,settingsSchema.parse(args[0]));
   const metaRows=await sb<MetaRow[]>(env,`pos_meta?id=eq.${encodeURIComponent(env.shopId)}&select=revision`);
   await saveMeta(env,state,Number(metaRows[0]?.revision||1)+1);
   return {result:undefined,session};
  }
  case 'saveExpense':{
   const actor=authed();
   const expense=expenseSchema.parse(args[0]);
   const state=await loadState(env);
   engine.saveExpense(state,actor,expense);
   await upsertExpenses(env,[expense]);
   return {result:undefined,session};
  }
  case 'deleteExpense':{
   const actor=authed();
   const id=z.string().parse(args[0]);
   const state=await loadState(env);
   engine.deleteExpense(state,actor,id);
   await deleteExpenseRow(env,id);
   return {result:undefined,session};
  }
  case 'addUser':{
   admin();
   const username=z.string().parse(args[0]);
   const password=z.string().parse(args[1]);
   if(!/^[a-zA-Z0-9_.-]{3,40}$/.test(username)||password.length<12||password.length>128)throw Error('Use a 3–40 character username and a 12–128 character password');
   const salt=randomBytes(16).toString('hex');
   await upsertUser(env,{username,salt,hash:hashPassword(password,salt),role:'cashier',active:true});
   return {result:undefined,session};
  }
  case 'printers':
  case 'print':
  case 'testPrinter':
   throw Error('Printers are available only on the desktop POS.');
  case 'backup':
  case 'restore':
   throw Error('Use Backup & recovery in the desktop POS for database export or restore.');
  case 'switchRole':
   throw Error('Sign in with your own staff account.');
  case 'reset':
   throw Error('Live POS data cannot be reset from this interface.');
  default:
   throw Error('Unknown POS action');
 }
}
