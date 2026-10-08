import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-factory-')),base='http://127.0.0.1:3196';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3196',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,channel:'msedge'});
 async function client(){const ctx=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});let csrf='';return {ctx,async call(url,body,status=200,key=randomUUID()){const r=await ctx.request[body?'post':'get'](base+'/api/work'+url,body?{headers:{'X-CSRF-Token':csrf,'Idempotency-Key':key},data:body}:{});const v=await r.json();assert.equal(r.status(),status,JSON.stringify(v));if(v.csrf)csrf=v.csrf;return v}}}
 const admin=await client(),factory=await client(),accountant=await client(),sale=await client();
 await admin.call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});await admin.call('/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 for(const [c,code,role] of [[factory,'SX-QA','factory'],[accountant,'KT-QA','accounting'],[sale,'HQ-QA','sale']]){await admin.call('/users',{name:code,email:code+'@example.com',code,role,password:'Initial-Password-2026'});await c.call('/login',{email:code+'@example.com',password:'Initial-Password-2026'});await c.call('/password',{currentPassword:'Initial-Password-2026',password:'Personal-Password-2026'})}
 const state=await sale.call('/customers',{name:'Factory Buyer',phone:'123',country:'United States',group:'Salon',address:'Road',recipient:'Buyer',recipientPhone:'123',source:'Website'});
 const draft={customerId:state.customers[0].id,date:'2026-10-01',due:'2026-10-10',recipient:'Buyer',phone:'123',address:'Road',country:'United States',discount:0,shippingFee:0,paymentFee:0,items:[{name:'Bulk',kind:'base',qty:100,price:10,unit:'Gram',priceBasis:'100g',origin:'Raw Hair',lengthCm:50,texture:'Natural Straight',segment:'Premium',color:'1B'}],payments:[{sender:'Buyer',method:'Wise',date:'2026-10-01',amount:10}],submit:true};
 const ids=[];
 for(let i=0;i<3;i++){const r=await sale.call('/orders',draft);const o=r.state.orders.find(x=>x.id===r.id);ids.push(o.id);await accountant.call(`/orders/${o.id}/action`,{version:o.version,action:'accounting-approve',paymentStatus:'full',receipts:[{id:o.payments[0].id,amount:10}]})}
 const get=async()=> (await factory.call('/state')).orders.filter(o=>ids.includes(o.id));
 let orders=await get();const request={action:'factory-status',status:'producing',orders:orders.map(o=>({id:o.id,version:o.version}))};
 await sale.call('/factory/batch',request,403);
 await factory.call('/factory/batch',{...request,orders:request.orders.map((o,i)=>({...o,version:i===2?-1:o.version}))},409);
 assert.ok((await get()).every(o=>o.stage===3));
 const page=await factory.ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/workspace');
 await expect(page.locator('.factory-navigation button')).toHaveCount(6);
 await page.screenshot({path:'data/factory-overview.png',fullPage:true,animations:'disabled'});
 await page.locator('.factory-navigation button').nth(1).click();await page.getByLabel('Chọn tất cả trên trang').check();await page.getByRole('button',{name:'Ghi nhận / tiếp tục',exact:true}).click();await page.getByRole('button',{name:'Xác nhận 3 đơn',exact:true}).click();await expect(page.getByText('Không có đơn phù hợp.',{exact:true})).toBeVisible();
 assert.ok((await get()).every(o=>o.stage===4));
 await page.locator('.factory-navigation button').nth(2).click();await page.screenshot({path:'data/factory-production.png',fullPage:true,animations:'disabled'});
 orders=await get();const check={action:'factory-status',status:'sale_check',orders:orders.map(o=>({id:o.id,version:o.version}))},key=randomUUID();await factory.call('/factory/batch',check,200,key);await factory.call('/factory/batch',check,200,key);assert.ok((await get()).every(o=>o.stage===5));
 for(const o of await get())await sale.call(`/orders/${o.id}/action`,{version:o.version,action:o.id===ids[0]?'rework':'accept',text:'Checked by Sale'});
 orders=await get();await factory.call('/factory/batch',{action:'factory-office',orders:orders.map(o=>({id:o.id,version:o.version}))},400);assert.ok((await get()).every(o=>o.stage===4));
 await factory.call('/factory/batch',{action:'factory-office',orders:orders.filter(o=>o.id!==ids[0]).map(o=>({id:o.id,version:o.version}))});
 await page.reload();await page.locator('.factory-navigation button').nth(3).click();await expect(page.locator('.factory-order-table tbody tr')).toHaveCount(1);
 await page.getByRole('button',{name:'Chi tiết',exact:true}).click();await expect(page.locator('.factory-summary')).toBeVisible();
 await page.locator('.factory-navigation button').nth(5).click();await expect(page.locator('.factory-kpi strong').first()).toHaveText('2');await page.screenshot({path:'data/factory-analytics.png',fullPage:true,animations:'disabled'});
 await page.setViewportSize({width:390,height:844});await page.locator('.factory-navigation button').first().click();await page.screenshot({path:'data/factory-mobile.png',fullPage:true,animations:'disabled'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 console.log('PASS: factory roles, atomic batch, stale versions, idempotency, UI bulk record, rework, office handoff, reports, mobile overflow');
}finally{await browser?.close();server.kill()}

