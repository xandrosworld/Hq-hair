import test from 'node:test';
import assert from 'node:assert/strict';
import {totals,round} from '../shared.js';
import {periodDashboard,periodDashboardCSV} from '../period-dashboard.js';
const asOf='2026-10-17',range={from:'2026-08-01',to:asOf,monthly:true};
const payment=(amount,confirmedAt,confirmed=true)=>({amount,confirmedAt,confirmed});
function reconcile(orders){
 const r=periodDashboard(orders,range,asOf),detail=orders.map(totals);
 for(const key of ['revenue','paid','revenuePaid','shippingPaid','debt'])assert.equal(r[key],round(detail.reduce((n,t)=>n+t[key],0)),key);
 assert.equal(r.discount,round(orders.reduce((n,o)=>n+(o.discount||0),0)));
 assert.equal(round(r.currentReceipts+r.recoveredDebt),r.revenuePaid);
 assert.equal(round(r.revenuePaid+r.shippingPaid),r.paid);
 const rows=periodDashboardCSV(orders,range,asOf,true).trim().split('\r\n').slice(1).map(l=>l.slice(1,-1).split('","'));
 for(const [key,col] of [['discount',7],['revenue',3],['revenuePaid',4],['currentReceipts',5],['recoveredDebt',6],['debt',8]])assert.equal(round(rows.reduce((n,row)=>n+Number(row[col]),0)),r[key],'CSV '+key);
 return r;
}
test('customer screenshot: goods 165.40 + shipping 50, confirmed 290, six KPI and CSV reconcile',()=>{
 const o={id:'screenshot',orderCode:'HQ-JD-3-1',stage:8,approvedAt:'2026-10-01',items:[{kind:'base',qty:1,price:165.4}],discount:0,shippingFee:50,payments:[payment(290,'2026-10-16')]};
 const r=reconcile([o]);assert.deepEqual([r.discount,r.revenue,r.revenuePaid,r.currentReceipts,r.recoveredDebt,r.debt],[0,165.4,240,240,0,0]);
 const older={...o,approvedAt:'2026-08-01'};const old=reconcile([older]);assert.equal(old.recoveredDebt,240);assert.equal(old.currentReceipts,0);
 assert.equal(totals(o).total,215.4);
});
test('base, extras, gifts, discounts, split shipping, pending evidence, corrections and overpayment reconcile',()=>{
 const a={id:'a',orderCode:'A',stage:8,approvedAt:'2026-08-01',items:[{kind:'base',qty:100,price:165.4,unit:'Gram',priceBasis:'100g'},{kind:'extra',qty:2,price:20},{kind:'gift',qty:1,price:99}],discount:5.4,shippingFee:50,payments:[payment(20,'2026-08-02'),payment(100,'2026-09-01'),payment(30,'2026-10-01'),payment(999,'2026-10-02',false)]};
 const b={...a,id:'b',orderCode:'B',approvedAt:'2026-10-01',payments:[payment(290,'2026-10-16')]};
 const r=reconcile([a,b]);assert.equal(r.revenue,400);assert.equal(r.debt,100);assert.equal(r.shippingPaid,100);
 // Pending evidence changes no financial total until confirmed.
 a.payments[3]=payment(100,'2026-10-17');assert.equal(reconcile([a,b]).debt,0);
 // Corrected actual amounts are used consistently by details and report.
 a.payments[3].amount=90;assert.equal(reconcile([a,b]).debt,10);
 const all=periodDashboard([a,b],range,asOf);
 for(const key of ['discount','revenue','revenuePaid','currentReceipts','recoveredDebt']){
  const monthly=['2026-08','2026-09','2026-10'].reduce((n,m)=>n+periodDashboard([a,b],m,asOf)[key],0);
  assert.equal(all[key],round(monthly),key+' monthly');
 }
});
