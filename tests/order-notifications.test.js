import test from 'node:test';
import assert from 'node:assert/strict';
import {orderNotifications} from '../order-notifications.js';
test('Notifications include five prior Vietnam dates, progress and messages, excluding future and draft saves',()=>{
 const now=new Date('2026-10-05T03:00:00Z');
 const orders=[{id:'a',history:[{title:'Kế toán duyệt',time:'2026-09-29T17:00:00Z'},{title:'Old',time:'2026-09-29T16:59:59Z'},{title:'Future',time:'2026-10-05T04:00:00Z'},{title:'Cập nhật bản nháp',time:'2026-10-05T01:00:00Z'}],messages:[{id:'m',author:'Xưởng',time:'2026-10-05T02:00:00Z',text:'Check'}]}];
 const items=orderNotifications(orders,now);assert.equal(items.length,2);assert.equal(items[0].kind,'message');assert.equal(items[1].title,'Đã duyệt');assert.equal(items[0].order.id,'a');
 assert.deepEqual(orderNotifications([],now),[]);
});
