import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {factoryPDF,factoryPDFRows,factoryPDFRoutes} from '../factory-pdf.js';
const order={id:'allowed',orderCode:'HQ-JD-3-5',approvedAt:'2026-11-05',due:'2026-11-20',recipient:'PRIVATE CUSTOMER',payments:[{amount:1234}],items:[{name:'Tóc nối',spec:'Kiểm tra màu trước khi giao',origin:'Raw Hair',segment:'Double Drawn',lengthCm:45,texture:'Natural Wavy',color:'33',qty:100,unit:'Gram',price:999,productNote:'Đóng gói cẩn thận'},{name:'Phụ kiện',qty:2,unit:'Piece',kind:'gift'}]};
test('Factory PDF embeds Vietnamese fonts, paginates and projects only product fields',async()=>{
 const rows=factoryPDFRows(order);assert.equal(rows[0][5],'Basic');assert.equal(rows[0][7],'100 G');assert.equal(rows[1][7],'2 Cái');
 assert.ok(!JSON.stringify(rows).includes('PRIVATE'));assert.ok(!JSON.stringify(rows).includes('999'));
 const single=await factoryPDF(order);assert.equal((single.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,1,'Footer must not create a blank page');
 const pdf=await factoryPDF({...order,items:Array.from({length:50},()=>order.items[0])});
 assert.equal(pdf.subarray(0,5).toString(),'%PDF-');assert.match(pdf.toString('latin1'),/\/FontFile2/);assert.ok((pdf.toString('latin1').match(/\/Type \/Page\b/g)||[]).length>1);
});
test('Download checks order access before producing a private PDF attachment',async()=>{
 const app=express();app.use((req,res,next)=>{req.data={orders:[order,{...order,id:'forbidden'}]};req.assertAccess=o=>{if(o?.id!=='allowed')throw Object.assign(new Error('Not found'),{status:404})};next()});factoryPDFRoutes(app);app.use((e,req,res,next)=>res.status(e.status||500).json({error:e.message}));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{for(const id of ['forbidden','missing'])assert.equal((await fetch(`${base}/orders/${id}/factory-slip.pdf`)).status,404);
 const response=await fetch(`${base}/orders/allowed/factory-slip.pdf`);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');assert.match(response.headers.get('content-disposition'),/^attachment;.*HQ-JD-3-5\.pdf/);assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
 }finally{await new Promise(r=>server.close(r))}
});
