import {createServer,type ServerResponse} from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import type {Session} from '../src/domain/model';
import type {Result} from '../src/contracts/services';

export type ClientContext={session:Session|null;transport:'desktop'|'browser'};
export const BROWSER_PORT=17373;
export const BROWSER_URL=`http://127.0.0.1:${BROWSER_PORT}`;
const COOKIE='cw_pos_session',TTL=8*60*60*1000,MAX_BODY=128*1024;
const METHODS=new Set(['authStatus','login','logout','state','checkout','cancel','saveItem','saveCategory','saveSettings','printers','print','testPrinter','addUser']);
type BrowserSession={context:ClientContext;expires:number};

// Loopback only: this is the same-machine browser interface, not a LAN service.
export async function startBrowserServer(options:{root:string;development:boolean;port?:number;invoke:(method:string,args:unknown[],client:ClientContext)=>Promise<Result<unknown>>}){
 const port=options.port??BROWSER_PORT,localUrl=`http://127.0.0.1:${port}`;
 const sessions=new Map<string,BrowserSession>();
 const origins=new Set([localUrl,`http://localhost:${port}`]);
 const hosts=new Set([`127.0.0.1:${port}`,`localhost:${port}`]);
 if(options.development){for(const host of ['127.0.0.1:5173','localhost:5173']){hosts.add(host);origins.add(`http://${host}`);}}
 const root=resolve(options.root);
 function json(res:ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
 function fail(res:ServerResponse,status:number,message:string){json(res,status,{ok:false,kind:status===403?'unauthorized':'operational',error:message});}
 function cookie(res:ServerResponse,id:string,maxAge=TTL/1000){res.setHeader('Set-Cookie',`${COOKIE}=${id}; HttpOnly; SameSite=Strict; Path=/api/pos; Max-Age=${maxAge}`);}
 function prune(){const now=Date.now();for(const [id,session] of sessions)if(session.expires<now)sessions.delete(id);}
 const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
  if(!hosts.has(req.headers.host||'')){fail(res,403,'Invalid local POS host');return;}
  try{
   const url=new URL(req.url||'/',localUrl);
   if(url.pathname.startsWith('/api/pos/')){
    // A custom header and explicit trusted origin prevent cross-site form/fetch requests.
    if(req.method!=='POST'){fail(res,405,'Use POST');return;}
    if(req.headers['x-pos-request']!=='1'||!origins.has(req.headers.origin||'')){fail(res,403,'Open the POS from its local address');return;}
    if(!req.headers['content-type']?.startsWith('application/json')){fail(res,415,'JSON request required');return;}
    const method=url.pathname.slice('/api/pos/'.length);
    if(!METHODS.has(method)){fail(res,404,'This action is not available in the browser. Use the desktop app for backup and restore.');return;}
    const length=Number(req.headers['content-length']||0);if(length>MAX_BODY){fail(res,413,'Request is too large');req.resume();return;}
    const chunks:Buffer[]=[];let size=0;
    for await(const part of req){const chunk=Buffer.from(part);size+=chunk.length;if(size>MAX_BODY){fail(res,413,'Request is too large');return;}chunks.push(chunk);}
    let args:unknown;try{args=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{fail(res,400,'Invalid JSON');return;}
    if(!Array.isArray(args)||args.length>4){fail(res,400,'Invalid request arguments');return;}
    prune();
    let id=(req.headers.cookie||'').split(';').map(c=>c.trim()).find(c=>c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1)||'';
    let current=sessions.get(id);
    if(!current){
     if(method!=='authStatus'&&method!=='login'){fail(res,403,'Sign in required');return;}
     if(sessions.size>=128){fail(res,503,'Too many local browser sessions. Close unused sessions and try later.');return;}
     id=randomBytes(32).toString('hex');current={context:{session:null,transport:'browser'},expires:Date.now()+TTL};sessions.set(id,current);
    }
    const result=await options.invoke(method,args,current.context);
    if(method==='logout'){
     sessions.delete(id);cookie(res,'',0);
    }else if(method==='login'&&result.ok){
     sessions.delete(id);id=randomBytes(32).toString('hex');sessions.set(id,current);current.expires=Date.now()+TTL;cookie(res,id);
    }else{current.expires=Date.now()+TTL;cookie(res,id);}
    json(res,200,result);return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){fail(res,405,'Method not allowed');return;}
   const pathname=decodeURIComponent(url.pathname);
   const file=resolve(root,pathname==='/'?'index.html':`.${pathname}`);
   if(!file.startsWith(root+sep)){fail(res,403,'Invalid file path');return;}
   const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2'};
   if(!mime[extname(file)]){fail(res,404,'Not found');return;}
   try{const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)],'Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-src 'self' about:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:data);}catch{fail(res,404,'Application files not found. Install the updated POS release.');}
  }catch{if(!res.headersSent)fail(res,400,'Unable to process this POS request');else res.end();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});});
 return {url:localUrl,invalidateSessions(){for(const entry of sessions.values())entry.context.session=null;sessions.clear();},close(){sessions.clear();server.close();server.closeAllConnections();}};
}
