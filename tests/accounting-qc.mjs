import {standardsFixture} from './standards-fixture.mjs';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,readdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync,backup} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-qc-')),port=3193,base=`http://127.0.0.1:${port}/api/work`;
const standardsDir=await standardsFixture(dir);
let server,logs='';
async function start(){server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),DATA_DIR:dir,HQ_STANDARDS_DIR:standardsDir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:['ignore','pipe','pipe']});server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);for(let i=0;i<100;i++){try{if((await fetch(base.replace('/work','/health'))).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error(logs)}
async function stop(){const done=new Promise(r=>server.once('exit',r));server.kill();await done}
function client(){return {cookie:'',csrf:'',async call(url,body,{status=200,key=randomUUID(),csrf=this.csrf}={}){const r=await fetch(base+url,{method:body?'POST':'GET',headers:{Cookie:this.cookie,...(body?{'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':key}:{})},body:body?JSON.stringify(body):undefined});const v=await r.json();assert.equal(r.status,status,`${url}: ${JSON.stringify(v)}`);const c=r.headers.get('set-cookie');if(c)this.cookie=c.split(';')[0];if(v.csrf)this.csrf=v.csrf;return v}}}
const owner=client(),a=client(),b=client(),accountant=client(),factory=client(),anonymous=client();
const customer={name:'Client A',company:'Salon A',phone:'+123456789',email:'buyer@example.com',country:'United States',group:'Salon',address:'123 Example St',recipient:'Buyer',recipientPhone:'+123456789',social:'https://example.com',source:'Website',purchase:'Đơn đầu tiên'};
try{
 await start();
 await anonymous.call('/state',undefined,{status:401});
 await owner.call('/login',{email:'owner@example.com',password:'wrong'},{status:401});
 await owner.call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});
 await owner.call('/state',undefined,{status:403});
 await owner.call('/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 let users=await owner.call('/users',{name:'Sale A',email:'sale-a@example.com',role:'sale',password:'Sale-Initial-Password'});
 users=await owner.call('/users',{name:'Sale B',email:'sale-b@example.com',role:'sale',password:'Sale-Initial-Password'});
 users=await owner.call('/users',{name:'Accountant',email:'accounting@example.com',role:'accounting',password:'Sale-Initial-Password'});
 users=await owner.call('/users',{name:'Factory',email:'factory@example.com',role:'factory',password:'Sale-Initial-Password'});
 for(const [c,email] of [[factory,'factory@example.com'],[a,'sale-a@example.com'],[b,'sale-b@example.com'],[accountant,'accounting@example.com']]){await c.call('/login',{email,password:'Sale-Initial-Password'});await c.call('/password',{currentPassword:'Sale-Initial-Password',password:'Personal-New-Password'})}
 const state=await a.call('/customers',customer),c=state.customers[0];
 const draft={customerId:c.id,date:'2026-09-29',due:'2026-10-10',items:[{name:'Bulk Hair',origin:'Raw Hair',lengthCm:55,texture:'Straight',segment:'Super Double Drawn',color:'1A',productNote:'Product specification note',kind:'base',unit:'Gram',price:100,priceBasis:'100g',qty:100}],discount:0,shippingFee:0,paymentFee:0,payments:[],recipient:'Buyer',phone:'+12345678',email:'buyer@example.com',country:'United States',address:'Example St'};
 let saved=await a.call('/orders',{...draft,orderCode:'FORGED',accountingApproval:{status:'full'}}),o=saved.state.orders[0];const id=o.id;assert.equal(o.orderCode,null);assert.match(o.requestCode,/^YC-/);
 assert.equal((await accountant.call('/state')).orders.length,0);
 await factory.call(`/orders/${id}/qc`,{version:o.version,qc:{}},{status:404});
 saved=await a.call('/orders',{...o,submit:true});o=saved.state.orders[0];
 assert.equal(o.orderCode,null);
 const current=async()=>((await a.call('/state')).orders.find(x=>x.id===id));
 const action=async(client,action,extra={},status=200)=>client.call(`/orders/${id}/action`,{version:(await current()).version,action,...extra},{status});
 assert.equal((await accountant.call('/state')).orders.length,1);
 await action(a,'accounting-approve',{},403);
 await accountant.call(`/orders/${id}/qc`,{version:o.version,qc:{}},{status:403});
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
 const upload={version:o.version,file:{name:'qc.png',data:png}},key=randomUUID();
 let next=await factory.call(`/orders/${id}/qc-upload`,upload,{key});
 next=await factory.call(`/orders/${id}/qc-upload`,upload,{key});o=next.orders[0];assert.equal(o.qcMedia.length,1);
 const mediaId=o.qcMedia[0].id,mediaPath=`/orders/${id}/qc-media/${mediaId}`;
 for(const who of [factory,a,accountant])assert.equal((await fetch(base+mediaPath,{headers:{Cookie:who.cookie}})).status,200);
 await b.call(mediaPath,undefined,{status:404});
 const ranged=await fetch(base+mediaPath,{headers:{Cookie:factory.cookie,Range:'bytes=0-7'}});assert.equal(ranged.status,206);assert.equal((await ranged.arrayBuffer()).byteLength,8);
 const q={date:'2026-10-02',rows:[{index:0,note:'',mediaIds:[]}],special:[],note:''};
 await factory.call(`/orders/${id}/qc`,{version:o.version,qc:q,complete:true},{status:400});
 q.rows[0]={index:0,note:'Hair checked',mediaIds:[mediaId]};
 next=await factory.call(`/orders/${id}/qc`,{version:o.version,qc:q,complete:true});
 assert.ok(next.orders[0].qc.completedAt);
 await a.call(`/orders/${id}/qc`,{version:o.version,qc:q},{status:409});
 o=await current();await a.call(`/orders/${id}/qc`,{version:o.version,qc:{...q,note:'Sale reviewed'},complete:true});
 await action(a,'payment',{payment:{sender:'Buyer',amount:30,method:'Wise',date:'2026-10-02',reference:'PARTIAL'}});
 o=await current();const receipts=[{id:o.payments[0].id,amount:30}];
 await action(accountant,'accounting-approve',{paymentStatus:'full',receipts},400);
 assert.equal((await current()).payments[0].confirmed,false);
 await action(accountant,'accounting-cancel',{text:'Cannot cancel paid receipt'},400);
 await action(accountant,'accounting-approve',{paymentStatus:'partial',receipts});
 o=await current();assert.equal(o.stage,3);assert.equal(o.accountingApproval.status,'partial');assert.equal(o.orderCode,c.id+'-1');assert.equal(o.id,id);
 await action(a,'payment',{payment:{sender:'Buyer',amount:70,method:'Wise',date:'2026-10-02',reference:'BALANCE'}});
 o=await current();await action(accountant,'accounting-approve',{paymentStatus:'full',receipts:[{id:o.payments[1].id,amount:70}]});
 assert.equal((await current()).accountingApproval.status,'full');assert.equal((await current()).orderCode,c.id+'-1');
 // Exercise the built app with actual authenticated role sessions.
 const {chromium}=await import('@playwright/test');
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const errors=[];
  for(const [who,email] of [[factory,'factory@example.com'],[accountant,'accounting@example.com'],[a,'sale-a@example.com']]){
   const ctx=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),page=await ctx.newPage();
   page.on('pageerror',e=>errors.push(e.message));
   await ctx.request.post(base+'/login',{data:{email,password:'Personal-New-Password'}});
   await page.goto(base.replace('/api/work','/workspace'));
   if(who===accountant)await page.getByRole('combobox').selectOption('all');
   if(who===a){
    await page.getByRole('button',{name:'Quy chuẩn sản phẩm',exact:true}).click();
    await page.getByRole('heading',{name:'Quy chuẩn sản phẩm',exact:true}).waitFor();
    await page.getByLabel('Nhóm quy chuẩn').selectOption('6');
    await page.getByLabel('Ngôn ngữ quy chuẩn').selectOption('en');
    await page.waitForFunction(()=>{const i=document.querySelector('.standards-page img');return i?.complete&&i.naturalWidth>0&&i.src.endsWith('page-14.webp')});
    await page.getByRole('button',{name:'Phóng to',exact:true}).click();
    assert.ok(await page.locator('.standards-page.zoomed').count());
    await page.getByRole('button',{name:'Vừa khung',exact:true}).click();
    await page.screenshot({path:'screenshots/product-standards-fixture.png',fullPage:true,animations:'disabled'});
    await page.locator('.nav-item').filter({hasText:'Đơn hàng'}).click();
   }
   await page.getByRole('button',{name:(await current()).orderCode,exact:true}).first().click();
   for(const label of ['Sản phẩm','Thanh toán & giao hàng','Phiếu kiểm định'])assert.ok(await page.getByRole('button',{name:label,exact:true}).isVisible());
   if(who===a){const step=page.locator('.timeline-step').nth(2);assert.ok(await step.locator('svg').count());await page.getByText('Thanh toán đủ',{exact:true}).waitFor();}
   await page.getByRole('button',{name:'Phiếu kiểm định',exact:true}).click();
   await page.getByRole('heading',{name:'KIỂM ĐỊNH ĐƠN HÀNG (QC)'}).waitFor();
   assert.deepEqual(await page.locator('.qc-product-row').first().locator('td').allTextContents(),['1','Bulk Hair','Raw Hair','55','Straight','Super Double Drawn','1A','Product specification note','100G']);
   assert.equal(await page.locator('.qc-table thead th').count(),9);
   if(who===factory){
    await page.getByLabel('Đánh giá sản phẩm 1',{exact:true}).fill('Factory UI checked');
    await page.getByRole('button',{name:'Hoàn tất QC',exact:true}).click();
    await page.getByText('Đã hoàn tất phiếu kiểm định.',{exact:true}).waitFor();
   }else if(who===accountant)assert.equal(await page.getByRole('button',{name:'Lưu QC',exact:true}).count(),0);
   else assert.ok(await page.getByLabel('Đánh giá sản phẩm 1',{exact:true}).isEditable());
   if(who===a){
    for(const width of [1120,1280,1440,1920]){
     await page.setViewportSize({width,height:1000});
     const layout=await page.locator('.qc-sheet').evaluate(el=>({fits:el.scrollWidth<=el.clientWidth,tableFits:[...el.querySelectorAll('.table-scroll')].every(x=>x.scrollWidth<=x.clientWidth+1),noteHeight:el.querySelector('.qc-review-fields textarea').getBoundingClientRect().height}));
     assert.ok(layout.fits&&layout.tableFits,JSON.stringify({width,...layout}));assert.ok(layout.noteHeight<=70);
     await page.screenshot({path:`screenshots/qc-layout-${width}.png`,fullPage:true,animations:'disabled'});
    }
    await page.setViewportSize({width:1280,height:1000});
   }
   await page.screenshot({path:`screenshots/qc-${who===factory?'factory':who===accountant?'accounting':'sale'}.png`,fullPage:true,animations:'disabled'});
   await ctx.close();
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
 saved=await a.call('/orders',{...draft,submit:true});const cancelled=saved.state.orders.find(x=>x.id===saved.id);
 next=await accountant.call(`/orders/${cancelled.id}/action`,{version:cancelled.version,action:'accounting-cancel',text:'Customer cancelled before payment'});
 assert.equal(next.orders.find(x=>x.id===cancelled.id).stage,-1);
 await a.call(`/orders/${cancelled.id}/action`,{version:cancelled.version+1,action:'payment',payment:{}},{status:400});
 assert.equal(next.orders.find(x=>x.id===cancelled.id).orderCode,null);
 // A cancelled request consumes no number; concurrent approvals are unique and retry-safe.
 const awaiting=[];
 for(let n=0;n<2;n++){
  const result=await a.call('/orders',{...draft,submit:true,payments:[{sender:'Buyer',amount:100,method:'Wise',date:'2026-10-02',reference:'NEXT-'+n}]});
  awaiting.push(result.state.orders.find(x=>x.id===result.id));
 }
 assert.ok(awaiting.every(x=>x.orderCode===null));
 const decisions=awaiting.map(x=>({version:x.version,action:'accounting-approve',paymentStatus:'full',receipts:[{id:x.payments[0].id,amount:100}]}));
 const decisionKeys=awaiting.map(()=>randomUUID());
 await Promise.all(awaiting.map((x,i)=>accountant.call(`/orders/${x.id}/action`,decisions[i],{key:decisionKeys[i]})));
 const approved=(await a.call('/state')).orders.filter(x=>awaiting.some(y=>y.id===x.id));
 assert.deepEqual(approved.map(x=>x.orderCode).sort(),[c.id+'-2',c.id+'-3']);
 const retried=await accountant.call(`/orders/${awaiting[0].id}/action`,decisions[0],{key:decisionKeys[0]});
 assert.equal(retried.orders.find(x=>x.id===awaiting[0].id).orderCode,approved.find(x=>x.id===awaiting[0].id).orderCode);
 await action(owner,'manager-stage',{stage:9,text:'Test locked inspection'});
 o=await current();await factory.call(`/orders/${id}/qc`,{version:o.version,qc:q},{status:400});
 assert.ok((await owner.call('/audit')).some(x=>x.action==='qc-save'));
 assert.ok((await owner.call('/audit')).some(x=>x.action==='accounting-decision'));
 // Monthly customer statistics use approval dates, not the September order date.
 const statsBrowser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const ctx=await statsBrowser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await ctx.newPage();
  await ctx.request.post(base+'/login',{data:{email:'sale-a@example.com',password:'Personal-New-Password'}});
  await page.goto(base.replace('/api/work','/workspace'));
  await page.locator('nav').getByRole('button',{name:'Khách hàng',exact:true}).click();
  const read=key=>page.getByTestId(key).locator('[aria-hidden="true"]').textContent();
  await page.getByLabel('Tháng thống kê khách').fill('2026-09');
  assert.equal(await read('buyers-total'),'0');assert.equal(await read('buyers-repeat'),'0');
  const month=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).slice(0,7);
  await page.getByLabel('Tháng thống kê khách').fill(month);
  assert.equal(await read('buyers-total'),'1');assert.equal(await read('buyers-repeat'),'1');assert.equal(await read('buyers-new'),'1');
  assert.equal(await page.getByTestId('buyers-not-returned').textContent(),'0');
  assert.equal(await page.getByTestId('buyers-new-ratio').textContent(),'—');
  assert.ok((await page.getByTestId('buyers-ratio-explanation').textContent()).includes('Không có'));
  for(const width of [1120,1440]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.locator('.buyer-comparison').evaluate(el=>el.scrollWidth<=el.clientWidth));
  }
  await page.screenshot({path:'screenshots/customer-monthly-statistics.png',fullPage:true,animations:'disabled'});
 }finally{await statsBrowser.close()}
 await stop();await start();assert.equal((await current()).qc.note,'Sale reviewed');assert.equal((await current()).orderCode,c.id+'-1');
 console.log('PASS: Sale/Factory QC editing, Accounting view, authenticated media/ranges, required fields, stale versions, idempotent upload, payment validation, partial/full approval, cancellation, lock, audit and persistence.');
}finally{if(server?.exitCode===null)await stop();if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe cleanup path');rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
