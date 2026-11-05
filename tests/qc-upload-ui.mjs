import {writeFileSync,unlinkSync} from 'node:fs';
import {createServer} from 'vite';
import {chromium,webkit,expect} from '@playwright/test';
import assert from 'node:assert/strict';
writeFileSync('data/qc-upload-qa.jsx',`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {QualityControl} from '/src/quality-control.jsx';const initial={id:'o',version:1,stage:8,date:'2026-10-01',items:[{name:'Hair',qty:1}],qcMedia:[]};function App(){const [o,setO]=useState(initial);return <QualityControl order={o} user={{role:'sale'}} onUpdate={s=>setO(s.orders[0])}/>};createRoot(document.getElementById('root')).render(<App/>);`);
const server=await createServer({server:{port:3199,host:'127.0.0.1'},logLevel:'error'});await server.listen();let browser;
try{for(const engine of [chromium,webkit]){
 browser=await engine.launch({headless:true,...(engine===chromium?{channel:'msedge'}:{})});const page=await browser.newPage();let uploaded=false;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/work/orders/o/qc-upload',r=>{const b=r.request().postDataJSON();assert.ok(b.file.data.startsWith('data:video/quicktime;base64,'));assert.ok(r.request().headers()['idempotency-key']);uploaded=true;return r.fulfill({json:{orders:[{id:'o',version:2,stage:8,date:'2026-10-01',items:[{name:'Hair',qty:1}],qcMedia:[{id:'v',name:'iphone.MOV',mime:'video/quicktime',size:13000000}]}]}})});
 await page.route('**/workspace/qc-qa',async r=>r.fulfill({contentType:'text/html',body:await server.transformIndexHtml('/workspace/qc-qa','<div id="root"></div><script type="module" src="/data/qc-upload-qa.jsx"></script>')}));
 await page.goto('http://127.0.0.1:3199/workspace/qc-qa');const bytes=Buffer.alloc(13*1024*1024);bytes.write('ftyp',4);await page.getByLabel('Tệp kiểm định 1',{exact:true}).setInputFiles({name:'iphone.MOV',mimeType:'video/quicktime',buffer:bytes});
 await expect(page.getByRole('button',{name:'Bỏ tệp iphone.MOV'})).toBeVisible({timeout:30000});await expect(page.getByText('Đã tải tệp. Bấm Lưu QC để lưu vào phiếu.',{exact:true})).toBeVisible();assert.ok(uploaded);assert.deepEqual(errors,[]);console.log(engine.name()+': PASS 13MiB MOV upload via XHR and draft attachment');await browser.close();
}}finally{await browser?.close();await server.close();unlinkSync('data/qc-upload-qa.jsx')}
