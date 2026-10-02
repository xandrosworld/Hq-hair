import test from 'node:test';
import assert from 'node:assert/strict';
import {buyerStatistics,customerGroupSeries,compareOpenOrders,openStages} from '../list-statistics.js';
test('buyers deduplicate orders, exclude drafts, future dates and other owners; repeat rate is defined',()=>{
 const customers=[{id:'a',created:'2026-08-01'},{id:'b',created:'2026-09-01'},{id:'c',created:'2026-09-03'}],orders=[{orderCode:'a-1',customerId:'a',stage:3,date:'2026-08-01',approvedAt:'2026-08-01'},{orderCode:'a-2',customerId:'a',stage:10,date:'2026-09-01',approvedAt:'2026-09-01'},{orderCode:'b-1',customerId:'b',stage:9,date:'2026-09-02',approvedAt:'2026-09-02'},{customerId:'c',stage:0,date:'2026-09-03'},{customerId:'outside',stage:2,date:'2026-09-01',approvedAt:'2026-09-01'},{customerId:'c',stage:2,date:'2027-01-01'}];
 assert.deepEqual(buyerStatistics(customers,orders,'2026-09-30'),{total:2,repeat:1,newCustomers:1,rate:50,growth:100});
 assert.equal(buyerStatistics([],[]).rate,0);
});
test('all eight open workflow stages remain visible; sort by stage then oldest date',()=>{
 assert.deepEqual(openStages,[2,3,4,5,6,7,8,9]);
 const rows=[{id:'b',stage:9,date:'2026-01-01'},{id:'c',stage:2,date:'2026-03-01'},{id:'a',stage:2,date:'2026-02-01'}];
 assert.deepEqual(rows.sort(compareOpenOrders).map(o=>o.id),['a','c','b']);
});
test('group chart uses cumulative customer creation, includes non-buyers, excludes future months',()=>{
 const rows=[{group:'Salon',created:'2025-12-01'},{group:'Salon',created:'2026-02-01'},{group:'Wholesale',created:'2026-03-01'}];
 const result=customerGroupSeries(rows,'2026','2026-03-15');assert.deepEqual(result[0].values,[0,0,1,0]);assert.deepEqual(result[2].values,[0,0,2,1]);assert.deepEqual(result[3].values,[0,0,0,0]);
});
