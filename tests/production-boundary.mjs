import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';import path from 'node:path';
import {chromium,expect} from '@playwright/test';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-production-')),base='http://127.0.0.1:3207';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,NODE_ENV:'production',PORT:'3207',DATA_DIR:dir,HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 for(const route of ['/api/state','/api/reset'])assert.equal((await fetch(base+route)).status,404);
 for(const route of ['/api/work/state','/api/work/users','/api/work/audit','/api/work/backup-download'])assert.equal((await fetch(base+route)).status,401);
 const redirect=await fetch(base+'/demo',{redirect:'manual'});assert.equal(redirect.headers.get('location'),'/workspace');
 const robots=await fetch(base+'/robots.txt');assert.match(robots.headers.get('content-type'),/text\/plain/);assert.equal((await robots.text()).replaceAll('\r','').trim(),'User-agent: *\nDisallow: /');
 const html=await fetch(base+'/workspace',{headers:{'X-Forwarded-Proto':'https'}});assert.match(html.headers.get('strict-transport-security'),/max-age/);
 browser=await chromium.launch({channel:'msedge',headless:true});const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage();const errors=[],violations=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.addInitScript(()=>{window.policyViolations=[];addEventListener('securitypolicyviolation',e=>window.policyViolations.push(e.violatedDirective))});
 await page.goto(base+'/workspace',{waitUntil:'networkidle'});await expect(page.getByRole('button',{name:'Vào không gian làm việc'})).toBeVisible();
 assert.ok(!requests.some(u=>/\/assets\/main-/.test(u)),'workspace must load only after authentication');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'tmp/audit-login-after.png',fullPage:true});
 let csrf='',cookie='';
 async function call(route,body){const r=await fetch(base+'/api/work'+route,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf,Cookie:cookie,'X-Forwarded-Proto':'https'},body:JSON.stringify(body)});const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];if(value.csrf)csrf=value.csrf;return value}
 await call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});await call('/password',{currentPassword:'Initial-Password-2026',password:'Personal-New-Password-2026'});
 const split=cookie.indexOf('=');await ctx.addCookies([{name:cookie.slice(0,split),value:cookie.slice(split+1),url:base,httpOnly:true,sameSite:'Strict'}]);
 await page.reload({waitUntil:'networkidle'});await expect(page.locator('#workspace-navigation')).toBeAttached();assert.ok(requests.some(u=>/\/assets\/main-/.test(u)));
 violations.push(...await page.evaluate(()=>window.policyViolations));assert.deepEqual(violations,[]);assert.deepEqual(errors,[]);
 console.log('PASS production: auth boundaries, robots, HSTS, CSP, lazy loading, mobile login and authenticated workspace');
}finally{await browser?.close();const exited=new Promise(r=>server.once('exit',r));server.kill();await exited;rmSync(dir,{recursive:true,force:true})}
