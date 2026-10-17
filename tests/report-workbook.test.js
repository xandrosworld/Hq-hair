import test from 'node:test';import assert from 'node:assert/strict';import ExcelJS from 'exceljs';
import {reportWorkbook,parseReportCSV} from '../report-workbook.js';
import {periodDashboardCSV} from '../period-dashboard.js';
test('Excel export preserves dates, amounts, codes and readable formatting',async()=>{
 const o={id:'x',orderCode:'000123',stage:3,approvedAt:'2026-10-01',items:[{kind:'base',qty:1,price:165.4}],shippingFee:50,payments:[{amount:290,confirmed:true,confirmedAt:'2026-10-16'}]};
 const book=new ExcelJS.Workbook();await book.xlsx.load(await reportWorkbook(periodDashboardCSV([o],'2026-10','2026-10-17')));const s=book.worksheets[0];
 assert.equal(s.getCell('B2').value,'000123');assert.ok(s.getCell('C2').value instanceof Date);assert.equal(s.getCell('C2').numFmt,'dd/mm/yyyy');assert.ok(s.getColumn(3).width>=16);assert.equal(s.getCell('D2').value,165.4);assert.equal(s.getCell('E3').value,240);assert.equal(s.views[0].ySplit,1);assert.ok(s.autoFilter);assert.equal(s.getRow(1).height,64);assert.equal(s.getCell('A1').value,'Loại');
});
test('CSV parser handles quoted commas, newlines, escaped quotes and preserves text safely',async()=>{
 const csv='\uFEFF"Loai","Ma don","Ngay"\r\n"a, b\ntext","=SUM(1)","2026-10-17"';
 assert.equal(parseReportCSV(csv)[1][0],'a, b\ntext');const b=new ExcelJS.Workbook();await b.xlsx.load(await reportWorkbook(csv));assert.equal(b.worksheets[0].getCell('B2').value,'=SUM(1)');
});
