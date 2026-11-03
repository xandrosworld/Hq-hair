import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import os from 'node:os';
import path from 'node:path';
import {SESSION_LOCK_MS,SESSION_IDLE_MS} from '../session-policy.js';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-idle-')),base='http://127.0.0.1:3215';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3215',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'idle@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
let browser,db;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 db=new DatabaseSync(path.join(dir,'workspace.sqlite'));
 browser=await chromium.launch({headless:true,channel:'msedge'});const ctx=await browser.newContext(),page=await ctx.newPage();let csrf;
 const call=async(url,body,status=200)=>{const r=await ctx.request[body?'post':'get'](base+'/api/work'+url,body?{headers:{'X-CSRF-Token':csrf||''},data:body}:{});assert.equal(r.status(),status,url+' '+await r.text());const v=await r.json();if(v.csrf)csrf=v.csrf;return v};
 await call('/login',{email:'idle@example.com',password:'Initial-Password-2026'});await call('/password',{currentPassword:'Initial-Password-2026',password:'Personal-Password-2026'});
 const age=ms=>db.prepare('UPDATE auth_sessions SET last_activity=?,expires=?').run(Date.now()-ms,Date.now()-ms+SESSION_IDLE_MS);
 const before=db.prepare('SELECT last_activity FROM auth_sessions').get().last_activity;
 await call('/state');await call('/me');assert.equal(db.prepare('SELECT last_activity FROM auth_sessions').get().last_activity,before,'polling must not renew idle time');
 await call('/activity',{});assert.ok(db.prepare('SELECT last_activity FROM auth_sessions').get().last_activity>=before);
 await page.goto(base+'/workspace');await expect(page.locator('.shell main')).toBeVisible();
 await page.locator('nav').getByRole('button',{name:'Khách hàng',exact:true}).click();
 const search=page.locator('main .search input').first();await search.fill('Keep this unsaved search');
 age(SESSION_LOCK_MS-1000);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByRole('heading',{name:'Không gian đã khóa'})).toBeVisible();await call('/state',undefined,423);await call('/activity',{},423);await call('/customers',{name:'Blocked mutation'},423);
 await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByRole('heading',{name:'Không gian đã khóa'})).toBeVisible();await expect(page.locator('.shell')).toBeHidden();
 const second=await ctx.newPage();await second.goto(base+'/workspace');await expect(second.getByRole('heading',{name:'Không gian đã khóa'})).toBeVisible();assert.equal(await second.locator('.shell').count(),0,'reload must not load the protected app while locked');
 await page.getByLabel('Mật khẩu',{exact:true}).fill('wrong');await page.getByRole('button',{name:'Mở khóa và tiếp tục'}).click();await expect(page.getByRole('alert')).toContainText('Mật khẩu không đúng');
 await page.getByLabel('Mật khẩu',{exact:true}).fill('Personal-Password-2026');await page.waitForTimeout(1200);await expect(page.getByLabel('Mật khẩu',{exact:true})).toHaveValue('Personal-Password-2026');
 await page.getByRole('button',{name:'Mở khóa và tiếp tục'}).click();await expect(search).toHaveValue('Keep this unsaved search');await expect(second.locator('.shell main')).toBeVisible();
 age(SESSION_LOCK_MS+1000);for(let i=0;i<10;i++)await call('/unlock',{password:'wrong'},400);await call('/unlock',{password:'Personal-Password-2026'},429);
 db.prepare("DELETE FROM login_limits WHERE key LIKE 'unlock:%'").run();await call('/unlock',{password:'Personal-Password-2026'});
 age(SESSION_LOCK_MS+1000);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByRole('heading',{name:'Không gian đã khóa'})).toBeVisible();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));mkdirSync('tmp/session-review',{recursive:true});await page.screenshot({path:'tmp/session-review/locked-mobile.png',fullPage:true});
 age(SESSION_IDLE_MS+1000);await call('/unlock',{password:'Personal-Password-2026'},401);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByLabel('Email hoặc tên đăng nhập')).toBeVisible();await call('/state',undefined,401);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM audit WHERE action=?').get('session-unlock').n,2);
 console.log('PASS idle: polling unchanged, activity renewal, server lock/read/write denial, wrong password and rate limit, retained input, reload locked, two-tab unlock, mobile, five-hour expiry and unlock audit');
}finally{await browser?.close();db?.close();await new Promise(resolve=>{server.once('exit',resolve);server.kill()});rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
