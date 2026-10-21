import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,readdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {renumberJudyCustomers,migrateCustomerNumbering,customerNumberingMigration} from '../customer-numbering.js';
const fixture=()=>({customers:[3,4,5,6].map(n=>({id:`HQ-JD-${n}`,version:2,phone:String(n)})),orders:[3,4,5].map(n=>({id:`stable-${n}`,customerId:`HQ-JD-${n}`,orderCode:`HQ-JD-${n}-1`,version:4,payments:[{amount:50}],messages:[{images:[{id:'image'}]}],history:[]})),catalog:[]});
test('Customer renumbering updates overlapping IDs simultaneously and keeps all order attachments',()=>{
 const data=fixture(),before=structuredClone(data);data.orders.push({id:'draft',customerId:'HQ-JD-6',draftCode:'Draft-HQ-JD-6-1',stage:0});
 assert.equal(renumberJudyCustomers(data).length,4);
 assert.deepEqual(data.customers.map(c=>c.id),['HQ-JD-1','HQ-JD-2','HQ-JD-3','HQ-JD-4']);
 data.orders.slice(0,3).forEach((o,i)=>{assert.equal(o.id,before.orders[i].id);assert.equal(o.customerId,`HQ-JD-${i+1}`);assert.equal(o.orderCode,`HQ-JD-${i+1}-1`);assert.deepEqual(o.payments,before.orders[i].payments);assert.deepEqual(o.messages,before.orders[i].messages);assert.equal(o.version,5)});
 assert.equal(data.orders[3].draftCode,'Draft-HQ-JD-4-1');assert.deepEqual(renumberJudyCustomers(data),[]);
});
test('Unexpected gaps and orphaned links stop migration',()=>{
 const data=fixture();data.customers.splice(1,1);assert.throws(()=>renumberJudyCustomers(data),/sequence/);
 const orphan=fixture();orphan.orders.push({customerId:'HQ-JD-1'});assert.throws(()=>renumberJudyCustomers(orphan),/Orphaned/);
});
test('Migration backs up, audits, resets the next number to 5, expires stale forms and runs once',t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'hq-numbering-')),db=new DatabaseSync(path.join(dir,'workspace.sqlite'));
 t.after(()=>{db.close();rmSync(dir,{recursive:true,force:true})});
 db.exec("CREATE TABLE app_migrations(id TEXT PRIMARY KEY);CREATE TABLE workspace(id INTEGER PRIMARY KEY,data TEXT);CREATE TABLE users(id TEXT,code TEXT);CREATE TABLE sequences(key TEXT PRIMARY KEY,value INTEGER);CREATE TABLE auth_sessions(token TEXT);INSERT INTO users VALUES ('judy','HQ-JD');INSERT INTO sequences VALUES ('customer:judy',6);INSERT INTO auth_sessions VALUES ('old-session')");
 db.prepare('INSERT INTO workspace VALUES (1,?)').run(JSON.stringify(fixture()));let events=0;
 migrateCustomerNumbering(db,dir,()=>events++);migrateCustomerNumbering(db,dir,()=>events++);
 assert.equal(events,1);assert.equal(db.prepare('SELECT value FROM sequences').get().value,4);assert.equal(db.prepare('SELECT count(*) n FROM auth_sessions').get().n,0);assert.ok(db.prepare('SELECT id FROM app_migrations WHERE id=?').get(customerNumberingMigration));
 const copy=new DatabaseSync(path.join(dir,'identity-backups',readdirSync(path.join(dir,'identity-backups'))[0]),{readOnly:true});try{assert.deepEqual(JSON.parse(copy.prepare('SELECT data FROM workspace').get().data),fixture())}finally{copy.close()}
});

test('Emily correction is scoped and preserves payments, stable IDs and prior identity',()=>{
 const data={customers:[{id:'HQ-EM-3'},{id:'HQ-JD-1'}],orders:[{id:'stable',customerId:'HQ-EM-3',orderCode:'HQ-EM-3-1',payments:[{amount:725}]}]};
 const map=renumberJudyCustomers(data,'HQ-EM');assert.deepEqual(map,[{before:'HQ-EM-3',after:'HQ-EM-1'}]);
 assert.equal(data.orders[0].orderCode,'HQ-EM-1-1');assert.equal(data.orders[0].id,'stable');assert.equal(data.orders[0].payments[0].amount,725);assert.equal(data.customers[1].id,'HQ-JD-1');assert.deepEqual(data.customers[0].previousIds,['HQ-EM-3']);
});
