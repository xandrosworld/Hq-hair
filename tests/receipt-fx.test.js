import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAccounting} from '../accounting.js';
import {applyReceiptCorrection} from '../receipt-corrections.js';
import {accountingPeriod} from '../accounting-period.js';
import {datedFinancialCSV} from '../dated-financial-report.js';
const user={id:'a',role:'accounting',name:'Accountant'};
const sample=()=>({id:'o',stage:2,items:[{kind:'base',qty:1,price:770}],shippingFee:85,payments:[{id:'a',amount:500},{id:'b',amount:355}]});
const confirm=(o,receipts)=>applyAccounting(o,user,'accounting-approve',{paymentStatus:'partial',receipts},()=>{});
test('Manual rate confirmation validates atomically and stores accounting rate',()=>{
 for(const bad of [-1,0,Infinity,'25000',25000.001,1000001]){
  const o=sample();assert.throws(()=>confirm(o,[{id:'a',amount:500,exchangeRate:25000},{id:'b',amount:1,exchangeRate:bad}]),{status:400});assert.equal(o.payments[0].confirmed,undefined);
 }
 const o=sample();confirm(o,[{id:'a',amount:500,exchangeRate:25000,receivedDate:'2026-09-01'}]);assert.equal(o.payments[0].exchangeRate,25000);assert.equal(o.payments[0].exchangeRateSource,'manual');
});
test('Receipt rates differ across periods, shipping allocated once, CSV reconciles in VND',()=>{
 const o={...sample(),stage:8,orderCode:'HQ-1',approvedAt:'2026-08-01',payments:[{id:'a',amount:500,confirmed:true,confirmedAt:'2026-09-01',exchangeRate:25000,receivedDate:'2026-09-01'},{id:'b',amount:355,confirmed:true,confirmedAt:'2026-10-01',exchangeRate:26000,receivedDate:'2026-10-01'}]};
 const a=accountingPeriod([o],'2026-09'),b=accountingPeriod([o],'2026-10');assert.equal(a.paidVND,12500000);assert.equal(a.shippingPaidVND,2125000);assert.equal(a.revenuePaidVND,10375000);assert.equal(b.revenuePaidVND,9230000);assert.equal(b.shippingPaidVND,0);
 const all=accountingPeriod([o]);assert.equal(all.revenuePaidVND,19605000);assert.equal(all.paidVND,all.shippingPaidVND+all.revenuePaidVND);assert.equal(all.missingRates,0);
 assert.ok(datedFinancialCSV([o],'2026-10').includes('"26000","9230000","0","9230000"'));
 const cancelled=accountingPeriod([{...o,cancelledAt:'2026-10-02',cancelType:'deposit_forfeited',stage:10}]);assert.equal(cancelled.shippingPaidVND,0);assert.equal(cancelled.revenuePaidVND,cancelled.paidVND);
 delete o.payments[0].exchangeRate;const legacy=accountingPeriod([o]);assert.equal(legacy.missingRates,1);assert.equal(legacy.paidVND,9230000);assert.equal(legacy.rows.find(r=>r.id==='a').paidVND,null);
});
test('Rate edits require a grant, preserve before/after and relock; bad rate keeps grant',()=>{
 const o=sample();confirm(o,[{id:'a',amount:500,exchangeRate:25000,receivedDate:'2026-09-01'}]);const body={paymentId:'a',amount:500,receivedDate:'2026-09-01',exchangeRate:26000,text:'Correct exchange rate'};
 assert.throws(()=>applyReceiptCorrection(o,user,'accounting-correct-receipt',body,()=>{}),{status:403});
 applyReceiptCorrection(o,{id:'m',role:'manager'},'accounting-grant-receipt',body,()=>{});
 assert.throws(()=>applyReceiptCorrection(o,user,'accounting-correct-receipt',{...body,exchangeRate:-1},()=>{}),{status:400});assert.ok(o.payments[0].correctionGrant);
 applyReceiptCorrection(o,user,'accounting-correct-receipt',body,()=>{});const p=o.payments[0];assert.equal(p.exchangeRate,26000);assert.equal(p.corrections[0].before.exchangeRate,25000);assert.equal(p.corrections[0].after.exchangeRate,26000);assert.equal(p.correctionGrant,undefined);
});
