import ExcelJS from 'exceljs';
import {chromium,webkit,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync,readFileSync} from 'node:fs';
import os from 'node:os';import path from 'node:path';
import {seed} from '../seed.js';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-period-')),base=process.env.QA_BASE_URL||'http://127.0.0.1:3197';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3197',DATA_DIR:dir,NODE_ENV:'test'},stdio:'ignore'});let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 const data=seed(),original=data.orders[0];data.user={id:'manager',role:'manager',name:'QA Manager',code:'HQ-QA',mustChange:false};data.customers=data.customers.slice(0,4).map((c,i)=>({...c,group:['Salon','Wholesale','Khách lẻ','Start Business'][i],created:'2020-01-01'}));
 data.orders=[{...structuredClone(original),id:'fraction',orderCode:'HQ-LN-1-1',stage:3,cancelledAt:null,date:'2026-10-18',approvedAt:'2026-10-18',due:'2026-10-26',history:[],accountingApproval:{time:'2026-10-18'},officeDispatch:null,items:[{kind:'base',qty:100,price:314.5,unit:'Gram',priceBasis:'100g'}],discount:0,shippingFee:63,paymentFee:0,payments:[{id:'p',amount:377.17,confirmed:true,confirmedAt:'2026-10-18'}]}];
 browser=await (process.env.QA_ENGINE==='webkit'?webkit:chromium).launch({headless:true,...(process.env.QA_ENGINE==='webkit'?{}:{channel:'msedge'})});const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(process.env.QA_BASE_URL)await page.route('**/api/work/**',route=>route.request().method()==='GET'?route.continue():route.abort());
 await page.route('**/api/work/me',r=>r.fulfill({json:{user:data.user,csrf:'test'}}));await page.route('**/api/work/state',r=>r.fulfill({json:data}));await page.goto(base+'/workspace');
 const nav=label=>page.locator('.sidebar nav').getByRole('button',{name:label,exact:true}).click();const money=async(key,text)=>expect(page.getByTestId('period-kpi-'+key).locator('.metric-middle > strong')).toHaveText(text);

 await nav('Doanh thu & công nợ');await expect(page.locator('.donut strong [aria-hidden="true"]')).toHaveText('$0.33');await expect(page.getByTestId('period-kpi-debt').locator('.metric-middle > strong')).toHaveText('$0.33');
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.donut strong [aria-hidden="true"]')).toHaveText('$0.33');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 data.orders[0].payments[0].amount=377.5;await page.setViewportSize({width:1440,height:1050});await page.reload();await nav('Doanh thu & công nợ');await expect(page.locator('.donut strong [aria-hidden="true"]')).toHaveText('$0.00');assert.deepEqual(errors,[]);console.log('PASS exact fractional debt 0.33 and paid-in-full 0.00 on desktop/mobile');
}finally{await browser?.close();if(server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped}rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
