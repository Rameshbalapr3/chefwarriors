import {useMemo,useState} from 'react';
import {Minus,Plus,Trash2} from 'lucide-react';
import {calculate,money,type AmendOrder,type Item,type Order} from '../domain/model';
import {ResponsiveSelect} from './ResponsiveSelect';

type DraftLine=
 |{key:string;kind:'existing';index:number;item:Order['lines'][number];qty:number}
 |{key:string;kind:'menu';item:Item;qty:number;choices:Record<string,string>;notes:string};

type Props={
 order:Order;
 items:Item[];
 close:()=>void;
 save:(input:AmendOrder)=>Promise<void>;
};

const payments=['Cash','UPI','Card'] as const;

export function AmendOrderModal({order,items,close,save}:Props){
 const [lines,setLines]=useState<DraftLine[]>(()=>order.lines.map((item,index)=>({key:`e-${index}`,kind:'existing',index,item,qty:item.qty})));
 const [payment,setPayment]=useState<Order['payment']>(order.payment);
 const [reason,setReason]=useState('');
 const [swapKey,setSwapKey]=useState<string|null>(null);
 const [addValue,setAddValue]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const menuItems=useMemo(()=>items.filter(item=>item.available).sort((a,b)=>a.name.localeCompare(b.name)),[items]);
 const menuOptions=useMemo(()=>menuItems.map(item=>({value:item.id,label:`${item.name} · ${money(item.price)}`})),[menuItems]);
 const preview=useMemo(()=>{
  const rows=lines.map(line=>({price:line.item.price,qty:line.qty}));
  if(!rows.length)return null;
  try{
   const discount=Math.min(order.totals.discount,rows.reduce((sum,line)=>sum+line.price*line.qty,0));
   return calculate(rows,discount,order.settings.taxRate,order.settings.rounding);
  }catch{return null;}
 },[lines,order]);
 const changed=payment!==order.payment||lines.length!==order.lines.length||lines.some((line,index)=>line.kind!=='existing'||line.index!==index||line.qty!==order.lines[index]?.qty);

 function setQty(key:string,qty:number){setLines(rows=>rows.map(line=>line.key===key?{...line,qty}:line));}
 function removeLine(key:string){setLines(rows=>rows.filter(line=>line.key!==key));if(swapKey===key)setSwapKey(null);}
 function putMenuLine(key:string,item:Item,qty:number){
  const choices=Object.fromEntries((item.options||[]).map(option=>[option.name,option.values[0]||'']));
  setLines(rows=>rows.map(line=>line.key===key?{key:line.key,kind:'menu',item,qty,choices,notes:''}:line));
  setSwapKey(null);setError('');
 }
 function addItem(itemId:string){
  const item=menuItems.find(row=>row.id===itemId);if(!item)return;
  const choices=Object.fromEntries((item.options||[]).map(option=>[option.name,option.values[0]||'']));
  setLines(rows=>[...rows,{key:`m-${crypto.randomUUID()}`,kind:'menu',item,qty:1,choices,notes:''}]);
  setAddValue('');setError('');
 }

 async function submit(){
  if(busy)return;
  if(!reason.trim()){setError('Enter a short reason.');return;}
  if(!changed){setError('Change something first.');return;}
  if(!preview||!lines.length){setError('Keep at least one item.');return;}
  for(const line of lines){
   if(line.kind==='menu'){
    for(const option of line.item.options||[]){
     if(!line.choices[option.name]){setError(`Choose ${option.name} for ${line.item.name}.`);return;}
    }
   }
  }
  setBusy(true);setError('');
  try{
   await save({
    id:order.id,
    reason:reason.trim(),
    payment,
    lines:lines.map(line=>line.kind==='existing'
     ?{keepIndex:line.index,qty:line.qty}
     :{id:line.item.id,qty:line.qty,choices:line.item.options?.length?line.choices:undefined,notes:line.notes||undefined})
   });
  }catch(e){setError(e instanceof Error?e.message:String(e));setBusy(false);}
 }

 return <div className="amend-simple">
  <p className="amend-hint"><b>{order.reference}</b> · same bill no.</p>

  <div className="amend-lines">
   {lines.map(line=><div className={`amend-row${swapKey===line.key?' is-open':''}`} key={line.key}>
    <div className="amend-row-main">
     <div className="amend-name">
      <b>{line.item.name}</b>
      <small>{money(line.item.price)}</small>
     </div>
     <div className="amend-qty">
      <button type="button" aria-label={`Decrease ${line.item.name}`} disabled={busy||line.qty<=1} onClick={()=>setQty(line.key,line.qty-1)}><Minus size={18}/></button>
      <strong>{line.qty}</strong>
      <button type="button" aria-label={`Increase ${line.item.name}`} disabled={busy||line.qty>=999} onClick={()=>setQty(line.key,line.qty+1)}><Plus size={18}/></button>
     </div>
     <strong className="amend-line-total">{money(line.item.price*line.qty)}</strong>
     <button type="button" className="amend-swap-btn" disabled={busy} aria-pressed={swapKey===line.key} onClick={()=>setSwapKey(swapKey===line.key?null:line.key)}>Swap</button>
     <button type="button" className="danger amend-del" aria-label={`Remove ${line.item.name}`} disabled={busy} onClick={()=>removeLine(line.key)}><Trash2 size={18}/></button>
    </div>
    {swapKey===line.key&&<div className="amend-swap-panel">
     <ResponsiveSelect searchable value="" placeholder="Choose new product…" disabled={busy} options={menuOptions} onChange={itemId=>{const item=menuItems.find(row=>row.id===itemId);if(item)putMenuLine(line.key,item,line.qty);}} aria-label={`Replace ${line.item.name}`}/>
    </div>}
    {line.kind==='menu'&&!!line.item.options?.length&&<div className="amend-options">{line.item.options.map(option=><label key={option.name}>{option.name}<ResponsiveSelect value={line.choices[option.name]||''} placeholder="Select" options={option.values.map(value=>({value,label:value}))} onChange={value=>setLines(rows=>rows.map(row=>row.key===line.key&&row.kind==='menu'?{...row,choices:{...row.choices,[option.name]:value}}:row))}/></label>)}</div>}
   </div>)}
  </div>

  <div className="amend-add-simple">
   <span>Add item</span>
   <ResponsiveSelect searchable value={addValue} placeholder="+ Add product…" disabled={busy} options={menuOptions} onChange={addItem}/>
  </div>

  <div className="amend-payment" role="group" aria-label="Payment">
   {payments.map(method=><button type="button" key={method} className={payment===method?'selected':''} aria-pressed={payment===method} disabled={busy} onClick={()=>setPayment(method)}>{method}</button>)}
  </div>

  <div className="amend-total"><span>Total</span><strong>{preview?money(preview.total):'—'}</strong></div>
  <label className="amend-reason">Reason<input value={reason} maxLength={300} required placeholder="Why change?" onChange={e=>setReason(e.target.value)}/></label>
  {error&&<p className="error" role="alert">{error}</p>}
  <div className="amend-actions">
   <button type="button" disabled={busy} onClick={close}>Back</button>
   <button type="button" className="primary" disabled={busy||!changed||!preview} onClick={()=>void submit()}>{busy?'Saving…':'Save & print'}</button>
  </div>
 </div>;
}
