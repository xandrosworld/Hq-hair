import test from 'node:test';
import assert from 'node:assert/strict';
import {applyCompensation} from '../compensation.js';
import {compensationTotal} from '../compensation-totals.js';
import {monthlySeries} from '../reporting.js';
import {assertContentAction} from '../order-workflow.js';
test('post-delivery compensation totals exclude voids, preserve history and reject invalid input',()=>{
 const o={orderCode:'HQ-1',date:'2026-01-01',stage:10,contentLockedAt:'2026-01-02',discount:5,items:[],payments:[]},user={id:'sale1',name:'Sale',role:'sale'},events=[];
 const event=(...args)=>events.push(args);
 assert.doesNotThrow(()=>assertContentAction(o,user,'compensation-add',{}));
 for(const amount of [-1,0,'',null,Infinity,1.001])assert.throws(()=>applyCompensation(o,user,'compensation-add',{amount,date:'2026-01-02',text:'Claim'},event));
 assert.throws(()=>applyCompensation(o,{role:'factory'},'compensation-add',{amount:5,date:'2026-01-02',text:'Claim'},event));
 applyCompensation(o,user,'compensation-add',{amount:12.25,date:'2026-01-02',text:'Return damaged hair'},event);
 applyCompensation(o,user,'compensation-add',{amount:3.5,date:'2026-01-02',text:'Shipping refund'},event);
 assert.equal(compensationTotal(o),15.75);assert.equal(monthlySeries([o],2026,'damages')[0],15.75);
 assert.equal(monthlySeries([o],2026,'discount')[0],5);
 const body={entryId:o.compensations[0].id,text:'Duplicate claim'};
 assert.throws(()=>applyCompensation(o,{...user,id:'other'},'compensation-void',body,event));
 applyCompensation(o,user,'compensation-void',body,event);
 assert.equal(compensationTotal(o),3.5);assert.equal(o.compensations.length,2);assert.equal(events.length,3);assert.equal(o.stage,10);
 assert.throws(()=>applyCompensation(o,user,'compensation-void',body,event));
 assert.equal(monthlySeries([{...o,stage:0}],2026,'damages')[0],0);
});

test('Only accounting records actual cancelled-order loss; loss remains separate from debt and receipts',()=>{
 const o={orderCode:'HQ-1',date:'2026-01-01',stage:10,cancelledAt:'2026-01-02',cancelType:'deposit_forfeited',items:[],payments:[]},body={amount:120,date:'2026-01-02',text:'Actual production loss'},user={id:'kt',name:'Accounting',role:'accounting'};
 for(const role of ['sale','sales_lead','factory','manager'])assert.throws(()=>applyCompensation(o,{role},'compensation-add',body,()=>{}));
 applyCompensation(o,user,'compensation-add',body,()=>{});assert.equal(compensationTotal(o),120);assert.equal(o.compensations[0].kind,'cancellation_loss');assert.equal(o.stage,10);assert.equal(o.payments.length,0);
 assert.throws(()=>applyCompensation({...o,cancelType:undefined},user,'compensation-add',body,()=>{}));
});
