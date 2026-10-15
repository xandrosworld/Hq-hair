import {chromium,webkit,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-customer-phone-')),base='http://127.0.0.1:3198';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3198',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await (process.env.FACTORY_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'msedge'}));
 async function client(){const ctx=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});let csrf='';return {ctx,async call(url,body,status=200,key=randomUUID()){const r=await ctx.request[body?'post':'get'](base+'/api/work'+url,body?{headers:{'X-CSRF-Token':csrf,'Idempotency-Key':key},data:body}:{});const v=await r.json();assert.equal(r.status(),status,JSON.stringify(v));if(v.csrf)csrf=v.csrf;return v}}}
 const admin=await client(),factory=await client(),accountant=await client(),sale=await client();
 await admin.call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});await admin.call('/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 for(const [c,code,role] of [[factory,'SX-QA','factory'],[accountant,'KT-QA','accounting'],[sale,'HQ-QA','sale']]){await admin.call('/users',{name:code,email:role==='factory'?'xuong1':code+'@example.com',code,role,password:'Initial-Password-2026'});await c.call('/login',{email:role==='factory'?'xuong1':code+'@example.com',password:'Initial-Password-2026'});await c.call('/password',{currentPassword:'Initial-Password-2026',password:'Personal-Password-2026'})}

 const payload={name:'Phone Test',phone:'+84 (912) 345-678',country:'United States',group:'Salon',address:'Address',recipient:'Buyer',recipientPhone:'111',source:'Website'};
 let state=await sale.call('/customers',payload),first=state.customers[0];
 await admin.call('/customers',{...payload,phone:'84.912-345-678'},409);
 state=await sale.call('/customers',{...first,name:'Renamed'});first=state.customers[0];
 state=await sale.call('/customers',{...payload,phone:'0999999999',name:'Second'});let second=state.customers.find(c=>c.id!==first.id);
 await sale.call('/customers',{...second,phone:'84912345678'},409);
 assert.equal((await sale.call('/state')).customers.length,2);
 const requests=await Promise.allSettled([sale.call('/customers',{...payload,phone:'1234567'}),admin.call('/customers',{...payload,phone:'123-4567'})]);assert.equal(requests.filter(r=>r.status==='fulfilled').length,1);assert.match(String(requests.find(r=>r.status==='rejected').reason),/409/);
 assert.equal((await admin.call('/state')).customers.filter(c=>c.phone.replace(/\D/g,'')==='1234567').length,1);
 await admin.call('/customers',{...payload,phone:'777888999',name:'Private admin customer'});
 assert.ok(!(await sale.call('/state')).customers.some(c=>c.phone==='777888999'));
 await sale.call('/customers',{...payload,phone:'777-888-999'},409);
 const page=await sale.ctx.newPage();await page.goto(base+'/workspace');await page.getByRole('button',{name:'Khách hàng',exact:true}).click();await page.getByRole('button',{name:'Second',exact:true}).click();await page.getByRole('button',{name:'Sửa hồ sơ',exact:true}).click();
 await page.getByLabel('Điện thoại / WhatsApp',{exact:false}).fill('84.912-345-678');await page.getByRole('button',{name:'Lưu khách hàng',exact:true}).click();
 await expect(page.locator('.modal').getByRole('alert')).toContainText('Số điện thoại này đã có trên hệ thống');
 await expect(page.getByLabel('Điện thoại / WhatsApp',{exact:false})).toHaveValue('84.912-345-678');
 console.log('PASS phone create/update, global duplicate protection, concurrent creation, and visible form error');
}finally{await browser?.close();server.kill();await new Promise(r=>setTimeout(r,500));rmSync(dir,{recursive:true,force:true})}
