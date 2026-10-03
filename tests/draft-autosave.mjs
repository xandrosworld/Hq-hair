import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-drafts-')),base='http://127.0.0.1:3198';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3198',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,channel:'msedge'});const ctx=await browser.newContext({viewport:{width:1440,height:1000}});let csrf;
 async function call(url,body,status=200){const r=await ctx.request[body?'post':'get'](base+'/api/work'+url,body?{headers:{'X-CSRF-Token':csrf||'','Idempotency-Key':randomUUID()},data:body}:{});const v=await r.json();assert.equal(r.status(),status,JSON.stringify(v));if(v.csrf)csrf=v.csrf;return v}
 await call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});await call('/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 let state=await call('/customers',{name:'Draft Buyer',phone:'123',country:'United States',group:'Salon',address:'Road',recipient:'Buyer',recipientPhone:'123',source:'Website'});const customer=state.customers[0];
 const page=await ctx.newPage();await page.goto(base+'/workspace');
 const create=async()=>{await page.locator('.order-subnav button').first().click();await page.getByRole('button',{name:'Tạo đơn hàng',exact:true}).click();await page.getByLabel('Khách hàng',{exact:false}).selectOption(customer.id)};
 await create();await page.getByLabel('Ghi chú đơn hàng',{exact:true}).fill('Automatically retained');await page.getByText('Đã tự lưu',{exact:true}).waitFor();
 state=await call('/state');assert.equal(state.orders.length,1);let draft=state.orders[0];const code=draft.draftCode;assert.ok(code.startsWith('Draft-'));
 assert.equal(draft.note,'Automatically retained');await page.reload();await create();await expect(page.getByLabel('Ghi chú đơn hàng',{exact:true})).toHaveValue('Automatically retained');
 await call('/orders',{...draft,id:undefined,version:undefined},409);
 await call('/orders',{...draft,version:draft.version-1},409);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Xóa thông tin nháp',exact:true}).click();await expect(page.getByLabel('Ghi chú đơn hàng',{exact:true})).toHaveValue('');
 await page.getByLabel('Ghi chú đơn hàng',{exact:true}).fill('Replacement draft');await page.getByText('Đã tự lưu',{exact:true}).waitFor();
 state=await call('/state');assert.equal(state.orders.length,1);draft=state.orders[0];assert.equal(draft.draftCode,code);
 const response=await call('/orders',{...draft,due:'2026-12-31',items:[{name:'Bulk',kind:'base',qty:100,price:10,priceBasis:'100g',unit:'Gram'}],submit:true});draft=response.state.orders[0];assert.equal(draft.stage,2);assert.equal(draft.draftCode,code);
 await call('/orders',{...draft,id:undefined,version:undefined,submit:false},409);
 await page.reload();await create();await page.getByRole('button',{name:'In hóa đơn',exact:true}).waitFor();assert.equal(await page.getByLabel('Ghi chú đơn hàng',{exact:true}).count(),0);
 console.log('PASS: autosave, reload/resume, one draft, stale version rejection, clear, fixed Draft code and pending approval gate.');
}finally{await browser?.close();if(server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped}if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe cleanup');rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
