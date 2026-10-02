import test from 'node:test';
import assert from 'node:assert/strict';
import {buyerStatistics,customerActivity} from '../customer-statistics.js';
import {approvalDate} from '../order-identity.js';
const order=(id,customerId,approvedAt)=>({id,orderCode:id,customerId,approvedAt,date:'2025-12-01',stage:3});
test('customer example: Jan first purchase, Feb repeat, March absent, April return',()=>{
 const customers=[{id:'a',created:'2026-01-01'}],orders=[order('1','a','2026-01-04'),order('2','a','2026-02-02'),order('3','a','2026-02-09'),order('4','a','2026-04-02')];
 const stats=month=>buyerStatistics(customers,orders,'2026-04-30',month);
 assert.equal(stats('2026-01').newCustomers,1);assert.equal(stats('2026-01').repeat,0);
 assert.equal(stats('2026-02').repeat,1);assert.equal(stats('2026-03').repeat,0);assert.equal(stats('2026-04').repeat,1);
 assert.equal(stats('2026-03').total,1);assert.equal(stats('2026-03').newCustomers,0);
 assert.deepEqual(customerActivity(orders,2026,customers,'2026-04-30').slice(0,4).map(m=>m.returning),[0,1,0,1]);
});
test('new profiles need approval; two first purchases same month qualify for both new and returning',()=>{
 const customers=[{id:'a',created:'2026-02-01'},{id:'b',created:'2026-02-01'},{id:'c',created:'2026-01-01'}];
 const orders=[order('1','a','2026-02-04'),order('2','a','2026-02-05'),order('3','c','2026-02-06'),{...order('4','b','2026-02-07'),stage:2,orderCode:null}];
 const stats=buyerStatistics(customers,orders,'2026-02-28');
 assert.deepEqual(stats,{total:2,newCustomers:1,repeat:1,rate:50,growth:null});
 assert.equal(buyerStatistics(customers,orders,'2026-02-03').total,0);
 assert.equal(buyerStatistics(customers,orders,'2026-02-04').repeat,0);
 assert.equal(buyerStatistics(customers,orders,'2026-02-05').repeat,1);
 assert.equal(buyerStatistics(customers,orders,'2026-02-28','2026-01').newCustomers,0);
});
test('approval month uses Vietnam time and first approval even after balance confirmation',()=>{
 const o={...order('1','a',undefined),accountingApproval:{time:'2026-04-03T03:00:00Z'},history:[{title:'Kế toán duyệt',time:'2026-01-31T17:05:00Z'},{title:'Kế toán duyệt',time:'2026-04-03T03:00:00Z'}]};
 assert.equal(approvalDate(o),'2026-02-01');
 assert.equal(approvalDate({...o,approvedAt:'2026-01-30T02:00:00Z'}),'2026-01-30');
 assert.equal(approvalDate({...o,history:[{title:'Kế toán duyệt',time:'2026-02-01T00:05:00'}]}),'2026-02-01');
 const stats=month=>buyerStatistics([{id:'a',created:'2026-01-01'}],[order('0','a','2026-01-01'),o],'2026-04-30',month);
 assert.equal(stats('2026-02').repeat,1);assert.equal(stats('2026-04').repeat,0);
});
test('future, cancelled, unauthorized and unapproved purchases never change historical month totals',()=>{
 const customers=[{id:'a',created:'2026-01-01'}];
 const orders=[order('1','a','2026-01-01'),order('2','a','2026-02-01'),order('3','other','2026-01-01'),{...order('4','a','2026-01-02'),cancelledAt:'now'}, {...order('5','a','2026-01-02'),stage:2,orderCode:null}];
 const stats=buyerStatistics(customers,orders,'2026-02-02','2026-01');
 assert.equal(stats.total,1);assert.equal(stats.repeat,0);
 assert.equal(buyerStatistics(customers,orders,'2026-02-02','2026-03').total,0);
});
