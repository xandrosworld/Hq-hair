import test from 'node:test';
import assert from 'node:assert/strict';
import {factoryOrders,factoryGroup,factoryState,factoryReport,filterFactoryOrders,waitingDays,factoryTiming} from '../factory-model.js';
const order=(extra={})=>({orderCode:'HQ-1',stage:3,date:'2026-10-01',due:'2026-10-10',items:[{qty:150,unit:'Gram'},{qty:2,unit:'Piece'}],...extra});
test('Factory queues exclude unapproved orders and retain rework and forfeiture',()=>{
 assert.equal(factoryOrders([order(),order({stage:2}),order({orderCode:null})]).length,1);
 assert.equal(factoryGroup(order({stage:4,saleReview:{result:'rework'}})),'review');
 assert.equal(factoryState(order({stage:10,cancelledAt:'2026-10-01',cancelType:'deposit_forfeited'})),'forfeited');
 assert.equal(filterFactoryOrders([order()],{tab:'waiting',from:'2026-10-02'}).length,0);
 assert.equal(filterFactoryOrders([order()],{tab:'waiting',query:'HQ-1',dueTo:'2026-10-10'}).length,1);
 assert.equal(waitingDays(order({stage:5,production:{checkAt:'2026-10-03T00:00:00Z'}}),'2026-10-08'),5);
});
test('Paused rework stays visible in production; reply freezes wait time and queue dates drive sorting',()=>{
 const a=order({orderCode:'A',stage:4,date:'2026-10-07',production:{status:'paused',recordedAt:'2026-10-08',checkAt:'2026-10-03'},saleReview:{result:'rework',time:'2026-10-05'}});
 const b=order({orderCode:'B',stage:4,date:'2026-10-01',production:{recordedAt:'2026-10-09'}});
 assert.equal(factoryGroup(a),'production');assert.equal(factoryState(a),'paused');
 assert.equal(waitingDays(a,'2026-10-20'),2);
 assert.deepEqual(filterFactoryOrders([a,b],{tab:'production',sort:'newest'}).map(o=>o.orderCode),['B','A']);
 const c=order({stage:6,customerId:'buyer',history:[{title:'Đã gửi đến văn phòng',time:'2025-12-31T18:00:00Z'}]});
 assert.equal(filterFactoryOrders([c],{tab:'office',query:'Salon',customers:[{id:'buyer',name:'Salon Buyer'}],from:'2026-01-01',to:'2026-01-01'}).length,1);
 assert.equal(factoryReport([c],2026)[0].total,1);
});
test('Factory reports freeze dispatch deadlines, separate units and exclude pending/cancelled orders',()=>{
 const o=order({stage:6,due:'2026-12-01',officeDispatch:{time:'2026-10-11T00:00:00Z',dueDate:'2026-10-10'}});
 const report=factoryReport([o,order(),{...o,cancelledAt:'2026-10-12'}],2026)[9];
 assert.equal(report.total,1);assert.equal(report.late,1);assert.equal(report.grams,150);assert.deepEqual(report.units,{g:150,Piece:2});
 assert.equal(factoryReport([o],2025).reduce((s,r)=>s+r.total,0),0);
 assert.equal(filterFactoryOrders([o],{tab:'office',timing:'late'}).length,1);
});

test('Factory duration starts at approval, respects Vietnam date and frozen deadline',()=>{
 const base=order({date:'2026-09-01',approvedAt:'2026-10-01T18:00:00Z',due:'2027-01-01'});
 for(const [sent,actual,detail] of [['2026-10-09',7,'Sớm 1 ngày'],['2026-10-10',8,'Đúng hạn'],['2026-10-12',10,'Trễ 2 ngày']]){
  const t=factoryTiming({...base,officeDispatch:{time:sent,dueDate:'2026-10-10'}});
  assert.equal(t.approved,'2026-10-02');assert.equal(t.plannedDays,8);assert.equal(t.actualDays,actual);assert.equal(t.detail,detail);
 }
 assert.equal(factoryTiming(order()).plannedDays,null);
 assert.equal(factoryTiming({...base,officeDispatch:null}).actualDays,null);
 assert.equal(factoryTiming({...base,officeDispatch:{time:'2026-09-01',dueDate:'2026-09-02'}}).actualDays,null);
 const legacy=factoryTiming(order({history:[{title:'Kế toán duyệt',time:'2026-10-03'},{title:'Đã gửi đến văn phòng',time:'2026-10-07'}]}));
 assert.equal(legacy.plannedDays,7);assert.equal(legacy.actualDays,4);
});
