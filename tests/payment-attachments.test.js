import test from 'node:test';import assert from 'node:assert/strict';
import {cleanPaymentAttachments} from '../payment-attachments.js';import {applyAccounting} from '../accounting.js';import {totals} from '../shared.js';
const file={file:'data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10]).toString('base64'),fileName:'bill.png'};
test('three attachments retain legacy support and reject invalid batch atomically',()=>{
 assert.deepEqual(cleanPaymentAttachments(file),file);assert.equal(cleanPaymentAttachments({files:[file,file,file]}).files.length,3);
 assert.throws(()=>cleanPaymentAttachments({files:[file,file,file,file]}),/tối đa 3/);assert.throws(()=>cleanPaymentAttachments({files:[file,{file:'bad'}]}));assert.throws(()=>cleanPaymentAttachments({files:'bad'}));assert.deepEqual(cleanPaymentAttachments({}),{});
});
test('multiple bill images are evidence for one receipt, never three payments',()=>{
 const o={stage:2,date:'2026-10-01',items:[{kind:'base',qty:1,price:100}],payments:[{id:'p',amount:100,confirmed:false,...cleanPaymentAttachments({files:[file,file,file]})}]};
 applyAccounting(o,{id:'a',name:'Accountant',role:'accounting'},'accounting-approve',{paymentStatus:'full',receipts:[{id:'p',amount:100,exchangeRate:25000,receivedDate:'2026-10-01'}]},()=>{});
 assert.equal(o.payments.length,1);assert.equal(o.payments[0].files.length,3);assert.equal(totals(o).paid,100);
});
