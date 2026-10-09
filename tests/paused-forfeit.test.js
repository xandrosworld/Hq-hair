import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAccounting} from '../accounting.js';
import {matchesOrderTab,orderListStatus} from '../order-list-tabs.js';
const accountant={role:'accounting',id:'a',name:'Accountant'};
const paused=()=>({stage:4,orderCode:'HQ-1',production:{status:'paused'},items:[{kind:'base',qty:1,price:100}],payments:[{amount:30,confirmed:true}],history:[]});
test('Only accountant can close a paused order with forfeited deposit; no final-payment shortcut',()=>{
 for(const role of ['sale','factory','manager'])assert.throws(()=>applyAccounting(paused(),{role},'accounting-forfeit',{text:'reason'},()=>{}),{status:403});
 for(const stage of [0,2,3,5,6,7,8,9,10])assert.throws(()=>applyAccounting({...paused(),stage},accountant,'accounting-forfeit',{text:'reason'},()=>{}));
 assert.throws(()=>applyAccounting({...paused(),production:{status:'producing'}},accountant,'accounting-forfeit',{text:'reason'},()=>{}));
 assert.throws(()=>applyAccounting(paused(),accountant,'accounting-final',{},()=>{}));
 const order=paused(),events=[];
 applyAccounting(order,accountant,'accounting-forfeit',{text:'Customer abandoned paused order'},(...event)=>events.push(event));
 assert.equal(order.stage,10);assert.ok(order.completedAt);assert.equal(order.payments[0].amount,30);assert.equal(events.length,2);
 assert.equal(matchesOrderTab(order,'completed'),true);assert.equal(matchesOrderTab(order,'active'),false);assert.ok(orderListStatus(order).detail);
 assert.throws(()=>applyAccounting(order,accountant,'accounting-forfeit',{text:'repeat'},()=>{}));
});

test('Office dispatch never permits deposit forfeiture, even if stale production status is paused',()=>{
 for(const stage of [6,7]){
  const order={...paused(),stage,officeDispatch:{time:'2026-10-09'},history:[{title:'Đã gửi đến văn phòng',time:'2026-10-09'}]};
  const before=structuredClone(order);
  assert.throws(()=>applyAccounting(order,accountant,'accounting-forfeit',{text:'reason'},()=>{}),{status:400});
  assert.deepEqual(order,before);
 }
});
