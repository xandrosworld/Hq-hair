import test from 'node:test';
import assert from 'node:assert/strict';
import {factoryOrders,factoryGroup,factoryState,factoryReport,filterFactoryOrders,waitingDays} from '../factory-model.js';
const order=(extra={})=>({orderCode:'HQ-1',stage:3,date:'2026-10-01',due:'2026-10-10',items:[{qty:150,unit:'Gram'},{qty:2,unit:'Piece'}],...extra});
test('Factory queues exclude unapproved orders and retain rework and forfeiture',()=>{
 assert.equal(factoryOrders([order(),order({stage:2}),order({orderCode:null})]).length,1);
 assert.equal(factoryGroup(order({stage:4,saleReview:{result:'rework'}})),'review');
 assert.equal(factoryState(order({stage:10,cancelledAt:'2026-10-01',cancelType:'deposit_forfeited'})),'forfeited');
 assert.equal(filterFactoryOrders([order()],{tab:'waiting',from:'2026-10-02'}).length,0);
 assert.equal(filterFactoryOrders([order()],{tab:'waiting',query:'HQ-1',dueTo:'2026-10-10'}).length,1);
 assert.equal(waitingDays(order({production:{checkAt:'2026-10-03T00:00:00Z'}}),'2026-10-08'),5);
});
test('Factory reports freeze dispatch deadlines, separate units and exclude pending/cancelled orders',()=>{
 const o=order({stage:6,due:'2026-12-01',officeDispatch:{time:'2026-10-11T00:00:00Z',dueDate:'2026-10-10'}});
 const report=factoryReport([o,order(),{...o,cancelledAt:'2026-10-12'}],2026)[9];
 assert.equal(report.total,1);assert.equal(report.late,1);assert.equal(report.grams,150);assert.deepEqual(report.units,{g:150,Piece:2});
 assert.equal(factoryReport([o],2025).reduce((s,r)=>s+r.total,0),0);
 assert.equal(filterFactoryOrders([o],{tab:'office',timing:'late'}).length,1);
});
