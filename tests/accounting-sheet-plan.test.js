import test from 'node:test';
import assert from 'node:assert/strict';
import {accountingSheetPlan} from '../accounting-sheet-plan.js';
const row={key:'2026-10:HQ-JD',month:10,code:'HQ-JD',usd:{listed:100,discount:0,shipping:20,total:80,current:10,recovered:50,debt:40},vnd:{listed:2500000,discount:0,shipping:500000,total:null,cash:null,recovered:null}};
test('maps reordered employees, clears missing VND, excludes recovery from new revenue',()=>{
 const grid=[['','Tháng 10','HQ-SL'],['','Tháng 10','HQ-JD']];
 const [plan]=accountingSheetPlan({rows:[row]},grid);
 assert.equal(plan.range,"'05_Dữ liệu CRM'!E2:Q2");
 assert.deepEqual(plan.values[0],[2500000,0,500000,'','','',40,100,0,20,80,10,50]);
 assert.deepEqual(accountingSheetPlan({rows:[row]},grid),[plan]);
});
test('missing or duplicate identity aborts whole plan',()=>{
 assert.throws(()=>accountingSheetPlan({rows:[row]},[]));
 assert.throws(()=>accountingSheetPlan({rows:[row]},[['','Tháng 10','HQ-JD'],['','Tháng 10','HQ-JD']]));
});
