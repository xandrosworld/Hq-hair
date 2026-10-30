import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAccounting} from '../accounting.js';
const user={role:'accounting',id:'a',name:'Accountant'};
const make=stage=>({stage,orderCode:'HQ-EM-3-1',accountingApproval:{status:'partial',time:'2026-10-29'},items:[{kind:'base',qty:1,price:219.8}],payments:[{id:'old',amount:210.02,confirmed:true},{id:'new',amount:0,confirmed:false}]});
const body={receipts:[{id:'new',amount:9.78,receivedDate:'2026-10-30',exchangeRate:null}]};
test('Supplemental receipts work before final check without changing approval or workflow',()=>{
 for(const stage of [3,4,5,6,7]){const o=make(stage),approval=structuredClone(o.accountingApproval),events=[];
 applyAccounting(o,user,'accounting-receive',body,(...e)=>events.push(e));
 assert.equal(o.stage,stage);assert.deepEqual(o.accountingApproval,approval);assert.equal(o.finalPaymentCheck,undefined);
 assert.equal(o.payments[0].amount,210.02);assert.equal(o.payments[1].amount,9.78);assert.equal(o.payments[1].confirmed,true);assert.equal(events.length,1);
 assert.throws(()=>applyAccounting(o,user,'accounting-receive',body,()=>{}));}
});
test('Supplemental receipts reject invalid roles, stages and batches atomically',()=>{
 for(const [who,patch,receipts] of [[{role:'sale'},{},body.receipts],[user,{stage:2},body.receipts],[user,{stage:8},body.receipts],[user,{cancelledAt:'now'},body.receipts],[user,{contentLockedAt:'now'},body.receipts],[user,{},[]],[user,{},[...body.receipts,{id:'old',amount:1}]],[user,{},[{id:'new',amount:-1}]]]){
 const o={...make(3),...patch},before=structuredClone(o);assert.throws(()=>applyAccounting(o,who,'accounting-receive',{receipts},()=>{}));assert.deepEqual(o,before);
 }
});
