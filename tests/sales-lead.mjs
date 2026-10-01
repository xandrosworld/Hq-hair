import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-lead-')),base='http://127.0.0.1:3191';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3191',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,channel:'msedge'});
 const admin=await browser.newContext(),lead=await browser.newContext({viewport:{width:1440,height:1000}}),sales=[await browser.newContext(),await browser.newContext()];
 async function call(ctx,url,body,status=200){const headers={'X-CSRF-Token':ctx.csrf||'','Idempotency-Key':randomUUID()};const r=body?await ctx.request.post(base+'/api/work'+url,{headers,data:body}):await ctx.request.get(base+'/api/work'+url);const v=await r.json();assert.equal(r.status(),status,`${url}: ${JSON.stringify(v)}`);if(v.csrf)ctx.csrf=v.csrf;return v}
 await call(admin,'/login',{email:'owner@example.com',password:'Initial-Password-2026'});await call(admin,'/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 let users=await call(admin,'/users',{name:'Lead Sale',email:'lead.sale',code:'TL-SALE',role:'sales_lead',password:'Initial-Password-2026'});const leadId=users.find(u=>u.role==='sales_lead').id;
 const orders=[];
 for(let i=0;i<2;i++){
  const c=sales[i],email=`sale${i}@example.com`;
  users=await call(admin,'/users',{name:'Sale '+i,email,code:'HQ-S'+i,role:'sale',password:'Initial-Password-2026'});
  await call(c,'/login',{email,password:'Initial-Password-2026'});await call(c,'/password',{currentPassword:'Initial-Password-2026',password:'Personal-Password-2026'});
  const s=await call(c,'/customers',{name:'Buyer '+i,company:'Salon',phone:'+123',country:'United States',group:'Salon',address:'123 Road',recipient:'Buyer',recipientPhone:'+123',social:'WhatsApp',source:'Website',purchase:'First'});
  const o=await call(c,'/orders',{customerId:s.customers[0].id,date:'2026-01-01',due:'2026-02-01',recipient:'Buyer',phone:'+123',address:'123 Road',country:'United States',discount:0,shippingFee:0,paymentFee:0,items:[{name:'Bulk',kind:'base',qty:100,price:10,unit:'Gram',priceBasis:'100g'}],payments:[],submit:true});orders.push(o.state.orders[0]);
 }
 const page=await lead.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/workspace');await page.getByLabel('Email hoặc tên đăng nhập',{exact:true}).fill('lead.sale');await page.getByLabel('Mật khẩu',{exact:true}).fill('Initial-Password-2026');await page.getByRole('button',{name:'Vào không gian làm việc'}).click();
 await page.getByLabel('Mật khẩu ban đầu',{exact:true}).fill('Initial-Password-2026');await page.getByLabel('Mật khẩu mới · tối thiểu 12 ký tự').fill('Lead-Personal-Password');await page.getByLabel('Nhập lại mật khẩu mới').fill('Lead-Personal-Password');await page.getByRole('button',{name:'Lưu mật khẩu & tiếp tục'}).click();await page.getByRole('heading',{name:/^(Tổng quan kinh doanh|Đơn hàng)$/}).waitFor();
 await call(lead,'/me');const state=await call(lead,'/state');assert.equal(state.orders.length,2);assert.equal(state.customers.length,2);assert.equal(state.user.leadEdit,false);assert.equal(state.user.leadAssign,false);
 assert.equal((await call(sales[0],'/state')).orders.length,1);
 for(const url of ['/users','/audit','/backup-status','/backup-download','/sales-roster','/pricing/history'])await call(lead,url,undefined,403);
 for(const [url,body] of [['/orders',orders[0]],['/customers',state.customers[0]],['/catalog',{products:[]}],['/assign',{id:state.customers[0].id}],['/reset',{}],['/users',{id:leadId}],['/users/'+leadId+'/lead-permissions',{leadEdit:true,leadAssign:true}],['/pricing/colors',{code:'#FAKE'}],['/pricing/adjust',{percent:5}]])await call(lead,url,body,403);
 for(const action of ['message','payment','delete','grant-edit','edit-request','accept','inspection','received','complete','manager-stage','manager-payment'])await call(lead,`/orders/${orders[0].id}/action`,{action,version:1,text:'Forbidden'},403);
 assert.equal((await call(lead,'/pricing')).canEditPrices,false);
 assert.equal(await page.getByRole('button',{name:/Tạo đơn|Tạo khách/}).count(),0);
 assert.equal(await page.locator('nav').getByRole('button',{name:'Tổng quan',exact:true}).count(),0);await page.getByRole('heading',{name:'Danh sách đơn hàng chưa hoàn thành',exact:true}).waitFor();
 await page.locator('nav').getByRole('button',{name:/Đơn hàng/}).click();await page.getByLabel('Lọc người phụ trách').selectOption(orders[1].ownerId);await page.getByRole('button',{name:orders[1].id,exact:true}).click();
 for(const name of ['Xin quyền chỉnh sửa','Bổ sung chứng từ','Hoàn tất kiểm định & đặt ship','Gửi'])assert.equal(await page.getByRole('button',{name,exact:true}).count(),0);
 await page.getByRole('button',{name:'In hóa đơn'}).click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Đóng',exact:true}).click();
 await page.locator('nav').getByRole('button',{name:'Doanh thu & công nợ',exact:true}).click();await page.getByRole('heading',{name:'Tổng hợp theo người phụ trách',exact:true}).waitFor();const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất báo cáo CSV'}).click();await downloadEvent;
 await page.getByRole('button',{name:'Tài khoản & đội ngũ',exact:true}).first().click();assert.equal(await page.getByRole('button',{name:'Cấp tài khoản',exact:true}).count(),0);
 const adminPage=await admin.newPage();await adminPage.goto(base+'/workspace');await adminPage.getByRole('heading',{name:/^(Tổng quan kinh doanh|Đơn hàng)$/}).waitFor();await adminPage.getByRole('button',{name:'Tài khoản & đội ngũ',exact:true}).first().click();await Promise.all([adminPage.waitForResponse(r=>r.url().endsWith('/api/work/users')&&r.request().method()==='GET'),adminPage.getByRole('checkbox',{name:'Phân công khách hàng',exact:true}).click()]);assert.equal(await adminPage.getByRole('checkbox',{name:'Phân công khách hàng',exact:true}).isChecked(),true);
 await call(lead,'/sales-roster');await page.reload();await page.getByRole('heading',{name:/^(Tổng quan kinh doanh|Đơn hàng)$/}).waitFor();await page.getByRole('button',{name:'Tài khoản & đội ngũ',exact:true}).first().click();await page.getByRole('heading',{name:'Phân công khách hàng',exact:true}).waitFor();
 await call(lead,'/assign',{id:state.customers[0].id,version:state.customers[0].version,ownerId:orders[1].ownerId});await call(lead,'/orders',orders[0],403);
 await call(admin,'/users/'+leadId+'/lead-permissions',{leadEdit:true,leadAssign:false});const updated=await call(lead,'/state');
 await call(lead,`/orders/${orders[0].id}/action`,{action:'message',version:updated.orders.find(o=>o.id===orders[0].id).version,text:'Explicitly delegated operation'});
 await call(lead,'/assign',{id:state.customers[0].id},403);await call(lead,'/users',undefined,403);
 await call(admin,'/users/'+leadId+'/lead-permissions',{leadEdit:false,leadAssign:false});await call(lead,`/orders/${orders[0].id}/action`,{action:'message',text:'Revoked'},403);
 await page.reload();await page.getByRole('heading',{name:/^(Tổng quan kinh doanh|Đơn hàng)$/}).waitFor();assert.equal(await page.getByRole('button',{name:/Tạo đơn/}).count(),0);
 mkdirSync('screenshots/lead',{recursive:true});await page.screenshot({path:'screenshots/lead/overview.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('PASS: username login, forced password change, two-Sale visibility, readonly API/UI, CSV/invoice, independent delegation, assignment and immediate revocation.');
}finally{
 await browser?.close();if(server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped}
 if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe cleanup');rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}
