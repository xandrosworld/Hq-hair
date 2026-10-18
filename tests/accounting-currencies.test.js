import test from 'node:test';import assert from 'node:assert/strict';
import {periodDashboard,periodDashboardCSV} from '../period-dashboard.js';import {accountingCurrencies} from '../accounting-currencies.js';import {accountingSummaryRows,accountingSummaryCSV,accountingPrintHTML} from '../accounting-export.js';import {reportWorkbook} from '../report-workbook.js';import ExcelJS from 'exceljs';import {applyAccounting} from '../accounting.js';import {applyCompensation} from '../compensation.js';
const period={from:'2026-09-01',to:'2026-10-18',monthly:true};
const order={id:'a',orderCode:'A',stage:8,date:'2026-08-01',approvedAt:'2026-09-01',accountingApproval:{exchangeRate:25000},items:[{kind:'base',qty:1,price:110}],discount:10,shippingFee:20,payments:[{amount:40,confirmed:true,confirmedAt:'2026-09-01',exchangeRate:26000},{amount:80,confirmed:true,confirmedAt:'2026-10-01',exchangeRate:27000}],compensations:[{amount:5,date:'2026-10-02',exchangeRate:28000},{amount:99,date:'2026-10-03',exchangeRate:28000,voidedAt:'2026-10-04'}]};
test('nine accounting cards use independent approval, receipt and compensation rates',()=>{
 const r=periodDashboard([order],period,'2026-10-18'),v=accountingCurrencies([order],r,period);
 assert.deepEqual(v,{cash:2680000,total:3200000,shipping:520000,current:520000,recovered:2160000,discount:250000,revenue:2500000,damages:140000});
 assert.equal(v.cash+v.shipping,v.total);assert.equal(v.current+v.recovered,v.cash);
 const rows=accountingSummaryRows([order],r,period);assert.equal(rows.length,9);assert.equal(rows[5][2],'Chỉ theo dõi USD');
 const sep=periodDashboard([order],'2026-09','2026-10-18'),oct=periodDashboard([order],'2026-10','2026-10-18');
 for(const key of ['paid','shippingPaid','damages'])assert.equal(r[key],sep[key]+oct[key]);
});
test('legacy missing rates never silently produce partial VND totals',()=>{
 const o=structuredClone(order);delete o.accountingApproval.exchangeRate;delete o.payments[1].exchangeRate;delete o.compensations[0].exchangeRate;
 const r=periodDashboard([o],period,'2026-10-18'),v=accountingCurrencies([o],r,period);
 for(const k of ['revenue','discount','total','cash','recovered','damages'])assert.equal(v[k],null,k);
 assert.equal(v.shipping,520000);assert.equal(v.current,520000);
});
test('manual approval and compensation rates validated before mutation, stored independently',()=>{
 const o={...structuredClone(order),stage:2,payments:[{id:'p',amount:120,confirmed:false}]};delete o.accountingApproval;
 const body={paymentStatus:'full',receipts:[{id:'p',amount:120,exchangeRate:26000}],approvalExchangeRate:-1};
 assert.throws(()=>applyAccounting(o,{role:'accounting'},'accounting-approve',body,()=>{}));assert.equal(o.stage,2);assert.equal(o.payments[0].confirmed,false);
 body.approvalExchangeRate=25000;applyAccounting(o,{role:'accounting'},'accounting-approve',body,()=>{});assert.equal(o.accountingApproval.exchangeRate,25000);assert.equal(o.payments[0].exchangeRate,26000);
 const n=o.compensations.length;assert.throws(()=>applyCompensation(o,{role:'sale'},'compensation-add',{amount:5,date:'2026-09-01',text:'Loss',exchangeRate:-1},()=>{}));assert.equal(o.compensations.length,n);
 applyCompensation(o,{role:'sale'},'compensation-add',{amount:5,date:'2026-09-01',text:'Loss',exchangeRate:28000},()=>{});assert.equal(o.compensations.at(-1).exchangeRate,28000);
});
test('Excel summary and PDF contain the same nine USD/VND values and escape labels',async()=>{
 const r=periodDashboard([order],period,'2026-10-18');const b=new ExcelJS.Workbook();await b.xlsx.load(await reportWorkbook(periodDashboardCSV([order],period,'2026-10-18',true),accountingSummaryCSV([order],r,period)));
 assert.equal(b.worksheets.length,2);const s=b.getWorksheet('Tổng hợp');assert.equal(s.rowCount,10);assert.equal(s.getCell('C2').value,250000);assert.equal(s.getCell('C7').value,'Chỉ theo dõi USD');assert.equal(s.getCell('C10').value,140000);
 const html=accountingPrintHTML([order],r,period,'<script>x</script>');assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('Tổng thu phí vận chuyển'));assert.ok(html.includes('140.000'));assert.ok(!html.includes('<script>'));
});
