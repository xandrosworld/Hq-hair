import test from 'node:test';
import assert from 'node:assert/strict';
import {invoiceOrderLabel,assignOrderCode} from '../order-identity.js';
test('Draft invoice previews the next official customer number without reserving it',()=>{
 const pending={id:'uuid',customerId:'HQ-JD-1',requestCode:'YC-random',orderCode:null};
 const orders=[pending,{customerId:'HQ-JD-1',cancelledAt:'2026-10-04',orderCode:null}];
 assert.equal(invoiceOrderLabel(pending,orders),'Draft-HQ-JD-1-1');
 assert.equal(pending.orderCode,null);
 orders.push({orderCode:'HQ-JD-1-1',cancelledAt:'2026-10-04'});
 assert.equal(invoiceOrderLabel(pending,orders),'Draft-HQ-JD-1-2');
 pending.accountingApproval={time:'2026-10-04T01:00:00Z'};assignOrderCode(pending,orders);
 assert.equal(invoiceOrderLabel(pending,orders),'HQ-JD-1-2');
});
