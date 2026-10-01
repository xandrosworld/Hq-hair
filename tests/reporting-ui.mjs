import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-report-ui-')),base='http://127.0.0.1:3188';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3188',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,channel:process.env.BROWSER_CHANNEL||'msedge'});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 async function call(url,body){const r=body?await ctx.request.post(base+'/api/work'+url,{headers:{'X-CSRF-Token':ctx.csrf||'','Idempotency-Key':randomUUID()},data:body}):await ctx.request.get(base+'/api/work'+url);const v=await r.json();assert.equal(r.status(),200,JSON.stringify(v));if(v.csrf)ctx.csrf=v.csrf;return v}
 await call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});await call('/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 const state=await call('/customers',{name:'Report Buyer',phone:'+123456',country:'United States',group:'Salon',address:'123 Road',recipient:'Buyer',recipientPhone:'+123456',social:'WhatsApp',source:'Website',purchase:'First'});
 const ids=[];for(const [date,paymentDue] of [['2025-01-01','2025-02-01'],['2026-01-01','2026-02-01'],['2026-01-02',''],['2026-03-01','']]){
  const o=await call('/orders',{customerId:state.customers[0].id,date,due:date,paymentDue,recipient:'Buyer',phone:'+123456',address:'123 Road',country:'United States',items:[{name:'Bulk',kind:'base',qty:800,price:98.5,unit:'Gram',priceBasis:'100g'}],discount:0,shippingFee:0,paymentFee:0,payments:[],submit:true});ids.push(o.id);
 }
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/workspace');await page.getByRole('heading',{name:'Tổng quan kinh doanh'}).waitFor();
 await page.locator('nav').getByRole('button',{name:'Doanh thu & công nợ',exact:true}).click();
 await page.getByLabel('Kỳ báo cáo').selectOption('2025-01');assert.equal(await page.getByLabel('Năm biểu đồ doanh thu').inputValue(),'2025');assert.equal(await page.getByLabel('Năm biểu đồ doanh thu').isDisabled(),true);
 async function csv(button){const event=page.waitForEvent('download');await page.getByRole('button',{name:button,exact:true}).click();return readFileSync(await (await event).path(),'utf8')}
 let content=await csv('Xuất báo cáo CSV');assert.ok(content.includes(ids[0]));assert.ok(!content.includes(ids[1]));
 await page.getByLabel('Kỳ báo cáo').selectOption('2026-01');await page.getByLabel('Nhóm tuổi nợ').selectOption('unscheduled');
 content=await csv('Xuất công nợ đang lọc');assert.ok(content.includes(ids[2]));assert.ok(!content.includes(ids[1]));assert.equal(content.split('\r\n').length,2);
 await page.getByLabel('Tìm công nợ').fill('no-such-customer');content=await csv('Xuất báo cáo CSV');assert.equal(content.split('\r\n').length,1);await page.getByLabel('Tìm công nợ').fill('');
 await page.locator('.metric strong').filter({hasText:'$1,576'}).first().waitFor();
 mkdirSync('screenshots/reporting',{recursive:true});await page.screenshot({path:'screenshots/reporting/revenue.png',fullPage:true});
 await page.locator('nav').getByRole('button',{name:/Khách hàng/}).click();await page.getByLabel('Năm thống kê khách').selectOption('2026');assert.equal(await page.getByTestId('buyers-total').locator('[aria-hidden="true"]').textContent(),'1');assert.equal(await page.getByTestId('buyers-repeat').locator('[aria-hidden="true"]').textContent(),'1');assert.equal(await page.getByTestId('buyers-rate').locator('[aria-hidden="true"]').textContent(),'100');
 await page.getByRole('button',{name:'Xem bảng số liệu',exact:true}).click();await page.getByText('1/2026',{exact:true}).waitFor();await page.getByRole('button',{name:'Ẩn bảng số liệu',exact:true}).click();await page.screenshot({path:'screenshots/reporting/customers.png',fullPage:true});
 await page.locator('nav').getByRole('button',{name:/Đơn hàng/}).click();await page.getByLabel('Năm thống kê đơn').selectOption('2026');await page.getByRole('img',{name:'Tháng 1: 2 đơn',exact:true}).waitFor();

 // Create every state independently in this isolated database. Completed and draft
 // orders must not inflate the eight open-state counters.
 const fixture=(await call('/state')).orders[0];
 for(const stage of [3,4,5,6,7,8,9,10]){
  const saved=await call('/orders',{...fixture,id:undefined,version:undefined,payments:[],submit:true});
  await call(`/orders/${saved.id}/action`,{version:1,action:'manager-stage',stage,text:'Isolated fixture for all workflow states'});
 }
 const draft=await call('/orders',{...fixture,id:undefined,version:undefined,payments:[],submit:false});
 await page.reload();await page.getByRole('heading',{name:'Tổng quan kinh doanh'}).waitFor();await page.locator('nav').getByRole('button',{name:/Đơn hàng/}).click();
 await page.getByRole('heading',{name:'Danh sách đơn hàng chưa hoàn thành',exact:true}).waitFor();
 assert.equal(await page.getByTestId('open-total').locator('[aria-hidden="true"]').textContent(),'11');
 for(let stage=2;stage<=9;stage++)assert.equal(await page.getByTestId(`stage-count-${stage}`).textContent(),stage===2?'4':'1');
 assert.equal(await page.getByRole('button',{name:draft.id,exact:true}).count(),0);
 const tableIds=await page.locator('table tbody .order-link').allTextContents();assert.equal(tableIds.length,11);assert.deepEqual(tableIds.slice(0,4),ids);
 await page.getByRole('button',{name:/Lọc bước 9:/}).click();assert.equal(await page.locator('table tbody tr').count(),1);
 await page.getByRole('button',{name:'Hoàn thành',exact:true}).click();assert.equal(await page.locator('table tbody tr').count(),1);
 await page.getByRole('button',{name:'Bản nháp',exact:true}).click();await page.getByRole('button',{name:draft.id,exact:true}).waitFor();
 await page.getByRole('button',{name:'Chưa hoàn thành',exact:true}).click();await page.screenshot({path:'screenshots/reporting/all-open-states.png',fullPage:true});
 for(const width of [1120,1440,1920]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 assert.deepEqual(errors,[]);console.log('PASS: historical report year, month/query filters, exact CSV/debt exports, repeat customers, monthly orders and desktop widths.');
}finally{if(browser)await browser.close();const done=new Promise(r=>server.once('exit',r));server.kill();await done;const resolved=path.resolve(dir);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('hq-report-ui-'));rmSync(resolved,{recursive:true,force:true});}
