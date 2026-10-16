import test from 'node:test';import assert from 'node:assert/strict';
import {accountingPeriod} from '../accounting-period.js';import {applyReceiptCorrection} from '../receipt-corrections.js';
const order=()=>({stage:8,orderCode:'HQ-1',approvedAt:'2026-08-01T02:00:00Z',shippingFee:85,items:[{kind:'base',qty:1,price:770}],payments:[{id:'a',confirmed:true,confirmedAt:'2026-08-10',amount:50,receivedDate:'2026-08-10'},{id:'b',confirmed:true,confirmedAt:'2026-09-10',amount:450,receivedDate:'2026-09-10'},{id:'c',confirmed:true,confirmedAt:'2026-10-01',amount:355,receivedDate:'2026-10-01'}]});
test('Accounting periods allocate shipping once across receipts and approval separately',()=>{
 const o=order();assert.equal(accountingPeriod([o],'2026-08').revenue,770);assert.equal(accountingPeriod([o],'2026-09').revenue,0);
 for(const [m,paid,ship,net] of [['08',50,50,0],['09',450,35,415],['10',355,0,355]]){const r=accountingPeriod([o],'2026-'+m);assert.equal(r.paid,paid);assert.equal(r.shippingPaid,ship);assert.equal(r.revenuePaid,net)}
 assert.equal(accountingPeriod([o]).revenuePaid,770);
});
test('Confirmed correction requires one-time manager grant and keeps audit without reopening order',()=>{
 const o=order(),manager={id:'m',role:'manager'},accountant={id:'a',role:'accounting'},body={paymentId:'a',amount:60,receivedDate:'2026-08-11',text:'Correct receipt'};
 assert.throws(()=>applyReceiptCorrection(o,accountant,'accounting-correct-receipt',body,()=>{}),{status:403});
 assert.throws(()=>applyReceiptCorrection(o,accountant,'accounting-grant-receipt',body,()=>{}),{status:403});
 applyReceiptCorrection(o,manager,'accounting-grant-receipt',body,()=>{});
 assert.throws(()=>applyReceiptCorrection(o,accountant,'accounting-correct-receipt',{...body,amount:-1},()=>{}),{status:400});assert.ok(o.payments[0].correctionGrant);
 applyReceiptCorrection(o,accountant,'accounting-correct-receipt',body,()=>{});
 assert.equal(o.payments[0].corrections[0].before.amount,50);assert.equal(o.payments[0].amount,60);assert.equal(o.stage,8);assert.equal(o.payments[0].confirmed,true);
 assert.throws(()=>applyReceiptCorrection(o,accountant,'accounting-correct-receipt',body,()=>{}),{status:403});
});

test('Cancelled unshipped receipts retain all revenue without shipping; dispatched orders retain allocation',()=>{
 const o={...order(),cancelledAt:'2026-10-02',cancelType:'deposit_forfeited',stage:10};
 assert.equal(accountingPeriod([o]).shippingPaid,0);assert.equal(accountingPeriod([o]).revenuePaid,855);
 assert.equal(accountingPeriod([{...o,shippedDate:'2026-10-01'}]).shippingPaid,85);
});
