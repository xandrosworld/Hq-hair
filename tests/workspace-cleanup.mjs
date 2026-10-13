import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import os from 'node:os';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {standardsFixture} from './standards-fixture.mjs';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-cleanup-ui-')),base='http://127.0.0.1:3198',standardsDir=await standardsFixture(dir);
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3198',DATA_DIR:dir,HQ_STANDARDS_DIR:standardsDir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
let browser;
function client(){return {cookie:'',csrf:'',async call(url,body,status=200){const r=await fetch(base+'/api/work'+url,{method:body?'POST':'GET',headers:{Cookie:this.cookie,...(body?{'Content-Type':'application/json','X-CSRF-Token':this.csrf,'Idempotency-Key':randomUUID()}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();assert.equal(r.status,status,JSON.stringify(data));if(r.headers.get('set-cookie'))this.cookie=r.headers.get('set-cookie').split(';')[0];if(data.csrf)this.csrf=data.csrf;return data}}}
try{
 for(let i=0;i<150;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 const admin=client(),sale=client(),anon=client();await anon.call('/cleanup-preview?mode=all',undefined,401);
 await admin.call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});await admin.call('/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 await admin.call('/users',{name:'Sale',email:'sale@example.com',role:'sale',password:'Initial-Password-2026'});await sale.call('/login',{email:'sale@example.com',password:'Initial-Password-2026'});await sale.call('/password',{currentPassword:'Initial-Password-2026',password:'Sale-New-Password-2026'});
 await sale.call('/cleanup-preview?mode=all',undefined,403);await sale.call('/cleanup',{mode:'all'},403);
 const c={name:'Cleanup Sample',country:'United States',group:'Salon',phone:'+1234567',address:'123 Test Road',recipient:'Buyer',recipientPhone:'+1234567',social:'https://wa.me/1234567',source:'Website',purchase:'First'};
 let state=await sale.call('/customers',c);const customer=state.customers[0];
 await sale.call('/orders',{customerId:customer.id,date:'2026-10-13',items:[],payments:[],shippingFee:0,paymentFee:0,discount:0});
 const p=await admin.call('/cleanup-preview?mode=all');assert.equal(p.orders,1);assert.equal(p.customers,1);
 await admin.call('/cleanup',{...p,password:'wrong'},403);
 const r=await fetch(base+'/api/work/cleanup',{method:'POST',headers:{Cookie:admin.cookie,'Content-Type':'application/json'},body:JSON.stringify({...p,password:'Owner-New-Password-2026'})});assert.equal(r.status,403);
 await sale.call('/customers',{...c,name:'Second Customer'});
 await admin.call('/cleanup',{...p,password:'Owner-New-Password-2026'},409);
 const linked=await admin.call('/cleanup-preview?mode=customers');assert.equal(linked.blocked,true);await admin.call('/cleanup',{...linked,password:'Owner-New-Password-2026'},409);
 browser=await chromium.launch({headless:true,channel:'msedge'});const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await ctx.request.post(base+'/api/work/login',{data:{email:'owner@example.com',password:'Owner-New-Password-2026'}});await page.goto(base+'/workspace');
 await page.getByRole('button',{name:'Mở menu',exact:true}).click();await page.getByRole('button',{name:'Tài khoản & đội ngũ',exact:true}).first().click();
 await page.getByRole('button',{name:'Dọn dữ liệu',exact:true}).click();await page.getByLabel('Chế độ xóa',{exact:true}).selectOption('all');await page.getByRole('button',{name:'Xem phạm vi xóa',exact:true}).click();
 await expect(page.getByRole('button',{name:'Xác nhận xóa dữ liệu',exact:true})).toBeDisabled();await page.getByLabel('Nhập XOA TAT CA',{exact:true}).fill('XOA TAT CA');await page.getByLabel('Mật khẩu quản trị hiện tại',{exact:true}).fill('Owner-New-Password-2026');
 await page.getByRole('button',{name:'Xác nhận xóa dữ liệu',exact:true}).click();await expect(page.getByRole('status')).toContainText('Đã xóa 2 khách hàng và 1 đơn hàng');
 state=await admin.call('/state');assert.equal(state.orders.length,0);assert.equal(state.customers.length,0);assert.equal((await admin.call('/users')).length,2);
 const backups=readdirSync(path.join(dir,'cleanup-backups'));assert.equal(backups.length,1);const db=new DatabaseSync(path.join(dir,'cleanup-backups',backups[0]),{readOnly:true});assert.equal(JSON.parse(db.prepare('SELECT data FROM workspace').get().data).orders.length,1);db.close();
 assert.ok((await admin.call('/audit')).some(a=>a.action==='workspace-cleanup'));assert.deepEqual(errors,[]);
 // A repeated request cannot delete records created after the confirmed snapshot.
 await sale.call('/customers',{...c,name:'Live Customer'});await admin.call('/cleanup',{...p,password:'Owner-New-Password-2026'},409);assert.equal((await admin.call('/state')).customers.length,1);
 const users=await admin.call('/users'),victim=users.find(u=>u.role==='sale'),owner=users.find(u=>u.role==='manager');
 await sale.call('/users/'+owner.id+'/delete',{confirmEmail:owner.email},403);
 await admin.call('/users/'+owner.id+'/delete',{confirmEmail:owner.email},400);
 await admin.call('/users/'+victim.id+'/delete',{confirmEmail:'wrong'},400);
 const beforeDelete=await admin.call('/state');
 await page.reload();await page.getByRole('button',{name:'Mở menu',exact:true}).click();await page.getByRole('button',{name:'Tài khoản & đội ngũ',exact:true}).first().click();
 const row=page.getByRole('row').filter({hasText:'sale@example.com'});await expect(row).toBeVisible();
 page.once('dialog',d=>d.dismiss());await row.getByRole('button',{name:'Xóa tài khoản',exact:true}).click();assert.equal((await admin.call('/users')).length,2);
 page.once('dialog',d=>d.accept());await row.getByRole('button',{name:'Xóa tài khoản',exact:true}).click();await expect(row).toHaveCount(0);
 assert.equal((await admin.call('/users')).length,1);assert.ok(!(await admin.call('/sales-roster')).some(u=>u.id===victim.id));
 await sale.call('/state',undefined,401);await sale.call('/login',{email:victim.email,password:'Sale-New-Password-2026'},401);
 await admin.call('/users',{id:victim.id,active:true},404);
 const afterDelete=await admin.call('/state');assert.deepEqual(afterDelete.customers,beforeDelete.customers);assert.deepEqual(afterDelete.orders,beforeDelete.orders);
 assert.ok((await admin.call('/audit')).some(a=>a.action==='user-delete'&&a.target===victim.id));
 console.log('PASS: account deletion UI confirm/cancel, role/self guards, session revocation, login/re-enable blocked, preserved customer records and audit.');
 console.log('PASS: real API permissions, CSRF/password, stale preview, linked customer guard, mobile confirmation, snapshot, audit and retry safety. Isolated test database only.');
}finally{await browser?.close();if(server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped}if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe cleanup');rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200})}

