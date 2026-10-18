import {test} from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import {readPriceWorkbook,priceHeaders,colorHeaders} from '../price-workbook.js';
async function workbook(edit){const b=new ExcelJS.Workbook(),s=b.addWorksheet('BangGia');s.addRow(priceHeaders);s.addRow(['Premium','New Weft','','',10,25,'black','100g',50,'']);const c=b.addWorksheet('MauSac');c.addRow(colorHeaders);c.addRow(['#NEW','Brown','']);edit?.(b,s);return b.xlsx.writeBuffer()}
test('standard XLSX parses new products and colors and cached formula results',async()=>{
 const result=await readPriceWorkbook(await workbook((b,s)=>s.getCell('I2').value={formula:'25*2',result:50}));
 assert.equal(result.rows.length,2);assert.equal(result.rows[0].price,50);assert.equal(result.rows[1].code,'#NEW');
});
test('XLSX refuses bad headers, foreign sheets, missing formula values and extra data',async()=>{
 for(const edit of [(b,s)=>s.getCell('A1').value='wrong',(b,s)=>s.getCell('I2').value={formula:'25*2'},b=>b.addWorksheet('Unknown'),(b,s)=>s.getCell('K2').value=100]){const buffer=await workbook(edit);await assert.rejects(()=>readPriceWorkbook(buffer));}
});

test('standard workbook accepts old and new Basic segment labels',async()=>{
 for(const label of ['Double Drawn','Basic']){
  const result=await readPriceWorkbook(await workbook((b,s)=>{s.getCell('A2').value='Basic';s.getCell('C2').value=label}));
  assert.equal(result.rows[0].segment,'Basic');assert.equal(result.rows[0].price,50);
 }
});
