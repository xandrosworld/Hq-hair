import test from 'node:test';
import assert from 'node:assert/strict';
import {periodDashboard,periodDashboardCSV,receivablesAt} from '../period-dashboard.js';
import {buyerStatistics} from '../customer-statistics.js';
const order={id:'o',orderCode:'HQ-1',customerId:'c',stage:3,date:'2026-07-01',approvedAt:'2026-08-10',items:[{kind:'base',qty:1,price:1000}],discount:100,shippingFee:100,payments:[{confirmed:true,amount:200,receivedDate:'2026-08-10'},{confirmed:true,amount:300,receivedDate:'2026-09-15'},{confirmed:true,amount:500,receivedDate:'2026-10-05'}]};
test('confirmed month splits use approval month and receipt month, net shipping once',()=>{
 const aug=periodDashboard([order],'2026-08','2026-10-16'),sep=periodDashboard([order],'2026-09','2026-10-16'),oct=periodDashboard([order],'2026-10','2026-10-16');
 assert.equal(aug.revenue,900);assert.equal(aug.discount,100);assert.equal(aug.currentReceipts,100);assert.equal(aug.recoveredDebt,0);assert.equal(aug.debt,800);
 assert.equal(sep.revenue,0);assert.equal(sep.revenuePaid,300);assert.equal(sep.currentReceipts,0);assert.equal(sep.recoveredDebt,300);assert.equal(sep.debt,500);assert.equal(oct.debt,0);
 for(const r of [aug,sep,oct])assert.equal(r.currentReceipts+r.recoveredDebt+r.unclassified,r.revenuePaid);
 for(const period of ['','2026']){const r=periodDashboard([order],period,'2026-10-16');assert.equal(r.currentReceipts,period?null:900);assert.equal(r.recoveryNotApplicable,!period);assert.equal(r.recoveredDebt,null);assert.equal(r.revenuePaid,900)}
});
test('past balances exclude later approvals/payments and restore pre-edit order totals and cancellation',()=>{
 assert.equal(receivablesAt([order],'2026-07-31','2026-10-16').debt,0);
 const edited={...order,items:[{kind:'base',qty:1,price:2000}],history:[{title:'Lưu phiên bản trước chỉnh sửa',time:'2026-10-01T00:00:00Z',snapshot:order}]};assert.equal(receivablesAt([edited],'2026-09-30','2026-10-16').debt,500);
 const cancelled={...order,cancelledAt:'2026-10-10',cancelType:'refunded'};assert.equal(receivablesAt([cancelled],'2026-09-30','2026-10-16').debt,500);assert.equal(receivablesAt([cancelled],'2026-10-16','2026-10-16').debt,0);
 const missing={...order,payments:[{confirmed:true,amount:50}]};assert.equal(receivablesAt([missing],'2026-09-30','2026-10-16').debt,null);assert.equal(receivablesAt([missing],'2026-10-16','2026-10-16').debt,950);
});
test('new buyers use first approval, returning buyers must have bought in an earlier period',()=>{
 const customers=[{id:'a',created:'2020-01-01'},{id:'b',created:'2026-10-01'},{id:'c',created:'2026-09-01'}];
 const orders=[['a','2026-10-01'],['a','2026-10-02'],['b','2026-09-01'],['b','2026-10-03'],['c','2026-09-20']].map(([customerId,approvedAt],i)=>({...order,id:String(i),orderCode:String(i+1),customerId,approvedAt}));
 const r=buyerStatistics(customers,orders,'2026-10-16','2026-10','month');assert.equal(r.total,3);assert.equal(r.newCustomers,1);assert.equal(r.repeat,1);
 const sep=buyerStatistics(customers,orders,'2026-10-16','2026-09','month');assert.equal(sep.total,2);assert.equal(sep.newCustomers,2);assert.equal(sep.repeat,0);
});
test('export reconciles month revenue, net receipt partitions and historical debt',()=>{
 const r=periodDashboard([order],'2026-09','2026-10-16'),csv=periodDashboardCSV([order],'2026-09','2026-10-16');const rows=csv.trim().split('\r\n').slice(1).map(l=>l.slice(1,-1).split('\",\"'));
 for(const [key,col]of [['revenue',3],['revenuePaid',4],['currentReceipts',5],['recoveredDebt',6],['discount',7],['debt',8]])assert.equal(rows.reduce((s,row)=>s+Number(row[col]),0),r[key]);
});

test('all-time CSV exports cumulative net receipts without inventing a recovery amount',()=>{
 const csv=periodDashboardCSV([order],'','2026-10-16');
 assert.ok(csv.includes('THU HOI CONG NO: KHONG AP DUNG'));
 assert.ok(!csv.includes('CHUA CHOT'));
 const rows=csv.trim().split('\r\n').slice(1).map(l=>l.slice(1,-1).split('","'));
 assert.equal(rows.reduce((n,row)=>n+Number(row[5]||0),0),900);
 assert.ok(rows.every(row=>!row[6]));
});
