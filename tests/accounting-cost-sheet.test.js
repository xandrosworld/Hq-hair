import test from 'node:test';
import assert from 'node:assert/strict';
import {costOrders,costSheetPlan,costExpansionRequests} from '../accounting-cost-sheet.js';
const cell=v=>({userEnteredValue:{[typeof v==='number'?'numberValue':'stringValue']:v},effectiveValue:{[typeof v==='number'?'numberValue':'stringValue']:v}});
function grid(){return Array.from({length:12},(_,m)=>[
 [cell(`THÁNG ${String(m+1).padStart(2,'0')}/2026`)],
 [cell('STT'),cell('Mã đơn hàng')],
 [cell(1),{},{},{userEnteredValue:{formulaValue:'=VLOOKUP(C3,A:B,2,FALSE())'}}],
 [cell(2),{},{},{userEnteredValue:{formulaValue:'=VLOOKUP(C4,A:B,2,FALSE())'}}],
 [cell('TỔNG THÁNG')],[]
]).flat();}
const order=(id,month=10)=>({id,code:'HQ-JD-'+id,sale:'HQ-JD',date:`2026-${String(month).padStart(2,'0')}-18`,month,cancelled:false});
function apply(g,plan){for(const q of plan.requests){const u=q.updateCells;u.rows.forEach((r,i)=>r.values.forEach((v,j)=>{g[u.start.rowIndex+i]??=[];g[u.start.rowIndex+i][u.start.columnIndex+j]={...v,effectiveValue:v.userEnteredValue};}));}return g;}
test('approval month uses first approval in Vietnam; drafts and other years excluded',()=>{
 const orders=[{id:'a',orderCode:'A',ownerId:'u',approvedAt:'2026-09-30T18:00:00Z'},{id:'b',orderCode:'B',ownerId:'u',approvedAt:'2026-11-01',history:[{title:'Kế toán duyệt',time:'2026-10-15'}]},{id:'draft'},{id:'old',orderCode:'OLD',approvedAt:'2025-10-01'}];
 const result=costOrders(orders,[{id:'u',code:'HQ-JD'}],2026);
 assert.deepEqual(result.map(r=>r.month),[10,10]);assert.equal(result[0].date,'2026-10-01');
});
test('sync is idempotent and new orders never move or overwrite manually entered costs',()=>{
 const g=grid(),orders=[order('2')];apply(g,costSheetPlan(orders,g,2026));
 g[56][5]=cell('Cost note');g[56][6]=cell(123456);g[56][7]=cell('Supplier');g[56][8]=cell('Đã thanh toán');
 const before=structuredClone(g[56]);const plan=costSheetPlan([order('1'),...orders],g,2026);apply(g,plan);
 assert.deepEqual(g[56],before);assert.equal(g[57][1].effectiveValue.stringValue,'HQ-JD-1');
 assert.equal(costSheetPlan([order('1'),...orders],g,2026).requests.length,0);
});
test('stable CRM id follows renamed code and cancelled orders retain cost',()=>{
 const g=grid();apply(g,costSheetPlan([order('1')],g,2026));g[56][6]=cell(90);
 apply(g,costSheetPlan([{...order('1'),code:'NEW-CODE',cancelled:true}],g,2026));
 assert.equal(g[56][1].effectiveValue.stringValue,'NEW-CODE');assert.match(g[56][1].note,/đã hủy/);assert.equal(g[56][6].effectiveValue.numberValue,90);
 assert.throws(()=>costSheetPlan([order('1',11)],g,2026),/month changed/);
});
test('manual unlinked rows are reserved; capacity expansion inserts inside existing sum range',()=>{
 const g=grid();g[56][6]=cell(0);g[57][5]=cell('Reserved');
 const plan=costSheetPlan([order('1')],g,2026);assert.equal(plan.expansions.length,1);assert.equal(plan.requests.length,0);
 const qs=costExpansionRequests(plan.expansions);assert.equal(qs[0].insertDimension.range.startIndex,57);
 assert.deepEqual(qs.filter(q=>q.copyPaste).map(q=>q.copyPaste.pasteType),['PASTE_FORMAT','PASTE_DATA_VALIDATION']);
 assert.ok(qs.filter(q=>q.updateCells).every(q=>[0,3].includes(q.updateCells.start.columnIndex)));
});
test('malformed layout, duplicate identity and ambiguous manual orders fail before writes',()=>{
 const g=grid();g[56][1]=cell('HQ-JD-1');g[57][1]=cell('HQ-JD-1');
 assert.throws(()=>costSheetPlan([order('1')],g,2026),/Ambiguous/);
 assert.throws(()=>costSheetPlan([],[],2026),/layout/);
 assert.throws(()=>costOrders([{id:'a',orderCode:'X',ownerId:'u'}],[{id:'u',code:'HQ-JD'}],2026),/date/);
});
