import test from 'node:test';import assert from 'node:assert/strict';
import {datedFinancialSummary,datedFinancialCSV} from '../dated-financial-report.js';
import {accountingPeriod} from '../accounting-period.js';
import {reportOrders} from '../reporting.js';
const sample={id:'a',customerId:'c',ownerId:'sale-a',sale:'Sale A',orderCode:'HQ-1',stage:3,date:'2026-07-01',approvedAt:'2026-08-01',items:[{kind:'base',qty:1,price:800}],discount:30,shippingFee:85,payments:[{id:'first',amount:50,confirmed:true,receivedDate:'2026-08-01'},{id:'second',amount:450,confirmed:true,receivedDate:'2026-09-01'},{id:'pending',amount:999,confirmed:false,date:'2026-09-01'}],compensations:[{amount:12.5,date:'2026-09-02'},{amount:999,date:'2026-09-02',voidedAt:'2026-09-03'}]};
test('Sale and accounting share approval/receipt periods, cash from earlier orders and current debt',()=>{
 for(const month of ['2026-07','2026-08','2026-09']){const a=accountingPeriod([sample],month),s=datedFinancialSummary([sample],month);for(const key of ['revenue','paid','shippingPaid','revenuePaid'])assert.equal(s[key],a[key]);assert.equal(s.debt,355)}
 const aug=datedFinancialSummary([sample],'2026-08'),sep=datedFinancialSummary([sample],'2026-09');assert.equal(aug.revenue,770);assert.equal(aug.discount,30);assert.equal(aug.shippingPaid,50);assert.equal(sep.revenue,0);assert.equal(sep.paid,450);assert.equal(sep.shippingPaid,35);assert.equal(sep.revenuePaid,415);assert.equal(sep.damages,12.5);assert.equal(sep.discount,0);
 const filtered=reportOrders({orders:[sample,{...sample,id:'b',ownerId:'sale-b'}],customers:[]},{owner:'sale-a',query:'HQ-1'});assert.equal(datedFinancialSummary(filtered,'2026-09').paid,450);
});
test('Dated CSV numerical columns reconcile to cards and preserve the current-debt distinction',()=>{
 const summary=datedFinancialSummary([sample],'2026-09'),csv=datedFinancialCSV([sample],'2026-09');const lines=csv.trim().split('\r\n').slice(1).map(line=>line.slice(1,-1).split('\",\"'));
 for(const [key,index] of [['revenue',4],['paid',5],['shippingPaid',6],['revenuePaid',7],['discount',8],['damages',9],['debt',10]])assert.equal(lines.reduce((s,row)=>s+Number(row[index]),0),summary[key]);
 assert.ok(csv.includes('So du hien tai, khong phai lich su'));
});
test('Forfeiture has no shipping; missing receipt dates are reported and future cash is excluded',()=>{
 const cancelled={...sample,cancelledAt:'2026-09-03',cancelType:'deposit_forfeited',stage:10};const r=datedFinancialSummary([cancelled],'2026-09');assert.equal(r.shippingPaid,0);assert.equal(r.revenuePaid,450);assert.equal(r.debt,0);
 const unknown={...sample,payments:[{amount:10,confirmed:true},{amount:30,confirmed:true,receivedDate:'2026-12-01'}]};const s=datedFinancialSummary([unknown],'','2026-10-12');assert.equal(s.paid,0);assert.equal(s.undated,1);
});
