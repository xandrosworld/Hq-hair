import test from 'node:test';
import assert from 'node:assert/strict';
import {applyFactoryWorkflow} from '../factory-workflow.js';
import {applySaleWorkflow} from '../order-workflow.js';
import {workflowStep,feedbackLabels} from '../workflow-state.js';
const factory={role:'factory',id:'f',name:'Factory'},sale={role:'sale',id:'s',name:'Sale'};
test('factory production, pause, check and sale rework keep checked statuses and enforce ownership of each step',()=>{
 const o={id:'uuid',orderCode:'c-1',stage:3,history:[]};
 const event=(title,note)=>o.history.push({title,note,time:new Date().toISOString()});
 const act=(status)=>applyFactoryWorkflow(o,factory,'factory-status',{status},event);
 assert.throws(()=>applyFactoryWorkflow(o,sale,'factory-status',{status:'producing'},event),{status:403});
 act('producing');assert.equal(o.stage,4);assert.equal(workflowStep(o,4).done,true);
 act('paused');assert.equal(workflowStep(o,4).label,'Tạm dừng');
 assert.throws(()=>applyFactoryWorkflow(o,factory,'factory-office',{},event));
 act('sale_check');assert.equal(o.stage,5);
 assert.throws(()=>act('producing'));
 applySaleWorkflow(o,sale,'rework',{text:'Fix colour'},event);assert.equal(o.stage,4);assert.equal(workflowStep(o,5).tone,'red');
 assert.throws(()=>applyFactoryWorkflow(o,factory,'factory-office',{},event));
 act('producing');act('sale_check');assert.equal(o.saleReview,null);
 applySaleWorkflow(o,sale,'accept',{},event);assert.equal(workflowStep(o,5).tone,'green');
 applyFactoryWorkflow(o,factory,'factory-office',{},event);assert.equal(o.stage,6);assert.equal(workflowStep(o,6).done,true);
 assert.throws(()=>applyFactoryWorkflow(o,factory,'factory-office',{},event));
});
test('feedback is required, all five choices mark receipt complete, updates preserve first receipt date',()=>{
 for(const feedback of Object.keys(feedbackLabels)){
  const o={stage:8,contentLockedAt:'2026-01-01',history:[]};
  assert.throws(()=>applySaleWorkflow(o,sale,'received',{},()=>{}));
  applySaleWorkflow(o,sale,'received',{feedback},()=>{});
  assert.equal(o.stage,9);assert.equal(workflowStep(o,9).done,true);assert.equal(workflowStep(o,9).label,feedbackLabels[feedback]);
  const received=o.receivedAt;applySaleWorkflow(o,sale,'received',{feedback:'claim'},()=>{});assert.equal(o.receivedAt,received);
  assert.throws(()=>applySaleWorkflow(o,factory,'received',{feedback},()=>{}));
 }
});
test('payment indicator stays yellow for partial and green for full, independently of current stage',()=>{
 for(const [status,tone] of [['partial','amber'],['full','green']])assert.deepEqual(workflowStep({stage:3,accountingApproval:{status}},3),{done:true,label:status==='partial'?'Thanh toán 1 phần':'Thanh toán đủ',tone,actor:undefined,time:undefined});
});
