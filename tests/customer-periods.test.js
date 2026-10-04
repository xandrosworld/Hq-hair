import test from 'node:test';
import assert from 'node:assert/strict';
import {buyerStatistics} from '../customer-statistics.js';
test('Year and all-time buyer statistics deduplicate repeat customers and exclude future approvals',()=>{
 const customers=[{id:'a',created:'2025-01-01'},{id:'b',created:'2026-01-01'}];
 const orders=['2025-01-02','2026-01-02','2026-02-02','2026-12-02'].map((date,i)=>({id:String(i),orderCode:String(i),customerId:'a',stage:9,approvedAt:date}));
 orders.push({id:'b',orderCode:'b',customerId:'b',stage:3,approvedAt:'2026-03-01'});
 const year=buyerStatistics(customers,orders,'2026-10-04','2026-01','year');
 assert.equal(year.total,2);assert.equal(year.repeat,1);assert.equal(year.newCustomers,1);
 const all=buyerStatistics(customers,orders,'2026-10-04',undefined,'all');
 assert.equal(all.total,2);assert.equal(all.repeat,1);assert.equal(all.newCustomers,2);
 const past=buyerStatistics(customers,orders,'2026-10-04','2025-01','year');
 assert.equal(past.total,1);assert.equal(past.repeat,0);
});
