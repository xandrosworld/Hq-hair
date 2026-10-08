import {totals} from '../shared.js';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-workflow-')),port=3194,base=`http://127.0.0.1:${port}/api/work`;
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
function client(){return {cookie:'',csrf:'',async call(url,body,status=200,key=randomUUID()){
 const r=await fetch(base+url,{method:body?'POST':'GET',headers:{Cookie:this.cookie,...(body?{'Content-Type':'application/json','X-CSRF-Token':this.csrf,'Idempotency-Key':key}:{})},body:body?JSON.stringify(body):undefined});const v=await r.json();assert.equal(r.status,status,`${url}: ${JSON.stringify(v)}`);if(r.headers.get('set-cookie'))this.cookie=r.headers.get('set-cookie').split(';')[0];if(v.csrf)this.csrf=v.csrf;return v;
}}}
const admin=client(),sale=client(),other=client(),factory=client(),accountant=client();
try{
 for(let i=0;i<100;i++){try{if((await fetch(base.replace('/work','/health'))).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 await admin.call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});await admin.call('/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 for(const [c,code,role] of [[sale,'HQ-JD','sale'],[other,'HQ-EM','sale'],[factory,'SX-AB','factory'],[accountant,'KT-AB','accounting']]){
  const email=code+'@example.com';await admin.call('/users',{name:code,email,code,role,password:'Initial-Password-2026'});
  await c.call('/login',{email,password:'Initial-Password-2026'});await c.call('/password',{currentPassword:'Initial-Password-2026',password:'Personal-Password-2026'});
 }
 await admin.call('/users',{name:'Duplicate',email:'duplicate@example.com',code:'hq-jd',role:'sale',password:'Initial-Password-2026'},409);
 await admin.call('/users',{name:'Wrong',email:'wrong@example.com',code:'KT-XX',role:'sale',password:'Initial-Password-2026'},400);
 let state=await sale.call('/customers',{name:'Workflow Buyer',company:'Salon',phone:'+12345',country:'United States',group:'Salon',address:'123 Road',recipient:'Buyer',recipientPhone:'+12345',social:'https://wa.me/12345',source:'Website',purchase:'First'});
 assert.equal(state.customers[0].id,'HQ-JD-1');
 const draft={customerId:'HQ-JD-1',date:'2026-01-01',due:'2026-02-01',paymentDue:'2026-03-01',recipient:'Buyer',phone:'+12345',address:'123 Road',country:'United States',discount:0,shippingFee:0,paymentFee:0,items:[{name:'Bulk',kind:'base',qty:100,price:10,unit:'Gram',priceBasis:'100g',origin:'Raw Hair',lengthCm:50,texture:'Natural Straight',segment:'Premium',color:'1B'}],payments:[{sender:'Buyer',contact:'buyer@example.com',method:'Wise',date:'2026-01-01',amount:0}],submit:true};
 let result=await sale.call('/orders',draft),id=result.id,order=result.state.orders[0];assert.equal(order.orderCode,null);assert.match(id,/^[a-f0-9-]{36}$/);
 const action=async(c,action,extra={},status=200,key)=>{const body={action,version:order.version,...extra};const v=await c.call(`/orders/${id}/action`,body,status,key);if(status===200)order=v.orders.find(o=>o.id===id);return body};
 await action(other,'message',{text:'Access denied'},404);await action(factory,'received',{},403);
 const video=Buffer.alloc(24);video.write('ftyp',4);video.write('isom',8);
 await action(sale,'message',{text:'a'.repeat(5000),images:Array.from({length:20},(_,i)=>({name:`clip-${i}.mp4`,data:'data:video/mp4;base64,'+video.toString('base64')}))});
 const sent=order.messages.at(-1);assert.equal(sent.text.length,5000);assert.equal(sent.images.length,20);
 const mediaPath=base+`/orders/${id}/images/${sent.images[0].id}`;
 const media=await fetch(mediaPath,{headers:{Cookie:sale.cookie,Range:'bytes=4-7'}});assert.equal(media.status,206);assert.equal(await media.text(),'ftyp');
 assert.equal((await fetch(mediaPath,{headers:{Cookie:other.cookie}})).status,404);
 await action(sale,'manager-stage',{stage:8,text:'Cannot skip'},400);await action(sale,'inspection',{checked:true},400);
 await action(admin,'manager-stage',{stage:5,text:'Cannot skip'},400);
 await action(sale,'payment',{payment:{sender:'Buyer',contact:'buyer@example.com',method:'Wise',date:'2026-01-01',amount:10,reference:'INITIAL'}});
 assert.equal((await sale.call('/state')).orders.find(o=>o.id===id)?.payments[0]?.contact,'buyer@example.com');
 await action(accountant,'accounting-approve',{paymentStatus:'full',receipts:[{id:order.payments[0].id,amount:10}]});
 await action(factory,'factory-status',{status:'producing'});
 await action(factory,'factory-status',{status:'sale_check'});
 await action(sale,'accept');assert.equal(order.stage,4);
 await action(factory,'factory-office');
 assert.equal(order.officeDispatch.dueDate,draft.due);
 const dispatchTime=order.officeDispatch.time;
 await action(factory,'factory-office',{},400);assert.equal(order.officeDispatch.time,dispatchTime);
 await action(accountant,'accounting-final');assert.equal(order.stage,8);
 const inspection={checked:true,carrier:'DHL',service:'Express',tracking:'TRACK-123',shippedDate:'2026-01-02',reference:'QC-123'};
 const key=randomUUID(),body=await action(sale,'inspection',inspection,200,key),version=order.version;
 state=await sale.call(`/orders/${id}/action`,body,200,key);assert.equal(state.orders[0].version,version);assert.ok(order.contentLockedAt);
 const payment={sender:'Buyer',method:'Wise',date:'2026-01-01',amount:10,reference:'PAY-1'};
 await action(sale,'payment',{payment},400);await action(sale,'edit-request',{text:'Bypass lock'},400);
 await sale.call('/orders',{...order,note:'Bypass by forged draft',stage:0,submit:false},400);
 await admin.call('/orders',{...order,note:'No reason'},400);
 result=await admin.call('/orders',{...order,note:'Corrected detail',tracking:'CORRECTED',reason:'Correct customer request',submit:false});order=result.state.orders[0];assert.equal(order.stage,8);assert.ok(order.contentLockedAt);assert.equal(order.tracking,'CORRECTED');assert.ok(order.history.some(h=>h.snapshot?.tracking==='TRACK-123'));
 await action(sale,'message',{text:'Allowed after lock'});await action(factory,'message',{text:'Factory can still reply'});
 await action(admin,'payment',{payment},400);await action(admin,'payment',{payment,reason:'Record missing receipt'});assert.equal(order.payments[1].confirmed,false);
 await action(admin,'manager-payment',{paymentId:order.payments[0].id,amount:1,confirmed:true,text:'Correct initial amount'});
 await action(sale,'received',{feedback:'very_satisfied'});assert.equal(order.stage,9);await action(sale,'complete',{},400);await action(admin,'complete',{text:'Approved credit exception'});assert.equal(order.stage,10);assert.equal(order.payments[1].confirmed,false);
 await action(sale,'manager-payment',{paymentId:order.payments[0].id,amount:10,confirmed:true,text:'Forged correction'},400);
 await action(admin,'manager-payment',{paymentId:order.payments[0].id,amount:10,confirmed:true,text:'Correct received amount'});assert.equal(order.payments[0].confirmed,true);
 await action(admin,'manager-stage',{stage:2,text:'Cannot skip'},400);assert.ok(order.contentLockedAt);
 await action(admin,'grant-edit',{text:'Attempt to reopen locked draft'},400);await sale.call('/orders',{...order,submit:false},400);
 const newOrder=await sale.call('/orders',draft);assert.notEqual(newOrder.id,id);assert.equal(newOrder.state.orders.find(o=>o.id===newOrder.id).customerId,order.customerId);assert.equal(totals(newOrder.state.orders.find(o=>o.id===newOrder.id)).debt,10);assert.equal(totals(newOrder.state.orders.find(o=>o.id===id)).debt,0);
 // A forfeited deposit closes immediately and retains its official number and confirmed money.
 let cancelledOrder=newOrder.state.orders.find(o=>o.id===newOrder.id);
 const cancelAction=async(c,action,extra={},status=200)=>{const v=await c.call(`/orders/${cancelledOrder.id}/action`,{version:cancelledOrder.version,action,...extra},status);if(status===200)cancelledOrder=v.orders.find(o=>o.id===cancelledOrder.id)};
 await cancelAction(sale,'payment',{payment:{sender:'Buyer',method:'Wise',date:'2026-01-01',amount:3,reference:'DEPOSIT'}});
 await cancelAction(accountant,'accounting-approve',{paymentStatus:'partial',receipts:[{id:cancelledOrder.payments[0].id,amount:3}]});
 await cancelAction(accountant,'accounting-forfeit',{text:'Too early'},400);
 await cancelAction(factory,'factory-status',{status:'producing'});
 await cancelAction(factory,'factory-status',{status:'paused'});
 await cancelAction(accountant,'accounting-final',{},400);
 await cancelAction(sale,'accounting-forfeit',{text:'Wrong role'},403);
 await cancelAction(admin,'accounting-forfeit',{text:'Wrong role'},403);
 const officialCode=cancelledOrder.orderCode;
 await cancelAction(accountant,'accounting-forfeit',{text:'Customer cancelled, deposit forfeited'});
 assert.equal(cancelledOrder.stage,10);assert.ok(cancelledOrder.closedAt);assert.equal(cancelledOrder.orderCode,officialCode);assert.equal(totals(cancelledOrder).paid,3);
 for(const action of ['inspection','received','complete'])await cancelAction(sale,action,{},400);
 await cancelAction(accountant,'accounting-final',{},400);
 const audit=await admin.call('/audit');assert.ok(audit.some(a=>a.action==='manager-order-action'&&JSON.parse(a.details).before));
 assert.ok(audit.some(a=>a.action==='accounting-decision'&&JSON.parse(a.details).after?.cancelType==='deposit_forfeited'));
 assert.equal((await other.call('/state')).orders.length,0);
 console.log('PASS: custom employee codes, uniqueness, ownership, real API workflow, factory boundary, sticky lock, manager reason and snapshots, idempotency, post-lock chat, unpaid closure and audit.');
}finally{
 if(server.exitCode===null){const stopped=new Promise(r=>server.once('exit',r));server.kill();await stopped}
 if(!path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep))throw Error('Unsafe cleanup');rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}
