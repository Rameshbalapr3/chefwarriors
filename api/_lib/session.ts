import {createHmac,timingSafeEqual} from 'node:crypto';
import type {Session} from '../../src/domain/model';

const COOKIE='cw_cloud_session';
const TTL_MS=8*60*60*1000;

function secret(){
 const value=(process.env.POS_SESSION_SECRET||process.env.POS_SUPABASE_SERVICE_KEY||'').trim();
 if(!value)throw Error('Set POS_SESSION_SECRET for cloud POS sessions.');
 return value;
}

function sign(payload:string){
 return createHmac('sha256',secret()).update(payload).digest('base64url');
}

export function createSessionToken(session:Session){
 const payload=Buffer.from(JSON.stringify({...session,exp:Date.now()+TTL_MS}),'utf8').toString('base64url');
 return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token:string|undefined):Session|null{
 if(!token)return null;
 const [payload,signature]=token.split('.');
 if(!payload||!signature)return null;
 const expected=sign(payload);
 try{
  const a=Buffer.from(signature),b=Buffer.from(expected);
  if(a.length!==b.length||!timingSafeEqual(a,b))return null;
 }catch{return null;}
 try{
  const data=JSON.parse(Buffer.from(payload,'base64url').toString('utf8')) as Session & {exp:number};
  if(!data?.username||(data.role!=='admin'&&data.role!=='cashier')||Date.now()>Number(data.exp||0))return null;
  return {username:data.username,role:data.role};
 }catch{return null;}
}

export function parseCookie(header:string|undefined){
 if(!header)return '';
 const part=header.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${COOKIE}=`));
 return part?part.slice(COOKIE.length+1):'';
}

export function sessionCookie(token:string,maxAgeSec=TTL_MS/1000){
 const secure=process.env.VERCEL==='1'||process.env.NODE_ENV==='production';
 return `${COOKIE}=${token}; HttpOnly; Path=/api/pos; SameSite=Lax; Max-Age=${Math.floor(maxAgeSec)}${secure?'; Secure':''}`;
}

export function clearSessionCookie(){
 const secure=process.env.VERCEL==='1'||process.env.NODE_ENV==='production';
 return `${COOKIE}=; HttpOnly; Path=/api/pos; SameSite=Lax; Max-Age=0${secure?'; Secure':''}`;
}
