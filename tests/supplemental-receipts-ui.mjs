import {writeFileSync,unlinkSync} from 'node:fs';
import {createServer} from 'vite';
import {chromium,webkit,expect} from '@playwright/test';
import assert from 'node:assert/strict';
writeFileSync('data/supplemental-qa.jsx',`import React from 'react';import {createRoot} from 'react-dom/client';import {AccountingWorkspace} from '/src/accounting-workspace.jsx';createRoot(document.getElementById('root')).render(<AccountingWorkspace user={{role:'accounting',name:'QA'}} Payments={()=>null} Modal={()=>null}/>);`);
const server=await createServer({server:{port:3198,host:'127.0.0.1'},logLevel:'error'});await server.listen();let browser;
try{for(const engine of [chromium,webkit]){
 browser=await engine.launch({headless:true,...(engine===chromium?{channel:'msedge'}:{})});const page=await browser.newPage();let writes=0;page.on('pageerror',e=>console.log(e.stack));
 const order={id:'o',version:1,stage:3,orderCode:'HQ-EM-3-1',date:'2026-10-29',sale:'Emily',accountingApproval:{status:'partial',time:'2026-10-29'},items:[],messages:[],history:[],payments:[{id:'new',sender:'Prachee',date:'2026-10-30',amount:0,confirmed:false}]};
 const state={user:{role:'accounting'},orders:[order],customers:[]};
 await page.route('**/api/work/state',r=>r.fulfill({json:state}));
 await page.route('**/api/work/orders/o/action',r=>{const b=r.request().postDataJSON();assert.equal(b.action,'accounting-receive');assert.equal(b.receipts[0].amount,9.78);writes++;order.payments[0].confirmed=true;order.version++;return r.fulfill({json:state})});
 await page.route('**/supplemental-qa',async r=>r.fulfill({contentType:'text/html',body:await server.transformIndexHtml('/supplemental-qa','<div id="root"></div><script type="module" src="/data/supplemental-qa.jsx"></script>')}));
 await page.goto('http://127.0.0.1:3198/supplemental-qa');await page.getByRole('button',{name:'Đã duyệt cần theo dõi',exact:true}).click();await page.getByRole('button',{name:'HQ-EM-3-1',exact:true}).click();
 await page.locator('.accounting-receipts input[type=checkbox]').check();await page.getByLabel('Thực nhận new',{exact:true}).fill('9.78');await page.getByRole('button',{name:'Ghi nhận tiền bổ sung',exact:true}).click();await page.getByRole('button',{name:'Xác nhận ghi nhận',exact:true}).click();await expect(page.locator('.accounting-receipts input[type=checkbox]')).toHaveCount(0);assert.equal(writes,1);assert.equal(order.stage,3);console.log(engine.name()+': PASS supplemental receipt form and unchanged stage');await browser.close();
}}finally{await browser?.close();await server.close();unlinkSync('data/supplemental-qa.jsx')}



