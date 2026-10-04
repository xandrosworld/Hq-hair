import test from 'node:test';
import assert from 'node:assert/strict';
import {applySaleWorkflow,contentLocked,assertContentAction} from '../order-workflow.js';
import {aging} from '../receivables.js';

test('Sale check returns to production and cannot perform the factory handoff',()=>{
 const order={stage:5},events=[];
 applySaleWorkflow(order,{role:'sale',id:'a'},'accept',{},(...args)=>events.push(args));
 assert.equal(order.stage,4);assert.equal(order.saleReview.result,'accepted');assert.equal(events.length,1);
 assert.throws(()=>applySaleWorkflow(order,{role:'sale'},'received',{},()=>{}));
 assert.throws(()=>applySaleWorkflow(order,{role:'sale'},'manager-stage',{stage:6,text:'Fake override'},()=>{}));
});
test('Completion of inspection locks every content action while chat and delivery remain available',()=>{
 const o={stage:8,date:'2026-01-01'};
 const body={carrier:'DHL',tracking:'TRACK-1',shippedDate:'2026-01-02',checked:true};
 assert.throws(()=>applySaleWorkflow(o,{role:'sale'},'inspection',{...body,shippedDate:'2026-02-30'},()=>{}));
 applySaleWorkflow(o,{role:'sale',id:'s'},'inspection',body,()=>{});assert.equal(contentLocked(o),true);
 for(const action of ['payment','edit-request','grant-edit','delete'])assert.throws(()=>assertContentAction(o,{role:'sale'},action,{}));
 for(const action of ['message','received','complete'])assert.doesNotThrow(()=>assertContentAction(o,{role:'sale'},action,{}));
 assert.throws(()=>assertContentAction(o,{role:'manager'},'payment',{}));
 assert.doesNotThrow(()=>assertContentAction(o,{role:'manager'},'payment',{reason:'Correct receipt'}));
 applySaleWorkflow(o,{role:'sale'},'received',{feedback:'very_satisfied'},()=>{});assert.equal(o.stage,9);
 applySaleWorkflow(o,{role:'sale'},'complete',{},()=>{});assert.equal(o.stage,10);
});
test('Manager cannot skip workflow stages or remove lock',()=>{
 const o={stage:9,contentLockedAt:'2026-01-01',payments:[{amount:100,confirmed:false}]};
 assert.throws(()=>applySaleWorkflow(o,{role:'manager'},'manager-stage',{stage:2,text:'Correct mistaken transition'},()=>{}));
 assert.equal(o.stage,9);assert.equal(contentLocked(o),true);assert.equal(o.payments[0].confirmed,false);
});
test('Debt stays visible after manager exceptional closure; Sale cannot silently close unpaid order',()=>{
 const o={stage:9,items:[{kind:'base',qty:1,price:100}],payments:[]};
 assert.throws(()=>applySaleWorkflow(o,{role:'sale'},'complete',{},()=>{}));
 assert.throws(()=>applySaleWorkflow(o,{role:'manager'},'complete',{text:''},()=>{}));
 applySaleWorkflow(o,{role:'manager'},'complete',{text:'Customer credit exception'},()=>{});
 assert.equal(o.stage,10);assert.deepEqual(o.payments,[]);
});
test('Receivable aging shares delivery deadline and freezes at office handoff',()=>{
 assert.deepEqual(aging({due:'2026-09-29',paymentDue:'2027-01-01'},'2026-09-30'),{due:'2026-09-29',days:1,bucket:'overdue'});
 assert.equal(aging({due:'2026-09-30'},'2026-09-30').bucket,'current');
 assert.equal(aging({due:'2026-10-01'},'2026-09-30').bucket,'current');
 assert.equal(aging({due:'2026-09-30',officeDispatch:{time:'2026-09-29',dueDate:'2026-09-30'}},'2026-10-10').bucket,'current');
 assert.equal(aging({due:'2026-09-30',officeDispatch:{time:'2026-10-02',dueDate:'2026-09-30'}},'2026-10-10').days,2);
 assert.equal(aging({},'2026-10-10').bucket,'current');
});
