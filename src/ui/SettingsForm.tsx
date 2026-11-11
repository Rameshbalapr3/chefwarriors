import {useEffect,useRef,useState} from 'react';
import {Printer,RotateCcw,Save} from 'lucide-react';
import type {Settings} from '../domain/model';
import {ResponsiveSelect} from './ResponsiveSelect';

export function SettingsForm({settings,onSave,printers,test}:{settings:Settings;onSave:(value:Settings)=>Promise<void>;printers:()=>Promise<string[]>;test:(kind:'counter'|'kitchen')=>Promise<string>}){
 const [draft,setDraft]=useState(settings),[saved,setSaved]=useState(settings),[devices,setDevices]=useState<string[]>([]),[busy,setBusy]=useState(''),[error,setError]=useState(''),[message,setMessage]=useState('');
 const lock=useRef(false),initialPrinters=useRef(printers);
 const dirty=JSON.stringify(draft)!==JSON.stringify(saved);
 const printerNames=[...new Set([...devices,draft.counter].filter(Boolean))];
 useEffect(()=>{let active=true;void initialPrinters.current().then(list=>{if(active)setDevices(list);}).catch(e=>{if(active)setError(String(e));});return()=>{active=false;};},[]);
 function change<K extends keyof Settings>(key:K,value:Settings[K]){setDraft(current=>({...current,[key]:value}));setMessage('');}
 async function run(name:string,action:()=>Promise<string>){if(lock.current)return;lock.current=true;setBusy(name);setError('');setMessage('');try{setMessage(await action());}catch(e){setError(e instanceof Error?e.message:'Operation failed');}finally{lock.current=false;setBusy('');}}

 return <form className="settings-pos" onSubmit={e=>{e.preventDefault();void run('save',async()=>{await onSave(draft);setSaved({...draft});return 'Settings saved.';});}}>
  <fieldset disabled={!!busy} className="settings-pos-grid">
   <section className="settings-card">
    <h2>Shop & bill</h2>
    <div className="settings-grid">
     <label>Restaurant name<input value={draft.shop} required maxLength={80} onChange={e=>change('shop',e.target.value)}/></label>
     <label>Phone<input type="tel" value={draft.phone} maxLength={30} onChange={e=>change('phone',e.target.value)}/></label>
     <label className="settings-span">Address<textarea value={draft.address} maxLength={200} rows={2} onChange={e=>change('address',e.target.value)}/></label>
     <label>Paper width<ResponsiveSelect value={draft.width} onChange={value=>change('width',value as Settings['width'])} options={[{value:'80',label:'80 mm'},{value:'58',label:'58 mm'}]}/></label>
     <label>Tax %<input type="number" value={draft.taxRate} min="0" max="100" step="0.01" required onChange={e=>change('taxRate',Number(e.target.value))}/></label>
     <label>Rounding<ResponsiveSelect value={draft.rounding} onChange={value=>change('rounding',value as Settings['rounding'])} options={[{value:'paise',label:'Nearest paise'},{value:'rupee',label:'Nearest rupee'}]}/></label>
    </div>
   </section>

   <section className="settings-card">
    <div className="settings-card-head">
     <h2>Bill printer</h2>
     <button type="button" onClick={()=>void run('refresh',async()=>{setDevices(await printers());return 'Printer list refreshed.';})}><RotateCcw size={18}/>{busy==='refresh'?'…':'Refresh'}</button>
    </div>
    <div className="settings-grid settings-printer-row">
     <label className="settings-span">Printer
      <ResponsiveSelect searchable value={draft.counter} placeholder="Not assigned" onChange={value=>change('counter',value)} options={[{value:'',label:'Not assigned'},...printerNames.map(name=>({value:name,label:name}))]}/>
     </label>
     <button type="button" className="settings-test" disabled={dirty||!saved.counter||!!busy} onClick={()=>void run('counter',()=>test('counter'))}>
      <Printer size={18}/>{busy==='counter'?'Sending…':'Test print'}
     </button>
    </div>
    <p className="settings-note">{dirty?'Save first, then test.':draft.counter?`Printing to ${draft.counter} · 2 copies per sale`:'Choose a printer, save, then test.'}</p>
   </section>
  </fieldset>

  {(dirty||busy||error||message)&&<div className="settings-actions">
   <span role="status">{busy?'Working…':error?error:message?message:dirty?'Unsaved changes':''}</span>
   <div>
    <button type="button" disabled={!dirty||!!busy} onClick={()=>{setDraft({...saved});setError('');setMessage('');}}>Discard</button>
    <button className="primary" disabled={!dirty||!!busy}><Save size={18}/>{busy==='save'?'Saving…':'Save'}</button>
   </div>
  </div>}
  {error&&!(dirty||busy||message)&&<p className="error" role="alert">{error}</p>}
 </form>;
}
