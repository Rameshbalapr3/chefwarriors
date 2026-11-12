import {app,type BrowserWindow} from 'electron';
import {autoUpdater} from 'electron-updater';

export type AppUpdateStatus={
 supported:boolean;
 currentVersion:string;
 state:'idle'|'checking'|'available'|'not-available'|'downloading'|'ready'|'error';
 availableVersion?:string;
 progress?:number;
 message?:string;
};

let status:AppUpdateStatus={
 supported:false,
 currentVersion:'0.0.0',
 state:'idle',
 message:'Updates are available only in the installed desktop app.'
};
let configured=false;
let windowRef:BrowserWindow|null=null;
let checking:Promise<AppUpdateStatus>|null=null;
let downloading:Promise<AppUpdateStatus>|null=null;

function emit(){
 try{windowRef?.webContents.send('pos:update-status',structuredClone(status));}catch{/* UI may be closed */}
}

function setStatus(patch:Partial<AppUpdateStatus>){
 status={...status,...patch};
 emit();
}

export function getUpdateStatus():AppUpdateStatus{
 return structuredClone(status);
}

/** Packaged builds only. Never downloads or installs without an explicit UI action. */
export function setupAutoUpdater(win:BrowserWindow){
 windowRef=win;
 status={...status,currentVersion:app.getVersion()};
 if(!app.isPackaged){
  setStatus({supported:false,state:'idle',message:'Updates install only from the packaged desktop app (not from npm run desktop).'});
  return;
 }
 setStatus({supported:true,state:'idle',message:'You can check for updates in Settings.'});
 if(configured)return;
 configured=true;
 autoUpdater.autoDownload=false;
 autoUpdater.autoInstallOnAppQuit=true;
 autoUpdater.allowDowngrade=false;
 autoUpdater.on('checking-for-update',()=>setStatus({state:'checking',message:'Checking for updates…'}));
 autoUpdater.on('update-available',info=>setStatus({state:'available',availableVersion:info.version,progress:undefined,message:`Version ${info.version} is available.`}));
 autoUpdater.on('update-not-available',()=>setStatus({state:'not-available',availableVersion:undefined,progress:undefined,message:'You are on the latest version.'}));
 autoUpdater.on('download-progress',progress=>setStatus({state:'downloading',progress:Math.max(0,Math.min(100,Math.round(progress.percent))),message:`Downloading update… ${Math.round(progress.percent)}%`}));
 autoUpdater.on('update-downloaded',info=>setStatus({state:'ready',availableVersion:info.version,progress:100,message:`Version ${info.version} is ready. Restart to install.`}));
 autoUpdater.on('error',error=>{
  const message=error instanceof Error?error.message:'Update failed';
  setStatus({state:'error',progress:undefined,message:message.slice(0,300)});
 });
 // Quiet availability check only — never auto-download.
 setTimeout(()=>{void checkForUpdate().catch(()=>{/* keep POS running */});},60000);
}

export async function checkForUpdate():Promise<AppUpdateStatus>{
 if(!app.isPackaged)return getUpdateStatus();
 if(checking)return checking;
 checking=(async()=>{
  try{
   await autoUpdater.checkForUpdates();
   return getUpdateStatus();
  }catch(error){
   const message=error instanceof Error?error.message:'Update check failed';
   setStatus({state:'error',message:message.slice(0,300)});
   return getUpdateStatus();
  }finally{checking=null;}
 })();
 return checking;
}

export async function downloadUpdate():Promise<AppUpdateStatus>{
 if(!app.isPackaged)throw Error('Updates install only from the packaged desktop app.');
 if(status.state==='ready')return getUpdateStatus();
 if(status.state!=='available'&&status.state!=='error'&&status.state!=='downloading'){
  await checkForUpdate();
 }
 const current=getUpdateStatus();
 if(current.state==='ready')return current;
 if(current.state==='not-available')throw Error('You are already on the latest version.');
 if(current.state!=='available'&&current.state!=='downloading'){
  throw Error(current.message||'No update available to download.');
 }
 if(downloading)return downloading;
 downloading=(async()=>{
  try{
   setStatus({state:'downloading',progress:status.progress||0,message:'Downloading update…'});
   await autoUpdater.downloadUpdate();
   return getUpdateStatus();
  }catch(error){
   const message=error instanceof Error?error.message:'Download failed';
   setStatus({state:'error',message:message.slice(0,300)});
   throw Error(message.slice(0,300));
  }finally{downloading=null;}
 })();
 return downloading;
}

export function installUpdate(canInstall:()=>boolean):AppUpdateStatus{
 if(!app.isPackaged)throw Error('Updates install only from the packaged desktop app.');
 if(status.state!=='ready')throw Error('Download the update first, then restart to install.');
 if(!canInstall())throw Error('Wait for print submissions to finish, then install the update.');
 // Leaves billing/print paths alone; only restarts after the operator confirms.
 setImmediate(()=>autoUpdater.quitAndInstall(false,true));
 return getUpdateStatus();
}
