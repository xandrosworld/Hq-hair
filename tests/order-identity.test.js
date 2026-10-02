import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateOrderIdentity,assignOrderCode,isOfficialOrder,orderLabel} from '../order-identity.js';
import {buyerStatistics} from '../list-statistics.js';
import {monthlySeries,financialSummary,reportOrders,reportCSV,customerActivity} from '../reporting.js';
import {createWorkspace} from '../workspace-server.js';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('persisted migration runs once and preserves request IDs, QC and history',async()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'hq-identity-'));
 let db=new DatabaseSync(path.join(dir,'workspace.sqlite'));
 try{
  const old={customers:[],catalog:[],orders:[{id:'c-1',customerId:'c',stage:3,accountingApproval:{status:'partial'},qc:{note:'Keep QC'},history:[]},{id:'c-2',customerId:'c',stage:2,history:[]}]};
  db.exec('CREATE TABLE workspace(id INTEGER PRIMARY KEY,data TEXT NOT NULL)');
  db.prepare('INSERT INTO workspace VALUES (1,?)').run(JSON.stringify(old));db.close();
  ({db}=await createWorkspace(dir));
  const read=()=>JSON.parse(db.prepare('SELECT data FROM workspace').get().data);
  const first=read();assert.deepEqual(first.orders.map(o=>o.id),['c-1','c-2']);
  assert.deepEqual(first.orders[0].qc,old.orders[0].qc);assert.equal(first.orders[0].orderCode,'c-1');assert.equal(first.orders[1].orderCode,null);
  // A subsequent stage edit cannot become an approval on the next restart.
  first.orders[1].stage=8;db.prepare('UPDATE workspace SET data=?').run(JSON.stringify(first));db.close();
  ({db}=await createWorkspace(dir));assert.equal(read().orders[1].orderCode,null);
  assert.equal(db.prepare("SELECT count(*) AS n FROM audit WHERE action='order-code-migration'").get().n,1);
 }finally{db.close();if(!path.resolve(dir).startsWith(path.resolve(tmpdir())+path.sep))throw Error('Unsafe cleanup');rmSync(dir,{recursive:true,force:true})}
});

test('legacy migration preserves approved codes and ignores stage adjustments without accounting evidence',()=>{
 const orders=[{id:'HQ-JD-1-4',customerId:'HQ-JD-1',stage:4,history:[{title:'Kế toán duyệt'}]},
  {id:'HQ-JD-1-5',stage:2},{id:'HQ-JD-1-6',stage:8,history:[{title:'Quản trị điều chỉnh trạng thái'}]},
  {id:'HQ-JD-1-7',stage:-1,cancelledAt:'now'}];
 migrateOrderIdentity(orders);
 assert.equal(orders[0].orderCode,'HQ-JD-1-4');
 assert.ok(orders.slice(1).every(o=>o.orderCode===null&&!isOfficialOrder(o)));
 assert.equal(orderLabel(orders[1]),'YC-HQ-JD-1-5');
 const before=structuredClone(orders);migrateOrderIdentity(orders);assert.deepEqual(orders,before);
 const next={id:'stable-uuid',customerId:'HQ-JD-1',stage:3,accountingApproval:{status:'partial',time:'now'}};
 orders.push(next);assignOrderCode(next,orders);assert.equal(next.orderCode,'HQ-JD-1-5');
 next.accountingApproval.status='full';assignOrderCode(next,orders);assert.equal(next.orderCode,'HQ-JD-1-5');assert.equal(next.id,'stable-uuid');
});

test('pending/cancelled requests never count as purchases; first and repeat approvals do',()=>{
 const customerId='c',customers=[{id:customerId}],orders=[0,2,-1,8].map((stage,i)=>({id:String(i),customerId,stage,date:'2026-10-01',orderCode:null,items:[{kind:'base',unit:'Piece',qty:1,price:100}],payments:[]}));
 orders[2].cancelledAt='now';
 assert.equal(buyerStatistics(customers,orders,'2026-10-02').total,0);
 assert.equal(monthlySeries(orders,2026,'count')[9],0);assert.equal(financialSummary(orders).revenue,0);
 assert.equal(reportOrders({customers,orders}).length,0);assert.equal(reportCSV(orders,customers).split('\r\n').length,1);
 assert.equal(customerActivity(orders,2026)[9].orders,0);
 const first=orders[1];first.stage=3;first.accountingApproval={status:'partial',time:'now'};assignOrderCode(first,orders);
 assert.equal(first.orderCode,'c-1');assert.equal(buyerStatistics(customers,orders,'2026-10-02').total,1);
 const second={...first,id:'other',orderCode:null,accountingApproval:{status:'full',time:'later'}};orders.push(second);assignOrderCode(second,orders);
 assert.equal(second.orderCode,'c-2');assert.equal(buyerStatistics(customers,orders,'2026-10-02').repeat,1);
 assert.equal(monthlySeries(orders,2026,'count')[9],2);assert.equal(financialSummary(orders).revenue,200);
 assert.ok(reportCSV(orders,customers).includes('"c-2"'));assert.equal(reportOrders({customers,orders},{query:'c-2'}).length,1);
});
