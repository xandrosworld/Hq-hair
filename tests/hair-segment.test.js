import test from 'node:test';import assert from 'node:assert/strict';import {validateOrder} from '../src/order-validation.js';import {priceHairFields} from '../hair-classification.js';
test('Baby needs no segment while Raw still requires it',()=>{
 const order={items:[{origin:'Baby Hair',segment:'',name:'Bulk',qty:100,price:50,priceBasis:'100g',unit:'Gram'}]};assert.equal(validateOrder(order,{submit:true})['segment-0'],undefined);order.items[0].origin='Raw Hair';assert.ok(validateOrder(order,{submit:true})['segment-0']);
 assert.equal(priceHairFields({tier:'Basic',product:'Bulk',segment:'Double Drawn'}).segment,'Basic');assert.equal(priceHairFields({tier:'Baby',product:'Baby Bulk'}).segment,'');
});
