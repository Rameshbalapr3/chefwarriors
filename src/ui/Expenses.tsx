import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,HandCoins,Printer,Trash2} from 'lucide-react';
import {dailyPnL,localDate,localMonth,money,monthlyPnL,normalizeExpenses,type Expense,type Order,type Settings} from '../domain/model';
import {expenseBillHtml} from '../domain/receipt';
import {ResponsiveSelect} from './ResponsiveSelect';

const dayLabel=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
const monthLabel=(value:string)=>new Date(`${value}-01T12:00:00`).toLocaleDateString('en-IN',{month:'long',year:'numeric'});
const today=()=>localDate(new Date().toISOString());
const thisMonth=()=>localMonth(new Date().toISOString());
const EXPENSE_WHAT_FOR=['Chicken','Grocery','Vegetable','Sunflower Oil','Palm Oil','Coopus Bread','Burger Bread','Others'] as const;
const OTHER_WHAT_FOR='Others';

type Props={
 orders:Order[];
 expenses:Expense[]|undefined;
 settings:Settings;
 onSave:(expense:Expense)=>Promise<void>;
 onDelete:(id:string)=>Promise<void>;
};

export function Expenses({orders,expenses,settings,onSave,onDelete}:Props){
 const [period,setPeriod]=useState<'day'|'month'>('day');
 const [day,setDay]=useState(today);
 const [month,setMonth]=useState(thisMonth);
 const [whatFor,setWhatFor]=useState('');
 const [whatOpen,setWhatOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const whatRef=useRef<HTMLDivElement>(null);
 const all=normalizeExpenses(expenses);
 const showOther=whatFor===OTHER_WHAT_FOR;
 useEffect(()=>{
  if(!whatOpen)return;
  const onPointer=(event:PointerEvent)=>{if(whatRef.current&&!whatRef.current.contains(event.target as Node))setWhatOpen(false);};
  const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setWhatOpen(false);};
  document.addEventListener('pointerdown',onPointer);
  document.addEventListener('keydown',onKey);
  return ()=>{document.removeEventListener('pointerdown',onPointer);document.removeEventListener('keydown',onKey);};
 },[whatOpen]);
 const listed=useMemo(()=>{
  const rows=period==='day'?all.filter(e=>e.date===day):all.filter(e=>e.date.slice(0,7)===month);
  return rows.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
 },[all,period,day,month]);
 const pnl=period==='day'?dailyPnL(orders,all,day):monthlyPnL(orders,all,month);
 const isToday=day===today();
 const isThisMonth=month===thisMonth();
 const monthOptions=useMemo(()=>{
  const set=new Set<string>([thisMonth(),...all.map(e=>e.date.slice(0,7)),...orders.map(o=>localMonth(o.created))]);
  return [...set].sort((a,b)=>b.localeCompare(a));
 },[all,orders]);
 const rangeLabel=period==='day'?(isToday?'Today':dayLabel(day)):(isThisMonth?'This month':monthLabel(month));
 const expenseHint=listed.length?`${listed.length} entr${listed.length===1?'y':'ies'}`:(period==='day'?'None yet':'No entries');

 async function submit(form:HTMLFormElement){
  if(busy)return;
  const data=new FormData(form);
  const amountRupees=Number(data.get('amount'));
  const picked=String(data.get('whatFor')||'').trim();
  const other=String(data.get('otherCategory')||'').trim();
  const category=picked===OTHER_WHAT_FOR?other:picked;
  if(!picked){setError('Choose what this expense is for.');return;}
  if(picked===OTHER_WHAT_FOR&&!other){setError('Type the other expense name.');return;}
  if(!Number.isFinite(amountRupees)||amountRupees<=0){setError('Enter an amount greater than zero.');return;}
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
   setWhatFor('');
   setWhatOpen(false);
   setDay(expense.date);
   setMonth(expense.date.slice(0,7));
   setPeriod('day');
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

 function printBill(){
  setError('');
  const html=expenseBillHtml({
   settings,
   periodLabel:period==='day'?`Day · ${rangeLabel}`:`Month · ${rangeLabel}`,
   expenses:listed,
   sales:pnl.sales,
   expenseTotal:pnl.expenses,
   net:pnl.net
  });
  const frame=document.createElement('iframe');
  frame.setAttribute('aria-hidden','true');
  frame.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(frame);
  const doc=frame.contentDocument;
  if(!doc){frame.remove();setError('Could not open print preview.');return;}
  doc.open();doc.write(html);doc.close();
  const run=()=>{
   try{frame.contentWindow?.focus();frame.contentWindow?.print();}
   catch{setError('Print dialog could not open.');}
   finally{setTimeout(()=>frame.remove(),800);}
  };
  if(frame.contentDocument?.readyState==='complete')setTimeout(run,50);
  else frame.onload=run;
 }

 return <section className="expenses-pos">
  <header className="expense-hero">
   <div className="expense-hero-top">
    <h1>Expenses</h1>
    <div className="expense-segment" role="group" aria-label="View">
     <button type="button" className={period==='day'?'selected':''} aria-pressed={period==='day'} onClick={()=>setPeriod('day')}>Day</button>
     <button type="button" className={period==='month'?'selected':''} aria-pressed={period==='month'} onClick={()=>setPeriod('month')}>Month</button>
    </div>
    <button type="button" className="expense-print" onClick={printBill}><Printer size={20}/>Print</button>
   </div>
   <div className="expense-controls">
    {period==='day'
     ?<>
      <label className="expense-control">Date<input type="date" value={day} max={today()} onChange={e=>setDay(e.target.value||today())}/></label>
      {!isToday&&<button type="button" className="expense-jump" onClick={()=>setDay(today())}>Today</button>}
     </>
     :<>
      <label className="expense-control">Month<ResponsiveSelect value={month} onChange={setMonth} options={monthOptions.map(value=>({value,label:monthLabel(value)}))}/></label>
      {!isThisMonth&&<button type="button" className="expense-jump" onClick={()=>setMonth(thisMonth())}>This month</button>}
     </>}
    <strong className="expense-showing" aria-live="polite">{rangeLabel}</strong>
   </div>
  </header>

  <div className="expense-summary" aria-label="Totals">
   <article>
    <span>Sales</span>
    <strong>{money(pnl.sales)}</strong>
    <small>{rangeLabel}</small>
   </article>
   <article>
    <span>Expenses</span>
    <strong>{money(pnl.expenses)}</strong>
    <small>{expenseHint}</small>
   </article>
   <article className="expense-profit">
    <span>Profit</span>
    <strong className={pnl.net<0?'expense-net-negative':''}>{money(pnl.net)}</strong>
    <small>Sales − expenses</small>
   </article>
  </div>

  <div className="expense-workspace">
   <section className="panel expense-add">
    <h2>Add expense</h2>
    <form onSubmit={e=>{e.preventDefault();void submit(e.currentTarget);}}>
     <div className="expense-form-grid">
      <div className="expense-span expense-what" ref={whatRef}>
       <span className="expense-what-label" id="expense-what-label">What for?</span>
       <input type="hidden" name="whatFor" value={whatFor} required/>
       <button type="button" className={`expense-what-trigger${whatOpen?' open':''}`} aria-haspopup="listbox" aria-expanded={whatOpen} aria-labelledby="expense-what-label" onClick={()=>setWhatOpen(open=>!open)}>
        <span>{whatFor||'Select item'}</span>
        <ChevronDown size={20}/>
       </button>
       {whatOpen&&<ul className="expense-what-menu" role="listbox" aria-labelledby="expense-what-label">
        {EXPENSE_WHAT_FOR.map(option=><li key={option}>
         <button type="button" role="option" aria-selected={whatFor===option} className={whatFor===option?'selected':''} onClick={()=>{setWhatFor(option);setWhatOpen(false);setError('');}}>{option}</button>
        </li>)}
       </ul>}
      </div>
      {showOther&&<label className="expense-span">Type other<input name="otherCategory" required maxLength={40} placeholder="Type expense name…" autoComplete="off" autoFocus/></label>}
      <label>Amount ₹<input name="amount" type="number" min="0.01" max="1000000" step="0.01" required placeholder="0.00" inputMode="decimal"/></label>
      <label>Date<input name="date" type="date" required defaultValue={today()} max={today()}/></label>
      <label className="expense-span">Note<input name="note" maxLength={200} placeholder="Optional"/></label>
     </div>
     {error&&<p className="error" role="alert">{error}</p>}
     <button className="primary expense-save" disabled={busy} type="submit"><HandCoins size={22}/>{busy?'Saving…':'Save expense'}</button>
    </form>
   </section>

   <section className="panel expense-list">
    <div className="expense-list-head">
     <h2>List</h2>
     <small>{listed.length?`${listed.length} · ${rangeLabel}`:'Empty'}</small>
    </div>
    {listed.length
     ?<div className="expense-table-wrap">
      <table className="expense-table">
       <thead>
        <tr><th scope="col">Date</th><th scope="col">Item</th><th scope="col" className="expense-col-cost">Cost</th><th scope="col" className="expense-col-action"><span className="sr-only">Delete</span></th></tr>
       </thead>
       <tbody>
        {listed.map(row=><tr key={row.id}>
         <td className="expense-card-date">{dayLabel(row.date)}</td>
         <td className="expense-card-item"><b>{row.category}</b>{row.note&&<small>{row.note}</small>}</td>
         <td className="expense-card-cost">{money(row.amount)}</td>
         <td className="expense-col-action"><button type="button" className="expense-delete" aria-label={`Delete ${row.category}`} disabled={busy} onClick={()=>void remove(row.id)}><Trash2 size={20}/></button></td>
        </tr>)}
       </tbody>
      </table>
     </div>
     :<div className="expense-empty-state">
      <HandCoins size={32}/>
      <p>No expenses for {rangeLabel.toLowerCase()}.</p>
      <small>Tap Save expense on the left.</small>
     </div>}
   </section>
  </div>
 </section>;
}
