import {test} from 'node:test';import assert from 'node:assert/strict';import {totals} from './billing.js';
test('integer paise totals and tax after discount',()=>{assert.deepEqual(totals([{id:1,qty:2}],[{id:1,price:12000}],4000,5),{subtotal:24000,discount:4000,tax:1000,total:21000});});
test('discount cannot make an order negative',()=>{assert.equal(totals([{id:1,qty:1}],[{id:1,price:100}],500,5).total,0);});
test('empty order has zero total',()=>{assert.equal(totals([],[],0,5).total,0);});
