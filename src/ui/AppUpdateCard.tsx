import {useEffect,useState} from 'react';
import type {AppUpdateStatus,Result,Services} from '../contracts/services';

type Props={
 api:Services;
 unwrap:<T>(promise:Promise<Result<T>>)=>Promise<T>;
 act:(fn:()=>Promise<unknown>,message?:string)=>Promise<void>;
};

const idle:AppUpdateStatus={supported:false,currentVersion:'',state:'idle',message:'Checking update status…'};

export function AppUpdateCard({api,unwrap,act}:Props){
 const [status,setStatus]=useState<AppUpdateStatus>(idle);
 const [busy,setBusy]=useState(false);
 const desktop=api.mode==='desktop';

 useEffect(()=>{
  let alive=true;
  void (async()=>{
   try{
    const next=await unwrap(api.getUpdateStatus());
    if(alive)setStatus(next);
   }catch{
    if(alive)setStatus({...idle,message:desktop?'Could not read update status.':'App updates are available only in the installed desktop POS.'});
   }
  })();
  const onUpdate=api.onUpdateStatus;
  const stop=onUpdate?.(next=>{if(alive)setStatus(next);});
  return()=>{alive=false;stop?.();};
 },[api,desktop,unwrap]);

 async function run(action:()=>Promise<AppUpdateStatus>,done:string){
  if(busy)return;
  setBusy(true);
  try{
   await act(async()=>{
    const next=await action();
    setStatus(next);
   },done);
  }finally{setBusy(false);}
 }

 return (
  <section className="settings-card">
   <h2>App update</h2>
   <p className="settings-note">
    {desktop
     ?(status.message||`Installed version v${status.currentVersion||'—'}`)
     :'Open the installed desktop POS on the shop PC to check for updates.'}
   </p>
   {status.availableVersion&&<p className="settings-note">Available: <b>v{status.availableVersion}</b>{status.state==='downloading'&&typeof status.progress==='number'?` · ${status.progress}%`:''}</p>}
   <div className="settings-extra-actions">
    <button type="button" disabled={!desktop||busy||status.state==='checking'||status.state==='downloading'} onClick={()=>void run(()=>unwrap(api.checkForUpdate()),'Update check finished')}>Check for updates</button>
    <button type="button" disabled={!desktop||busy||(status.state!=='available'&&status.state!=='error')} onClick={()=>void run(()=>unwrap(api.downloadUpdate()),'Update downloaded')}>Download</button>
    <button type="button" className="primary" disabled={!desktop||busy||status.state!=='ready'} onClick={()=>void run(()=>unwrap(api.installUpdate()),'Restarting to install update')}>Install & restart</button>
   </div>
  </section>
 );
}
