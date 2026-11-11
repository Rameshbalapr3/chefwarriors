import {useState} from 'react';
import {Download,ReceiptText,Search} from 'lucide-react';
import {csvCell,inCashierBusinessDay,localDate,money,type Job,type Order} from '../domain/model';

type Props={orders:Order[];jobs:Job[];admin:boolean;query:string;setQuery:(value:string)=>void;view:(order:Order)=>void;cancel:(order:Order)=>void;amend:(order:Order)=>void};
const printLabels:Record<Job['state'],string>={queued:'Queued',submitting:'Sending',submitted:'Submitted',failed:'Failed',unknown:'Check printer',preview:'Demo preview'};
const orderDate=(value:string)=>new Date(value).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const orderTime=(value:string)=>new Date(value).toLocaleString('en-IN',{hour:'2-digit',minute:'2-digit'});

export function OrderHistory({orders,jobs,admin,query,setQuery,view,cancel,amend}:Props){
 const [from,setFrom]=useState(''),[to,setTo]=useState(''),[status,setStatus]=useState('all'),[payment,setPayment]=useState('all'),[type,setType]=useState('all'),[sort,setSort]=useState('newest'),[expanded,setExpanded]=useState<string|null>(null),[datesOpen,setDatesOpen]=useState(false);
 const [paging,setPaging]=useState({key:'',page:1});
 const invalidRange=!!from&&!!to&&from>to;
 const filterKey=JSON.stringify([query,from,to,status,payment,type,sort,admin]);
 const scoped=admin?orders:orders.filter(o=>inCashierBusinessDay(o.created));
 const filtered=scoped.filter(o=>{
  const day=localDate(o.created),text=query.trim().toLowerCase();
  return !invalidRange&&(!text||o.reference.toLowerCase().includes(text)||o.token.toLowerCase().includes(text)||String(o.dailyToken||'').includes(text))&&(admin?(!from||day>=from)&&(!to||day<=to):true)&&(status==='all'||o.state===status)&&(payment==='all'||o.payment===payment)&&(type==='all'||o.type===type);
 }).sort((a,b)=>sort==='oldest'?a.created.localeCompare(b.created):sort==='total-high'?b.totals.total-a.totals.total:b.created.localeCompare(a.created));
 const pageCount=Math.max(1,Math.ceil(filtered.length/20));
 const page=paging.key===filterKey?Math.min(paging.page,pageCount):1;
 const shown=filtered.slice((page-1)*20,page*20);
 const paid=filtered.filter(o=>o.state==='paid');
 const total=paid.reduce((sum,o)=>sum+o.totals.total,0);
 const latestJobs=new Map<string,Job[]>();
 for(const job of jobs){if(job.kind!=='counter')continue;const list=latestJobs.get(job.orderId)||[];list.push(job);latestJobs.set(job.orderId,list);}
 function clear(){setQuery('');setFrom('');setTo('');setStatus('all');setPayment('all');setType('all');setSort('newest');setDatesOpen(false);}
 function preset(kind:'today'|'week'|'all'){
  if(kind==='all'){setFrom('');setTo('');setDatesOpen(false);return;}
  const now=new Date();setTo(localDate(now.toISOString()));
  if(kind==='week')now.setDate(now.getDate()-6);
  setFrom(localDate(now.toISOString()));
  setDatesOpen(false);
 }
 function exportOrders(){
  const rows=[['Invoice','Date and time','Order type','Table or token','Daily token','Payment','Status','Total INR','Cancellation reason'],...filtered.map(o=>[o.reference,orderDate(o.created),o.type,o.token,o.dailyToken??'',o.payment,o.state,(o.totals.total/100).toFixed(2),o.reason||''])];
  const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`orders-${localDate(new Date().toISOString())}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function printInfo(orderId:string){
  const billJobs=latestJobs.get(orderId)||[];
  const job=billJobs.slice(-1)[0];
  return {job,count:Math.max(billJobs.length,1)};
 }
 function toggle(current:string,value:string,set:(next:string)=>void){set(current===value?'all':value);}
 const cashierEmpty=!admin&&!filtered.length&&!query.trim()&&status==='all'&&payment==='all'&&type==='all';
 const filtersActive=!!query.trim()||!!from||!!to||status!=='all'||payment!=='all'||type!=='all'||sort!=='newest';
 const place=(o:Order)=>`${o.type==='Dine-in'?'Table':'Token'} ${o.token}${o.dailyToken?` · Daily ${o.dailyToken}`:''}`;

 return <section className="orders-pos">
  <div className="orders-hero">
   <div className="orders-hero-top">
    <h1>Orders</h1>
    <span className="orders-paid-pill" aria-label="Paid total">{money(total)} · {paid.length} paid</span>
    {!admin&&<span className="orders-shift">Shift 12 PM–2 AM</span>}
    {admin&&<button type="button" className="orders-export" disabled={!filtered.length} onClick={exportOrders}><Download size={18}/>Export</button>}
   </div>
   <div className="orders-filters" role="toolbar" aria-label="Order filters">
    {admin&&<>
     <button type="button" className={!from&&!to?'active':''} onClick={()=>preset('all')}>All dates</button>
     <button type="button" className={from&&to&&from===to?'active':''} onClick={()=>preset('today')}>Today</button>
     <button type="button" onClick={()=>preset('week')}>7 days</button>
     <button type="button" className={datesOpen?'active':''} onClick={()=>setDatesOpen(open=>!open)}>Dates</button>
    </>}
    <button type="button" className={status==='paid'?'active':''} onClick={()=>toggle(status,'paid',setStatus)}>Paid</button>
    <button type="button" className={status==='cancelled'?'active':''} onClick={()=>toggle(status,'cancelled',setStatus)}>Cancelled</button>
    <button type="button" className={payment==='Cash'?'active':''} onClick={()=>toggle(payment,'Cash',setPayment)}>Cash</button>
    <button type="button" className={payment==='UPI'?'active':''} onClick={()=>toggle(payment,'UPI',setPayment)}>UPI</button>
    <button type="button" className={type==='Takeaway'?'active':''} onClick={()=>toggle(type,'Takeaway',setType)}>Takeaway</button>
    <button type="button" className={type==='Dine-in'?'active':''} onClick={()=>toggle(type,'Dine-in',setType)}>Dine-in</button>
    <button type="button" className={sort==='total-high'?'active':''} onClick={()=>setSort(sort==='total-high'?'newest':'total-high')}>Highest</button>
    {filtersActive&&<button type="button" onClick={clear}>Clear</button>}
   </div>
   {admin&&datesOpen&&<div className="orders-dates">
    <label>From<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label>
    <label>To<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label>
    {invalidRange&&<p className="error" role="alert">End date must be on or after start date.</p>}
   </div>}
   <p className="orders-hint" role="status">Use top search for invoice / token · {filtered.length?`${(page-1)*20+1}–${Math.min(page*20,filtered.length)} of ${filtered.length}`:'0 bills'}</p>
  </div>

  <div className="orders-list" aria-label="Bills">
   {shown.map(o=>{
    const open=expanded===o.id;
    const print=printInfo(o.id);
    const cancelled=o.state==='cancelled';
    return <article key={o.id} className={`order-ticket${open?' open':''}${cancelled?' cancelled':''}`}>
     <button type="button" className="order-ticket-main" aria-expanded={open} aria-controls={`order-details-${o.id}`} onClick={()=>setExpanded(open?null:o.id)}>
      <div className="order-ticket-id">
       <strong>{o.reference}</strong>
       <small>{orderTime(o.created)}</small>
      </div>
      <div className="order-ticket-meta">
       <span>{o.type}</span>
       <span>{place(o)}</span>
       <span>{o.payment}</span>
       {cancelled&&<span className="order-ticket-state">Cancelled</span>}
      </div>
      <div className="order-ticket-total">{money(o.totals.total)}</div>
     </button>
     <div className="order-ticket-actions">
      <button type="button" className="primary" onClick={()=>view(o)}>Bill</button>
      {admin&&o.state==='paid'&&<>
       <button type="button" onClick={()=>amend(o)}>Edit</button>
       <button type="button" className="danger" onClick={()=>cancel(o)}>Cancel</button>
      </>}
     </div>
     {open&&<div className="order-ticket-detail" id={`order-details-${o.id}`}>
      <div className="order-ticket-items">
       <h2>Items</h2>
       <p className="order-ticket-when">{orderDate(o.created)}</p>
       {o.lines.map((line,index)=><div className="order-ticket-line" key={index}><div><b>{line.qty} × {line.name}</b>{line.notes&&<small>{line.notes}</small>}</div><strong>{money(line.price*line.qty)}</strong></div>)}
       {o.amendReason&&<p className="history-amend"><b>Corrected</b><br/>{o.amendReason}</p>}
       <p className="order-ticket-print">Print · ×{print.count} · {print.job?printLabels[print.job.state]:'No job'}</p>
      </div>
      <div className="order-ticket-totals">
       {[['Subtotal',o.totals.subtotal],['Discount',-o.totals.discount],['Tax',o.totals.tax],['Rounding',o.totals.rounding],['Total',o.totals.total]].map(([label,amount])=><div key={label}><span>{label}</span><strong>{money(Number(amount))}</strong></div>)}
       {o.payment==='Cash'&&<><div><span>Cash received</span><strong>{money(o.tendered)}</strong></div><div><span>Change</span><strong>{money(o.change)}</strong></div></>}
       {o.reason&&<p className="history-cancellation"><b>Cancellation reason</b><br/>{o.reason}</p>}
      </div>
     </div>}
    </article>;
   })}
   {!filtered.length&&<div className="empty orders-empty">{cashierEmpty||orders.length?<Search/>:<ReceiptText/>}<h3>{cashierEmpty?'No orders in this shift yet':orders.length?'No matching orders':'No orders yet'}</h3><p>{cashierEmpty?'Bills from the current 12:00 PM–2:00 AM shift will appear here.':orders.length?'Try different filters or clear search.':'Saved bills will appear here.'}</p>{!cashierEmpty&&orders.length>0&&<button type="button" onClick={clear}>Clear filters</button>}</div>}
  </div>

  {pageCount>1&&<div className="orders-pagination"><button type="button" disabled={page<=1} onClick={()=>setPaging({key:filterKey,page:page-1})}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page>=pageCount} onClick={()=>setPaging({key:filterKey,page:page+1})}>Next</button></div>}
 </section>;
}
