import test from 'node:test';import assert from 'node:assert/strict';
import {applyAccounting} from '../accounting.js';import {totals} from '../shared.js';import {assertContentAction} from '../order-workflow.js';import {matchesOrderTab} from '../order-list-tabs.js';import {workflowStep} from '../workflow-state.js';import {approvalRate} from '../approval-rate.js';import {accountingCurrencies} from '../accounting-currencies.js';import {periodDashboard} from '../period-dashboard.js';
const actor={id:'a',name:'Kế toán',role:'accounting'};
const make=()=>({id:'o',orderCode:'HQ-JD-1-1',stage:7,date:'2026-10-01',approvedAt:'2026-10-01',officeDispatch:{time:'2026-10-10'},accountingApproval:{status:'partial',time:'2026-10-01'},items:[{kind:'base',qty:1,price:110}],discount:10,shippingFee:0,payments:[{id:'p',amount:30,confirmed:true,exchangeRate:25500,receivedDate:'2026-10-01'}],history:[]});
test('credit shipping retains debt, unlocks dispatch and permits later collections without reopening content',()=>{
 const o=make();applyAccounting(o,actor,'accounting-credit',{},()=>{});assert.equal(o.stage,8);assert.equal(totals(o).debt,70);assert.equal(o.finalPaymentCheck.status,'credit');assert.ok(matchesOrderTab(o,'final','credit'));assert.equal(workflowStep(o,7).label,'Giao hàng công nợ');
 o.stage=9;o.contentLockedAt='now';o.payments.push({id:'new',amount:0,confirmed:false});assert.doesNotThrow(()=>assertContentAction(o,actor,'accounting-receive',{}));assert.doesNotThrow(()=>assertContentAction(o,{role:'sale'},'payment',{}));assert.throws(()=>assertContentAction(o,{role:'sale'},'inspection',{}));
 applyAccounting(o,actor,'accounting-receive',{receipts:[{id:'new',amount:70,exchangeRate:25500}]},()=>{});assert.equal(totals(o).debt,0);assert.equal(o.stage,9);assert.equal(o.contentLockedAt,'now');assert.equal(o.finalPaymentCheck.debt,70);
});
test('credit decision rejects invalid states, role and fully paid without changing receipts',()=>{
 for(const [patch,who,body] of [[{}, {role:'sale'},{}],[{stage:3},actor,{}],[{officeDispatch:null},actor,{}],[{cancelledAt:'now'},actor,{}],[{},actor,{receipts:[{id:'p',amount:1}]}]]){const o={...make(),...patch},before=structuredClone(o);assert.throws(()=>applyAccounting(o,who,'accounting-credit',body,()=>{}));assert.deepEqual(o,before)}
 const o=make();o.payments[0].amount=100;assert.throws(()=>applyAccounting(o,actor,'accounting-credit',{},()=>{}));
});
test('approval FX falls back only to one complete confirmed receipt rate and keeps explicit rate',()=>{
 const o=make();assert.equal(approvalRate(o),25500);const v=accountingCurrencies([o],periodDashboard([o]),'');assert.equal(v.discount,255000);assert.equal(v.revenue,2550000);
 o.payments.push({amount:10,confirmed:true,exchangeRate:26000});assert.equal(approvalRate(o),null);o.payments[1].exchangeRate=null;assert.equal(approvalRate(o),null);o.accountingApproval.exchangeRate=25000;assert.equal(approvalRate(o),25000);
 const before=structuredClone(o.payments);o.contentLockedAt='now';applyAccounting(o,actor,'accounting-rate',{approvalExchangeRate:24500},()=>{});assert.deepEqual(o.payments,before);assert.equal(o.accountingApproval.exchangeRate,24500);assert.equal(o.stage,7);
});

test('common receipt FX updates confirmed receipts only, preserves debt and reports sum per receipt',()=>{
 const o=make();o.shippingFee=10;o.payments=[{id:'a',amount:30,confirmed:true,exchangeRate:24000,receivedDate:'2026-10-01',confirmedAt:'2026-10-01T10:00:00Z'},{id:'b',amount:40,confirmed:true,exchangeRate:25000,receivedDate:'2026-10-02',confirmedAt:'2026-10-02T10:00:00Z'},{id:'c',amount:5,confirmed:false}];
 const beforeDebt=totals(o).debt;
 assert.equal(accountingCurrencies([o],periodDashboard([o]),'').total,1720000);
 applyAccounting(o,actor,'accounting-rate',{approvalExchangeRate:26000,applyToReceipts:true},()=>{});
 assert.equal(accountingCurrencies([o],periodDashboard([o]),'').total,1820000);
 assert.equal(totals(o).debt,beforeDebt);assert.equal(o.payments[2].exchangeRate,undefined);
 assert.equal(o.payments[0].rateHistory[0].before,24000);assert.equal(o.payments[1].rateHistory[0].before,25000);
 assert.equal(o.payments[0].exchangeRate,26000);assert.equal(o.accountingApproval.exchangeRate,26000);
 const snapshot=structuredClone(o);assert.throws(()=>applyAccounting(o,actor,'accounting-rate',{approvalExchangeRate:-1,applyToReceipts:true},()=>{}));assert.deepEqual(o,snapshot);
});
