import {ReceiptText,ChartNoAxesCombined} from 'lucide-react';
import {useEffect,useState} from 'react';
import {money,localDate,type State} from '../domain/model';

export function BillingDashboard({state,navigate}:{state:State;navigate:(page:string)=>void}){
 const [expanded,setExpanded]=useState(()=>window.matchMedia('(min-width:801px) and (min-height:740px)').matches);
 useEffect(()=>{const media=window.matchMedia('(min-width:801px) and (min-height:740px)');const update=()=>setExpanded(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 const today=localDate(new Date().toISOString());
 const paid=state.orders.filter(o=>o.state==='paid'&&localDate(o.created)===today);
 const sales=paid.reduce((sum,o)=>sum+o.totals.total,0);
 return <details className="billing-overview" open={expanded}><summary onClick={event=>{event.preventDefault();setExpanded(value=>!value);}}>Today's overview <span>{money(sales)} · {paid.length} orders</span></summary><div className="billing-dashboard">
  <section className="dashboard-panel"><h2>Today's Summary</h2><div className="dashboard-stats"><div><span className="stat-symbol green">₹</span><small>Total sales</small><strong>{money(sales)}</strong></div><div><ReceiptText className="stat-symbol blue"/><small>Total orders</small><strong>{paid.length}</strong></div><div><ChartNoAxesCombined className="stat-symbol purple"/><small>Avg. order value</small><strong>{money(paid.length?Math.round(sales/paid.length):0)}</strong></div></div></section>
  <section className="dashboard-panel"><div className="dashboard-title"><h2>Recent Orders</h2><button onClick={()=>navigate('Orders')}>View all</button></div><table><thead><tr><th>Bill no.</th><th>Time</th><th>Amount</th><th>Payment</th></tr></thead><tbody>{state.orders.slice(0,3).map(o=><tr key={o.id}><td>{o.reference}{o.state==='cancelled'?' · Cancelled':''}</td><td>{new Date(o.created).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td><td>{money(o.totals.total)}</td><td>{o.payment}</td></tr>)}</tbody></table>{!state.orders.length&&<p>No saved orders yet.</p>}</section>
 </div></details>;
}
