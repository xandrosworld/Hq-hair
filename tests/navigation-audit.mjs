import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {standardsFixture} from './standards-fixture.mjs';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-nav-')),base=process.env.AUDIT_URL||'http://127.0.0.1:3196';
const standards=await standardsFixture(dir);
const server=process.env.AUDIT_URL?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3196',DATA_DIR:dir,HQ_STANDARDS_DIR:standards,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,channel:'msedge'});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const nav=label=>page.locator('nav').getByRole('button',{name:label,exact:true}).click();
 await page.goto(base+'/demo');await nav('Khách hàng');
 assert.ok(await page.getByLabel('Tìm khách hàng').isVisible());assert.equal(await page.locator('.customer-overview').count(),0);
 await page.getByLabel('Tìm khách hàng').fill('nobodymatches');await page.getByRole('button',{name:'Xóa bộ lọc',exact:true}).click();assert.equal(await page.getByLabel('Tìm khách hàng').inputValue(),'');
 await page.getByRole('button',{name:'Thống kê khách hàng',exact:true}).click();await page.getByTestId('buyers-total').waitFor();
 await page.getByRole('button',{name:'Danh sách khách hàng',exact:true}).click();
 await page.screenshot({path:'screenshots/audit-customers.png',fullPage:true});
 await nav('Doanh thu & công nợ');await page.getByRole('button',{name:'Công nợ cần thu',exact:true}).click();
 assert.equal(await page.locator('.overview-grid').count(),0);await page.locator('.order-link').first().click();await page.locator('.back-link').click();
 await page.getByRole('heading',{name:'Danh sách đơn còn công nợ',exact:true}).waitFor();
 await page.screenshot({path:'screenshots/audit-revenue.png',fullPage:true});
 if(!process.env.AUDIT_URL){
  const login=await(await ctx.request.post(base+'/api/work/login',{data:{email:'owner@example.com',password:'Initial-Password-2026'}})).json();
  assert.ok(login.csrf);
  await ctx.request.post(base+'/api/work/password',{headers:{'X-CSRF-Token':login.csrf},data:{currentPassword:'Initial-Password-2026',password:'Owner-Audit-Password-2026'}});
  await page.goto(base+'/workspace');await nav('Bảng giá & màu');
  await page.getByLabel('Loại sản phẩm bảng giá').selectOption('Bulk');await page.getByRole('button',{name:'Xóa bộ lọc giá',exact:true}).click();assert.equal(await page.getByLabel('Loại sản phẩm bảng giá').inputValue(),'');
  await page.screenshot({path:'screenshots/audit-prices.png',fullPage:true});
  await page.getByRole('button',{name:'Danh mục màu',exact:true}).click();await page.getByLabel('Tìm mã màu').fill('Black');
  await nav('Quy chuẩn sản phẩm');await page.getByRole('button',{name:'Nhóm tiếp theo',exact:true}).click();assert.equal(await page.getByLabel('Nhóm quy chuẩn').inputValue(),'1');await page.getByRole('button',{name:'Nhóm trước',exact:true}).click();assert.equal(await page.getByLabel('Nhóm quy chuẩn').inputValue(),'0');
  await page.getByRole('button',{name:'Tài khoản & đội ngũ',exact:false}).first().click();await page.locator('main').waitFor();
 }
 assert.deepEqual(errors,[]);console.log('PASS: customer views/reset, debt view/back navigation, pricing reset, colour search, standards navigation, account page; no browser errors.');
}finally{
 await browser?.close();if(server&&server.exitCode===null){const done=new Promise(r=>server.once('exit',r));server.kill();await done}
 if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe cleanup');rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}
