import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {releaseDeletedUserCode} from '../user-code-reuse.js';
function fixture(data={customers:[],orders:[]}){const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE users(id TEXT PRIMARY KEY,code TEXT UNIQUE,original_code TEXT,deleted_at TEXT);CREATE TABLE workspace(id INTEGER PRIMARY KEY,data TEXT);INSERT INTO users VALUES('old','HQ-SL',NULL,'2026-11-05')");db.prepare('INSERT INTO workspace VALUES(1,?)').run(JSON.stringify(data));return db}
test('reuse preserves deleted identity and original code while freeing unique code',()=>{const db=fixture();try{const result=releaseDeletedUserCode(db,'HQ-SL');assert.equal(result.id,'old');db.prepare('INSERT INTO users VALUES(?,?,NULL,NULL)').run('new','HQ-SL');assert.equal(db.prepare('SELECT original_code FROM users WHERE id=?').get('old').original_code,'HQ-SL');assert.throws(()=>releaseDeletedUserCode(db,'HQ-SL'),{status:409});}finally{db.close()}});
test('references including reassigned customer and order codes block reuse',()=>{for(const data of [{customers:[{id:'HQ-SL-1',ownerId:'other'}]},{orders:[{orderCode:'HQ-SL-1-2',ownerId:'other'}]},{orders:[{ownerId:'old'}]},{customers:[{ownerId:'old'}]}]){const db=fixture(data);try{assert.throws(()=>releaseDeletedUserCode(db,'HQ-SL'),{status:409});assert.equal(db.prepare('SELECT code FROM users').get().code,'HQ-SL')}finally{db.close()}}});
test('failed account creation rolls code release back atomically',()=>{const db=fixture();try{db.exec('BEGIN');releaseDeletedUserCode(db,'HQ-SL');db.exec('ROLLBACK');assert.equal(db.prepare('SELECT code FROM users').get().code,'HQ-SL');assert.equal(releaseDeletedUserCode(db,'HQ-NEW'),null)}finally{db.close()}});
import express from 'express';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createWorkspace,hashPassword} from '../workspace-server.js';
test('manager can create Solar with deleted Selena code without reviving old identity',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'hq-reuse-'));let server,db;
 try{
 const work=await createWorkspace(dir);db=work.db;const password=await hashPassword('TestPassword123');
 for(const [id,code,role] of [['admin','QT-AD','manager'],['old','HQ-SL','sale']])db.prepare('INSERT INTO users(id,email,name,code,role,password,must_change) VALUES(?,?,?,?,?,?,0)').run(id,id+'@test.com',id,code,role,password);
 db.prepare('UPDATE users SET active=0,deleted_at=? WHERE id=?').run('2026-11-05','old');
 const app=express();app.use(express.json());app.use(work.router);app.use((e,q,r,n)=>r.status(e.status||500).json({error:e.message}));server=app.listen(0);await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const login=await fetch(base+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@test.com',password:'TestPassword123'})});const session=await login.json();const headers={'Content-Type':'application/json',Cookie:login.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':session.csrf};
 const body={name:'Solar',email:'solar@test.com',code:'HQ-SL',role:'sale',password:'TestPassword123'};
 const result=await fetch(base+'/users',{method:'POST',headers,body:JSON.stringify(body)});assert.equal(result.status,200,await result.clone().text());const users=await result.json();const solar=users.find(u=>u.code==='HQ-SL');assert.ok(solar);assert.notEqual(solar.id,'old');assert.ok(!users.some(u=>u.id==='old'));assert.equal(db.prepare('SELECT active FROM users WHERE id=?').get('old').active,0);
 const repeated=await fetch(base+'/users',{method:'POST',headers,body:JSON.stringify({...body,email:'other@test.com'})});assert.equal(repeated.status,409);
 assert.ok(db.prepare("SELECT * FROM audit WHERE action='user-code-reuse'").get());
 }finally{if(server)await new Promise(r=>server.close(r));db?.close();rmSync(dir,{recursive:true,force:true})}
});
