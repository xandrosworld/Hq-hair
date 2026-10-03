import test from 'node:test';
import assert from 'node:assert/strict';
import {orderOutcomes} from '../order-outcomes.js';
test('Outcomes include completed and forfeited approvals, exclude pending and future, and retain missing data',()=>{
 const o={orderCode:'HQ-1',approvedAt:'2026-01-01',stage:10,due:'2026-01-10'};
 const rows=[{...o,officeDispatch:{time:'2026-01-09',dueDate:o.due},receivedAt:'2026-01-15',customerFeedback:{status:'very_satisfied'}},{...o,officeDispatch:{time:'2026-01-11'},receivedAt:'2026-01-16',customerFeedback:{status:'claim'}},{...o,officeDispatch:{time:'2026-01-10'}},{...o,officeDispatch:{}},{...o,stage:-1,cancelledAt:'2026-01-20',finalPaymentCheck:{status:'forfeited'}},{stage:2},{...o,approvedAt:'2027-01-01'}];
 const s=orderOutcomes(rows,'2026-10-04');assert.equal(s.total,5);assert.equal(s.delivered,4);assert.equal(s.onTime,2);assert.equal(s.late,1);assert.equal(s.deliveryUnknown,1);assert.equal(s.received,2);assert.equal(s.feedback.claim,1);assert.equal(s.forfeited,1);
 assert.equal(orderOutcomes([]).total,0);
});
