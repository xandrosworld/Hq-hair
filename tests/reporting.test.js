import {totals} from '../shared.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validDate,monthlySeries,customerActivity,reportOrders,financialSummary,reportCSV,csvCell} from '../reporting.js';
import {validateOrder} from '../src/order-validation.js';
const order=(id,date,customerId='c1',extra={})=>({id,orderCode:id,date,approvedAt:date,customerId,stage:3,ownerId:'a',sale:'Sale A',items:[{kind:'base',unit:'Gram',priceBasis:'100g',qty:800,price:98.5}],payments:[],...extra});
test('strict calendar dates and fractional gram validation agree',()=>{
 for(const date of ['2026-02-30','2026-02-29','2026-13-01','2026-1-01','invalid',null])assert.equal(validDate(date),false);
 for(const date of ['2024-02-29','2026-12-31'])assert.equal(validDate(date),true);
 const o={...order('a','2026-02-28'),due:'2026-03-01',discount:0,shippingFee:0,paymentFee:0,recipient:'Buyer',phone:'12345678',address:'Address',country:'Vietnam',items:[{name:'Bulk',kind:'base',unit:'Gram',qty:0.5,price:10,priceBasis:'100g',origin:'Raw Hair',lengthCm:50,texture:'Natural Straight',segment:'Premium',color:'1B'}]};
 o.payments=[{sender:'Buyer',method:'Wise',date:'2026-02-28'}];
 assert.deepEqual(validateOrder(o,{submit:true}),{});
 assert.ok(validateOrder({...o,date:'2026-02-30'},{submit:true}).date);
 assert.ok(validateOrder({...o,paymentDue:'2026-02-27'}).paymentDue);
});
test('monthly reports separate years and ignore drafts and invalid dates',()=>{
 const rows=[order('a','2025-01-01'),order('b','2026-01-01'),order('c','2026-12-31'),order('d','2026-01-02','c1',{stage:0}),order('e','2026-02-30')];
 assert.deepEqual(monthlySeries(rows,2026,'count'),[1,0,0,0,0,0,0,0,0,0,0,1]);
 assert.equal(monthlySeries(rows,2025,'revenue')[0],788);
});
test('new and returning customers deduplicate within month and retain prior-year history',()=>{
 const rows=[order('d','2026-02-02'),order('a','2025-12-31'),order('c','2026-01-02','c2'),order('b','2026-01-01','c2'),order('e','2026-01-03','c2'),order('f','2026-01-01','draft',{stage:0})];
 const result=customerActivity(rows,2026,[{id:'c1',created:'2025-12-01'},{id:'c2',created:'2026-01-01'}],'2026-12-31');
 assert.deepEqual(result[0],{month:1,newCustomers:1,returning:1,orders:3});
 assert.deepEqual(result[1],{month:2,newCustomers:0,returning:1,orders:1});
});
test('financial reports never offset debt between orders or count pending receipts as paid',()=>{
 const rows=[order('a','2026-01-01','c1',{payments:[{amount:900,confirmed:true}]}),order('b','2026-01-02','c1',{payments:[{amount:100,confirmed:true},{amount:200,confirmed:false}]}),order('draft','2026-01-03','c1',{stage:0})];
 const sum=financialSummary(rows);
 assert.equal(sum.revenue,1576);assert.equal(sum.paid,1000);assert.equal(sum.pending,200);assert.equal(sum.debt,688);
});
test('CSV uses exact filtered rows and escapes spreadsheet formulas, quotes and newlines',()=>{
 const data={customers:[{id:'c1',name:'=HYPERLINK("bad")'}],orders:[order('a','2026-01-01'),order('b','2026-02-01'),order('c','2026-01-01','c1',{ownerId:'b'}),order('draft','2026-01-01','c1',{stage:0})]};
 const rows=reportOrders(data,{month:'2026-01',owner:'a',query:'HYPERLINK'});
 assert.deepEqual(rows.map(o=>o.id),['a']);
 const csv=reportCSV(rows,data.customers);assert.ok(csv.startsWith('\uFEFF'));assert.equal(csv.split('\r\n').length,2);assert.ok(csv.includes("' =")==false);assert.ok(csv.includes("'=HYPERLINK"));assert.ok(!csv.includes('"b"'));
 for(const input of ['=1','+1','-1','@a','  =1','\ttext'])assert.ok(csvCell(input).startsWith('"\''));
 assert.equal(csvCell('a"b'),'"a""b"');assert.equal(csvCell(null),'""');
});

test('Customer payment mapping: revenue receipts exclude shipping, debt uses gross receipts and total',()=>{
 const sample=order('sample','2026-10-01','c1',{items:[{kind:'base',qty:500,price:160,unit:'Gram',priceBasis:'100g'}],discount:30,shippingFee:85,paymentFee:0});
 for(const [paid,net,debt] of [[0,0,855],[50,0,805],[84,0,771],[85,0,770],[85.01,0.01,769.99],[86,1,769],[500,415,355],[855,770,0],[900,815,0]]){
  const o={...sample,payments:[{amount:paid,confirmed:true},{amount:999,confirmed:false}]};
  const t=totals(o);assert.equal(t.revenue,770);assert.equal(t.total,855);assert.equal(t.paid,paid);assert.equal(t.revenuePaid,net);assert.equal(t.debt,debt);
  const sum=financialSummary([o,{...o,stage:0},{...o,cancelledAt:'2026-10-02'}]);
  assert.equal(sum.revenuePaid,net);assert.equal(sum.debt,debt);
  assert.equal(monthlySeries([o],2026,'revenuePaid')[9],net);
  const csv=reportCSV([o],[{id:'c1',name:'Buyer'}]);assert.ok(csv.includes('"770","855",'+csvCell(net)+','+csvCell(paid)+',"85","30","0",'+csvCell(debt)));
 }
 const legacy=totals({...sample,paymentFee:15,payments:[{amount:500,confirmed:true}]});assert.equal(legacy.total,870);assert.equal(legacy.debt,370);
});
