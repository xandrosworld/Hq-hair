import {writeFileSync,unlinkSync} from 'node:fs';
import {createServer} from 'vite';
import {chromium,webkit,expect} from '@playwright/test';
import assert from 'node:assert/strict';
writeFileSync('data/credit-qa.jsx',`import React from 'react';import {createRoot} from 'react-dom/client';import {AccountingWorkspace} from '/src/accounting-workspace.jsx';createRoot(document.getElementById('root')).render(<AccountingWorkspace user={{role:'accounting',name:'QA'}} Payments={()=>null} Modal={()=>null}/>);`);
const server=await createServer({server:{port:3198,host:'127.0.0.1'},logLevel:'error'});await server.listen();let browser;
try{for(const engine of [chromium,webkit]){
 browser=await engine.launch({headless:true,...(engine===chromium?{channel:'msedge'}:{})});const page=await browser.newPage();let writes=0;page.on('pageerror',e=>console.log(e.stack));
 const order={id:'o',version:1,stage:7,officeDispatch:{time:'2026-10-29'},orderCode:'HQ-EM-3-1',date:'2026-10-29',sale:'Emily',accountingApproval:{status:'partial',time:'2026-10-29'},items:[{kind:'base',name:'Hair',qty:1,price:110}],discount:10,messages:[],history:[],payments:[{id:'old',sender:'Buyer',date:'2026-10-30',receivedDate:'2026-10-30',amount:30,confirmed:true,exchangeRate:25500}]};
 const state={user:{role:'accounting'},orders:[order],customers:[]};
 await page.route('**/api/work/state',r=>r.fulfill({json:state}));
 await page.route('**/api/work/orders/o/action',r=>{const b=r.request().postDataJSON();assert.equal(b.action,'accounting-credit');writes++;order.finalPaymentCheck={status:'credit',debt:70};order.stage=8;order.version++;return r.fulfill({json:state})});
 await page.route('**/credit-qa',async r=>r.fulfill({contentType:'text/html',body:await server.transformIndexHtml('/credit-qa','<div id="root"></div><script type="module" src="/data/credit-qa.jsx"></script>')}));
 await page.goto('http://127.0.0.1:3198/credit-qa');await page.getByRole('button',{name:'Đã duyệt cần theo dõi',exact:true}).click();await page.getByRole('button',{name:'HQ-EM-3-1',exact:true}).click();
 await expect(page.getByTestId('order-money-discount')).toContainText('255.000');await expect(page.getByTestId('order-money-revenue')).toContainText('2.550.000');await page.getByRole('button',{name:'Giao hàng công nợ',exact:true}).click();await page.getByRole('button',{name:'Xác nhận duyệt',exact:true}).click();await expect(page.getByText(/Giao hàng công nợ · Còn nợ hiện tại/)).toBeVisible();assert.equal(writes,1);assert.equal(order.stage,8);await page.getByRole('button',{name:'Danh sách đơn',exact:true}).click();await page.getByRole('tab',{name:/^Đã kiểm tra lần cuối/}).click();await page.getByRole('tab',{name:/^Giao hàng công nợ/}).click();await expect(page.locator('tbody tr')).toContainText('Giao hàng công nợ');await page.getByRole('tab',{name:/^Thanh toán đủ/}).click();await expect(page.getByText('Không có đơn phù hợp với bộ lọc hiện tại.')).toBeVisible();console.log(engine.name()+': PASS credit shipping and receipt FX fallback');await browser.close();
}}finally{await browser?.close();await server.close();unlinkSync('data/credit-qa.jsx')}



