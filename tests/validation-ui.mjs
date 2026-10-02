import {totals} from '../shared.js';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-validation-ui-')),base='http://127.0.0.1:3187';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3187',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 async function call(url,body){const r=body?await ctx.request.post(base+'/api/work'+url,{headers:{'X-CSRF-Token':ctx.csrf||'','Idempotency-Key':randomUUID()},data:body}):await ctx.request.get(base+'/api/work'+url);const v=await r.json();assert.equal(r.status(),200,JSON.stringify(v));if(v.csrf)ctx.csrf=v.csrf;return v}
 await call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});await call('/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 const state=await call('/customers',{name:'Report Buyer',phone:'+123456',country:'United States',group:'Salon',address:'123 Road',recipient:'Buyer',recipientPhone:'+123456',social:'WhatsApp',source:'Website',purchase:'First'});

 const invalid={customerId:state.customers[0].id,date:'2026-01-01',due:'2027-01-01',recipient:'Buyer',phone:'+123456',address:'123 Road',country:'United States',items:[{name:'',kind:'base',qty:100,price:183,unit:'Gram',priceBasis:'100g'}],discount:0,shippingFee:0,paymentFee:0,payments:[],submit:true};
 const rejection=await ctx.request.post(base+'/api/work/orders',{headers:{'X-CSRF-Token':ctx.csrf,'Idempotency-Key':randomUUID()},data:invalid});assert.equal(rejection.status(),400);assert.ok((await rejection.json()).fields['name-0']);assert.equal((await call('/state')).orders.length,0);
 const page=await ctx.newPage();await page.goto(base+'/workspace');await page.getByRole('heading',{name:'Tổng quan kinh doanh'}).waitFor();await page.getByRole('button',{name:'Tạo đơn hàng',exact:true}).first().click();
 await page.getByLabel('Khách hàng',{exact:true}).selectOption(state.customers[0].id);await page.getByLabel('Dự kiến giao hàng',{exact:true}).fill('2027-01-01');await page.getByRole('button',{name:'Thêm sản phẩm',exact:true}).first().click();
 await page.getByLabel('Đơn giá 1',{exact:true}).fill('183');await page.getByRole('button',{name:'Thanh toán & giao hàng',exact:true}).last().click();await page.getByLabel('Số điện thoại',{exact:true}).fill('');await page.getByRole('button',{name:'Gửi yêu cầu duyệt',exact:true}).click();
 await page.getByRole('button',{name:/Dòng sản phẩm 1:.*Sửa ngay/}).waitFor();assert.equal(await page.getByLabel('Sản phẩm 1',{exact:true}).getAttribute('aria-invalid'),'true');
 await page.getByRole('button',{name:/Nhập số điện thoại.*Sửa ngay/}).click();await page.getByLabel('Số điện thoại',{exact:true}).fill('+123456');
 await page.getByRole('button',{name:/Dòng sản phẩm 1:.*Sửa ngay/}).click();await page.getByLabel('Sản phẩm 1',{exact:true}).fill('Bulk');await page.getByRole('button',{name:'Thanh toán & giao hàng',exact:true}).last().click();
 let requests=0;await page.route('**/api/work/orders',async route=>{requests++;if(requests===1)await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Máy chủ tạm thời không thể lưu. Vui lòng thử lại.'})});else await route.continue()});
 await page.getByRole('button',{name:'Gửi yêu cầu duyệt',exact:true}).click();await page.getByText('Đơn chưa lưu thành công',{exact:true}).waitFor();assert.equal(await page.getByLabel('Số điện thoại',{exact:true}).inputValue(),'+123456');
 mkdirSync('screenshots/validation',{recursive:true});await page.screenshot({path:'screenshots/validation/retry.png',fullPage:true});
 await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.getByRole('heading',{name:/HQ-ADMIN-1-1/}).waitFor();const saved=await call('/state');assert.equal(saved.orders.length,1);assert.equal(saved.orders[0].stage,2);assert.equal(saved.orders[0].items[0].name,'Bulk');assert.equal(saved.orders[0].items[0].price,183);

 await page.getByRole('button',{name:'Thanh toán & giao hàng',exact:true}).click();await page.getByRole('button',{name:'Bổ sung',exact:true}).click();
 let dialog=page.getByRole('dialog');assert.equal(await dialog.getByLabel('Số tiền dự kiến (USD) · không bắt buộc',{exact:true}).inputValue(),'');
 await dialog.getByRole('button',{name:'Thêm thanh toán',exact:true}).click();await dialog.waitFor({state:'hidden'});
 let current=(await call('/state')).orders[0];assert.equal(current.payments[0].amount,0);assert.equal(current.payments[0].confirmed,false);assert.equal(totals(current).paid,0);assert.equal(totals(current).debt,183);
 for(const amount of [0,undefined,120]){await call(`/orders/${current.id}/action`,{version:current.version,action:'payment',payment:{sender:'Buyer',method:'Wise',date:'2026-10-02',amount,confirmed:true}});current=(await call('/state')).orders[0];assert.equal(current.payments.at(-1).confirmed,false)}
 assert.equal(totals(current).paid,0);assert.equal(totals(current).debt,183);assert.equal(totals(current).pending,120);
 await call(`/orders/${current.id}/action`,{version:current.version,action:'manager-payment',paymentId:current.payments.at(-1).id,amount:115,confirmed:true,text:'Test authorized actual receipt correction'});
 current=(await call('/state')).orders[0];assert.equal(totals(current).paid,115);assert.equal(totals(current).debt,68);
 // The invoice is available from both detail tabs and remains English.
 for(const tab of ['Sản phẩm','Thanh toán & giao hàng']){await page.getByRole('button',{name:tab,exact:true}).click();await page.getByRole('button',{name:'In hóa đơn',exact:true}).click();await page.getByRole('heading',{name:'COMMERCIAL INVOICE',exact:true}).waitFor();await page.getByRole('dialog').getByRole('button',{name:'Đóng',exact:true}).click()}
 console.log('PASS: blank/zero/estimated receipt amounts remain pending; forged confirmation ignored; only confirmed actual amount reduces debt; invoice accessible from both tabs.');
 console.log('PASS: exact server field errors; missing product/shipping messages; cross-step repair links; persistent server failure; retry preserves inputs and submits exactly once.');
}finally{if(browser)await browser.close();const done=new Promise(r=>server.once('exit',r));server.kill();await done;const resolved=path.resolve(dir);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('hq-validation-ui-'));rmSync(resolved,{recursive:true,force:true});}
