import {Fragment,useState} from 'react';
import {Download,ReceiptText,Search} from 'lucide-react';
import {csvCell,localDate,money,type Job,type Order} from '../domain/model';

type Props={orders:Order[];jobs:Job[];admin:boolean;query:string;setQuery:(value:string)=>void;view:(order:Order)=>void;cancel:(order:Order)=>void};
const printLabels:Record<Job['state'],string>={queued:'Queued',submitting:'Sending',submitted:'Submitted',failed:'Failed',unknown:'Check printer',preview:'Demo preview'};
const orderDate=(value:string)=>new Date(value).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});

export function OrderHistory({orders,jobs,admin,query,setQuery,view,cancel}:Props){
 const [from,setFrom]=useState(''),[to,setTo]=useState(''),[status,setStatus]=useState('all'),[payment,setPayment]=useState('all'),[type,setType]=useState('all'),[sort,setSort]=useState('newest'),[expanded,setExpanded]=useState<string|null>(null);
 const [paging,setPaging]=useState({key:'',page:1});
 const invalidRange=!!from&&!!to&&from>to;
 const filterKey=JSON.stringify([query,from,to,status,payment,type,sort]);
 const filtered=orders.filter(o=>{
  const day=localDate(o.created),text=query.trim().toLowerCase();
  return !invalidRange&&(!text||o.reference.toLowerCase().includes(text)||o.token.toLowerCase().includes(text)||String(o.dailyToken||'').includes(text))&&(!from||day>=from)&&(!to||day<=to)&&(status==='all'||o.state===status)&&(payment==='all'||o.payment===payment)&&(type==='all'||o.type===type);
 }).sort((a,b)=>sort==='oldest'?a.created.localeCompare(b.created):sort==='total-high'?b.totals.total-a.totals.total:b.created.localeCompare(a.created));
 const pageCount=Math.max(1,Math.ceil(filtered.length/20));
 const page=paging.key===filterKey?Math.min(paging.page,pageCount):1;
 const shown=filtered.slice((page-1)*20,page*20);
 const paid=filtered.filter(o=>o.state==='paid'),cancelled=filtered.filter(o=>o.state==='cancelled');
 const total=paid.reduce((sum,o)=>sum+o.totals.total,0);
 const latestJobs=new Map<string,Job[]>();
 for(const job of jobs){if(job.kind!=='counter')continue;const list=latestJobs.get(job.orderId)||[];list.push(job);latestJobs.set(job.orderId,list);}
 function clear(){setQuery('');setFrom('');setTo('');setStatus('all');setPayment('all');setType('all');setSort('newest');}
 function preset(kind:'today'|'week'|'all'){
  if(kind==='all'){setFrom('');setTo('');return;}
  const now=new Date();setTo(localDate(now.toISOString()));
  if(kind==='week')now.setDate(now.getDate()-6);
  setFrom(localDate(now.toISOString()));
 }
 function exportOrders(){
  const rows=[['Invoice','Date and time','Order type','Table or token','Daily token','Payment','Status','Total INR','Cancellation reason'],...filtered.map(o=>[o.reference,orderDate(o.created),o.type,o.token,o.dailyToken??'',o.payment,o.state,(o.totals.total/100).toFixed(2),o.reason||''])];
  const blob=new Blob(['\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`orders-${localDate(new Date().toISOString())}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <section className="order-history">
  <div className="page-title"><div><h1>Order history</h1><p>Find a bill, review its items and check printing.</p></div>{admin&&<button disabled={!filtered.length} onClick={exportOrders}><Download size={18}/>Export filtered orders</button>}</div>
  <div className="history-summary" aria-label="Summary of filtered orders"><div><small>Orders found</small><strong>{filtered.length}</strong></div><div><small>Paid total · {paid.length} orders</small><strong>{money(total)}</strong></div><div><small>Cancelled orders</small><strong>{cancelled.length}</strong></div></div>
  <div className="history-filters panel">
   <label className="history-search">Invoice or table / token<input type="search" placeholder="Search CW-1001 or token…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <label>From<input type="date" value={from} max={to||undefined} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} min={from||undefined} onChange={e=>setTo(e.target.value)}/></label>
   <label>Status<select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select></label>
   <label>Payment<select value={payment} onChange={e=>setPayment(e.target.value)}><option value="all">All payments</option>{['Cash','UPI','Card'].map(p=><option key={p}>{p}</option>)}</select></label>
   <label>Order type<select value={type} onChange={e=>setType(e.target.value)}><option value="all">All types</option><option>Takeaway</option><option>Dine-in</option></select></label>
   <div className="history-date-shortcuts"><button onClick={()=>preset('today')}>Today</button><button onClick={()=>preset('week')}>Last 7 days</button><button onClick={()=>preset('all')}>All dates</button><button onClick={clear}>Clear filters</button></div>
   {invalidRange&&<p className="error" role="alert">The end date must be on or after the start date.</p>}
  </div>
  <div className="history-results-bar"><span role="status">{filtered.length?`${(page-1)*20+1}–${Math.min(page*20,filtered.length)} of ${filtered.length} orders`:'0 orders'} · totals reflect all matching orders</span><label>Sort<select value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="total-high">Highest total</option></select></label></div>
  <div className="panel table-wrap history-table"><table><thead><tr><th scope="col">Invoice / time</th><th scope="col">Order</th><th scope="col">Payment</th><th scope="col" className="history-amount">Total</th><th scope="col">Status</th><th scope="col">Printing</th><th scope="col">Actions</th></tr></thead><tbody>{shown.map(o=><Fragment key={o.id}><tr><td><b>{o.reference}</b><small>{orderDate(o.created)}</small></td><td>{o.type}<small>{o.type==='Dine-in'?'Table':'Token'} {o.token}{o.dailyToken?` · Daily ${o.dailyToken}`:''}</small></td><td>{o.payment}</td><td className="history-amount"><strong>{money(o.totals.total)}</strong></td><td><span className={`badge ${o.state==='paid'?'good':'bad'}`}>{o.state}</span></td><td><div className="history-print-jobs">{(()=>{const billJobs=latestJobs.get(o.id)||[];const job=billJobs.slice(-1)[0];const attention=billJobs.some(j=>['failed','unknown'].includes(j.state));return <button className={attention?'history-print-alert':''} onClick={()=>view(o)} aria-label={`${o.reference} bill: ${job?printLabels[job.state]:'No job'}`}><span>Bill ×{Math.max(billJobs.length,1)}</span><b>{job?printLabels[job.state]:'No job'}</b></button>;})()}</div></td><td><div className="row-actions"><button aria-expanded={expanded===o.id} aria-controls={`order-details-${o.id}`} onClick={()=>setExpanded(expanded===o.id?null:o.id)}>Details</button><button onClick={()=>view(o)}>Bill</button>{admin&&o.state==='paid'&&<button className="danger" onClick={()=>cancel(o)}>Cancel</button>}</div></td></tr>{expanded===o.id&&<tr className="history-detail-row" id={`order-details-${o.id}`}><td colSpan={7}><div className="history-order-details"><div><h2>Items · {o.reference}</h2>{o.lines.map((line,index)=><div className="history-detail-item" key={index}><div><b>{line.qty} × {line.name}</b><small>{money(line.price)} each</small>{line.notes&&<p>{line.notes}</p>}</div><strong>{money(line.price*line.qty)}</strong></div>)}</div><div className="history-totals">{[['Subtotal',o.totals.subtotal],['Discount',-o.totals.discount],['Tax',o.totals.tax],['Rounding',o.totals.rounding],['Total',o.totals.total]].map(([label,amount])=><div key={label}><span>{label}</span><strong>{money(Number(amount))}</strong></div>)}{o.payment==='Cash'&&<><div><span>Cash received</span><strong>{money(o.tendered)}</strong></div><div><span>Change</span><strong>{money(o.change)}</strong></div></>}{o.reason&&<p className="history-cancellation"><b>Cancellation reason</b><br/>{o.reason}</p>}</div></div></td></tr>}</Fragment>)}</tbody></table>{!filtered.length&&<div className="empty">{orders.length?<Search/>:<ReceiptText/>}<h3>{orders.length?'No matching orders':'No orders yet'}</h3><p>{orders.length?'Try different filters or clear your search.':'Saved bills will appear here.'}</p>{orders.length>0&&<button onClick={clear}>Clear filters</button>}</div>}</div>
  <div className="history-pagination"><small>Submitted means accepted by the print system, not confirmed paper output.</small><div><button disabled={page<=1} onClick={()=>setPaging({key:filterKey,page:page-1})}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page>=pageCount} onClick={()=>setPaging({key:filterKey,page:page+1})}>Next</button></div></div>
 </section>;
}
