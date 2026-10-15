import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanCustomer,purchaseHistory,customerPhoneKey,assertUniqueCustomerPhone} from '../customer-fields.js';
import {newOrder} from '../shared.js';
const base={name:'',company:'Salon',phone:'123',country:'United States',shippingCountry:'France',group:'Salon',address:'Address',recipient:'Buyer',recipientPhone:'456',source:'Website'};
test('Customer permits company only and optional contacts, but enforces required fields and links',()=>{
 assert.equal(cleanCustomer(base).name,'');
 for(const key of ['company','phone','country','shippingCountry','group','address','recipient','recipientPhone','source'])assert.throws(()=>cleanCustomer({...base,[key]:''}));
 assert.equal(cleanCustomer({...base,name:'Buyer',company:''}).name,'Buyer');
 for(const key of ['social','website']){assert.throws(()=>cleanCustomer({...base,[key]:'not a link'}));assert.equal(cleanCustomer({...base,[key]:'https://example.com'} )[key],'https://example.com');}
 assert.throws(()=>cleanCustomer({...base,recipientEmail:'invalid'}));
 assert.equal(cleanCustomer({...base,social:'legacy text'},{social:'legacy text'}).social,'legacy text');
});
test('Shipping email and country are independent snapshots; purchase history follows approved orders',()=>{
 const c=cleanCustomer({...base,email:'buyer@example.com',recipientEmail:'shipping@example.com'}),o=newOrder(c);
 assert.equal(o.email,'shipping@example.com');assert.equal(o.country,'France');
 assert.equal(newOrder({...c,recipientEmail:''}).email,'');
 assert.equal(purchaseHistory('c',[{customerId:'c',stage:2}]),'Chưa có đơn được duyệt');
 assert.equal(purchaseHistory('c',[{customerId:'c',stage:3,orderCode:'HQ-1'}]),'Đã mua trước đây');
});

test('Customer phones ignore presentation, block other records and preserve unchanged legacy profiles',()=>{
 const existing={id:'one',phone:'+84 (912) 345-678'},other={id:'two',phone:'0123'};
 for(const phone of ['84912345678','+84.912.345.678','８４９１２３４５６７８','84 912–345–678']){
  assert.equal(customerPhoneKey(phone),'84912345678');
  assert.throws(()=>assertUniqueCustomerPhone({phone},[existing,other]),{status:409});
  assert.throws(()=>assertUniqueCustomerPhone({phone},[existing,other],other),{status:409});
 }
 assert.doesNotThrow(()=>assertUniqueCustomerPhone({...existing,phone:'84912345678'},[existing],existing));
 assert.doesNotThrow(()=>assertUniqueCustomerPhone({...existing,name:'New name'},[existing,{...existing,id:'old-duplicate'}],existing));
 assert.doesNotThrow(()=>assertUniqueCustomerPhone({phone:'0912345678'},[existing]));
 for(const phone of ['---','number','123abc'])assert.throws(()=>assertUniqueCustomerPhone({phone},[]),{status:400});
});
