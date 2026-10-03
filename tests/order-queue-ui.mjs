import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-queue-')),base=process.env.QUEUE_TEST_URL||'http://127.0.0.1:3195';
const server=process.env.QUEUE_TEST_URL?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3195',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Test-Queue-Password-2026'},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({headless:true,channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/demo');await page.locator('nav .nav-item').filter({hasText:'Đơn hàng'}).click();
 await page.getByTestId('queue-count-sale').waitFor();
 const rows=page.locator('.open-stage-list button'),count=await rows.count();assert.equal(count,11);
 let total=0;
 for(let i=0;i<count;i++){
  const row=rows.nth(i),n=Number(await row.locator('b').textContent());total+=n;
  await row.click();assert.equal(await row.getAttribute('aria-pressed'),'true');
  await page.getByText(`${n} đơn phù hợp`,{exact:true}).waitFor();
 }
 await page.locator('.open-order-total').click();await page.getByText(`${total} đơn phù hợp`,{exact:true}).waitFor();
 await page.screenshot({path:'screenshots/order-queues.png',fullPage:true,animations:'disabled'});
 assert.deepEqual(errors,[]);
 console.log(`PASS: 11 queue filters match their counts, total ${total}, no browser errors (${base}).`);
}finally{
 if(browser)await browser.close();
 if(server&&server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped}
 if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe cleanup');
 rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}
