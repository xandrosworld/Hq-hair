import test from 'node:test';
import assert from 'node:assert/strict';
import {productAmount,cleanProductFields} from '../product-fields.js';
import {totals} from '../shared.js';
test('Customer sample: 800g at USD98.50/100g is USD788, with structured dimensions',()=>{
 const row={name:'Bulk',origin:'Raw hair',lengthCm:55,texture:'Straight',segment:'Super Double Drawn',color:'#2H',productNote:'',unit:'Gram',qty:800,price:98.5,priceBasis:'100g',kind:'base'};
 assert.equal(productAmount(row),788);assert.equal(totals({items:[row]}).total,788);
 assert.equal(cleanProductFields(row).lengthCm,55);
 assert.equal(productAmount({...row,qty:125.5}),123.62);
});
test('Legacy price per unit remains unchanged; mixed items and fees use the right price basis',()=>{
 assert.equal(productAmount({qty:100,price:8}),800);
 const t=totals({items:[{kind:'base',qty:800,price:98.5,priceBasis:'100g'},{kind:'extra',qty:2,price:10},{kind:'gift',qty:1,price:0}],discount:8,shippingFee:30,paymentFee:5});
 assert.equal(t.revenue,800);assert.equal(t.total,835);
});
test('Server rejects invalid pricing basis and lengths',()=>{
 for(const p of [{priceBasis:'100g',unit:'Piece'},{priceBasis:'1000g'},{lengthCm:-1},{lengthCm:301},{lengthCm:'abc'}])assert.throws(()=>cleanProductFields(p),e=>e.status===400);
 assert.equal(cleanProductFields({unit:'Piece'}).priceBasis,'unit');
});
