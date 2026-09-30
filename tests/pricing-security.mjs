import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,readdirSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync,backup} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
const dir=mkdtempSync(path.join(os.tmpdir(),'hq-pricing-')),port=3196,base=`http://127.0.0.1:${port}/api/work`;
let server,logs='';
async function start(){server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port),DATA_DIR:dir,NODE_ENV:'test',HQ_ADMIN_EMAIL:'owner@example.com',HQ_ADMIN_PASSWORD:'Initial-Password-2026'},stdio:['ignore','pipe','pipe']});server.stdout.on('data',s=>logs+=s);server.stderr.on('data',s=>logs+=s);for(let i=0;i<100;i++){try{if((await fetch(base.replace('/work','/health'))).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error(logs)}
async function stop(){const done=new Promise(r=>server.once('exit',r));server.kill();await done}
function client(){return {cookie:'',csrf:'',async call(url,body,{status=200,key=randomUUID(),csrf=this.csrf}={}){const r=await fetch(base+url,{method:body?'POST':'GET',headers:{Cookie:this.cookie,...(body?{'Content-Type':'application/json','X-CSRF-Token':csrf,'Idempotency-Key':key}:{})},body:body?JSON.stringify(body):undefined});const v=await r.json();assert.equal(r.status,status,`${url}: ${JSON.stringify(v)}`);const c=r.headers.get('set-cookie');if(c)this.cookie=c.split(';')[0];if(v.csrf)this.csrf=v.csrf;return v}}}

const owner=client(),sale=client(),factory=client(),anonymous=client();
try{
 await start();
 await anonymous.call('/pricing',undefined,{status:401});
 await owner.call('/login',{email:'owner@example.com',password:'Initial-Password-2026'});
 await owner.call('/password',{currentPassword:'Initial-Password-2026',password:'Owner-New-Password-2026'});
 let users=await owner.call('/users',{name:'Sale A',email:'sale-a@example.com',role:'sale',password:'Sale-Initial-Password'});
 users=await owner.call('/users',{name:'Factory',email:'factory@example.com',role:'factory',password:'Sale-Initial-Password'});
 for(const [c,email] of [[sale,'sale-a@example.com'],[factory,'factory@example.com']]){await c.call('/login',{email,password:'Sale-Initial-Password'});await c.call('/password',{currentPassword:'Sale-Initial-Password',password:'Personal-New-Password'})}
 await factory.call('/pricing',undefined,{status:403});
 let prices=await sale.call('/pricing');assert.equal(prices.prices.length,2874);assert.equal(prices.colors.length,94);assert.equal(prices.canEditPrices,false);
 const change={version:1,percent:5,scope:{tier:'Basic',product:'Bulk'}};
 await sale.call('/pricing/adjust',change,{status:403});await sale.call('/pricing/colors',{version:1,code:'#TEST',category:'Other'},{status:403});
 const u=users.find(u=>u.role==='sale');await sale.call('/pricing/permissions/'+u.id,{priceEdit:true,colorEdit:true},{status:403});
 await owner.call('/pricing/permissions/'+u.id,{priceEdit:true,colorEdit:true});
 prices=await sale.call('/pricing');assert.equal(prices.canEditPrices,true);assert.equal(prices.canEditColors,true);
 const customer={name:'Buyer',company:'',phone:'+123456789',email:'',country:'United States',group:'Salon',address:'Street 1',recipient:'Buyer',recipientPhone:'+123456789',social:'example.com',source:'Website',purchase:'Đơn đầu tiên'};
 const state=await sale.call('/customers',customer);const row=prices.prices.find(p=>p.tier==='Basic'&&p.product==='Bulk'&&p.price===98.5);
 const draft={customerId:state.customers[0].id,date:'2026-09-30',due:'2026-10-30',items:[{name:row.product,kind:'base',unit:'Gram',priceBasis:'100g',price:98.5,qty:800,priceReference:{id:row.id,version:1,tier:row.tier,tone:row.tone}}],discount:0,shippingFee:0,paymentFee:0,payments:[],recipient:'Buyer',phone:'+123456789',country:'United States',address:'Street 1'};
 const saved=await sale.call('/orders',draft);
 const preview=await sale.call('/pricing/preview',change);assert.equal(preview.changes.length,96);
 const key=randomUUID();prices=await sale.call('/pricing/adjust',change,{key});assert.equal(prices.version,2);assert.equal(prices.prices.find(p=>p.id===row.id).price,103.43);
 assert.equal((await sale.call('/pricing/adjust',change,{key})).version,2);
 await sale.call('/pricing/adjust',change,{status:409});
 await sale.call('/pricing/adjust',{...change,version:2,percent:-100},{status:400});assert.equal((await sale.call('/pricing')).version,2);
 const order=(await sale.call('/state')).orders.find(o=>o.id===saved.id);assert.equal(order.items[0].price,98.5);assert.equal(order.items[0].priceReference.version,1);
 const h=await sale.call('/pricing/history');assert.equal(h.length,1);assert.equal(h[0].actor,'Sale A');
 prices=await sale.call('/pricing/restore',{version:2,historyId:h[0].id});assert.equal(prices.version,3);assert.equal(prices.prices.find(p=>p.id===row.id).price,98.5);
 await sale.call('/pricing/restore',{version:3,historyId:h[0].id},{status:409});
 const black=prices.colors.find(c=>c.category==='Black'),brown=prices.colors.find(c=>c.category==='Brown'),blonde=prices.colors.find(c=>c.category==='Blonde');
 prices=await sale.call('/pricing/colors',{version:3,code:'#TEST MIX',category:'Ombre',components:[black.id,brown.id,blonde.id]});assert.equal(prices.colors.at(-1).tone,'blonde');
 await sale.call('/pricing/colors',{version:4,code:'#BAD',category:'Ombre',components:['unknown']},{status:400});
 prices=await sale.call('/pricing/colors',{version:4,code:'#Grey',category:'Blonde'});assert.equal(prices.colors.find(c=>c.code==='#Ombre Grey-9C').tone,'blonde');
 await owner.call('/pricing/permissions/'+u.id,{priceEdit:false,colorEdit:false});
 await sale.call('/pricing/adjust',{...change,version:5},{status:403});await sale.call('/pricing/colors',{version:5,code:'#DENIED',category:'Other'},{status:403});
 const image=prices.colors.find(c=>c.images.length).images[0].id;
 let r=await fetch(base+'/pricing/images/'+image,{headers:{Cookie:sale.cookie}});assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/webp');
 r=await fetch(base+'/pricing/images/'+image);assert.equal(r.status,401);
 await stop();await start();await owner.call('/login',{email:'owner@example.com',password:'Owner-New-Password-2026'});assert.equal((await owner.call('/pricing')).version,5);
 console.log('PASS: 2874 imported prices, 94 colors, auth/CSRF/permissions, preview, scoped adjustment, rounding, stale/retry/rollback protection, history restore, fixed order prices, color mix/unknown resolution, protected images and restart persistence.');
}finally{if(server)await stop();rmSync(dir,{recursive:true,force:true})}
