import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';import os from 'node:os';import path from 'node:path';
import {chromium,expect} from '@playwright/test';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-login-design-')),base='http://127.0.0.1:3212';mkdirSync('tmp/login-review',{recursive:true});
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3212',NODE_ENV:'test',DATA_DIR:dir,HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({channel:'msedge',headless:true});const ctx=await browser.newContext({reducedMotion:'reduce'}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [w,h] of [[1920,1080],[1440,900],[1024,768],[768,1024],[390,844],[320,760]]){
  await page.setViewportSize({width:w,height:h});await page.goto(base+'/workspace',{waitUntil:'networkidle'});await expect(page.getByRole('button',{name:'Vào không gian làm việc'})).toBeVisible();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${w}`);
  const button=await page.getByRole('button',{name:'Vào không gian làm việc'}).boundingBox();assert.ok(button.y+button.height<=h,`login button below fold at ${w}`);
  assert.equal(await page.locator('.hq-login-photo img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
  await page.screenshot({path:`tmp/login-review/login-${w}.png`,fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});const input=page.getByLabel('Mật khẩu',{exact:true});await input.fill('example-not-real');await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click();await expect(input).toHaveAttribute('type','text');await page.getByRole('button',{name:'Ẩn mật khẩu',exact:true}).click();await expect(input).toHaveAttribute('type','password');
 await page.getByRole('button',{name:'Quên mật khẩu?',exact:false}).click();await expect(page.getByRole('region',{name:'Hướng dẫn lấy lại mật khẩu'})).toBeVisible();await page.getByRole('button',{name:'Quên mật khẩu?',exact:false}).click();
 await page.getByLabel('Email hoặc tên đăng nhập',{exact:true}).fill('owner@example.com');await page.getByRole('button',{name:'Vào không gian làm việc'}).click();await expect(page.getByRole('alert')).toBeVisible();await page.screenshot({path:'tmp/login-review/login-error.png',fullPage:true});
 await input.fill('Initial-Password-2026');await page.getByRole('button',{name:'Vào không gian làm việc'}).click();await expect(page.getByLabel('Mật khẩu ban đầu',{exact:true})).toBeVisible();
 await page.getByLabel('Mật khẩu ban đầu',{exact:true}).fill('Initial-Password-2026');await page.getByLabel('Mật khẩu mới · tối thiểu 12 ký tự',{exact:true}).fill('Personal-New-Password-2026');await page.getByLabel('Nhập lại mật khẩu mới',{exact:true}).fill('Does-Not-Match-2026');await page.getByRole('button',{name:'Lưu mật khẩu & tiếp tục'}).click();await expect(page.getByRole('alert')).toContainText('chưa trùng khớp');
 await page.getByLabel('Nhập lại mật khẩu mới',{exact:true}).fill('Personal-New-Password-2026');await page.screenshot({path:'tmp/login-review/password-setup.png',fullPage:true});await page.getByRole('button',{name:'Lưu mật khẩu & tiếp tục'}).click();await expect(page.locator('#workspace-navigation')).toBeAttached();
 await page.getByRole('button',{name:'Mở menu',exact:true}).click();await page.locator('#workspace-navigation').getByRole('button',{name:'Tài khoản & đội ngũ',exact:true}).click();await page.getByRole('button',{name:'Đăng xuất',exact:true}).first().click();await expect(page.getByRole('button',{name:'Vào không gian làm việc'})).toBeVisible();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'tmp/login-review/after-logout.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS login: six responsive sizes, CTA above fold, image loaded, show/hide password, recovery help, errors, mandatory password setup, login and logout; no browser errors');
}finally{await browser?.close();const done=new Promise(r=>server.once('exit',r));server.kill();await done;assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));rmSync(dir,{recursive:true,force:true})}
