import test from 'node:test';import assert from 'node:assert/strict';
import {accountingDetailGroups} from '../accounting-detail.js';
test('Web groups multiple receipts by order without mixing new sales and older debt',()=>{
 const orders=[{id:'a',approvedAt:'2026-09-01'},{id:'b',approvedAt:'2026-10-01'}];
 const receipt=(orderId,date,paid)=>({orderId,code:orderId,date,paid,shippingPaid:0,revenuePaid:paid,paidVND:paid*25000});
 const report={approved:[{id:'a',code:'a',date:'2026-09-01',revenue:500},{id:'b',code:'b',date:'2026-10-01',revenue:300}],rows:[receipt('a','2026-09-05',100),receipt('a','2026-09-06',100),receipt('a','2026-10-03',200),receipt('b','2026-10-03',300)]};
 const before=structuredClone(report),g=accountingDetailGroups(orders,report);
 assert.equal(g.current.find(r=>r.id==='a').paid,200);assert.equal(g.current.find(r=>r.id==='a').receipts.length,2);
 assert.equal(g.recovered[0].paid,200);assert.equal(g.recovered[0].revenue,null);
 assert.equal(g.current.reduce((s,r)=>s+r.paid,0)+g.recovered[0].paid,700);assert.deepEqual(report,before);
 report.rows.push({...receipt('b','2026-10-04',10),paidVND:null});
 assert.equal(accountingDetailGroups(orders,report).current.find(r=>r.id==='b').paidVND,null);
 report.rows.push(receipt('missing','2026-10-04',40));assert.equal(accountingDetailGroups(orders,report).unclassified.length,1);
});
