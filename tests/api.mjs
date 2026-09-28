import {request} from '@playwright/test';
import assert from 'node:assert/strict';
const baseURL=process.env.TEST_URL||'http://127.0.0.1:3000';
const api=await request.newContext({baseURL});
const get=async()=>await(await api.get('/api/state')).json();
const post=async(path,data)=>api.post(path,{data});
try{
 const state=await get();const review=state.orders.find(o=>o.stage===5);
 let r=await post(`/api/orders/${review.id}/action`,{action:'accept'});assert(r.ok());
 assert.equal((await get()).orders.find(o=>o.id===review.id).stage,6);
 r=await post(`/api/orders/${review.id}/action`,{action:'accept'});assert.equal(r.status(),400);
 r=await post(`/api/orders/${review.id}/action`,{action:'delete'});assert.equal(r.status(),400);
 r=await post(`/api/orders/${review.id}/action`,{action:'edit-request',text:'Xin thay đổi thông số tóc'});assert(r.ok());
 assert((await get()).orders.find(o=>o.id===review.id).editRequested);
 const draft=state.orders.find(o=>o.stage===0);
 r=await post('/api/orders',{...draft,payments:[{sender:'Forged',amount:90000,confirmed:true}],submit:false});assert(r.ok());
 assert.equal((await get()).orders.find(o=>o.id===draft.id).payments.length,0);
 r=await post('/api/orders',{...draft,discount:99999999,submit:true});assert.equal(r.status(),400);
 r=await post('/api/orders',{...draft,due:'',submit:true});assert.equal(r.status(),400);
 const c=state.customers.find(c=>c.id===review.customerId);const address=review.address;
 r=await post('/api/customers',{...c,address:'New demo address'});assert(r.ok());
 assert.equal((await get()).orders.find(o=>o.id===review.id).address,address);
 r=await post(`/api/orders/${review.id}/action`,{action:'payment',payment:{sender:'Demo',date:'2026-09-28',method:'Wise',amount:-1}});assert.equal(r.status(),400);
 console.log('PASS: sequential Sale acceptance, lock/delete restrictions, edit requests, no forged confirmed payments, invalid amount/date validation, immutable shipping snapshot.');
}finally{await api.dispose()}
