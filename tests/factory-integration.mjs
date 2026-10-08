import {chromium,webkit,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-factory-')),base=`http://127.0.0.1:${process.env.FACTORY_PORT||3196}`;
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:process.env.FACTORY_PORT||'3196',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await (process.env.FACTORY_BROWSER==='webkit'?webkit.launch({headless:true}):chromium.launch({headless:true,channel:'msedge'}));
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
 await accountant.call('/factory/batch',request,403);
 await admin.call('/factory/batch',request,403);
 await factory.call('/factory/batch',{...request,orders:[request.orders[0],request.orders[0]]},400);
 await factory.call('/factory/batch',{...request,action:'accounting-final'},400);
 await factory.call('/factory/batch',{...request,status:'sale_check'},400);
 await factory.call('/factory/batch',{...request,orders:request.orders.map((o,i)=>({...o,version:i===2?-1:o.version}))},409);
 assert.ok((await get()).every(o=>o.stage===3));
 const page=await factory.ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/workspace');
 await expect(page.locator('.factory-navigation button')).toHaveCount(6);
 await page.screenshot({path:`data/factory-${process.env.FACTORY_BROWSER||'chromium'}-overview.png`,fullPage:true,animations:'disabled'});
 await page.locator('.factory-navigation button').nth(1).click();
 // An older refresh must not undo a successful mutation on screen.
 let releaseRefresh,refreshReady,refreshDone;
 const held=new Promise(r=>releaseRefresh=r),ready=new Promise(r=>refreshReady=r),done=new Promise(r=>refreshDone=r);
 let intercepted=false;
 await page.route('**/api/work/state',async route=>{if(intercepted)return route.continue();intercepted=true;const response=await route.fetch();refreshReady();await held;await route.fulfill({response});refreshDone()});
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await ready;
 const retryKeys=[];
 await page.route('**/api/work/factory/batch',async route=>{retryKeys.push(route.request().headers()['idempotency-key']);if(retryKeys.length===1){await route.fetch();await route.abort('internetdisconnected')}else await route.continue()});
 await page.getByLabel('Chọn tất cả trên trang').check();await page.getByRole('button',{name:'Ghi nhận / tiếp tục',exact:true}).click();await page.getByRole('button',{name:'Xác nhận 3 đơn',exact:true}).click();await expect(page.getByText('Không có đơn phù hợp.',{exact:true})).toBeVisible();
 assert.ok((await get()).every(o=>o.stage===4));
 assert.equal(retryKeys.length,2);assert.equal(retryKeys[0],retryKeys[1]);
 assert.ok((await get()).every(o=>o.history.filter(h=>h.title==='Xưởng ghi nhận').length===1));
 await page.unroute('**/api/work/factory/batch');
 console.log('PASS lost batch response retries once with same key and no duplicate history');
 releaseRefresh();await done;await page.unroute('**/api/work/state');await page.waitForTimeout(200);
 await expect(page.getByText('Không có đơn phù hợp.',{exact:true})).toBeVisible();
 console.log('PASS refresh arriving after batch cannot restore stale queue');
 await page.locator('.factory-navigation button').nth(2).click();await page.screenshot({path:`data/factory-${process.env.FACTORY_BROWSER||'chromium'}-production.png`,fullPage:true,animations:'disabled'});
 await page.getByLabel('Chọn tất cả trên trang').check();await page.getByRole('button',{name:'Tạm dừng',exact:true}).click();
 await page.locator('.factory-confirm textarea').fill('Pause note retained after server error');
 const manualKeys=[];
 await page.route('**/api/work/factory/batch',async route=>{manualKeys.push(route.request().headers()['idempotency-key']);if(manualKeys.length===1)await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'QA temporary failure'})});else await route.continue()});
 await page.getByRole('button',{name:'Xác nhận 3 đơn',exact:true}).click();
 await expect(page.locator('.access-error')).toHaveText('QA temporary failure');
 await expect(page.locator('.factory-confirm textarea')).toHaveValue('Pause note retained after server error');
 assert.ok((await get()).every(o=>o.production.status==='producing'));
 await page.getByRole('button',{name:'Xác nhận 3 đơn',exact:true}).click();await expect(page.locator('.factory-confirm')).toHaveCount(0);
 assert.equal(manualKeys.length,2);assert.equal(manualKeys[0],manualKeys[1]);
 assert.ok((await get()).every(o=>o.production.status==='paused'));
 await page.unroute('**/api/work/factory/batch');
 await page.getByLabel('Chọn tất cả trên trang').check();await page.getByRole('button',{name:'Ghi nhận / tiếp tục',exact:true}).click();await page.getByRole('button',{name:'Xác nhận 3 đơn',exact:true}).click();await expect(page.locator('.factory-confirm')).toHaveCount(0);
 console.log('PASS batch server error retains selection/note; manual retry reuses key; paused orders resume');
 orders=await get();const check={action:'factory-status',status:'sale_check',orders:orders.map(o=>({id:o.id,version:o.version}))},key=randomUUID();await factory.call('/factory/batch',check,200,key);await factory.call('/factory/batch',check,200,key);assert.ok((await get()).every(o=>o.stage===5));
 for(const o of await get())await sale.call(`/orders/${o.id}/action`,{version:o.version,action:o.id===ids[0]?'rework':'accept',text:'Checked by Sale'});
 orders=await get();await factory.call('/factory/batch',{action:'factory-office',orders:orders.map(o=>({id:o.id,version:o.version}))},400);assert.ok((await get()).every(o=>o.stage===4));
 await factory.call('/factory/batch',{action:'factory-office',orders:orders.filter(o=>o.id!==ids[0]).map(o=>({id:o.id,version:o.version}))});
 await page.reload();await page.locator('.factory-navigation button').nth(3).click();await expect(page.locator('.factory-order-table tbody tr')).toHaveCount(1);
 await expect(page.locator('.factory-feedback')).toContainText('Checked by Sale');
 const factoryUser=(await admin.call('/users')).find(u=>u.role==='factory');
 await admin.call(`/users/${factoryUser.id}/visibility`,{factoryView:'products'});
 const limited=await factory.call('/state');assert.equal(limited.customers.length,0);assert.equal(limited.orders[0].payments,undefined);assert.equal(limited.orders[0].items[0].price,undefined);assert.equal(limited.orders.find(o=>o.id===ids[0]).saleReview.note,'Checked by Sale');
 await page.reload();await page.locator('.factory-navigation button').nth(3).click();await expect(page.locator('.factory-feedback')).toContainText('Checked by Sale');
 await page.getByRole('button',{name:'Chi tiết',exact:true}).click();await expect(page.locator('.factory-summary')).toBeVisible();
 await expect(page.getByRole('button',{name:'Thanh toán & giao hàng',exact:true})).toHaveCount(0);
 await admin.call(`/users/${factoryUser.id}/visibility`,{factoryView:'full'});
 await page.reload();await page.locator('.factory-navigation button').nth(4).click();await page.getByLabel('Tìm đơn Xưởng').fill('Factory Buyer');await expect(page.locator('.factory-order-table tbody tr')).toHaveCount(2);
 await page.getByLabel('Tìm đơn Xưởng').fill('No such buyer');await expect(page.locator('.factory-order-table tbody tr')).toHaveCount(0);
 await page.locator('.factory-navigation button').nth(5).click();await expect(page.locator('.factory-kpi strong').first()).toHaveText('2');await page.screenshot({path:`data/factory-${process.env.FACTORY_BROWSER||'chromium'}-analytics.png`,fullPage:true,animations:'disabled'});
 await page.setViewportSize({width:390,height:844});await page.locator('.factory-navigation button').first().click();await page.screenshot({path:`data/factory-${process.env.FACTORY_BROWSER||'chromium'}-mobile.png`,fullPage:true,animations:'disabled'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 await page.locator('.factory-navigation button').nth(4).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await expect(page.locator('.factory-order-table tbody tr')).toHaveCount(2);
 console.log('PASS: factory roles, atomic batch, stale versions, idempotency, UI bulk record, rework, office handoff, reports, mobile overflow');
}finally{await browser?.close();if(server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped}if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe cleanup');rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200})}

