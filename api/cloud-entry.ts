import type {VercelRequest,VercelResponse} from '@vercel/node';
import {ZodError} from 'zod';
import {invokeCloudPos} from './_lib/cloud-pos';
import {clearSessionCookie,createSessionToken,parseCookie,readSessionToken,sessionCookie} from './_lib/session';

export default async function handler(req:VercelRequest,res:VercelResponse){
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST'){res.status(405).json({ok:false,kind:'operational',error:'Use POST'});return;}
 if(req.headers['x-pos-request']!=='1'){res.status(403).json({ok:false,kind:'unauthorized',error:'Open the POS from its web address'});return;}
 const method=String(req.query.method||'');
 let args:unknown=req.body;
 if(typeof args==='string'){try{args=JSON.parse(args);}catch{res.status(400).json({ok:false,kind:'operational',error:'Invalid JSON'});return;}}
 if(!Array.isArray(args)||args.length>4){res.status(400).json({ok:false,kind:'operational',error:'Invalid request arguments'});return;}
 try{
  const current=readSessionToken(parseCookie(req.headers.cookie));
  const {result,session,clearSession}=await invokeCloudPos(method,args,current);
  if(clearSession)res.setHeader('Set-Cookie',clearSessionCookie());
  else if(session)res.setHeader('Set-Cookie',sessionCookie(createSessionToken(session)));
  res.status(200).json({ok:true,data:result});
 }catch(error){
  const message=error instanceof ZodError?'Invalid input. Check required fields and numeric limits.':error instanceof Error?error.message:'Operation failed';
  const kind=message.includes('permission')||message.includes('Sign in')||message.includes('Invalid credentials')?'unauthorized':'operational';
  res.status(200).json({ok:false,kind,error:message});
 }
}
