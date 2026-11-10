import {createHash} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import type {Store} from '../database/store';
import type {Expense,Order,State} from '../../src/domain/model';
import {expenseSchema,itemSchema,normalizeExpenses,settingsSchema} from '../../src/domain/model';
import {SupabaseRestClient} from './client';
import type {SupabaseSyncConfig} from './config';

type Cursor={last_push_at:string|null;last_pull_at:string|null;last_remote_updated_at:string|null;dirty:number;revision:number};

function ensureCursor(db:DatabaseSync){
 db.exec(`CREATE TABLE IF NOT EXISTS sync_cursor(
  id INTEGER PRIMARY KEY CHECK(id=1),
  last_push_at TEXT,
  last_pull_at TEXT,
  last_remote_updated_at TEXT,
  dirty INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1
 ); INSERT OR IGNORE INTO sync_cursor(id,dirty,revision) VALUES(1,0,1);
 CREATE TABLE IF NOT EXISTS sync_known(
  kind TEXT NOT NULL,
  record_id TEXT NOT NULL,
  PRIMARY KEY(kind, record_id)
 );`);
}

function readCursor(db:DatabaseSync):Cursor{
 ensureCursor(db);
 return db.prepare('SELECT last_push_at,last_pull_at,last_remote_updated_at,dirty,revision FROM sync_cursor WHERE id=1').get() as Cursor;
}

function markDirty(db:DatabaseSync){
 ensureCursor(db);
 db.prepare('UPDATE sync_cursor SET dirty=1 WHERE id=1').run();
}

function readKnown(db:DatabaseSync,kind:string){
 ensureCursor(db);
 return new Set((db.prepare('SELECT record_id FROM sync_known WHERE kind=?').all(kind) as {record_id:string}[]).map(r=>r.record_id));
}

function writeKnown(db:DatabaseSync,kind:string,ids:Iterable<string>){
 ensureCursor(db);
 db.prepare('DELETE FROM sync_known WHERE kind=?').run(kind);
 const insert=db.prepare('INSERT INTO sync_known(kind,record_id) VALUES(?,?)');
 for(const id of ids)insert.run(kind,id);
}

function fingerprint(payload:unknown){
 return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export type CloudSync={enabled:true;notifyLocalChange:()=>void;start:()=>void;stop:()=>void;flushNow:()=>Promise<void>}|{enabled:false;notifyLocalChange:()=>void;start:()=>void;stop:()=>void;flushNow:()=>Promise<void>};

export function createNoopCloudSync():CloudSync{
 const noop=async()=>{};
 return {enabled:false,notifyLocalChange(){},start(){},stop(){},flushNow:noop};
}

export function createCloudSync(store:Store,config:SupabaseSyncConfig,client=new SupabaseRestClient(config)):CloudSync{
 let timer:ReturnType<typeof setTimeout>|undefined;
 let interval:ReturnType<typeof setInterval>|undefined;
 let running=false;
 let stopped=false;
 let applyingRemote=false;

 function schedule(delay=800){
  if(stopped)return;
  if(timer)clearTimeout(timer);
  timer=setTimeout(()=>{void cycle();},delay);
 }

 async function push(){
  const cursor=readCursor(store.db);
  if(!cursor.dirty&&cursor.last_push_at)return;
  const state=store.read();
  const metaPayload={
   version:state.version,
   catalogVersion:state.catalogVersion,
   items:state.items,
   categories:state.categories,
   settings:state.settings,
   sequence:state.sequence
  };
  const revision=Number(cursor.revision||1)+1;
  const now=new Date().toISOString();
  const localOrderIds=new Set(state.orders.map(o=>o.id));
  const localJobIds=new Set(state.jobs.map(j=>j.id));
  const localExpenseIds=new Set(normalizeExpenses(state.expenses).map(e=>e.id));
  const users=store.db.prepare('SELECT username,salt,hash,role,active FROM users').all().map((u:any)=>({username:String(u.username),salt:String(u.salt),hash:String(u.hash),role:String(u.role),active:Number(u.active)===1,updated_at:now}));
  const localUsernames=new Set(users.map(u=>u.username));

  const knownOrders=readKnown(store.db,'orders');
  const knownJobs=readKnown(store.db,'jobs');
  const knownUsers=readKnown(store.db,'users');
  const knownExpenses=readKnown(store.db,'expenses');
  const deleteOrderIds=[...knownOrders].filter(id=>!localOrderIds.has(id));
  const deleteJobIds=[...knownJobs].filter(id=>!localJobIds.has(id));
  const deleteUsernames=[...knownUsers].filter(name=>!localUsernames.has(name));
  const deleteExpenseIds=[...knownExpenses].filter(id=>!localExpenseIds.has(id));

  // Remote FK: remove jobs before orders.
  await client.deleteJobs(deleteJobIds);
  await client.deleteOrders(deleteOrderIds);
  await client.deleteUsers(deleteUsernames);
  await client.deleteExpenses(deleteExpenseIds);

  const orders=state.orders.map(o=>({id:o.id,reference:o.reference,request_key:o.key,payload:o,updated_at:o.created||now}));
  const jobs=state.jobs.map(j=>({id:j.id,order_id:j.orderId,kind:j.kind,state:j.state,payload:j,updated_at:j.attempts.slice(-1)[0]?.at||now}));
  const expenses=normalizeExpenses(state.expenses).map(e=>({id:e.id,shop_id:config.shopId,payload:e,updated_at:now}));
  const audit=state.audit.map(a=>({fingerprint:fingerprint(a),payload:a}));
  await client.upsertMeta(metaPayload,revision);
  await client.upsertOrders(orders);
  await client.upsertJobs(jobs);
  await client.upsertUsers(users);
  await client.upsertExpenses(expenses);
  await client.upsertAudit(audit);

  writeKnown(store.db,'orders',localOrderIds);
  writeKnown(store.db,'jobs',localJobIds);
  writeKnown(store.db,'users',localUsernames);
  writeKnown(store.db,'expenses',localExpenseIds);
  store.db.prepare('UPDATE sync_cursor SET dirty=0,last_push_at=?,revision=? WHERE id=1').run(now,revision);
 }

 async function pull(){
  const cursor=readCursor(store.db);
  if(cursor.dirty)return;
  const remoteMetaRows=await client.getMeta();
  const remoteMeta=remoteMetaRows[0];
  const remoteOrders=await client.listOrders();
  const remoteJobs=await client.listJobs();
  const remoteUsers=await client.listUsers();
  const remoteExpenses=await client.listExpenses();
  const remoteOrderIds=new Set(remoteOrders.map(o=>o.id));
  const remoteJobIds=new Set(remoteJobs.map(j=>j.id));
  const remoteUsernames=new Set(remoteUsers.map(u=>u.username));
  const remoteExpenseIds=new Set(remoteExpenses.map(e=>e.id));
  const knownOrders=readKnown(store.db,'orders');
  const knownJobs=readKnown(store.db,'jobs');
  const knownUsers=readKnown(store.db,'users');
  const knownExpenses=readKnown(store.db,'expenses');
  // Only delete locally when we previously saw the row on remote (avoids wiping unsynced local creates).
  const removeOrderIds=new Set([...knownOrders].filter(id=>!remoteOrderIds.has(id)));
  const removeJobIds=new Set([...knownJobs].filter(id=>!remoteJobIds.has(id)));
  const removeUsernames=[...knownUsers].filter(name=>!remoteUsernames.has(name));
  const removeExpenseIds=new Set([...knownExpenses].filter(id=>!remoteExpenseIds.has(id)));

  applyingRemote=true;
  try{
   store.transaction(s=>{
    if(removeOrderIds.size)s.orders=s.orders.filter(o=>!removeOrderIds.has(o.id));
    if(removeJobIds.size||removeOrderIds.size)s.jobs=s.jobs.filter(j=>!removeJobIds.has(j.id)&&!removeOrderIds.has(j.orderId));
    if(removeExpenseIds.size)s.expenses=normalizeExpenses(s.expenses).filter(e=>!removeExpenseIds.has(e.id));

    const byId=new Map(s.orders.map(o=>[o.id,o]));
    const byKey=new Map(s.orders.map(o=>[o.key,o]));
    const byRef=new Map(s.orders.map(o=>[o.reference,o]));
    for(const row of remoteOrders){
     const order=row.payload as Order;
     if(!order?.id||order.id!==row.id)continue;
     const existing=byId.get(row.id);
     if(existing){
      Object.assign(existing,order);
      continue;
     }
     if(byKey.has(row.request_key)||byRef.has(row.reference))continue;
     s.orders.unshift(order);
     byId.set(order.id,order);byKey.set(order.key,order);byRef.set(order.reference,order);
    }

    const jobById=new Map(s.jobs.map(j=>[j.id,j]));
    for(const row of remoteJobs){
     const job=row.payload as State['jobs'][number];
     if(!job?.id||job.id!==row.id)continue;
     if(!s.orders.some(o=>o.id===job.orderId))continue;
     const existing=jobById.get(row.id);
     if(existing){Object.assign(existing,job);continue;}
     s.jobs.push(job);
     jobById.set(job.id,job);
    }

    const expenseById=new Map(normalizeExpenses(s.expenses).map(e=>[e.id,e]));
    for(const row of remoteExpenses){
     const parsed=expenseSchema.safeParse(row.payload);
     if(!parsed.success||parsed.data.id!==row.id)continue;
     const expense=parsed.data as Expense;
     const existing=expenseById.get(row.id);
     if(existing){Object.assign(existing,expense);continue;}
     expenseById.set(expense.id,expense);
    }
    s.expenses=[...expenseById.values()];

    if(remoteMeta?.payload&&(!cursor.last_remote_updated_at||remoteMeta.updated_at>cursor.last_remote_updated_at)){
     const payload=remoteMeta.payload as Partial<State>;
     try{
      if(Array.isArray(payload.items))payload.items.forEach(i=>itemSchema.parse(i));
      if(payload.settings)settingsSchema.parse(payload.settings);
      if(Array.isArray(payload.items))s.items=payload.items as State['items'];
      if(Array.isArray(payload.categories))s.categories=payload.categories as string[];
      if(payload.settings)s.settings=payload.settings as State['settings'];
      if(typeof payload.catalogVersion==='string')s.catalogVersion=payload.catalogVersion;
      if(Number.isInteger(payload.sequence))s.sequence=Math.max(s.sequence,Number(payload.sequence));
     }catch{/* ignore invalid remote meta */}
    }
   });

   for(const user of remoteUsers){
    if(user.role!=='admin'&&user.role!=='cashier')continue;
    const row=store.db.prepare('SELECT username FROM users WHERE username=?').get(user.username);
    if(row){
     store.db.prepare('UPDATE users SET salt=?,hash=?,role=?,active=? WHERE username=?').run(user.salt,user.hash,user.role,user.active?1:0,user.username);
    }else{
     store.db.prepare('INSERT INTO users(username,salt,hash,role,active) VALUES(?,?,?,?,?)').run(user.username,user.salt,user.hash,user.role,user.active?1:0);
    }
   }
   for(const username of removeUsernames){
    const admins=Number((store.db.prepare("SELECT count(*) AS n FROM users WHERE role='admin' AND active=1").get() as {n:number}).n);
    const target=store.db.prepare('SELECT role,active FROM users WHERE username=?').get(username) as {role:string;active:number}|undefined;
    if(!target)continue;
    if(target.role==='admin'&&target.active===1&&admins<=1)continue;
    store.db.prepare('DELETE FROM users WHERE username=?').run(username);
   }
  }finally{
   applyingRemote=false;
  }

  writeKnown(store.db,'orders',remoteOrderIds);
  writeKnown(store.db,'jobs',remoteJobIds);
  writeKnown(store.db,'users',remoteUsernames);
  writeKnown(store.db,'expenses',remoteExpenseIds);
  const now=new Date().toISOString();
  store.db.prepare('UPDATE sync_cursor SET last_pull_at=?, last_remote_updated_at=COALESCE(?, last_remote_updated_at) WHERE id=1').run(now,remoteMeta?.updated_at||null);
 }

 async function cycle(){
  if(running||stopped)return;
  running=true;
  try{
   const cursor=readCursor(store.db);
   // Push and pull in separate cycles so a just-pushed local row is not
   // immediately removed when a stale/empty remote snapshot is read.
   if(cursor.dirty||!cursor.last_push_at)await push();
   else await pull();
  }catch(error){
   console.warn('POS cloud sync deferred',error instanceof Error?error.message:error);
  }finally{
   running=false;
  }
 }

 return {
  enabled:true,
  notifyLocalChange(){
   if(applyingRemote)return;
   try{markDirty(store.db);}catch{/* never block POS */}
   schedule();
  },
  start(){
   stopped=false;
   schedule(1500);
   interval=setInterval(()=>{void cycle();},60000);
  },
  stop(){
   stopped=true;
   if(timer)clearTimeout(timer);
   if(interval)clearInterval(interval);
  },
  async flushNow(){await cycle();}
 };
}
