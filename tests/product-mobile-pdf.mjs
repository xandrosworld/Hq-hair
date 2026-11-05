import {standardsFixture} from './standards-fixture.mjs';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,unlinkSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,webkit,expect} from '@playwright/test';
import {createServer} from 'vite';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-product-pdf-')),port=3197,base=`http://127.0.0.1:${port}`,standards=await standardsFixture(dir);
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),DATA_DIR:dir,HQ_STANDARDS_DIR:standards,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:['ignore','pipe','pipe']});let logs='',browser,vite;
server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);
function client(){return {cookie:'',csrf:'',async call(url,body){const r=await fetch(base+'/api/work'+url,{method:body?'POST':'GET',headers:{Cookie:this.cookie,...(body?{'Content-Type':'application/json','X-CSRF-Token':this.csrf,'Idempotency-Key':crypto.randomUUID()}:{})},body:body?JSON.stringify(body):undefined});const v=await r.json();assert.equal(r.status,200,JSON.stringify(v));if(r.headers.get('set-cookie'))this.cookie=r.headers.get('set-cookie').split(';')[0];if(v.csrf)this.csrf=v.csrf;return v}}}
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}if(i===99)throw Error(logs);await new Promise(r=>setTimeout(r,100))}
 const owner=client();await owner.call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});await owner.call('/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 await owner.call('/users',{name:'Factory',email:'factory@example.com',role:'factory',password:'Factory-Initial-Password'});
 await owner.call('/users',{name:'Accountant',email:'accounting@example.com',role:'accounting',password:'Accounting-Initial-Password'});
 const accountant=client();await accountant.call('/login',{email:'accounting@example.com',password:'Accounting-Initial-Password'});await accountant.call('/password',{currentPassword:'Accounting-Initial-Password',password:'Accounting-New-Password'});
 const factory=client();await factory.call('/login',{email:'factory@example.com',password:'Factory-Initial-Password'});await factory.call('/password',{currentPassword:'Factory-Initial-Password',password:'Factory-New-Password'});
 const state=await owner.call('/customers',{name:'Private Buyer',company:'Salon',phone:'+123456789',country:'United States',group:'Salon',address:'Private street',recipient:'Buyer',recipientPhone:'+123456789',social:'https://example.com',source:'Website',purchase:'Đơn đầu tiên'});
 const item={name:'Bulk Hair',origin:'Raw Hair',lengthCm:45,texture:'Natural Wavy',segment:'Super Double Drawn',color:'33',productNote:'Đóng gói cẩn thận, kiểm tra màu trước khi giao.',kind:'base',unit:'Gram',price:89.5,priceBasis:'100g',qty:100};
 const draft={customerId:state.customers[0].id,date:'2026-11-05',due:'2026-11-20',items:[item],discount:0,shippingFee:0,paymentFee:0,payments:[{sender:'Buyer',amount:89.5,method:'Wise',date:'2026-11-05',reference:'TEST-PDF'}],recipient:'Buyer',phone:'+123456789',country:'United States',address:'Private street',submit:false};
 let saved=await owner.call('/orders',draft),order=saved.state.orders[0];
 const url=`/api/work/orders/${order.id}/factory-slip.pdf`;
 assert.equal((await fetch(base+url)).status,401);
 assert.equal((await fetch(base+url,{headers:{Cookie:factory.cookie}})).status,404);
 saved=await owner.call('/orders',{...order,submit:true});order=saved.state.orders[0];
 saved=await accountant.call(`/orders/${order.id}/action`,{action:'accounting-approve',version:order.version,paymentStatus:'full',receipts:[{id:order.payments[0].id,amount:89.5,fxRate:25550}]});
 order=saved.orders[0];
 for(const engine of [chromium,webkit]){
  browser=await engine.launch({headless:true,...engine===chromium?{channel:'msedge'}:{}});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});
  await ctx.request.post(base+'/api/work/login',{data:{email:'factory@example.com',password:'Factory-New-Password'}});
  const page=await ctx.newPage();await page.goto(base+'/workspace');
  await page.getByRole('button',{name:order.orderCode,exact:true}).first().click();
  const link=page.getByRole('link',{name:'Tải PDF phiếu sản phẩm'});await expect(link).toBeVisible();
  const download=page.waitForEvent('download');await link.click();const file=await download;
  assert.match(file.suggestedFilename(),/\.pdf$/);assert.equal(await file.failure(),null);await file.saveAs(`data/factory-mobile-${engine.name()}.pdf`);
  await expect(link).not.toHaveAttribute('target','_blank');await page.screenshot({path:`data/factory-pdf-${engine.name()}.png`});await browser.close();
 }
 // Exercise the actual editor with a populated price catalogue: quantity edits must not undo a selected unit.
 const styles=[...readFileSync('src/main.jsx','utf8').matchAll(/import '([^']+\.css)'/g)].map(m=>`import '${m[1].startsWith('./')?'/src/'+m[1].slice(2):m[1]}';`).join('\n');
 writeFileSync('data/product-qa.jsx',`${styles}\nimport React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {ProductEditorTable} from '/src/product-table.jsx';function QA(){const [items,setItems]=useState([${JSON.stringify(item)}]);return <main><ProductEditorTable items={items} kind="base" products={[]} onChange={setItems}/><output>{JSON.stringify(items)}</output></main>}createRoot(document.getElementById('root')).render(<QA/>);`);
 vite=await createServer({server:{port:3198,host:'127.0.0.1'},logLevel:'error'});await vite.listen();
 for(const engine of [chromium,webkit]){browser=await engine.launch({headless:true,...engine===chromium?{channel:'msedge'}:{}});const page=await browser.newPage();
 await page.route('**/api/work/pricing',r=>r.fulfill({json:{version:1,colors:[{code:'33',tone:'dark'}],prices:[{id:'p',product:'Bulk Hair',tier:'Basic',segment:'Super Double Drawn',lengthCm:45,tone:'dark',price:89.5,priceBasis:'100g'}]}}));
 await page.route('**/workspace/product-qa',async r=>r.fulfill({contentType:'text/html',body:await vite.transformIndexHtml('/workspace/product-qa','<div id="root"></div><script type="module" src="/data/product-qa.jsx"></script>')}));
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:3198/workspace/product-qa');
 const unit=page.getByLabel('Đơn vị số lượng 1',{exact:true}),basis=page.getByLabel('Cách tính giá 1',{exact:true});await expect(unit).toHaveValue('Gram');await unit.selectOption('Piece');await expect(basis).toHaveValue('unit');await page.getByLabel('Số lượng 1',{exact:true}).fill('2');await expect(unit).toHaveValue('Piece');await expect(page.locator('tbody tr').first().locator('.hair-amount')).toHaveText('$179.00');
 await basis.selectOption('100g');await expect(unit).toHaveValue('Gram');await page.getByLabel('Số lượng 1',{exact:true}).fill('100');await expect(page.locator('tbody tr').first().locator('.hair-amount')).toHaveText('$89.50');
 await basis.selectOption('unit');await expect(unit).toHaveValue('Piece');if(width===390)await page.screenshot({path:`data/product-unit-${engine.name()}.png`,fullPage:true});console.log(engine.name(),width,'unit/amount PASS');}await browser.close();}
 console.log('Mobile PDF downloads, access checks and unit calculations PASS');
}finally{await browser?.close();await vite?.close();const done=new Promise(r=>server.once('exit',r));server.kill();await done;rmSync(dir,{recursive:true,force:true});try{unlinkSync('data/product-qa.jsx')}catch{}}
