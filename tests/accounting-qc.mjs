import {standardsFixture} from './standards-fixture.mjs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
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
 // Follow current department handoffs before Sale can write QC.
 saved=await a.call('/orders',{...o,payments:[{sender:'Buyer',amount:30,method:'Wise',date:'2026-10-02',reference:'PARTIAL'}],submit:true});o=saved.state.orders[0];
 const current=async()=>((await a.call('/state')).orders.find(x=>x.id===id));
 const action=async(client,action,extra={},status=200)=>client.call(`/orders/${id}/action`,{version:(await current()).version,action,...extra},{status});
 assert.equal(o.orderCode,null);
 await action(a,'accounting-approve',{},403);
 await a.call(`/orders/${id}/qc`,{version:o.version,qc:{}},{status:400});
 await factory.call(`/orders/${id}/qc`,{version:o.version,qc:{}},{status:403});
 const receipts=[{id:o.payments[0].id,amount:30}];
 await action(accountant,'accounting-approve',{paymentStatus:'full',receipts},400);
 assert.equal((await current()).payments[0].confirmed,false);
 await action(accountant,'accounting-cancel',{text:'Cannot cancel a receipt'},400);
 await action(accountant,'accounting-approve',{paymentStatus:'partial',receipts});
 assert.equal((await current()).orderCode,c.id+'-1');
 await action(a,'payment',{payment:{sender:'Buyer',amount:70,method:'Wise',date:'2026-10-02',reference:'BALANCE'}});
 o=await current();
 await action(accountant,'accounting-approve',{paymentStatus:'full',receipts:[{id:o.payments[1].id,amount:70}]},400);
 await action(factory,'factory-status',{status:'producing'});
 await action(factory,'factory-status',{status:'paused'});
 await action(factory,'factory-status',{status:'sale_check'},400);
 await action(factory,'factory-status',{status:'producing'});
 await action(factory,'factory-status',{status:'sale_check'});
 await action(a,'rework',{text:'Check colour again'});
 await action(factory,'factory-office',{},400);
 await action(factory,'factory-status',{status:'sale_check'});
 await action(a,'accept');await action(factory,'factory-office');
 await action(accountant,'accounting-final',{},400);
 o=await current();await action(accountant,'accounting-final',{receipts:[{id:o.payments[1].id,amount:70}]});
 assert.equal((await current()).stage,8);
 const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=';
 o=await current();const upload={version:o.version,file:{name:'qc.png',data:png}},key=randomUUID();
 for(const who of [factory,accountant]){
  await who.call(`/orders/${id}/qc-upload`,upload,{status:403});
  await who.call(`/orders/${id}/qc`,{version:o.version,qc:{}},{status:403});
 }
 let next=await a.call(`/orders/${id}/qc-upload`,upload,{key});
 next=await a.call(`/orders/${id}/qc-upload`,upload,{key});o=next.orders.find(x=>x.id===id);assert.equal(o.qcMedia.length,1);
 const mediaId=o.qcMedia[0].id,mediaPath=`/orders/${id}/qc-media/${mediaId}`;
 for(const who of [factory,a,accountant]){
  const response=await fetch(base+mediaPath,{headers:{Cookie:who.cookie}});assert.equal(response.status,200);
  assert.equal(Buffer.from(await response.arrayBuffer()).toString('base64'),png.split(',')[1]);
 }
 await b.call(mediaPath,undefined,{status:404});
 assert.equal((await fetch(base+mediaPath)).status,401);
 const ranged=await fetch(base+mediaPath,{headers:{Cookie:factory.cookie,Range:'bytes=0-7'}});assert.equal(ranged.status,206);assert.equal((await ranged.arrayBuffer()).byteLength,8);
 assert.equal((await fetch(base+mediaPath,{headers:{Cookie:factory.cookie,Range:'bytes=999999-'}})).status,416);
 const q={date:'2026-10-02',rows:[{index:0,note:'',mediaIds:[]}],special:[],note:'Sale reviewed'};
 await a.call(`/orders/${id}/qc`,{version:o.version,qc:q,complete:true},{status:400});
 q.rows[0]={index:0,note:'Hair checked',mediaIds:[mediaId]};
 next=await a.call(`/orders/${id}/qc`,{version:o.version,qc:q,complete:true});assert.ok(next.orders.find(x=>x.id===id).qc.completedAt);
 await a.call(`/orders/${id}/qc`,{version:o.version,qc:q},{status:409});
 const {chromium,expect}=await import('@playwright/test'),browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const errors=[];
  for(const [role,email] of [['factory','factory@example.com'],['accounting','accounting@example.com'],['sale','sale-a@example.com']]){
   const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
   await ctx.request.post(base+'/login',{data:{email,password:'Personal-New-Password'}});await page.goto(base.replace('/api/work','/workspace'));
   if(role==='factory')await page.locator('.factory-navigation').getByRole('button',{name:'Đã gửi văn phòng',exact:true}).click();
   if(role==='accounting')await page.getByRole('combobox').selectOption('all');
   if(role==='sale'){await page.getByRole('button',{name:'Mở menu',exact:true}).tap();await page.locator('.sidebar').getByRole('button',{name:'Đơn hàng chưa hoàn thành',exact:true}).tap();}
   await page.getByRole('button',{name:(await current()).orderCode,exact:true}).first().click();
   await page.getByRole('button',{name:'Phiếu kiểm định',exact:true}).click();
   await expect(page.getByRole('heading',{name:'KIỂM ĐỊNH ĐƠN HÀNG (QC)'})).toBeVisible();
   if(role==='sale')await expect(page.getByLabel('Đánh giá sản phẩm 1',{exact:true})).toBeEditable();
   else{await expect(page.getByRole('button',{name:'Lưu QC',exact:true})).toHaveCount(0);await expect(page.getByLabel('Tệp kiểm định 1',{exact:true})).toHaveCount(0);}
   await expect(page.getByAltText('qc.png')).toBeVisible();await ctx.close();
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close()}
 await action(a,'inspection',{checked:true,carrier:'DHL',tracking:'QC-TRACK',shippedDate:'2026-10-03'});
 await action(a,'received',{feedback:'satisfied_feedback'});await action(a,'complete');
 o=await current();
 await factory.call(`/orders/${id}/qc`,{version:o.version,qc:q},{status:403});
 await a.call(`/orders/${id}/qc`,{version:o.version,qc:q},{status:400});
 await owner.call(`/orders/${id}/qc`,{version:o.version,qc:q},{status:400});
 await owner.call(`/orders/${id}/qc`,{version:o.version,qc:q,reason:'Verified correction after closure'});
 const audit=await owner.call('/audit');assert.ok(audit.some(x=>x.action==='qc-save'));assert.ok(audit.some(x=>x.action==='accounting-decision'));
 await stop();await start();assert.equal((await current()).qc.note,'Sale reviewed');assert.equal((await current()).orderCode,c.id+'-1');
 const persisted=await fetch(base+mediaPath,{headers:{Cookie:factory.cookie}});assert.equal(persisted.status,200);assert.equal(Buffer.from(await persisted.arrayBuffer()).toString('base64'),png.split(',')[1]);
 console.log('PASS: sequential handoffs, partial/final payment, Factory/Accounting read-only QC at API/UI, Sale step 8, protected media/ranges, upload retry, stale versions, lock/manager reason, audit and restart persistence.');
}finally{if(server?.exitCode===null)await stop();if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe cleanup path');rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200})}
