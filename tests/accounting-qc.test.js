import test from 'node:test';
import assert from 'node:assert/strict';
import {applyAccounting} from '../accounting.js';
import {saveQC,qcMedia} from '../quality-control.js';
import {today} from '../shared.js';
const accountant={id:'a',name:'Accountant',role:'accounting'};
const order=()=>({stage:2,date:today(),items:[{name:'Hair',kind:'base',qty:1,price:100}],payments:[{id:'p',amount:30,confirmed:false}]});
test('Accounting decisions enforce real confirmed money, roles and atomic validation',()=>{
 const o=order(),body={paymentStatus:'full',receipts:[{id:'p',amount:30}]};
 assert.throws(()=>applyAccounting(o,accountant,'accounting-approve',body,()=>{}),{status:400});
 assert.equal(o.payments[0].confirmed,false);
 assert.throws(()=>applyAccounting(o,{role:'sale'},'accounting-approve',body,()=>{}),{status:403});
 applyAccounting(o,accountant,'accounting-approve',{...body,paymentStatus:'partial'},()=>{});
 assert.equal(o.stage,3);assert.equal(o.accountingApproval.status,'partial');
 assert.throws(()=>applyAccounting(o,accountant,'accounting-cancel',{text:'Cancel'},()=>{}),{status:400});
 o.payments.push({id:'p2',amount:70,confirmed:false});
 assert.throws(()=>applyAccounting(o,accountant,'accounting-approve',{paymentStatus:'full',receipts:[{id:'p2',amount:70}]},()=>{}),{status:400});
 assert.equal(o.accountingApproval.status,'partial');assert.equal(o.accountingApproval.paid,30);
});
test('QC completion requires every product note and attachment; Sale at step 8 can edit, Factory and Accountant cannot',()=>{
 const o={...order(),stage:8,qcMedia:[{id:'m'}]},q={date:today(),rows:[{index:0,note:'',mediaIds:[]}],special:[]};
 assert.equal(saveQC(o,{role:'sale'},{qc:q}).completedAt,null);
 assert.throws(()=>saveQC(o,{role:'sale'},{qc:q,complete:true}),{status:400});
 q.rows[0]={index:0,note:'Checked',mediaIds:['m']};
 assert.ok(saveQC(o,{role:'sale'},{qc:q,complete:true}).completedAt);
 assert.throws(()=>saveQC(o,{role:'factory'},{qc:q}),{status:403});
 assert.throws(()=>saveQC({...o,stage:6},{role:'sale'},{qc:q}),{status:400});
 assert.throws(()=>saveQC(o,accountant,{qc:q}),{status:403});
 assert.throws(()=>saveQC({...o,contentLockedAt:'locked'},{role:'sale'},{qc:q}),{status:400});
 assert.throws(()=>saveQC(o,{role:'sale'},{qc:{...q,rows:[{...q.rows[0],mediaIds:['other-order']}]}}),{status:400});
 assert.throws(()=>qcMedia({data:'data:video/mp4;base64,ZmFrZQ=='}),{status:400});
});

test('QC image limit stays 5 MiB independently of the larger chat limit',()=>{
 const image=Buffer.alloc(5*1024*1024+1);Buffer.from('89504e470d0a1a0a','hex').copy(image);
 const input=bytes=>({name:'qc.png',data:'data:image/png;base64,'+bytes.toString('base64')});
 assert.equal(qcMedia(input(image.subarray(0,-1))).size,5*1024*1024);
 assert.throws(()=>qcMedia(input(image)),{status:400,message:'Ảnh kiểm định tối đa 5 MiB.'});
});
