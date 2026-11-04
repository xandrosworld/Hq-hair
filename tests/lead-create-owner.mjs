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
const admin=client(),lead=client(),sale=client();
try{
 for(let i=0;i<100;i++){try{if((await fetch(base.replace('/work','/health'))).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 await admin.call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});await admin.call('/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 let users;for(const [c,code,role] of [[lead,'TL-SALE','sales_lead'],[sale,'HQ-JD','sale']]){
 users=await admin.call('/users',{name:code,email:code+'@example.com',code,role,password:'Initial-Password-2026'});
 await c.call('/login',{email:code+'@example.com',password:'Initial-Password-2026'});await c.call('/password',{currentPassword:'Initial-Password-2026',password:'Personal-Password-2026'});
 }
 const lid=users.find(u=>u.code==='TL-SALE').id,sid=users.find(u=>u.code==='HQ-JD').id;
 await admin.call('/users/'+lid+'/lead-permissions',{leadEdit:true,leadAssign:true});
 const customer={name:'Buyer',phone:'+11111',country:'United States',group:'Salon',address:'123 Road',recipient:'Buyer',recipientPhone:'+11111',source:'Website'};
 let state=await lead.call('/customers',customer);assert.equal(state.customers[0].id,'TL-SALE-1');
 state=await lead.call('/customers',{...customer,phone:'+22222',ownerId:sid});assert.equal(state.customers[1].id,'HQ-JD-1');assert.equal(state.customers[1].ownerId,sid);
 assert.ok(state.creationOwners.some(u=>u.id===sid));
 await sale.call('/customers',{...customer,phone:'+33333',ownerId:lid},403);
 const result=await lead.call('/orders',{customerId:'HQ-JD-1',items:[],payments:[],discount:0,shippingFee:0,paymentFee:0});const order=result.state.orders.find(o=>o.id===result.id);assert.equal(order.ownerId,sid);assert.match(order.draftCode,/HQ-JD-1/);
 await admin.call('/users/'+lid+'/lead-permissions',{leadEdit:true,leadAssign:false});
 await lead.call('/customers',{...customer,phone:'+44444',ownerId:sid},403);
 console.log('PASS lead default code, selected Sale numbering, order ownership, permission rejection');
}finally{
 const stopped=new Promise(r=>server.once('exit',r));if(server.exitCode===null){server.kill();await stopped}
 assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:200});
}

