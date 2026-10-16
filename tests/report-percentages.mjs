import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {seed} from '../seed.js';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-percentages-')),base='http://127.0.0.1:3195';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3195',DATA_DIR:dir,NODE_ENV:'test'},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 const data=seed(),original=data.orders[0];data.customers=data.customers.slice(0,4).map((c,i)=>({...c,group:['Salon','Wholesale','Khách lẻ','Start Business'][i],created:'2026-08-01'}));
 data.orders=[0,1,2].map((i)=>({...structuredClone(original),id:'percent-'+i,orderCode:'P-'+i,customerId:data.customers[i===2?1:0].id,stage:3,cancelledAt:null,approvedAt:i===0?'2026-09-01':'2026-10-01',date:i===0?'2026-09-01':'2026-10-01',history:[],accountingApproval:{time:i===0?'2026-09-01':'2026-10-01'},items:[{kind:'base',qty:1,price:i===2?200:100,unit:'Piece'}],discount:i===2?0:10,shippingFee:i===2?0:20,paymentFee:0,payments:[{id:'pay'+i,confirmed:true,amount:i===2?100:65,date:i===0?'2026-09-01':'2026-10-01'}],compensations:i===0?[{amount:19,date:'2026-09-01'}]:[]}));
 browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/state',route=>route.fulfill({json:data}));await page.goto(base+'/demo');
 const nav=label=>page.locator('.sidebar nav').getByRole('button',{name:label,exact:true}).click();
 await nav('Khách hàng');await page.getByRole('button',{name:'Thống kê khách hàng',exact:true}).click();
 await expect(page.getByTestId('customer-group-2')).toContainText('50% tổng khách đã mua · 1/2');await expect(page.getByTestId('customer-group-3')).toContainText('50% tổng khách đã mua · 1/2');await expect(page.getByTestId('customer-group-0')).toContainText('0% tổng khách đã mua · 0/2');await expect(page.getByTestId('buyers-total').locator('.animated-number')).toHaveAttribute('data-value','2');
 await page.getByTestId('customer-group-2').click();await expect(page.getByTestId('buyers-total').locator('.animated-number')).toHaveAttribute('data-value','1');await expect(page.getByTestId('customer-group-2')).toContainText('1/2');await page.getByTestId('customer-group-2').click();
 await page.getByLabel('Kỳ thống kê khách hàng').selectOption('month');await page.getByLabel('Tháng thống kê khách',{exact:true}).fill('09/2026');await expect(page.getByTestId('customer-group-2')).toContainText('100% tổng khách đã mua · 1/1');await expect(page.getByTestId('customer-group-3')).toContainText('0% tổng khách đã mua · 0/1');
 await page.getByLabel('Tháng thống kê khách',{exact:true}).fill('07/2026');await expect(page.getByTestId('customer-group-2')).toContainText('— · Chưa có khách đã mua');
 await page.getByLabel('Kỳ thống kê khách hàng').selectOption('all');mkdirSync('screenshots/percentages',{recursive:true});await page.screenshot({path:'screenshots/percentages/customers.png',fullPage:true});
 await nav('Doanh thu & công nợ');await page.getByLabel('Báo cáo từ tháng',{exact:true}).fill('09/2026');await expect(page.getByTestId('period-kpi-cash')).toContainText('50% so với doanh thu thuần');await expect(page.getByTestId('period-kpi-debt')).toContainText('50% so với doanh thu thuần');await expect(page.getByTestId('period-kpi-discount')).toContainText('5,26% so với doanh thu thuần');await expect(page.getByText('Vận chuyển đã nhận',{exact:true})).toHaveCount(0);await expect(page.getByText('Thiệt hại',{exact:true})).toHaveCount(0);await expect(page.getByTestId('period-kpi-current')).toContainText('$190.00');
 await page.screenshot({path:'screenshots/percentages/revenue.png',fullPage:true});
 await page.getByLabel('Báo cáo đến tháng',{exact:true}).fill('09/2026');await expect(page.getByTestId('period-kpi-debt')).toContainText('$45.00');await expect(page.getByTestId('period-kpi-current')).toContainText('$45.00');await expect(page.getByTestId('period-kpi-recovered')).toContainText('$0.00');
 await page.getByLabel('Báo cáo từ tháng',{exact:true}).fill('07/2026');await page.getByLabel('Báo cáo đến tháng',{exact:true}).fill('07/2026');await expect(page.getByTestId('period-kpi-cash')).toContainText('Chưa có doanh thu thuần');await expect(page.getByTestId('period-kpi-debt')).toContainText('$0.00');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'screenshots/percentages/revenue-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.deepEqual(errors,[]);console.log('PASS group buyer percentages, persistent total across group filters, period cutoff, revenue denominators, shipping exclusion, >100%, zero-base and mobile layout.');
}finally{await browser?.close();if(server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped}rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
