import {it,expect} from 'vitest';
import {mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {Store} from '../desktop/database/store';
import {checkout} from '../src/application/engine';
it('backs up and migrates existing installed data without losing credentials or sale snapshots',()=>{
 const dir=mkdtempSync(join(tmpdir(),'cw-menu-upgrade-'));let store:Store|undefined;
 try{
  store=new Store(join(dir,'restaurant.sqlite'));store.addUser('manager','long-unique-password','admin');
  store.transaction(s=>{delete s.catalogVersion;s.items=[{id:'1',name:'Old sample burger',category:'Burgers',price:12300,available:true,image:0}];s.categories=['Burgers'];s.settings.shop='FastFood POS';s.settings.counter='Existing counter';checkout(s,{username:'manager',role:'admin'},{key:crypto.randomUUID(),lines:[{id:'1',qty:1,notes:''}],discount:0,type:'Takeaway',token:'1',payment:'Cash',tendered:12300},false);});
  const before=JSON.stringify(store.read().orders);store.close();store=new Store(join(dir,'restaurant.sqlite'));
  expect(store.read().items).toHaveLength(76);expect(store.read().settings.shop).toBe('The Chef Warriors');expect(store.read().settings.counter).toBe('Existing counter');expect(JSON.stringify(store.read().orders)).toBe(before);expect(store.login('manager','long-unique-password').role).toBe('admin');
  const files=readdirSync(join(dir,'backups'));expect(files).toHaveLength(1);const backup=new DatabaseSync(join(dir,'backups',files[0]),{readOnly:true});try{const metadata=JSON.parse(String(backup.prepare('SELECT payload FROM metadata').get()!.payload));expect(metadata.items[0].name).toBe('Old sample burger');}finally{backup.close();}
  store.transaction(s=>{s.items[0].price=7000;});store.close();store=new Store(join(dir,'restaurant.sqlite'));expect(store.read().items[0].price).toBe(7000);expect(readdirSync(join(dir,'backups'))).toHaveLength(1);
 }finally{store?.close();rmSync(dir,{recursive:true,force:true});}
});
