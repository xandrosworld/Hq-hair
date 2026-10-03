import test from 'node:test';
import assert from 'node:assert/strict';
import {orderAttention} from '../order-attention.js';
import {financialSummary} from '../reporting.js';

test('Attention routes every handoff to its department and excludes closed and other owners',()=>{
 const orders=[2,3,4,5,6,7,8,9,10].map(stage=>({id:String(stage),stage,ownerId:'a'}));
 orders.push({id:'shipped',stage:8,contentLockedAt:'2026-10-03',ownerId:'a'},{id:'other',stage:5,ownerId:'b'},{id:'cancelled',stage:5,cancelledAt:'2026-10-03',ownerId:'a'});
 const ids=user=>orderAttention(orders,user).map(x=>x.order.id);
 assert.deepEqual(ids({role:'sale',id:'a'}),['5','8','9','shipped']);
 assert.deepEqual(ids({role:'accounting'}),['2','6','7']);
 assert.deepEqual(ids({role:'factory'}),['3','4']);
 assert.equal(orderAttention(orders,{role:'sale',id:'a'}).at(-1).queue.key,'delivery');
 assert.ok(ids({role:'sales_lead'}).includes('other'));
 assert.equal(ids({role:'manager'}).length,10);
});
test('Debt customer count deduplicates buyers and excludes paid orders and drafts',()=>{
 const order=(id,customerId,extra={})=>({id,orderCode:id,approvedAt:'2026-01-01',stage:3,customerId,items:[{kind:'base',qty:1,price:100}],payments:[],...extra});
 const rows=[order('1','a'),order('2','a'),order('3','b'),order('4','c',{payments:[{amount:100,confirmed:true}]}),order('5','d',{stage:0})];
 assert.equal(financialSummary(rows).debtCustomers,2);
 assert.equal(financialSummary([]).debtCustomers,0);
});
