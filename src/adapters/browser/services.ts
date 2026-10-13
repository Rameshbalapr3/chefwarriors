import type {Services,Result} from '../../contracts/services';

// Relative requests also work through the Vite /api proxy during UI development.
export function browserServices():Services{
 async function call<T>(method:string,...args:unknown[]):Promise<Result<T>>{
  while(args.length&&args[args.length-1]===undefined)args.pop();
  try{
   const response=await fetch(`/api/pos/${method}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-POS-Request':'1'},body:JSON.stringify(args),signal:AbortSignal.timeout(65000)});
   const result=await response.json();
   if(!result||typeof result.ok!=='boolean')throw Error('Invalid POS response');
   return result as Result<T>;
  }catch{return {ok:false,kind:'operational',error:'Cannot reach the local POS server. Keep the updated Chef Warriors desktop app running on this machine, then retry. If a bill was being saved, check order history before starting another bill.'};}
 }
 const desktopOnly=async():Promise<Result<string>>=>({ok:false,kind:'operational',error:'Use Backup & recovery in the desktop POS for database export or restore.'});
 return {mode:'browser',authStatus:()=>call('authStatus'),login:(username,password,setup)=>call('login',username,password,setup),logout:()=>call('logout'),state:()=>call('state'),checkout:input=>call('checkout',input),cancel:(id,reason)=>call('cancel',id,reason),saveItem:item=>call('saveItem',item),saveCategory:(name,previous)=>call('saveCategory',name,previous),saveSettings:settings=>call('saveSettings',settings),printers:()=>call('printers'),print:(id,reason)=>call('print',id,reason),testPrinter:kind=>call('testPrinter',kind),addUser:(username,password)=>call('addUser',username,password),backup:desktopOnly,restore:desktopOnly,switchRole:async()=>({ok:false,kind:'unauthorized',error:'Sign in with your own staff account.'}),reset:async()=>({ok:false,kind:'unauthorized',error:'Live POS data cannot be reset from this interface.'})};
}
