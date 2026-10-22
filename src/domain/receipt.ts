import {money,kitchenTicket,servedContents,type Order} from './model';
export const escapeHtml=(s:unknown)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function billWhen(iso:string){
 const d=new Date(iso);
 const date=d.toLocaleDateString('en-GB');
 const time=d.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}).toUpperCase();
 return {date,time};
}
function billAddress(address:string){return address.replace(/-(\d{3,})/g,' - $1');}
function wrapItemName(name:string){
 const e=escapeHtml,words=name.trim().split(/\s+/);
 return words.length>=3?`${e(words.slice(0,2).join(' '))}<br>${e(words.slice(2).join(' '))}`:e(name);
}
function documentHtml(order:Order,css:string,inner:string){
 return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>@page{size:${order.settings.width}mm auto;margin:3mm}${css}</style></head><body>${inner}</body></html>`;
}
export function receiptHtml(order:Order,kind:'counter'|'kitchen',copy=false){
 const e=escapeHtml;
 if(kind==='kitchen'){
  const ticket=kitchenTicket(order);
  const body=`<h2>KITCHEN ORDER</h2><p>${e(ticket.type)} · ${e(ticket.token)}</p>${ticket.items.map(l=>`<p><b>${l.qty} × ${e(l.name)}</b><br>${e(l.contents)}<br>${e(l.notes)}</p>`).join('')}`;
  const css=`body{font:12px monospace;color:#000;background:white;width:${Number(order.settings.width)-8}mm;margin:0 auto;overflow-wrap:anywhere}h2{text-align:center;font-size:17px}header{text-align:center;border-bottom:1px dashed;padding:10px 0}footer{text-align:center}`;
  return documentHtml(order,css,`<header>${copy?'<b>REPRINT COPY — CHECK BEFORE PREPARING</b><br>':''}${order.state==='cancelled'?'<b>CANCELLED</b><br>':''}<b>${e(order.reference)}</b><br>${e(new Date(order.created).toLocaleString('en-IN'))}</header>${body}<footer>— ${e(order.reference)} —</footer>`);
 }
 const shop=e(order.settings.shop.toUpperCase());
 const width=Number(order.settings.width)-8;
 const when=billWhen(order.created);
 const items=order.lines.map(l=>{const served=servedContents(l),extra=[...served.contents,served.note].filter(Boolean).map(text=>`<br><small>${e(text)}</small>`).join('');return `<tr><td class="item">${wrapItemName(l.name)}${extra}</td><td class="qty">${l.qty}</td><td class="num">${money(l.price)}</td><td class="num">${money(l.price*l.qty)}</td></tr>`;}).join('');
 const extra=([
  order.totals.discount?['Discount',-order.totals.discount] as const:null,
  order.totals.tax?[`Tax (${order.settings.taxRate}%)`,order.totals.tax] as const:null,
  order.totals.rounding?['Rounding',order.totals.rounding] as const:null
 ].filter(Boolean) as [string,number][]).map(([label,amount])=>`<p class="row"><span>${label}</span><b>${money(amount)}</b></p>`).join('');
 const change=order.change>0?`<p class="thanks">Change ${money(order.change)}</p>`:'';
 const flags=`${copy?'<p class="banner"><b>REPRINT COPY — CHECK BEFORE PREPARING</b></p>':''}${order.state==='cancelled'?'<p class="banner"><b>CANCELLED</b></p>':''}`;
 const css=`body{font:12px monospace;color:#000;background:#fff;width:${width}mm;margin:0 auto;overflow-wrap:anywhere}h1{font:bold 17px monospace;text-align:center;text-transform:uppercase;margin:4px 0 8px}.meta,.order,.thanks,footer{text-align:center}.meta{margin:0;font-size:12px;line-height:1.4}.when{display:flex;justify-content:center;gap:16px;margin:0;font-size:12px}.order{margin:10px 0 4px;font-weight:700;font-size:12px}hr{border:none;border-top:1px dashed #111;margin:8px 0}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}th{text-align:left;padding:0 2px 8px;font-size:11px;border-bottom:1px dashed #111}th.qty,td.qty{text-align:center;white-space:nowrap;width:12%;vertical-align:bottom}th.num,td.num{text-align:right;white-space:nowrap;width:20%;vertical-align:bottom}td{padding:8px 2px;vertical-align:top;border:none}.item{width:48%;padding-right:4px}.item small{display:block;font-size:10px}.row{display:flex;justify-content:space-between;gap:8px;margin:2px 0}.total{display:flex;justify-content:space-between;align-items:baseline;font-weight:700;font-size:17px;margin:4px 0}.thanks{margin:10px 0 4px}.banner{text-align:center;margin:0 0 8px;font-size:11px}footer{margin:2px 0 0}`;
 return documentHtml(order,css,`${flags}<h1>${shop}</h1><p class="meta">${e(billAddress(order.settings.address))}<br>${e(order.settings.phone)}</p><hr><p class="order">ORDER NO : ${e(order.reference)}</p><p class="when"><span>${e(when.date)}</span><span>${e(when.time)}</span></p><hr><table><thead><tr><th>ITEM</th><th class="qty">QTY</th><th class="num">RATE</th><th class="num">TOTAL</th></tr></thead><tbody>${items}</tbody></table><hr><p class="row"><span>SUBTOTAL</span><b>${money(order.totals.subtotal)}</b></p>${extra}<hr><p class="total"><span>TOTAL</span><b>${money(order.totals.total)}</b></p><hr>${change}<p class="thanks">Thank you. Visit us again!</p><footer>— ${shop} —</footer>`);
}
