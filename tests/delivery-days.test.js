import test from 'node:test';
import assert from 'node:assert/strict';
import {deliveryDays,deliveryDaysLabel} from '../delivery-days.js';
test('Delivery countdown uses the delivery date, including today, overdue, year boundaries and invalid dates',()=>{
 assert.equal(deliveryDays('2026-10-10','2026-10-03'),7);
 assert.equal(deliveryDays('2027-01-01','2026-12-31'),1);
 assert.equal(deliveryDaysLabel(deliveryDays('2026-10-03','2026-10-03')),'Hôm nay');
 assert.equal(deliveryDaysLabel(deliveryDays('2026-10-01','2026-10-03')),'Quá hạn 2 ngày');
 for(const due of ['',null,'2026-02-30','bad'])assert.equal(deliveryDaysLabel(deliveryDays(due,'2026-10-03')),'—');
});
