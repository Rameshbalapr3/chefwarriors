import type {Item,State} from './model';

export const CATALOG_VERSION='chef-warriors-menu-2026-10';
export const SHOP={shop:'The Chef Warriors',address:'Alagar Kovil Road, Melur-625106',phone:'8754090104'};
export const TAGLINE='The chef is always Right…';
const rice={name:'Rice or noodles',values:['Rice','Noodles']};
const miniRice={name:'Mini rice or noodles',values:['Mini Rice','Mini Noodles']};
const grill={name:'Grill or BBQ',values:['Grill','BBQ']};
const vegRice={name:'Veg rice or noodles',values:['Veg Rice','Veg Noodles']};
type Row=[name:string,rupees:number,description?:string,options?:Item['options']];
const groups:{category:string;image:number;rows:Row[]}[]=[
 {category:'Fried Chicken',image:0,rows:[
  ['Fried Chicken Wings (1 Pc)',60],['Fried Chicken Popcorn (5 Pcs)',60],['Fried Chicken Lollipop (2 Pcs)',70],['Fried Chicken Boneless (3 Pcs)',80],['Fried Chicken Leg Piece (1 Pc)',80]]},
 {category:'Shawarma',image:1,rows:[
  ['Mini Fried Chicken Shawarma',70],['Fried Chicken Shawarma',100],['Fried Chicken Cone Shawarma',100],['Fried Chicken & Cheese Shawarma',120],['Fried Chicken Plate Shawarma',140],['Fried Chicken & Cheese Plate Shawarma',150]]},
 {category:'Bread Omelette',image:2,rows:[
  ['Classic Bread Omelette',60],['Fried Chicken Bread Omelette',90],['Peri Peri Fried Chicken Bread Omelette',100],['Fried Chicken & Cheese Bread Omelette',120]]},
 {category:'Sandwich',image:3,rows:[
  ['Veg Sandwich',50],['Chocolate Sandwich',60],['Omelette Sandwich',60],['Mini Fried Chicken Sandwich',60],['Fried Chicken Sandwich',100],['Peri Peri Fried Chicken Sandwich',100],['Fried Chicken & Cheese Sandwich',120],['Omelette & Fried Chicken Sandwich',120]]},
 {category:'Burger',image:3,rows:[
  ['Mini Fried Chicken Burger',70],['Fried Chicken Burger',100],['Fried Chicken & Cheese Burger',120],['Zinger Tandoori Fried Chicken Burger',120],['Spl Jumbo Burger',150]]},
 {category:'Pizza',image:4,rows:[['Fried Chicken Pizza',170],['Fully Loaded Fried Chicken',140]]},
 {category:'French Fries',image:5,rows:[['Peri Peri French Fries',60],['Lays Chicken',60]]},
 {category:'Fried Rice',image:5,rows:[
  ['Mini Fried Chicken Rice',70],['Veg Fried Rice',90],['Egg Fried Rice',100],['Fried Chicken Rice',120],['Schezwan Fried Chicken Rice',130],['Bucket Fried Chicken Rice',530]]},
 {category:'Noodles',image:5,rows:[
  ['Mini Fried Chicken Noodles',70],['Veg Fried Noodles',90],['Egg Fried Noodles',100],['Fried Chicken Noodles',120],['Schezwan Fried Chicken Noodles',140],['Bucket Fried Chicken Noodles',530]]},
 {category:'Gravy',image:5,rows:[['Pepper Chicken Gravy',180],['Butter Chicken Gravy',200],['Chilli Chicken Gravy',200]]},
 {category:'Naan',image:5,rows:[['Plain Naan',30],['Butter Naan',50]]},
 {category:'Grill / BBQ',image:5,rows:[
  ['Full Grill (or) BBQ',400,'Full portion',[grill]],['Half Grill (or) BBQ',200,'Half portion',[grill]],['Pepper BBQ Full',420],['Pepper BBQ Half',220]]},
 {category:'Buckets',image:6,rows:[
  ['Popcorn Bucket',100,'Fried Chicken Popcorn (10 Pcs)'],
  ['Boneless Bucket',160,'Fried Chicken Boneless (7 Pcs)'],
  ['Lollipop Bucket',170,'Fried Chicken Lollipop (6 Pcs)'],
  ['Wings Bucket',200,'Fried Chicken Wings (4 Pcs)'],
  ['Leg Piece Bucket',200,'Fried Chicken Leg Piece (3 Pcs)'],
  ['Small Bucket',200,'Fried Chicken Popcorn (10 Pcs) + Fried Chicken Boneless (5 Pcs)'],
  ['Large Bucket',300,'Fried Chicken Leg Piece (2 Pcs) + Fried Chicken Wings (2 Pcs) + Fried Chicken Lollipop (2 Pcs)']]},
 {category:'Naan Combo',image:5,rows:[['Butter Naan & Pepper Chicken Gravy Combo',200,'Butter Naan (1 set) + Pepper Chicken Gravy']]},
 {category:'Combos',image:5,rows:[
  ['Students Combo',120,'Mini Shawarma + Mini Fried Chicken Rice (or) Noodles',[miniRice]],
  ['Kids Combo',120,'Fried Chicken Popcorn (5 Pcs) + Mini Fried Chicken Rice (or) Noodles',[miniRice]],
  ["90’s Combo",170,'Fried Chicken Sandwich + Fried Chicken Rice (or) Noodles',[rice]],
  ['2k Combo',170,'Fried Chicken Burger + Fried Chicken Shawarma'],
  ['Quick Combo',280,'Fried Chicken Burger + Fried Chicken Shawarma + Fried Chicken Rice (or) Noodles',[rice]],
  ['Cheese Combo',400,'Fried Chicken & Cheese Bread Omelette + Fried Chicken & Cheese Burger + Fried Chicken & Cheese Sandwich + Fried Chicken & Cheese Shawarma'],
  ['Warrier Combo',460,'Fried Chicken Bread Omelette + Fried Chicken Burger + Fried Chicken Sandwich + Fried Chicken Shawarma + Fried Chicken Rice (or) Noodles',[rice]]]},
 {category:'Birthday Combos',image:5,rows:[
  ['Birthday Combo — Top Load',1000,'Full Grill (or) BBQ (1) + Fried Chicken Shawarma (2) + Fried Chicken Burger (2) + Fried Chicken Sandwich (2) + Rice (or) Noodles (2)',[grill,{name:'First rice/noodles',values:['Rice','Noodles']},{name:'Second rice/noodles',values:['Rice','Noodles']}]],
  ['Birthday Combo — Medium Load',540,'Half Grill (or) BBQ (1) + Fried Chicken Shawarma (1) + Fried Chicken Burger (1) + Fried Chicken Sandwich (1) + Rice (or) Noodles (1)',[grill,rice]],
  ['Birthday Combo — Low Load',200,'Quarter Grill (or) BBQ (1) + Mini Rice (or) Noodles (1) + Mini Shawarma (or) Burger (1)',[grill,miniRice,{name:'Mini main',values:['Mini Shawarma','Mini Burger']}]],
  ['Birthday Combo — Veg Load',250,'Mojito (1) + Veg Sandwich (1) + Veg Rice (or) Noodles (1) + French Fries (1)',[vegRice]]]},
 {category:'Final Touch',image:5,rows:[['Virgin Mojito',60],['Green Apple Mojito',60],['Blue Curracao Mojito',70],['Mint Flavour Mojito',70]]}
];
export const clientCategories=groups.map(g=>g.category);
export const clientItems:Item[]=groups.flatMap(g=>g.rows.map(([name,rupees,description,options])=>({id:'cw-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,''),name,category:g.category,price:rupees*100,available:true,image:g.image,description:description||'',options:options||[]})));
/** Does not touch accounts, historic snapshots, payments, invoices or printer settings. */
export function importClientCatalog(state:State):boolean{
 if(state.catalogVersion===CATALOG_VERSION)return false;
 state.items=structuredClone(clientItems);state.categories=[...clientCategories];state.settings={...state.settings,...SHOP};state.catalogVersion=CATALOG_VERSION;
 state.audit.push({at:new Date().toISOString(),actor:'system',action:'client-menu-import',record:CATALOG_VERSION,reason:'Replaced sample menu with 76 entries transcribed from four client menu cards; historic orders retained.'});
 return true;
}
