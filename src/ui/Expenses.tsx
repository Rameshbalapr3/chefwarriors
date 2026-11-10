import {useMemo,useState} from 'react';
import {HandCoins,Trash2} from 'lucide-react';
import {localDate,localMonth,money,monthlyPnL,normalizeExpenses,type Expense,type Order} from '../domain/model';

const monthLabel=(value:string)=>new Date(`${value}-01T12:00:00`).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
const dayLabel=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
const thisMonth=()=>localMonth(new Date().toISOString());
const today=()=>localDate(new Date().toISOString());

type Props={
 orders:Order[];
 expenses:Expense[]|undefined;
 onSave:(expense:Expense)=>Promise<void>;
 onDelete:(id:string)=>Promise<void>;
};

export function Expenses({orders,expenses,onSave,onDelete}:Props){
 const [month,setMonth]=useState(thisMonth);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const all=normalizeExpenses(expenses);
 const monthExpenses=useMemo(()=>all.filter(e=>e.date.slice(0,7)===month).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id)),[all,month]);
 const pnl=monthlyPnL(orders,all,month);
 const monthOptions=useMemo(()=>{
  const set=new Set<string>([thisMonth(),...all.map(e=>e.date.slice(0,7)),...orders.map(o=>localMonth(o.created))]);
  return [...set].sort((a,b)=>b.localeCompare(a));
 },[all,orders]);

 async function submit(form:HTMLFormElement){
  if(busy)return;
  const data=new FormData(form);
  const amountRupees=Number(data.get('amount'));
  const category=String(data.get('category')||'').trim();
  if(!category){setError('Enter a category name for this expense.');return;}
  if(!Number.isFinite(amountRupees)||amountRupees<=0){setError('Enter an expense amount greater than zero.');return;}
  const expense:Expense={
   id:crypto.randomUUID(),
   date:String(data.get('date')||today()),
   amount:Math.round(amountRupees*100),
   category,
   note:String(data.get('note')||'').trim()||undefined
  };
  setBusy(true);setError('');
  try{
   await onSave(expense);
   form.reset();
   const dateInput=form.elements.namedItem('date');
   if(dateInput instanceof HTMLInputElement)dateInput.value=today();
   setMonth(expense.date.slice(0,7));
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setBusy(false);}
 }

 async function remove(id:string){
  if(busy)return;
  setBusy(true);setError('');
  try{await onDelete(id);}
  catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setBusy(false);}
 }

 return <section className="expenses-page sales-reports">
  <div className="page-title"><div><h1>Expenses</h1><p>Enter shop expenses for the selected calendar month. Net = sales − expenses. A new month starts at ₹0.</p></div></div>

  <div className="panel sales-period"><label>Month<select value={month} onChange={e=>setMonth(e.target.value)} aria-label="Expense month">{monthOptions.map(value=><option key={value} value={value}>{monthLabel(value)}{value===thisMonth()?' · this month':''}</option>)}</select></label><span role="status">{month===thisMonth()?'Current month totals reset automatically next month.':'Browsing a past month. Totals stay saved for history.'}</span></div>

  <div className="sales-metrics expenses-metrics"><div><small>Sales this month</small><strong>{money(pnl.sales)}</strong><span>Paid orders only</span></div><div><small>Expenses this month</small><strong>{money(pnl.expenses)}</strong><span>{monthExpenses.length} entries</span></div><div><small>Net (sales − expenses)</small><strong className={pnl.net<0?'expense-net-negative':''}>{money(pnl.net)}</strong><span>{monthLabel(month)}</span></div></div>

  <div className="sales-panels expenses-layout">
   <section className="panel sales-panel"><h2>Add expense</h2><p>Amounts are in rupees. Type any category name that fits your shop. Only administrators can add or remove expenses.</p>
    <form className="expense-form" onSubmit={e=>{e.preventDefault();void submit(e.currentTarget);}}>
     <label>Date<input name="date" type="date" required defaultValue={today()} max={today()}/></label>
     <label>Category<input name="category" required maxLength={40} placeholder="e.g. Gas, chicken stock, electricity…"/></label>
     <label>Amount ₹<input name="amount" type="number" min="0.01" max="1000000" step="0.01" required placeholder="0.00"/></label>
     <label>Note (optional)<input name="note" maxLength={200} placeholder="Supplier, bill number…"/></label>
     <button className="primary" disabled={busy} type="submit"><HandCoins size={18}/>Save expense</button>
    </form>
    {error&&<p className="error" role="alert">{error}</p>}
   </section>

   <section className="panel sales-panel"><h2>Expenses in {monthLabel(month)}</h2><p>Only rows dated in this month count toward the totals above.</p>
    <div className="sales-table-scroll"><table><thead><tr><th scope="col">Date</th><th scope="col">Category</th><th scope="col">Note</th><th scope="col" className="sales-numeric">Amount</th><th scope="col"> </th></tr></thead><tbody>
     {monthExpenses.map(row=><tr key={row.id}><td>{dayLabel(row.date)}</td><td>{row.category}</td><td>{row.note||'—'}</td><td className="sales-numeric">{money(row.amount)}</td><td><button type="button" aria-label={`Delete expense ${row.category} ${money(row.amount)}`} disabled={busy} onClick={()=>void remove(row.id)}><Trash2 size={16}/></button></td></tr>)}
    </tbody></table>{!monthExpenses.length&&<div className="sales-empty panel expense-empty"><HandCoins/><div><h2>No expenses this month</h2><p>Add costs above. Sales and net start at {money(0)} until orders or expenses are recorded.</p></div></div>}</div>
   </section>
  </div>
 </section>;
}
