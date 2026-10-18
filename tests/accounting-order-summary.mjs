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
 const data=seed(),original=data.orders[0];data.user={id:'manager',role:'accounting',name:'QA Manager',code:'HQ-QA',mustChange:false};data.customers=data.customers.slice(0,4).map((c,i)=>({...c,group:['Salon','Wholesale','Khách lẻ','Start Business'][i],created:'2020-01-01'}));
 data.orders=[0,1,2,3].map(i=>{const date=i===0?'2025-12-01':i===1?'2026-09-01':'2026-10-01';return {...structuredClone(original),id:'period-'+i,orderCode:'PER-'+i,customerId:data.customers[i===3?0:i===1?0:i===0?1:2].id,stage:6,cancelledAt:null,date:'2025-01-01',approvedAt:date,history:[],accountingApproval:{time:date},officeDispatch:{time:date,dueDate:date},items:[{name:'Bulk',kind:'base',qty:100,price:i===1?900:100,unit:'Gram',priceBasis:'100g'}],discount:i===1?10:0,shippingFee:i===1?100:0,paymentFee:0,payments:i===1?[{confirmed:true,confirmedAt:'2026-09-01',amount:200,receivedDate:'2026-09-01'},{confirmed:true,confirmedAt:'2026-10-01',amount:300,receivedDate:'2026-10-01'}]:[{confirmed:true,confirmedAt:date,amount:100,receivedDate:date}],compensations:i===1?[{amount:19,date:'2026-10-01'}]:[]}});
 // Bills and actual bank dates may precede confirmation; they must not move reporting periods.
 for(const o of data.orders)for(const p of o.payments){p.date='2025-01-01';p.receivedDate='2025-02-01'}
 browser=await (process.env.QA_ENGINE==='webkit'?webkit:chromium).launch({headless:true,...(process.env.QA_ENGINE==='webkit'?{}:{channel:'msedge'})});const page=await browser.newPage({viewport:{width:1440,height:1050},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(process.env.QA_BASE_URL)await page.route('**/api/work/**',route=>route.request().method()==='GET'?route.continue():route.abort());
 await page.route('**/api/work/me',r=>r.fulfill({json:{user:data.user,csrf:'test'}}));await page.route('**/api/work/state',r=>r.fulfill({json:data}));await page.goto(base+'/workspace');
 const nav=label=>page.locator('.sidebar nav').getByRole('button',{name:label,exact:true}).click();const money=async(key,text)=>expect(page.getByTestId('period-kpi-'+key).locator('.metric-middle > strong')).toHaveText(text);

 await nav('Lịch sử đơn hàng');await page.getByRole('button',{name:'PER-1',exact:true}).click();await page.getByRole('button',{name:'Thanh toán & giao hàng',exact:true}).click();
 for(const [key,value]of [['discount','$10.00'],['revenue','$890.00'],['total','$500.00'],['cash','$400.00'],['recovered','$300.00'],['shipping','$100.00'],['debt','$490.00']])await expect(page.getByTestId('order-money-'+key).locator('b')).toHaveText(value);
 await expect(page.getByTestId('order-money-debt').locator('small')).toHaveCount(0);await expect(page.getByTestId('order-money-discount')).toContainText('Chưa có tỷ giá');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await expect(page.getByTestId('order-money-discount')).toBeVisible();assert.deepEqual(errors,[]);console.log('PASS accountant order details: discount and seven reconciled metrics, desktop/mobile');
}finally{await browser?.close();if(server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped}rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
