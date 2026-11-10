export type SupabaseEnv={url:string;serviceKey:string;shopId:string};

export function readSupabaseEnv():SupabaseEnv{
 const url=(process.env.POS_SUPABASE_URL||process.env.SUPABASE_URL||'').trim().replace(/\/$/,'');
 const serviceKey=(process.env.POS_SUPABASE_SERVICE_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
 const shopId=(process.env.POS_SUPABASE_SHOP_ID||'default').trim()||'default';
 if(!url||!serviceKey)throw Error('Cloud POS is not configured. Set POS_SUPABASE_URL and POS_SUPABASE_SERVICE_KEY on Vercel.');
 return {url,serviceKey,shopId};
}

export async function sb<T>(env:SupabaseEnv,path:string,init:RequestInit={}):Promise<T>{
 const headers:Record<string,string>={
  apikey:env.serviceKey,
  Authorization:`Bearer ${env.serviceKey}`,
  'Content-Type':'application/json',
  ...(init.headers as Record<string,string>|undefined)
 };
 const response=await fetch(`${env.url}/rest/v1/${path}`,{...init,headers});
 if(!response.ok){
  const body=await response.text().catch(()=>'');
  throw Error(`Supabase ${response.status}: ${body.slice(0,240)||response.statusText}`);
 }
 if(response.status===204)return undefined as T;
 const text=await response.text();
 return text?JSON.parse(text) as T:undefined as T;
}
