import test from 'node:test';
import assert from 'node:assert/strict';
import {assertDraftSlot,freezeDraftCodes} from '../draft-orders.js';
import {invoiceOrderLabel} from '../order-identity.js';
test('One pending slot per customer opens after approval or cancellation and codes stay frozen',()=>{
 const draft={id:'a',customerId:'HQ-1',stage:0,orderCode:null},orders=[draft];
 assert.throws(()=>assertDraftSlot(orders,'HQ-1'),{status:409});assert.doesNotThrow(()=>assertDraftSlot(orders,'HQ-1','a'));
 assert.doesNotThrow(()=>assertDraftSlot(orders,'HQ-2'));
 assert.equal(freezeDraftCodes(orders),true);assert.equal(draft.draftCode,'Draft-HQ-1-1');
 orders.push({orderCode:'HQ-1-2'});assert.equal(invoiceOrderLabel(draft,orders),'Draft-HQ-1-1');assert.equal(freezeDraftCodes(orders),false);
 draft.stage=2;assert.throws(()=>assertDraftSlot(orders,'HQ-1'),{status:409});
 draft.cancelledAt='2026-10-04';assert.doesNotThrow(()=>assertDraftSlot(orders,'HQ-1'));
 delete draft.cancelledAt;draft.orderCode='HQ-1-3';assert.doesNotThrow(()=>assertDraftSlot(orders,'HQ-1'));
 assert.equal(invoiceOrderLabel(draft,orders),'HQ-1-3');
});
