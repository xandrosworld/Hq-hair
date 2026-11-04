import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createWorkspace,hashPassword} from '../workspace-server.js';
import {passwordVault} from '../password-vault.js';
test('manager reveal, role and CSRF boundaries, reset and self-change stay consistent',async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'hq-vault-'));let server,db;
 try{
  const work=await createWorkspace(dir);db=work.db;
  for(const [id,role] of [['admin','manager'],['sale','sale']])db.prepare('INSERT INTO users(id,email,name,code,role,password,must_change) VALUES(?,?,?,?,?,?,0)').run(id,id+'@test.com',id,id,role,await hashPassword('OriginalPassword1'));
  const app=express();app.use(express.json());app.use('/api/work',work.router);app.use((e,q,r,n)=>r.status(e.status||500).json({error:e.message}));server=app.listen(0);await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api/work';
  async function login(email,password){const r=await fetch(base+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});const j=await r.json();return {cookie:r.headers.get('set-cookie').split(';')[0],'X-CSRF-Token':j.csrf,'Content-Type':'application/json'}}
  const admin=await login('admin@test.com','OriginalPassword1');let sale=await login('sale@test.com','OriginalPassword1');
  const post=(route,body,headers=admin)=>fetch(base+route,{method:'POST',headers,body:JSON.stringify(body)});
  assert.equal((await post('/users/sale/reveal-password',{},sale)).status,403);
  assert.equal((await post('/users/sale/reveal-password',{}, {...admin,'X-CSRF-Token':'wrong'})).status,403);
  assert.equal((await(await post('/users/sale/reveal-password',{})).json()).password,null);
  assert.equal((await post('/users',{id:'sale',active:true,password:'NewPassword123'})).status,200);
  assert.equal((await(await post('/users/sale/reveal-password',{})).json()).password,'NewPassword123');
  sale=await login('sale@test.com','NewPassword123');const changed=await post('/password',{currentPassword:'NewPassword123',password:'ChangedPassword456'},sale);assert.equal(changed.status,200);
  assert.equal((await(await post('/users/sale/reveal-password',{})).json()).password,'ChangedPassword456');
  const list=await(await fetch(base+'/users',{headers:admin})).text();assert.ok(!list.includes('ChangedPassword456'));assert.ok(!list.includes('password_cipher'));
  const row=db.prepare('SELECT * FROM users WHERE id=?').get('sale');assert.ok(!row.password_cipher.includes('ChangedPassword456'));
  const vault=passwordVault(dir,true);assert.equal(vault.open(row.password_cipher,'sale'),'ChangedPassword456');assert.throws(()=>vault.open(row.password_cipher,'admin'));
  assert.ok(!JSON.stringify(db.prepare('SELECT * FROM audit').all()).includes('ChangedPassword456'));
 }finally{if(server)await new Promise(r=>server.close(r));db?.close();assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));rmSync(dir,{recursive:true,force:true})}
});
