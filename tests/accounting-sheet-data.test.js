import test from 'node:test';
import assert from 'node:assert/strict';
import {accountingSheetData,sheetSaleCodes} from '../accounting-sheet-data.js';
const users=sheetSaleCodes.map((code,i)=>({id:String(i),code,role:'sale',name:code}));
const order={id:'o',ownerId:'0',orderCode:'HQ-JD-1-1',stage:8,approvedAt:'2026-09-01',accountingApproval:{exchangeRate:25000},items:[{kind:'base',qty:1,price:110}],discount:10,shippingFee:20,payments:[{amount:40,confirmed:true,confirmedAt:'2026-09-02',exchangeRate:26000},{amount:50,confirmed:true,confirmedAt:'2026-10-02'}]};
test('monthly export preserves lifetime debt, shipping allocation and missing rates',()=>{
 const data=accountingSheetData([order],users,2026,'2026-10-28');
 assert.equal(data.rows.length,40);
 const sep=data.rows.find(r=>r.key==='2026-09:HQ-JD'),oct=data.rows.find(r=>r.key==='2026-10:HQ-JD');
 assert.equal(sep.usd.listed,110);assert.equal(sep.vnd.listed,2750000);
 assert.equal(sep.usd.shipping,20);assert.equal(sep.usd.current,20);assert.equal(sep.usd.debt,80);
 assert.equal(oct.usd.shipping,0);assert.equal(oct.usd.current,0);assert.equal(oct.usd.recovered,50);assert.equal(oct.usd.debt,30);
 assert.equal(oct.vnd.total,null);assert.equal(oct.vnd.recovered,null);assert.equal(oct.vnd.shipping,0);
 assert.deepEqual(accountingSheetData([order],users,2026,'2026-10-28'),data);
});
test('corrected receipt refresh replaces values and rates without duplicate accumulation',()=>{
 const changed=structuredClone(order);changed.payments[1].amount=60;changed.payments[1].exchangeRate=27000;
 const row=accountingSheetData([changed],users,2026,'2026-10-28').rows.find(r=>r.key==='2026-10:HQ-JD');
 assert.equal(row.usd.recovered,60);assert.equal(row.vnd.recovered,1620000);assert.equal(row.usd.debt,20);
});
test('unmapped roster and future years stop rather than writing wrong employee totals',()=>{
 assert.throws(()=>accountingSheetData([],users.slice(1),2026,'2026-10-28'));
 assert.throws(()=>accountingSheetData([],users,2027,'2026-10-28'));
});
