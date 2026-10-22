import {expect,it} from 'vitest';
import {clientItems,clientCategories,importClientCatalog,CATALOG_VERSION} from '../src/domain/catalog';
import {initialState} from '../src/domain/seed';
import {itemSchema,kitchenTicket} from '../src/domain/model';
import {checkout} from '../src/application/engine';
const actor={username:'admin',role:'admin' as const};
it('imports 76 valid entries with unique IDs and all 17 printed categories',()=>{
 expect(clientItems).toHaveLength(76);expect(clientCategories).toHaveLength(17);
 expect(new Set(clientItems.map(i=>i.id)).size).toBe(76);
 clientItems.forEach(i=>{expect(itemSchema.safeParse(i).success).toBe(true);expect(clientCategories).toContain(i.category);});
 const expectedPrices=[60,60,70,80,80,70,100,100,120,140,150,60,90,100,120,50,60,60,60,100,100,120,120,70,100,120,120,150,170,140,60,60,70,90,100,120,130,530,70,90,100,120,140,530,180,200,200,30,50,400,200,420,220,100,160,170,200,200,200,300,200,120,120,170,170,280,400,460,1000,540,200,250,60,60,70,70];
 expect(clientItems.map(i=>i.price/100)).toEqual(expectedPrices);
});
it('imports only once and preserves old sales, invoice sequence and printer/tax configuration',()=>{
 const s=initialState();delete s.catalogVersion;s.settings.counter='Counter device';s.settings.taxRate=5;
 const o=checkout(s,actor,{key:crypto.randomUUID(),lines:[{id:s.items[0].id,qty:1,notes:''}],discount:0,type:'Takeaway',token:'1',payment:'UPI',tendered:0},false);
 const snapshot=JSON.stringify(o),seq=s.sequence;expect(importClientCatalog(s)).toBe(true);expect(JSON.stringify(s.orders[0])).toBe(snapshot);expect(s.sequence).toBe(seq);expect(s.settings.counter).toBe('Counter device');expect(s.settings.taxRate).toBe(5);s.items[0].price=9999;expect(importClientCatalog(s)).toBe(false);expect(s.items[0].price).toBe(9999);expect(s.catalogVersion).toBe(CATALOG_VERSION);
});
it('requires genuine combo options and snapshots distinct rice/noodle variants with contents',()=>{
 const s=initialState(),id='cw-students-combo';const input={key:crypto.randomUUID(),lines:[{id,qty:1,notes:'No chilli'}],discount:0,type:'Takeaway' as const,token:'1',payment:'UPI' as const,tendered:0};
 expect(()=>checkout(s,actor,input,false)).toThrow('Choose all options');
 expect(()=>checkout(s,actor,{...input,lines:[{...input.lines[0],choices:{'Mini rice or noodles':'Not on menu'}}]},false)).toThrow();
 const order=checkout(s,actor,{...input,lines:[{...input.lines[0],choices:{'Mini rice or noodles':'Mini Rice'}},{...input.lines[0],choices:{'Mini rice or noodles':'Mini Noodles'}}]},false);
 expect(order.totals.total).toBe(24000);const ticket=kitchenTicket(order);
 expect(ticket.items[0].notes).toBe('No chilli');expect(ticket.items[1].notes).toBe('No chilli');
 expect(ticket.items[0].contents).toContain('Mini Shawarma');expect(ticket.items[0].contents).toContain('Mini Fried Chicken Rice');
 expect(ticket.items[1].contents).toContain('Mini Fried Chicken Noodles');expect(ticket.items[0].contents).not.toContain('(or)');
 expect(JSON.stringify(ticket)).not.toContain('price');
});
