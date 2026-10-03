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
 await page.goto(base+'/demo');
 const overview=async()=>{await page.locator('.order-subnav button').first().click();await page.locator('.queue-group-filter').first().waitFor()};
 await overview();
 await page.locator('.queue-group-filter').first().waitFor();
 assert.equal(await page.locator('.queue-details').count(),0);
 let total=0,details=0;
 for(let g=0;g<3;g++){
  const group=page.locator('.queue-group').nth(g),filter=group.locator('.queue-group-filter');
  const count=Number(await filter.locator('b').textContent());total+=count;
  await filter.click();await page.getByText(`${count} đơn phù hợp`,{exact:true}).waitFor();
  assert.equal(await page.locator('.order-overview').count(),0);
  await overview();
  await group.locator('.queue-expand').click();
  assert.equal(await page.locator('.queue-details').count(),1);
  const rows=group.locator('.queue-details button');let sum=0;
  for(let i=0;i<await rows.count();i++){
   const row=rows.nth(i),n=Number(await row.locator('b').textContent());sum+=n;details++;
   await row.click();
   await page.getByText(`${n} đơn phù hợp`,{exact:true}).waitFor();
   await overview();await group.locator('.queue-expand').click();
  }
  assert.equal(sum,count);
 }
 assert.equal(details,11);
 await page.locator('.queue-expand[aria-expanded=true]').click();
 await page.locator('.queue-total').click();await page.getByText(`${total} đơn phù hợp`,{exact:true}).waitFor();
 await overview();
 const columns=await page.locator('.activity-bar span').allTextContents();assert.equal(columns.length,12);assert.ok(columns.every(v=>/^\d+$/.test(v)));
 const sum=columns.reduce((n,v)=>n+Number(v),0);
 assert.equal(await page.locator('.approved-history tbody tr').count(),Math.min(sum,20));
 await page.getByLabel('Tháng lịch sử đơn').selectOption('09');
 assert.equal(await page.locator('.approved-history tbody tr').count(),Math.min(Number(columns[8]),20));
 await page.getByLabel('Tháng lịch sử đơn').selectOption('all');
 if(sum){await page.locator('.approved-history .order-link').first().click();await page.locator('.back-link').click();await page.locator('.approved-history').waitFor()}
 await page.screenshot({path:'screenshots/order-queues.png',fullPage:true,animations:'disabled'});
 assert.deepEqual(errors,[]);
 console.log(`PASS: 11 queue filters match their counts, total ${total}, no browser errors (${base}).`);
}finally{
 if(browser)await browser.close();
 if(server&&server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped}
 if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe cleanup');
 rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}
