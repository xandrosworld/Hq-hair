import sharp from 'sharp';
import {chromium,webkit,devices,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {standardsFixture} from './standards-fixture.mjs';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-mobile-')),base=`http://127.0.0.1:${process.env.MOBILE_PORT||3199}`,shots=process.env.MOBILE_OUTPUT||'data/mobile-audit';mkdirSync(shots,{recursive:true});
const standards=await standardsFixture(dir),server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:process.env.MOBILE_PORT||'3199',DATA_DIR:dir,HQ_STANDARDS_DIR:standards,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
let browser,page;const checks=[],errors=[];
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await (process.env.MOBILE_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'msedge'}));
 async function client(){const ctx=await browser.newContext({...devices[process.env.MOBILE_BROWSER==='webkit'?'iPhone 13':'Pixel 7'],viewport:{width:Number(process.env.MOBILE_WIDTH||390),height:Number(process.env.MOBILE_HEIGHT||844)},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});if(process.env.MOBILE_STORAGE_BLOCKED==='1')await ctx.addInitScript(()=>{for(const method of ['getItem','setItem','removeItem'])Storage.prototype[method]=()=>{throw new DOMException('Storage disabled for mobile QA','SecurityError')}});let csrf='';return {ctx,async call(url,body,status=200){const r=await ctx.request[body?'post':'get'](base+'/api/work'+url,body?{headers:{'X-CSRF-Token':csrf,'Idempotency-Key':randomUUID()},data:body}:{});const v=await r.json();assert.equal(r.status(),status,JSON.stringify(v));if(v.csrf)csrf=v.csrf;return v}}}
 const admin=await client(),sale=await client(),factory=await client(),accountant=await client(),lead=await client();
 await admin.call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});await admin.call('/password',{currentPassword:'Initial-Password-2026',password:'Personal-Password-2026'});
 for(const [c,code,role] of [[sale,'HQ-MO','sale'],[factory,'SX-MO','factory'],[accountant,'KT-MO','accounting'],[lead,'TL-MO','sales_lead']]){await admin.call('/users',{name:code,email:code+'@example.com',code,role,password:'Initial-Password-2026'});await c.call('/login',{email:code+'@example.com',password:'Initial-Password-2026'});await c.call('/password',{currentPassword:'Initial-Password-2026',password:'Personal-Password-2026'})}
 const customerState=await sale.call('/customers',{name:'Mobile Buyer',phone:'123',country:'United States',group:'Salon',address:'Road',recipient:'Buyer',recipientPhone:'123',source:'Website'});
 const draft={customerId:customerState.customers[0].id,date:'2026-10-01',due:'2026-10-20',recipient:'Buyer',phone:'123',address:'Road',country:'United States',discount:0,shippingFee:0,paymentFee:0,items:[{name:'Bulk',kind:'base',qty:100,price:10,unit:'Gram',priceBasis:'100g',origin:'Raw Hair',lengthCm:50,texture:'Natural Straight',segment:'Premium',color:'1B'}],payments:[{sender:'Buyer',method:'Wise',date:'2026-10-01',amount:10}],submit:true};
 const ids=[];for(let i=0;i<3;i++){const r=await sale.call('/orders',draft);ids.push(r.id);if(i<2){const o=r.state.orders.find(o=>o.id===r.id);await accountant.call(`/orders/${o.id}/action`,{version:o.version,action:'accounting-approve',paymentStatus:'full',receipts:[{id:o.payments[0].id,amount:10}]})}}
 const approved=(await sale.call('/state')).orders.find(o=>o.id===ids[0]);

 page=await sale.ctx.newPage();await page.goto(base+'/workspace');await page.getByRole('button',{name:'Mở menu',exact:true}).tap();await page.locator('.sidebar').getByRole('button',{name:'Đơn hàng chưa hoàn thành',exact:true}).tap();await page.getByRole('button',{name:approved.orderCode,exact:true}).first().tap();await page.getByRole('button',{name:'Thanh toán & giao hàng',exact:true}).tap();await page.getByRole('button',{name:'Bổ sung',exact:true}).tap();
 const input=page.getByRole('dialog').locator('input[type=file]');const buffer=await sharp({create:{width:100,height:100,channels:3,background:'#25748a'}}).png().toBuffer();const images=[1,2,3].map(n=>({name:'bill-'+n+'.png',mimeType:'image/png',buffer}));
 await input.setInputFiles(images);await expect(page.locator('.payment-attachment')).toHaveCount(3);await input.setInputFiles(images[0]);await expect(page.getByRole('alert')).toContainText('tối đa 3');await expect(page.locator('.payment-attachment')).toHaveCount(3);
 await page.getByRole('button',{name:'Bỏ tệp bill-2.png',exact:true}).tap();await expect(page.locator('.payment-attachment')).toHaveCount(2);await input.setInputFiles(images[1]);await expect(page.locator('.payment-attachment')).toHaveCount(3);
 await page.getByLabel('Tổng tiền dự kiến (USD) · không bắt buộc').fill('25');await page.getByRole('dialog').getByRole('button',{name:'Thêm thanh toán',exact:true}).tap();await expect(page.getByRole('dialog')).toHaveCount(0);
 const saved=(await sale.call('/state')).orders.find(o=>o.id===approved.id);assert.equal(saved.payments.length,2);assert.equal(saved.payments[1].files.length,3);assert.equal(saved.payments[1].amount,25);assert.equal(saved.payments[1].confirmed,false);
 await sale.call(`/orders/${saved.id}/action`,{version:saved.version,action:'payment',payment:{sender:'Buyer',method:'Wise',date:'2026-10-01',files:[...saved.payments[1].files,saved.payments[1].files[0]]}},400);assert.equal((await sale.call('/state')).orders.find(o=>o.id===saved.id).payments.length,2);

 await page.reload();await page.getByRole('button',{name:'Mở menu',exact:true}).tap();await page.locator('.sidebar').getByRole('button',{name:'Đơn hàng chưa hoàn thành',exact:true}).tap();await page.getByRole('button',{name:approved.orderCode,exact:true}).first().tap();await page.getByRole('button',{name:'Thanh toán & giao hàng',exact:true}).tap();
 for(const n of [1,2,3]){await page.getByRole('button',{name:'bill-'+n+'.png',exact:true}).tap();await expect(page.locator('.receipt-dialog img')).toHaveJSProperty('complete',true);await page.getByRole('button',{name:'Đóng',exact:true}).tap()}
 console.log('PASS mobile 3-file upload, limit, remove/re-add, server persistence, reload and preview; one payment amount');
}finally{await browser?.close();if(server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped}}
