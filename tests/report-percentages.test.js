import test from 'node:test';
import assert from 'node:assert/strict';
import {buyerGroupShares,percentageOf,percentageText,financialShareText} from '../report-percentages.js';
const customers=[{id:'a',group:'Salon'},{id:'b',group:'Wholesale'},{id:'c',group:'Khách lẻ'},{id:'d',group:'Start Business'}];
const approved=(id,customerId,date)=>({id,customerId,orderCode:id,stage:3,approvedAt:date});
test('Buyer group shares count distinct approved buyers, exclude pending/cancelled/future and honor visibility',()=>{
 const orders=[approved('1','a','2026-09-01'),approved('2','a','2026-10-01'),approved('3','b','2026-10-02'),{...approved('4','c','2026-09-01'),cancelledAt:'2026-09-02'},approved('5','d','2026-12-01'),{...approved('6','d','2026-09-01'),orderCode:null,stage:2},approved('7','hidden','2026-09-01')];
 const all=buyerGroupShares(customers,orders,'2026-10-16');assert.equal(all.total,2);assert.deepEqual(all.groups.map(g=>[g.count,g.percent]),[[0,0],[0,0],[1,50],[1,50]]);
 const sep=buyerGroupShares(customers,orders,'2026-09-30');assert.equal(sep.total,1);assert.equal(sep.groups[2].percent,100);assert.equal(sep.groups[3].percent,0);
 assert.equal(buyerGroupShares(customers.slice(0,1),orders,'2026-10-16').total,1);
 assert.ok(buyerGroupShares(customers,[],'2026-10-16').groups.every(g=>g.count===0&&g.percent===null));
});
test('Percentages use order revenue, retain values over 100 and handle a zero base explicitly',()=>{
 assert.equal(percentageText(percentageOf(1333.9,1237)),'107,83%');
 assert.equal(percentageText(percentageOf(19,1237)),'1,54%');
 assert.equal(percentageText(percentageOf(0,1237)),'0%');
 assert.equal(percentageText(percentageOf(50,0)),'—');
 assert.equal(percentageOf(50,-1),null);assert.equal(percentageOf(Infinity,10),null);
});

test('Discount share uses pre-discount goods revenue while cash shares retain net revenue',()=>{
 const report={revenue:1237,discount:19};
 assert.equal(financialShareText('discount',19,report),'1,51% so với doanh thu niêm yết');
 assert.equal(financialShareText('cash',1333.9,report),'107,83% so với doanh thu thuần');
 assert.equal(financialShareText('discount',100,{revenue:0,discount:100}),'100% so với doanh thu niêm yết');
 assert.equal(financialShareText('discount',0,{revenue:0,discount:0}),'— · Chưa có doanh thu niêm yết để tính %');
});
