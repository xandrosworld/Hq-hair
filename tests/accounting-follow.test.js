import test from 'node:test';
import assert from 'node:assert/strict';
import {followGroup,hasNewDocuments} from '../accounting-follow.js';
import {accountingSales} from '../accounting-sales.js';
test('Final review groups depend on review, not full payment; new receipts belong to unchecked orders',()=>{
 const o={accountingApproval:{status:'full'},payments:[{amount:240,confirmed:true}]};
 assert.equal(followGroup(o),'unchecked');assert.equal(hasNewDocuments(o),false);
 o.payments.push({amount:10,confirmed:false});assert.equal(hasNewDocuments(o),true);
 o.finalPaymentCheck={status:'full'};assert.equal(followGroup(o),'checked');
 o.cancelledAt='2026-10-14';assert.equal(followGroup(o),null);
 assert.equal(followGroup({stage:2}),null);
});
test('Sale reporting isolates owners and preserves receipt-date shipping allocation and current debt',()=>{
 const base={orderCode:'HQ-TEST',stage:3,approvedAt:'2026-09-01',accountingApproval:{status:'partial'},items:[{kind:'base',qty:1,price:100}],shippingFee:50};
 const orders=[{...base,id:'a',ownerId:'a',sale:'Same name',payments:[{confirmed:true,confirmedAt:'2026-09-01',amount:30,receivedDate:'2026-09-01'},{confirmed:true,confirmedAt:'2026-10-01',amount:90,receivedDate:'2026-10-01'}]},{...base,id:'b',ownerId:'b',sale:'Same name',payments:[]}];
 const rows=accountingSales(orders,'2026-10','2026-10-14');assert.equal(rows.length,2);
 const a=rows.find(r=>r.key==='a'),b=rows.find(r=>r.key==='b');
 assert.equal(a.revenue,0);assert.equal(a.paid,90);assert.equal(a.shippingPaid,20);assert.equal(a.revenuePaid,70);assert.equal(a.debt,30);assert.equal(b.debt,150);assert.equal(b.paid,0);
});

test('Daily receipt reports allocate shipping from earlier receipts before filtering the day',()=>{
 const o={orderCode:'DAY',stage:3,approvedAt:'2026-10-01',items:[{kind:'base',qty:1,price:100}],shippingFee:50,payments:[{confirmed:true,confirmedAt:'2026-10-01',amount:30,receivedDate:'2026-10-01'},{confirmed:true,confirmedAt:'2026-10-02',amount:90,receivedDate:'2026-10-02'}]};
 const [r]=accountingSales([o],'2026-10-02','2026-10-14');
 assert.equal(r.revenue,0);assert.equal(r.paid,90);assert.equal(r.shippingPaid,20);assert.equal(r.revenuePaid,70);assert.equal(r.debt,30);assert.equal(r.rows.length,1);
});
