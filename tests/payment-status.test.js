import test from 'node:test';import assert from 'node:assert/strict';import {currentPaymentLabel} from '../payment-status.js';
test('current payment label follows confirmed amounts without rewriting approval history',()=>{
 const o={items:[{kind:'base',qty:1,price:87.7}],discount:10,shippingFee:30,accountingApproval:{status:'partial'},finalPaymentCheck:{status:'full'},payments:[{amount:60,confirmed:true},{amount:70,confirmed:true}]};
 assert.equal(currentPaymentLabel(o),'Thanh toán đủ');assert.equal(o.accountingApproval.status,'partial');
 o.payments[1].confirmed=false;assert.equal(currentPaymentLabel(o),'Thanh toán một phần');
 o.payments[0].confirmed=false;assert.equal(currentPaymentLabel(o),'Chưa thanh toán');
 o.cancelledAt='now';assert.equal(currentPaymentLabel(o),'Đã hủy');
});
