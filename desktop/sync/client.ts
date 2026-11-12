import type {SupabaseSyncConfig} from './config';

export type RemoteMeta={id:string;payload:unknown;updated_at:string;revision:number};
export type RemoteOrder={id:string;reference:string;request_key:string;payload:unknown;updated_at:string};
export type RemoteJob={id:string;order_id:string;kind:string;state:string;payload:unknown;updated_at:string};
export type RemoteUser={username:string;salt:string;hash:string;role:string;active:boolean;updated_at:string};
export type RemoteAudit={fingerprint:string;payload:unknown};
export type RemoteExpense={id:string;shop_id:string;payload:unknown;updated_at:string};

type FetchLike=typeof fetch;

export class SupabaseRestClient{
 constructor(private config:SupabaseSyncConfig,private fetchImpl:FetchLike=fetch){}
 private headers(extra:Record<string,string>={}){
  return {
   apikey:this.config.serviceKey,
   Authorization:`Bearer ${this.config.serviceKey}`,
   'Content-Type':'application/json',
   ...extra
  };
 }
 private async request<T>(path:string,init:RequestInit={}):Promise<T>{
  const response=await this.fetchImpl(`${this.config.url}/rest/v1/${path}`,{...init,headers:this.headers((init.headers||{}) as Record<string,string>)});
  if(!response.ok){
   const body=await response.text().catch(()=>'');
   throw Error(`Supabase ${response.status}: ${body.slice(0,300)||response.statusText}`);
  }
  if(response.status===204)return undefined as T;
  const text=await response.text();
  return text?JSON.parse(text) as T:undefined as T;
 }
 upsertMeta(payload:unknown,revision:number){
  return this.request('pos_meta?on_conflict=id',{method:'POST',headers:this.headers({Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify({id:this.config.shopId,payload,revision,updated_at:new Date().toISOString()})});
 }
 upsertOrders(rows:RemoteOrder[]){
  if(!rows.length)return Promise.resolve();
  return this.request('pos_orders?on_conflict=id',{method:'POST',headers:this.headers({Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(rows)});
 }
 upsertJobs(rows:RemoteJob[]){
  if(!rows.length)return Promise.resolve();
  return this.request('pos_print_jobs?on_conflict=id',{method:'POST',headers:this.headers({Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(rows)});
 }
 upsertUsers(rows:RemoteUser[]){
  if(!rows.length)return Promise.resolve();
  return this.request('pos_users?on_conflict=username',{method:'POST',headers:this.headers({Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(rows)});
 }
 upsertAudit(rows:RemoteAudit[]){
  if(!rows.length)return Promise.resolve();
  return this.request('pos_audit?on_conflict=fingerprint',{method:'POST',headers:this.headers({Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(rows)});
 }
 upsertExpenses(rows:RemoteExpense[]){
  if(!rows.length)return Promise.resolve();
  return this.request('pos_expenses?on_conflict=id',{method:'POST',headers:this.headers({Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(rows)});
 }
 getMeta(){
  return this.request<RemoteMeta[]>(`pos_meta?id=eq.${encodeURIComponent(this.config.shopId)}&select=id,payload,updated_at,revision`);
 }
 listOrders(){
  return this.request<RemoteOrder[]>('pos_orders?select=id,reference,request_key,payload,updated_at&order=updated_at.asc');
 }
 listExpenses(){
  return this.request<RemoteExpense[]>(`pos_expenses?shop_id=eq.${encodeURIComponent(this.config.shopId)}&select=id,shop_id,payload,updated_at&order=updated_at.asc`);
 }
 listJobs(){
  return this.request<RemoteJob[]>('pos_print_jobs?select=id,order_id,kind,state,payload,updated_at&order=updated_at.asc');
 }
 listQueuedJobs(){
  return this.request<RemoteJob[]>('pos_print_jobs?state=eq.queued&select=id,order_id,kind,state,payload,updated_at&order=updated_at.asc&limit=40');
 }
 listOrdersByIds(ids:string[]){
  if(!ids.length)return Promise.resolve([] as RemoteOrder[]);
  return this.request<RemoteOrder[]>(`pos_orders?id=in.(${this.inFilter(ids)})&select=id,reference,request_key,payload,updated_at`);
 }
 listUsers(){
  return this.request<RemoteUser[]>('pos_users?select=username,salt,hash,role,active,updated_at');
 }
 private inFilter(ids:string[]){return ids.map(id=>`"${id.replaceAll('"','')}"`).join(',');}
 deleteOrders(ids:string[]){
  if(!ids.length)return Promise.resolve();
  return this.request(`pos_orders?id=in.(${this.inFilter(ids)})`,{method:'DELETE',headers:this.headers({Prefer:'return=minimal'})});
 }
 deleteJobs(ids:string[]){
  if(!ids.length)return Promise.resolve();
  return this.request(`pos_print_jobs?id=in.(${this.inFilter(ids)})`,{method:'DELETE',headers:this.headers({Prefer:'return=minimal'})});
 }
 deleteUsers(usernames:string[]){
  if(!usernames.length)return Promise.resolve();
  return this.request(`pos_users?username=in.(${this.inFilter(usernames)})`,{method:'DELETE',headers:this.headers({Prefer:'return=minimal'})});
 }
 deleteExpenses(ids:string[]){
  if(!ids.length)return Promise.resolve();
  return this.request(`pos_expenses?id=in.(${this.inFilter(ids)})`,{method:'DELETE',headers:this.headers({Prefer:'return=minimal'})});
 }
}
