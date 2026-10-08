import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-concurrent-')),base='http://127.0.0.1:3189/api/work';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3189',DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:'ignore'});
const timings=[];
function client(){return {cookie:'',csrf:'',async call(url,body,status=200,key=randomUUID()){
 const start=performance.now(),r=await fetch(base+url,{method:body===undefined?'GET':'POST',headers:{Cookie:this.cookie,'Content-Type':'application/json','X-CSRF-Token':this.csrf,'Idempotency-Key':key},body:body===undefined?undefined:JSON.stringify(body)});const v=await r.json();
 timings.push({method:body===undefined?'GET':'POST',ms:performance.now()-start,status:r.status});assert.equal(r.status,status,`${url}: ${JSON.stringify(v)}`);
 if(r.headers.get('set-cookie'))this.cookie=r.headers.get('set-cookie').split(';')[0];if(v.csrf)this.csrf=v.csrf;return v;
 }};}
try{
 for(let i=0;i<150;i++){try{if((await fetch(base.replace('/work','/health'))).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 const admin=client();await admin.call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});await admin.call('/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 const clients=[];
 for(let i=0;i<20;i++){
  await admin.call('/users',{name:`Load Sale ${i}`,code:`HQ-LD${i}`,email:`load${i}@example.com`,role:'sale',password:'Initial-Password-2026'});
  const c=client();await c.call('/login',{email:`load${i}@example.com`,password:'Initial-Password-2026'});await c.call('/password',{currentPassword:'Initial-Password-2026',password:'Personal-New-Password-2026'});clients.push(c);
 }
 timings.length=0;
 const started=performance.now();
 await Promise.all(clients.map(async(c,i)=>{
  let state=await c.call('/customers',{name:`Load Buyer ${i}`,country:'United States',group:'Salon',phone:'+1234567',address:'123 Test Road',recipient:'Buyer',recipientPhone:'+1234567',social:'https://wa.me/1234567',source:'Website',purchase:'First'});
  const customerId=state.customers[0].id;
  const draft={customerId,date:'2026-01-01',due:'2026-02-01',paymentDue:'2026-02-15',recipient:'Buyer',phone:'+1234567',address:'123 Test Road',country:'United States',discount:5,shippingFee:20,paymentFee:3,items:[{name:'Bulk',kind:'base',qty:800,price:98.5,unit:'Gram',priceBasis:'100g'},{name:'Closure',kind:'extra',qty:2,price:30,unit:'Piece'},{name:'Gift',kind:'gift',qty:1,price:40,unit:'Piece'}].map(item=>({...item,origin:'Raw Hair',lengthCm:50,texture:'Natural Straight',segment:'Premium',color:'1B',priceBasis:item.priceBasis||'unit'})),payments:[{sender:'Buyer',amount:0,method:'Wise',date:'2026-01-01'}]};
  for(let n=0;n<3;n++){
   const created=await c.call('/customers',{name:`Load order buyer ${i}/${n}`,phone:'123',recipient:'Buyer',recipientPhone:'123',address:'Road',country:'United States',group:'Salon',source:'Website'});draft.customerId=created.customers.at(-1).id;
   const key=randomUUID(),saved=await c.call('/orders',{...draft,submit:true},200,key);
   assert.equal((await c.call('/orders',{...draft,submit:true},200,key)).id,saved.id);
   await c.call(`/orders/${saved.id}/action`,{version:1,action:'message',text:`Concurrent message ${i}/${n}`});
   await c.call(`/orders/${saved.id}/action`,{version:2,action:'payment',payment:{sender:'Buyer',amount:100,method:'Wise',date:'2026-01-01',reference:`PAY-${i}-${n}`}});
  }
  for(let n=0;n<5;n++){state=await c.call('/state');assert.equal(state.orders.length,3);assert.equal(state.customers.length,4);assert.ok(state.orders.every(o=>state.customers.some(c=>c.id===o.customerId)&&o.payments.length===2&&o.payments.every(p=>!p.confirmed)));}
  draft.customerId=customerId;
  for(const bad of [{...draft,date:'2026-02-30'},{...draft,items:[null]},{...draft,payments:[null]},{...draft,discount:true},{...draft,paymentDue:'2025-12-31'}])await c.call('/orders',bad,400);
 }));
 const state=await admin.call('/state');assert.equal(state.orders.length,60);assert.equal(state.customers.length,80);assert.equal(new Set(state.orders.map(o=>o.id)).size,60);
 // Twenty simultaneous edits with one version: exactly one can commit.
 const o=state.orders[0];const outcomes=await Promise.all(Array.from({length:20},async(_,i)=>{
  const r=await fetch(base+`/orders/${o.id}/action`,{method:'POST',headers:{Cookie:admin.cookie,'Content-Type':'application/json','X-CSRF-Token':admin.csrf,'Idempotency-Key':randomUUID()},body:JSON.stringify({version:o.version,action:'message',text:`Race ${i}`})});const result=await r.text();if(![200,409].includes(r.status))console.log('Unexpected race response',r.status,result);return r.status;
 }));assert.equal(outcomes.filter(s=>s===200).length,1);assert.equal(outcomes.filter(s=>s===409).length,19);
 await Promise.all(clients.map(c=>c.call('/does-not-exist',{},404)));
 for(const body of [[],null])await admin.call('/orders',body,400);
 const stats=method=>{const values=timings.filter(t=>t.method===method&&t.status===200).map(t=>t.ms).sort((a,b)=>a-b);return {count:values.length,medianMs:Math.round(values[Math.floor(values.length/2)]),p95Ms:Math.round(values[Math.floor(values.length*.95)]),maxMs:Math.round(values.at(-1))}};
 const result={users:20,customers:80,orders:60,elapsedSeconds:Math.round((performance.now()-started)/100)/10,read:stats('GET'),write:stats('POST'),expectedValidationRejections:timings.filter(t=>t.status===400).length,race:{committed:1,conflicts:19},environment:'isolated local server; no production data'};
 mkdirSync('data/test-results',{recursive:true});writeFileSync('data/test-results/concurrent-workspace.json',JSON.stringify(result,null,2));console.log('PASS:',JSON.stringify(result));
}finally{
 const done=new Promise(r=>server.once('exit',r));server.kill();await done;
 const resolved=path.resolve(dir);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('hq-concurrent-'));rmSync(resolved,{recursive:true,force:true});
}
