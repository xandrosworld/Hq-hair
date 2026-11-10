import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-price-ui-')),base='http://127.0.0.1:3195';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3195',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
let browser;

try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,channel:'msedge'});const ctx=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const login=await(await ctx.request.post(base+'/api/work/login',{data:{email:'owner@example.com',password:'Initial-Password-2026'}})).json();
 const auth=await(await ctx.request.post(base+'/api/work/password',{headers:{'X-CSRF-Token':login.csrf},data:{currentPassword:'Initial-Password-2026',password:'Owner-Personal-Password'}})).json();
 const customer={name:'Pricing Buyer',company:'',phone:'+123456789',email:'',country:'United States',group:'Salon',address:'Street 1',recipient:'Buyer',recipientPhone:'+123456789',social:'example.com',source:'Website',purchase:'Đơn đầu tiên'};
 await ctx.request.post(base+'/api/work/customers',{headers:{'X-CSRF-Token':auth.csrf,'Idempotency-Key':crypto.randomUUID()},data:customer});
 await page.goto(base+'/workspace');await page.getByRole('button',{name:'Bảng giá & màu',exact:true}).click();
 await page.getByRole('button',{name:'Danh mục màu',exact:true}).click();
 for(const [width,height] of [[968,630],[390,660]]){
 await page.setViewportSize({width,height});await page.getByRole('button',{name:'Thêm mẫu màu',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'Thêm mẫu màu'});await dialog.getByLabel('Mã / Tên mẫu').fill('Layout '+width);await dialog.getByLabel('Loại màu').selectOption('Balayage');
 const checks=dialog.getByRole('checkbox');await checks.first().check();await checks.last().check();
 const save=dialog.getByRole('button',{name:'Lưu mẫu màu'});assert.ok(await save.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}));
 await save.click();await dialog.waitFor({state:'detached'});await page.locator('.color-card').getByText('Layout '+width,{exact:true}).waitFor();console.log('Save PASS',width,height)}
 }finally{await browser?.close();const done=new Promise(r=>server.once('exit',r));server.kill();await done;rmSync(dir,{recursive:true,force:true})}
