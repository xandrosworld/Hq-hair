import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAccounting} from '../accounting.js';
import {workflowStep} from '../workflow-state.js';
const accountant={id:'a',name:'Accountant',role:'accounting'};
const order=()=>({stage:6,orderCode:'HQ-JD-1-1',officeDispatch:{time:'2026-10-03'},items:[{kind:'base',qty:1,price:100}],payments:[{id:'deposit',amount:30,confirmed:true},{id:'balance',amount:70,confirmed:false}]});
test('Final accounting requires office handoff, correct role and full receipts without partial mutations',()=>{
 const o=order(),before=structuredClone(o);
 for(const [who,patch,body] of [[{role:'sale'},{},{}],[accountant,{stage:4},{}],[accountant,{officeDispatch:null},{}],[accountant,{},{}],[accountant,{}, {receipts:[{id:'balance',amount:60}]}]]){
  const draft={...structuredClone(o),...patch};const original=structuredClone(draft);
  assert.throws(()=>applyAccounting(draft,who,'accounting-final',body,()=>{}));assert.deepEqual(draft,original);
 }
 assert.deepEqual(o,before);
 applyAccounting(o,accountant,'accounting-final',{receipts:[{id:'balance',amount:70}]},()=>{});
 assert.equal(o.stage,8);assert.equal(o.finalPaymentCheck.status,'full');assert.equal(workflowStep(o,7).done,true);
 assert.throws(()=>applyAccounting(o,accountant,'accounting-final',{},()=>{}));
});
test('Forfeiture preserves official code and receipts, requires deposit, debt and reason',()=>{
 const o=order(),payments=structuredClone(o.payments);
 assert.throws(()=>applyAccounting(o,accountant,'accounting-forfeit',{},()=>{}));
 applyAccounting(o,accountant,'accounting-forfeit',{text:'Customer cancelled and forfeited deposit'},()=>{});
 assert.equal(o.stage,10);assert.ok(o.completedAt);assert.equal(o.orderCode,'HQ-JD-1-1');assert.deepEqual(o.payments,payments);
 assert.equal(o.finalPaymentCheck.deposit,30);assert.equal(o.cancelType,'deposit_forfeited');assert.equal(workflowStep(o,7).tone,'red');
 assert.throws(()=>applyAccounting(o,accountant,'accounting-final',{},()=>{}));
 for(const payments of [[],[{amount:100,confirmed:true}]])assert.throws(()=>applyAccounting({...order(),payments},accountant,'accounting-forfeit',{text:'reason'},()=>{}));
});
