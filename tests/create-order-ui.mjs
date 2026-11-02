import {createServer} from 'vite';
import {chromium,webkit,expect} from '@playwright/test';
import assert from 'node:assert/strict';
const server=await createServer({server:{port:3199,host:'127.0.0.1'},logLevel:'error'});await server.listen();let browser;
try{for(const engine of [chromium,webkit]){browser=await engine.launch({headless:true,...(engine===chromium?{channel:'msedge'}:{})});const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));const user={id:'lead',name:'Trưởng nhóm Sale',role:'sales_lead',leadEdit:true};let stateReads=0;
await p.route('**/api/work/**',async r=>{if(new URL(r.request().url()).pathname.endsWith('/state')){stateReads++;if(stateReads>1)return r.abort();}return r.fulfill({json:{user,customers:[],orders:[],catalog:[],prices:[],colors:[],csrf:'test'}})});
await p.goto('http://127.0.0.1:3199/workspace');await p.getByRole('button',{name:'Tạo đơn hàng',exact:true}).click();await expect(p.getByRole('heading',{name:'Tạo đơn hàng Bản nháp'})).toBeVisible();assert.equal(stateReads,1);assert.deepEqual(errors,[]);console.log(engine.name()+': PASS sales lead opens new order without another state request');await browser.close();}}finally{await browser?.close();await server.close()}
