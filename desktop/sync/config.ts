import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';

export type SupabaseSyncConfig={url:string;serviceKey:string;shopId:string};

function parseEnvFile(path:string){
 if(!existsSync(path))return;
 for(const line of readFileSync(path,'utf8').split(/\r?\n/)){
  const trimmed=line.trim();
  if(!trimmed||trimmed.startsWith('#'))continue;
  const eq=trimmed.indexOf('=');
  if(eq<=0)continue;
  const key=trimmed.slice(0,eq).trim();
  let value=trimmed.slice(eq+1).trim();
  if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
  if(!(key in process.env)||process.env[key]==='')process.env[key]=value;
 }
}

/** Loads optional .env files. Missing config keeps POS fully local. */
export function loadSyncEnv(paths:string[]){for(const path of paths)parseEnvFile(path);}

export function readSupabaseSyncConfig(userData?:string):SupabaseSyncConfig|null{
 if(userData){
  const file=join(userData,'supabase.json');
  if(existsSync(file)){
   try{
    const raw=JSON.parse(readFileSync(file,'utf8')) as {url?:string;serviceKey?:string;shopId?:string};
    if(raw.url&&raw.serviceKey)return {url:raw.url.replace(/\/$/,''),serviceKey:raw.serviceKey,shopId:raw.shopId?.trim()||'default'};
   }catch{/* ignore invalid optional config */}
  }
 }
 const url=(process.env.POS_SUPABASE_URL||process.env.SUPABASE_URL||'').trim().replace(/\/$/,'');
 const serviceKey=(process.env.POS_SUPABASE_SERVICE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
 const shopId=(process.env.POS_SUPABASE_SHOP_ID||'default').trim()||'default';
 if(!url||!serviceKey)return null;
 return {url,serviceKey,shopId};
}
