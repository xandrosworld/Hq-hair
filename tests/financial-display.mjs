import {chromium,webkit,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-financial-')),base='http://127.0.0.1:3195',output='data/financial-review';mkdirSync(output,{recursive:true});
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3195',DATA_DIR:dir,NODE_ENV:'test'},stdio:'ignore'});
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 for(const engine of [chromium,webkit]){
 const browser=await engine.launch(engine===chromium?{channel:'msedge',headless:true}:{headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/state',async route=>{const response=await route.fetch(),data=await response.json(),o=data.orders.find(o=>o.orderCode&&o.stage>2&&!o.cancelledAt);
 assert.ok(o);Object.assign(o,{date:'2026-08-01',approvedAt:'2026-09-01',history:[],accountingApproval:{time:'2026-09-01'},due:'2026-10-20',stage:3,discount:30,shippingFee:85,paymentFee:0,compensations:[{amount:12.5,date:'2026-10-01'},{amount:99,voidedAt:'2026-10-02'}],items:[{name:'Bulk',kind:'base',qty:500,price:160,priceBasis:'100g',unit:'Gram',origin:'Raw Hair',lengthCm:50,texture:'Natural Straight',segment:'Premium',color:'1B'}],payments:[{id:'received-first',amount:50,confirmed:true,receivedDate:'2026-09-01'},{id:'received',amount:450,confirmed:true,receivedDate:'2026-10-01'},{id:'pending',amount:999,confirmed:false}]});data.orders=[o];await route.fulfill({response,json:data})});
 await page.goto(base+'/demo');await page.locator('main').waitFor();await page.getByRole('button',{name:'Đơn hàng chưa hoàn thành',exact:true}).click();await page.locator('.order-link').first().click();for(const width of [320,390,430]){
 await page.setViewportSize({width,height:900});
 const table=page.locator('.product-read-view').first();
 assert.ok(await table.locator('.hair-table-scroll').evaluate(e=>e.scrollWidth<=e.clientWidth+2));
 await table.screenshot({path:`${output}/${engine.name()}-compact-products-${width}.png`});
 await table.getByRole('button',{name:'Phóng to bảng',exact:true}).click();
 assert.ok(await table.locator('.hair-table-scroll').evaluate(e=>e.scrollWidth>e.clientWidth));
 await table.getByRole('button',{name:'Thu gọn bảng',exact:true}).click();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Thanh toán & giao hàng',exact:true}).click();
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedShipping=text}}}));
 await page.getByRole('button',{name:'Sao chép thông tin giao hàng',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('Đã sao chép thông tin giao hàng.');
 const copied=await page.evaluate(()=>window.copiedShipping);assert.ok(copied.includes('Người nhận:'));assert.ok(copied.includes('Địa chỉ:'));assert.ok(!copied.includes('Công nợ'));assert.ok(!copied.includes('Hạn thanh toán'));
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied')}}}));
 await page.getByRole('button',{name:'Sao chép thông tin giao hàng',exact:true}).click();
 await expect(page.getByLabel('Nội dung giao hàng để sao chép')).toHaveValue(copied);
 const financial=page.locator('.financial');
 await expect(financial.locator('div').filter({has:page.locator('span',{hasText:/^Tổng thu$/})})).toContainText('$855.00');
 await expect(financial).not.toContainText('Dự kiến theo chứng từ');
 const labels=await financial.locator(':scope>div>span').allTextContents();assert.equal(labels[labels.indexOf('Tổng đã nhận')+1],'Doanh thu đã nhận');assert.equal(labels[labels.indexOf('Tổng thu')-1],'Tất cả phí thanh toán và phí giao dịch do người mua chịu. Người bán phải nhận đủ số tiền.');
 for(const [label,value] of [['Tổng đã nhận','$500.00'],['Doanh thu đã nhận','$415.00'],['Công nợ còn lại','$355.00']])await expect(financial.locator(':scope>div').filter({has:page.getByText(label,{exact:true})})).toContainText(value);
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await financial.screenshot({path:`${output}/${engine.name()}-summary-${width}.png`})}
 await page.getByRole('button',{name:'In hóa đơn',exact:true}).click();await expect(page.locator('.invoice-payment-note')).not.toContainText('$');await expect(page.locator('.invoice-totals>div').last()).toHaveText('TOTAL USD$855.00');await page.evaluate(()=>document.fonts.ready);
 if(engine===chromium&&process.env.PRINT_PDF==='1')await page.pdf({path:`${output}/invoice.pdf`,format:'A4',printBackground:true});
 await page.getByRole('button',{name:'Đóng',exact:true}).click();await page.getByRole('button',{name:'Doanh thu & công nợ',exact:true}).click();
 for(const [index,value] of [[0,'$770.00'],[1,'$415.00'],[2,'$85.00'],[3,'$355.00'],[4,'$30.00'],[5,'$12.50']])await expect(page.locator('.metric-middle strong').nth(index)).toContainText(value);
 await expect(page.locator('.revenue-visual svg title').first()).toContainText('Doanh thu đã nhận $415.00');await page.screenshot({path:`${output}/${engine.name()}-report.png`,fullPage:true});
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await page.screenshot({path:`${output}/${engine.name()}-report-${width}.png`,fullPage:true})}
 const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'Xuất báo cáo CSV',exact:true}).click();const download=await downloadEvent;const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);const csv=Buffer.concat(chunks).toString();assert.ok(csv.includes('Doanh thu da nhan USD'));assert.ok(csv.includes('"450","35","415"'));assert.ok(csv.includes('"770","0","0","0","30"'));
 await page.getByLabel('Kỳ báo cáo').selectOption('month');
 for(const [month,expected] of [['2026-09',[770,0,50,355,30,0]],['2026-10',[0,415,35,355,0,12.5]]]){await page.getByLabel('Tháng báo cáo').fill(month);for(let i=0;i<expected.length;i++)await expect(page.locator('.metric-middle strong').nth(i)).toContainText('$'+expected[i].toFixed(2));}
 assert.deepEqual(errors,[]);console.log(`PASS ${engine.name()}: sample financial rows, order, mobile widths, invoice total, report cards/chart and CSV`);
 }finally{await browser.close()}
 }
}finally{if(server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped}if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe cleanup');rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
