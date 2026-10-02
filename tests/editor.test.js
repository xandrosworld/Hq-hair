import test from 'node:test';
import assert from 'node:assert/strict';
import {newOrder} from '../shared.js';
import {validateOrder} from '../src/order-validation.js';
test('Drafts allow incomplete shipping while submissions identify missing fields',()=>{
 const order=newOrder({id:'HQ-JD-1',name:'Buyer',phone:'123'});
 assert.deepEqual(validateOrder(order),{});
 const errors=validateOrder(order,{submit:true});
 assert(errors.due);assert(errors.address);assert(!errors.customerId);
});
test('Invalid money and line quantities identify the exact input',()=>{
 const order=newOrder({id:'HQ-JD-1'});order.discount=99999;order.items[0].qty=-1;
 const errors=validateOrder(order);assert(errors.discount);assert(errors['qty-0']);
 order.shippingFee=NaN;assert(validateOrder(order).shippingFee);
});
test('Submissions check date order and recipient details',()=>{
 const order=newOrder({id:'HQ-JD-1',recipient:'Receiver',recipientPhone:'123',address:'Warehouse'});
 order.date='2026-09-29';order.due='2026-09-28';assert(validateOrder(order,{submit:true}).due);
 order.due='2026-10-20';assert.deepEqual(validateOrder(order,{submit:true}),{});
 order.email='broken';assert(validateOrder(order,{submit:true}).email);
});

test('Submission identifies unnamed lines including gifts; incomplete draft remains saveable',()=>{
 const order=newOrder({id:'c1',recipient:'Buyer',recipientPhone:'123',address:'Road'});order.due='2027-01-01';
 order.items=[{kind:'base',name:'  ',qty:100,price:10},{kind:'gift',name:'',qty:1,price:0}];
 const errors=validateOrder(order,{submit:true});assert.match(errors['name-0'],/1/);assert.match(errors['name-1'],/2/);assert.equal(validateOrder(order)['name-0'],undefined);
});
