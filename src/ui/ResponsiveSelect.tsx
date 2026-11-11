import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {ChevronDown} from 'lucide-react';

export type SelectOption={value:string;label:string;disabled?:boolean};

type Props={
 value:string;
 options:SelectOption[];
 onChange:(value:string)=>void;
 placeholder?:string;
 name?:string;
 id?:string;
 disabled?:boolean;
 required?:boolean;
 searchable?:boolean;
 className?:string;
 'aria-label'?:string;
};

export function ResponsiveSelect({value,options,onChange,placeholder='Select…',name,id,disabled,required,searchable=false,className='',...rest}:Props){
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState('');
 const box=useRef<HTMLDivElement>(null);
 const autoId=useId();
 const selectId=id||autoId;
 const selected=options.find(option=>option.value===value&&!option.disabled);
 const filtered=useMemo(()=>{
  const q=query.trim().toLowerCase();
  if(!q)return options.filter(option=>!option.disabled||option.value===value);
  return options.filter(option=>(!option.disabled||option.value===value)&&option.label.toLowerCase().includes(q));
 },[options,query,value]);
 useEffect(()=>{
  if(!open)return;
  const onPointer=(event:PointerEvent)=>{if(box.current&&!box.current.contains(event.target as Node))setOpen(false);};
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
  document.addEventListener('pointerdown',onPointer);
  document.addEventListener('keydown',onKey);
  return ()=>{document.removeEventListener('pointerdown',onPointer);document.removeEventListener('keydown',onKey);};
 },[open]);
 return <div className={`ui-select${className?` ${className}`:''}${open?' is-open':''}`} ref={box}>
  {name!==undefined&&<input type="hidden" name={name} value={value} required={required&&!value}/>}
  <button type="button" id={selectId} className="ui-select-trigger" disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={rest['aria-label']} onClick={()=>setOpen(current=>!current)}>
   <span className={!selected?'is-placeholder':''}>{selected?.label||placeholder}</span>
   <ChevronDown size={18}/>
  </button>
  {open&&<div className="ui-select-menu">
   {searchable&&<input className="ui-select-search" value={query} autoFocus placeholder="Search…" onChange={e=>setQuery(e.target.value)}/>}
   <ul role="listbox" aria-labelledby={selectId}>
    {filtered.map(option=><li key={`${option.value}-${option.label}`}>
     <button type="button" role="option" aria-selected={option.value===value} className={option.value===value?'selected':''} disabled={option.disabled} onClick={()=>{if(option.disabled)return;onChange(option.value);setOpen(false);setQuery('');}}>
      {option.label}
     </button>
    </li>)}
    {!filtered.length&&<li className="ui-select-empty">No match</li>}
   </ul>
  </div>}
 </div>;
}
