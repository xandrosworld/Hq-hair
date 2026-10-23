import test from 'node:test';import assert from 'node:assert/strict';import {compactReceipts,receiptBytes} from '../receipt-delivery.js';
test('receipt projection is small, immutable and resolves legacy and multiple files',()=>{
 const file='data:image/png;base64,'+Buffer.alloc(100000).toString('base64');
 const order={id:'order',payments:[{id:'old',file,fileName:'old.png',amount:10},{id:'new',files:[{file,fileName:'new.png'}],amount:20}]};
 order.history=[{title:'Updated',snapshot:{payments:order.payments}}];
 const before=JSON.stringify(order),view=compactReceipts(order);
 assert.ok(JSON.stringify(view).length<1000);assert.deepEqual(view.history,[{title:'Updated'}]);assert.equal(JSON.stringify(order),before);
 assert.equal(view.payments[0].file,'/api/work/orders/order/receipts/old/legacy.png');
 assert.equal(view.payments[1].files[0].file,'/api/work/orders/order/receipts/new/0.png');
 assert.equal(receiptBytes(order,'old','legacy').bytes.length,100000);assert.equal(receiptBytes(order,'new','0').mime,'image/png');
 assert.equal(receiptBytes(order,'new','2'),null);assert.equal(receiptBytes(order,'unknown','0'),null);assert.equal(receiptBytes(undefined,'new','0'),null);
});
