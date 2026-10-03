import test from 'node:test';
import assert from 'node:assert/strict';
import {deliveryDays,deliveryDaysLabel,deliveryTiming} from '../delivery-days.js';
test('Delivery countdown uses the delivery date, including today, overdue, year boundaries and invalid dates',()=>{
 assert.equal(deliveryDays('2026-10-10','2026-10-03'),7);
 assert.equal(deliveryDays('2027-01-01','2026-12-31'),1);
 assert.equal(deliveryDaysLabel(deliveryDays('2026-10-03','2026-10-03')),'Hôm nay');
 assert.equal(deliveryDaysLabel(deliveryDays('2026-10-01','2026-10-03')),'Quá hạn 2 ngày');
 for(const due of ['',null,'2026-02-30','bad'])assert.equal(deliveryDaysLabel(deliveryDays(due,'2026-10-03')),'—');
});
test('All six delivery states share office handoff as completion and freeze after delivery',()=>{
 for(const [due,asOf,dispatch,title,detail] of [
  ['2026-10-26','2026-10-24',null,'Chưa giao','Còn 2 ngày'],
  ['2026-10-26','2026-10-26',null,'Chưa giao','Đến hạn hôm nay'],
  ['2026-10-26','2026-10-29',null,'Chưa giao','Quá hạn 3 ngày'],
  ['2026-10-26','2026-12-01','2026-10-24','Đã giao','Sớm 2 ngày'],
  ['2026-10-26','2026-12-01','2026-10-26','Đã giao','Đúng hạn'],
  ['2026-10-26','2026-12-01','2026-10-29','Đã giao','Trễ 3 ngày'],
 ]){
  const result=deliveryTiming({due,officeDispatch:dispatch?{time:dispatch,dueDate:due}:null},asOf);
  assert.equal(result.title,title);assert.equal(result.detail,detail);
 }
 const order={due:'2027-01-01',officeDispatch:{time:'2026-10-25T18:00:00Z',dueDate:'2026-10-26'}};
 assert.equal(deliveryTiming(order,'2027-03-01').detail,'Đúng hạn');
 assert.equal(deliveryTiming(order,'2028-03-01').detail,'Đúng hạn');
});
test('Legacy handoff, missing dates and cancellations never invent delivery dates',()=>{
 assert.equal(deliveryTiming({due:'2026-10-26',history:[{title:'Gửi đến văn phòng',time:'2026-10-24T08:00:00'}]},'2026-12-01').detail,'Sớm 2 ngày');
 assert.equal(deliveryTiming({stage:8,due:'2026-10-26'},'2026-10-24').title,'Chưa giao');
 assert.equal(deliveryTiming({officeDispatch:{time:'invalid'},due:'2026-10-26'}).detail,'Thiếu ngày xác nhận');
 assert.equal(deliveryTiming({due:'',officeDispatch:{time:'2026-10-26',dueDate:''}}).detail,'Chưa có hạn giao hợp lệ');
 assert.equal(deliveryTiming({cancelledAt:'2026-10-20',due:'2026-10-26'}).title,'Đã hủy');
 assert.equal(deliveryTiming({cancelledAt:'2026-10-30',due:'2026-10-26',officeDispatch:{time:'2026-10-24'}}).detail,'Sớm 2 ngày');
});
