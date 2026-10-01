import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-workflow-ui-')),base='http://127.0.0.1:3193';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3193',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 const admin=await browser.newContext({viewport:{width:1440,height:1000}}),sale=await browser.newContext({viewport:{width:1440,height:1000}});
 async function call(ctx,url,body){const r=body?await ctx.request.post(base+'/api/work'+url,{headers:{'X-CSRF-Token':ctx.csrf||'','Idempotency-Key':randomUUID()},data:body}):await ctx.request.get(base+'/api/work'+url);const v=await r.json();assert.equal(r.status(),200,JSON.stringify(v));if(v.csrf)ctx.csrf=v.csrf;return v}
 await call(admin,'/login',{email:'owner@example.com',password:'Initial-Password-2026'});await call(admin,'/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 await call(admin,'/users',{name:'Judy',code:'HQ-JD',email:'judy@example.com',role:'sale',password:'Initial-Password-2026'});
 await call(sale,'/login',{email:'judy@example.com',password:'Initial-Password-2026'});await call(sale,'/password',{currentPassword:'Initial-Password-2026',password:'Judy-New-Password-2026'});
 await call(sale,'/customers',{name:'Workflow Buyer',company:'Salon',phone:'+12345',country:'United States',group:'Salon',address:'123 Road',recipient:'Buyer',recipientPhone:'+12345',social:'WhatsApp',source:'Website',purchase:'First'});
 const result=await call(sale,'/orders',{customerId:'HQ-JD-1',date:'2026-01-01',due:'2026-02-01',paymentDue:'2026-02-15',recipient:'Buyer',phone:'+12345',address:'123 Road',country:'United States',discount:0,shippingFee:0,paymentFee:0,items:[{name:'Bulk',kind:'base',qty:100,price:10,unit:'Gram',priceBasis:'100g'}],payments:[{sender:'Buyer',method:'Wise',date:'2026-01-01',amount:10,reference:'PAY-1'}],submit:true});
 const id=result.id;
 await call(admin,`/orders/${id}/action`,{version:1,action:'manager-stage',stage:8,text:'Test fixture: accounting handoff'});
 const page=await sale.newPage(),owner=await admin.newPage(),errors=[];
 for(const p of [page,owner])p.on('pageerror',e=>errors.push(e.message));
 async function open(p){await p.goto(base+'/workspace');await p.getByRole('heading',{name:/^(Tổng quan kinh doanh|Đơn hàng)$/}).waitFor();await p.locator('nav').getByRole('button',{name:/Đơn hàng/}).click();await p.getByRole('button',{name:id,exact:true}).click()}
 await open(page);await page.getByRole('button',{name:'Hoàn tất kiểm định & đặt ship',exact:true}).click();
 let dialog=page.getByRole('dialog');await dialog.getByLabel('Đơn vị vận chuyển',{exact:true}).fill('DHL');await dialog.getByLabel('Dịch vụ vận chuyển').fill('Express');await dialog.getByLabel('Mã vận đơn',{exact:true}).fill('TRACK-UI-1');await dialog.getByLabel('Mã phiếu kiểm định (nếu có)').fill('QC-UI-1');await dialog.getByRole('checkbox').check();await dialog.getByRole('button',{name:'Xác nhận',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await page.getByText('Nội dung đã khóa sau bước 8',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Xin quyền chỉnh sửa',exact:true}).count(),0);
 await page.getByRole('button',{name:'Thanh toán & giao hàng',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Bổ sung',exact:true}).count(),0);
 await page.getByLabel('Nội dung trao đổi').fill('Sale vẫn trao đổi sau khóa.');await page.getByRole('button',{name:'Gửi',exact:true}).click();await page.getByText('Sale vẫn trao đổi sau khóa.',{exact:true}).waitFor();
 mkdirSync('screenshots/workflow',{recursive:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'screenshots/workflow/locked-sale.png',fullPage:true});
 await open(owner);await owner.getByRole('button',{name:'Chỉnh sửa ngoại lệ',exact:true}).click();await owner.getByLabel('Lý do chỉnh sửa ngoại lệ',{exact:true}).fill('Khách xác nhận lại ghi chú.');await owner.getByLabel('Ghi chú đơn hàng',{exact:true}).fill('Giữ màu theo mẫu đã duyệt');await owner.getByRole('button',{name:'Lưu chỉnh sửa ngoại lệ',exact:true}).first().click();await owner.getByRole('heading',{name:/HQ-JD-1-1/}).waitFor();await owner.getByText('Giữ màu theo mẫu đã duyệt',{exact:true}).waitFor();
 let order=(await call(admin,'/state')).orders[0];assert.equal(order.stage,8);assert.ok(order.contentLockedAt);assert.ok(order.history.some(h=>h.title==='Quản trị chỉnh sửa ngoại lệ'));
 await owner.getByRole('button',{name:'Điều chỉnh thanh toán ngoại lệ',exact:true}).click();dialog=owner.getByRole('dialog');await dialog.getByRole('checkbox').check();await dialog.getByLabel('Ghi chú thao tác').fill('Đối chiếu xác nhận đã nhận tiền.');await dialog.getByRole('button',{name:'Xác nhận',exact:true}).click();await dialog.waitFor({state:'hidden'});
 await open(page);await page.getByRole('button',{name:'Xác nhận đã nhận',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Xác nhận',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByRole('button',{name:'Hoàn thành đơn',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Xác nhận',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByText('Đơn đã hoàn thành.',{exact:true}).waitFor();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'screenshots/workflow/completed-sale.png',fullPage:true});
 order=(await call(admin,'/state')).orders[0];assert.equal(order.stage,10);assert.equal(order.payments[0].confirmed,true);
 await owner.locator('nav').getByRole('button',{name:'Doanh thu & công nợ',exact:true}).click();await owner.getByLabel('Nhóm tuổi nợ').selectOption('unscheduled');await owner.getByRole('heading',{name:'Doanh thu & công nợ',exact:true}).waitFor();
 await owner.locator('nav').getByRole('button',{name:/Đơn hàng/}).click();await owner.getByLabel('Lọc người phụ trách').selectOption(order.ownerId);await owner.getByLabel('Lọc khách hàng').selectOption(order.customerId);await owner.getByRole('button',{name:id,exact:true}).waitFor();
 for(const width of [1120,1440,1920]){await owner.setViewportSize({width,height:1000});assert(await owner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))}
 assert.deepEqual(errors,[]);console.log('PASS: browser step 8 checklist, sticky lock, chat, manager edit reason, payment exception, receipt and completion, filters, no JavaScript errors.');
}finally{
 await browser?.close();if(server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped}
 if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe cleanup');rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}
