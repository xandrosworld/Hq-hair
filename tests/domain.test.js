import test from 'node:test';
import assert from 'node:assert/strict';
import {totals,newOrder} from '../shared.js';
import {seed} from '../seed.js';
test('Finance: gifts excluded, fees separated, pending receipts do not settle debt',()=>{
 const order={items:[{kind:'base',qty:300,price:8},{kind:'base',qty:200,price:10},{kind:'base',qty:100,price:9},{kind:'extra',qty:100,price:9.5},{kind:'gift',qty:1,price:999}],discount:500,shippingFee:120,paymentFee:50,payments:[{amount:3000,confirmed:true},{amount:2000,confirmed:false}]};
 assert.deepEqual(totals(order),{base:5300,extra:950,revenue:5750,receive:5870,total:5920,paid:3000,pending:2000,debt:2870});
});
test('Seed identifiers unique, foreign keys valid, drafts excluded by stage',()=>{
 const s=seed();assert.equal(new Set(s.orders.map(o=>o.id)).size,s.orders.length);
 for(const o of s.orders){assert(s.customers.some(c=>c.id===o.customerId));assert(totals(o).revenue>=0)}
 assert(s.orders.some(o=>o.stage===0));assert(s.orders.some(o=>o.stage===5));
});
test('New orders copy the designated shipping contact independently from the buyer',()=>{
 const customer={id:'HQ-JD-99',name:'Buyer',phone:'111',recipient:'Receiving team',recipientPhone:'222',address:'Warehouse A'};
 const order=newOrder(customer);
 assert.equal(order.recipient,'Receiving team');assert.equal(order.phone,'222');
 customer.address='Warehouse B';assert.equal(order.address,'Warehouse A');
 assert.equal(newOrder({name:'Buyer',phone:'111'}).recipient,'Buyer');
});
