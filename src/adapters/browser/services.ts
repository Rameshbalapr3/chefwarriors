import type {Services,Result} from '../../contracts/services';

const cloudWeb=import.meta.env.VITE_POS_CLOUD==='true';

// Local Vite proxies /api/pos to the desktop app. On Vercel the same path hits serverless Supabase handlers.
export function browserServices():Services{
 async function call<T>(method:string,...args:unknown[]):Promise<Result<T>>{
  while(args.length&&args[args.length-1]===undefined)args.pop();
  try{
   const response=await fetch(`/api/pos/${method}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-POS-Request':'1'},body:JSON.stringify(args),signal:AbortSignal.timeout(65000)});
   if(response.status===413)return {ok:false,kind:'operational',error:'Photo is too large to save. Use a smaller image and try again.'};
   const result=await response.json();
   if(!result||typeof result.ok!=='boolean')throw Error('Invalid POS response');
   return result as Result<T>;
  }catch{return {ok:false,kind:'operational',error:cloudWeb?'Cannot reach the cloud POS API. Check the Vercel deployment and Supabase settings, then retry. If a bill was being saved, check order history before starting another bill.':'Cannot reach the local POS server. Keep the updated Chef Warriors desktop app running on this machine, then retry. If a bill was being saved, check order history before starting another bill.'};}
 }
 const desktopOnly=async():Promise<Result<string>>=>({ok:false,kind:'operational',error:'Use Backup & recovery in the desktop POS for database export or restore.'});
 return {mode:'browser',authStatus:()=>call('authStatus'),login:(username,password,setup)=>call('login',username,password,setup),logout:()=>call('logout'),state:()=>call('state'),checkout:input=>call('checkout',input),cancel:(id,reason)=>call('cancel',id,reason),amendOrder:input=>call('amendOrder',input),saveItem:item=>call('saveItem',item),saveCategory:(name,previous)=>call('saveCategory',name,previous),saveSettings:settings=>call('saveSettings',settings),saveExpense:expense=>call('saveExpense',expense),deleteExpense:id=>call('deleteExpense',id),printers:()=>call('printers'),print:(id,reason)=>call('print',id,reason),testPrinter:kind=>call('testPrinter',kind),printExpenseBill:input=>call('printExpenseBill',input),addUser:(username,password)=>call('addUser',username,password),backup:desktopOnly,restore:desktopOnly,switchRole:async()=>({ok:false,kind:'unauthorized',error:'Sign in with your own staff account.'}),reset:async()=>({ok:false,kind:'unauthorized',error:'Live POS data cannot be reset from this interface.'})};
}
