import type {State} from './model';
import {clientItems,clientCategories,CATALOG_VERSION,SHOP} from './catalog';
export const seedItems=clientItems;
export const initialState=():State=>({version:1,catalogVersion:CATALOG_VERSION,items:structuredClone(clientItems),categories:[...clientCategories],orders:[],jobs:[],settings:{...SHOP,taxRate:0,rounding:'paise',width:'80',counter:'',kitchen:'',sharedPrinter:false},sequence:1000,audit:[]});
