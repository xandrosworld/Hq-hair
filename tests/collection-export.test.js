import test from 'node:test';import assert from 'node:assert/strict';
import {accountingReceiptCSV,accountingCollectionSummaryCSV} from '../accounting-export.js';
import {periodDashboard} from '../period-dashboard.js';import {parseReportCSV,reportWorkbook} from '../report-workbook.js';import ExcelJS from 'exceljs';import {countries,countryLabels} from '../countries.js';
test('collection export reconciles receipts, shipping and recovery across months',async()=>{
 const o={id:'a',orderCode:'0001',sale:'Judy',stage:8,approvedAt:'2026-09-01',items:[{kind:'base',qty:1,price:100}],shippingFee:20,payments:[{id:'p1',amount:40,confirmed:true,confirmedAt:'2026-09-02',exchangeRate:25000},{id:'p2',amount:80,confirmed:true,confirmedAt:'2026-10-02',exchangeRate:26000},{id:'p3',amount:50,confirmed:false}]};
 const period={from:'2026-09-01',to:'2026-10-18'},report=periodDashboard([o],period,'2026-10-18'),csv=accountingReceiptCSV([o],report),rows=parseReportCSV(csv);
 assert.equal(rows.length,3);assert.equal(rows[1][0],'Thanh toán đơn hàng');assert.equal(rows[2][0],'Thu hồi công nợ');assert.deepEqual(rows[1].slice(5,9),['40','20','0','20']);assert.deepEqual(rows[2].slice(5,9),['80','0','80','0']);
 const summary=accountingCollectionSummaryCSV([o],report,period);assert.equal(parseReportCSV(summary)[1][0],'Tổng thu');
 const wb=new ExcelJS.Workbook();await wb.xlsx.load(await reportWorkbook(csv,summary));assert.ok(wb.getWorksheet('Chi tiết').getCell('D2').value instanceof Date);assert.equal(wb.getWorksheet('Chi tiết').getCell('B2').value,'0001');assert.equal(wb.getWorksheet('Tổng hợp').getCell('B2').value,120);
});
test('customer and shipping catalog covers previously missing destinations',()=>{assert.ok(countries.length>=249);for(const name of ['Latvia','Lithuania','Pakistan','Bangladesh','Peru'])assert.ok(countryLabels[name]);assert.equal(new Set(countries).size,countries.length)});
